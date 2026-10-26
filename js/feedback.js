// Feedback (bug reports and ideas) and the app menu.
'use strict';

const APP_VERSION = '2026.10.26';
const FB_KINDS = [['bug', 'Something is broken'], ['idea', 'An idea'], ['translation', 'A translation fix'], ['other', 'Something else']];
const FB_HINTS = {
  bug: 'What happened? What did you expect? Which screen were you on?',
  idea: 'What would make the app better for your family?',
  translation: 'Which language, which words, and what should they say instead?',
  other: 'Tell us anything.',
};
const deviceInfo = () => `${navigator.userAgent.slice(0, 160)} · screen ${screen.width}×${screen.height} · app ${APP_VERSION}`;

function feedbackHTML(m) {
  if (m.sent) return `<div class="done" style="padding:0">${mascot(90, true)}<h2>Thank you!</h2><p class="muted">Your ${m.type === 'bug' ? 'bug report' : 'feedback'} was sent.${m.email ? ' We may reply by email.' : ''}</p><button class="btn primary" data-action="m-close">Close</button></div>`;
  return `<h2>Send feedback</h2>
    <p class="small muted">Found a bug or have an idea? Every message is read. Please don't include anyone's health details.</p>
    <div class="pills" role="radiogroup" aria-label="Kind of feedback">${FB_KINDS.map(([k, l]) => `<button class="pill-btn" role="radio" data-action="fb-type" data-type="${k}" aria-checked="${m.type === k}" aria-pressed="${m.type === k}">${l}</button>`).join('')}</div>
    <label class="f">Your message<textarea id="fb-msg" maxlength="4000" placeholder="${esc(FB_HINTS[m.type])}">${esc(m.draft || '')}</textarea></label>
    <label class="f">Email, if you'd like a reply (optional)<input type="text" id="fb-email" inputmode="email" autocomplete="email" value="${esc(m.email || '')}"></label>
    <label class="check"><input type="checkbox" id="fb-info" ${m.noInfo ? '' : 'checked'}> Include device details (browser, screen size, app version)</label>
    <label class="sr" aria-hidden="true">Leave this empty<input type="text" id="fb-website" tabindex="-1" autocomplete="off"></label>
    <p class="auth-err" id="fb-err" role="alert"></p>
    ${cloudOn()
      ? `<div class="row"><button class="btn primary" data-action="fb-send" ${m.sending ? 'disabled' : ''}>${m.sending ? 'Sending…' : 'Send'}</button><button class="btn" data-action="m-close">Cancel</button></div>`
      : `<p class="small">This copy of the app isn't connected to a feedback server. Send it as a GitHub issue (free GitHub account needed), or copy it and send it another way.</p>
         <div class="row">${window.CONFIG?.repo ? `<button class="btn primary" data-action="fb-github">Open a GitHub issue</button>` : ''}<button class="btn" data-action="fb-copy">Copy message</button></div>`}`;
}
function feedbackText(m) {
  const info = m.noInfo ? '' : `\n\n---\nDevice: ${deviceInfo()}`;
  return `${FB_KINDS.find(([k]) => k === m.type)[1]}\n\n${(m.draft || '').trim()}${info}`;
}
async function sendFeedback() {
  const m = S.modal, err = t => { const el = $('#fb-err'); if (el) el.textContent = t; };
  if ($('#fb-website')?.value) { m.sent = true; render(); return; } // spam bot
  if ((m.draft || '').trim().length < 5) { err('Please write a little more.'); $('#fb-msg')?.focus(); return; }
  m.sending = true; render();
  try {
    const res = await fetch(`${CONFIG.apiBase}/api/feedback`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: m.type, message: m.draft.trim(), email: (m.email || '').trim(), info: m.noInfo ? '' : deviceInfo(), website: '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "The message couldn't be sent.");
    m.sending = false; m.sent = true; render();
  } catch (e) { m.sending = false; render(); err(`${e.message} You can also copy it and send it another way.`); }
}
function githubIssueUrl(m) {
  const title = `${FB_KINDS.find(([k]) => k === m.type)[1]}: ${(m.draft || '').trim().split('\n')[0].slice(0, 70)}`;
  return `https://github.com/${CONFIG.repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(feedbackText(m))}`;
}

function menuHTML() {
  const item = (action, title, sub) => `<button class="menu-item" ${action === 'tour' ? 'data-tour="start"' : `data-action="${action}"`}><b>${title}</b><span>${sub}</span></button>`;
  return `<h2>${esc(ACCT?.guest ? 'Exploring as guest' : ACCT?.name || 'Menu')}</h2>
    <div class="menu-list">
      ${item('tour', 'Take the tour', 'A two-minute walk through every part of the app')}
      ${item('feedback-open', 'Send feedback', 'Report a bug or share an idea')}
      ${item('stt-open', 'Speech-to-text', S.sttMode === 'server' ? 'Using the Heirloom server' : 'On this phone')}
      ${item('legal-open', 'Terms and privacy', 'What the app does with your information')}
      ${item('signout', ACCT?.guest ? 'Exit the example' : 'Sign out', ACCT?.guest ? 'Back to the sign-in page' : 'Your family stays saved on this device')}
    </div>`;
}
