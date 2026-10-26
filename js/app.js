// App: state, screens and event handling.
'use strict';
const YEAR = new Date().getFullYear();
const KEY = 'heirloom-health-v2';

/* ---------- Helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const $ = s => document.querySelector(s);
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2800); }
function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function fmtDate(iso) { try { return new Date(iso + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return iso; } }
function today() { return new Date().toISOString().slice(0, 10); }
const tr = (obj, lang) => obj[lang] || obj.en;

/* ---------- Example family and state ---------- */
function exampleState() {
  const P = (id, o) => newPerson({ id, ...o });
  const people = [
    P('self', { name: 'Ananya', sex: 'F', born: '2010', living: 'yes', ancestry: ['southasian'] }),
    P('ravi', { name: 'Ravi', sex: 'M', born: '1975', living: 'yes', interviewed: '2026-10-12', transcripts: { father_cond: 'My father had sugar from about 50. He had a heart attack at 54, and he passed away at 61.' } }),
    P('lakshmi', { name: 'Lakshmi', sex: 'F', born: '1978', living: 'yes', interviewed: '2026-10-11', transcripts: { mother_cond: 'మా అమ్మకి 47 ఏళ్ళప్పుడు రొమ్ము క్యాన్సర్ వచ్చింది. తర్వాత థైరాయిడ్ కూడా వచ్చింది, అరవై లో. షుగర్ లేదు.' } }),
    P('venkata', { name: 'Venkata Rao', sex: 'M', born: '1945', living: 'no', deathAge: '61', cause: 'Heart attack' }),
    P('saraswathi', { name: 'Saraswathi', sex: 'F', born: '1950', living: 'yes', interviewed: '2026-10-12' }),
    P('krishna', { name: 'Krishna Murthy', sex: 'M', born: '1948', living: 'no', deathAge: '72', cause: 'Stroke' }),
    P('padma', { name: 'Padma', sex: 'F', born: '1953', living: 'yes', interviewed: '2026-10-18' }),
    P('kamala', { name: 'Kamala', sex: 'F', born: '1931', living: 'no', deathAge: '58', cause: 'Breast cancer' }),
    P('srinivas', { name: 'Srinivas', sex: 'M', born: '1972', living: 'yes' }),
    P('anitha', { name: 'Anitha', sex: 'F', born: '1975', living: 'yes' }),
    P('kiran', { name: 'Kiran', sex: 'M', born: '2004', living: 'yes' }),
    P('kavitha', { name: 'Kavitha', sex: 'F', born: '1981', living: 'yes' }),
    P('mahesh', { name: 'Mahesh', sex: 'M', born: '1979', living: 'yes' }),
    P('arjun', { name: 'Arjun', sex: 'M', born: '2013', living: 'yes' }),
  ];
  const par = (parent, child, bio = true) => ({ kind: 'parent', parent, child, bio });
  const pt = (a, b) => ({ kind: 'partner', a, b });
  const rels = [
    pt('ravi', 'lakshmi'), par('ravi', 'self'), par('lakshmi', 'self'), par('ravi', 'arjun'), par('lakshmi', 'arjun'),
    pt('venkata', 'saraswathi'), par('venkata', 'ravi'), par('saraswathi', 'ravi'), par('venkata', 'srinivas'), par('saraswathi', 'srinivas'),
    pt('krishna', 'padma'), par('krishna', 'lakshmi'), par('padma', 'lakshmi'), par('krishna', 'kavitha'), par('padma', 'kavitha'),
    par('kamala', 'padma'),
    pt('srinivas', 'anitha'), par('srinivas', 'kiran'), par('anitha', 'kiran'),
    pt('mahesh', 'kavitha'),
  ];
  const R = (pid, cond, type, age, by, said = '') => ({ id: uid('r'), pid, cond, type, age: String(age || ''), said, by, at: '2026-10-12' });
  const reports = [
    R('lakshmi', 'thyroid', '', 38, 'lakshmi'), R('lakshmi', 'chol', '', 44, 'lakshmi'),
    R('ravi', 'bp', '', 41, 'ravi', 'BP'), R('ravi', 'diabetes', '', 46, 'ravi', 'sugar'),
    R('venkata', 'heart', '', 54, 'ravi', 'heart attack'), R('venkata', 'heart', '', 51, 'saraswathi', 'గుండెపోటు'),
    R('venkata', 'diabetes', '', 50, 'ravi', 'sugar'), R('venkata', 'diabetes', '', 45, 'srinivas', 'షుగర్'),
    R('saraswathi', 'diabetes', '', 55, 'saraswathi', 'షుగర్'), R('saraswathi', 'bp', '', 52, 'saraswathi', 'బీపీ'),
    R('krishna', 'stroke', '', 70, 'lakshmi', 'పక్షవాతం'), R('krishna', 'bp', '', 50, 'lakshmi'), R('krishna', 'cancer', 'colorectal', 66, 'padma', 'పెద్దప్రేగు క్యాన్సర్'),
    R('padma', 'cancer', 'breast', 47, 'padma', 'రొమ్ము క్యాన్సర్'), R('padma', 'thyroid', '', 60, 'padma'),
    R('kamala', 'cancer', 'breast', 55, 'padma', 'రొమ్ము క్యాన్సర్'),
    R('srinivas', 'heart', '', 49, 'ravi', 'heart attack'), R('srinivas', 'diabetes', '', 44, 'ravi', 'sugar'),
    R('kiran', 'asthma', '', '', 'self'), R('mahesh', 'heart', '', 50, 'self'), R('arjun', 'asthma', '', 6, 'self'),
  ];
  return { v: 2, example: true, people, rels, reports, sel: SELF, hl: 'any', tab: 'tree', iv: { who: 'lakshmi', step: 0, lang: 'te', roman: true } };
}
function blankState(me = {}) {
  const S0 = { v: 2, example: false, people: [newPerson({ ...me, id: SELF, living: 'yes' })], rels: [], reports: [], sel: SELF, hl: 'any', tab: 'tree', iv: { who: '', step: 0, lang: 'te', roman: true } };
  const keep = S; S = S0; touchFamily();
  const [dad, mom] = ensureParents(SELF);
  addRelative('father', dad); addRelative('mother', dad); addRelative('father', mom); addRelative('mother', mom);
  S0.iv.who = mom; S = keep;
  return S0;
}
// Data saved by the first version (fixed roles) is converted into the family graph.
function migrateV1(v) {
  if (v.example) return null;
  const roleId = r => r === 'self' ? SELF : r;
  const people = v.people.map(p => newPerson({ ...p, id: roleId(p.id), conds: undefined, role: undefined }));
  const rels = [], reports = [];
  const has = id => people.some(p => p.id === id);
  const par = (a, b) => has(a) && has(b) && rels.push({ kind: 'parent', parent: a, child: b, bio: true });
  const pt = (a, b) => has(a) && has(b) && rels.push({ kind: 'partner', a, b });
  pt('father', 'mother'); pt('pgf', 'pgm'); pt('mgf', 'mgm');
  par('father', SELF); par('mother', SELF); par('pgf', 'father'); par('pgm', 'father'); par('mgf', 'mother'); par('mgm', 'mother');
  for (const p of v.people) {
    if (p.role === 'sibling') { par('father', p.id); par('mother', p.id); }
    if (p.role === 'paunt') { par('pgf', p.id); par('pgm', p.id); }
    if (p.role === 'maunt') { par('mgf', p.id); par('mgm', p.id); }
    for (const [cond, val] of Object.entries(p.conds || {})) if (COND[cond]) reports.push({ id: uid('r'), pid: roleId(p.id), cond, type: '', age: val.age || '', said: '', by: SELF, at: today() });
  }
  return { v: 2, example: false, people, rels, reports, sel: SELF, hl: 'any', tab: 'tree', iv: { who: 'mother', step: 0, lang: v.iv?.lang || 'te', roman: true } };
}
// Each signed-in profile has its own storage slot (see auth.js).
let ACCT = null, S = null;
let AUTH = { mode: 'signin', pick: null, forgot: false };
function loadFor(acct) {
  // The example family always starts fresh. Its tour starts when someone chooses to explore it (see auth-guest),
  // not on every reload.
  if (acct.guest && !acct.contributor && !acct.viewer) { const ex = exampleState(); ex.toured = true; return ex; }
  try { const v = JSON.parse(localStorage.getItem(dataKey(acct.id))); if (v?.v === 2 && Array.isArray(v.people)) return v; } catch {}
  return null;
}
// A family saved before profiles existed, offered to the first profile created.
function legacyData() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v?.v === 2 && !v.example && Array.isArray(v.people)) return v; } catch {}
  try { const v1 = JSON.parse(localStorage.getItem('heirloom-health-v1')); if (v1 && Array.isArray(v1.people)) return migrateV1(v1); } catch {}
  return null;
}
function save() {
  touchFamily();
  if (!S || !ACCT || ACCT.viewer) return;
  // Changes to the example family aren't kept, so it is always the same for the next visitor.
  if (ACCT.guest && !ACCT.contributor) return;
  try { localStorage.setItem(dataKey(ACCT.id), JSON.stringify(S)); } catch {}
}
function enter(acct, state) {
  ACCT = acct;
  S = state || loadFor(acct) || (acct.guest ? exampleState() : blankState({ name: acct.name }));
  S.example = !!acct.guest; S.pdfBusy = false; S.celebrate = null; S.tab ||= 'tree'; S.micBlocked = S.capBlocked = false;
  if (!S.toured) { TOUR_I = 0; S.tab = 'tree'; }
  save(); render(); window.scrollTo({ top: 0 });
  loadFiles().then(render);
  handlePending();
}
// Everything kept in on-device file storage for this profile.
function loadFiles() { return Promise.all([loadClips(), loadMedia(), typeof loadVoices === 'function' ? loadVoices() : null]); }
function signOut() {
  TOUR_I = null;
  if (REC) REC.mr.stop();
  RECOG?.stop();
  [...CLIPS, ...MEDIA].forEach(x => URL.revokeObjectURL(x.url));
  E = null; endSession(); S = null; ACCT = null; CLIPS = []; MEDIA = []; SUGG = { key: '', list: [] };
  AUTH = { mode: listAccounts().length ? 'signin' : 'create', pick: listAccounts()[0]?.id || null, forgot: false };
  render(); window.scrollTo({ top: 0 });
}

/* ---------- Art ---------- */
function mascot(size = 64, happy = false) {
  const eyes = happy
    ? '<path d="M23 30q3-3.5 6 0M35 30q3-3.5 6 0" stroke="#1E1D33" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<circle cx="26" cy="30" r="2.8" fill="#1E1D33"/><circle cx="38" cy="30" r="2.8" fill="#1E1D33"/><circle cx="26.9" cy="29.1" r=".9" fill="#fff"/><circle cx="38.9" cy="29.1" r=".9" fill="#fff"/>';
  return `<svg class="mascot" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="32" cy="61" rx="15" ry="2.4" fill="#000" opacity=".08"/>
    <path d="M28 44h8v13a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 28 57z" fill="#9A6B44"/>
    <path d="M32 50l-7-5M32 47l6-4" stroke="#9A6B44" stroke-width="3" stroke-linecap="round"/>
    <circle cx="18" cy="30" r="12" fill="#1F7447"/><circle cx="46" cy="30" r="12" fill="#1F7447"/>
    <circle cx="32" cy="21" r="15" fill="#2E9E62"/><circle cx="32" cy="33" r="14" fill="#2E9E62"/>
    <circle cx="21" cy="25" r="9" fill="#2E9E62"/><circle cx="43" cy="25" r="9" fill="#2E9E62"/>
    <circle cx="25" cy="15" r="3" fill="#5CC08A" opacity=".8"/>
    <circle cx="47" cy="13" r="5" fill="#F5A524"/><circle cx="47" cy="13" r="2" fill="#A8680A"/>
    <circle cx="21.5" cy="35" r="2.6" fill="#E0546A" opacity=".55"/><circle cx="42.5" cy="35" r="2.6" fill="#E0546A" opacity=".55"/>
    ${eyes}
    <path d="M28.5 36.5q3.5 3.5 7 0" stroke="#1E1D33" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </svg>`;
}
const ICON = {
  tree: `<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M10 10h14M17 10v8M8 18h18M8 18v5M26 18v5" stroke="#08585F" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="3" y="4" width="11" height="11" rx="3" fill="#0E7C86"/><circle cx="25.5" cy="9.5" r="6" fill="#F5A524"/><circle cx="8" cy="27" r="5.5" fill="#E0546A"/><rect x="20.5" y="21.5" width="11" height="11" rx="3" fill="#6457D9"/></svg>`,
  interview: `<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M5 6h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H13l-6 5v-5H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="#6457D9"/><path d="M28 12h1a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-1v4l-5-4h-7a3 3 0 0 1-3-3v-1" fill="#F5A524"/><circle cx="9" cy="13.5" r="1.8" fill="#fff"/><circle cx="14" cy="13.5" r="1.8" fill="#fff"/><circle cx="19" cy="13.5" r="1.8" fill="#fff"/></svg>`,
  doctor: `<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect x="5" y="5" width="24" height="27" rx="4" fill="#E0546A"/><rect x="11" y="2" width="12" height="7" rx="2.5" fill="#A93448"/><rect x="9" y="11" width="16" height="17" rx="2" fill="#fff"/><path d="M17 14.5v10M12 19.5h10" stroke="#E0546A" stroke-width="3.4" stroke-linecap="round"/></svg>`,
  risks: `<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M4.5 25a12.5 12.5 0 0 1 4.6-9.7" stroke="#2E9E62" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M12.8 13.3a12.5 12.5 0 0 1 8.4 0" stroke="#F5A524" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M24.9 15.3a12.5 12.5 0 0 1 4.6 9.7" stroke="#E0546A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M17 25l6-8" stroke="#1E1D33" stroke-width="3" stroke-linecap="round"/><circle cx="17" cy="25" r="3" fill="#1E1D33"/></svg>`,
  speaker: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
  send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
  mic: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="2" width="8" height="13" rx="4" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
  bulb: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill="var(--accent)"/><rect x="8.5" y="18.5" width="7" height="3" rx="1.5" fill="var(--accent-dk)"/></svg>`,
  spark: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" fill="currentColor"/><circle cx="19" cy="19" r="2.2" fill="currentColor"/></svg>`,
};

