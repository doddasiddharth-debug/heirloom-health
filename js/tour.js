// Guided tour of the whole app. Each step opens a screen and highlights one part of it.
// It starts by itself the first time a profile is opened, and again from Menu → Take the tour.
'use strict';

const TOUR = [
  { tab: 'tree', title: 'Welcome to Heirloom Health', text: "Most people can't answer \"Does heart disease run in your family?\" This app helps you ask your relatives, build a medical family tree, and give your doctor a clear report. The tour takes about two minutes." },
  { tab: 'tree', sel: ['#tree-svg'], title: 'Your family tree', text: 'Everyone you add appears here, using the symbols doctors use: squares for males, circles for females, and a line through anyone who has died. Drag to move around, use + and − to zoom, and tap a person to open their details.' },
  { tab: 'tree', sel: ['.editor'], title: 'Add relatives and details', text: "This panel edits the selected person. Use the Add buttons for parents, siblings, children, partners and more, and the app works out how everyone is related. You can also add photos and documents, which stay on this device." },
  { tab: 'tree', sel: ['.nextask'], title: 'Who to ask next', text: "The app ranks relatives by how many important gaps they could fill. Grandparents and older relatives usually know the most." },
  { tab: 'interview', sel: ['#iv-lang'], title: 'Interview in their language', text: "Pick who you are talking to and the language they're most comfortable in. Each question shows a pronunciation line, so you can ask it even if you can't read the script. Tap Listen to hear it read aloud." },
  { tab: 'interview', capture: true, sel: ['[data-action="rec-start"]', '[data-action="rec-stop"]'], title: 'Record the answers', text: "Ask permission first, then record. The recording stays on this device. Later, Turn into text writes out what was said, either on your phone or with the free Heirloom server." },
  { tab: 'interview', capture: true, sel: ['[data-action="find"]', '#iv-tr'], title: 'Find answers for you', text: "Type or paste what your relative said, then tap Find answers. The app understands everyday words like \"sugar\" for diabetes and notices when someone says no. Check each suggestion before you add it. You can also tick answers yourself." },
  { tab: 'interview', sel: ['[data-action="elder-start"]'], title: 'Let grandparents answer on their own', text: "Large tap-to-answer mode shows one illness at a time with big Yes / No / Don't know buttons. Question voices lets a fluent relative record each question once, so it's always read out in a familiar voice." },
  { tab: 'interview', sel: ['[data-action="stories-open"]'], title: 'Family stories', text: "Beyond health, ask your elders about their lives: where they grew up, how they met, family names, recipes, songs and advice. Record their answers in their own voices, then save an album file the whole family can keep. Stories stay on this device and never go into the doctor report." },
  { tab: 'tree', relative: true, sel: ['[data-action="invite"]', '[data-action="interview"]'], title: 'Relatives who live far away', text: "Select a relative and send them an invite link. They answer on their own phone with no sign-up and send a link back, and their answers are added to your tree. Family sync keeps the tree up to date across phones, encrypted so the server can't read it." },
  { tab: 'risks', sel: ['.anc-card', '.anc-note'], title: 'Your ancestry', text: "Some risks depend on where your family comes from, such as heart disease in South Asian families or thalassemia in Mediterranean and South Asian families. Choose all that apply here, or on your own card in the family tree." },
  { tab: 'risks', sel: ['.timeline-card'], title: 'My health timeline', text: "What to check and when, from now into adulthood. Steps marked in gold are earlier or extra because of your family, like a cholesterol test now or colon screening at 40 instead of 45." },
  { tab: 'risks', sel: ['.risks', '.lesson'], title: 'What am I most at risk for?', text: "Conditions are ranked as higher than average, moderate, or about average, using the family-history method behind the CDC's Family Healthware tool. This is not a diagnosis. It shows what to talk about with a doctor." },
  { tab: 'doctor', sel: ['.doc-head', '[data-action="pdf"]'], title: 'The doctor report', text: "This applies published screening guidelines, such as when to start colon cancer screening or whether to see a genetic counselor, and names the source of each finding. There is also a checklist of questions to ask at your next checkup." },
  { tab: 'doctor', sel: ['[data-action="qr"]', '[data-action="pdf"]'], title: 'Hand it to your doctor', text: "Download a PDF, or tap Show my doctor for a QR code that opens a read-only copy. The report travels inside the link and is never stored on a server." },
  { tab: 'tree', sel: ['#acct-side', '#logo-top .acct'], title: 'Menu, privacy and feedback', text: "Your family is saved only on this device. The Menu has speech-to-text settings, Terms and privacy, Send feedback for bugs and ideas, and this tour if you want to see it again. That's everything. Start with the oldest relative you can call this week!" },
];

let TOUR_I = null;
const tourOn = () => TOUR_I != null && S && !E && !ACCT?.viewer && !ACCT?.contributor && !LEGAL_OPEN;

