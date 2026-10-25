// Elder mode: large-print, tap-to-answer screens a grandparent can use on their own,
// plus recorded question voices so "Listen" plays a real person instead of a robot voice.
'use strict';

/* ---------- Text helpers for any language ---------- */
const langInfo = id => LANGS.find(l => l.id === id) || LANGS[0];
// Inline attributes so text in any script gets the right font and direction.
function langAttrs(id) {
  const L = langInfo(id);
  return `lang="${id}"${L.dir ? ` dir="${L.dir}"` : ''} class="lang-${id}"${L.font ? ` style="font-family:'${L.font}', var(--f)"` : ''}`;
}
const say = (obj, lang) => obj[lang] || obj.en;
const sayRoman = (obj, lang) => obj[lang + '_r'] || '';

/* ---------- Recorded question voices ---------- */
// Every phrase the app can speak has a key: q:<question>, f:<follow-up>, e:<elder phrase>, c:<condition>, t:<cancer type>.
let VOICES = new Map();
async function loadVoices() {
  try { VOICES = new Map((await IDB.all('voices')).map(v => [v.id, { ...v, url: URL.createObjectURL(v.blob) }])); } catch { VOICES = new Map(); }
}
function voicePhrases() {
  return [
    ['Interview questions', Object.entries(Q).map(([k, o]) => ['q:' + k, o])],
    ['Follow-up questions', Object.entries(FOLLOW).map(([k, o]) => ['f:' + k, o])],
    ['Tap-to-answer words', Object.entries(ELDER_TEXT).map(([k, o]) => ['e:' + k, o])],
    ['Illnesses', CONDS.map(c => ['c:' + c.id, c])],
    ['Kinds of cancer', CANCER_TYPES.map(t => ['t:' + t.id, t])],
  ];
}
let PLAYING = null;
function stopSpeaking() { try { PLAYING?.pause(); window.speechSynthesis?.cancel(); } catch {} PLAYING = null; }
// Play phrases in order: a recorded voice when there is one, otherwise the device's speech voice.
async function speakSeq(items, lang) {
  stopSpeaking();
  const L = langInfo(lang);
  for (const { key, text } of items) {
    const v = VOICES.get(`${lang}|${key}`);
    if (v) {
      await new Promise(res => { const a = new Audio(v.url); PLAYING = a; a.onended = a.onerror = res; a.play().catch(res); });
    } else {
      const synth = window.speechSynthesis;
      const voice = synth?.getVoices().find(x => x.lang?.toLowerCase().startsWith(L.speech.slice(0, 2)));
      if (!synth || (!voice && synth.getVoices().length)) { toast(`No recorded voice yet for this phrase, and this device has no ${L.label.split(' · ').pop()} voice. Record one under "Question voices".`); return; }
      await new Promise(res => { const u = new SpeechSynthesisUtterance(text); u.lang = L.speech; if (voice) u.voice = voice; u.rate = 0.85; u.onend = u.onerror = res; synth.speak(u); });
    }
  }
}

let VREC = null; // the voice phrase being recorded
async function recordVoice(lang, key) {
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw 0;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream), chunks = [];
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const rec = { id: `${lang}|${key}`, lang, key, blob: new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), created: Date.now() };
      try { await IDB.put(rec, 'voices'); const old = VOICES.get(rec.id); if (old) URL.revokeObjectURL(old.url); VOICES.set(rec.id, { ...rec, url: URL.createObjectURL(rec.blob) }); }
      catch { toast("Couldn't save the recording."); }
      VREC = null; render();
    };
    VREC = { lang, key, mr }; mr.start(); render();
  } catch { toast("The microphone isn't available in this browser. Open the app in Chrome or Safari on a phone to record."); }
}
async function deleteVoice(id) { try { await IDB.del(id, 'voices'); } catch {} const v = VOICES.get(id); if (v) URL.revokeObjectURL(v.url); VOICES.delete(id); render(); }

// Voice packs: share one family member's recordings with other phones.
const blobToB64 = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(b); });
async function exportVoicePack(lang) {
  const list = [...VOICES.values()].filter(v => v.lang === lang);
  if (!list.length) { toast('Record at least one phrase first.'); return; }
  const pack = { kind: 'heirloom-voices', lang, voices: await Promise.all(list.map(async v => ({ key: v.key, type: v.blob.type, data: await blobToB64(v.blob) }))) };
  await saveFile(`heirloom-voices-${lang}.json`, new Blob([JSON.stringify(pack)], { type: 'application/json' }));
}
async function importVoicePack(file) {
  try {
    const pack = JSON.parse(await file.text());
    if (pack.kind !== 'heirloom-voices') throw 0;
    for (const v of pack.voices) {
      const blob = await (await fetch(`data:${v.type};base64,${v.data}`)).blob();
      const rec = { id: `${pack.lang}|${v.key}`, lang: pack.lang, key: v.key, blob, created: Date.now() };
      await IDB.put(rec, 'voices');
    }
    await loadVoices(); render(); toast(`Added ${pack.voices.length} recorded phrases`);
  } catch { toast("That file isn't a voice pack from this app."); }
}