/* ---------- Audio recordings (kept on this device in IndexedDB) ---------- */
let CLIPS = [], REC = null;
// On-device storage for large files: interview clips, photos and documents, and recorded question voices.
const IDB = {
  db: null,
  STORES: ['clips', 'media', 'voices'],
  open() {
    return this.db ||= new Promise((res, rej) => {
      const r = indexedDB.open('heirloom-audio', 2);
      r.onupgradeneeded = () => { for (const name of this.STORES) if (!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name, { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  async run(store, mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction(store, mode), req = fn(t.objectStore(store)); t.oncomplete = () => res(req.result); t.onerror = () => rej(t.error); }); },
  all(store = 'clips') { return this.run(store, 'readonly', s => s.getAll()); },
  put(c, store = 'clips') { return this.run(store, 'readwrite', s => s.put(c)); },
  del(id, store = 'clips') { return this.run(store, 'readwrite', s => s.delete(id)); },
};
async function loadClips() { CLIPS.forEach(c => URL.revokeObjectURL(c.url)); try { CLIPS = (await IDB.all()).filter(c => c.acct ? c.acct === ACCT?.id : ACCT && !ACCT.guest).map(c => ({ ...c, url: URL.createObjectURL(c.blob) })).sort((a, b) => a.created - b.created); } catch { CLIPS = []; } }
async function addClip(pid, step, blob, secs, acct = ACCT?.id) {
  const rec = { id: 'clip-' + Date.now().toString(36), acct, pid, step, created: Date.now(), secs, blob, type: blob.type || 'audio/webm' };
  try { await IDB.put(rec); if (acct && acct === ACCT?.id) CLIPS.push({ ...rec, url: URL.createObjectURL(blob) }); toast('Recording saved on this device'); }
  catch { toast("Couldn't save the recording. This browser may be blocking storage."); }
  render();
}
async function removeClip(id) {
  try { await IDB.del(id); } catch {}
  const c = CLIPS.find(c => c.id === id); if (c) URL.revokeObjectURL(c.url);
  CLIPS = CLIPS.filter(c => c.id !== id); render();
}
// Remove a profile's recordings, photos and documents from this device.
async function deleteFilesOf(acctId) {
  for (const store of ['clips', 'media']) {
    try { for (const r of await IDB.all(store)) if (r.acct === acctId) await IDB.del(r.id, store); } catch {}
  }
  if (acctId === ACCT?.id) { [...CLIPS, ...MEDIA].forEach(x => URL.revokeObjectURL(x.url)); CLIPS = []; MEDIA = []; }
}
const fmtSec = s => s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
async function startRec(pid, step) {
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('no mic');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream), chunks = [], start = Date.now(), acct = ACCT?.id; // kept even if you sign out mid-recording
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); clearInterval(REC?.timer); REC = null; addClip(pid, step, new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), Math.round((Date.now() - start) / 1000), acct); };
    REC = { mr, pid, step, start, timer: setInterval(() => { const el = $('#rec-time'); if (el) el.textContent = fmtSec(Math.round((Date.now() - start) / 1000)); }, 500) };
    mr.start(); render();
  } catch { S.micBlocked = true; save(); render(); toast("The microphone isn't available here. Use your phone's recorder button instead."); }
}
function clipList(clips, showQ) {
  if (!clips.length) return '';
  return `<ul class="clips">${clips.map(c => `<li>
    <div class="meta"><span>${showQ ? (typeof c.step === 'string' ? `${esc(storyClipLabel(c))} · ` : `Question ${c.step + 1} · `) : ''}${new Date(c.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${c.secs ? ' · ' + fmtSec(c.secs) : ''}</span>
      <button class="link danger" data-action="clip-del" data-clip="${c.id}">${S.confirmClip === c.id ? 'Tap again to delete' : 'Delete'}</button></div>
    <audio controls preload="metadata" src="${c.url}"></audio>
    ${(sttSupported() || cloudOn()) && S.tab === 'interview' ? `<div class="row"><button class="btn sm" data-action="transcribe" data-clip="${c.id}" ${TRANSCRIBING ? 'disabled' : ''}>${TRANSCRIBING === c.id ? 'Turning into text…' : 'Turn into text'}</button><span class="small muted" id="stt-st-${c.id}" aria-live="polite"></span></div>` : ''}</li>`).join('')}</ul>`;
}

/* ---------- Live captions and the answer finder ---------- */
let RECOG = null, SUGG = { key: '', list: [], busy: false }, SAMPLE_OK = false;
function startCaptions(pid, stepKey) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { S.capBlocked = true; render(); toast("Live captions aren't available in this browser. Type instead, or use your keyboard's microphone."); return; }
  try {
    const r = new SR();
    r.lang = (LANGS.find(l => l.id === S.iv.lang) || LANGS[0]).speech; r.continuous = true; r.interimResults = false;
    r.onresult = e => {
      const p = S && byId(pid); if (!p) return;
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) p.transcripts[stepKey] = ((p.transcripts[stepKey] || '') + ' ' + e.results[i][0].transcript).trim();
      save(); const ta = $('#iv-tr'); if (ta) ta.value = p.transcripts[stepKey];
    };
    r.onerror = () => { if (!S) return; S.capBlocked = true; toast("Live captions aren't available here. Type instead, or use your keyboard's microphone."); };
    r.onend = () => { RECOG = null; render(); };
    r.start(); RECOG = r; render();
  } catch { S.capBlocked = true; render(); }
}
function ivPeople(W, st) {
  const mom = motherOf(W.id), dad = fatherOf(W.id);
  const subject = st.who === 'mother' ? mom?.id : st.who === 'father' ? dad?.id : W.id;
  return { subject, mother: mom?.id || null, father: dad?.id || null, step: st.k };
}
// Drop suggestions that are already saved exactly as heard.
function isNew(s, by) {
  const T = byId(s.pid);
  if (!T) return false;
  if (s.kind === 'born') return T.born !== s.year;
  if (s.kind === 'living') return T.living !== 'yes';
  if (s.kind === 'death') return T.living !== 'no' || (s.age && T.deathAge !== s.age) || (s.cause && !T.cause);
  const r = findReport(s.pid, s.cond, s.type, by);
  return !r || (s.age && r.age !== s.age);
}
function showResults(list, ai) {
  render();
  const out = $('#finder-out');
  out?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast(list.length ? `Found ${list.length} possible answer${list.length === 1 ? '' : 's'}${ai ? ' with AI' : ''}` : 'No new answers found in that text');
}
const aiOK = () => SAMPLE_OK || cloudOn();
// Ask once before sending interview text or audio to the server's AI helpers.
function needsConsent(what, then) {
  if (SAMPLE_OK || S.aiConsent) return false;
  S.modal = { kind: 'ai-consent', what, then }; render(); return true;
}
let TRANSCRIBING = null;
// Turn a recording into text: on this device (default) or with the Heirloom server, as chosen in the menu.
async function transcribeClip(id, confirmed = false) {
  const c = CLIPS.find(x => x.id === id), p = c && byId(c.pid);
  if (!c || !p || TRANSCRIBING) return;
  if (!S.sttMode && !confirmed) { S.modal = { kind: 'stt', clip: id }; render(); return; }
  const server = S.sttMode === 'server' && cloudOn();
  if (server && needsConsent('audio', { action: 'transcribe', id })) return;
  TRANSCRIBING = id; render();
  const status = t => { const el = document.getElementById('stt-st-' + id); if (el) el.textContent = t; };
  status(server ? 'Sending to the server…' : 'Getting ready…');
  try {
    const text = server ? await transcribeWithServer(c.blob, S.iv.lang) : await transcribeOnDevice(c.blob, S.iv.lang, S.sttModel || 'base', status);
    if (typeof c.step === 'string') { const sid = storyIdOf(c); if (sid) (p.stories ||= {})[sid] = [p.stories[sid], text].filter(Boolean).join(' ').trim(); } // a family story: add to its typed memory
    else { const key = STEPS[c.step]?.k || 'other_self'; (p.transcripts ||= {})[key] = [p.transcripts[key], text].filter(Boolean).join(' ').trim(); }
    save(); toast(text ? 'Recording turned into text. Tap "Find answers".' : 'No speech was found in that recording.');
  } catch (e) {
    toast(server ? (e?.message || "Couldn't turn the recording into text.") : "The speech model couldn't run here. Check your internet connection for the first download, or try the server option.");
    console.error(e);
  }
  TRANSCRIBING = null; render();
}
async function runFinder(useAI) {
  if (useAI && !SAMPLE_OK && needsConsent('text', { action: 'find-ai' })) return;
  const W = byId(S.iv.who), st = STEPS[S.iv.step], text = ((W.transcripts ||= {})[st.k] || '').trim();
  if (!text) { toast('Type or dictate what they said first'); $('#iv-tr')?.focus(); return; }
  const ctx = ivPeople(W, st), key = W.id + '|' + st.k;
  if (!ctx.subject) { toast(`Add ${nameOf(W)}'s ${st.who} to the tree first`); return; }
  const fresh = list => list.filter(x => isNew(x, W.id));
  if (!useAI) { SUGG = { key, list: fresh(findAnswers(text, ctx)), busy: false, ai: false }; showResults(SUGG.list, false); return; }
  SUGG = { key, list: [], busy: true, ai: true }; render();
  try { SUGG = { key, list: fresh(await aiFindAnswers(text, ctx, ctx)), busy: false, ai: true }; showResults(SUGG.list, true); }
  catch (e) {
    SUGG = { key, list: fresh(findAnswers(text, ctx)), busy: false, ai: false }; render();
    toast(e?.code === 'not_granted' ? 'AI was not allowed, so the built-in word list was used.' : "AI isn't available right now, so the built-in word list was used.");
  }
}
function suggestionHTML(s, i) {
  const W = byId(S.iv.who), ctx = ivPeople(W, STEPS[S.iv.step]);
  const who = [...new Set([ctx.subject, W.id, ctx.mother, ctx.father, s.pid].filter(Boolean))].map(byId);
  const what = s.kind === 'death' ? `Passed away${s.age ? ' at ' + s.age : ''}${s.cause ? ' · ' + s.cause : ''}`
    : s.kind === 'born' ? `Born in ${s.year}` : s.kind === 'living' ? 'Still living'
    : `${factName(s.cond, s.type)}${s.age ? ' · age ' + s.age : ''}`;
  const mapped = s.kind === 'cond' && s.said ? `Heard “${esc(s.said)}” → ${esc(COND[s.cond].en)}` : '';
  // Show the sentence with the matched words highlighted.
  const q = clip(s.quote, 160), at = s.said ? q.toLowerCase().indexOf(s.said.toLowerCase()) : -1;
  const quote = at >= 0 ? `${esc(q.slice(0, at))}<mark>${esc(q.slice(at, at + s.said.length))}</mark>${esc(q.slice(at + s.said.length))}` : esc(q);
  return `<li class="sugg${s.negated ? ' neg' : ''}">
    <div class="sugg-main">
      <label class="sugg-who"><span class="sr">About</span><select data-sugg="${i}" aria-label="Who this answer is about">${who.map(p => `<option value="${p.id}" ${p.id === s.pid ? 'selected' : ''}>${esc(nameOf(p))} · ${esc(relOf(p))}</option>`).join('')}</select></label>
      <b>${esc(what)}</b>
      ${mapped ? `<span class="small heard">${mapped}</span>` : ''}
      ${s.negated ? '<span class="small neg-note">They may have said no. Check before adding.</span>' : ''}
      <span class="small muted quote">“${quote}”</span></div>
    <div class="sugg-btns"><button class="btn sm primary" data-action="sugg-add" data-i="${i}">Add</button><button class="link" data-action="sugg-skip" data-i="${i}">Dismiss</button></div>
  </li>`;
}

