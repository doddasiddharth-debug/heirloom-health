// Family stories: optional prompts about an elder's life (not health), recorded and kept as a family audio album.
//
// Stories stay on this device. Typed memories are saved on the person (person.stories = { id: text }) and
// recordings in the same on-device store as interview clips, with step 'story:<id>'. They are left out of
// doctor reports, PDFs, invite and report links and cloud sync (encrypted backups do include them) (see withoutStories below).
//
// Loads after content.js and before languages.js, which adds the other seven languages to these prompts.
'use strict';

/* ---------- Prompts ---------- */
const STORY_PROMPTS = [
  { id: 'grew_up', title: 'Growing up',
    en: 'Where did you grow up? What was it like there when you were a child?',
    te: 'మీరు ఎక్కడ పెరిగారు? మీ చిన్నప్పుడు అక్కడ ఎలా ఉండేది?', te_r: 'Meeru ekkada perigaaru? Mee chinnappudu akkada elaa undedi?',
    hi: 'आप कहाँ पले-बढ़े? जब आप बच्चे थे, तब वहाँ कैसा था?', hi_r: 'Aap kahaan pale-badhe? Jab aap bachche the, tab vahaan kaisa tha?',
    es: '¿Dónde creció usted? ¿Cómo era ese lugar cuando usted era niño o niña?' },
  { id: 'parents', title: 'Your parents',
    en: "What were your parents' names, and where were they from? What were they like?",
    te: 'మీ అమ్మగారు, నాన్నగారి పేర్లు ఏమిటి? వారు ఏ ఊరివారు? వారు ఎలా ఉండేవారు?', te_r: 'Mee ammagaaru, naannagaari perlu emiti? Vaaru ee oorivaaru? Vaaru elaa undevaaru?',
    hi: 'आपके माता-पिता के नाम क्या थे, और वे कहाँ के थे? वे कैसे इंसान थे?', hi_r: 'Aapke maata-pita ke naam kya the, aur ve kahaan ke the? Ve kaise insaan the?',
    es: '¿Cómo se llamaban sus padres y de dónde eran? ¿Cómo eran ellos?' },
  { id: 'grandparents', title: 'Your grandparents',
    en: 'What do you remember about your grandparents? What were their names, and where did they live?',
    te: 'మీ తాతయ్యలు, అమ్మమ్మ, నానమ్మల గురించి మీకు ఏమి గుర్తుంది? వారి పేర్లు ఏమిటి, వారు ఎక్కడ ఉండేవారు?', te_r: 'Mee taatayyalu, ammamma, naanammala gurinchi meeku emi gurtundi? Vaari perlu emiti, vaaru ekkada undevaaru?',
    hi: 'आपको अपने दादा-दादी और नाना-नानी के बारे में क्या याद है? उनके नाम क्या थे, और वे कहाँ रहते थे?', hi_r: 'Aapko apne daada-daadi aur naana-naani ke baare mein kya yaad hai? Unke naam kya the, aur ve kahaan rehte the?',
    es: '¿Qué recuerda de sus abuelos? ¿Cómo se llamaban y dónde vivían?' },
  { id: 'met', title: 'Meeting your partner',
    en: 'How did you meet your husband or wife? What do you remember about your wedding?',
    te: 'మీరు మీ భర్తను/భార్యను ఎలా కలిశారు? మీ పెళ్ళి గురించి మీకు ఏమి గుర్తుంది?', te_r: 'Meeru mee bhartanu/bhaaryanu elaa kalishaaru? Mee pelli gurinchi meeku emi gurtundi?',
    hi: 'आप अपने पति/अपनी पत्नी से कैसे मिले? आपको अपनी शादी के बारे में क्या याद है?', hi_r: 'Aap apne pati/apni patni se kaise mile? Aapko apni shaadi ke baare mein kya yaad hai?',
    es: '¿Cómo conoció a su esposo o esposa? ¿Qué recuerda de su boda?' },
  { id: 'food', title: 'Food from home',
    en: 'What food reminds you of home? Can you tell me how to make it?',
    te: 'ఏ వంటకం తింటే మీకు మీ ఇల్లు గుర్తొస్తుంది? అది ఎలా చేయాలో నాకు చెప్తారా?', te_r: 'Ee vantakam tinte meeku mee illu gurtostundi? Adi elaa cheyaalo naaku cheptaaraa?',
    hi: 'कौन-सा खाना आपको घर की याद दिलाता है? क्या आप मुझे उसे बनाने का तरीका बताएँगे?', hi_r: 'Kaun-sa khaana aapko ghar ki yaad dilaata hai? Kya aap mujhe use banaane ka tareeka bataayenge?',
    es: '¿Qué comida le recuerda a su hogar? ¿Me puede contar cómo se prepara?' },
  { id: 'festival', title: 'Festivals and holidays',
    en: 'Which festival or holiday do you remember most from when you were young? How did the family celebrate?',
    te: 'మీ చిన్నప్పటి పండుగల్లో మీకు బాగా గుర్తున్న పండుగ ఏది? కుటుంబమంతా ఎలా జరుపుకునేవారు?', te_r: 'Mee chinnappati pandugallo meeku baagaa gurtunna panduga edi? Kutumbamantaa elaa jarupukunevaaru?',
    hi: 'बचपन का कौन-सा त्योहार आपको सबसे ज़्यादा याद है? परिवार उसे कैसे मनाता था?', hi_r: 'Bachpan ka kaun-sa tyohaar aapko sabse zyaada yaad hai? Parivaar use kaise manaata tha?',
    es: '¿Qué fiesta o celebración de su niñez recuerda más? ¿Cómo la celebraba la familia?' },
  { id: 'work', title: 'Work and everyday life',
    en: 'What work did you do? What was a usual day like?',
    te: 'మీరు ఏ పని చేసేవారు? మీ రోజు సాధారణంగా ఎలా గడిచేది?', te_r: 'Meeru ee pani chesevaaru? Mee roju saadhaaranangaa elaa gadichedi?',
    hi: 'आप क्या काम करते थे? आपका एक आम दिन कैसा होता था?', hi_r: 'Aap kya kaam karte the? Aapka ek aam din kaisa hota tha?',
    es: '¿En qué trabajaba usted? ¿Cómo era un día normal?' },
  { id: 'hard', title: 'A hard time',
    en: 'What was the hardest time in your life, and what helped you get through it?',
    te: 'మీ జీవితంలో అన్నిటికంటే కష్టమైన సమయం ఏది? దాన్ని దాటడానికి మీకు ఏది సహాయపడింది?', te_r: 'Mee jeevitamlo annitikante kashtamaina samayam edi? Daanni daatadaaniki meeku edi sahaayapadindi?',
    hi: 'आपकी ज़िंदगी का सबसे मुश्किल समय कौन-सा था, और किस चीज़ ने आपको उससे निकलने में मदद की?', hi_r: 'Aapki zindagi ka sabse mushkil samay kaun-sa tha, aur kis cheez ne aapko usse nikalne mein madad ki?',
    es: '¿Cuál fue el momento más difícil de su vida, y qué le ayudó a salir adelante?' },
  { id: 'proud', title: 'Proudest moment',
    en: 'What are you most proud of in your life?',
    te: 'మీ జీవితంలో మీరు ఎక్కువగా గర్వపడే విషయం ఏది?', te_r: 'Mee jeevitamlo meeru ekkuvagaa garvapade vishayam edi?',
    hi: 'अपनी ज़िंदगी में आपको किस बात पर सबसे ज़्यादा गर्व है?', hi_r: 'Apni zindagi mein aapko kis baat par sabse zyaada garv hai?',
    es: '¿De qué se siente más orgulloso u orgullosa en su vida?' },
  { id: 'song', title: 'A song or saying',
    en: 'Is there a song, saying or prayer you remember from your childhood? Could you sing or say it for me?',
    te: 'మీ చిన్నప్పటి పాట, సామెత లేదా ప్రార్థన ఏదైనా గుర్తుందా? నా కోసం ఒకసారి పాడతారా లేదా చెప్తారా?', te_r: 'Mee chinnappati paata, saameta ledaa praarthana edainaa gurtundaa? Naa kosam okasaari paadataaraa ledaa cheptaaraa?',
    hi: 'क्या आपको बचपन का कोई गाना, कहावत या प्रार्थना याद है? क्या आप उसे मेरे लिए गाकर या बोलकर सुनाएँगे?', hi_r: 'Kya aapko bachpan ka koi gaana, kahaavat ya praarthana yaad hai? Kya aap use mere liye gaakar ya bolkar sunaayenge?',
    es: '¿Recuerda alguna canción, dicho u oración de su niñez? ¿Me la podría cantar o decir?' },
  { id: 'advice', title: 'Advice for me',
    en: 'What advice would you give me for my life?',
    te: 'నా జీవితం కోసం మీరు నాకు ఏ సలహా ఇస్తారు?', te_r: 'Naa jeevitam kosam meeru naaku ee salahaa istaaru?',
    hi: 'मेरी ज़िंदगी के लिए आप मुझे क्या सलाह देंगे?', hi_r: 'Meri zindagi ke liye aap mujhe kya salaah denge?',
    es: '¿Qué consejo me daría para mi vida?' },
  { id: 'legacy', title: 'For the grandchildren',
    en: 'What do you want your grandchildren and great-grandchildren to know about you and our family?',
    te: 'మీ మనవళ్ళు, మునిమనవళ్ళు మీ గురించి, మన కుటుంబం గురించి ఏమి తెలుసుకోవాలని మీరు అనుకుంటున్నారు?', te_r: 'Mee manavallu, munimanavallu mee gurinchi, mana kutumbam gurinchi emi telusukovaalani meeru anukuntunnaaru?',
    hi: 'आपके और हमारे परिवार के बारे में आप अपने पोते-पोतियों और उनके बच्चों को क्या बताना चाहेंगे?', hi_r: 'Aapke aur hamaare parivaar ke baare mein aap apne pote-potiyon aur unke bachchon ko kya bataana chaahenge?',
    es: '¿Qué quiere que sus nietos y bisnietos sepan de usted y de nuestra familia?' },
];
const STORY = Object.fromEntries(STORY_PROMPTS.map(s => [s.id, s]));