function renderVoices() {
  const lang = S.voiceLang || (S.iv.lang !== 'en' ? S.iv.lang : 'te');
  const done = voicePhrases().flatMap(([, list]) => list).filter(([k]) => VOICES.has(`${lang}|${k}`)).length;
  const total = voicePhrases().flatMap(([, list]) => list).length;
  return `<div class="lesson">
    <div style="display:grid;gap:6px"><h1>Question voices</h1>
      <p class="muted">Ask a family member who speaks the language well to read each phrase aloud once. After that, "Listen" plays their voice during interviews and in elder mode, even on phones with no ${esc(langInfo(lang).label.split(' · ').pop())} speech voice.</p></div>
    <div class="setup">
      <label class="f">Language<select data-voice-lang>${LANGS.map(l => `<option value="${l.id}" ${l.id === lang ? 'selected' : ''}>${l.label}</option>`).join('')}</select></label>
      <div class="stat" style="--c:var(--iris)"><span>Recorded</span><div>${done}<small> / ${total}</small></div></div>
    </div>
    <div class="row"><button class="btn sm" data-action="voice-export" data-lang="${lang}">Save voice pack</button>
      <label class="btn sm" for="voice-import">Load a voice pack</label><input type="file" id="voice-import" class="sr" accept="application/json,.json" data-voice-import="1">
      <button class="btn sm" data-action="voices-close">Back to interview</button></div>
    ${voicePhrases().map(([title, list]) => `<section class="card" style="display:grid;gap:8px"><h2>${title}</h2><ul class="vlist">${list.map(([key, obj]) => {
      const id = `${lang}|${key}`, has = VOICES.has(id), live = VREC && VREC.key === key && VREC.lang === lang;
      return `<li><div class="vtext"><span ${langAttrs(lang)}>${esc(say(obj, lang))}</span>${sayRoman(obj, lang) ? `<span class="rm">${esc(sayRoman(obj, lang))}</span>` : ''}</div>
        <div class="vbtns">${has ? `<button class="zbtn" data-action="voice-play" data-key="${key}" data-lang="${lang}" aria-label="Play">▶</button>` : ''}
        ${live ? `<button class="btn sm rec-live" data-action="voice-stop"><span class="rec-dot"></span>Stop</button>` : `<button class="btn sm" data-action="voice-rec" data-key="${key}" data-lang="${lang}" ${VREC ? 'disabled' : ''}>${has ? 'Redo' : 'Record'}</button>`}
        ${has ? `<button class="link danger" data-action="voice-del" data-id="${id}">Delete</button>` : ''}</div></li>`;
    }).join('')}</ul></section>`).join('')}
  </div>`;
}

/* ---------- Elder mode ---------- */
// E: { who, i, lang, decade, contributor } — the person answering, card index, language, number-pad state.
let E = null;
function startElder(pid, lang, contributor = false) { E = { who: pid, i: 0, lang, decade: null, contributor }; render(); window.scrollTo({ top: 0 }); }
function exitElder() { stopSpeaking(); E = null; render(); }