/* ---------- Shared form pieces ---------- */
function langBlock(obj, lang, roman) {
  if (lang === 'en') return `<span class="tr">${esc(obj.en)}</span>`;
  return `<span class="tr" ${langAttrs(lang)}>${esc(obj[lang] || obj.en)}</span>${roman && obj[lang + '_r'] ? `<span class="rm">${esc(obj[lang + '_r'])}</span>` : ''}<span class="en">${esc(obj.en)}</span>`;
}
function reportList(reports, { editable, fact }) {
  if (!reports.length) return '';
  return `<ul class="srcs">${reports.map(r => `<li><span><b>${esc(reporterName(r.by))}</b>${r.age ? ` said ${esc(r.age)}` : ' said yes'}${r.said ? ` · “${esc(r.said)}”` : ''}</span>${editable ? `<button class="link danger" data-action="del-report" data-rid="${r.id}" aria-label="Remove ${esc(reporterName(r.by))}'s report">Remove</button>` : ''}</li>`).join('')}
    ${fact?.disagree ? `<li class="warn">Ages differ (${fact.range}). The report uses ${fact.age}.</li>` : ''}</ul>`;
}
// Condition tiles. `by` is who is answering; merged=true (family tree editor) shows everyone's answers.
function condTiles(p, { by, pre, lang = 'en', roman = false, merged = false }) {
  const fs = facts(p.id);
  const tile = c => {
    const all = S.reports.filter(r => r.pid === p.id && r.cond === c.id), mine = all.filter(r => r.by === by);
    const on = merged ? all.length > 0 : mine.length > 0;
    const others = all.filter(r => r.by !== by);
    let extra = '';
    if (on && SUBTYPES[c.id]) extra = kindExtra(p, c.id, { by, pre, lang, roman, merged });
    else if (on) {
      const f = fs.find(f => f.cond === c.id), r = mine[0];
      extra = `<div class="extra"><label for="${pre}-${c.id}-age">${merged ? 'Your answer: age found' : 'Age found'}</label>
        <input type="number" inputmode="numeric" min="0" max="120" id="${pre}-${c.id}-age" placeholder="${!r?.age && f?.age ? f.age : 'Age'}" data-pid="${p.id}" data-cond="${c.id}" data-type="" data-by="${by}" data-cf="age" value="${esc(r?.age || '')}">
        ${reportList(merged ? all : others, { editable: merged, fact: f })}</div>`;
    } else if (others.length) extra = `<p class="also">Also heard: ${others.map(r => `${esc(reporterName(r.by))}${r.age ? ' (' + esc(r.age) + ')' : ''}`).join(', ')}</p>`;
    return `<div class="cond${on ? ' on' : ''}">
      <input type="checkbox" class="sr" id="${pre}-${c.id}" data-pid="${p.id}" data-cond="${c.id}" data-by="${by}" data-cf="on" ${on ? 'checked' : ''}>
      <label for="${pre}-${c.id}"><span class="tick"></span><span class="nm">${langBlock(c, lang, roman)}</span></label>${extra}
    </div>`;
  };
  return `<div class="conds">${CONDS.filter(c => !c.more && !c.free).map(tile).join('')}</div>
    <h4 class="conds-more">Less common, but worth asking</h4>
    <div class="conds">${CONDS.filter(c => c.more).map(tile).join('')}${otherTile(p, { by, pre, lang, roman, merged })}</div>`;
}
// "Something else": an illness that isn't on the list, saved under the name the relative gives it.
function otherTile(p, { by, pre, lang, roman, merged }) {
  const all = S.reports.filter(r => r.pid === p.id && r.cond === 'other');
  const mine = merged ? all : all.filter(r => r.by === by), others = merged ? [] : all.filter(r => r.by !== by);
  const rows = mine.map(r => `<div class="other-row">
      <input type="text" maxlength="60" aria-label="Name of the illness" data-other-name="${esc(r.id)}" value="${esc(r.type)}" placeholder="What was it?">
      <input type="number" inputmode="numeric" aria-label="Age it was found" placeholder="Age" data-pid="${p.id}" data-cond="other" data-type="${esc(r.type)}" data-by="${esc(r.by)}" data-cf="age" value="${esc(r.age || '')}">
      <button type="button" class="link danger" data-action="del-report" data-rid="${esc(r.id)}">Remove</button>
      ${merged ? `<span class="small muted">${esc(reporterName(r.by))} said</span>` : ''}</div>`).join('');
  return `<div class="cond other-cond${mine.length ? ' on' : ''}">
    <div class="other-head"><span class="nm">${langBlock(COND.other, lang, roman)}</span></div>
    <div class="other-body">${rows}
      <div class="other-row"><input type="text" maxlength="60" id="${pre}-other-new" aria-label="Another illness" placeholder="e.g. Marfan syndrome, kidney stones">
        <button type="button" class="btn sm" data-action="other-add" data-pid="${p.id}" data-by="${by}" data-pre="${pre}">Add</button></div>
      ${others.length ? `<p class="also">Also heard: ${others.map(r => `${esc(factName('other', r.type))}${r.age ? ' (' + esc(r.age) + ')' : ''} from ${esc(reporterName(r.by))}`).join(', ')}</p>` : ''}
    </div></div>`;
}
// "What kind?" for conditions that come in kinds (cancer, diabetes, heart disease and others). Optional.
function kindExtra(p, cond, { by, pre, lang, roman, merged }) {
  const all = S.reports.filter(r => r.pid === p.id && r.cond === cond);
  const pool = merged ? all : all.filter(r => r.by === by);
  const chosen = new Set(pool.map(r => r.type).filter(Boolean));
  const chips = SUBTYPES[cond].map(t => `<button type="button" class="chip-t" data-action="ctype" data-pid="${p.id}" data-cond="${cond}" data-type="${t.id}" data-by="${by}" aria-pressed="${chosen.has(t.id)}">${lang === 'en' ? esc(t.en) : `<span ${langAttrs(lang)}>${esc(t[lang] || t.en)}</span>${roman && t[lang + '_r'] ? `<small>${esc(t[lang + '_r'])}</small>` : ''}<small>${esc(t.en)}</small>`}</button>`).join('');
  const fs = facts(p.id).filter(f => f.cond === cond);
  const rows = fs.map(f => {
    const mine = S.reports.find(r => r.pid === p.id && r.cond === cond && r.type === f.type && r.by === by);
    const id = `${pre}-${cond}-${esc(f.type || 'unk')}-age`;
    return `<div class="ca-row"><span class="ca-name">${esc(factName(cond, f.type))}</span>
      <input type="number" inputmode="numeric" id="${id}" aria-label="Age ${esc(factName(cond, f.type))} was found" placeholder="${!mine?.age && f.age ? f.age : 'Age'}" data-pid="${p.id}" data-cond="${cond}" data-type="${esc(f.type)}" data-by="${by}" data-cf="age" value="${esc(mine?.age || '')}">
      ${reportList(merged ? f.reports : f.reports.filter(r => r.by !== by), { editable: merged, fact: f })}</div>`;
  }).join('');
  return `<div class="extra ca"><span class="ca-q">What kind?${cond === 'cancer' ? '' : ' <span class="muted small">(skip if they aren\'t sure)</span>'}</span><div class="chips">${chips}</div>${rows}</div>`;
}
function vitalFields(p, pre) {
  const seg = ['yes', 'no', 'unknown'].map(v => `<button type="button" class="pill-btn" data-pid="${p.id}" data-living="${v}" aria-pressed="${p.living === v}">${{ yes: 'Living', no: 'Passed away', unknown: "Don't know" }[v]}</button>`).join('');
  return `<div style="display:grid;gap:14px">
    <div style="display:grid;gap:6px"><span class="lbl">Living?</span><div class="seg" role="group" aria-label="Living status">${seg}</div></div>
    <div class="grid2">
      <label class="f">Born (year)<input type="number" inputmode="numeric" id="${pre}-born" data-pid="${p.id}" data-f="born" value="${esc(p.born)}" placeholder="e.g. 1952"></label>
      ${p.living === 'no' ? `<label class="f">Age at death<input type="number" inputmode="numeric" id="${pre}-dage" data-pid="${p.id}" data-f="deathAge" value="${esc(p.deathAge)}"></label>` : ''}
    </div>
    ${p.living === 'no' ? `<label class="f">Cause of death<input type="text" id="${pre}-cause" data-pid="${p.id}" data-f="cause" value="${esc(p.cause)}" placeholder="e.g. heart attack"></label>` : ''}
  </div>`;
}
function avatar(p) {
  const photo = photoOf(p.id);
  if (photo) return `<div class="avatar photo"><img src="${photo.url}" alt="Photo of ${esc(nameOf(p))}"></div>`;
  const fill = facts(p.id).length ? 'var(--accent)' : 'var(--panel)';
  const shape = p.sex === 'M' ? `<rect x="8" y="8" width="24" height="24" rx="3" fill="${fill}" stroke="var(--sym)" stroke-width="2.5"/>` : p.sex === 'F' ? `<circle cx="20" cy="20" r="12" fill="${fill}" stroke="var(--sym)" stroke-width="2.5"/>` : `<path d="M20 5L35 20L20 35L5 20Z" fill="${fill}" stroke="var(--sym)" stroke-width="2.5" stroke-linejoin="round"/>`;
  return `<div class="avatar"><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">${shape}${p.living === 'no' ? '<line x1="5" y1="35" x2="35" y2="5" stroke="var(--sym)" stroke-width="2.5"/>' : ''}</svg></div>`;
}
function statTiles(items) {
  return `<div class="stats">${items.map(([label, val, sub, color]) => `<div class="stat" style="--c:var(--${color})"><span>${label}</span><div>${val}${sub ? `<small> ${sub}</small>` : ''}</div></div>`).join('')}</div>`;
}
function keyHTML() {
  const s = inner => `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">${inner}</svg>`;
  return `<div class="key" aria-label="Chart key">
    <span>${s('<rect x="3" y="3" width="16" height="16" rx="2" fill="var(--panel)" stroke="var(--sym)" stroke-width="2.2"/>')}Male</span>
    <span>${s('<circle cx="11" cy="11" r="8" fill="var(--panel)" stroke="var(--sym)" stroke-width="2.2"/>')}Female</span>
    <span>${s('<circle cx="11" cy="11" r="8" fill="var(--accent)" stroke="var(--sym)" stroke-width="2.2"/>')}Has condition</span>
    <span>${s('<circle cx="11" cy="11" r="7" fill="var(--panel)" stroke="var(--sym)" stroke-width="2.2"/><line x1="2" y1="20" x2="20" y2="2" stroke="var(--sym)" stroke-width="2.2"/>')}Deceased</span>
    <span>${s('<circle cx="11" cy="11" r="8" fill="var(--panel)" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 3"/>')}Not blood related</span>
    <span>${s('<path d="M3 3v16" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 3"/>')}Adopted</span>
    <span>${s('<path d="M3 19L13 9" stroke="var(--primary)" stroke-width="3" stroke-linecap="round"/><path d="M15 7l-9 1.5 6.5 6.5z" fill="var(--primary)"/>')}You</span>
    <span>${s('<circle cx="11" cy="11" r="9" fill="var(--leaf)"/><path d="M7 11l3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>')}Interviewed</span>
    <span>* people disagree on the age</span>
  </div>`;
}
function nextAskHTML(limit = 3, compact = false) {
  const list = suggestInterviews(limit);
  if (!list.length) return '';
  return `<section class="card nextask" aria-label="Who to ask next">
    <div class="row" style="justify-content:space-between"><h2>Who to ask next</h2><span class="small muted">Ranked by the gaps they can fill</span></div>
    <ol class="asks">${list.map(({ I, items }, n) => `<li>
      <span class="rank">${n + 1}</span>
      <div class="ask-body"><b>${esc(nameOf(I))}</b> <span class="muted small">${esc(relOf(I))}${I.interviewed ? ' · interviewed before' : ''}</span>
        <ul>${items.slice(0, compact ? 2 : 3).map(({ T, gaps }) => `<li>${T.id === I.id ? 'Their own health' : esc(nameOf(T)) + ` <span class="muted">(${esc(shortOf(T))})</span>`}: ${esc(gaps.slice(0, 2).join(', '))}</li>`).join('')}</ul></div>
      <div class="ask-btns"><button class="btn sm" data-action="interview" data-pid="${I.id}">Interview</button><button class="btn sm" data-action="invite" data-pid="${I.id}">Send a link</button></div></li>`).join('')}</ol>
  </section>`;
}