function startTour() {
  if (!S) return;
  TOUR_I = 0; S.modal = null; S.showVoices = S.showStories = false;
  showTourStep();
}
function endTour() {
  TOUR_I = null;
  if (S && !S.toured) { S.toured = true; save(); }
  render();
}
function showTourStep() {
  const step = TOUR[TOUR_I];
  S.celebrate = null; S.modal = null; S.showVoices = S.showStories = false;
  if (step.tab !== S.tab) { S.tab = step.tab; save(); }
  // Invites are on a relative's card, so show one.
  if (step.relative && S.sel === SELF) S.sel = S.people.find(p => p.id !== SELF && p.living !== 'no')?.id || SELF;
  // Recording and answer finding only appear on question steps, not the introduction.
  if (step.capture && ['intro', 'closing'].includes(STEPS[S.iv.step]?.type)) S.iv.step = Math.max(0, STEPS.findIndex(st => st.type !== 'intro' && st.type !== 'closing'));
  render();
}
// Called after every render: draws the tour card and highlights the step's target.
function applyTour() {
  document.querySelectorAll('.tour-target').forEach(el => el.classList.remove('tour-target'));
  let root = document.getElementById('tour-root');
  if (!tourOn()) { root?.remove(); document.body.classList.remove('touring'); return; }
  if (!root) { root = Object.assign(document.createElement('div'), { id: 'tour-root' }); document.body.append(root); }
  document.body.classList.add('touring');
  const step = TOUR[TOUR_I], n = TOUR.length, last = TOUR_I === n - 1;
  const target = (step.sel || []).map(s => document.querySelector(s)).find(el => el && el.offsetParent !== null);
  root.innerHTML = `<div class="tour ${target ? '' : 'center'}" role="dialog" aria-modal="false" aria-labelledby="tour-title">
    <div class="tour-top"><span class="tour-count">${TOUR_I + 1} of ${n}</span><button class="link" data-tour="end">${last ? 'Close' : 'Skip tour'}</button></div>
    <div class="tour-bar"><i style="width:${((TOUR_I + 1) / n) * 100}%"></i></div>
    ${TOUR_I ? '' : `<div class="tour-hello">${mascot(64, true)}</div>`}
    <h2 id="tour-title">${esc(step.title)}</h2>
    <p>${esc(step.text)}</p>
    <div class="row tour-btns">${TOUR_I ? '<button class="btn" data-tour="back">Back</button>' : ''}<button class="btn primary" data-tour="${last ? 'end' : 'next'}">${last ? 'Start my family' : TOUR_I ? 'Next' : 'Show me around'}</button></div>
  </div>`;
  if (target) { target.classList.add('tour-target'); placeTour(root.firstElementChild, target); }
  else window.scrollTo({ top: 0 });
  root.querySelector('[data-tour="next"], [data-tour="end"]:not(.link)')?.focus({ preventScroll: true });
}
// Put the card where it doesn't cover the highlighted part: scroll the part into the space the card leaves
// free, and if the page can't scroll that far, move the card to the other end of the screen.
function placeTour(card, target) {
  const phone = innerWidth <= 860, gap = 16, H = innerHeight;
  const navH = phone ? 88 : 0; // the tab bar along the bottom of a phone screen
  const h = card.offsetHeight, w = card.offsetWidth;
  const rect = () => target.getBoundingClientRect();
  const bands = { bottom: [gap, H - navH - (phone ? 88 : 20) - h - gap], top: [gap + h + gap, H - navH - gap] };
  const covers = r => {
    const cardLeft = phone ? 0 : innerWidth - w - 20;
    if (r.right < cardLeft - 8) return 0; // side by side on a wide screen
    const [lo, hi] = bands[card.classList.contains('at-top') ? 'top' : 'bottom'];
    return Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0)) - Math.max(0, Math.min(r.bottom, hi) - Math.max(r.top, lo));
  };
  const fit = side => {
    card.classList.toggle('at-top', side === 'top');
    const [lo, hi] = bands[side], r = rect();
    const room = hi - lo;
    // Center it in the free space, or line up its top edge if it's too tall to fit.
    window.scrollBy(0, r.height <= room ? r.top - (lo + (room - r.height) / 2) : r.top - lo);
    return covers(rect());
  };
  const r0 = rect();
  if (!phone && r0.right < innerWidth - w - 28) { // it fits beside the card
    card.classList.remove('at-top');
    window.scrollBy(0, r0.top - Math.max(gap, (H - r0.height) / 2));
    return;
  }
  if (fit('bottom') > 0) {
    const y = scrollY, under = covers(rect());
    if (fit('top') >= under) { window.scrollTo(0, y); card.classList.remove('at-top'); }
  }
}
let TOUR_RESIZE = 0;
addEventListener('resize', () => { clearTimeout(TOUR_RESIZE); TOUR_RESIZE = setTimeout(() => tourOn() && applyTour(), 150); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tour]'); if (!b) return;
  const a = b.dataset.tour;
  if (a === 'start') { e.stopPropagation(); return startTour(); }
  if (TOUR_I == null) return;
  if (a === 'end') endTour();
  else if (a === 'next' && TOUR_I < TOUR.length - 1) { TOUR_I++; showTourStep(); }
  else if (a === 'back' && TOUR_I > 0) { TOUR_I--; showTourStep(); }
}, true);
document.addEventListener('keydown', e => {
  if (!tourOn() || S.modal || e.target.closest?.('input, textarea, select')) return;
  if (e.key === 'Escape') endTour();
  else if (e.key === 'ArrowRight' && TOUR_I < TOUR.length - 1) { TOUR_I++; showTourStep(); }
  else if (e.key === 'ArrowLeft' && TOUR_I > 0) { TOUR_I--; showTourStep(); }
});
