// Encrypted backups: one file with the whole family, plus its recordings, photos and documents,
// locked with a backup password. Keep it anywhere (email, Google Drive, a USB stick): without the
// password it is unreadable, so a lost or broken phone doesn't take the family history with it.
//
// File layout: a short text marker, a header (how the key is made), then a list of encrypted records.
// Record 0 lists the family and the files; each record after it is one file. Every record is encrypted
// separately with AES-GCM, so a big recording never has to be held in memory with everything else.
'use strict';

const BACKUP_MAGIC = 'HEIRLOOM-BACKUP-1\n';
const BACKUP_ROUNDS = 600000; // PBKDF2 rounds: slow on purpose, so guessing passwords takes a very long time
const BACKUP_DUE_DAYS = 30;   // remind people to make a new backup after this long

async function backupKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: BACKUP_ROUNDS }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
// The record's position is part of what is checked, so records can't be swapped or dropped without it failing.
const recordTag = i => new TextEncoder().encode('heirloom-backup-record-' + i);
const u32 = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };

// A strong password that is easy to write down: 4 groups of 4 letters and numbers (about 80 bits).
function suggestPassword() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(16));
  return [...r].map(x => abc[x % 32]).join('').match(/.{4}/g).join('-');
}

async function makeBackup(password, withFiles) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), key = await backupKey(password, salt);
  const files = [];
  if (withFiles) for (const store of ['clips', 'media']) {
    try { for (const f of await IDB.all(store)) if (f.acct === ACCT.id) files.push({ store, f }); } catch {}
  }
  const manifest = {
    made: new Date().toISOString(),
    family: { people: S.people, rels: S.rels, reports: S.reports, myQuestions: S.myQuestions || [] },
    files: files.map(({ store, f }) => { const { blob, url, acct, ...meta } = f; return { store, meta }; }),
  };
  const parts = [new TextEncoder().encode(BACKUP_MAGIC)];
  const header = new TextEncoder().encode(JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', rounds: BACKUP_ROUNDS, salt: toHex(salt), records: files.length + 1 }));
  parts.push(u32(header.length), header);
  const seal = async (i, data) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: recordTag(i) }, key, data));
    parts.push(u32(ct.length), iv, new Blob([ct]));
  };
  await seal(0, new TextEncoder().encode(JSON.stringify(manifest)));
  for (const [i, { f }] of files.entries()) await seal(i + 1, await f.blob.arrayBuffer());
  return new Blob(parts, { type: 'application/octet-stream' });
}

// Reads a backup file one record at a time. Throws 'not-backup' or 'password' when it can't be opened.
async function openBackup(file, password) {
  const bytes = async (at, n) => new Uint8Array(await file.slice(at, at + n).arrayBuffer());
  const num = async at => new DataView((await bytes(at, 4)).buffer).getUint32(0, true);
  if (new TextDecoder().decode(await bytes(0, BACKUP_MAGIC.length)) !== BACKUP_MAGIC) throw new Error('not-backup');
  let at = BACKUP_MAGIC.length;
  const hLen = await num(at); at += 4;
  if (hLen > 4096) throw new Error('not-backup');
  const header = JSON.parse(new TextDecoder().decode(await bytes(at, hLen))); at += hLen;
  if (header.v !== 1 || !/^[0-9a-f]{32}$/.test(header.salt) || header.rounds !== BACKUP_ROUNDS) throw new Error('not-backup');
  const key = await backupKey(password, new Uint8Array(header.salt.match(/../g).map(h => parseInt(h, 16))));
  const records = [];
  for (let i = 0; i < header.records; i++) {
    const len = await num(at), iv = await bytes(at + 4, 12);
    if (at + 16 + len > file.size) throw new Error('not-backup'); // cut short
    const ct = await bytes(at + 16, len); at += 16 + len;
    try { records.push(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: recordTag(i) }, key, ct)); }
    catch { throw new Error(i ? 'not-backup' : 'password'); } // the first record failing almost always means a wrong password
  }
  const manifest = JSON.parse(new TextDecoder().decode(records[0]));
  return { manifest, blobs: records.slice(1) };
}

// Replace the open family with the backup's. Everything is checked the same way as data from a link.
async function restoreBackup({ manifest, blobs }) {
  const raw = manifest.family || {}, fam = cleanFamily(raw);
  if (!fam.people.some(x => x.id === SELF)) throw new Error('not-backup');
  fam.people = fam.people.map(x => {
    const p = newPerson(x), src = raw.people.find(r => r?.id === x.id);
    // Family story notes: plain text keyed by story id.
    if (src?.stories && typeof src.stories === 'object') for (const [k, v] of Object.entries(src.stories)) if (STORY[k] && typeof v === 'string') (p.stories ||= {})[k] = v.slice(0, 20000);
    return p;
  });
  fam.reports = fam.reports.map(r => ({ said: '', at: today(), by: SELF, ...r, id: r.id || uid('r') }));
  const myQuestions = Array.isArray(raw.myQuestions) ? raw.myQuestions.filter(q => typeof q === 'string').map(q => q.slice(0, 500)).slice(0, 100) : [];
  await deleteFilesOf(ACCT.id);
  const ids = new Set(fam.people.map(p => p.id));
  for (const [i, { store, meta }] of (manifest.files || []).entries()) {
    if (!['clips', 'media'].includes(store) || !blobs[i] || !ids.has(meta?.pid)) continue;
    const type = typeof meta.type === 'string' && /^[\w.+-]+\/[\w.+-]+$/.test(meta.type) ? meta.type : 'application/octet-stream';
    const rec = store === 'clips'
      ? { id: 'clip-' + uid('r'), pid: meta.pid, step: typeof meta.step === 'number' || /^story:[\w-]{1,40}$/.test(meta.step) ? meta.step : 0, created: +meta.created || Date.now(), secs: +meta.secs || null, type }
      : { id: uid('m'), pid: meta.pid, kind: meta.kind === 'photo' ? 'photo' : 'doc', name: String(meta.name || 'Document').slice(0, 200), created: +meta.created || Date.now(), type };
    try { await IDB.put({ ...rec, acct: ACCT.id, blob: new Blob([blobs[i]], { type }) }, store); } catch {}
  }
  Object.assign(S, fam, { myQuestions, example: false, restoreOpen: false, sel: SELF, lastBackup: Date.now() });
  touchFamily(); save(); await loadFiles();
}