/* ---------- Data helpers ---------- */
const storyStep = id => 'story:' + id;
const isStoryClip = c => typeof c.step === 'string' && c.step.startsWith('story:');
const storyIdOf = c => isStoryClip(c) ? c.step.slice(6) : null;
const storyClips = (pid, id) => CLIPS.filter(c => c.pid === pid && isStoryClip(c) && (!id || storyIdOf(c) === id));
const storyText = (p, id) => (p?.stories && typeof p.stories[id] === 'string' ? p.stories[id] : '');
const storyDone = (p, id) => !!storyText(p, id).trim() || storyClips(p.id, id).length > 0;
const storyCount = p => STORY_PROMPTS.filter(s => storyDone(p, s.id)).length;
const hasStories = p => storyCount(p) > 0;
// A copy of a person without their stories, for anything that leaves the device or the profile.
function withoutStories(p) { if (!p || !('stories' in p)) return p; const { stories, ...rest } = p; return rest; }
// Label for a story recording in other clip lists (the family tree editor).
function storyClipLabel(c) { return 'Story: ' + (STORY[storyIdOf(c)]?.title || 'Family story'); }

/* ---------- The interview screen's mode card ---------- */
function storiesCard(W) {
  const n = storyCount(W);
  return `<button class="mode-card" data-action="stories-open"><b>Family stories</b><span>${n ? `${n} of ${STORY_PROMPTS.length} stories saved for ${esc(nameOf(W))}.` : `Record ${esc(nameOf(W))}'s life stories: growing up, family names, recipes, advice.`} Kept on this device as a family album.</span></button>`;
}

