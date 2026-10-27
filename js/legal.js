// Terms of Use and Privacy Policy, in plain language.
// Raise TERMS_VERSION when the terms change; everyone is asked to agree again at their next sign-in.
'use strict';

const TERMS_VERSION = '2026-10-26';
const TERMS_DATE = 'October 26, 2026';
let LEGAL_OPEN = false;

function legalHTML() {
  const repo = window.CONFIG?.repo;
  return `<article class="legal">
    <p class="eyebrow">Last updated ${TERMS_DATE}</p>
    <h1>Terms of Use and Privacy</h1>
    <p class="lead">Heirloom Health is a free app made by a student for the Congressional App Challenge. These terms are written to be read. Please read them, and if you are under 18, read them with a parent or guardian.</p>

    <h2>The short version</h2>
    <ul>
      <li><b>It is not medical advice.</b> The app organizes what your family remembers so you can talk to a doctor. Only a doctor can tell you what it means for you. In an emergency, call 911.</li>
      <li><b>Your family's information stays on your device.</b> There are no ads, no tracking and no selling of data. Nothing is uploaded unless you choose a feature that says it sends something.</li>
      <li><b>Ask before you record or share.</b> Your relatives' health stories belong to them too.</li>
    </ul>

    <h2>Terms of Use</h2>
    <h3>1. What the app is</h3>
    <p>Heirloom Health helps you interview relatives, build a family health tree, and prepare questions and a report for a doctor. Its risk levels and screening notes summarize published medical guidelines, but guidelines change, family memories can be wrong, and the app can make mistakes. Do not start, stop or change any treatment because of the app. Always check with a doctor.</p>
    <h3>2. Who can use it</h3>
    <p>The app is meant for teens and adults. If you are under 18, use it with a parent or guardian's knowledge. If you are under 13, a parent or guardian should set it up with you and decide whether to use any of the online features below.</p>
    <h3>3. Respecting your family</h3>
    <ul>
      <li>Get permission before you interview, record, photograph or write down a relative's health information.</li>
      <li>Let them skip any question. Some memories are painful.</li>
      <li>Only share links, reports or recordings with the people your relatives agreed to, such as your doctor.</li>
    </ul>
    <h3>4. Translations</h3>
    <p>Questions in languages other than English were drafted for this project and may contain mistakes. If something sounds wrong, tell us with the feedback form.</p>
    <h3>5. Optional online features</h3>
    <p>Some features send information off your device, only when you use them and only after the app tells you what will be sent: the AI helper, turning recordings into text with the server, family sync, and feedback. They are described under Privacy below. You can use everything else without them.</p>
    <h3>6. No guarantees</h3>
    <p>The app is provided "as is", without warranties of any kind. To the extent the law allows, the makers of Heirloom Health are not responsible for decisions made using it, for lost data, or for problems caused by other services it connects to. Keep a backup code if your family's information matters to you.</p>
    <h3>7. Changes</h3>
    <p>If these terms change, the app will ask you to read and agree to them again.</p>

    <h2>Privacy</h2>
    <h3>What stays on your device</h3>
    <p>Profiles, PINs (never stored themselves, only a slow one-way scramble of them), your family tree, health answers, interview notes, recordings, photos, documents and recorded question voices are saved in this browser on this device. We cannot see them. Clearing your browser's data, using "Erase and start over", or deleting your profile removes them. If your profile has a PIN, your family tree, health answers and notes are also encrypted with it, so they can't be read on this device without the PIN. Recordings, photos and documents stay on the device but are not encrypted.</p>
    <h3>What leaves your device, and only when you choose</h3>
    <ul>
      <li><b>Share links</b> (inviting a relative, sending answers back, showing your doctor): the information travels inside the link itself, after the # sign, which browsers never send to a website's server. Anyone you give the link to can read it.</li>
      <li><b>Turning a recording into text on this device:</b> nothing is sent. The speech model is downloaded once from Hugging Face, an AI model library.</li>
      <li><b>Turning a recording into text with the server</b> and the <b>AI helper</b>: the recording or text goes to the Heirloom server and an AI service (Cloudflare Workers AI by default; Anthropic or OpenAI if the server is set up with them) to be processed. The Heirloom server does not keep it. The app asks for your permission first.</li>
      <li><b>Family sync:</b> your family is locked (encrypted) on your device before it is uploaded. The key exists only in your sync link, so the server cannot read what it stores. Stored copies are deleted after about a year without a sync.</li>
      <li><b>Feedback:</b> your message, the email address if you give one, and device details if you tick that box. Please don't include family health details.</li>
    </ul>
    <h3>Things every website does</h3>
    <p>The website is hosted on GitHub Pages, and its fonts come from Google Fonts. Like any website, these services see your device's internet address when the page loads. The app itself has no analytics, cookies for tracking, or ads.</p>
    <h3>Children</h3>
    <p>We do not knowingly collect information from children. The app keeps information on the device. If a child under 13 sent feedback or used an online feature without a parent, contact us and we will delete what we have.</p>
    <h3>Contact</h3>
    <p>Questions or requests: use "Send feedback" in the app${repo ? `, or open an issue at <a href="https://github.com/${repo}/issues" target="_blank" rel="noopener">github.com/${repo}</a>` : ''}.</p>

    <p class="fine">These terms were written for a student project in plain language. They are not a substitute for advice from a lawyer.</p>
  </article>`;
}
function renderLegal() {
  return `<div class="legal-page">
    <div class="row"><button class="btn" data-action="legal-close">‹ Back</button></div>
    ${legalHTML()}
    <div class="row"><button class="btn primary" data-action="legal-close">Back to the app</button></div>
  </div>`;
}
const termsLink = (text = 'Terms and Privacy Policy') => `<button type="button" class="link inline" data-action="legal-open">${text}</button>`;
