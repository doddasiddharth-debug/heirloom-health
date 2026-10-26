// Finding answers in what a relative said.
//
// findAnswers() works offline with the everyday-word dictionary in content.js:
//   1. split the transcript into sentences,
//   2. decide who each part of a sentence is about (mother/father words, otherwise the person the question
//      was about; parts about a relative we can't place, like "my uncle", are left out),
//   3. look up condition words, then the nearest age (digits or spoken numbers like "యాభై" = 50),
//   4. notice "no / లేదు / नहीं" so a denial is not turned into a diagnosis.
// aiFindAnswers() asks Claude to do the same for messier speech. Both only make suggestions:
// nothing is saved until the teen taps "Add".
'use strict';

const LATIN = /[a-záéíóúñü]/i;
const LETTER = 'a-záéíóúñü';
const reEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const WORDCH = /[\p{L}\p{M}]/u, HAN = /\p{Script=Han}/u, VIRAMA = /[\u094D\u09CD\u0ACD\u0BCD\u0C4D\u0CCD]/;
const falseFriend = (text, word, i) => (FALSE_FRIENDS[word] || []).some(p => { const k = p.indexOf(word); return text.startsWith(p, i - k); });
// Where `word` appears in `text` (from position `from`), or -1.
// Latin-script words must be whole words, so "heartburn" is not "heart" and "now" is not "no"; a plural
// "s" is fine on words of 4+ letters ("más" is not "má"). Other scripts take suffixes (షుగర్‌తో), so only the
// start must begin a word ("दिल्ली" is not "दिल", "पैंतीस" is not "तीस") and the stem's last letter must not
// join the next one (दिल्ली). Chinese has no spaces, so its words match anywhere.
const WORD_RE = new Map(), NFC = new Map();
function findWord(text, word, from = 0) {
  if (!NFC.has(word)) NFC.set(word, word.normalize('NFC'));
  word = NFC.get(word);
  if (text.indexOf(word, from) < 0) return -1; // texts and words are lower case
  if (LATIN.test(word)) {
    let re = WORD_RE.get(word);
    if (!re) WORD_RE.set(word, re = new RegExp(`(?<![\\p{Script=Latin}\\p{M}])${reEsc(word)}(?:${word.length < 4 ? '' : 's|es|'}'s)?(?![\\p{Script=Latin}\\p{M}])`, 'giu'));
    re.lastIndex = from;
    for (let m; (m = re.exec(text));) {
      if (!falseFriend(text, word, m.index)) return m.index;
      re.lastIndex = m.index + 1;
    }
    return -1;
  }
  for (let i = text.indexOf(word, from); i >= 0; i = text.indexOf(word, i + 1)) {
    const startOK = HAN.test(word) || !WORDCH.test(word[0]) || !WORDCH.test(text[i - 1] || ' ');
    if (startOK && !VIRAMA.test(text[i + word.length] || '') && !falseFriend(text, word, i)) return i;
  }
  return -1;
}
const hasWord = (text, word) => findWord(text, word);
// Every place any of `words` appears, longest first where they overlap ("small bowel", not "bowel").
function allWords(low, words) {
  const out = [];
  for (const w of words) for (let i = findWord(low, w); i >= 0; i = findWord(low, w, i + 1)) out.push({ w, at: i, len: w.length });
  out.sort((a, b) => b.len - a.len || a.at - b.at);
  return out.filter((x, k) => !out.slice(0, k).some(y => x.at < y.at + y.len && y.at < x.at + x.len)).sort((a, b) => a.at - b.at);
}
// Digits from every script the app supports (Hindi ०-९, Telugu ౦-౯, Bengali, Gujarati, Tamil, Kannada, Urdu, full-width) become 0-9.
const DIGIT_ZEROS = [0x0966, 0x09E6, 0x0AE6, 0x0BE6, 0x0C66, 0x0CE6, 0x0660, 0x06F0, 0xFF10];
const normalize = s => s.normalize('NFC').replace(/[\u0966-\u096F\u09E6-\u09EF\u0AE6-\u0AEF\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0660-\u0669\u06F0-\u06F9\uFF10-\uFF19]/g,
  d => String(d.codePointAt(0) - DIGIT_ZEROS.find(z => d.codePointAt(0) >= z && d.codePointAt(0) <= z + 9)));

