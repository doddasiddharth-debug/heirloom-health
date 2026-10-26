// Family sharing.
//
// 1. Invite links (work today, no server): the teen sends a relative a link. The relative answers on their
//    own phone in large tap-to-answer mode, then sends back an "answers" link. Opening it merges the answers.
//    Everything travels inside the link (after the #), which browsers never send to a web server.
// 2. Cloud sync (optional, needs the server in /server): the family is encrypted on the phone with a key that
//    only lives in the share link, so the server stores data it cannot read.
'use strict';

/* ---------- Packing data into links ---------- */
const b64u = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = str => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function packData(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if ('CompressionStream' in window) {
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'z' + b64u(new Uint8Array(out));
  }
  return 'j' + b64u(bytes);
}
async function unpackData(str) {
  const bytes = unb64u(str.slice(1));
  if (str[0] === 'z') return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
  return JSON.parse(new TextDecoder().decode(bytes));
}
const appUrl = () => location.origin + location.pathname;
const PERSON_FIELDS = ['id', 'name', 'sex', 'born', 'living', 'deathAge', 'cause', 'checks'];
const slim = p => Object.fromEntries(PERSON_FIELDS.map(k => [k, p[k]]));

/* ---------- Checking data that arrives in a link ---------- */
// Links and synced copies can be edited by anyone, so only well-formed values are let in. Ids end up
// inside the page's HTML, and an unknown illness would break every screen.
const ID_OK = /^[\w-]{1,40}$/;
const okId = v => typeof v === 'string' && ID_OK.test(v);
const okNum = (v, digits) => (typeof v === 'number' || typeof v === 'string') && new RegExp(`^\\d{1,${digits}}$`).test(String(v)) ? String(v) : '';
const okText = (v, max) => typeof v === 'string' ? v.slice(0, max) : '';
const okDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
function cleanPerson(p) {
  if (!p || !okId(p.id)) return null;
  const out = {
    id: p.id, name: okText(p.name, 80), sex: ['M', 'F', 'U'].includes(p.sex) ? p.sex : 'U', born: okNum(p.born, 4),
    living: ['yes', 'no', 'unknown'].includes(p.living) ? p.living : 'unknown', deathAge: okNum(p.deathAge, 3), cause: okText(p.cause, 120),
    notes: okText(p.notes, 4000), sibNotes: okText(p.sibNotes, 4000), kidNotes: okText(p.kidNotes, 4000), parentNotes: okText(p.parentNotes, 4000), interviewed: okDate(p.interviewed),
    transcripts: {}, checks: {},
  };
  if (p.checks && typeof p.checks === 'object') for (const [k, c] of Object.entries(p.checks)) if (CHECK[k] && c && typeof c === 'object') out.checks[k] = { a: ['yes', 'no', 'unknown'].includes(c.a) ? c.a : '', note: okText(c.note, 300) };
  if (p.transcripts && typeof p.transcripts === 'object') for (const [k, v] of Object.entries(p.transcripts)) if (/^\w{1,40}$/.test(k) && typeof v === 'string') out.transcripts[k] = v.slice(0, 20000);
  if (Array.isArray(p.ancestry)) out.ancestry = p.ancestry.filter(a => ANCESTRIES.some(x => x.id === a));
  if (typeof p.u === 'number') out.u = p.u;
  return out;
}
function cleanReport(r) {
  if (!r || !okId(r.pid) || !COND[r.cond]) return null;
  const type = r.cond === 'other' ? okText(r.type, 60).trim() : subtypeOf(r.cond, r.type) || (r.cond === 'cancer' && r.type === 'other') ? r.type : '';
  const out = { pid: r.pid, cond: r.cond, type, age: okNum(r.age, 3) };
  if (okId(r.id)) out.id = r.id;
  if (okId(r.by)) out.by = r.by;
  if (r.said != null) out.said = okText(r.said, 500);
  if (r.at != null) out.at = okDate(r.at);
  if (typeof r.u === 'number') out.u = r.u;
  return out;
}
function cleanRel(r) {
  if (r?.kind === 'parent' && okId(r.parent) && okId(r.child) && r.parent !== r.child) return { kind: 'parent', parent: r.parent, child: r.child, bio: r.bio !== false };
  if (r?.kind === 'partner' && okId(r.a) && okId(r.b) && r.a !== r.b) return { kind: 'partner', a: r.a, b: r.b };
  return null;
}
// Returns the family with bad entries dropped, and links or answers about unknown people removed.
function cleanFamily(d) {
  const arr = v => Array.isArray(v) ? v : [];
  const people = arr(d?.people).map(cleanPerson).filter(Boolean).filter((p, i, a) => a.findIndex(q => q.id === p.id) === i);
  const ids = new Set(people.map(p => p.id));
  const rels = arr(d?.rels).map(cleanRel).filter(r => r && (r.kind === 'parent' ? ids.has(r.parent) && ids.has(r.child) : ids.has(r.a) && ids.has(r.b)));
  const reports = arr(d?.reports).map(cleanReport).filter(r => r && ids.has(r.pid));
  return { people, rels, reports };
}

