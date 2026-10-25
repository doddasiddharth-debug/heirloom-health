// Photos and documents for each relative (old prescriptions, lab reports, a death certificate).
// Files stay on this device in IndexedDB. Photos are shrunk before saving so storage stays small.
'use strict';

let MEDIA = [];
async function loadMedia() {
  try { MEDIA = (await IDB.all('media')).filter(m => m.acct === ACCT?.id).map(m => ({ ...m, url: URL.createObjectURL(m.blob) })); }
  catch { MEDIA = []; }
}
const photoOf = pid => MEDIA.find(m => m.pid === pid && m.kind === 'photo');
const docsOf = pid => MEDIA.filter(m => m.pid === pid && m.kind === 'doc').sort((a, b) => a.created - b.created);

// Scale an image down so its longest side is at most `max` pixels.
function shrinkImage(file, max, quality = 0.85) {
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => res(b || file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(file); };
    img.src = url;
  });
}
async function addMedia(pid, file, kind) {
  if (kind === 'photo' && !file.type.startsWith('image/')) { toast('Choose a photo (an image file).'); return; }
  if (file.size > 25e6) { toast('That file is over 25 MB. Try a smaller one.'); return; }
  const blob = file.type.startsWith('image/') ? await shrinkImage(file, kind === 'photo' ? 512 : 1800) : file;
  if (kind === 'photo') for (const m of MEDIA.filter(m => m.pid === pid && m.kind === 'photo')) await removeMedia(m.id, true);
  const rec = { id: uid('m'), acct: ACCT.id, pid, kind, name: file.name || (kind === 'photo' ? 'Photo' : 'Document'), type: blob.type || file.type, blob, created: Date.now() };
  try { await IDB.put(rec, 'media'); MEDIA.push({ ...rec, url: URL.createObjectURL(blob) }); toast(kind === 'photo' ? 'Photo added' : 'Document saved on this device'); }
  catch { toast("Couldn't save that file. This browser may be blocking storage."); }
  render();
}
async function removeMedia(id, quiet) {
  try { await IDB.del(id, 'media'); } catch {}
  const m = MEDIA.find(x => x.id === id);
  if (m) URL.revokeObjectURL(m.url);
  MEDIA = MEDIA.filter(x => x.id !== id);
  if (!quiet) render();
}
async function removeMediaOf(pids) { for (const m of MEDIA.filter(m => pids.has(m.pid))) await removeMedia(m.id, true); }

function mediaHTML(p) {
  const photo = photoOf(p.id), docs = docsOf(p.id);
  return `<div style="display:grid;gap:10px">
    <h3>Photo and documents</h3>
    <div class="row">
      <label class="btn sm" for="media-photo">${photo ? 'Change photo' : 'Add a photo'}</label>
      <input type="file" id="media-photo" class="sr" accept="image/*" data-pid="${p.id}" data-media="photo">
      ${photo ? `<button class="link danger" data-action="media-del" data-mid="${photo.id}">${S.confirmMedia === photo.id ? 'Tap again to remove' : 'Remove photo'}</button>` : ''}
    </div>
    ${docs.length ? `<ul class="docs">${docs.map(d => `<li>
      ${d.type.startsWith('image/') ? `<img src="${d.url}" alt="">` : '<span class="doc-ic" aria-hidden="true">PDF</span>'}
      <span class="doc-name">${esc(d.name)}<br><span class="small muted">${new Date(d.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></span>
      <a class="link" href="${d.url}" target="_blank" rel="noopener">Open</a>
      <button class="link danger" data-action="media-del" data-mid="${d.id}">${S.confirmMedia === d.id ? 'Tap again' : 'Remove'}</button></li>`).join('')}</ul>` : ''}
    <div class="row">
      <label class="btn sm" for="media-doc">+ Add a document</label>
      <input type="file" id="media-doc" class="sr" accept="image/*,application/pdf" data-pid="${p.id}" data-media="doc">
      <span class="small muted">Old prescriptions, lab reports, a hospital letter. Photos of paper work too.</span>
    </div>
  </div>`;
}
