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
const PERSON_FIELDS = ['id', 'name', 'sex', 'born', 'living', 'deathAge', 'cause'];
const slim = p => Object.fromEntries(PERSON_FIELDS.map(k => [k, p[k]]));

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
  if (!byId(by)) { toast("That person isn't on your family tree, so the answers can't be matched."); return -1; }
  for (const p of ans.people) {
    const mine = byId(p.id);
    if (!mine) { S.people.push(newPerson({ ...p })); continue; }
    for (const k of ['name', 'born', 'deathAge', 'cause']) if (!mine[k] && p[k]) mine[k] = p[k];
    if (mine.living === 'unknown' && p.living && p.living !== 'unknown') mine.living = p.living;
    if (mine.sex === 'U' && p.sex !== 'U') mine.sex = p.sex;
  }
  for (const r of ans.rels) {
    if (r.kind === 'parent') linkParent(r.parent, r.child, r.bio !== false);
    else linkPartners(r.a, r.b);
  }
  dropReports(r => r.by === by && ans.people.some(p => p.id === r.pid));
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
  const plain = new TextEncoder().encode(JSON.stringify({ people: S.people, rels: S.rels, reports: S.reports, familyId: S.familyId }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  return JSON.stringify({ iv: b64u(iv), ct: b64u(ct) });
}
async function decryptFamily(body) {
  const { iv, ct } = JSON.parse(body), key = await aesKey(S.sync.key);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, key, unb64u(ct))));
}
// Union of two copies of the family: nothing is deleted, blanks are filled in.
function mergeFamily(remote) {
  let added = 0;
  for (const p of remote.people || []) {
    const mine = byId(p.id);
    if (!mine) { S.people.push(p); added++; continue; }
    for (const k of ['name', 'born', 'deathAge', 'cause', 'notes', 'interviewed']) if (!mine[k] && p[k]) mine[k] = p[k];
    if (mine.living === 'unknown' && p.living !== 'unknown') mine.living = p.living;
    if (mine.sex === 'U' && p.sex !== 'U') mine.sex = p.sex;
  }
  for (const r of remote.rels || []) r.kind === 'parent' ? linkParent(r.parent, r.child, r.bio !== false) : linkPartners(r.a, r.b);
  for (const r of remote.reports || []) if (!S.reports.some(x => x.id === r.id)) { S.reports.push(r); added++; }
  touchFamily();
  return added;
}
async function cloudSync() {
  if (!cloudOn() || !S.sync) return;
  const url = `${CONFIG.apiBase}/api/family/${S.sync.id}`;
  try {
    const got = await fetch(url);
    if (got.ok) mergeFamily(await decryptFamily(await got.text()));
    else if (got.status !== 404) throw new Error(got.status);
    const put = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: await encryptFamily() });
    if (!put.ok) throw new Error(put.status);
    S.sync.last = new Date().toISOString(); save(); render(); toast('Family synced');
  } catch { toast("Couldn't reach the sync server. Your family is still saved on this phone."); }
}
function startCloud() { S.sync = { id: uid('f') + uid('').slice(1), key: b64u(crypto.getRandomValues(new Uint8Array(32))) }; save(); return cloudSync(); }
const cloudLink = () => `${appUrl()}#sync=${S.sync.id}.${S.sync.key}`;
