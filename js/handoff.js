// Doctor hand-off: a checklist of questions for the next checkup, and a QR code the doctor scans to open
// a read-only copy of the report. Also the pop-up panels used by sharing.
'use strict';

/* ---------- QR codes (vendor/qrcode.js, MIT) ---------- */
function qrSVG(text) {
  if (typeof qrcode !== 'function') return null;
  try { const qr = qrcode(0, 'L'); qr.addData(text, 'Byte'); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true }); }
  catch { return null; } // too much data for one QR code
}

/* ---------- Questions for my next checkup ---------- */
const ASK = {
  'Start colon cancer screening early': 'When should I start colon cancer screening, given my family?',
  'Start colon cancer screening at 40': 'Should I start colon cancer screening at 40?',
  'Ask about genetic counseling for inherited breast and ovarian cancer': 'Should I see a genetic counselor about breast and ovarian cancer in my family?',
  'Ask about genetic counseling for Lynch syndrome': 'Should our family be checked for Lynch syndrome?',
  'Several relatives with Lynch-related cancers': 'Do the colon and uterine cancers in my family need a closer look?',
  'Ask about genetic testing because of ovarian or pancreatic cancer': 'Is genetic testing right for our family?',
  'Get a cholesterol test now': 'Can I get a cholesterol test now?',
  'Early heart disease in a parent or sibling': 'Should early heart disease in my family change my care?',
  'Ask about testing for type 2 diabetes': 'Should I be tested for type 2 diabetes?',
  'Talk about prostate cancer screening earlier': 'When should I start talking about prostate cancer screening?',
  'South Asian ancestry and heart disease': 'Does my South Asian ancestry change my heart checkups?',
  'Ancestry and type 2 diabetes': 'Should my ancestry change when I am tested for diabetes?',
  'Thalassemia and sickle cell trait': 'Should I get a blood test for thalassemia or sickle cell trait?',
  'Ashkenazi Jewish ancestry and BRCA': 'Should I have a BRCA risk assessment?',
  'Ancestry and prostate cancer': 'When should I start talking about prostate cancer screening?',
  'Colon polyps in a parent or sibling': 'Should polyps in my family change when I start colon cancer screening?',
  'Ask about checking for inherited heart conditions': 'Should I have an ECG or heart ultrasound because of heart conditions or sudden deaths in my family?',
  'Ask about screening for type 1 diabetes': 'Should I have a blood test for type 1 diabetes antibodies?',
  'Get a copy of the genetic test result': 'My relative had a genetic test. Should I be tested for the same gene change?',
  'Parents related by blood': 'My parents (or grandparents) are related by blood. Does that change anything for me?',
  'Pregnancy losses, birth differences or childhood conditions': 'Could the pregnancy losses or childhood conditions in my family be genetic?',
  'Tell every surgeon and dentist about the anesthesia reaction': 'Should my records say that a relative had a serious reaction to anesthesia?',
  'Get a hepatitis B blood test': 'Can I have a hepatitis B blood test, and am I vaccinated?',
  'Ask about a celiac blood test': 'Should I have a celiac blood test?',
  'Blood clots in a parent or sibling': 'Does the blood clot in my family matter for birth control or surgery?',
  'Other conditions in the family': 'Do any of the other conditions in my family run in families or change my care?',
  'Polycystic kidney disease in a parent or sibling': 'When should I be checked for polycystic kidney disease?',
};
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function checklist() {
  const seen = new Set(), items = [];
  for (const c of guidelineCards()) {
    const q = ASK[c.title];
    if (q && !seen.has(q)) { seen.add(q); items.push({ id: slug(q), q, level: c.level }); }
  }
  for (const [i, q] of (S.myQuestions || []).entries()) items.push({ id: 'mine-' + i, q, mine: i });
  return items;
}
function checklistHTML(readOnly = false) {
  const items = checklist(), asked = S.asked || {};
  return `<section class="card checklist-card" style="display:grid;gap:12px">
    <div><h2>Questions for my next checkup</h2><p class="small muted">Made from your family's results. ${readOnly ? '' : 'Tick them off at the appointment, or add your own.'}</p></div>
    ${items.length ? `<ul class="asks-list">${items.map(it => `<li class="${asked[it.id] ? 'done' : ''}">
      <label class="check"><input type="checkbox" data-ask="${it.id}" ${asked[it.id] ? 'checked' : ''} ${readOnly ? 'disabled' : ''}><span>${esc(it.q)}</span></label>
      ${it.mine != null && !readOnly ? `<button class="link danger" data-action="ask-del" data-i="${it.mine}">Remove</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted small">No questions yet. Interview more relatives, or add your own.</p>'}
    ${readOnly ? '' : `<div class="row"><input type="text" id="ask-new" placeholder="Add your own question" style="flex:1;min-width:200px"><button class="btn sm" data-action="ask-add">Add</button></div>`}
  </section>`;
}

/* ---------- Read-only report for the doctor ---------- */
async function reportLink() {
  const me = byId(SELF);
  const data = {
    v: 1, kind: 'report', at: today(),
    people: S.people.map(p => ({ ...slim(p), ...(p.id === SELF ? { ancestry: p.ancestry || [] } : {}) })),
    rels: S.rels, reports: S.reports.map(r => ({ id: r.id, pid: r.pid, cond: r.cond, type: r.type, age: r.age, by: r.by })),
    interviewed: S.people.filter(p => p.interviewed).map(p => [p.id, p.interviewed]),
    questions: checklist().map(it => it.q), from: nameOf(me),
  };
  return `${appUrl()}#report=${await packData(data)}`;
}
function viewerState(rep) {
  const clean = cleanFamily(rep);
  const people = clean.people.map(p => newPerson({ ...p }));
  rep = { ...rep, rels: clean.rels, reports: clean.reports.map(r => ({ by: '', ...r })), at: okDate(rep.at) || today(), from: okText(rep.from, 80), questions: (Array.isArray(rep.questions) ? rep.questions : []).filter(q => typeof q === 'string').slice(0, 40).map(q => q.slice(0, 300)) };
  for (const [id, d] of rep.interviewed || []) { const p = people.find(x => x.id === id); if (p) p.interviewed = d; }
  return { v: 2, example: false, people, rels: rep.rels, reports: rep.reports.map(r => ({ said: '', at: rep.at, ...r })), sel: SELF, hl: 'any', tab: 'doctor', iv: { who: '', step: 0, lang: 'en' }, myQuestions: [], viewerQuestions: rep.questions || [], sharedAt: rep.at, sharedBy: rep.from };
}

/* ---------- Pop-up panels ---------- */
function renderModal() {
  const m = S?.modal;
  if (!m) return '';
  let body = '';
  const linkBox = url => `<div class="linkbox"><input type="text" readonly value="${esc(url)}" aria-label="Link" onclick="this.select()"></div>`;
  const shareBtns = (url, title, text) => `<div class="row">
      <button class="btn primary" data-action="m-share" data-url="${esc(url)}" data-title="${esc(title)}" data-text="${esc(text)}">Share link</button>
      <button class="btn" data-action="m-copy" data-url="${esc(url)}">Copy link</button>
      <a class="btn" href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}" target="_blank" rel="noopener">WhatsApp</a></div>`;
  if (m.kind === 'invite') {
    const P = byId(m.pid), qr = qrSVG(m.url);
    body = `<h2>Ask ${esc(nameOf(P))} to answer on their own phone</h2>
      <p class="small muted">They open the link, pick their language, and tap answers in large print. No sign-up. When they finish, they send a link back to you, and opening it adds their answers to your tree.</p>
      ${qr ? `<div class="qr">${qr}<span class="small muted">Or let them scan this with their phone camera</span></div>` : ''}
      ${linkBox(m.url)}${shareBtns(m.url, 'Family health history', `Hi ${P.name || ''}! Can you help with our family health history? It takes 5 minutes:`)}`;
  } else if (m.kind === 'qr') {
    const qr = m.url && qrSVG(m.url);
    body = `<h2>Show my doctor</h2>
      ${qr ? `<div class="qr big">${qr}</div><p class="small">Your doctor scans this with their phone camera to open a read-only copy of this report.</p>`
        : `<p class="small">This family is too large for one QR code. Send your doctor the link instead, or bring the PDF.</p>`}
      ${linkBox(m.url)}<div class="row"><button class="btn" data-action="m-copy" data-url="${esc(m.url)}">Copy link</button></div>
      <p class="fine">The report is packed inside the link itself and is never stored on a server. Anyone with the link can read it, so only give it to your doctor.</p>`;
  } else if (m.kind === 'answers') {
    const a = m.data, who = byId(a.from), n = a.reports.length;
    // The invite carried this family's id; answers from some other family's invite are flagged before merging.
    const otherFamily = a.fam && a.fam !== S.familyId;
    const newPeople = a.people.filter(p => !byId(p.id)).length;
    body = `<h2>${esc(a.name || nameOf(who) || 'A relative')} sent their answers</h2>
      ${otherFamily ? `<p class="small" style="color:var(--rose-dk)"><b>Check before adding:</b> these answers came from an invite that wasn't sent from this family. Only add them if you know who sent them.</p>` : ''}
      ${who ? `<p>${n} health answer${n === 1 ? '' : 's'}${newPeople ? ` and ${newPeople} new ${newPeople === 1 ? 'relative' : 'relatives'}` : ''}, from ${fmtDate(a.at)}.</p>
        <ul class="small">${a.reports.slice(0, 8).map(r => { const p = a.people.find(x => x.id === r.pid); return `<li>${esc(p?.name || 'Relative')}: ${esc(factName(r.cond, r.type))}${r.age ? ' at ' + esc(r.age) : ''}</li>`; }).join('')}${n > 8 ? `<li>and ${n - 8} more</li>` : ''}</ul>
        <div class="row"><button class="btn primary" data-action="m-merge">Add to my family</button><button class="btn" data-action="m-close">Not now</button></div>`
        : `<p>These answers are for a family that isn't open on this device. Sign in to the profile that sent the invite, then open the link again.</p><div class="row"><button class="btn" data-action="m-close">Close</button></div>`}`;
  } else if (m.kind === 'contrib-done') {
    const qr = qrSVG(m.url), L = S.iv.lang;
    body = `<h2 ${langAttrs(L)}>${esc(say(ELDER_TEXT.send_back, L))}</h2>
      <p class="small muted">Send this link back to ${esc(S.invite.from || 'your family')}, or let them scan the code from your screen.</p>
      ${qr ? `<div class="qr">${qr}</div>` : ''}${linkBox(m.url)}${shareBtns(m.url, 'My answers', 'Here are my family health answers:')}`;
  } else if (m.kind === 'ai-consent') {
    body = `<h2>Send this to the AI helper?</h2>
      <p>${m.what === 'audio' ? "This recording is sent to Heirloom's server and on to an AI speech-to-text service (Cloudflare Workers AI) to turn it into words." : "This text is sent to Heirloom's server and on to an AI service (Cloudflare Workers AI) to find the health answers in it."} The Heirloom server doesn't keep it. Nothing is saved until you confirm the answers.</p>
      <p class="small muted">Only continue if the person you interviewed is okay with this.</p>
      <div class="row"><button class="btn primary" data-action="m-consent">Allow</button><button class="btn" data-action="m-close">Cancel</button></div>`;
  } else if (m.kind === 'feedback') body = feedbackHTML(m);
  else if (m.kind === 'menu') body = menuHTML();
  else if (m.kind === 'stt') body = sttChooserHTML(m.clip);
  else if (m.kind === 'invite-pick') {
    // Everyone who could answer: living (or unknown) relatives, closest blood relatives first.
    const rank = p => (kin(p.id).blood ? 0 : 100) + (kin(p.id).degree || 9);
    const list = S.people.filter(p => p.id !== SELF && p.living !== 'no')
      .sort((a, b) => rank(a) - rank(b));
    body = `<h2>Invite a relative to answer</h2>
      <p class="small muted">Pick who to send a link to. They open it on their own phone, choose their language, and tap their answers in large print. No sign-up. When they finish, they send a link back and their answers are added to your tree.</p>
      ${list.length ? `<ul class="invite-list">${list.map(p => `<li><span><b>${esc(nameOf(p))}</b><br><span class="small muted">${esc(relOf(p))}${p.interviewed ? ' · interviewed' : ''}</span></span>
        <button class="btn sm primary" data-action="invite" data-pid="${p.id}">Send link</button></li>`).join('')}</ul>`
        : '<p class="small">Add relatives to your family tree first, then invite them here.</p>'}
      ${ACCT?.guest ? '<p class="fine">This is the example family. To add real answers, create your own profile first.</p>' : ''}`;
  } else if (m.kind === 'cloud-join') {
    const empty = S.people.length <= 7 && !S.reports.length;
    body = `<h2>Open a shared family?</h2>
      <p class="small">This link syncs a family with this profile. Everything in it is combined with the family that's open now${S.sync ? ', and this profile stops syncing with its current link' : ''}.</p>
      ${empty ? '' : `<p class="small"><b>This profile already has a family.</b> Only continue if the link is for this same family. For a different family, create a new profile first, then open the link again.</p>`}
      <div class="row"><button class="btn primary" data-action="cloud-join">Combine and sync</button><button class="btn" data-action="m-close">Cancel</button></div>`;
  } else if (m.kind === 'cloud') {
    const qr = S.sync ? qrSVG(cloudLink()) : null;
    body = `<h2>Sync with family</h2>
      ${S.sync ? `<p class="small">Anyone who opens this link sees and adds to this family on their own phone. The family is locked with a key that only exists in the link, so the server can't read it. ${S.sync.last ? `Last synced ${new Date(S.sync.last).toLocaleString()}.` : ''}</p>
        ${qr ? `<div class="qr">${qr}</div>` : ''}${linkBox(cloudLink())}
        <div class="row"><button class="btn primary" data-action="cloud-sync">Sync now</button><button class="btn" data-action="m-copy" data-url="${esc(cloudLink())}">Copy link</button><button class="btn" data-action="cloud-off">Stop syncing on this phone</button></div>
        <p class="small muted">Stopping on this phone leaves the locked copy for anyone else with the link. To remove it for everyone, delete the shared copy. Each phone keeps its own family.</p>
        <div class="row"><button class="btn danger ${S.confirmCloudDel ? 'armed' : ''}" data-action="cloud-delete">${S.confirmCloudDel ? 'Tap again to delete the shared copy' : 'Delete the shared copy for everyone'}</button></div>`
      : `<p class="small">Keep this family up to date on more than one phone or tablet, for example yours and a parent's, all working on <b>your</b> family tree. Everything is encrypted on the phone before it's uploaded.</p><div class="row"><button class="btn primary" data-action="cloud-start">Turn on sync</button></div>`}`;
  }
  return `<div class="modal-back" data-action="m-close"><div class="modal" role="dialog" aria-modal="true" data-stop="1"><button class="modal-x link" data-action="m-close" aria-label="Close">✕</button>${body}</div></div>`;
}
