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
function hasWord(text, word) {
  if (!LATIN.test(word)) return text.indexOf(word);
  const m = new RegExp(`(^|[^a-záéíóúñü])${word.replace(/[.*+?^${}()|[\]\\']/g, '\\$&')}`, 'i').exec(text);
  return m ? m.index + m[1].length : -1;
}
function tokens(text) { return text.toLowerCase().split(/[\s,;:"'()]+/).filter(Boolean); }
function aboutWhom(sentence) {
  const toks = tokens(sentence);
  for (const [rel, { stems, not }] of Object.entries(KIN_WORDS)) {
    if (toks.some(t => stems.some(s => t.startsWith(s)) && !not.some(n => t.startsWith(n)))) return rel;
  }
  return null;
}
function agesIn(sentence) {
  const out = [];
  for (const m of sentence.matchAll(/\d{1,3}/g)) { const n = +m[0]; if (n > 0 && n <= 110) out.push({ n, at: m.index }); }
  const low = sentence.toLowerCase();
  for (const [w, n] of Object.entries(NUM_WORDS)) { const at = hasWord(low, w); if (at >= 0) out.push({ n, at }); }
  return out;
}
// Numbers right after a word ("passed away at 61") beat numbers before it ("heart attack at 54, and he passed away").
const nearest = (list, at, len = 0) => {
  const dist = x => x.at >= at ? x.at - (at + len) : (at - x.at) * 2;
  return list.reduce((best, x) => !best || dist(x) < dist(best) ? x : best, null);
};

// ctx: { subject: pid the question is about, mother: pid|null, father: pid|null }
function findAnswers(text, ctx) {
  const found = new Map();
  const sentences = text.split(/(?<=[.!?।\n])\s*/).map(s => s.trim()).filter(Boolean);
  for (const sentence of sentences) {
    const low = sentence.toLowerCase();
    const rel = aboutWhom(sentence);
    const pid = (rel && ctx[rel]) || ctx.subject;
    if (!pid) continue;
    const ages = agesIn(sentence);
    const negated = NEG_WORDS.some(w => hasWord(low, w) >= 0);
    // Death: "passed away at 61"
    const deathWord = DEATH_WORDS.find(w => hasWord(low, w) >= 0);
    if (deathWord) {
      const a = nearest(ages, hasWord(low, deathWord), deathWord.length);
      found.set(`death|${pid}`, { kind: 'death', pid, age: a ? String(a.n) : '', quote: sentence, said: deathWord });
    }
    for (const entry of LEXICON) {
      const hit = entry.words.map(w => ({ w, at: hasWord(low, w) })).filter(x => x.at >= 0).sort((a, b) => b.w.length - a.w.length)[0];
      if (!hit) continue;
      let type = '';
      if (entry.cond === 'cancer') {
        const t = CANCER_LEXICON.find(c => c.words.some(w => hasWord(low, w) >= 0));
        type = t ? t.type : '';
      }
      const a = nearest(ages.filter(x => Math.abs(x.at - hit.at) < 60), hit.at, hit.w.length);
      const key = `cond|${pid}|${entry.cond}|${type}`;
      const prev = found.get(key);
      found.set(key, { kind: 'cond', pid, cond: entry.cond, type, age: a ? String(a.n) : prev?.age || '', said: hit.w, quote: sentence, negated: negated && !a });
    }
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
