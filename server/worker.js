// Heirloom Health server (Cloudflare Worker).
//
//   POST /api/extract      { text, people: [{role, name}], conditions: [...], cancerTypes: [...] }
//                          -> { facts: [...] }  Claude reads an interview transcript and returns health facts.
//   POST /api/transcribe   multipart form: file (audio), lang  -> { text }  speech-to-text.
//   GET/PUT /api/family/:id  an encrypted copy of a family. The key never reaches this server.
//
// Nothing sent to /api/extract or /api/transcribe is stored.
import Anthropic from '@anthropic-ai/sdk';

const MAX_TEXT = 8000;            // characters of transcript per request
const MAX_AUDIO = 10 * 1024 * 1024;
const MAX_FAMILY = 900 * 1024;    // KV values can be larger, but a family never needs this much
const AI_PER_HOUR = 40;           // per visitor IP

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (!cors) return json({ error: 'This website is not allowed to use the Heirloom server.' }, 403);
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/extract' && request.method === 'POST') return withCors(await extract(request, env), cors);
      if (url.pathname === '/api/transcribe' && request.method === 'POST') return withCors(await transcribe(request, env), cors);
      const fam = url.pathname.match(/^\/api\/family\/([A-Za-z0-9_-]{16,80})$/);
      if (fam) return withCors(await family(request, env, fam[1]), cors);
      return withCors(json({ error: 'Not found' }, 404), cors);
    } catch (err) {
      console.error(err);
      return withCors(json({ error: 'The server had a problem. Try again in a minute.' }, 500), cors);
    }
  },
};

/* ---------- AI answer-finding ---------- */
const FACTS_SCHEMA = (conditions, cancerTypes, roles) => ({
  type: 'object',
  additionalProperties: false,
  required: ['facts'],
  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['person', 'kind', 'cond', 'type', 'age', 'said', 'quote'],
        properties: {
          person: { type: 'string', enum: roles },
          kind: { type: 'string', enum: ['cond', 'death'] },
          cond: { type: 'string', enum: [...conditions, ''] },
          type: { type: 'string', enum: [...cancerTypes, ''] },
          age: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          said: { type: 'string' },
          quote: { type: 'string' },
        },
      },
    },
  },
});

async function extract(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI answer-finding is not set up on this server yet.' }, 503);
  if (!(await allow(request, env, 'ai'))) return json({ error: 'Too many requests. Try again in an hour.' }, 429);
  const body = await request.json().catch(() => null);
  const text = String(body?.text || '').slice(0, MAX_TEXT);
  const people = (Array.isArray(body?.people) ? body.people : []).filter(p => p && typeof p.role === 'string').slice(0, 6);
  const conditions = (body?.conditions || []).filter(s => typeof s === 'string').slice(0, 40);
  const cancerTypes = (body?.cancerTypes || []).filter(s => typeof s === 'string').slice(0, 40);
  if (!text.trim() || !people.length || !conditions.length) return json({ error: 'Missing transcript, people or conditions.' }, 400);

  const roster = people.map(p => `- "${p.role}": ${String(p.name || '').slice(0, 60)}`).join('\n');
  const prompt = `A teenager interviewed a relative about family health history. The transcript may mix English with Telugu, Hindi, Spanish, Tamil, Kannada, Bengali, Gujarati, Urdu, Chinese, Vietnamese or other languages, in native script or romanized.

List every health fact the speaker states as true. Leave out illnesses the speaker says someone did not have, and anything said as a question.

People a fact can be about:
${roster}
When a sentence doesn't say who it is about, it is about "subject". "He" or "she" usually means the last person named.

For each fact:
- kind: "cond" for an illness, "death" for when someone died (cond and type empty, age = age at death).
- cond: one of the allowed condition ids. Map everyday words to them, for example "sugar" means diabetes and "BP" means high blood pressure.
- type: for cancer, the kind of cancer if said; otherwise empty.
- age: the age it started or was found, as a whole number, or null if not said. "In her forties" means 45.
- said: the exact words heard for the illness. quote: the sentence it came from.

Transcript:
"""
${text}
"""`;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: FACTS_SCHEMA(conditions, cancerTypes, people.map(p => p.role)) },
      },
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'The AI service is busy. Try again in a minute.' }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'The server’s AI key is not valid.' }, 503);
    if (error instanceof Anthropic.BadRequestError) return json({ error: 'The AI service could not read that request.' }, 400);
    if (error instanceof Anthropic.APIError) return json({ error: 'The AI service had a problem. Try again.' }, 502);
    throw error;
  }
  if (response.stop_reason === 'refusal') return json({ error: 'The AI service declined this transcript. Use the built-in word list instead.' }, 422);
  if (response.stop_reason === 'max_tokens') return json({ error: 'The transcript was too long to read at once. Try a shorter part.' }, 413);
  const out = response.content.find(b => b.type === 'text');
  let parsed;
  try { parsed = JSON.parse(out?.text || ''); } catch { return json({ error: 'The AI answer was not readable.' }, 502); }
  return json({ facts: Array.isArray(parsed.facts) ? parsed.facts : [] });
}