const SECTIONS = ['self', 'mother', 'father'];
function elderCards() {
  const cards = [{ k: 'welcome' }, { k: 'born' }];
  for (const sect of SECTIONS) {
    if (sect !== 'self') cards.push({ k: 'living', sect }, { k: 'deathAge', sect });
    for (const c of CONDS) {
      cards.push({ k: 'cond', sect, cond: c.id });
      if (c.id === 'cancer') cards.push({ k: 'ctype', sect, cond: c.id });
      cards.push({ k: 'age', sect, cond: c.id });
    }
  }
  cards.push({ k: 'thanks' });
  return cards;
}
// The person a section is about; parents are added to the tree the first time an answer needs them.
function elderTarget(sect, create = false) {
  const W = byId(E.who);
  if (sect === 'self') return W;
  const found = sect === 'mother' ? motherOf(W.id, false) : fatherOf(W.id, false);
  if (found || !create) return found || null;
  const p = addRelative(sect, W.id); save(); return p;
}
const elderReports = (pid, cond) => S.reports.filter(r => r.pid === pid && r.cond === cond && r.by === E.who);
function elderSkip(card) {
  const t = card.sect ? elderTarget(card.sect) : null;
  if (card.k === 'deathAge') return !t || t.living !== 'no';
  if (card.k === 'age' || card.k === 'ctype') return !t || !elderReports(t.id, card.cond).length;
  return false;
}
function elderMove(dir) {
  const cards = elderCards();
  let i = E.i + dir;
  while (i > 0 && i < cards.length - 1 && elderSkip(cards[i])) i += dir;
  E.i = Math.max(0, Math.min(cards.length - 1, i)); E.decade = null;
  stopSpeaking(); render(); window.scrollTo({ top: 0 });
}
function elderListen() {
  const card = elderCards()[E.i], L = E.lang, T = ELDER_TEXT;
  const items = [];
  const push = (key, obj) => items.push({ key, text: say(obj, L) });
  if (card.k === 'welcome') push('e:welcome', T.welcome);
  else if (card.k === 'born') push('e:born_q', T.born_q);
  else if (card.k === 'living') { push('e:about_' + card.sect, T['about_' + card.sect]); push('e:living_q', T.living_q); }
  else if (card.k === 'deathAge') push('e:death_age_q', T.death_age_q);
  else if (card.k === 'cond') { push('e:had_' + card.sect, T['had_' + card.sect]); push('c:' + card.cond, COND[card.cond]); }
  else if (card.k === 'ctype') push('f:cancer_type', FOLLOW.cancer_type);
  else if (card.k === 'age') push('e:age', T.age);
  else push('e:thanks', T.thanks);
  speakSeq(items, L);
}
// Number pad for ages and birth years: tap the decade, then the exact number (or "not sure").
function numberPad(kind, value) {
  const L = E.lang, T = ELDER_TEXT;
  const decades = kind === 'year' ? Array.from({ length: 10 }, (_, i) => 1920 + i * 10).filter(d => d <= YEAR) : Array.from({ length: 10 }, (_, i) => i * 10);
  if (E.decade == null) return `<div class="pad">${decades.map(d => `<button class="padbtn" data-action="pad-decade" data-d="${d}">${kind === 'year' ? d + 's' : d === 0 ? '0–9' : d + 's'}</button>`).join('')}</div>
    ${value ? `<p class="pad-now">${esc(String(value))}</p>` : ''}`;
  return `<p class="pad-now">${E.decade}${kind === 'year' ? 's' : '–' + (E.decade + 9)}</p>
    <div class="pad">${Array.from({ length: 10 }, (_, i) => E.decade + i).filter(n => kind !== 'year' || n <= YEAR).map(n => `<button class="padbtn" data-action="pad-pick" data-n="${n}">${n}</button>`).join('')}
    <button class="padbtn wide" data-action="pad-pick" data-n="${kind === 'year' ? E.decade + 5 : E.decade + 5}" ${langAttrs(L)}>${esc(say(T.unsure, L))}</button>
    <button class="padbtn wide ghost" data-action="pad-decade" data-d="">${esc(say(T.back, L))}</button></div>`;
}
function renderElder() {
  const cards = elderCards(), card = cards[E.i], L = E.lang, T = ELDER_TEXT, W = byId(E.who);
  const t = card.sect ? elderTarget(card.sect) : null;
  const big = obj => `<p class="e-q" ${langAttrs(L)}>${esc(say(obj, L))}</p>${S.iv.roman !== false && sayRoman(obj, L) ? `<p class="e-rm">${esc(sayRoman(obj, L))}</p>` : ''}`;
  const yn = (state, action) => `<div class="e-yn">
    ${[['yes', T.yes, 'y'], ['no', T.no, 'n'], ['unknown', T.unsure, 'u']].map(([v, o, c]) => `<button class="e-btn ${c}" data-action="${action}" data-v="${v}" aria-pressed="${state === v}" ${langAttrs(L)}>${esc(say(o, L))}</button>`).join('')}</div>`;
  let body = '';
  if (card.k === 'welcome') body = `${mascot(110)}${big(T.welcome)}`;
  else if (card.k === 'born') body = `${big(T.born_q)}${numberPad('year', W.born)}`;
  else if (card.k === 'living') body = `<span class="e-sect" ${langAttrs(L)}>${esc(say(T['about_' + card.sect], L))}</span>${big(T.living_q)}${yn(t ? t.living : null, 'e-living')}`;
  else if (card.k === 'deathAge') body = `${big(T.death_age_q)}${numberPad('age', t?.deathAge)}`;
  else if (card.k === 'cond') {
    const c = COND[card.cond], rs = t ? elderReports(t.id, card.cond) : [];
    const state = rs.length ? 'yes' : E.no?.[`${card.sect}|${card.cond}`] ? 'no' : E.unsure?.[`${card.sect}|${card.cond}`] ? 'unknown' : null;
    body = `<span class="e-sect" ${langAttrs(L)}>${esc(say(T['had_' + card.sect], L))}</span>
      <p class="e-cond" ${langAttrs(L)}>${esc(say(c, L))}</p>${sayRoman(c, L) ? `<p class="e-rm">${esc(sayRoman(c, L))}</p>` : ''}${L !== 'en' ? `<p class="e-en">${esc(c.en)}</p>` : ''}
      ${yn(state, 'e-cond')}`;
  } else if (card.k === 'ctype') {
    const chosen = new Set(elderReports(t.id, 'cancer').map(r => r.type).filter(Boolean));
    body = `${big(FOLLOW.cancer_type)}<div class="e-types">${CANCER_TYPES.map(ct => `<button class="e-type" data-action="e-ctype" data-type="${ct.id}" aria-pressed="${chosen.has(ct.id)}"><span ${langAttrs(L)}>${esc(say(ct, L))}</span>${L !== 'en' ? `<small>${esc(ct.en)}</small>` : ''}</button>`).join('')}</div>`;
  } else if (card.k === 'age') {
    const r = elderReports(t.id, card.cond)[0];
    body = `<span class="e-sect" ${langAttrs(L)}>${esc(say(COND[card.cond], L))}</span>${big(T.age)}${numberPad('age', r?.age)}`;
  } else body = `${mascot(120, true)}${big(T.thanks)}${E.contributor ? `<button class="e-btn y big" data-action="contrib-send" ${langAttrs(L)}>${esc(say(T.send_back, L))}</button>` : `<button class="btn primary" data-action="elder-exit">Back to the interview</button>`}`;
  const pct = Math.round(E.i / (cards.length - 1) * 100);
  return `<div class="elder">
    <div class="e-top"><div class="bar"><i style="width:${pct}%"></i></div>
      ${E.contributor ? '' : `<button class="link" data-action="elder-exit">Exit large mode</button>`}</div>
    <div class="e-card">${body}</div>
    <div class="e-nav">
      <button class="e-nav-btn" data-action="elder-prev" ${E.i === 0 ? 'disabled' : ''}>‹ <span ${langAttrs(L)}>${esc(say(T.back, L))}</span></button>
      <button class="e-listen" data-action="elder-listen" aria-label="Listen">${ICON.speaker}<span ${langAttrs(L)}>${esc(say(T.listen, L))}</span></button>
      <button class="e-nav-btn next" data-action="elder-next" ${E.i === cards.length - 1 ? 'disabled' : ''}><span ${langAttrs(L)}>${esc(say(T.next, L))}</span> ›</button>
    </div>
  </div>`;
}
// Handle a tap in elder mode. Returns true when the action belonged to elder mode.
function elderAction(a, b) {
  if (!E) return false;
  const card = elderCards()[E.i];
  switch (a) {
    case 'elder-next': elderMove(1); return true;
    case 'elder-prev': elderMove(-1); return true;
    case 'elder-listen': elderListen(); return true;
    case 'elder-exit': exitElder(); return true;
    case 'e-living': { const t = elderTarget(card.sect, true); t.living = b.dataset.v; save(); setTimeout(() => elderMove(1), 250); render(); return true; }
    case 'e-cond': {
      const v = b.dataset.v, key = `${card.sect}|${card.cond}`;
      E.no ||= {}; E.unsure ||= {};
      E.no[key] = v === 'no'; E.unsure[key] = v === 'unknown';
      if (v === 'yes') { const t = elderTarget(card.sect, true); if (!elderReports(t.id, card.cond).length) addReport(t.id, card.cond, '', E.who); }
      else { const t = elderTarget(card.sect); if (t) dropReports(r => r.pid === t.id && r.cond === card.cond && r.by === E.who); }
      save(); render(); setTimeout(() => elderMove(1), 250); return true;
    }
    case 'e-ctype': {
      const t = elderTarget(card.sect, true), type = b.dataset.type;
      const mine = r => r.pid === t.id && r.cond === 'cancer' && r.by === E.who;
      if (findReport(t.id, 'cancer', type, E.who)) dropReports(r => mine(r) && r.type === type);
      else { const blank = findReport(t.id, 'cancer', '', E.who); if (blank) blank.type = type; else addReport(t.id, 'cancer', type, E.who); }
      if (!S.reports.some(mine)) addReport(t.id, 'cancer', '', E.who);
      save(); render(); return true;
    }
    case 'pad-decade': E.decade = b.dataset.d === '' ? null : +b.dataset.d; render(); return true;
    case 'pad-pick': {
      const n = String(b.dataset.n);
      if (card.k === 'born') byId(E.who).born = n;
      else if (card.k === 'deathAge') elderTarget(card.sect, true).deathAge = n;
      else if (card.k === 'age') { const t = elderTarget(card.sect, true); const rs = elderReports(t.id, card.cond); (rs.length ? rs : [addReport(t.id, card.cond, '', E.who)]).forEach(r => { r.age = n; }); }
      save(); setTimeout(() => elderMove(1), 200); render(); return true;
    }
  }
  return false;
}