/* ---------- Family tab ---------- */
function renderTree() {
  const present = CONDS.filter(c => S.reports.some(r => r.cond === c.id && byId(r.pid)));
  if (S.hl !== 'any' && !present.some(c => c.id === S.hl)) S.hl = 'any';
  const p = byId(S.sel) || byId(SELF);
  const blood = bloodRelatives(), known = blood.filter(x => !isBlank(x)).length, me = byId(SELF), k = kin(p.id);
  const gone = removalSet(p.id).size - 1;
  const hasMom = !!motherOf(p.id, false), hasDad = !!fatherOf(p.id, false);
  return `
  <div style="display:grid;gap:6px"><h1>${me.name ? esc(me.name) + "'s family" : 'Your family'}</h1>
    <p class="muted">Tap anyone on the tree to fill in what you know, or to add their relatives.</p>
    <div class="row"><button class="btn primary sm" data-action="invite-pick">${ICON.send}Invite a relative to answer</button><span class="small muted">They answer on their own phone, in their language.</span></div></div>
  ${statTiles([['Blood relatives', known, `/ ${blood.length}`, 'accent'], ['Interviews', S.people.filter(x => x.interviewed).length, '', 'primary'], ['Recordings', CLIPS.length, '', 'iris']])}
  <div class="family">
    <section class="card tree-card" aria-label="Pedigree chart">
      <div class="hd">
        <div class="row" style="justify-content:space-between"><h2>${S.people.length} people, ${new Set([...generations().values()]).size} generations</h2><span class="tag">${known} of ${blood.length} blood relatives filled in</span></div>
        <div class="zoom" role="group" aria-label="Chart zoom">
          <button class="zbtn" data-action="zoom" data-z="-1" aria-label="Zoom out">−</button>
          <span class="zval" id="zval">${Math.round((S.zoom || 1) * 100)}%</span>
          <button class="zbtn" data-action="zoom" data-z="1" aria-label="Zoom in">+</button>
          <button class="btn sm" data-action="zoom-fit">Fit to screen</button>
          <button class="btn sm" data-action="center-me">Find me</button>
          <span class="small muted zhint">Drag to move around</span>
        </div>
        <div class="pills" role="group" aria-label="Shade the chart by condition">
          <button class="pill-btn" data-hl="any" aria-pressed="${S.hl === 'any'}">Any condition</button>
          ${present.map(c => `<button class="pill-btn" data-hl="${c.id}" aria-pressed="${S.hl === c.id}">${esc((c.free ? 'Other' : c.en).replace(' ("fits")', ''))}</button>`).join('')}
        </div>
      </div>
      <div class="tree-scroll" id="tree-svg">${treeSVG({ zoom: S.zoom || 1 })}</div>
      ${keyHTML()}
    </section>
    <aside class="card editor" aria-label="Edit relative">
      <div class="who">${avatar(p)}<div><span class="eyebrow">${esc(relOf(p))}</span><h2>${esc(nameOf(p))}</h2>
        <div class="row" style="gap:6px;margin-top:4px">${p.interviewed ? `<span class="tag">✓ Interviewed ${fmtDate(p.interviewed)}</span>` : ''}${p.id !== SELF ? (k.blood ? `<span class="tag soft">${['', 'First', 'Second', 'Third'][k.degree] || 'Distant'}-degree relative</span>` : '<span class="tag grey">Not blood related</span>') : ''}</div></div></div>
      ${p.living !== 'no' && p.id !== SELF ? `<div class="row"><button class="btn primary" data-action="interview" data-pid="${p.id}" style="flex:1">Interview ${esc(nameOf(p))}</button><button class="btn" data-action="invite" data-pid="${p.id}" style="flex:1">Send ${esc(nameOf(p))} a link</button></div>` : ''}
      <div class="grid2">
        <label class="f">Name<input type="text" id="ed-name" data-pid="${p.id}" data-f="name" value="${esc(p.name)}" placeholder="${esc(shortOf(p))}"></label>
        <label class="f">Sex<select id="ed-sex" data-pid="${p.id}" data-f="sex">
          ${[['F', 'Female'], ['M', 'Male'], ['U', 'Not set']].map(([v, l]) => `<option value="${v}" ${p.sex === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      ${p.id === SELF ? `<label class="f">Born (year)<input type="number" inputmode="numeric" id="ed-born" data-pid="${p.id}" data-f="born" value="${esc(p.born)}"></label>
        <div style="display:grid;gap:8px"><h3>Your family's ancestry</h3><p class="small muted">Used by some screening rules. Pick all that apply.</p>${ancestryPicker()}</div>` : vitalFields(p, 'ed')}
      <div style="display:grid;gap:10px"><div><h3>Health conditions</h3><p class="small muted">Everything family members told you is combined here. Your own answer is saved as "You".</p></div>
      ${condTiles(p, { by: SELF, pre: 'ed', merged: true })}</div>
      <label class="f">Notes<textarea id="ed-notes" data-pid="${p.id}" data-f="notes" placeholder="Surgeries, medicines, where they grew up">${esc(p.notes)}</textarea></label>
      ${personNotes(p).filter(([label]) => label !== 'Notes').map(([label, t]) => `<p class="small" style="white-space:pre-wrap"><b>${esc(label)}:</b> ${esc(t)}</p>`).join('')}
      ${CLIPS.some(c => c.pid === p.id) ? `<div style="display:grid;gap:8px"><h3>Interview recordings</h3>${clipList(CLIPS.filter(c => c.pid === p.id), true)}</div>` : ''}
      ${mediaHTML(p)}
      <div style="display:grid;gap:10px"><h3>Add ${p.id === SELF ? 'your' : esc(nameOf(p)) + "'s"} relatives</h3>
        <div class="row">
          ${hasMom ? '' : `<button class="btn sm" data-action="add" data-kind="mother" data-pid="${p.id}">+ Mother</button>`}
          ${hasDad ? '' : `<button class="btn sm" data-action="add" data-kind="father" data-pid="${p.id}">+ Father</button>`}
          <button class="btn sm" data-action="add" data-kind="sibling" data-pid="${p.id}">+ Brother or sister</button>
          <button class="btn sm" data-action="add" data-kind="halfsib-mother" data-pid="${p.id}">+ Half-sibling, same mom</button>
          <button class="btn sm" data-action="add" data-kind="halfsib-father" data-pid="${p.id}">+ Half-sibling, same dad</button>
          <button class="btn sm" data-action="add" data-kind="partner" data-pid="${p.id}">+ Partner or spouse</button>
          <button class="btn sm" data-action="add" data-kind="child" data-pid="${p.id}">+ Child</button>
          <button class="btn sm" data-action="add" data-kind="adopted" data-pid="${p.id}">+ Adopted child</button>
        </div></div>
      ${p.id === SELF ? '' : `<button class="btn danger ${S.confirmRemove === p.id ? 'armed' : ''}" data-action="remove" data-pid="${p.id}">${S.confirmRemove === p.id ? `Tap again to remove${gone ? ` (and ${gone} ${gone === 1 ? 'person' : 'people'} only connected through them)` : ''}` : 'Remove from tree'}</button>`}
    </aside>
  </div>
  ${nextAskHTML()}
  ${storeHTML()}`;
}
function storeHTML() {
  return `<section class="card" aria-label="Your data" style="display:grid;gap:12px">
    <div><h3>Back up your family</h3>
    <p class="small muted">Everything stays on this device. Copy a backup code to keep it safe or move it to another phone. Recordings, photos and documents are not in the code.</p></div>
    <div class="row">
      <button class="btn sm" data-action="backup">Copy backup code</button>
      <button class="btn sm" data-action="restore-open">Restore from code</button>
      ${cloudOn() ? `<button class="btn sm" data-action="cloud-open">${S.sync ? 'Family sync is on' : 'Sync with family'}</button>` : ''}
      <button class="btn sm danger ${S.confirmWipe ? 'armed' : ''}" data-action="wipe">${S.confirmWipe ? 'Tap again to erase' : 'Erase and start over'}</button>
    </div>
    ${S.restoreOpen ? `<label class="f">Paste your backup code<textarea id="restore-text"></textarea></label><div class="row"><button class="btn primary" data-action="restore">Restore</button></div>` : ''}
    <textarea id="copy-fallback" readonly hidden></textarea>
  </section>`;
}

/* ---------- Interview tab ---------- */
function followUps(W, target, st, lang, roman) {
  if (!target) return '';
  const cards = [];
  const say = obj => `<p class="fu-say" ${langAttrs(lang)}>${esc(tr(obj, lang))}</p>${lang !== 'en' && roman && obj[lang + '_r'] ? `<p class="roman">${esc(obj[lang + '_r'])}</p>` : ''}${lang !== 'en' ? `<p class="gloss">In English: ${esc(obj.en)}</p>` : ''}`;
  if (st.type === 'conds') {
    const mine = S.reports.filter(r => r.pid === target.id && r.by === W.id);
    if (mine.some(r => r.cond === 'cancer' && !r.type)) cards.push(`<div class="fu"><span class="eyebrow">Follow-up · cancer</span>${say(FOLLOW.cancer_type)}<p class="small muted">Tap the kind in the Cancer card above.</p></div>`);
    const unnamed = mine.filter(r => r.cond === 'other' && !r.type);
    if (unnamed.length) cards.push(`<div class="fu"><span class="eyebrow">Follow-up · another illness</span>${say(FOLLOW.other_what)}
      ${unnamed.map(r => `<label class="f">Name of the illness<input type="text" maxlength="60" data-other-name="${esc(r.id)}" placeholder="What was it?"></label>`).join('')}</div>`);
    const noAge = mine.filter(r => !r.age && !(r.cond === 'cancer' && !r.type) && !(r.cond === 'other' && !r.type));
    if (noAge.length) cards.push(`<div class="fu"><span class="eyebrow">Follow-up · ages</span>${say(target.id === W.id ? FOLLOW.age_you : FOLLOW.age_them)}
      <div class="fu-ages">${noAge.map(r => `<label class="f">${esc(factName(r.cond, r.type))}<input type="number" inputmode="numeric" id="fu-${r.id}" data-pid="${r.pid}" data-cond="${r.cond}" data-type="${esc(r.type)}" data-by="${r.by}" data-cf="age" placeholder="Age"></label>`).join('')}</div></div>`);
  }
  if (st.type === 'vital' && target.living === 'no') {
    if (!target.deathAge || +target.deathAge < 60) {
      if (!target.cause) cards.push(`<div class="fu"><span class="eyebrow">Follow-up · ${target.deathAge ? 'died young' : 'cause'}</span>${say(FOLLOW.death_cause)}<label class="f">How they passed away<input type="text" id="fu-cause" data-pid="${target.id}" data-f="cause" placeholder="e.g. heart attack, cancer, accident"></label></div>`);
    }
    if (!target.deathAge) cards.push(`<div class="fu"><span class="eyebrow">Follow-up · age</span>${say(FOLLOW.death_age)}<label class="f">Age at death<input type="number" inputmode="numeric" id="fu-dage" data-pid="${target.id}" data-f="deathAge"></label></div>`);
  }
  return cards.length ? `<div class="fus">${cards.join('')}</div>` : '';
}
function transcriptHTML(W, st) {
  const key = W.id + '|' + st.k, text = (W.transcripts || {})[st.k] || '';
  const sugg = SUGG.key === key ? SUGG : null;
  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !S.capBlocked;
  return `<div class="transcript">
    <div><h3>What did they say?</h3><p class="small muted">Type it, or tap the box and use your keyboard's microphone to dictate in any language. Then let the app find the answers for you to confirm.</p></div>
    <textarea id="iv-tr" data-pid="${W.id}" data-tr="${st.k}" placeholder="e.g. మా నాన్నకి 50 లో షుగర్ వచ్చింది">${esc(text)}</textarea>
    <div class="row">
      ${hasSR ? (RECOG ? `<button class="btn sm rec-live" data-action="cap-stop"><span class="rec-dot"></span>Stop captions</button>` : `<button class="btn sm" data-action="cap-start" data-pid="${W.id}">${ICON.mic}Live captions</button>`) : ''}
      <button class="btn sm" data-action="find">Find answers</button>
      ${aiOK() ? `<button class="btn sm iris" data-action="find-ai" ${sugg?.busy ? 'disabled' : ''}>${ICON.spark}${sugg?.busy ? 'Reading…' : 'Find with AI'}</button>` : ''}
    </div>
    <div id="finder-out">${sugg && !sugg.busy ? (sugg.list.length ? `<div style="display:grid;gap:8px"><p class="small"><b>${sugg.list.length} possible answer${sugg.list.length === 1 ? '' : 's'}</b> ${sugg.ai ? 'found by AI' : 'matched from the word list'}. Nothing is saved until you tap Add.</p><ul class="suggs">${sugg.list.map(suggestionHTML).join('')}</ul></div>` : '<p class="small muted">No new answers found. Try including the illness name and an age, like "sugar at 50".</p>') : ''}</div>
  </div>`;
}
function recHTML(who, step) {
  const mine = CLIPS.filter(c => c.pid === who.id && c.step === step);
  const live = REC && REC.pid === who.id && REC.step === step;
  return `<div class="rec">
    <div><h3>Record their answer</h3>
    <p class="small muted">Ask first: "Is it okay if I record this so I get it right?" Recordings stay on this device.</p></div>
    <div class="rec-btns">
      ${live ? `<button class="btn rec-live" data-action="rec-stop"><span class="rec-dot"></span>Stop <span id="rec-time" class="num">0:00</span></button>`
        : S.micBlocked ? '' : `<button class="btn" data-action="rec-start" data-pid="${who.id}" ${REC ? 'disabled' : ''}>${ICON.mic}Record</button>`}
      <label class="btn ${S.micBlocked ? '' : 'sm'}" for="rec-file">${S.micBlocked ? ICON.mic + "Use phone's recorder" : 'Add audio file'}</label>
      <input type="file" id="rec-file" class="sr" accept="audio/*" ${S.micBlocked ? 'capture' : ''} data-pid="${who.id}">
    </div>
    ${clipList(mine, false)}
  </div>`;
}
function renderInterview() {
  const talkable = S.people.filter(p => p.id !== SELF && p.living !== 'no');
  if (!talkable.length) return `<div class="lesson"><div class="card done">${mascot(96)}<h2>No one to interview yet</h2><p class="muted">Add relatives on the family tree and mark who is living.</p><button class="btn primary" data-action="goto-tree">Go to family tree</button></div></div>`;
  if (!talkable.some(p => p.id === S.iv.who)) S.iv.who = talkable[0].id;
  const W = byId(S.iv.who), lang = S.iv.lang, L = LANGS.find(l => l.id === lang) || LANGS[0];

  if (S.celebrate === W.id) {
    const n = S.reports.filter(r => r.by === W.id).length;
    return `<div class="lesson"><div class="done">${mascot(120, true)}
      <h2>Interview complete!</h2>
      <p class="muted" style="max-width:40ch">You saved ${esc(nameOf(W))}'s memories. Most families never write this down.</p>
      ${statTiles([['Questions', STEPS.length, '', 'accent'], ['Answers saved', n, '', 'primary'], ['Recordings', CLIPS.filter(c => c.pid === W.id).length, '', 'iris']])}
      <div class="row" style="justify-content:center"><button class="btn" data-action="see-report">See doctor report</button><button class="btn primary" data-action="goto-tree">Continue</button></div>
    </div>${nextAskHTML(2, true)}</div>`;
  }

  const step = Math.max(0, Math.min(STEPS.length - 1, S.iv.step)), st = STEPS[step], q = Q[st.k];
  const ppl = ivPeople(W, st), target = st.who ? byId(ppl.subject) : null;
  let ans = '';
  const relName = t => `${esc(nameOf(t))} <span class="muted">· ${esc(relOf(t))}</span>`;
  if (st.type === 'intro') ans = `<p class="muted">When they say yes, tap Continue.</p>`;
  else if (st.type === 'born') ans = `<label class="f">Year ${esc(nameOf(W))} was born<input type="number" inputmode="numeric" id="iv-born" data-pid="${W.id}" data-f="born" value="${esc(W.born)}" placeholder="e.g. 1953"></label>`;
  else if (st.type === 'notes') ans = `<p class="muted">Write their answer in "What did they say?" below, or record it.</p>`;
  else if (st.type === 'conds' || st.type === 'vital') {
    if (target) ans = `<h3>Saving ${esc(nameOf(W))}'s answers about ${relName(target)}</h3>` + (st.type === 'conds' ? condTiles(target, { by: W.id, pre: 'iv-' + st.k, lang, roman: S.iv.roman }) : vitalFields(target, 'iv-' + st.k)) + followUps(W, target, st, lang, S.iv.roman);
    else ans = `<p class="muted">${esc(nameOf(W))}'s ${st.who} isn't on the tree yet.</p><button class="btn primary" data-action="add-parent" data-kind="${st.who}" data-pid="${W.id}">Add ${esc(nameOf(W))}'s ${st.who} to the tree</button>`;
  } else if (st.type === 'siblings' || st.type === 'children') {
    // Pick a brother, sister or child to save what they had, the same way as for parents.
    const kids = st.type === 'children';
    const list = (kids ? childLinks(W.id).map(l => l.id) : siblingsOf(W.id)).map(byId).filter(Boolean);
    const pick = list.find(x => x.id === S.iv.pick) || list[0];
    ans = `<div style="display:grid;gap:10px"><h3>${esc(nameOf(W))}'s ${kids ? 'children' : 'brothers and sisters'} on the tree</h3>
        <div class="pills">${list.length ? list.map(x => `<button class="pill-btn" data-action="iv-pick" data-id="${x.id}" aria-pressed="${x === pick}">${esc(nameOf(x))}</button>`).join('') : '<span class="muted small">None yet.</span>'}</div>
        <div class="row"><input type="text" id="iv-newsib" placeholder="Name" aria-label="Name" style="max-width:200px">
        <select id="iv-newsex" aria-label="${kids ? 'Son or daughter' : 'Brother or sister'}" style="max-width:140px">${kids ? '<option value="F">Daughter</option><option value="M">Son</option>' : '<option value="F">Sister</option><option value="M">Brother</option>'}</select>
        <button class="btn sm" data-action="${kids ? 'iv-addkid' : 'iv-addsib'}" data-pid="${W.id}">Add to tree</button></div></div>
      ${pick ? `<div style="display:grid;gap:14px"><h3>Saving ${esc(nameOf(W))}'s answers about ${relName(pick)}</h3>${vitalFields(pick, 'iv-' + st.k)}${condTiles(pick, { by: W.id, pre: 'iv-' + st.k, lang, roman: S.iv.roman })}</div>` : ''}`;
  } else if (st.type === 'check') {
    // A question about the whole family, saved with the person who answered.
    const c = W.checks?.[st.k] || {};
    const seg = ['yes', 'no', 'unknown'].map(v => `<button type="button" class="pill-btn" data-action="chk" data-k="${st.k}" data-v="${v}" data-pid="${W.id}" aria-pressed="${c.a === v}">${{ yes: 'Yes', no: 'No', unknown: "Don't know" }[v]}</button>`).join('');
    ans = st.k === 'ancestry'
      ? `<div style="display:grid;gap:10px"><span class="lbl">Your family's ancestry</span>${ancestryPicker()}</div>`
      : `<div class="seg" role="group" aria-label="Answer">${seg}</div>
        ${c.a === 'yes' ? `<label class="f">Who was it, and what happened?<input type="text" id="iv-chk-note" data-pid="${W.id}" data-chk="${st.k}" value="${esc(c.note || '')}" placeholder="${esc(CHECK_HINT[st.k] || '')}"></label>` : ''}`;
  } else if (st.type === 'closing') ans = `<p class="muted">Say thank you, then tap Finish to save the interview.</p>`;

  const sayRoman = lang !== 'en' && S.iv.roman && q[lang + '_r'];
  const last = step === STEPS.length - 1;
  const capture = st.type !== 'intro' && st.type !== 'closing';
  return `<div class="lesson">
    <div class="lesson-top"><div class="bar" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${step + 1}" aria-label="Interview progress"><i style="width:${((step + 1) / STEPS.length) * 100}%"></i></div><span class="count">${step + 1}/${STEPS.length}</span></div>
    <div class="setup">
      <label class="f">Talking to<select id="iv-who" data-ivf="who">${talkable.map(p => `<option value="${p.id}" ${p.id === W.id ? 'selected' : ''}>${esc(nameOf(p))} · ${esc(relOf(p))}</option>`).join('')}</select></label>
      <label class="f">Questions in<select id="iv-lang" data-ivf="lang">${LANGS.map(l => `<option value="${l.id}" ${l.id === lang ? 'selected' : ''}>${l.label}</option>`).join('')}</select></label>
      ${L.roman ? `<label class="switch"><input type="checkbox" id="iv-roman" data-ivf="roman" ${S.iv.roman ? 'checked' : ''}> Show pronunciation</label>` : ''}
    </div>
    <div class="modes">
      <button class="mode-card" data-action="elder-start" data-pid="${W.id}"><b>Large tap-to-answer mode</b><span>Big buttons ${esc(nameOf(W))} can tap on their own, one illness at a time.</span></button>
      <button class="mode-card" data-action="voices-open"><b>Question voices</b><span>${[...VOICES.keys()].filter(k => k.startsWith(lang + '|')).length} phrases recorded in ${esc(L.label.split(' · ').pop())}. Record a real voice for "Listen".</span></button>
      <button class="mode-card" data-action="invite" data-pid="${W.id}"><b>Send ${esc(nameOf(W))} a link</b><span>Far away? They answer on their own phone, in their language. No sign-up.</span></button>
      ${typeof storiesCard === 'function' ? storiesCard(W) : ''}
    </div>
    <p class="say-to">Say this to ${esc(nameOf(W))}</p>
    <div class="speaker">
      ${mascot(76)}
      <div class="bubble">
        <div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:12px">
          <button class="btn iris audio-btn" data-action="speak" aria-label="Read the question aloud">${ICON.speaker}</button>
          <p class="say" ${langAttrs(lang)}>${esc(tr(q, lang))}</p>
        </div>
        ${sayRoman ? `<p class="roman">${esc(q[lang + '_r'])}</p>` : ''}
        ${lang !== 'en' ? `<p class="gloss">In English: ${esc(q.en)}</p>` : ''}
      </div>
    </div>
    ${st.tip ? `<div class="tip">${ICON.bulb}<div><b>Tip</b><br>${esc(st.tip)}</div></div>` : ''}
    <section class="card answer" aria-label="Answer">${ans}${capture ? recHTML(W, step) + transcriptHTML(W, st) : ''}</section>
    <div class="lesson-foot">
      ${step === 0 ? '<span></span>' : `<button class="btn" data-action="iv-prev">Back</button>`}
      ${last ? `<button class="btn primary" data-action="iv-done">Finish</button>` : `<button class="btn primary" data-action="iv-next">Continue</button>`}
    </div>
    <p class="fine">These translations were drafted for this prototype. Ask a fluent family member to check them before your first interview.</p>
  </div>`;
}

/* ---------- Ancestry picker ---------- */
function ancestryPicker() {
  const mine = myAncestry();
  return `<div class="pills anc-pills" role="group" aria-label="Your family's ancestry">${ANCESTRIES.map(a => `<button class="pill-btn" data-action="anc" data-id="${a.id}" aria-pressed="${mine.has(a.id)}"${a.hint ? ` title="${esc(a.hint)}"` : ''}>${esc(a.en)}</button>`).join('')}</div>`;
}