/* ---------- Invites ---------- */
function familyId() { return S.familyId ||= uid('fam'); }
async function inviteLink(pid) {
  const P = byId(pid), mom = motherOf(pid, false), dad = fatherOf(pid, false);
  const data = { v: 1, kind: 'invite', fam: familyId(), from: nameOf(byId(SELF)), lang: S.iv.lang, person: slim(P), mother: mom ? slim(mom) : null, father: dad ? slim(dad) : null };
  return `${appUrl()}#join=${await packData(data)}`;
}
// Share sheet on phones, otherwise copy.
async function shareLink(url, title, text) {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(url); toast('Link copied. Paste it into a message.'); }
  catch { toast('Select the link and copy it.'); }
}

/* ---------- The relative's side: contributor mode ---------- */
// A temporary family made from the invite: just the relative and their parents. Nothing is mixed into anyone's profile.
function contributorState(inv) {
  for (const k of ['person', 'mother', 'father']) inv[k] = inv[k] && cleanPerson(inv[k]);
  if (!inv.person) throw new Error('bad invite');
  if (!LANGS.some(l => l.id === inv.lang)) inv.lang = 'en';
  inv.from = okText(inv.from, 80);
  const people = [newPerson({ ...inv.person, transcripts: {} })], rels = [];
  for (const [role, p] of [['mother', inv.mother], ['father', inv.father]]) {
    if (!p) continue;
    people.push(newPerson({ ...p }));
    rels.push({ kind: 'parent', parent: p.id, child: inv.person.id, bio: true });
  }
  if (inv.mother && inv.father) rels.push({ kind: 'partner', a: inv.father.id, b: inv.mother.id });
  // The kinship code expects "you" to exist; the relative answering is "you" here.
  people[0] = { ...people[0], id: SELF, realId: inv.person.id };
  rels.forEach(r => { if (r.child === inv.person.id) r.child = SELF; });
  return { v: 2, example: false, people, rels, reports: [], sel: SELF, hl: 'any', tab: 'interview', iv: { who: SELF, step: 0, lang: inv.lang || 'en', roman: true }, invite: inv };
}
function renderContribStart() {
  const inv = S.invite;
  return `<div class="auth"><div class="auth-card" style="max-width:640px">
    <div class="auth-head">${mascot(96)}<h1>Hello, ${esc(inv.person.name || 'there')}!</h1>
      <p class="muted">${esc(inv.from || 'Your family')} is putting together a family health history for their doctor and asked for your help. It takes about five minutes, and you can skip anything.</p></div>
    <span class="lbl">Choose your language</span>
    <div class="lang-grid">${LANGS.map(l => `<button class="lang-btn" data-action="contrib-lang" data-lang="${l.id}"><span ${langAttrs(l.id)}>${esc(l.label.split(' · ')[0])}</span><small>${esc(l.label.split(' · ').pop())}</small></button>`).join('')}</div>
    <p class="fine">Your answers stay on this phone until you choose to send them back. By continuing you agree to the ${termsLink()}.</p>
  </div></div>`;
}
async function contribAnswersLink() {
  const inv = S.invite, realId = inv.person.id;
  const mapId = id => id === SELF ? realId : id;
  const people = S.people.map(p => ({ ...slim(p), id: mapId(p.id) }));
  const rels = S.rels.map(r => r.kind === 'parent' ? { ...r, child: mapId(r.child), parent: mapId(r.parent) } : { ...r, a: mapId(r.a), b: mapId(r.b) });
  const reports = S.reports.map(r => ({ pid: mapId(r.pid), cond: r.cond, type: r.type, age: r.age }));
  const data = { v: 1, kind: 'answers', fam: inv.fam, from: realId, name: inv.person.name, at: today(), people, rels, reports };
  return `${appUrl()}#answers=${await packData(data)}`;
}

/* ---------- The teen's side: merging answers ---------- */
// Add people and links the family doesn't have yet, fill in blank details, and replace this relative's
// earlier answers with the new ones. Returns how many answers were added.
function mergeAnswers(ans) {
  const by = ans.from;
  if (!okId(by)) { toast("That answers link is damaged."); return -1; }
  Object.assign(ans, cleanFamily(ans));
  if (!byId(by)) { toast("That person isn't on your family tree, so the answers can't be matched."); return -1; }
  for (const p of ans.people) {
    const mine = byId(p.id);
    if (!mine) { S.people.push(newPerson({ ...p })); continue; }
    // What a relative says about themselves replaces your guess; about others it only fills blanks.
    const own = p.id === by;
    for (const k of ['name', 'born', 'deathAge', 'cause']) if (p[k] && (own || !mine[k])) mine[k] = p[k];
    if (p.living && p.living !== 'unknown' && (own || mine.living === 'unknown')) mine.living = p.living;
    if (p.sex !== 'U' && (own || mine.sex === 'U')) mine.sex = p.sex;
    for (const [k, c] of Object.entries(p.checks || {})) if (c.a && (own || !mine.checks?.[k]?.a)) (mine.checks ||= {})[k] = c;
    mine.u = Date.now();
  }
  for (const r of ans.rels) {
    if (r.kind === 'parent') linkParent(r.parent, r.child, r.bio !== false);
    else linkPartners(r.a, r.b);
  }
  const old = r => r.by === by && ans.people.some(p => p.id === r.pid);
  noteDeleted('r', S.reports.filter(old).map(r => r.id));
  dropReports(old);
  for (const r of ans.reports) addReport(r.pid, r.cond, r.type, by, { age: r.age || '', at: ans.at });
  byId(by).interviewed = ans.at || today();
  touchFamily();
  return ans.reports.length;
}