/* ---------- Screens ---------- */
const backupDue = () => !S.example && !ACCT?.guest && !S.sync && S.reports.length >= 1 && Date.now() - (S.lastBackup || 0) > BACKUP_DUE_DAYS * 864e5;
// The reminder on the family tree page when there's something worth saving and no recent backup.
function backupNudgeHTML() {
  if (!backupDue()) return '';
  return `<section class="card nudge" aria-label="Backup reminder">
    <div><b>${S.lastBackup ? `Your last backup was ${Math.floor((Date.now() - S.lastBackup) / 864e5)} days ago.` : 'Your family is only on this phone.'}</b>
    <p class="small muted">If this phone is lost or broken, the answers go with it. Save an encrypted backup and keep it somewhere safe, like your email.</p></div>
    <button class="btn primary sm" data-action="bk-open">Save a backup</button></section>`;
}
function backupModalHTML(m) {
  if (m.kind === 'backup') return `<h2>Save an encrypted backup</h2>
    <p class="small">One file with your whole family${m.files ? ', recordings, photos and documents' : ''}. It's locked with a password, so you can keep it anywhere: email it to yourself, or save it to Google Drive or iCloud. Without the password, nobody can read it, not even us.</p>
    <label class="f">Backup password (at least 8 characters)<input id="bk-pass" type="text" autocomplete="new-password" autocapitalize="off" spellcheck="false" value="${esc(m.pass || '')}"></label>
    <div class="row"><button class="btn sm" data-action="bk-suggest">Make one for me</button></div>
    <p class="small muted"><b>Write the password down.</b> It can't be recovered, and the backup can't be opened without it.</p>
    <label class="check"><input type="checkbox" id="bk-files" ${m.files ? 'checked' : ''}> Include recordings, photos and documents</label>
    <div class="row"><button class="btn primary" data-action="bk-save" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Locking your backup…' : 'Save backup file'}</button></div>`;
  if (m.kind === 'restore') return `<h2>Restore a backup</h2>
    <p class="small">Choose your Heirloom backup file and type its password. <b>This replaces the family on this profile</b> with the one in the backup.</p>
    <label class="btn" for="bk-file">${m.fileName ? 'File: ' + esc(m.fileName) : 'Choose backup file'}</label><input type="file" id="bk-file" class="sr" accept=".heirloom,application/octet-stream">
    <label class="f">Backup password<input id="bk-rpass" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <div class="row"><button class="btn primary" data-action="bk-restore" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Unlocking…' : 'Restore'}</button></div>
    <details class="small"><summary>I have an old backup code instead</summary>
      <p class="muted">Backup codes from older versions of the app can still be restored here.</p>
      <label class="f">Paste your backup code<textarea id="restore-text"></textarea></label><div class="row"><button class="btn" data-action="restore">Restore from code</button></div></details>`;
  return '';
}

/* ---------- Events ---------- */
let BACKUP_FILE = null;
function backupAction(a) {
  switch (a) {
    case 'bk-open': S.modal = { kind: 'backup', files: true, pass: '' }; render(); return true;
    case 'bk-restore-open': BACKUP_FILE = null; S.modal = { kind: 'restore' }; render(); return true;
    case 'bk-suggest': S.modal.pass = suggestPassword(); S.modal.files = $('#bk-files')?.checked; render(); return true;
    case 'bk-save': {
      const m = S.modal, pass = $('#bk-pass').value;
      if (pass.length < 8) { toast('Use a password with at least 8 characters.'); return true; }
      m.pass = pass; m.files = $('#bk-files').checked; m.busy = true; render();
      makeBackup(pass, m.files).then(async blob => {
        const d = new Date().toISOString().slice(0, 10);
        await saveFile(`heirloom-backup-${(nameOf(byId(SELF)) || 'family').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${d}.heirloom`, blob);
        S.lastBackup = Date.now(); S.modal = null; save(); render();
      }).catch(() => { m.busy = false; render(); toast("Couldn't make the backup. Try again without recordings."); });
      return true;
    }
    case 'bk-restore': {
      const m = S.modal, pass = $('#bk-rpass').value;
      if (!BACKUP_FILE) { toast('Choose your backup file first.'); return true; }
      if (!pass) { toast('Type the backup password.'); return true; }
      m.busy = true; render();
      openBackup(BACKUP_FILE, pass).then(restoreBackup).then(() => { BACKUP_FILE = null; S.modal = null; render(); toast('Family restored from your backup'); })
        .catch(e => { m.busy = false; render(); toast(e?.message === 'password' ? "That password didn't open this backup." : "That file isn't a Heirloom backup, or it's damaged."); });
      return true;
    }
  }
  return false;
}
document.addEventListener('change', e => {
  if (e.target.id !== 'bk-file') return;
  BACKUP_FILE = e.target.files?.[0] || null;
  if (S?.modal?.kind === 'restore') { S.modal.fileName = BACKUP_FILE?.name; render(); }
});