// Who a part of a sentence is about: 'mother', 'father', 'other' (a relative we can't place), 'self' or null.
function aboutWhom(part) {
  const toks = part.toLowerCase().replace(/[\s-]+in[\s-]+law\b/g, '-in-law').split(/[\s,;:"()!?.।，、،]+/).filter(Boolean);
  // Short English words must match exactly ("mom" is not "moment"); longer and Indic stems may carry suffixes ("ammaki").
  // Chinese relatives can sit anywhere in the unspaced sentence ("我奶奶…").
  const match = (t, s, rel) => s.includes(' ') ? findWord(part, s) >= 0 : rel === 'other' && HAN.test(s) ? t.includes(s)
    : LATIN.test(s) && s.length < 4 ? t === s || t === s + "'s" : t.startsWith(s);
  const kinOf = t => Object.keys(KIN_WORDS).find(rel => KIN_WORDS[rel].stems.some(s => match(t, s, rel)) && !KIN_WORDS[rel].not.some(n => t.startsWith(n)));
  const rels = toks.map(kinOf);
  // "My mom's dad", "माँ के पिता", "el papá de mi mamá", "妈妈的爸爸": someone else's parent is not a parent.
  const ofKin = (r, i) => r && r !== 'other' && (
    KIN_OF_ENDS.some(e => toks[i].endsWith(e)) && rels.slice(i + 1, i + 3).some(Boolean)
    || KIN_OF.includes(toks[i + 1]) && toks[i + 1] !== 'de' && rels.slice(i + 2, i + 4).some(Boolean)
    || [toks[i - 1], toks[i - 2]].includes('de') && rels.slice(0, i).some(Boolean));
  if (rels.some(ofKin) || /(?:妈|母亲|爸|父亲)的/.test(part) && kinOf(part.split(/(?:妈|母亲|爸|父亲)的/)[1])) return 'other';
  for (const rel of ['mother', 'father', 'other']) if (rels.includes(rel)) return rel;
  return toks.some(t => SELF_WORDS.some(w => LATIN.test(w) ? t === w : t.startsWith(w))) ? 'self' : null;
}

// Every number in a sentence: digits, and spoken numbers like "forty-seven", "cuarenta y siete" or "నలభై ఏడు".
// Labels ("type 2") and lengths of time ("for ten years", "10 saal se") are left out.
function numbersIn(low) {
  const out = [];
  for (const m of low.matchAll(/\d{1,4}/g)) out.push({ n: +m[0], at: m.index, len: m[0].length });
  const units = Object.keys(NUM_UNITS).sort((a, b) => b.length - a.length);
  for (const w of Object.keys(NUM_WORDS)) {
    for (let i = findWord(low, w); i >= 0; i = findWord(low, w, i + w.length)) {
      let n = NUM_WORDS[w], len = w.length;
      const rest = low.slice(i + w.length), sep = rest.match(LATIN.test(w) ? /^[\s-]+(?:y\s+)?/ : /^[\s-]*/);
      if (NUM_NEEDS[w] && !NUM_NEEDS[w].test(rest)) continue;
      if (sep && n % 10 === 0) {
        const after = rest.slice(sep[0].length);
        const u = units.find(u => after.startsWith(u) && !(LATIN.test(u) && new RegExp(`[${LETTER}]`).test(after[u.length] || '')));
        if (u) { n += NUM_UNITS[u]; len += sep[0].length + u.length; }
      }
      out.push({ n, at: i, len });
    }
  }
  for (const [w, n] of Object.entries(NUM_TEENS)) for (let i = findWord(low, w); i >= 0; i = findWord(low, w, i + w.length)) out.push({ n, at: i, len: w.length });
  return out.filter(x => !isLabel(low, x) && !isDuration(low, x));
}
const endsWithWord = (text, list) => list.some(w => { const i = text.lastIndexOf(w); return i >= 0 && findWord(text, w, i) === i && !text.slice(i + w.length).trim(); });
const isLabel = (low, x) => endsWithWord(low.slice(Math.max(0, x.at - 14), x.at).replace(/[\s-]+$/, ''), NUM_LABELS)
  || NUM_LABELS_AFTER.some(w => low.slice(x.at + x.len).trimStart().startsWith(w));
function isDuration(low, x) {
  const rest = low.slice(x.at + x.len).trimStart();
  if (YEARS_LONG.some(u => rest.startsWith(u)) || FOR_PHRASES.some(p => rest.startsWith(p))) return true;
  const unit = YEAR_UNITS.find(u => rest.startsWith(u) && findWord(rest, u) === 0);
  if (!unit) return false;
  const tok = rest.match(/^\S+/)[0].replace(/[.,;!?।]+$/, ''), next = rest.slice(tok.length).trimStart();
  const before = low.slice(Math.max(0, x.at - 24), x.at).split(/\s+/).filter(Boolean).slice(-2);
  return FOR_AFTER.some(w => tok.endsWith(w) || next.startsWith(w) && findWord(next, w) === 0) || before.some(t => FOR_BEFORE.includes(t));
}

// Where parts of a sentence end: commas (also ， 、 ،), semicolons and "but" words; with `and`, also "and" words.
function cutsIn(low, and) {
  const cuts = [...low.matchAll(/[,;，、،؛]/g)].map(m => ({ at: m.index, end: m.index + 1 }));
  for (const w of and ? BUT_WORDS.concat(AND_WORDS) : BUT_WORDS) for (let i = findWord(low, w); i >= 0; i = findWord(low, w, i + 1)) cuts.push({ at: i, end: i + w.length });
  return cuts.sort((a, b) => a.at - b.at);
}
// "No" only counts in the same part of the sentence as the illness: just before it ("no diabetes", "I don't have
// diabetes", "没有糖尿病"), or, for languages that put it last, right after it ("షుగర్ లేదు", "शुगर नहीं है").
let NEG_AFTER = null;
function negatedNear(low, at, len, cuts, stops = []) {
  NEG_AFTER ||= NEG_WORDS.filter(w => !NEG_BEFORE.includes(w));
  const from = Math.max(0, ...cuts.filter(c => c.end <= at).map(c => c.end), at - 48);
  const to = Math.min(low.length, ...cuts.filter(c => c.at >= at + len).map(c => c.at), ...stops.filter(s => s > at), at + len + 32);
  let before = low.slice(from, at);
  for (const w of NEG_STOPS) { const i = before.lastIndexOf(w); if (i >= 0 && findWord(before, w, i) === i) before = before.slice(i + w.length); }
  const pre = NEG_BEFORE.some(w => {
    let last = -1;
    for (let i = findWord(before, w); i >= 0; i = findWord(before, w, i + 1)) last = i;
    return last >= 0 && (before.slice(last + w.length).match(/\S+/g) || []).length <= 5;
  });
  const after = (low.slice(at + len, to).match(/\S+/g) || []).slice(0, 4).join(' ');
  return pre || NEG_AFTER.some(w => findWord(' ' + after + ' ', w) >= 0);
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
  // "Breast and ovarian cancer at 45": kinds named by the same cancer word share its age.
  for (const h of hits) if (!h.age) h.age = hits.find(o => o.at === h.at && o.age)?.age;
}

// Illness words in a sentence. Most count once per part; every cancer counts, each with its nearest kind.
function condHits(low, parts) {
  const hits = [];
  for (const entry of LEXICON) {
    if (entry.cond === 'cancer') {
      const ca = allWords(low, entry.words), kinds = CANCER_LEXICON.flatMap(c => allWords(low, c.words).map(k => ({ ...k, type: c.type })));
      const near = k => ca.reduce((b, c) => !b || Math.abs(c.at - k.at) < Math.abs(b.at - k.at) ? c : b, null);
      for (const c of ca) {
        const mine = kinds.filter(k => near(k) === c && Math.abs(k.at - c.at) < 40);
        for (const type of mine.length ? [...new Set(mine.map(k => k.type))] : ['']) hits.push({ kind: 'cond', cond: 'cancer', type, at: c.at, len: c.len });
      }
      continue;
    }
    const words = entry.words.filter(w => findWord(low, w) >= 0);
    if (words.length) for (const p of parts) {
      const hit = firstWord(low.slice(p.at, p.end), words);
      if (hit) hits.push({ kind: 'cond', cond: entry.cond, type: '', at: p.at + hit.at, len: hit.w.length });
    }
  }
  return hits;
}

// ctx: { subject: pid the question is about, mother, father: pids or null, step: the interview step key, self: pid of the speaker (optional) }
function findAnswers(text, ctx) {
  const found = new Map();
  const sentences = normalize(text).split(/(?<=[.!?।。！？۔؟\n])\s*/).map(s => s.trim()).filter(Boolean);
  const parentStep = /^(mother|father)_/.test(ctx.step || '');
  let lastPid; // who the last sentence ended on; null after a relative we can't place ("My uncle…")
  for (const sentence of sentences) {
    const low = sentence.toLowerCase().replace(/’/g, "'");
    const cuts = cutsIn(low), nums = numbersIn(low);
    const ages = nums.filter(x => x.n > 0 && x.n <= 110), years = nums.filter(x => x.n >= 1900 && x.n <= YEAR);

    // Parts of the sentence, split at commas and "and / but" words.
    const segs = [];
    let a = 0;
    for (const c of [...cutsIn(low, true), { at: low.length, end: low.length }]) if (c.at >= a) { segs.push({ at: a, end: c.at }); a = c.end; }
    const hits = condHits(low, segs);
    const death = allWords(low, DEATH_WORDS), born = firstWord(low, BORN_WORDS), alive = firstWord(low, LIVING_WORDS);
    // A part that says nothing joins the next one ("My mother, father and brother had…").
    const facts = [...hits, ...death, born, alive].filter(Boolean), parts = [];
    let start = null;
    segs.forEach((g, k) => {
      if (k < segs.length - 1 && !facts.some(f => f.at >= g.at && f.at < g.end)) { start ??= g.at; return; }
      parts.push({ at: start ?? g.at, end: g.end }); start = null;
    });
    // Each part is about whoever it names, else whoever the part before was about.
    let pid;
    parts.forEach((p, k) => {
      let rel = aboutWhom(low.slice(p.at, p.end));
      if (rel === 'self' && parentStep) rel = null; // "I think she…" while answering about a parent
      if (rel === 'mother' || rel === 'father' || rel === 'other') pid = ctx[rel] || null;
      else if (rel === 'self') pid = ctx.self || ctx.subject;
      else if (k === 0) pid = firstWord(low, PRONOUNS)?.at <= 2 && lastPid !== undefined ? lastPid : ctx.subject; // "He…" after "My father…"
      p.pid = pid;
    });
    lastPid = pid;
    const whose = at => [...parts].reverse().find(p => p.at <= at)?.pid ?? null;

    // Birth year: "born in 1953", or any year said while answering the birth-year question.
    if (years.length && (ctx.step === 'born' || born)) {
      const p = whose(born ? born.at : years[0].at);
      if (p) found.set(`born|${p}`, { kind: 'born', pid: p, year: String(years[0].n), said: String(years[0].n), quote: sentence });
    }

    const stops = hits.map(h => h.at);
    for (const h of hits) h.negated = negatedNear(low, h.at, h.len, cuts, stops);
    const deaths = death.filter(d => !negatedNear(low, d.at, d.len, cuts)).map(d => ({ kind: 'death', at: d.at, len: d.len }))
      .filter((d, k, all) => all.findIndex(o => whose(o.at) === whose(d.at)) === k);
    hits.push(...deaths);
    assignAges(hits.filter(h => !h.negated), ages);
    for (const d of deaths) if (!d.age) d.age = ages.filter(x => x.at > d.at).sort((a, b) => a.at - b.at)[0] || null; // "Died of a stroke at 72": 72 is both.

    for (const h of hits) {
      const p = whose(h.at);
      if (!p) continue;
      const said = sentence.slice(h.at, h.at + h.len), age = h.age ? String(h.age.n) : '';
      if (h.kind === 'death') {
        const condsHere = hits.filter(o => o.kind === 'cond' && !o.negated && whose(o.at) === p).map(o => o.cond === 'cancer' ? factName('cancer', o.type) : COND[o.cond].en);
        const from = low.slice(h.at).match(/\b(?:from|of|due to|because of)\s+(?:a |an )?([a-z ]{3,30}?)(?=[.,;!?]|$| at | when )/);
        found.set(`death|${p}`, { kind: 'death', pid: p, age, cause: condsHere[0] || (from ? from[1].trim() : ''), said, quote: sentence });
        continue;
      }
      const key = `cond|${p}|${h.cond}|${h.type}`, prev = found.get(key);
      if (prev && !prev.negated && h.negated) continue;
      found.set(key, { kind: 'cond', pid: p, cond: h.cond, type: h.type, age: age || prev?.age || '', said, quote: sentence, negated: h.negated });
    }

    // Still living
    const ap = alive && whose(alive.at);
    if (ap && !deaths.some(d => whose(d.at) === ap) && !negatedNear(low, alive.at, alive.w.length, cuts)) found.set(`living|${ap}`, { kind: 'living', pid: ap, said: sentence.slice(alive.at, alive.at + alive.w.length), quote: sentence });
  }
  return [...found.values()];
}

// Optional: ask Claude (through the artifact's `sample` capability) to read the transcript.
async function aiFindAnswers(text, ctx, people) {
  const sample = window.claude?.use ? await window.claude.use('sample') : null;
  if (!sample && window.CONFIG?.apiBase) return serverFindAnswers(text, people);
  if (!sample) throw { code: 'unavailable' };
  const roster = Object.entries(people).filter(([role, id]) => role !== 'step' && byId(id)).map(([role, id]) => `- "${role}": ${nameOf(byId(id))}`).join('\n');
  const prompt = `A teenager interviewed a relative about family health history. The transcript may mix English with Telugu, Hindi, Spanish, Tamil, Kannada, Bengali, Gujarati, Urdu, Chinese or Vietnamese, in native script or romanized.
Find every health fact stated as true. Ignore illnesses the speaker says someone did NOT have.

People the facts can be about:
${roster}
If a sentence does not say who, it is about "subject".

Allowed conditions: ${CONDS.filter(c => !c.free).map(c => c.id).join(', ')}.
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

// The same job done by the Heirloom server (server/worker.js), for the public website.
async function serverFindAnswers(text, people) {
  const roster = Object.entries(people).filter(([role, id]) => id && role !== 'step' && byId(id)).map(([role, id]) => ({ role, name: nameOf(byId(id)) }));
  const res = await fetch(`${CONFIG.apiBase}/api/extract`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 8000), people: roster, conditions: CONDS.filter(c => !c.free).map(c => c.id), cancerTypes: CANCER_TYPES.map(c => c.id) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: 'server', message: data.error };
  return (data.facts || []).map(f => {
    const pid = people[f.person] || people.subject;
    if (!pid || !byId(pid)) return null;
    // The model may send the age as a number or as digits in a string ("50").
    const n = Number.isInteger(f.age) ? f.age : /^\d{1,3}$/.test(String(f.age ?? '').trim()) ? +f.age : 0;
    const age = n > 0 && n <= 110 ? String(n) : '';
    if (f.kind === 'death') return { kind: 'death', pid, age, quote: String(f.quote || ''), said: String(f.said || ''), ai: true };
    if (!COND[f.cond]) return null;
    return { kind: 'cond', pid, cond: f.cond, type: f.cond === 'cancer' && CTYPE[f.type] ? f.type : '', age, said: String(f.said || ''), quote: String(f.quote || ''), ai: true };
  }).filter(Boolean);
}
// Turn a recording into text with the Heirloom server.
async function serverTranscribe(blob, lang) {
  const form = new FormData();
  form.append('file', blob, 'answer.' + ((blob.type.split('/')[1] || 'webm').split(';')[0]));
  form.append('lang', lang);
  const res = await fetch(`${CONFIG.apiBase}/api/transcribe`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: 'server', message: data.error };
  return data.text || '';
}
