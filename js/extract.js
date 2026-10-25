// Finding answers in what a relative said.
//
// findAnswers() works offline with the everyday-word dictionary in content.js:
//   1. split the transcript into sentences,
//   2. decide who each sentence is about (mother/father words, otherwise the person the question was about),
//   3. look up condition words, then the nearest age (digits or spoken numbers like "యాభై" = 50),
//   4. notice "no / లేదు / नहीं" so a denial is not turned into a diagnosis.
// aiFindAnswers() asks Claude to do the same for messier speech. Both only make suggestions:
// nothing is saved until the teen taps "Add".
'use strict';

const LATIN = /[a-záéíóúñü]/i;
const LETTER = 'a-záéíóúñü';
const reEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Where `word` appears in `text` (from position `from`), or -1.
// English and Spanish words must be whole words (a plural "s" is fine), so "heartburn" is not "heart"
// and "now" is not "no". Telugu and Hindi words take suffixes (షుగర్‌తో), so any match counts.
function findWord(text, word, from = 0) {
  if (!LATIN.test(word)) return text.indexOf(word, from);
  const re = new RegExp(`(^|[^${LETTER}])${reEsc(word)}(?:s|es|'s)?(?![${LETTER}])`, 'gi');
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? m.index + m[1].length : -1;
}
const hasWord = (text, word) => findWord(text, word);
// Telugu (౦-౯) and Hindi (०-९) digits become 0-9.
const normalize = s => s.replace(/[०-९౦-౯]/g, d => String(d.charCodeAt(0) - (d.charCodeAt(0) >= 0x0C66 ? 0x0C66 : 0x0966)));