/* ---------- Speech to text ---------- */
async function transcribe(request, env) {
  if (!env.OPENAI_API_KEY) return json({ error: 'Speech-to-text is not set up on this server yet.' }, 503);
  if (!(await allow(request, env, 'ai'))) return json({ error: 'Too many requests. Try again in an hour.' }, 429);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return json({ error: 'No recording was sent.' }, 400);
  if (file.size > MAX_AUDIO) return json({ error: 'That recording is too long. Keep each answer under a few minutes.' }, 413);
  const lang = String(form.get('lang') || '').slice(0, 5);
  const up = new FormData();
  up.append('file', file, file.name || 'answer.webm');
  up.append('model', env.TRANSCRIBE_MODEL || 'whisper-1');
  if (/^[a-z]{2}$/.test(lang) && lang !== 'en') up.append('language', lang);
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: up });
  if (!res.ok) return json({ error: res.status === 429 ? 'The speech service is busy. Try again in a minute.' : 'The speech service could not read that recording.' }, res.status === 429 ? 429 : 502);
  const data = await res.json();
  return json({ text: String(data.text || '') });
}

/* ---------- Encrypted family sync ---------- */
// The phone encrypts the family (AES-GCM) before upload; the key stays in the share link, never sent here.
async function family(request, env, id) {
  if (!env.FAMILY) return json({ error: 'Family sync is not set up on this server yet.' }, 503);
  if (request.method === 'GET') {
    const value = await env.FAMILY.get(id);
    return value ? new Response(value, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }) : json({ error: 'Not found' }, 404);
  }
  if (request.method === 'PUT') {
    if (!(await allow(request, env, 'sync', 120))) return json({ error: 'Too many syncs. Try again later.' }, 429);
    const value = await request.text();
    if (value.length > MAX_FAMILY) return json({ error: 'This family is too large to sync.' }, 413);
    let ok = false;
    try { const v = JSON.parse(value); ok = typeof v.iv === 'string' && typeof v.ct === 'string' && Object.keys(v).length === 2; } catch {}
    if (!ok) return json({ error: 'Only encrypted families can be stored.' }, 400);
    await env.FAMILY.put(id, value, { expirationTtl: 60 * 60 * 24 * 400 }); // kept for about a year after the last sync
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
}

/* ---------- Helpers ---------- */
function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, PUT, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'origin' };
}
function withCors(res, cors) { const r = new Response(res.body, res); for (const [k, v] of Object.entries(cors)) r.headers.set(k, v); return r; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }); }
// A simple per-IP hourly counter in KV. Rough (KV is eventually consistent), but enough to stop casual abuse.
async function allow(request, env, bucket, limit = AI_PER_HOUR) {
  if (!env.FAMILY) return true;
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = `rate:${bucket}:${ip}:${Math.floor(Date.now() / 3600000)}`;
  const n = Number(await env.FAMILY.get(key)) || 0;
  if (n >= limit) return false;
  await env.FAMILY.put(key, String(n + 1), { expirationTtl: 3700 });
  return true;
}