/* ---------- Stories page ---------- */
function storiesPeople() { return S.people.filter(p => p.id !== SELF && p.living !== 'no'); }
function renderStories() {
  const talkable = storiesPeople();
  if (!talkable.some(p => p.id === S.iv.who) && talkable.length) S.iv.who = talkable[0].id;
  const W = byId(S.iv.who);
  if (S.storyView === 'album' || !W) return renderAlbum();
  const lang = S.iv.lang, L = LANGS.find(l => l.id === lang) || LANGS[0];
  const cards = STORY_PROMPTS.map((P, i) => {
    const step = storyStep(P.id), live = REC && REC.pid === W.id && REC.step === step, clips = storyClips(W.id, P.id);
    const roman = lang !== 'en' && S.iv.roman && P[lang + '_r'];
    return `<section class="card story-card" id="story-${P.id}" aria-labelledby="story-h-${P.id}">
      <div class="story-head"><span class="story-n">${i + 1}</span><h2 id="story-h-${P.id}">${esc(P.title)}</h2>${storyDone(W, P.id) ? '<span class="tag story-saved">Saved</span>' : ''}</div>
      <div class="speaker">
        ${mascot(52)}
        <div class="bubble">
          <div class="row" style="flex-wrap:nowrap;align-items:flex-start;gap:12px">
            <button class="btn iris audio-btn" data-action="story-listen" data-id="${P.id}" aria-label="Read this aloud">${ICON.speaker}</button>
            <p class="say" ${langAttrs(lang)}>${esc(say(P, lang))}</p>
          </div>
          ${roman ? `<p class="roman">${esc(P[lang + '_r'])}</p>` : ''}
          ${lang !== 'en' ? `<p class="gloss">In English: ${esc(P.en)}</p>` : ''}
        </div>
      </div>
      <div class="rec-btns">
        ${live ? `<button class="btn rec-live" data-action="rec-stop"><span class="rec-dot"></span>Stop <span id="rec-time" class="num">0:00</span></button>`
          : S.micBlocked ? '' : `<button class="btn" data-action="story-rec" data-pid="${W.id}" data-id="${P.id}" ${REC ? 'disabled' : ''}>${ICON.mic}Record</button>`}
        <label class="btn ${S.micBlocked ? '' : 'sm'}" for="story-file-${P.id}">${S.micBlocked ? ICON.mic + "Use phone's recorder" : 'Add audio file'}</label>
        <input type="file" id="story-file-${P.id}" class="sr" accept="audio/*" ${S.micBlocked ? 'capture' : ''} data-story-file="${P.id}" data-story-pid="${W.id}">
      </div>
      ${clipList(clips, false)}
      <label class="f">Write down the memory<textarea id="story-tx-${P.id}" data-story-pid="${W.id}" data-story-id="${P.id}" placeholder="Names, places, years, the recipe…">${esc(storyText(W, P.id))}</textarea></label>
    </section>`;
  }).join('');
  return `<div class="lesson stories">
    ${storiesTop('prompts')}
    <div class="setup">
      <label class="f">Talking to<select id="st-who" data-ivf="who">${talkable.map(p => `<option value="${p.id}" ${p.id === W.id ? 'selected' : ''}>${esc(nameOf(p))} · ${esc(relOf(p))}</option>`).join('')}</select></label>
      <label class="f">Prompts in<select id="st-lang" data-ivf="lang">${LANGS.map(l => `<option value="${l.id}" ${l.id === lang ? 'selected' : ''}>${l.label}</option>`).join('')}</select></label>
      ${L.roman ? `<label class="switch"><input type="checkbox" id="st-roman" data-ivf="roman" ${S.iv.roman ? 'checked' : ''}> Show pronunciation</label>` : ''}
    </div>
    <div class="tip">${ICON.bulb}<div><b>Tip</b><br>Pick any prompt, in any order, and let them talk. Ask "Is it okay if I record this for the family?" first. Follow-up questions like "What happened next?" bring out the best stories.</div></div>
    <p class="say-to">Ask ${esc(nameOf(W))}</p>
    ${cards}
    <p class="fine">Stories stay on this device. They are not part of the doctor report, PDF, share links or family sync. Save the album to keep a copy. These translations were drafted for this prototype; ask a fluent family member to check them.</p>
  </div>`;
}
function storiesTop(view) {
  return `<div class="stories-top">
    <div style="display:grid;gap:6px"><h1>Family stories</h1>
      <p class="muted">The heirloom part: your elders' own stories, in their own voices, about their lives and the family before you. Nothing here is about health.</p></div>
    <div class="row">
      <div class="seg" role="group" aria-label="Show">
        <button type="button" class="pill-btn" data-action="stories-view" data-view="prompts" aria-pressed="${view === 'prompts'}">Prompts</button>
        <button type="button" class="pill-btn" data-action="stories-view" data-view="album" aria-pressed="${view === 'album'}">Album</button>
      </div>
      <button class="btn sm" data-action="stories-close">Back to interview</button>
    </div>
  </div>`;
}