/* ---------- Optional cloud sync (end-to-end encrypted) ---------- */
const cloudOn = () => !!(window.CONFIG?.apiBase);
async function aesKey(raw) { return crypto.subtle.importKey('raw', unb64u(raw), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function encryptFamily() {
  const key = await aesKey(S.sync.key), iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({ people: S.people, rels: S.rels, reports: S.reports, familyId: S.familyId, deleted: S.deleted || {} }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  return JSON.stringify({ iv: b64u(iv), ct: b64u(ct) });
}
async function decryptFamily(body) {
  const { iv, ct } = JSON.parse(body), key = await aesKey(S.sync.key);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, key, unb64u(ct))));
}
// Remember what was deleted, so syncing doesn't bring it back from another phone.
function noteDeleted(kind, ids) {
  const d = (S.deleted ||= { p: {}, r: {} }), now = Date.now();
  for (const id of ids) if (id) d[kind][id] = now;
}
// Combine two copies of the family: deletions win, a newer edit of a person wins, and blanks are filled in.
function mergeFamily(remote) {
  const del = { p: { ...S.deleted?.p }, r: { ...S.deleted?.r } };
  for (const k of ['p', 'r']) for (const [id, t] of Object.entries(remote?.deleted?.[k] || {})) if (okId(id) && typeof t === 'number') del[k][id] = Math.max(del[k][id] || 0, t);
  const fam = cleanFamily(remote);
  let added = 0;
  for (const p of fam.people) {
    if (del.p[p.id]) continue;
    const mine = byId(p.id);
    if (!mine) { S.people.push(newPerson(p)); added++; continue; }
    if ((p.u || 0) > (mine.u || 0)) Object.assign(mine, p, { transcripts: { ...mine.transcripts, ...p.transcripts } });
    else {
      for (const k of ['name', 'born', 'deathAge', 'cause', 'notes', 'interviewed']) if (!mine[k] && p[k]) mine[k] = p[k];
      if (mine.living === 'unknown' && p.living !== 'unknown') mine.living = p.living;
      if (mine.sex === 'U' && p.sex !== 'U') mine.sex = p.sex;
      for (const [k, c] of Object.entries(p.checks)) if (c.a && !mine.checks?.[k]?.a) (mine.checks ||= {})[k] = c;
    }
  }
  for (const r of fam.rels) r.kind === 'parent' ? linkParent(r.parent, r.child, r.bio !== false) : linkPartners(r.a, r.b);
  for (const r of fam.reports) if (r.id && !del.r[r.id] && !S.reports.some(x => x.id === r.id)) { S.reports.push({ said: '', at: '', by: '', ...r }); added++; }
  // Apply deletions made on the other phone.
  const goneP = new Set(Object.keys(del.p).filter(id => id !== SELF));
  S.people = S.people.filter(p => !goneP.has(p.id));
  S.rels = S.rels.filter(r => r.kind === 'parent' ? !goneP.has(r.parent) && !goneP.has(r.child) : !goneP.has(r.a) && !goneP.has(r.b));
  S.reports = S.reports.filter(r => !del.r[r.id] && !goneP.has(r.pid));
  S.deleted = del;
  if (!byId(S.sel)) S.sel = SELF;
  touchFamily();
  return added;
}
async function cloudSync() {
  if (!cloudOn() || !S.sync) return;
  const url = `${CONFIG.apiBase}/api/family/${S.sync.id}`;
  try {
    const got = await fetch(url);
    if (got.ok) {
      let remote;
      try { remote = await decryptFamily(await got.text()); }
      catch { toast("The synced copy couldn't be unlocked with this link. Ask for the link again."); return; }
      mergeFamily(remote);
    } else if (got.status !== 404) throw new Error(got.status);
    const put = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: await encryptFamily() });
    if (!put.ok) throw new Error(put.status);
    S.sync.last = new Date().toISOString(); save(); render(); toast('Family synced');
  } catch { toast("Couldn't reach the sync server. Your family is still saved on this phone."); }
}
function startCloud() { S.sync = { id: b64u(crypto.getRandomValues(new Uint8Array(16))), key: b64u(crypto.getRandomValues(new Uint8Array(32))) }; save(); return cloudSync(); }
const cloudLink = () => `${appUrl()}#sync=${S.sync.id}.${S.sync.key}`;