/* ---------- My risks tab ---------- */
const CHECK_HINT = {
  genetic: 'e.g. Aunt Rani, BRCA1 change found in 2019',
  sudden: 'e.g. Uncle Ravi died in his sleep at 34',
  related: 'e.g. my parents were first cousins',
  pregnancy: 'e.g. my mother lost two babies before I was born',
  birth: 'e.g. my brother was born with a hole in the heart',
  anesthesia: 'e.g. my father got a very high fever during surgery',
  tobacco: 'e.g. my father smoked for 30 years',
};
const RISK_LEVEL = { high: 'Higher than average', moderate: 'Moderate', average: 'About average' };
function renderRisks() {
  const me = byId(SELF), list = familyRisk(), blood = bloodRelatives();
  const n = lv => list.filter(r => r.level === lv).length;
  const notSeen = RISK_TOPICS.filter(t => (!t.sex || me.sex === 'U' || t.sex === me.sex) && !list.some(r => r.t.key === t.key));
  const head = `<div style="display:grid;gap:6px"><h1>What you're most at risk for</h1>
    <p class="muted">Ranked from what your blood relatives told you. Family history is one piece of the picture. Sleep, food, exercise and not smoking or vaping matter just as much.</p></div>`;
  const ancCard = `<section class="card anc-card" style="display:grid;gap:10px">
      <div><h2>${myAncestry().size ? "Your family's ancestry" : "Add your family's ancestry"}</h2>
      <p class="small muted">Some guidelines treat ancestry as a risk factor by itself, for example South Asian ancestry and heart disease. Pick all that apply. You can change it any time.</p></div>
      ${ancestryPicker()}</section>`;
  if (!blood.length && !myAncestry().size) return head + timelineHTML() + ancCard + `<section class="card done">${mascot(90)}<h2>No blood relatives on the tree yet</h2><p class="muted" style="max-width:46ch">Add parents, grandparents and siblings, then interview them. If you were adopted, your birth family's history is what counts here; a doctor or genetic counselor can help you find out more.</p><button class="btn primary" data-action="goto-tree">Go to family tree</button></section>`;
  return head + timelineHTML() + statTiles([['Higher than average', n('high'), '', 'rose'], ['Moderate', n('moderate'), '', 'accent'], ['About average', n('average'), '', 'leaf']]) + (myAncestry().size ? '' : ancCard) + `
    ${list.length ? `<ol class="risks">${list.map((r, i) => `<li class="risk ${r.level}">
      <span class="rank">${i + 1}</span>
      <div class="risk-body">
        <div class="risk-top"><h3>${esc(r.t.name)}</h3><span class="lvl">${RISK_LEVEL[r.level]}</span></div>
        <div class="meter" aria-hidden="true"><i class="on"></i><i class="${r.level !== 'average' ? 'on' : ''}"></i><i class="${r.level === 'high' ? 'on' : ''}"></i></div>
        ${r.reasons.length ? `<p>${esc(r.reasons.join(' '))}</p>` : ''}
        ${r.ancestry.map(a => `<p class="anc-note"><b>Ancestry:</b> ${esc(a.text)} <span class="src">${esc(SOURCES[a.source].short)}</span></p>`).join('')}
        ${r.hits.length ? `<details ${i < 3 ? 'open' : ''}><summary>${r.hits.length} ${r.hits.length === 1 ? 'relative' : 'relatives'}</summary><ul>${r.hits.map(x => `<li>${esc(who(x))}: ${x.age ? 'at ' + x.age : 'age unknown'}${r.early(x) ? ' <b class="early">young</b>' : ''}</li>`).join('')}</ul></details>` : ''}
        <div class="risk-tip">${ICON.bulb}<span><b>What helps:</b> ${esc(r.t.tip)}</span></div>
      </div></li>`).join('')}</ol>` : `<section class="card"><p class="muted">No conditions recorded for your blood relatives yet. Interview someone to get started.</p></section>`}
    ${notSeen.length ? `<section class="card" style="display:grid;gap:10px"><h2>Not seen in your family yet</h2>
      <p class="small muted">No one has mentioned these. That can mean they don't run in your family, or that nobody has asked yet.</p>
      <div class="pills">${notSeen.map(t => `<span class="pill-static">${esc(t.name)}</span>`).join('')}</div></section>` : ''}
    <section class="card" style="display:grid;gap:10px"><h2>How this works</h2>
      <p class="small">Each condition gets a level using the family history method from the CDC's Family Healthware tool. It looks at how closely related each person is, how young they were, and how many relatives on the same side had it. It is not a diagnosis or a percentage chance.</p>
      ${myAncestry().size ? `<p class="small">Ancestry you entered: <b>${esc(ANCESTRIES.filter(a => myAncestry().has(a.id)).map(a => a.en).join(', '))}</b>. Change it under your name on the Family tree page.</p>` : ''}
      <ol class="refs"><li>${esc(SOURCES.scheuner.full)} <a href="${SOURCES.scheuner.url}" target="_blank" rel="noopener">Link</a></li><li>${esc(SOURCES.healthware.full)} <a href="${SOURCES.healthware.url}" target="_blank" rel="noopener">Link</a></li></ol>
      <div class="row"><button class="btn" data-action="goto-doctor">See what the screening guidelines say</button></div>
    </section>`;
}

/* ---------- Sign-in page ---------- */
function renderAuth() {
  const accts = listAccounts();
  if (AUTH.agree) {
    const a = accts.find(x => x.id === AUTH.agree.id);
    return `<div class="auth"><div class="auth-card" style="max-width:560px">
      <div class="auth-head">${mascot(72)}<h1>We updated our terms</h1><p class="muted">Hi ${esc(a?.name || '')}! Please read the updated Terms of Use and Privacy Policy before you continue.</p></div>
      <div class="terms-box">${legalHTML()}</div>
      <div class="row"><button class="btn primary" data-action="auth-agree">I agree</button><button class="btn" data-action="auth-agree-cancel">Not now</button></div>
    </div></div>`;
  }
  if (!accts.length) AUTH.mode = 'create';
  if (!AUTH.pick || !accts.some(a => a.id === AUTH.pick)) AUTH.pick = accts[0]?.id || null;
  const pick = accts.find(a => a.id === AUTH.pick);
  const legacy = !accts.length && legacyData();
  const signin = AUTH.mode === 'signin';
  return `<div class="auth"><div class="auth-card">
    <div class="auth-head">${mascot(84)}<h1>heirloom<i>.</i></h1><p class="muted">Ask your elders now. Hand your doctor a family tree later.</p></div>
    <div class="auth-tabs" role="tablist">
      <button role="tab" type="button" data-action="auth-mode" data-mode="signin" aria-selected="${signin}" ${accts.length ? '' : 'disabled'}>Sign in</button>
      <button role="tab" type="button" data-action="auth-mode" data-mode="create" aria-selected="${!signin}">Create profile</button>
    </div>
    <form id="auth-form" novalidate>
      ${signin ? `
        <span class="lbl">Who's using heirloom?</span>
        <div class="profiles">${accts.map(a => `<button type="button" class="profile" data-action="auth-pick" data-id="${a.id}" aria-pressed="${a.id === AUTH.pick}"><span class="initial">${esc(a.name[0].toUpperCase())}</span><span>${esc(a.name)}</span>${a.pinHash ? '<span class="lock" aria-label="PIN protected">PIN</span>' : ''}</button>`).join('')}</div>
        ${pick?.pinHash ? `<label class="f">PIN<input type="password" inputmode="numeric" id="auth-pin" autocomplete="current-password" maxlength="8"></label>` : ''}
        <label class="check"><input type="checkbox" id="auth-remember"> Stay signed in on this device</label>
        <button class="btn primary wide" type="submit">Sign in${pick ? ' as ' + esc(pick.name) : ''}</button>
        ${pick?.pinHash ? `<button type="button" class="link" data-action="auth-forgot">Forgot your PIN?</button>` : ''}
        ${AUTH.forgot && pick ? `<div class="forgot"><p class="small">The PIN can't be recovered. The only option is to delete ${esc(pick.name)}'s profile and family from this device, then start again or restore a backup code.</p><button type="button" class="btn sm danger armed" data-action="auth-delete">${AUTH.confirmDel ? `Tap again to delete ${esc(pick.name)}'s family for good` : `Delete ${esc(pick.name)}'s profile`}</button></div>` : ''}
      ` : `
        <label class="f">Your first name<input type="text" id="auth-name" autocomplete="given-name" maxlength="40"></label>
        <div class="grid2">
          <label class="f">Year you were born<input type="number" inputmode="numeric" id="auth-born" placeholder="e.g. 2010"></label>
          <label class="f">Sex<select id="auth-sex"><option value="F">Female</option><option value="M">Male</option><option value="U">Prefer not to say</option></select></label>
        </div>
        <div class="grid2">
          <label class="f">PIN (4 to 8 numbers)<input type="password" inputmode="numeric" id="auth-pin" autocomplete="new-password" maxlength="8"></label>
          <label class="f">Type the PIN again<input type="password" inputmode="numeric" id="auth-pin2" autocomplete="new-password" maxlength="8"></label>
        </div>
        <p class="small muted">The PIN is optional. Use one if you share this phone or computer.</p>
        ${legacy ? `<label class="check"><input type="checkbox" id="auth-legacy" checked> Keep the family already saved on this device</label>` : ''}
        <label class="check"><input type="checkbox" id="auth-remember" checked> Stay signed in on this device</label>
        <label class="check"><input type="checkbox" id="auth-terms"> <span>I have read and agree to the ${termsLink()}</span></label>
        <button class="btn primary wide" type="submit">Create profile</button>
      `}
      <p class="auth-err" id="auth-err" role="alert"></p>
    </form>
    <div class="or"><span>or</span></div>
    <button class="btn wide" data-action="auth-guest">Explore the example family</button>
    <p class="small muted" style="text-align:center">By using Heirloom Health you agree to the ${termsLink()}.</p>
    <p class="fine">Profiles and answers stay on this device; nothing is uploaded. The PIN keeps others on a shared device out of your family. It is not a cloud account, so clearing this browser's data erases it. Copy a backup code from the Family tree page to be safe.</p>
  </div></div>`;
}
// What's typed on the sign-in page survives redraws, such as reading the Terms and coming back.
function authForm() {
  const els = [...document.querySelectorAll('#main [id^="auth-"]')].filter(el => /INPUT|SELECT/.test(el.tagName));
  return els.length ? Object.fromEntries(els.map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value])) : null;
}
function restoreAuthForm(form) {
  for (const [id, v] of Object.entries(form || {})) { const el = document.getElementById(id); if (el) el.type === 'checkbox' ? el.checked = v : el.value = v; }
}
const authErr = msg => { const el = $('#auth-err'); if (el) el.textContent = msg; return false; };
async function signUp() {
  const name = $('#auth-name').value.trim(), pin = $('#auth-pin').value.trim(), pin2 = $('#auth-pin2').value.trim();
  if (!name) return authErr('Type your first name.');
  if (pin && !/^\d{4,8}$/.test(pin)) return authErr('A PIN is 4 to 8 numbers.');
  if (pin !== pin2) return authErr("The two PINs don't match.");
  if (listAccounts().some(a => a.name.toLowerCase() === name.toLowerCase())) return authErr('That name is already used on this device. Try adding your last initial.');
  if (!$('#auth-terms').checked) return authErr('Please read and agree to the Terms and Privacy Policy.');
  let acct;
  try { acct = await createAccount({ name, pin, terms: TERMS_VERSION }); } catch { return authErr("This browser can't create a secure PIN here. Try without a PIN, or use another browser."); }
  if (!listAccounts().some(a => a.id === acct.id)) return authErr("This browser isn't letting heirloom save. Try a regular (not private) window.");
  startSession(acct.id, $('#auth-remember').checked);
  const me = { name, born: $('#auth-born').value.trim(), sex: $('#auth-sex').value };
  let state = $('#auth-legacy')?.checked ? legacyData() : null;
  if (state) { const self = state.people.find(p => p.id === SELF); Object.assign(self, { name: self.name || me.name, born: self.born || me.born, sex: self.sex !== 'U' ? self.sex : me.sex }); }
  enter(acct, state || blankState(me));
  toast(`Welcome, ${name}! Start by filling in what you already know.`);
}
async function signIn() {
  const acct = listAccounts().find(a => a.id === AUTH.pick);
  if (!acct) return authErr('Tap your name first.');
  if (pinLocked()) return authErr('Too many wrong PINs. Wait 30 seconds, then try again.');
  let ok = false;
  try { ok = await checkPin(acct, $('#auth-pin')?.value.trim() || ''); } catch { return authErr("This browser can't check PINs here. Try another browser."); }
  if (!ok) { notePinMiss(); $('#auth-pin').value = ''; return authErr("That PIN isn't right. Try again."); }
  if (acct.terms !== TERMS_VERSION) { AUTH.agree = { id: acct.id, remember: $('#auth-remember').checked }; render(); window.scrollTo({ top: 0 }); return; }
  startSession(acct.id, $('#auth-remember').checked);
  enter(acct);
  toast(`Welcome back, ${acct.name}!`);
}