/* ---------- Album ---------- */
function albumPerson() {
  const withSt = S.people.filter(hasStories);
  const pick = byId(S.albumWho) || byId(S.iv.who);
  return { list: [...new Set([...(pick && pick.id !== SELF ? [pick] : []), ...withSt])], pick };
}
function renderAlbum() {
  const { list, pick } = albumPerson();
  const P = pick && list.includes(pick) ? pick : list[0];
  const lang = S.iv.lang;
  const body = !P ? '<p class="muted">No stories yet. Open Prompts and record a relative\'s first story.</p>' : (() => {
    const done = STORY_PROMPTS.filter(s => storyDone(P, s.id));
    const mb = storyClips(P.id).reduce((n, c) => n + (c.blob?.size || 0), 0) / 1048576;
    return `<section class="card album" aria-label="${esc(nameOf(P))}'s stories">
      <div class="story-head"><h2>${esc(nameOf(P))}</h2><span class="muted small">${esc(relOf(P))} · ${done.length} of ${STORY_PROMPTS.length} stories${mb ? ` · ${mb < 1 ? '<1' : mb.toFixed(1)} MB of audio` : ''}</span></div>
      ${done.length ? done.map(s => `<article class="album-item">
        <h3>${esc(s.title)}</h3>
        <p class="small muted" ${lang !== 'en' ? langAttrs(lang) : ''}>${esc(say(s, lang))}</p>
        ${storyText(P, s.id).trim() ? `<p class="album-text">${esc(storyText(P, s.id).trim())}</p>` : ''}
        ${clipList(storyClips(P.id, s.id), false)}
      </article>`).join('') : `<p class="muted">No stories saved for ${esc(nameOf(P))} yet.</p>`}
      <div class="row"><button class="btn primary" data-action="album-save" data-pid="${P.id}" ${done.length && !S.albumBusy ? '' : 'disabled'}>${S.albumBusy ? 'Building the album…' : 'Save album'}</button>
        <span class="small muted">One file with the stories and recordings inside. It opens in any browser, works offline and prints.</span></div>
    </section>`;
  })();
  return `<div class="lesson stories">
    ${storiesTop('album')}
    ${list.length > 1 ? `<div class="pills" role="group" aria-label="Whose stories">${list.map(p => `<button class="pill-btn" data-action="album-who" data-id="${p.id}" aria-pressed="${p === P}">${esc(nameOf(p))}</button>`).join('')}</div>` : ''}
    ${body}
    <p class="fine">Stories stay on this device. They are not part of the doctor report, PDF, share links or family sync.</p>
  </div>`;
}