function aboutWhom(sentence) {
  const toks = sentence.toLowerCase().split(/[\s,;:"()!?.।]+/).filter(Boolean);
  for (const [rel, { stems, not }] of Object.entries(KIN_WORDS)) {
    // Short English words must match exactly ("mom" is not "moment"); longer and Indic stems may carry suffixes ("ammaki").
    const match = t => stems.some(s => LATIN.test(s) && s.length < 4 ? [s, s + 's', s + "'s"].includes(t) : t.startsWith(s));
    if (toks.some(t => match(t) && !not.some(n => t.startsWith(n)))) return rel;
  }
  return null;
}

// Every number in a sentence: digits, and spoken numbers like "forty-seven", "cuarenta y siete" or "నలభై ఏడు".
function numbersIn(low) {
  const out = [];
  for (const m of low.matchAll(/\d{1,4}/g)) out.push({ n: +m[0], at: m.index, len: m[0].length });
  const units = Object.keys(NUM_UNITS).sort((a, b) => b.length - a.length);
  for (const w of Object.keys(NUM_WORDS)) {
    for (let i = findWord(low, w); i >= 0; i = findWord(low, w, i + w.length)) {
      let n = NUM_WORDS[w], len = w.length;
      const rest = low.slice(i + w.length), sep = rest.match(/^[\s-]+(?:y\s+)?/);
      if (sep && n % 10 === 0) {
        const after = rest.slice(sep[0].length);
        const u = units.find(u => after.startsWith(u) && !(LATIN.test(u) && new RegExp(`[${LETTER}]`).test(after[u.length] || '')));
        if (u) { n += NUM_UNITS[u]; len += sep[0].length + u.length; }
      }
      out.push({ n, at: i, len });
    }
  }
  for (const [w, n] of Object.entries(NUM_TEENS)) for (let i = findWord(low, w); i >= 0; i = findWord(low, w, i + w.length)) out.push({ n, at: i, len: w.length });
  return out;
}
// "No" only counts when it is in the same part of the sentence as the illness.
const CLAUSE = /[,;]| but | pero | lekin | लेकिन | కానీ | kaani /;
function negatedNear(low, at, len) {
  const before = low.slice(Math.max(0, at - 32), at).split(CLAUSE).pop();
  const after = low.slice(at + len, at + len + 24).split(CLAUSE)[0];
  return NEG_WORDS.some(w => findWord(before, w) >= 0 || findWord(after, w) >= 0);
}
const firstWord = (low, list) => list.map(w => ({ w, at: findWord(low, w) })).filter(x => x.at >= 0).sort((a, b) => a.at - b.at || b.w.length - a.w.length)[0];

// Each number goes to the closest illness (or death word) in the sentence, so in
// "No diabetes, but her cholesterol was high at 47" the 47 belongs to cholesterol.
function assignAges(hits, ages) {
  const dist = (x, h) => x.at >= h.at ? x.at - (h.at + h.len) : (h.at - x.at) * 2;
  for (const x of ages) {
    const best = hits.reduce((b, h) => !b || dist(x, h) < dist(x, b) ? h : b, null);
    if (best && dist(x, best) < 60 && (!best.age || dist(x, best) < dist(best.age, best))) best.age = x;
  }
}

// ctx: { subject: pid the question is about, mother, father: pids or null, step: the interview step key }
function findAnswers(text, ctx) {
  const found = new Map();
  const sentences = normalize(text).split(/(?<=[.!?।\n])\s*/).map(s => s.trim()).filter(Boolean);
  let lastPid = null;
  for (const sentence of sentences) {
    const low = sentence.toLowerCase();
    const rel = aboutWhom(sentence);
    // "He had a heart attack" right after "My father..." is still about the father.
    const pronoun = !rel && lastPid && firstWord(low, PRONOUNS)?.at <= 2;
    const pid = (rel && ctx[rel]) || (pronoun ? lastPid : ctx.subject);
    if (!pid) continue;
    lastPid = pid;
    const nums = numbersIn(low), ages = nums.filter(x => x.n > 0 && x.n <= 110), years = nums.filter(x => x.n >= 1900 && x.n <= YEAR);

    // Birth year: "born in 1953", or any year said while answering the birth-year question.
    if (years.length && (ctx.step === 'born' || firstWord(low, BORN_WORDS))) found.set(`born|${pid}`, { kind: 'born', pid, year: String(years[0].n), said: String(years[0].n), quote: sentence });

    const hits = [];
    for (const entry of LEXICON) {
      const hit = firstWord(low, entry.words);
      if (!hit) continue;
      let type = '';
      if (entry.cond === 'cancer') {
        const t = CANCER_LEXICON.map(c => ({ c, hit: firstWord(low, c.words) })).filter(x => x.hit).sort((a, b) => Math.abs(a.hit.at - hit.at) - Math.abs(b.hit.at - hit.at))[0];
        type = t ? t.c.type : '';
      }
      hits.push({ kind: 'cond', cond: entry.cond, type, at: hit.at, len: hit.w.length, negated: negatedNear(low, hit.at, hit.w.length) });
    }
    const death = firstWord(low, DEATH_WORDS);
    if (death && !negatedNear(low, death.at, death.w.length)) hits.push({ kind: 'death', at: death.at, len: death.w.length });
    assignAges(hits.filter(h => !h.negated), ages);
    // "Died of a stroke at 72": the 72 is both the stroke age and the age at death.
    const d = hits.find(h => h.kind === 'death');
    if (d && !d.age) d.age = ages.filter(x => x.at > d.at).sort((a, b) => a.at - b.at)[0] || null;

    const condsHere = hits.filter(h => h.kind === 'cond' && !h.negated).map(h => h.cond === 'cancer' ? factName('cancer', h.type) : COND[h.cond].en);
    for (const h of hits) {
      const said = sentence.slice(h.at, h.at + h.len), age = h.age ? String(h.age.n) : '';
      if (h.kind === 'death') {
        const from = low.slice(h.at).match(/\b(?:from|of|due to|because of)\s+(?:a |an )?([a-z ]{3,30}?)(?=[.,;!?]|$| at | when )/);
        found.set(`death|${pid}`, { kind: 'death', pid, age, cause: condsHere[0] || (from ? from[1].trim() : ''), said, quote: sentence });
        continue;
      }
      const key = `cond|${pid}|${h.cond}|${h.type}`, prev = found.get(key);
      if (prev && !prev.negated && h.negated) continue;
      found.set(key, { kind: 'cond', pid, cond: h.cond, type: h.type, age: age || prev?.age || '', said, quote: sentence, negated: h.negated });
    }

    // Still living
    const alive = firstWord(low, LIVING_WORDS);
    if (alive && !death && !negatedNear(low, alive.at, alive.w.length)) found.set(`living|${pid}`, { kind: 'living', pid, said: sentence.slice(alive.at, alive.at + alive.w.length), quote: sentence });
  }
  return [...found.values()];
}

// Optional: ask Claude (through the artifact's `sample` capability) to read the transcript.
async function aiFindAnswers(text, ctx, people) {
  const sample = window.claude?.use ? await window.claude.use('sample') : null;
  if (!sample) throw { code: 'unavailable' };
  const roster = Object.entries(people).filter(([, id]) => id).map(([role, id]) => `- "${role}": ${nameOf(byId(id))}`).join('\n');
  const prompt = `A teenager interviewed a relative about family health history. The transcript may mix English, Telugu, Hindi or Spanish, in native script or romanized.
Find every health fact stated as true. Ignore illnesses the speaker says someone did NOT have.

People the facts can be about:
${roster}
If a sentence does not say who, it is about "subject".

Allowed conditions: ${CONDS.map(c => c.id).join(', ')}.
Allowed cancer types (only when cond is "cancer"): ${CANCER_TYPES.map(c => c.id).join(', ')}.

Reply with JSON only, in this shape:
{"facts":[{"person":"subject","kind":"cond","cond":"diabetes","type":"","age":50,"said":"exact words heard","quote":"the sentence"}]}
kind is "cond" for an illness, or "death" for when someone died (then cond is omitted and age is the age at death).
Use null for an unknown age.

Transcript:
"""${text.slice(0, 6000)}"""`;
  const out = await sample.json(prompt, { modelTier: 'default' });
  const list = Array.isArray(out?.facts) ? out.facts : [];
  return list.map(f => {
    const pid = people[f.person] || people.subject;
    if (!pid) return null;
    const age = Number.isFinite(+f.age) && +f.age > 0 && +f.age <= 110 ? String(Math.round(+f.age)) : '';
    if (f.kind === 'death') return { kind: 'death', pid, age, quote: String(f.quote || ''), said: String(f.said || ''), ai: true };
    if (!COND[f.cond]) return null;
    const type = f.cond === 'cancer' && CTYPE[f.type] ? f.type : '';
    return { kind: 'cond', pid, cond: f.cond, type, age, said: String(f.said || ''), quote: String(f.quote || ''), ai: true };
  }).filter(Boolean);
}