/* ---------- Doctor tab ---------- */
function viewerQuestionsHTML() {
  const qs = S.viewerQuestions || [];
  return qs.length ? `<section class="card" style="display:grid;gap:10px"><h2>${esc(S.sharedBy || 'The patient')}'s questions for this visit</h2><ul class="asks-list">${qs.map(q => `<li><span>${esc(q)}</span></li>`).join('')}</ul></section>` : '';
}
const LEVEL = { act: ['!', 'Act on this'], discuss: ['?', 'Discuss'], note: ['i', 'Good to know'], missing: ['…', 'Missing info'] };
function sourceOrder(cards) { const order = []; cards.forEach(c => c.sources.forEach(s => { if (!order.includes(s)) order.push(s); })); return order; }
function sideLabel(p) { const s = kin(p.id).side; return s === 'paternal' ? "Father's side" : s === 'maternal' ? "Mother's side" : kin(p.id).blood ? 'Immediate family' : 'Not blood related'; }
function renderDoctor() {
  const me = byId(SELF), cards = guidelineCards(), refs = sourceOrder(cards);
  const ref = s => `<a href="#ref-${s}" class="ref">[${refs.indexOf(s) + 1}]</a>`;
  const others = S.people.filter(p => p.id !== SELF);
  const rows = CONDS.map(c => {
    const list = others.flatMap(p => facts(p.id).filter(f => f.cond === c.id).map(f => ({ p, f })));
    if (!list.length) return '';
    return `<tr class="grp"><td colspan="4">${esc(c.report || c.en)}</td></tr>` + list.map(({ p, f }) => `<tr${kin(p.id).blood ? '' : ' class="nb"'}><td>${esc(relOf(p))}<br><span class="small muted">${esc(nameOf(p))}</span></td><td>${f.type || c.id === 'cancer' ? esc(factName(c.id, f.type)) + '<br>' : ''}<span class="small muted">${sideLabel(p)}</span></td><td class="n">${esc(f.age || '?')}${f.disagree ? '<span class="dis" title="People disagree">*</span>' : ''}</td><td class="small">${f.reports.map(r => `${esc(reporterName(r.by))}${r.age ? ' ' + esc(r.age) : ''}${r.said ? ` (“${esc(r.said)}”)` : ''}`).join('<br>')}</td></tr>`).join('');
  }).join('');
  const dead = others.filter(p => p.living === 'no');
  const interviewed = others.filter(p => p.interviewed);
  return `
    <div class="doc-head">
      <div style="display:grid;gap:4px"><span class="eyebrow">Family health history</span><h1>${esc(nameOf(me))}${me.born ? `, born ${esc(me.born)}` : ''}</h1>
        <p class="small muted">Prepared ${fmtDate(today())}. ${interviewed.length ? `Interviews: ${interviewed.map(p => `${esc(relOf(p).toLowerCase())} (${fmtDate(p.interviewed)})`).join(', ')}.` : 'No interviews finished yet.'}</p></div>
      <div class="row"><button class="btn primary" data-action="pdf" ${S.pdfBusy ? 'disabled' : ''}>${S.pdfBusy ? 'Making PDF…' : 'Download PDF'}</button><button class="btn" data-action="fhir" title="A FHIR file that clinic record systems can import">Download for medical records</button>${ACCT.viewer ? '' : `<button class="btn" data-action="qr">Show my doctor</button><button class="btn" data-action="copy-summary">Copy as text</button>`}</div>
    </div>
    ${ACCT.viewer ? viewerQuestionsHTML() : checklistHTML()}
    ${timelineHTML({ compact: true })}
    <section class="card" style="display:grid;gap:14px"><div><h2>What the guidelines say about your family</h2>
      <p class="small muted">Each card is a published screening rule applied to your blood relatives. Tap "Why" to see which relatives triggered it.</p></div>
      ${cards.length ? `<ul class="flags">${cards.map((c, i) => `<li class="${c.level}"><span class="ic">${LEVEL[c.level][0]}</span><div>
        <span class="lv">${LEVEL[c.level][1]}</span><h3>${esc(c.title)}</h3><p>${esc(c.rec)} ${c.sources.map(ref).join(' ')}</p>
        ${c.why.length ? `<details ${i < 2 ? 'open' : ''}><summary>Why</summary><ul>${c.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}</div></li>`).join('')}</ul>` : '<p class="muted">Nothing stands out yet. Keep interviewing.</p>'}
      <p class="fine">These rules summarize published guidelines to start a conversation. They are not a diagnosis, and your doctor decides what they mean for you.</p>
    </section>
    <section class="card" style="display:grid;gap:10px"><h2>Conditions in the family</h2>
      ${rows ? `<div class="tbl-wrap"><table><thead><tr><th>Relative</th><th>Kind · side</th><th>Age found</th><th>Reported by</th></tr></thead><tbody>${rows}</tbody></table></div><p class="fine">* family members gave different ages; the youngest is used. Grey rows are not blood relatives.</p>` : '<p class="muted">None recorded yet.</p>'}
    </section>
    ${dead.length ? `<section class="card" style="display:grid;gap:10px"><h2>Relatives who have died</h2><div class="tbl-wrap"><table><thead><tr><th>Relative</th><th>Age at death</th><th>Cause</th></tr></thead><tbody>
      ${dead.map(p => `<tr><td>${esc(relOf(p))}<br><span class="small muted">${esc(nameOf(p))}</span></td><td class="n">${esc(p.deathAge || '?')}</td><td>${esc(p.cause || 'Unknown')}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
    ${(fa => fa.length ? `<section class="card" style="display:grid;gap:10px"><h2>Other family history</h2><div class="tbl-wrap"><table><thead><tr><th>Question</th><th>Answer</th><th>Said by</th></tr></thead><tbody>
      ${fa.map(x => `<tr><td>${esc(x.q)}</td><td>${esc([x.answer, x.note].filter(Boolean).join('. '))}</td><td>${esc(x.by)}</td></tr>`).join('')}</tbody></table></div></section>` : '')(familyAnswers())}
    ${(ns => ns.length ? `<section class="card" style="display:grid;gap:10px"><h2>Notes from interviews</h2><p class="small muted">What relatives said that didn't fit a checkbox, in their own words.</p><div class="tbl-wrap"><table><thead><tr><th>Person</th><th>Notes</th></tr></thead><tbody>
      ${ns.map(n => `<tr><td>${esc(n.who)}<br><span class="small muted">${esc(n.label)}</span></td><td style="white-space:pre-wrap">${esc(n.text)}</td></tr>`).join('')}</tbody></table></div></section>` : '')(interviewNotes())}
    <section class="card tree-card"><div class="hd"><h2>Pedigree</h2></div><div class="tree-scroll">${treeSVG({ interactive: false, hl: 'any' })}</div>${keyHTML()}</section>
    ${refs.length ? `<section class="card" style="display:grid;gap:8px"><h2>Sources</h2><ol class="refs">${refs.map(s => `<li id="ref-${s}">${esc(SOURCES[s].full)} <a href="${SOURCES[s].url}" target="_blank" rel="noopener">Link</a></li>`).join('')}</ol></section>` : ''}`;
}
// Answers to the whole-family questions (genetic tests, sudden deaths and so on), with who gave them.
function familyAnswers() {
  const out = [];
  for (const c of FAMILY_CHECKS) for (const p of S.people) {
    const a = p.checks?.[c.id];
    if (a && (a.a === 'yes' || a.note)) out.push({ q: c.en, by: reporterName(p.id), answer: a.a === 'yes' ? 'Yes' : a.a === 'no' ? 'No' : a.a === 'unknown' ? "Doesn't know" : '', note: a.note || '' });
  }
  return out;
}
// Free-text notes about a person: the Notes box on their card, plus what they said in the interview steps
// that have no checkboxes (other health problems, siblings, children, ancestry). Older profiles kept some of
// these in separate fields, so both places are read.
const NOTE_PARTS = [
  ['Notes', p => [p.notes]],
  ['Other health problems, surgeries and medicines', p => [p.transcripts?.other_self]],
  ['About their parents', p => [p.parentNotes]],
  ['About their brothers and sisters', p => [p.sibNotes, p.transcripts?.siblings]],
  ['About their children', p => [p.kidNotes, p.transcripts?.children]],
  ['Where the family comes from', p => [p.transcripts?.ancestry, p.checks?.ancestry?.note]],
];
function personNotes(p) {
  return NOTE_PARTS.map(([label, get]) => [label, [...new Set(get(p).map(t => (t || '').trim()).filter(Boolean))].join('\n')]).filter(([, t]) => t);
}
// Free-text notes typed during interviews, so nothing that didn't fit a box is lost.
function interviewNotes() {
  return S.people.flatMap(p => personNotes(p).map(([label, text]) => ({ who: p.id === SELF ? 'You' : `${relOf(p)} (${nameOf(p)})`, label, text })));
}
function summaryText() {
  const me = byId(SELF), cards = guidelineCards(), others = S.people.filter(p => p.id !== SELF);
  const L = ['FAMILY HEALTH HISTORY', `For: ${nameOf(me)}${me.born ? ' (born ' + me.born + ')' : ''}. Prepared ${fmtDate(today())}.`, '', 'WHAT THE GUIDELINES SAY'];
  cards.forEach(c => { L.push(`[${LEVEL[c.level][1]}] ${c.title}`, `  ${c.rec}`); c.why.forEach(w => L.push(`  - ${w}`)); if (c.sources.length) L.push(`  Source: ${c.sources.map(s => SOURCES[s].short).join('; ')}`); });
  const risks = familyRisk();
  if (risks.length) { L.push('', 'FAMILY-HISTORY RISK LEVELS (Scheuner method, CDC Family Healthware)'); risks.forEach(r => L.push(`- ${r.t.name}: ${RISK_LEVEL[r.level]}. ${r.reasons.join(' ')}`)); }
  const qs = checklist();
  if (qs.length) { L.push('', 'QUESTIONS FOR MY NEXT CHECKUP'); qs.forEach(it => L.push(`- ${it.q}`)); }
  L.push('', 'MY HEALTH TIMELINE'); timelineLines().forEach(t => L.push(`- ${t}`));
  L.push('', 'CONDITIONS IN THE FAMILY');
  for (const p of others) for (const f of facts(p.id)) L.push(`- ${relOf(p)} (${nameOf(p)}): ${factName(f.cond, f.type)}, age ${f.age || 'unknown'}${f.disagree ? ` (reports range ${f.range})` : ''}${kin(p.id).blood ? '' : ' [not blood related]'}`);
  const dead = others.filter(p => p.living === 'no');
  const notes = interviewNotes();
  if (notes.length) { L.push('', 'NOTES FROM INTERVIEWS'); notes.forEach(n => L.push(`- ${n.who}, ${n.label.toLowerCase()}: ${n.text}`)); }
  const fa = familyAnswers();
  if (fa.length) { L.push('', 'OTHER FAMILY HISTORY'); fa.forEach(x => L.push(`- ${x.q}: ${[x.answer, x.note].filter(Boolean).join('. ')} (${x.by})`)); }
  if (dead.length) { L.push('', 'RELATIVES WHO HAVE DIED'); dead.forEach(p => L.push(`- ${relOf(p)} (${nameOf(p)}): age ${p.deathAge || 'unknown'}, ${p.cause || 'cause unknown'}`)); }
  return L.join('\n');
}

/* ---------- PDF export ---------- */
const LIGHT = { '--bg': '#F7F6FB', '--panel': '#FFFFFF', '--soft': '#F1F0F7', '--ink': '#33324A', '--strong': '#1E1D33', '--muted': '#6E6C86', '--line': '#E4E2EE', '--leaf': '#2E9E62', '--primary': '#0E7C86', '--primary-soft': '#DDF1F2', '--accent': '#F5A524', '--accent-dk': '#A8680A', '--sym': '#3A3950' };
function pedigreePNG() {
  const css = `.t-nm{font:700 13px Helvetica,Arial,sans-serif;fill:#1E1D33}.t-rl{font:11.5px Helvetica,Arial,sans-serif;fill:#6E6C86}.t-nb{font:italic 11px Helvetica,Arial,sans-serif;fill:#6E6C86}.t-dt{font:11px Helvetica,Arial,sans-serif;fill:#33324A}.t-cd{font:700 11px Helvetica,Arial,sans-serif;fill:#A8680A}.t-q{font:700 18px Helvetica,Arial,sans-serif;fill:#6E6C86}.ln{stroke:#6E6C86;stroke-width:2;fill:none;stroke-linecap:round}.adopt{stroke-dasharray:5 4}.sym{stroke:#3A3950;stroke-width:2.5}.faint{stroke:#6E6C86;stroke-dasharray:4 3}.chk{fill:#2E9E62}.lbl-bg{fill:#FFFFFF}.ring{fill:none;stroke:none}.t-gen{font:700 15px Helvetica,Arial,sans-serif;fill:#A9A7BD}`;
  const s = treeSVG({ interactive: false, hl: 'any' })
    .replace(/var\((--[\w-]+)\)/g, (m, k) => LIGHT[k] || '#000')
    .replace(/ style="max-width[^"]*"/, '')
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/^(<svg[^>]*>)/, `$1<style>${css}</style>`);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = 2, c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      res({ url: c.toDataURL('image/png'), w: img.width, h: img.height });
    };
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  });
}
// The PDF's built-in Helvetica only covers Latin-1, so swap common punctuation and mark anything else.
const lat = s => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x00-\xFF]/g, '?');
async function makePDF() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('The PDF tool did not load. Check your connection and try again.');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const M = 54, PW = 612, PH = 792, CW = PW - 2 * M, INK = [30, 29, 51], MUTED = [110, 108, 134], TEAL = [14, 124, 134];
  let y = M;
  const need = h => { if (y + h > PH - M - 20) { doc.addPage(); y = M; } };
  const text = (s, { size = 10, bold = false, color = INK, x = M, w = CW, gap = 1.35 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
    for (const line of doc.splitTextToSize(lat(s), w)) { need(size * gap); doc.text(line, x, y + size); y += size * gap; }
  };
  const heading = s => { y += 16; need(40); text(s, { size: 13, bold: true }); doc.setDrawColor(228, 226, 238); doc.setLineWidth(1.5); doc.line(M, y + 2, PW - M, y + 2); y += 10; };
  const me = byId(SELF), others = S.people.filter(p => p.id !== SELF), interviewed = others.filter(p => p.interviewed);
  const cards = guidelineCards(), refs = sourceOrder(cards);

  doc.setFillColor(...TEAL); doc.rect(0, 0, PW, 8, 'F');
  text('FAMILY HEALTH HISTORY', { size: 9, bold: true, color: TEAL });
  text(`${nameOf(me)}${me.born ? ', born ' + me.born : ''}`, { size: 22, bold: true });
  text(`Prepared ${fmtDate(today())}.${interviewed.length ? ' Interviews: ' + interviewed.map(p => `${relOf(p).toLowerCase()} (${fmtDate(p.interviewed)})`).join(', ') + '.' : ''}`, { size: 9.5, color: MUTED });

  heading('What the guidelines say about this family');
  const tag = { act: [169, 52, 72], discuss: [168, 104, 10], note: TEAL, missing: MUTED };
  if (!cards.length) text('Nothing stands out yet.', { color: MUTED });
  for (const c of cards) {
    need(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...tag[c.level]); doc.text(lat(LEVEL[c.level][1].toUpperCase()), M, y + 9);
    text(c.title, { bold: true, size: 10.5, x: M + 78, w: CW - 78 });
    text(`${c.rec}${c.sources.length ? ' ' + c.sources.map(s => `[${refs.indexOf(s) + 1}]`).join('') : ''}`, { size: 9.5, x: M + 78, w: CW - 78 });
    c.why.forEach(w => text(`- ${w}`, { size: 9, color: MUTED, x: M + 86, w: CW - 86 }));
    y += 6;
  }

  const risks = familyRisk();
  if (risks.length) {
    heading('Family-history risk levels');
    text('Levels use the Scheuner family-history method from CDC Family Healthware: closeness of relatives, age at diagnosis, and how many share a side.', { size: 8.5, color: MUTED });
    y += 4;
    const lvColor = { high: [169, 52, 72], moderate: [168, 104, 10], average: [46, 158, 98] };
    for (const r of risks) {
      need(26);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...lvColor[r.level]); doc.text(lat(RISK_LEVEL[r.level].toUpperCase()), M, y + 9);
      text(`${r.t.name}: ${r.reasons.join(' ')} (${r.hits.map(x => `${x.k.label} ${x.age || '?'}`).join(', ')})`, { size: 9.5, x: M + 118, w: CW - 118 });
      y += 3;
    }
  }

  const qs = checklist();
  if (qs.length) { heading('Questions for my next checkup'); qs.forEach(it => text(`[ ] ${it.q}`, { size: 10 })); }
  heading('My health timeline'); timelineLines().forEach(t => text(t, { size: 10 }));

  heading('Conditions in the family');
  const cols = [M, M + 160, M + 270, M + 320];
  const row = (cells, { bold = false, color = INK } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(9); doc.setTextColor(...color);
    const wrapped = cells.map((c, i) => doc.splitTextToSize(lat(c), (cols[i + 1] || PW - M) - cols[i] - 8));
    const h = Math.max(...wrapped.map(w => w.length)) * 11.5 + 6; need(h);
    wrapped.forEach((w, i) => doc.text(w, cols[i] + 4, y + 11)); y += h;
  };
  let any = false;
  row(['Relative', 'Side', 'Age found', 'Reported by'], { bold: true, color: MUTED });
  for (const c of CONDS) {
    const list = others.flatMap(p => facts(p.id).filter(f => f.cond === c.id).map(f => ({ p, f })));
    if (!list.length) continue; any = true;
    need(32); doc.setFillColor(241, 240, 247); doc.roundedRect(M, y, CW, 17, 4, 4, 'F'); row([c.report || c.en], { bold: true });
    list.forEach(({ p, f }) => row([`${relOf(p)} (${nameOf(p)})${f.type || c.id === 'cancer' ? ' - ' + factName(c.id, f.type) : ''}`, sideLabel(p), (f.age || '?') + (f.disagree ? '*' : ''), f.reports.map(r => `${reporterName(r.by)}${r.age ? ' ' + r.age : ''}`).join(', ')], { color: kin(p.id).blood ? INK : MUTED }));
  }
  if (!any) text('None recorded yet.', { color: MUTED });
  else text('* family members gave different ages; the youngest is used. Grey rows are not blood relatives.', { size: 8.5, color: MUTED });

  const dead = others.filter(p => p.living === 'no');
  const notes = interviewNotes();
  if (notes.length) { heading('Notes from interviews'); notes.forEach(n => text(`${n.who}, ${n.label.toLowerCase()}: ${n.text}`)); }
  const fa = familyAnswers();
  if (fa.length) { heading('Other family history'); fa.forEach(x => text(`${x.q}: ${[x.answer, x.note].filter(Boolean).join('. ')} (${x.by})`)); }
  if (dead.length) { heading('Relatives who have died'); dead.forEach(p => text(`${relOf(p)} (${nameOf(p)}): age ${p.deathAge || 'unknown'}, ${p.cause || 'cause unknown'}`)); }

  const img = await pedigreePNG();
  let w = CW, h = w * img.h / img.w;
  if (h > PH - 2 * M - 60) { h = PH - 2 * M - 60; w = h * img.w / img.h; }
  heading('Pedigree'); need(h + 30);
  doc.addImage(img.url, 'PNG', M + (CW - w) / 2, y, w, h); y += h + 6;
  text('Square = male, circle = female, shaded = has a condition, slash = deceased, dashed = not blood related or adopted, arrow = me.', { size: 8.5, color: MUTED });

  if (refs.length) { heading('Sources'); refs.forEach((s, i) => text(`[${i + 1}] ${SOURCES[s].full} ${SOURCES[s].url}`, { size: 8.5 })); }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    doc.text(lat(`Family-reported history collected with Heirloom Health. Guideline summaries are not a diagnosis.   Page ${i} of ${n}`), M, PH - 30);
  }
  return doc.output('blob');
}
// Offer a file to the viewer: Claude's download prompt inside Claude, a normal download on the website.
async function saveFile(fname, blob) {
  const dl = window.claude?.use ? await window.claude.use('downloads') : null;
  if (dl) { await dl.save({ filename: fname, data: blob }); toast('Saved'); return; }
  if (window.top !== window.self) { toast("Saving files isn't available in this view."); return; }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: fname });
  document.body.append(a); a.click(); a.remove();
  toast('Downloaded');
}
async function exportPDF() {
  S.pdfBusy = true; render();
  try {
    const blob = await makePDF();
    const fname = `family-health-history-${(nameOf(byId(SELF)) || 'me').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
    await saveFile(fname, blob);
  } catch (e) {
    if (e?.code !== 'declined') toast(e?.message && !e.code ? e.message : "Couldn't save the PDF here. Use Copy as text instead.");
  } finally { S.pdfBusy = false; render(); }
}

/* ---------- Render ---------- */
const TABS = { tree: 'Family tree', interview: 'Interview', risks: 'My risks', doctor: 'Doctor report' };
function renderShell() {
  const logo = `${mascot(42)}<b>heirloom<i>.</i></b>`;
  $('#logo-side').innerHTML = logo;
  $('#logo-top').innerHTML = `<div class="logo">${logo}</div>`;
  for (const [t, label] of Object.entries(TABS)) { const b = $('#tab-' + t); b.innerHTML = `${ICON[t]}<span>${label}</span>`; b.setAttribute('aria-selected', S.tab === t); }
  const chip = `<span class="initial">${esc((ACCT.name || '?')[0].toUpperCase())}</span><span class="acct-name">${ACCT.guest ? 'Guest' : esc(ACCT.name)}</span><button class="link" data-action="menu-open">Menu</button>`;
  $('#acct-side').innerHTML = chip;
  $('#side-links').innerHTML = `<button class="link" data-tour="start">How the app works</button><button class="link" data-action="feedback-open">Send feedback</button><button class="link" data-action="legal-open">Terms and privacy</button>`;
  $('#logo-top').innerHTML = `<div class="logo">${logo}</div><div class="acct">${chip}</div>`;
}
function renderBanner() {
  if (ACCT?.viewer) return `<div class="banner viewer-banner">${mascot(48)}<p><b>Family health history shared by ${esc(S.sharedBy || 'a patient')}</b> on ${fmtDate(S.sharedAt || today())}. Read-only. Nothing is saved on this device, and the report was never stored on a server.</p></div>`;
  return ACCT?.guest ? `<div class="banner">${mascot(48)}<p><b>You're exploring an example family.</b> The names and illnesses are made up, and changes here aren't yours to keep.</p><button class="btn primary" data-action="start-own">Create my profile</button></div>` : '';
}
const MODAL_FOCUS = { kind: null, back: null };
function render() { renderApp(); applyTour(); }
function renderApp() {
  const keep = document.activeElement?.id;
  const ts0 = $('#tree-svg'), scroll = ts0 ? [ts0.scrollLeft, ts0.scrollTop] : null;
  if (LEGAL_OPEN) {
    document.body.classList.add('solo'); document.body.classList.remove('elder-on');
    $('#modal-root').innerHTML = ''; $('#main').innerHTML = renderLegal(); return;
  }
  document.body.classList.toggle('signed-out', !S);
  document.body.classList.toggle('elder-on', !!E);
  document.body.classList.toggle('solo', !!(ACCT?.viewer || ACCT?.contributor));
  $('#modal-root').innerHTML = S ? renderModal() : '';
  // Move keyboard focus into a pop-up when it opens, and back where it was when it closes.
  const opened = S?.modal?.kind || null;
  if (opened !== MODAL_FOCUS.kind) {
    if (opened && !MODAL_FOCUS.kind) MODAL_FOCUS.back = document.activeElement;
    if (opened) setTimeout(() => $('.modal input:not([readonly]), .modal textarea, .modal button:not(.modal-x), .modal a')?.focus(), 0);
    else { const back = MODAL_FOCUS.back; MODAL_FOCUS.back = null; setTimeout(() => back?.isConnected && back.focus(), 0); }
    MODAL_FOCUS.kind = opened;
  }
  if (E && S) { $('#main').innerHTML = renderElder(); return; }
  if (ACCT?.contributor) { $('#main').innerHTML = renderContribStart(); return; }
  if (ACCT?.viewer) { $('#main').innerHTML = renderBanner() + renderDoctor(); return; }
  if (!S) { const form = authForm() || AUTH.form; $('#main').innerHTML = renderAuth(); restoreAuthForm(form); AUTH.form = null; if (keep) document.getElementById(keep)?.focus(); return; }
  renderShell();
  const page = S.tab === 'interview' && S.showVoices ? renderVoices : S.tab === 'interview' && S.showStories && typeof renderStories === 'function' ? renderStories : { tree: renderTree, interview: renderInterview, risks: renderRisks, doctor: renderDoctor }[S.tab] || renderTree;
  $('#main').innerHTML = renderBanner() + page();
  const ts = $('#tree-svg');
  if (ts) {
    if (S.zoom == null) { S.zoom = clampZoom(Math.min(1, Math.max(0.85, fitZoom()))); refreshTree(); const zv = $('#zval'); if (zv) zv.textContent = Math.round(S.zoom * 100) + '%'; }
    if (scroll) [ts.scrollLeft, ts.scrollTop] = scroll; else centerOn(S.sel || SELF);
  }
  if (keep) document.getElementById(keep)?.focus();
}
function refreshTree() { const el = $('#tree-svg'); if (el) el.innerHTML = treeSVG({ zoom: S.zoom || 1 }); }
// Zoom and scrolling for the family chart.
const clampZoom = z => Math.round(Math.min(1.8, Math.max(0.3, z)) * 100) / 100;
function fitZoom() { const ts = $('#tree-svg'); return ts && TREE_GEOM ? (ts.clientWidth - 12) / TREE_GEOM.width : 1; }
function setZoom(z) {
  const ts = $('#tree-svg'); if (!ts) return;
  const cx = (ts.scrollLeft + ts.clientWidth / 2) / ts.scrollWidth, cy = (ts.scrollTop + ts.clientHeight / 2) / ts.scrollHeight;
  S.zoom = clampZoom(z); save(); refreshTree();
  ts.scrollLeft = cx * ts.scrollWidth - ts.clientWidth / 2; ts.scrollTop = cy * ts.scrollHeight - ts.clientHeight / 2;
  const zv = $('#zval'); if (zv) zv.textContent = Math.round(S.zoom * 100) + '%';
}
function centerOn(id) {
  const ts = $('#tree-svg'), p = TREE_GEOM?.pos[id]; if (!ts || !p) return;
  const z = S.zoom || 1;
  ts.scrollLeft = (p.x - TREE_GEOM.minX) * z - ts.clientWidth / 2;
  ts.scrollTop = (p.y + 40) * z - ts.clientHeight / 2;
}
let DRAG = null, SUPPRESS_CLICK = false;
document.addEventListener('pointerdown', e => {
  const ts = e.target.closest('#tree-svg');
  if (ts && e.pointerType === 'mouse' && e.button === 0) DRAG = { ts, x: e.clientX, y: e.clientY, l: ts.scrollLeft, t: ts.scrollTop, moved: false };
});
document.addEventListener('pointermove', e => {
  if (!DRAG) return;
  const dx = e.clientX - DRAG.x, dy = e.clientY - DRAG.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) { DRAG.moved = true; DRAG.ts.classList.add('dragging'); }
  if (DRAG.moved) { DRAG.ts.scrollLeft = DRAG.l - dx; DRAG.ts.scrollTop = DRAG.t - dy; }
});
document.addEventListener('pointerup', () => {
  if (DRAG?.moved) { SUPPRESS_CLICK = true; setTimeout(() => { SUPPRESS_CLICK = false; }, 0); }
  DRAG?.ts.classList.remove('dragging'); DRAG = null;
});
function setTab(t) { S.tab = t; save(); render(); window.scrollTo({ top: 0 }); }
async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); toast(label); }
  catch { const ta = $('#copy-fallback') || Object.assign(document.createElement('textarea'), { id: 'copy-fallback' }); ($('.modal') || $('#main')).append(ta); ta.hidden = false; ta.value = text; ta.select(); toast('Select all and copy the highlighted text'); }
}

/* ---------- Events ---------- */
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset, p = d.pid && byId(d.pid);
  if (t.id === 'fb-msg' && S?.modal) { S.modal.draft = t.value; return; }
  if (t.id === 'fb-email' && S?.modal) { S.modal.email = t.value; return; }
  if (!p) return;
  if (d.tr) { (p.transcripts ||= {})[d.tr] = t.value; save(); return; }
  if (d.chk) { ((p.checks ||= {})[d.chk] ||= {}).note = t.value; p.u = Date.now(); save(); return; }
  if (d.f && t.type !== 'checkbox' && t.type !== 'file' && t.tagName !== 'SELECT') { p[d.f] = t.value; p.u = Date.now(); save(); refreshTree(); }
  else if (d.cf === 'age') { addReport(p.id, d.cond, d.type, d.by, { age: t.value }); save(); refreshTree(); }
});
document.addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (t.id === 'fb-info' && S?.modal) { S.modal.noInfo = !t.checked; return; }
  if (d.sttMode != null) { S.sttMode = t.value; save(); render(); return; }
  if (d.ask) { (S.asked ||= {})[d.ask] = t.checked; save(); render(); return; }
  if (d.voiceLang != null) { S.voiceLang = t.value; render(); return; }
  if (d.voiceImport) { const f = t.files?.[0]; if (f) importVoicePack(f); t.value = ''; return; }
  if (d.media) { const f = t.files?.[0]; if (f) addMedia(d.pid, f, d.media); t.value = ''; return; }
  if (t.id === 'rec-file') { const f = t.files?.[0]; if (f) addClip(d.pid, S.iv.step, f, null); t.value = ''; return; }
  if (d.otherName) { // renaming "something else" changes how it is grouped, so this waits until the box is left
    const rep = S.reports.find(r => r.id === d.otherName);
    if (rep) { rep.type = t.value.trim().slice(0, 60); rep.u = Date.now(); save(); render(); }
    return;
  }
  if (d.sugg != null) { SUGG.list[+d.sugg].pid = t.value; render(); return; }
  if (d.ivf) { S.iv[d.ivf] = t.type === 'checkbox' ? t.checked : t.value; if (d.ivf === 'who') { S.celebrate = null; S.iv.step = 0; } save(); render(); return; }
  const p = d.pid && byId(d.pid);
  if (!p) return;
  if (d.cf === 'on') {
    if (t.checked) addReport(p.id, d.cond, '', d.by);
    else { const gone = r => r.pid === p.id && r.cond === d.cond && r.by === d.by; noteDeleted('r', S.reports.filter(gone).map(r => r.id)); dropReports(gone); }
    save(); render();
    if (t.checked) document.getElementById(t.id + '-age')?.focus();
  } else if (t.tagName === 'SELECT' && d.f) { p[d.f] = t.value; p.u = Date.now(); save(); render(); }
  else if (d.f === 'cause' || d.f === 'deathAge') render();
});
document.addEventListener('click', e => {
  if (SUPPRESS_CLICK && e.target.closest('#tree-svg')) return;
  const tab = e.target.closest('.nav button'); if (tab) return setTab(tab.dataset.tab);
  const node = e.target.closest('[data-node]'); if (node) { S.sel = node.dataset.node; S.confirmRemove = null; save(); render(); if (innerWidth <= 1100) document.querySelector('.editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const hl = e.target.closest('[data-hl]'); if (hl) { S.hl = hl.dataset.hl; save(); render(); return; }
  const liv = e.target.closest('[data-living]'); if (liv) { const p = byId(liv.dataset.pid); p.living = liv.dataset.living; p.u = Date.now(); save(); render(); return; }
  const b = e.target.closest('[data-action]'); if (!b) return;
  if (b.classList.contains('modal-back') && e.target.closest('.modal')) return; // a click inside the panel isn't a click on the backdrop
  const a = b.dataset.action;
  if (a === 'legal-open') { if (!S) AUTH.form = authForm(); if (S?.modal) S.modal = null; LEGAL_OPEN = true; render(); window.scrollTo({ top: 0 }); return; }
  if (a === 'legal-close') { LEGAL_OPEN = false; render(); window.scrollTo({ top: 0 }); return; }
  if (a.startsWith('auth-')) return authAction(a, b);
  if (a === 'signout') return signOut();
  if (!S) return;
  if (elderAction(a, b)) return;
  if (typeof storiesAction === 'function' && storiesAction(a, b)) return;
  const p = b.dataset.pid && byId(b.dataset.pid);
  if (a !== 'remove') S.confirmRemove = null;
  if (a !== 'wipe') S.confirmWipe = false;
  if (a !== 'clip-del') S.confirmClip = null;
  if (a !== 'media-del') S.confirmMedia = null;
  switch (a) {
    case 'rec-start': startRec(p.id, S.iv.step); break;
    case 'rec-stop': REC?.mr.stop(); break;
    case 'cap-start': startCaptions(p.id, STEPS[S.iv.step].k); break;
    case 'cap-stop': RECOG?.stop(); break;
    case 'find': runFinder(false); break;
    case 'find-ai': runFinder(true); break;
    case 'sugg-add': {
      const s = SUGG.list[+b.dataset.i], W = byId(S.iv.who), T = byId(s.pid);
      if (s.kind === 'death') { T.living = 'no'; if (s.age) T.deathAge = s.age; if (s.cause && !T.cause) T.cause = s.cause; }
      else if (s.kind === 'born') T.born = s.year;
      else if (s.kind === 'living') T.living = 'yes';
      else addReport(s.pid, s.cond, s.type, W.id, { age: s.age, said: s.said });
      SUGG.list.splice(+b.dataset.i, 1); save(); render(); toast(`Added for ${nameOf(T)}`); break;
    }
    case 'sugg-skip': SUGG.list.splice(+b.dataset.i, 1); render(); break;
    case 'ctype': {
      const { pid, type, by } = b.dataset, cond = b.dataset.cond || 'cancer';
      const mine = r => r.pid === pid && r.cond === cond && r.by === by;
      if (findReport(pid, cond, type, by)) { const gone = r => mine(r) && r.type === type; noteDeleted('r', S.reports.filter(gone).map(r => r.id)); dropReports(gone); }
      else { const blank = findReport(pid, cond, '', by); if (blank) blank.type = type; else addReport(pid, cond, type, by); }
      if (!S.reports.some(mine)) addReport(pid, cond, '', by);
      save(); render(); break;
    }
    case 'other-add': {
      const box = document.getElementById(b.dataset.pre + '-other-new'), name = box?.value.trim().slice(0, 60);
      if (!name) { toast('Type the name of the illness first'); box?.focus(); break; }
      addReport(p.id, 'other', name, b.dataset.by); save(); render(); document.getElementById(b.dataset.pre + '-other-new')?.focus(); break;
    }
    case 'del-report': noteDeleted('r', [b.dataset.rid]); dropReports(r => r.id === b.dataset.rid); save(); render(); break;
    case 'clip-del': if (S.confirmClip === b.dataset.clip) { S.confirmClip = null; removeClip(b.dataset.clip); } else { S.confirmClip = b.dataset.clip; render(); } break;
    case 'pdf': exportPDF(); break;
    case 'fhir': exportFHIR(); break;
    case 'm-close': S.modal = null; render(); break;
    case 'menu-open': S.modal = { kind: 'menu' }; render(); break;
    case 'feedback-open': S.modal = { kind: 'feedback', type: 'bug' }; render(); $('#fb-msg')?.focus(); break;
    case 'fb-type': S.modal.type = b.dataset.type; render(); break;
    case 'fb-send': sendFeedback(); break;
    case 'fb-copy': copyText(feedbackText(S.modal), 'Message copied'); break;
    case 'fb-github': if ((S.modal.draft || '').trim().length < 5) { $('#fb-err').textContent = 'Please write a little more.'; break; } window.open(githubIssueUrl(S.modal), '_blank', 'noopener'); break;
    case 'stt-open': S.modal = { kind: 'stt' }; render(); break;
    case 'stt-model': S.sttModel = b.dataset.model; S.sttMode = 'device'; save(); render(); break;
    case 'stt-save': { const clip = b.dataset.clip; S.sttMode ||= 'device'; S.sttModel ||= 'base'; S.modal = null; save(); render(); if (clip) transcribeClip(clip, true); else toast('Speech-to-text setting saved'); break; }
    case 'm-share': shareLink(b.dataset.url, b.dataset.title, b.dataset.text); break;
    case 'm-copy': copyText(b.dataset.url, 'Link copied'); break;
    case 'm-merge': { const n = mergeAnswers(S.modal.data); S.modal = null; save(); render(); if (n >= 0) toast(`Added ${n} answer${n === 1 ? '' : 's'}`); break; }
    case 'm-consent': { const then = S.modal?.then; S.aiConsent = true; S.modal = null; save(); render(); if (then?.action === 'find-ai') runFinder(true); if (then?.action === 'transcribe') transcribeClip(then.id, true); break; }
    case 'transcribe': transcribeClip(b.dataset.clip); break;
    case 'invite': inviteLink(p.id).then(url => { S.modal = { kind: 'invite', pid: p.id, url }; save(); render(); }); break;
    case 'qr': reportLink().then(url => { S.modal = { kind: 'qr', url }; render(); }); break;
    case 'ask-add': { const v = $('#ask-new').value.trim(); if (!v) { toast('Type a question first'); break; } (S.myQuestions ||= []).push(v); save(); render(); break; }
    case 'ask-del': S.myQuestions.splice(+b.dataset.i, 1); save(); render(); break;
    case 'invite-pick': S.modal = { kind: 'invite-pick' }; render(); break;
    case 'cloud-open': S.modal = { kind: 'cloud' }; render(); break;
    case 'cloud-start': startCloud().then(render); break;
    case 'cloud-sync': cloudSync(); break;
    case 'cloud-join': { const { id, key } = S.modal; S.sync = { id, key }; S.modal = { kind: 'cloud' }; save(); render(); cloudSync(); break; }
    case 'cloud-off': S.sync = null; S.modal = null; save(); render(); toast('Sync is off. The copy on the server stays locked.'); break;
    case 'contrib-lang': S.iv.lang = b.dataset.lang; save(); startElder(SELF, b.dataset.lang, true); break;
    case 'contrib-send': contribAnswersLink().then(url => { E = null; S.modal = { kind: 'contrib-done', url }; save(); render(); }); break;
    case 'elder-start': startElder(b.dataset.pid, S.iv.lang); break;
    case 'voices-open': S.showVoices = true; S.voiceLang = S.iv.lang !== 'en' ? S.iv.lang : 'te'; render(); window.scrollTo({ top: 0 }); break;
    case 'voices-close': S.showVoices = false; render(); break;
    case 'voice-rec': recordVoice(b.dataset.lang, b.dataset.key); break;
    case 'voice-stop': VREC?.mr.stop(); break;
    case 'voice-play': speakSeq([{ key: b.dataset.key, text: '' }], b.dataset.lang); break;
    case 'voice-del': deleteVoice(b.dataset.id); break;
    case 'voice-export': exportVoicePack(b.dataset.lang); break;
    case 'media-del': if (S.confirmMedia === b.dataset.mid) { S.confirmMedia = null; removeMedia(b.dataset.mid); } else { S.confirmMedia = b.dataset.mid; render(); } break;
    case 'anc': { const me = byId(SELF), set = new Set(me.ancestry || []); set.has(b.dataset.id) ? set.delete(b.dataset.id) : set.add(b.dataset.id); me.ancestry = [...set]; save(); render(); break; }
    case 'zoom': setZoom((S.zoom || 1) + 0.15 * +b.dataset.z); break;
    case 'zoom-fit': setZoom(fitZoom()); break;
    case 'center-me': S.sel = SELF; save(); render(); centerOn(SELF); break;
    case 'start-own': signOut(); AUTH.mode = 'create'; render(); break;
    case 'goto-doctor': setTab('doctor'); break;
    case 'add': { const np = addRelative(b.dataset.kind, p.id); S.sel = np.id; save(); render(); document.getElementById('ed-name')?.focus(); break; }
    case 'add-parent': addRelative(b.dataset.kind, p.id); save(); render(); break;
    case 'remove': if (S.confirmRemove === p.id) { const gone = removalSet(p.id); noteDeleted('p', [...gone]); noteDeleted('r', S.reports.filter(r => gone.has(r.pid)).map(r => r.id)); removeMediaOf(gone); CLIPS.filter(c => gone.has(c.pid)).forEach(c => removeClip(c.id)); removePerson(p.id); S.sel = SELF; S.confirmRemove = null; } else S.confirmRemove = p.id; save(); render(); break;
    case 'interview': S.iv.who = p.id; S.iv.step = 0; S.celebrate = null; setTab('interview'); break;
    case 'goto': S.sel = p.id; setTab('tree'); break;
    case 'goto-tree': S.celebrate = null; S.iv.step = 0; setTab('tree'); break;
    case 'see-report': S.celebrate = null; S.iv.step = 0; setTab('doctor'); break;
    case 'iv-prev': S.iv.step--; save(); render(); break;
    case 'iv-next': S.iv.step++; save(); render(); window.scrollTo({ top: 0 }); break;
    case 'iv-addsib': case 'iv-addkid': {
      const name = $('#iv-newsib').value.trim(); if (!name) { toast('Type a name first'); $('#iv-newsib').focus(); break; }
      const np = addRelative(a === 'iv-addkid' ? 'child' : 'sibling', p.id, { name, sex: $('#iv-newsex').value });
      S.iv.pick = np.id; save(); render(); toast(`${name} added to the tree`); break;
    }
    case 'iv-pick': S.iv.pick = b.dataset.id; save(); render(); break;
    case 'chk': { const c = ((p.checks ||= {})[b.dataset.k] ||= {}); c.a = c.a === b.dataset.v ? '' : b.dataset.v; p.u = Date.now(); save(); render(); if (c.a === 'yes') $('#iv-chk-note')?.focus(); break; }
    case 'iv-done': { const w = byId(S.iv.who); w.interviewed = today(); S.celebrate = w.id; S.sel = w.id; save(); render(); window.scrollTo({ top: 0 }); break; }
    case 'speak': speak(); break;
    case 'copy-summary': copyText(summaryText(), 'Summary copied'); break;
    case 'backup': copyText(btoa(unescape(encodeURIComponent(JSON.stringify({ v: 2, people: S.people.map(withoutStories), rels: S.rels, reports: S.reports })))), 'Backup code copied'); break;
    case 'restore-open': S.restoreOpen = !S.restoreOpen; render(); break;
    case 'restore': try {
      const v = JSON.parse(decodeURIComponent(escape(atob($('#restore-text').value.trim()))));
      if (!Array.isArray(v.people) || !Array.isArray(v.rels)) throw 0;
      const fam = cleanFamily(v);
      if (!fam.people.some(x => x.id === SELF)) throw 0;
      fam.people = fam.people.map(x => newPerson(x));
      fam.reports = fam.reports.map(r => ({ said: '', at: today(), by: SELF, ...r, id: r.id || uid('r') }));
      Object.assign(S, fam, { example: false, restoreOpen: false, sel: SELF }); touchFamily(); save(); render(); toast('Family restored');
    } catch { toast("That code didn't work. Paste the whole code you copied."); } break;
    case 'wipe': if (S.confirmWipe) {
      const me = byId(SELF), keep = { toured: S.toured, sttMode: S.sttMode, sttModel: S.sttModel }, lang = S.iv.lang;
      S = Object.assign(blankState({ name: me.name, born: me.born, sex: me.sex }), keep); S.iv.lang = lang;
      save(); deleteFilesOf(ACCT.id).then(render); render(); toast('Erased. Your blank family is ready.');
    } else { S.confirmWipe = true; render(); } break;
  }
});
function authAction(a, b) {
  if (a === 'auth-mode') { AUTH.mode = b.dataset.mode; AUTH.forgot = false; render(); $('#auth-name')?.focus(); }
  else if (a === 'auth-pick') { AUTH.pick = b.dataset.id; AUTH.forgot = false; AUTH.confirmDel = false; render(); $('#auth-pin')?.focus(); }
  else if (a === 'auth-forgot') { AUTH.forgot = !AUTH.forgot; AUTH.confirmDel = false; render(); }
  else if (a === 'auth-delete' && !AUTH.confirmDel) { AUTH.confirmDel = true; render(); }
  else if (a === 'auth-delete') { deleteFilesOf(AUTH.pick); const name = listAccounts().find(x => x.id === AUTH.pick)?.name; deleteAccount(AUTH.pick); AUTH = { mode: listAccounts().length ? 'signin' : 'create', pick: null, forgot: false }; render(); toast(`${name}'s profile was deleted from this device`); }
  else if (a === 'auth-guest') { startSession('guest', false); enter(GUEST); startTour(); }
  else if (a === 'auth-agree') {
    const { id, remember } = AUTH.agree, acct = listAccounts().find(x => x.id === id);
    agreeTerms(id, TERMS_VERSION); AUTH.agree = null;
    startSession(id, remember); enter({ ...acct, terms: TERMS_VERSION }); toast(`Welcome back, ${acct.name}!`);
  }
  else if (a === 'auth-agree-cancel') { AUTH.agree = null; render(); }
}
document.addEventListener('submit', e => {
  if (e.target.id !== 'auth-form') return;
  e.preventDefault();
  AUTH.mode === 'signin' ? signIn() : signUp();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id?.endsWith('-other-new')) { e.preventDefault(); e.target.closest('.other-row')?.querySelector('[data-action="other-add"]')?.click(); return; }
  if (e.key === 'Escape' && S?.modal) { S.modal = null; render(); return; }
  if (e.key === 'Tab' && S?.modal) { // keep Tab inside the pop-up
    const f = [...document.querySelectorAll('.modal button, .modal input, .modal textarea, .modal select, .modal a[href]')].filter(el => !el.disabled && el.offsetParent !== null);
    if (f.length && !e.target.closest?.('.modal')) { e.preventDefault(); f[0].focus(); }
    else if (f.length && e.shiftKey && e.target === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (f.length && !e.shiftKey && e.target === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  const node = e.target.closest?.('[data-node]');
  if (node && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
});
function speak() {
  const st = STEPS[S.iv.step], lang = LANGS.find(l => l.id === S.iv.lang) || LANGS[0], text = tr(Q[st.k], lang.id);
  if (VOICES.has(`${lang.id}|q:${st.k}`)) { speakSeq([{ key: 'q:' + st.k, text }], lang.id); return; }
  try {
    const synth = window.speechSynthesis; if (!synth) throw 0;
    const voices = synth.getVoices(), v = voices.find(v => v.lang?.toLowerCase().startsWith(lang.speech.slice(0, 2)));
    if (!v && voices.length) { toast(`This device has no ${lang.label.split(' · ').pop()} voice. Read the pronunciation line instead.`); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = lang.speech; if (v) u.voice = v; u.rate = 0.9; synth.speak(u);
  } catch { toast("Read-aloud isn't available here. Read the pronunciation line instead."); }
}

/* ---------- Start ---------- */
// Links can carry data after the #: an invite for a relative, answers coming back, a report for a doctor,
// or a family sync key. Browsers never send this part of a link to a web server.
async function boot() {
  const hash = location.hash || '';
  AUTH = { mode: listAccounts().length ? 'signin' : 'create', pick: listAccounts()[0]?.id || null, forgot: false };
  if (hash === '#terms') LEGAL_OPEN = true;
  const link = hash.match(/^#(join|answers|report|sync)=(.+)$/);
  if (link?.[1] === 'report') {
    try { ACCT = { id: 'viewer', name: 'Doctor view', guest: true, viewer: true }; S = viewerState(await unpackData(link[2])); }
    catch { ACCT = null; S = null; toast('This report link is damaged. Ask for a new one.'); }
    touchFamily(); render(); return;
  }
  if (link?.[1] === 'join') {
    try {
      const inv = await unpackData(link[2]);
      ACCT = { id: `contrib-${inv.fam}-${inv.person.id}`, name: inv.person.name || 'Relative', guest: true, contributor: true };
      S = loadFor(ACCT) || contributorState(inv); S.invite = inv; S.modal = null;
      touchFamily(); render(); return;
    } catch { ACCT = null; S = null; toast('This invite link is damaged. Ask for a new one.'); }
  }
  if (link && (link[1] === 'answers' || link[1] === 'sync')) {
    store.set('heirloom-pending', { kind: link[1], data: link[2] }, 'session');
    history.replaceState(null, '', location.pathname); // keep keys and answers out of the address bar
  }
  const signedIn = currentAccount();
  if (signedIn) {
    ACCT = signedIn;
    S = loadFor(ACCT) || (ACCT.guest ? exampleState() : blankState({ name: ACCT.name }));
    const tab = hash.slice(1);
    if (['tree', 'interview', 'risks', 'doctor'].includes(tab)) S.tab = tab;
    S.pdfBusy = false; S.celebrate = null; S.modal = null; S.micBlocked = S.capBlocked = false;
    if (!S.toured) TOUR_I = 0;
  }
  touchFamily();
  render();
  if (S) { loadFiles().then(render); handlePending(); }
  (async () => { try { if (window.claude?.use && await window.claude.use('sample')) { SAMPLE_OK = true; render(); } } catch {} })();
}
// Answers or a sync link opened before signing in are kept until a real profile is open.
async function handlePending() {
  const p = store.get('heirloom-pending', null, 'session');
  if (!p || !S || !ACCT || ACCT.guest) return;
  store.del('heirloom-pending', 'session');
  if (p.kind === 'answers') {
    try { const raw = await unpackData(p.data); if (!okId(raw?.from)) throw 0; S.modal = { kind: 'answers', data: { ...raw, ...cleanFamily(raw), name: okText(raw.name, 80), at: okDate(raw.at) || today() } }; render(); } catch { toast('That answers link is damaged.'); }
  } else if (p.kind === 'sync') {
    const [id, key] = p.data.split('.');
    if (id && key && okId(id)) { S.modal = { kind: 'cloud-join', id, key }; render(); }
  }
}
boot();
// A share link opened in a tab where the app is already running: start over so it is read.
window.addEventListener('hashchange', () => { if (/^#(join|answers|report|sync)=/.test(location.hash)) location.reload(); });

// Offline support when hosted on the web (not inside an embedded preview).
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
