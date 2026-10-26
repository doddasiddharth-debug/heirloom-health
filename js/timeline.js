// My health timeline: what to check and when, from now through adulthood.
// It starts from the screenings everyone gets at a given age, then moves items earlier (or adds new ones)
// based on the guideline cards for this family, so the teen can see what the family history changes.
'use strict';

Object.assign(SOURCES, {
  uspstfBreast: { short: 'USPSTF breast cancer screening, 2024', full: 'US Preventive Services Task Force. Screening for breast cancer: US Preventive Services Task Force recommendation statement. JAMA. 2024;331(22):1918-1930.', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening' },
  uspstfCervical: { short: 'USPSTF cervical cancer screening, 2018', full: 'US Preventive Services Task Force. Screening for cervical cancer: US Preventive Services Task Force recommendation statement. JAMA. 2018;320(7):674-686.', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/cervical-cancer-screening' },
  uspstfBp: { short: 'USPSTF high blood pressure screening, 2021', full: 'US Preventive Services Task Force. Screening for hypertension in adults: US Preventive Services Task Force reaffirmation recommendation statement. JAMA. 2021;325(16):1650-1656.', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hypertension-in-adults-screening' },
  uspstfDiabetes: { short: 'USPSTF prediabetes and type 2 diabetes screening, 2021', full: 'US Preventive Services Task Force. Screening for prediabetes and type 2 diabetes: US Preventive Services Task Force recommendation statement. JAMA. 2021;326(8):736-743.', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-prediabetes-and-type-2-diabetes' },
  uspstfLung: { short: 'USPSTF lung cancer screening, 2021', full: 'US Preventive Services Task Force. Screening for lung cancer: US Preventive Services Task Force recommendation statement. JAMA. 2021;325(10):962-970.', url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening' },
  cdcHpv: { short: 'CDC HPV vaccination recommendations', full: 'Meites E, Kempe A, Markowitz LE. Use of a 2-dose schedule for human papillomavirus vaccination: updated recommendations of the Advisory Committee on Immunization Practices. MMWR. 2016;65(49):1405-1408.', url: 'https://www.cdc.gov/hpv/hcp/vaccination-considerations/' },
});

// The usual plan for everyone. `key` lets a family item replace the usual one (for example, colon screening at 40 instead of 45).
const TIMELINE_BASE = [
  { key: 'chol1', age: 9, until: 11, title: 'Cholesterol test', text: 'Every child gets one cholesterol test between 9 and 11.', source: 'nhlbi' },
  { key: 'hpv', age: 11, until: 12, title: 'HPV vaccine', text: 'Two doses at 11 or 12 protect against six cancers, including cervical and throat cancer. Missed it? Catch-up doses are given through age 26.', source: 'cdcHpv' },
  { key: 'chol2', age: 17, until: 21, title: 'Second cholesterol test', text: 'Another cholesterol test between 17 and 21.', source: 'nhlbi' },
  { key: 'bp', age: 18, title: 'Blood pressure checks', text: 'Adults have their blood pressure checked every 3 to 5 years from 18, and every year from 40.', source: 'uspstfBp' },
  { key: 'cervical', sex: 'F', age: 21, title: 'Cervical cancer screening', text: 'A Pap test every 3 years from 21. From 30, an HPV test every 5 years is another option.', source: 'uspstfCervical' },
  { key: 'diabetes', age: 35, title: 'Diabetes screening', text: 'Adults 35 to 70 with overweight or obesity are checked for prediabetes and type 2 diabetes.', source: 'uspstfDiabetes' },
  { key: 'breast', sex: 'F', age: 40, title: 'Mammogram every 2 years', text: 'From 40 to 74.', source: 'uspstfBreast' },
  { key: 'colon', age: 45, title: 'Colon cancer screening', text: 'From 45 to 75: a colonoscopy every 10 years, or a simpler test more often.', source: 'uspstfCrc' },
  { key: 'prostate', sex: 'M', age: 50, title: 'Talk about prostate cancer screening', text: 'At average risk, the American Cancer Society suggests talking with a doctor about PSA screening from 50.', source: 'acsProstate' },
  { key: 'lung', age: 50, title: 'Lung cancer screening, if you ever smoke a lot', text: 'A yearly low-dose CT scan from 50 to 80 for people with a long smoking history. The best plan is never to start.', source: 'uspstfLung' },
];

// What each guideline card adds to the timeline. age: a number, 'now', or 'event' (when something comes up).
const TIMELINE_FROM_CARD = {
  'Start colon cancer screening early': c => [{ key: 'colon', age: c.start || 40, title: 'Colonoscopy, then every 5 years', text: 'Earlier than the usual 45 because of colon cancer in a parent or sibling.' }],
  'Start colon cancer screening at 40': () => [{ key: 'colon', age: 40, title: 'Colon cancer screening', text: 'At 40 instead of 45, because a parent or sibling had colon cancer.' }],
  'Colon polyps in a parent or sibling': () => [{ key: 'colon', age: 40, maybe: true, title: 'Colon cancer screening, possibly from 40', text: 'If the polyps in your parent or sibling were "advanced", screening starts at 40. Find out what kind they were.' }],
  'Ask about genetic counseling for inherited breast and ovarian cancer': () => [{ key: 'genetic', age: 'now', title: 'Genetic counseling', text: 'Ask about a referral for inherited breast and ovarian cancer (BRCA).' }],
  'Ashkenazi Jewish ancestry and BRCA': () => [{ key: 'genetic', age: 'now', title: 'BRCA risk assessment', text: 'Ask whether genetic counseling makes sense, because of Ashkenazi Jewish ancestry.' }],
  'Ask about genetic counseling for Lynch syndrome': () => [{ key: 'genetic', age: 'now', title: 'Genetic counseling', text: 'Ask about a referral for Lynch syndrome. If it is found, colonoscopy usually starts in your 20s.' }],
  'Ask about genetic testing because of ovarian or pancreatic cancer': () => [{ key: 'genetic', age: 'now', title: 'Genetic counseling', text: 'Ask about genetic testing because of ovarian or pancreatic cancer in the family.' }],
  'Get a copy of the genetic test result': () => [{ key: 'genetic-copy', age: 'now', title: "Get a copy of your relative's genetic test", text: 'Then ask whether you should be tested for the same gene change.' }],
  'Get a cholesterol test now': () => [{ key: 'chol1', age: 'now', title: 'Cholesterol test now', text: "Don't wait for the usual age. Early heart disease or high cholesterol in the family means testing early." }],
  'Ask about checking for inherited heart conditions': () => [{ key: 'heartcheck', age: 'now', title: 'Heart check', text: 'Ask about an ECG and a heart ultrasound because of inherited heart conditions or sudden deaths in the family.' }],
  'Ask about screening for type 1 diabetes': () => [{ key: 't1', age: 'now', title: 'Type 1 diabetes antibody test', text: 'Ask whether a blood test for early type 1 diabetes makes sense.' }],
  'Ask about testing for type 2 diabetes': () => [{ key: 'diabetes-teen', age: 10, title: 'Type 2 diabetes test, if you have overweight', text: 'From age 10 (or puberty) for young people with overweight and a family history of type 2 diabetes.' }],
  'Ancestry and type 2 diabetes': () => [{ key: 'diabetes', age: 35, title: 'Diabetes screening, at a lower weight', text: 'Adults of Asian ancestry are tested at a lower BMI (23 instead of 25).' }],
  'Talk about prostate cancer screening earlier': c => [{ key: 'prostate', age: c.start || 45, title: 'Talk about prostate cancer screening', text: 'Earlier than the usual 50 because of prostate cancer in a father or brother.' }],
  'Ancestry and prostate cancer': () => [{ key: 'prostate', age: 45, title: 'Talk about prostate cancer screening', text: 'From 45 instead of 50, because of Black ancestry.' }],
  'Thalassemia and sickle cell trait': () => [{ key: 'blood', age: 'now', title: 'Thalassemia or sickle cell trait test', text: 'A simple blood test, especially before planning a family one day.' }],
  'Get a hepatitis B blood test': () => [{ key: 'hepb', age: 'now', title: 'Hepatitis B blood test', text: 'And make sure your hepatitis B vaccines are done.' }],
  'Ask about a celiac blood test': () => [{ key: 'celiac', age: 'now', title: 'Celiac blood test, if you have symptoms', text: 'Such as stomach problems, tiredness or anemia.' }],
  'Polycystic kidney disease in a parent or sibling': () => [{ key: 'pkd', age: 18, title: 'Check for polycystic kidney disease', text: 'A kidney ultrasound or genetic test as an adult. Blood pressure checks before then.' }],
  'Glaucoma in a parent or sibling': () => [{ key: 'glaucoma', age: 35, title: 'Eye pressure checks', text: 'Earlier and more often than usual, because glaucoma runs in the family.' }],
  'Blood clots in a parent or sibling': () => [{ key: 'clots', age: 'event', title: 'Before estrogen birth control or surgery', text: 'Tell the doctor about blood clots in the family first.' }],
  'Tell every surgeon and dentist about the anesthesia reaction': () => [{ key: 'anesthesia', age: 'event', title: 'Before any surgery or dental work', text: 'Tell the team about the anesthesia reaction in the family.' }],
  'Parents related by blood': () => [{ key: 'carrier', age: 'event', title: 'When planning a family', text: 'Ask about carrier screening, because parents in the family were related by blood.' }],
};

const ageOf = p => p?.born && /^\d{4}$/.test(p.born) ? Math.max(0, YEAR - +p.born) : null;

// The merged plan: [{ age, until, title, text, source, family, maybe, catchUp }] in order.
function timelineItems() {
  const me = byId(SELF), now = ageOf(me);
  const forMe = it => !it.sex || me.sex === 'U' || it.sex === me.sex;
  const items = new Map(TIMELINE_BASE.filter(forMe).map(it => [it.key, { ...it, family: false }]));
  const cards = guidelineCards();
  for (const c of cards) for (const it of TIMELINE_FROM_CARD[c.title]?.(c) || []) {
    const prev = items.get(it.key), item = { ...it, family: true, source: c.sources[0], level: c.level };
    // Keep the earliest advice when two cards touch the same item; a "maybe" never replaces a firm earlier one.
    const rank = x => x.age === 'now' ? -1 : x.age === 'event' ? 999 : x.age;
    if (!prev || !prev.family || (rank(item) < rank(prev) && !(item.maybe && !prev.maybe))) items.set(it.key, item);
  }
  const list = [...items.values()].map(it => {
    const due = it.age === 'now' || (now != null && typeof it.age === 'number' && it.age <= now);
    // Usual items whose age range has passed become catch-up reminders.
    const catchUp = !it.family && now != null && typeof it.age === 'number' && (it.until ?? it.age) < now;
    return { ...it, due, catchUp };
  });
  const order = it => it.age === 'event' ? 1e4 : it.due ? (it.family ? -2 : -1) : it.age;
  return list.sort((a, b) => order(a) - order(b) || (b.family - a.family));
}

function timelineHTML({ compact = false } = {}) {
  const me = byId(SELF), now = ageOf(me), items = timelineItems();
  const fam = items.filter(it => it.family).length;
  const when = it => it.age === 'event' ? 'When it comes up' : it.due ? 'Now' : `At ${it.age}${it.until ? '–' + it.until : ''}${now != null ? ` · in ${it.age - now} year${it.age - now === 1 ? '' : 's'}` : ''}`;
  const groups = [['Now', items.filter(it => it.due && it.age !== 'event')], ['Later', items.filter(it => !it.due && it.age !== 'event')], ['When it comes up', items.filter(it => it.age === 'event')]].filter(([, l]) => l.length);
  return `<section class="card timeline-card" aria-label="My health timeline">
    <div><h2>My health timeline</h2>
      <p class="small muted">${now == null ? 'Add your birth year on the family tree to see how many years away each step is. ' : ''}${fam ? `<b>${fam} step${fam === 1 ? '' : 's'}</b> ${fam === 1 ? 'is' : 'are'} earlier or extra because of your family (marked in gold). ` : ''}The rest is the usual plan for everyone your age.</p></div>
    ${groups.map(([name, list]) => `<h3 class="tl-group">${name}</h3><ol class="timeline">${list.map(it => `<li class="${it.family ? 'fam' : ''}${it.catchUp ? ' catch' : ''}">
      <span class="tl-dot" aria-hidden="true"></span>
      <div>${it.due && it.age !== 'event' ? (it.catchUp ? '<span class="tl-when">If you missed it</span>' : '') : `<span class="tl-when">${esc(when(it))}</span>`}
        <span class="tl-title"><b>${esc(it.title)}</b>${it.family ? ' <span class="tl-tag">Because of your family</span>' : ''}</span>
        ${compact ? '' : `<p class="small">${esc(it.text)}${it.source && SOURCES[it.source] ? ` <span class="src">${esc(SOURCES[it.source].short)}</span>` : ''}</p>`}</div></li>`).join('')}</ol>`).join('')}
    <p class="fine">Based on US guidelines. Your doctor decides what is right for you, and the plan can change as your family history grows.</p>
  </section>`;
}
// Plain-text lines for the summary and PDF.
function timelineLines() {
  return timelineItems().map(it => `${it.age === 'event' ? 'When it comes up' : it.due ? 'Now' : 'At ' + it.age}: ${it.title}${it.family ? ' (because of family history)' : ''}${it.catchUp ? ' (if missed)' : ''}`);
}