/* ---------- Keepsake file: one self-contained HTML page ---------- */
const ALBUM_WARN_BYTES = 60 * 1048576;
async function buildAlbum(pid) {
  const P = byId(pid);
  if (!P) throw new Error('no person');
  const lang = S.iv.lang;
  const fmt = t => new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const paras = t => t.trim().split(/\n{2,}|\r?\n/).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('');
  const items = [];
  for (const s of STORY_PROMPTS) {
    if (!storyDone(P, s.id)) continue;
    const audio = [];
    for (const c of storyClips(P.id, s.id)) {
      const type = String(c.type || c.blob?.type || 'audio/webm').split(';')[0];
      audio.push(`<figure><audio controls preload="none" src="data:${esc(type)};base64,${await blobToB64(c.blob)}"></audio><figcaption>Recorded ${esc(fmt(c.created))}${c.secs ? ' · ' + fmtSec(c.secs) : ''}</figcaption></figure>`);
    }
    const asked = lang !== 'en' && s[lang] ? `<p class="asked" lang="${lang}"${langInfo(lang).dir ? ` dir="${langInfo(lang).dir}"` : ''}>${esc(s[lang])}</p>` : '';
    items.push(`<section class="story"><h2>${esc(s.title)}</h2><p class="asked">${esc(s.en)}</p>${asked}
      ${storyText(P, s.id).trim() ? `<div class="memory">${paras(storyText(P, s.id))}</div>` : ''}${audio.join('')}</section>`);
  }
  const name = nameOf(P), meta = [relOf(P), P.born ? 'Born ' + P.born : ''].filter(Boolean).join(' · ');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Family stories · ${esc(name)}</title>
<style>
:root { color-scheme: light; --ink: #2b2620; --muted: #6f665b; --line: #e6ddd0; --paper: #fffdf8; --accent: #b4542f; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.6 Georgia, "Times New Roman", "Noto Serif", serif; }
main { max-width: 720px; margin: 0 auto; padding: 32px 18px 48px; }
header { border-bottom: 3px double var(--line); padding-bottom: 18px; margin-bottom: 8px; }
.kicker { font: 600 .8rem/1.2 system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin: 0 0 6px; }
h1 { font-size: 2.2rem; line-height: 1.15; margin: 0; overflow-wrap: anywhere; }
.sub { color: var(--muted); margin: 6px 0 0; }
.story { padding: 22px 0; border-bottom: 1px solid var(--line); break-inside: avoid; }
h2 { font-size: 1.35rem; margin: 0 0 6px; color: var(--accent); }
.asked { margin: 0 0 4px; color: var(--muted); font-style: italic; overflow-wrap: anywhere; }
.memory { margin-top: 12px; overflow-wrap: anywhere; }
.memory p { margin: 0 0 10px; }
figure { margin: 12px 0 0; }
audio { width: 100%; }
figcaption { font: .82rem system-ui, sans-serif; color: var(--muted); margin-top: 4px; }
footer { margin-top: 28px; font: .85rem system-ui, sans-serif; color: var(--muted); }
@media print {
  body { background: #fff; font-size: 12pt; }
  main { padding: 0; max-width: none; }
  audio { display: none; }
  figcaption::before { content: "Audio recording · "; }
}
</style></head>
<body><main>
<header><p class="kicker">Family stories</p><h1>${esc(name)}</h1><p class="sub">${esc(meta)}${meta ? ' · ' : ''}Saved ${esc(fmt(Date.now()))}</p></header>
${items.join('\n')}
<footer><p>Collected by ${esc(nameOf(byId(SELF)) || 'the family')} with Heirloom Health. The recordings are inside this file, so it plays in any web browser without the internet. Keep a copy somewhere safe and share it with the family.</p></footer>
</main></body></html>`;
}
async function saveAlbum(pid) {
  const P = byId(pid);
  if (!P || S.albumBusy) return;
  const bytes = storyClips(pid).reduce((n, c) => n + (c.blob?.size || 0), 0);
  if (bytes > ALBUM_WARN_BYTES && !confirm(`${nameOf(P)}'s recordings add up to about ${Math.round(bytes / 1048576)} MB, so the album file will be large (about ${Math.round(bytes * 1.37 / 1048576)} MB) and slow to open on some phones. Build it anyway?`)) return;
  S.albumBusy = true; render();
  try {
    const html = await buildAlbum(pid);
    await saveFile(`family-stories-${(nameOf(P) || 'relative').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'relative'}.html`, new Blob([html], { type: 'text/html' }));
  } catch (e) {
    if (e?.code !== 'declined') toast("Couldn't build the album here.");
    console.error(e);
  } finally { S.albumBusy = false; render(); }
}

/* ---------- Events ---------- */
// Handle a tap on the stories page. Returns true when the action belonged to Family stories.
function storiesAction(a, b) {
  const d = b.dataset;
  switch (a) {
    case 'stories-open': S.showStories = true; S.showVoices = false; S.storyView = 'prompts'; S.confirmClip = null; save(); render(); window.scrollTo({ top: 0 }); return true;
    case 'stories-close': S.showStories = false; stopSpeaking(); save(); render(); window.scrollTo({ top: 0 }); return true;
    case 'stories-view': S.storyView = d.view === 'album' ? 'album' : 'prompts'; if (S.storyView === 'album') S.albumWho = S.iv.who; save(); render(); return true;
    case 'album-who': S.albumWho = d.id; render(); return true;
    case 'album-save': saveAlbum(d.pid); return true;
    case 'story-listen': { const P = STORY[d.id]; if (P) speakSeq([{ key: 's:' + P.id, text: say(P, S.iv.lang) }], S.iv.lang); return true; }
    case 'story-rec': if (STORY[d.id] && byId(d.pid) && !REC) startRec(d.pid, storyStep(d.id)); return true;
  }
  return false;
}
// Typed memories and added audio files. app.js's own listeners ignore these fields (they have no data-pid).
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (!S || !d.storyId || !d.storyPid || !STORY[d.storyId]) return;
  const p = byId(d.storyPid); if (!p) return;
  const v = t.value.slice(0, 20000);
  if (v.trim()) (p.stories ||= {})[d.storyId] = v; else if (p.stories) delete p.stories[d.storyId];
  save();
});
document.addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (!S || !d.storyFile || !STORY[d.storyFile]) return;
  const f = t.files?.[0]; if (f && byId(d.storyPid)) addClip(d.storyPid, storyStep(d.storyFile), f, null);
  t.value = '';
});
