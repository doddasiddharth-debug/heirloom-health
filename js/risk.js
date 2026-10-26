// Health facts, guideline rules and interview suggestions.
//
// Every health answer is stored as a "report": who it is about, what condition, the age, who said it.
// Reports about the same person and condition are merged into one "fact", and the app flags
// when the people it heard from disagree.
'use strict';

/* ---------- Reports and merged facts ---------- */
function findReport(pid, cond, type, by) { return S.reports.find(r => r.pid === pid && r.cond === cond && (r.type || '') === (type || '') && r.by === by); }
function addReport(pid, cond, type, by, fields = {}) {
  let r = findReport(pid, cond, type, by);
  if (!r) { r = { id: uid('r'), pid, cond, type: type || '', age: '', said: '', by, at: today() }; S.reports.push(r); }
  Object.assign(r, fields);
  return r;
}
function dropReports(pred) { S.reports = S.reports.filter(r => !pred(r)); }

// facts(pid) → [{cond, type, age, reports, disagree, ages}] sorted in condition order.
function facts(pid) {
  const mine = S.reports.filter(r => r.pid === pid);
  const groups = new Map();
  for (const r of mine) {
    const key = r.cond + '|' + (r.type || '');
    if (!groups.has(key)) groups.set(key, { cond: r.cond, type: r.type || '', reports: [] });
    groups.get(key).reports.push(r);
  }
  // "Cancer, kind unknown" from one person and "breast cancer" from another are probably the same cancer.
  for (const cond of Object.keys(SUBTYPES)) {
    const typed = [...groups.values()].filter(g => g.cond === cond && g.type);
    const untyped = groups.get(cond + '|');
    if (untyped && typed.length === 1) { typed[0].reports.push(...untyped.reports); groups.delete(cond + '|'); }
  }
  const order = c => CONDS.findIndex(x => x.id === c.cond) * 100 + (c.type ? (SUBTYPES[c.cond] || []).findIndex(t => t.id === c.type) : 99);
  return [...groups.values()].map(g => {
    const ages = g.reports.map(r => +r.age).filter(a => a > 0);
    const min = ages.length ? Math.min(...ages) : null, max = ages.length ? Math.max(...ages) : null;
    return { ...g, age: min ? String(min) : '', ages, disagree: ages.length > 1 && max - min >= 3, range: min && max !== min ? `${min}–${max}` : '' };
  }).sort((a, b) => order(a) - order(b));
}
const reporterName = id => id === SELF ? 'You' : (byId(id) ? nameOf(byId(id)) : 'A relative');
function isBlank(p) { return p.id !== SELF && !p.born && p.living === 'unknown' && !facts(p.id).length && !p.notes; }

/* ---------- Guideline rules ---------- */
// Each rule looks at your blood relatives and returns cards:
// { level: 'act' | 'discuss' | 'note' | 'missing', title, rec, why: [...], sources: [...] }
function bloodRelatives() { return S.people.filter(p => p.id !== SELF && kin(p.id).blood); }
// A cancer that cannot happen for the person's recorded sex (likely a mix-up) is kept on the record but left out of the rules.
const SEX_ONLY_CANCERS = { ovarian: 'F', uterine: 'F', prostate: 'M' };
const possibleFor = (p, f) => !(f.cond === 'cancer' && SEX_ONLY_CANCERS[f.type] && ['F', 'M'].includes(p.sex) && p.sex !== SEX_ONLY_CANCERS[f.type]);
function withFact(test, maxDegree = 3) {
  const out = [];
  for (const p of bloodRelatives()) {
    const k = kin(p.id);
    if (k.degree > maxDegree) continue;
    for (const f of facts(p.id)) if (possibleFor(p, f) && test(f)) out.push({ p, f, k, age: +f.age || null });
  }
  return out;
}
const who = x => `${x.k.label} (${nameOf(x.p)})`;
const atAge = x => x.age ? `at ${x.age}` : 'age unknown';
const isCancer = (...types) => f => f.cond === 'cancer' && types.includes(f.type);

function ruleColorectal() {
  const crc = withFact(isCancer('colorectal'));
  const fdr = crc.filter(x => x.k.degree === 1), other = crc.filter(x => x.k.degree > 1);
  const src = ['usmstf', 'uspstfCrc'];
  if (fdr.some(x => !x.age || x.age < 60) || fdr.length >= 2) {
    const ages = fdr.map(x => x.age).filter(Boolean), youngest = ages.length ? Math.min(...ages) : null;
    const start = youngest ? Math.min(40, youngest - 10) : 40;
    return [{ level: 'act', title: 'Start colon cancer screening early',
      rec: `Start colonoscopy at age ${start} and repeat every 5 years. Most people start at 45. The rule is age 40, or 10 years before the youngest close relative's diagnosis, whichever comes first.`,
      why: [...fdr.map(x => `${who(x)}: colorectal cancer ${atAge(x)}.`), ...(fdr.some(x => !x.age) ? ['An age is missing, so the earlier rule is used to be safe.'] : [])], sources: src }];
  }
  if (fdr.length === 1) return [{ level: 'discuss', title: 'Start colon cancer screening at 40',
    rec: 'One parent or sibling diagnosed at 60 or older: start screening at 40 instead of 45, at the usual intervals.', why: fdr.map(x => `${who(x)}: colorectal cancer ${atAge(x)}.`), sources: src }];
  if (other.length) return [{ level: 'note', title: 'Colon cancer in more distant relatives',
    rec: 'Colon cancer in a grandparent, aunt, uncle or cousin does not change screening on its own under these guidelines. Still mention it.', why: other.map(x => `${who(x)}: colorectal cancer ${atAge(x)}.`), sources: src }];
  return [];
}

function ruleFHS7() {
  const rel = withFact(f => f.cond === 'cancer', 3);
  const breast = rel.filter(x => isBreast(x.f.type)), ovarian = rel.filter(x => x.f.type === 'ovarian'), bowel = rel.filter(x => x.f.type === 'colorectal');
  const people = list => [...new Set(list.map(x => x.p.id))];
  const items = [
    ['A parent, sibling or child had breast or ovarian cancer', [...breast, ...ovarian].filter(x => x.k.degree === 1)],
    ['A relative had cancer in both breasts', breast.filter(x => x.f.type === 'breast2')],
    ['A man in the family had breast cancer', breast.filter(x => x.p.sex === 'M')],
    ['A woman in the family had both breast and ovarian cancer', breast.filter(x => x.p.sex === 'F' && ovarian.some(o => o.p.id === x.p.id))],
    ['A woman in the family had breast cancer before 50', breast.filter(x => x.p.sex === 'F' && x.age && x.age < 50)],
    ['Two or more relatives had breast and/or ovarian cancer', people([...breast, ...ovarian]).length >= 2 ? [...breast, ...ovarian] : []],
    ['Two or more relatives had breast and/or bowel cancer', people([...breast, ...bowel]).length >= 2 ? [...breast, ...bowel] : []],
  ];
  const yes = items.filter(([, hits]) => hits.length);
  const src = ['uspstfBrca', 'fhs7', 'nccn'];
  if (yes.length) return [{ level: 'act', title: 'Ask about genetic counseling for inherited breast and ovarian cancer',
    rec: `Your family answers "yes" to ${yes.length} of the 7 questions on the Family History Screen 7. One "yes" is enough for the USPSTF to recommend genetic counseling, which can lead to testing for BRCA1 and BRCA2. The tool was validated for women. Men can ask too, because BRCA changes also raise the risk of breast, prostate and pancreatic cancer in men.`,
    why: yes.map(([q, hits]) => `${q}: ${people(hits).map(id => nameOf(byId(id))).join(', ')}.`), sources: src }];
  if (breast.length || ovarian.length) return [{ level: 'note', title: 'Breast or ovarian cancer screen: no flags',
    rec: 'Your family answers "no" to all 7 Family History Screen 7 questions, so this pattern alone does not call for genetic counseling.', why: [...breast, ...ovarian].map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} ${atAge(x)}.`), sources: src }];
  return [];
}

function ruleLynch() {
  const lynchTypes = CANCER_TYPES.filter(t => t.lynch).map(t => t.id);
  const all = [...withFact(isCancer(...lynchTypes), 4)];
  for (const f of facts(SELF)) if (possibleFor(byId(SELF), f) && isCancer(...lynchTypes)(f)) all.push({ p: byId(SELF), f, k: kin(SELF), age: +f.age || null });
  const ids = [...new Set(all.map(x => x.p.id))];
  const gen = generations();
  // Amsterdam II is judged within one lineage: relatives joined to each other by parent/child/full-sibling links.
  const cluster = new Map(ids.map(id => [id, id]));
  const root = id => cluster.get(id) === id ? id : root(cluster.get(id));
  for (const a of ids) for (const b of ids) if (a < b && firstDegreePair(a, b)) cluster.set(root(a), root(b));
  const meets = [...new Set(ids.map(root))].some(r => {
    const grp = ids.filter(id => root(id) === r);
    const linked = grp.some(a => grp.filter(b => b !== a && firstDegreePair(a, b)).length >= 2);
    const successive = grp.some(a => grp.some(b => Math.abs(gen.get(a) - gen.get(b)) === 1));
    const young = all.some(x => grp.includes(x.p.id) && x.age && x.age < 50);
    return grp.length >= 3 && linked && successive && young;
  });
  const src = ['amsterdam', 'nccn'];
  const why = all.map(x => `${x.p.id === SELF ? 'You' : who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} ${atAge(x)}.`);
  if (meets) return [{ level: 'act', title: 'Ask about genetic counseling for Lynch syndrome',
    rec: 'Your family meets the Amsterdam II criteria: 3 or more relatives with Lynch-related cancers (colon, uterus, small intestine, ureter), one of them a parent, child or sibling of the other two, across 2 generations in a row, with at least one diagnosed before 50. Lynch syndrome is inherited and raises cancer risk, and screening for it starts much earlier.', why, sources: src }];
  const earlyFdr = all.filter(x => x.k.degree === 1 && x.age && x.age < 50 && ['colorectal', 'uterine'].includes(x.f.type));
  if (earlyFdr.length) return [{ level: 'act', title: 'Ask about genetic counseling for Lynch syndrome',
    rec: 'A parent or sibling with colon or uterine cancer before 50 is a reason NCCN guidelines give for genetic evaluation.', why: earlyFdr.map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} ${atAge(x)}.`), sources: ['nccn'] }];
  if (ids.length >= 2) return [{ level: 'discuss', title: 'Several relatives with Lynch-related cancers',
    rec: `${ids.length} relatives had cancers linked to Lynch syndrome. This does not meet the Amsterdam II criteria yet, but ask whether a closer look is worthwhile.`, why, sources: src }];
  return [];
}

function ruleOvarianPancreatic() {
  const hits = withFact(isCancer('ovarian', 'pancreatic'), 2);
  if (!hits.length) return [];
  return [{ level: 'act', title: 'Ask about genetic testing because of ovarian or pancreatic cancer',
    rec: 'NCCN guidelines suggest genetic testing for close relatives of someone with ovarian or pancreatic cancer, at any age. Testing the relative who had the cancer is most informative, if that is still possible.',
    why: hits.map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} ${atAge(x)}.`), sources: ['nccn'] }];
}

function ruleHeart() {
  const early = x => x.age && x.age < (x.p.sex === 'F' ? 65 : 55);
  const cvd = withFact(f => (f.cond === 'heart' && ['', 'attack', 'failure'].includes(f.type)) || f.cond === 'stroke', 2);
  const premature = cvd.filter(early);
  const parentChol = withFact(f => f.cond === 'chol', 1).filter(x => x.k.dS === 1 && x.k.dX === 0);
  const out = [];
  if (premature.length || parentChol.length) {
    const why = [...premature.map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} at ${x.age}, which counts as early (before ${x.p.sex === 'F' ? 65 : 55}).`),
      ...parentChol.map(x => `${who(x)}: high cholesterol${x.age ? ' found at ' + x.age : ''}.`)];
    if (premature.length && parentChol.length) why.push('Early heart disease together with high cholesterol in a parent can be a sign of familial hypercholesterolemia, an inherited condition that is very treatable when found early.');
    out.push({ level: 'act', title: 'Get a cholesterol test now',
      rec: 'Children and teens usually get one cholesterol test at 9–11 and another at 17–21. With this family history, the NHLBI recommends testing earlier, from age 2 up.',
      why, sources: ['nhlbi'] });
  }
  const fdr = premature.filter(x => x.k.degree === 1);
  if (fdr.length) out.push({ level: 'discuss', title: 'Early heart disease in a parent or sibling',
    rec: 'For adults, doctors count early heart disease in a parent or sibling as a "risk-enhancing factor" when deciding on cholesterol treatment. Keep it on your record for the future.',
    why: fdr.map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} at ${x.age}.`), sources: ['accaha'] });
  const unknownAge = cvd.filter(x => !x.age);
  if (unknownAge.length) out.push({ level: 'missing', title: 'Find out when heart disease or stroke started',
    rec: 'Whether heart disease counts as "early" depends on the age it started. These ages are missing.', why: unknownAge.map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()}, age unknown.`), sources: ['nhlbi'] });
  return out;
}

function ruleDiabetes() {
  const out = [];
  const t1 = withFact(f => f.cond === 'diabetes' && f.type === 't1', 1);
  if (t1.length) out.push({ level: 'discuss', title: 'Ask about screening for type 1 diabetes',
    rec: 'Type 1 diabetes in a parent or sibling raises your chance of it. The ADA says close relatives can be offered a blood test for diabetes antibodies, which can show type 1 diabetes years before symptoms. Know the warning signs: strong thirst, peeing a lot, and losing weight without trying.',
    why: t1.map(x => `${who(x)}: type 1 diabetes ${atAge(x)}.`), sources: ['ada'] });
  const hits = withFact(f => f.cond === 'diabetes' && ['', 't2', 'gest'].includes(f.type), 2);
  if (!hits.length) return out;
  const why = hits.map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} ${atAge(x)}.`);
  if (hits.some(x => x.k.dS === 1 && x.k.dX === 0 && x.p.sex === 'F')) why.push("Your mother's diabetes, including diabetes during pregnancy, is listed as its own risk factor.");
  return [...out, { level: 'discuss', title: 'Ask about testing for type 2 diabetes',
    rec: 'The ADA recommends testing young people for type 2 diabetes from age 10, or once puberty starts, if they have overweight or obesity plus at least one risk factor. A parent, grandparent, aunt, uncle or sibling with type 2 diabetes is a risk factor. So is Asian American, Black, Hispanic or Latino, Native American or Pacific Islander heritage. For Asian American adults, ADA tests at a lower BMI (23 instead of 25).',
    why, sources: ['ada'] }];
}

function ruleProstate() {
  if (byId(SELF).sex !== 'M') return [];
  const hits = withFact(isCancer('prostate'), 1).filter(x => x.p.sex === 'M');
  if (!hits.length) return [];
  const young = hits.filter(x => x.age && x.age < 65), noAge = hits.filter(x => !x.age);
  const why = hits.map(x => `${who(x)}: prostate cancer ${atAge(x)}.`);
  // The American Cancer Society's earlier start (45, or 40) is for a father or brother diagnosed before 65.
  if (!young.length && !noAge.length) return [{ level: 'note', title: 'Prostate cancer in a father or brother',
    rec: 'A father or brother had prostate cancer at 65 or older. The American Cancer Society moves the PSA screening talk earlier only when the diagnosis came before 65, so the usual plan applies: talk about it from age 50. Still mention it to your doctor.',
    why, sources: ['acsProstate'] }];
  return [{ level: 'discuss', title: 'Talk about prostate cancer screening earlier',
    rec: young.length >= 2 ? 'More than one father or brother had prostate cancer before 65. The American Cancer Society suggests talking about PSA screening from age 40.'
      : young.length ? 'A father or brother had prostate cancer before 65. The American Cancer Society suggests talking about PSA screening from age 45 (40 if more than one was diagnosed before 65).'
      : 'A father or brother had prostate cancer. If it was found before 65, the American Cancer Society suggests talking about PSA screening from age 45 (40 if more than one was diagnosed before 65).',
    why: [...why, ...(noAge.length ? ['An age is missing, so the earlier rule is used to be safe. Find out how old they were.'] : [])], sources: ['acsProstate'] }];
}

// Colon polyps: USMSTF treats an advanced polyp in a parent or sibling like colon cancer for screening age.
function rulePolyps() {
  const fdr = withFact(f => f.cond === 'polyps', 1);
  if (!fdr.length) return [];
  return [{ level: 'discuss', title: 'Colon polyps in a parent or sibling',
    rec: 'Find out what kind of polyps they were. If a parent or sibling had an "advanced" polyp (large, or with pre-cancer changes), the US Multi-Society Task Force recommends starting colonoscopy at 40, or 10 years before their age when it was found. Smaller polyps usually do not change the plan.',
    why: fdr.map(x => `${who(x)}: colon polyps ${atAge(x)}.`), sources: ['usmstf'] }];
}
// Heart muscle and rhythm conditions, and sudden deaths, can be inherited and found early in relatives.
function ruleInheritedHeart() {
  const heart = withFact(f => f.cond === 'heart' && ['muscle', 'rhythm'].includes(f.type), 2);
  const sudden = checkAnswers('sudden');
  if (!heart.length && !sudden.length) return [];
  const close = heart.filter(x => x.k.degree === 1);
  return [{ level: close.length || sudden.length ? 'act' : 'discuss', title: 'Ask about checking for inherited heart conditions',
    rec: 'Some heart muscle (cardiomyopathy) and heart rhythm conditions run in families and can cause fainting or sudden death in young people. Heart guidelines recommend that close relatives be checked, usually with an ECG and a heart ultrasound, and sometimes a genetic test. Tell your doctor right away if you ever faint during exercise.',
    why: [...heart.map(x => `${who(x)}: ${factName(x.f.cond, x.f.type).toLowerCase()} ${atAge(x)}.`), ...sudden.map(c => `${reporterName(c.by)} said someone died suddenly young, fainted while exercising, or drowned${c.note ? ': ' + c.note : ''}.`)],
    sources: ['ahaHcm', 'ahaScd'] }];
}
// Answers to the whole-family questions, from everyone who was interviewed.
function checkAnswers(key, answer = 'yes') {
  return S.people.filter(p => p.checks?.[key]?.a === answer).map(p => ({ by: p.id, note: p.checks[key].note || '' }));
}
function ruleFamilyQuestions() {
  const out = [], said = (list, what) => list.map(c => `${reporterName(c.by)}: ${c.note || what}`);
  const gen = checkAnswers('genetic');
  if (gen.length) out.push({ level: 'act', title: 'Get a copy of the genetic test result',
    rec: 'A relative had a genetic test. If it found a change in a gene (a "variant"), close relatives can be tested for that exact change, which is quicker and more certain than testing from scratch. Ask for a copy of the report and bring it to your doctor or a genetic counselor.',
    why: said(gen, 'someone in the family had a genetic test.'), sources: ['nsgcPedigree', 'nccn'] });
  const rel = checkAnswers('related');
  if (rel.length) out.push({ level: 'discuss', title: 'Parents related by blood',
    rec: 'When parents are related, for example cousins, conditions that need a gene change from both parents are more likely. This is common and usually causes no problems, but doctors want to know. When you plan a family one day, carrier screening can be offered.',
    why: said(rel, 'parents in the family were related by blood.'), sources: ['nsgcConsang'] });
  const preg = checkAnswers('pregnancy'), birth = checkAnswers('birth');
  if (preg.length || birth.length) out.push({ level: 'discuss', title: 'Pregnancy losses, birth differences or childhood conditions',
    rec: 'Several miscarriages or stillbirths, babies born with health problems, or children with learning or hearing problems can sometimes point to a condition that runs in the family. Mention them to your doctor, who may suggest a genetic counselor.',
    why: [...said(preg, 'miscarriages, stillbirths or infant deaths in the family.'), ...said(birth, 'a birth difference or childhood learning or hearing problem in the family.')], sources: ['nsgcPedigree'] });
  const anes = checkAnswers('anesthesia');
  if (anes.length) out.push({ level: 'act', title: 'Tell every surgeon and dentist about the anesthesia reaction',
    rec: 'A serious reaction to anesthesia, such as a sudden very high fever (malignant hyperthermia), can run in families. Before any operation or dental work with anesthesia, tell the team, so they can use medicines that are safe for you.',
    why: said(anes, 'someone had a serious reaction to anesthesia.'), sources: ['mhaus'] });
  return out;
}
function ruleOtherConditions() {
  const out = [];
  const hepb = withFact(f => f.cond === 'liver' && f.type === 'hepb', 2);
  if (hepb.length) out.push({ level: 'act', title: 'Get a hepatitis B blood test',
    rec: 'Hepatitis B can pass from a mother to her baby and between people who live together. The CDC recommends testing for anyone with a family member or household member who has it, and the vaccine protects you if you test negative.',
    why: hepb.map(x => `${who(x)}: hepatitis B.`), sources: ['cdcHepB'] });
  const celiac = withFact(f => f.cond === 'celiac', 1);
  if (celiac.length) out.push({ level: 'discuss', title: 'Ask about a celiac blood test',
    rec: 'Celiac disease is much more common in parents, brothers, sisters and children of people who have it. The American College of Gastroenterology recommends a blood test for close relatives who have symptoms, and says it can be considered even without symptoms.',
    why: celiac.map(x => `${who(x)}: celiac disease ${atAge(x)}.`), sources: ['acgCeliac'] });
  const clots = withFact(f => f.cond === 'clots', 1);
  if (clots.length) out.push({ level: 'discuss', title: 'Blood clots in a parent or sibling',
    rec: 'Tell your doctor before starting birth control or other medicine with estrogen, and before surgery. Blood-clot guidelines suggest testing for an inherited clotting problem in some situations, for example a woman considering estrogen whose parent or sibling had a clot.',
    why: clots.map(x => `${who(x)}: blood clots ${atAge(x)}.`), sources: ['ashVte'] });
  const pkd = withFact(f => f.cond === 'kidney' && f.type === 'pkd', 1);
  if (pkd.length) out.push({ level: 'discuss', title: 'Polycystic kidney disease in a parent or sibling',
    rec: 'Polycystic kidney disease is usually inherited. Have your blood pressure checked regularly. As an adult, a kidney ultrasound or a genetic test can show whether you have it, and early treatment can protect the kidneys.',
    why: pkd.map(x => `${who(x)}: polycystic kidney disease ${atAge(x)}.`), sources: ['kdigoPkd'] });
  const glaucoma = withFact(f => f.cond === 'glaucoma', 1);
  if (glaucoma.length) out.push({ level: 'note', title: 'Glaucoma in a parent or sibling',
    rec: 'Glaucoma has no early symptoms, and a parent or sibling with it is one of the biggest risk factors. Tell your eye doctor. As an adult, get eye pressure checks earlier and more often than usual.',
    why: glaucoma.map(x => `${who(x)}: glaucoma ${atAge(x)}.`), sources: ['aaoGlaucoma'] });
  return out;
}

// Illnesses typed in under "Something else". No rule here knows them, so make sure the doctor looks.
function ruleOtherReported() {
  const hits = withFact(f => f.cond === 'other', 3);
  if (!hits.length) return [];
  return [{ level: 'note', title: 'Other conditions in the family',
    rec: "These were named by relatives and aren't covered by the rules in this app. Ask your doctor whether any of them run in families or change your care.",
    why: hits.map(x => `${who(x)}: ${factName('other', x.f.type)} ${atAge(x)}.`), sources: [] }];
}
function ruleDisagreements() {
  const lines = [];
  for (const p of S.people) for (const f of facts(p.id)) if (f.disagree) {
    lines.push(`${nameOf(p)}, ${factName(f.cond, f.type).toLowerCase()}: ${f.reports.filter(r => +r.age).map(r => `${reporterName(r.by)} said ${r.age}`).join(', ')}.`);
  }
  return lines.length ? [{ level: 'note', title: 'Family members remember different ages', rec: 'This report uses the youngest age, which is the cautious choice. Ask again, or check old medical papers, if you can.', why: lines, sources: [] }] : [];
}

function ruleNotBlood() {
  const nb = S.people.filter(p => p.id !== SELF && !kin(p.id).blood && facts(p.id).length);
  return nb.length ? [{ level: 'note', title: 'Relatives who are not blood related',
    rec: "These relatives married into the family or are related by adoption. Their conditions don't change your inherited risk, so the rules above leave them out. Shared meals and habits still matter, so they stay on the chart.",
    why: nb.map(p => `${relOf(p)} (${nameOf(p)}): ${facts(p.id).map(f => factName(f.cond, f.type).toLowerCase()).join(', ')}.`), sources: [] }] : [];
}

function ruleMissing() {
  const close = bloodRelatives().filter(p => kin(p.id).degree <= 2);
  const blank = close.filter(isBlank);
  const out = [];
  if (blank.length) out.push({ level: 'missing', title: 'Close relatives with nothing recorded', rec: 'Parents, siblings, grandparents, aunts and uncles carry the most weight in these rules. See "Who to ask next" for who can fill these in.', why: blank.map(p => `${relOf(p)}${p.name ? ' (' + p.name + ')' : ''}.`), sources: [] });
  return out;
}

function myAncestry() { return new Set(byId(SELF)?.ancestry || []); }
function ancestryRulesFor(topic) { const mine = myAncestry(); return ANCESTRY_RULES.filter(r => r.topic === topic && r.groups.some(g => mine.has(g))); }
function ruleAncestry() {
  const mine = myAncestry(), me = byId(SELF), seen = new Set(), out = [];
  for (const r of ANCESTRY_RULES) {
    if (!r.groups.some(g => mine.has(g)) || seen.has(r.title)) continue;
    const topic = RISK_TOPICS.find(t => t.key === r.topic);
    if (topic?.sex && me.sex !== 'U' && topic.sex !== me.sex) continue;
    seen.add(r.title);
    out.push({ level: r.level, title: r.title, rec: r.text, why: [`Ancestry you entered: ${ANCESTRIES.filter(a => mine.has(a.id) && r.groups.includes(a.id)).map(a => a.en).join(', ')}.`], sources: [r.source] });
  }
  return out;
}
function guidelineCards() {
  const cards = [ruleColorectal, rulePolyps, ruleAncestry, ruleFHS7, ruleLynch, ruleOvarianPancreatic, ruleHeart, ruleInheritedHeart, ruleDiabetes, ruleProstate, ruleFamilyQuestions, ruleOtherConditions, ruleOtherReported, ruleDisagreements, ruleNotBlood, ruleMissing].flatMap(r => r());
  const rank = { act: 0, discuss: 1, note: 2, missing: 3 };
  return cards.sort((a, b) => rank[a.level] - rank[b.level]);
}

/* ---------- Who to ask next ---------- */
function gapsOf(p) {
  if (p.id === SELF) return [];
  if (isBlank(p)) return ['nothing recorded yet'];
  const g = [];
  if (p.living === 'unknown') g.push('whether they are living');
  if (p.living === 'no' && !p.deathAge) g.push('age at death');
  if (p.living === 'no' && !p.cause) g.push('cause of death');
  for (const f of facts(p.id)) {
    if (f.cond === 'cancer' && !f.type) g.push('what kind of cancer');
    if (f.cond === 'diabetes' && !f.type) g.push('which type of diabetes');
    if (!f.age) g.push(`when ${factName(f.cond, f.type).toLowerCase()} started`);
    if (f.disagree) g.push(`the right age for ${factName(f.cond, f.type).toLowerCase()}`);
  }
  return g;
}
// Score each living relative by how much missing, risk-relevant information they could fill in.
function suggestInterviews(limit = 3) {
  const weight = p => { const k = kin(p.id); return !k.blood ? 0 : ({ 1: 3, 2: 2, 3: 1 }[k.degree] || 0.5); };
  const out = [];
  for (const I of S.people) {
    if (I.id === SELF || I.living === 'no') continue;
    const circle = [[I.id, 1], ...parentLinks(I.id).map(l => [l.id, 0.9]), ...siblingsOf(I.id).map(id => [id, 0.8]), ...childLinks(I.id).map(l => [l.id, 0.8]),
      ...partnersOf(I.id).map(id => [id, 0.8]), ...parentLinks(I.id).flatMap(l => parentLinks(l.id)).map(l => [l.id, 0.5])];
    const seen = new Set(), items = [];
    for (const [tid, factor] of circle) {
      if (seen.has(tid) || tid === SELF) continue;
      seen.add(tid);
      const T = byId(tid), gaps = gapsOf(T), w = weight(T);
      if (!gaps.length || !w) continue;
      items.push({ T, gaps, score: w * Math.min(gaps.length, 3) * factor });
    }
    if (!items.length) continue;
    const score = items.reduce((a, b) => a + b.score, 0) * (I.interviewed ? 0.35 : 1);
    items.sort((a, b) => b.score - a.score);
    out.push({ I, score, items: items.slice(0, 3) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ---------- Family-history risk levels (My risks tab) ----------
   Based on the Scheuner method used in CDC Family Healthware:
     High:     a parent or sibling had it early; two or more parents/siblings had it;
               a parent/sibling plus an early grandparent/aunt/uncle on the same side;
               two grandparents/aunts/uncles on one side with at least one early;
               three or more relatives on one side; a moderate pattern on both sides;
               (heart disease) any early grandparent, aunt or uncle.
     Moderate: one parent or sibling (not early); two grandparents/aunts/uncles on one side (not early).
     Average:  only one more distant relative, or none. */
function lineageOf(x) {
  if (x.k.degree === 1) return x.k.dX === 0 ? (x.p.sex === 'F' ? 'maternal' : x.p.sex === 'M' ? 'paternal' : 'unknown') : 'both';
  return x.k.side || 'unknown';
}
const SIDE_NAME = { maternal: "Mom's", paternal: "Dad's" };
function familyRisk() {
  const me = byId(SELF);
  return RISK_TOPICS.filter(t => !t.sex || me.sex === 'U' || t.sex === me.sex).map(t => {
    const seen = new Map();
    for (const x of withFact(f => f.cond === t.cond && (!t.types || t.types.includes(f.type)), 3)) {
      const prev = seen.get(x.p.id);
      if (!prev || (x.age && (!prev.age || x.age < prev.age))) seen.set(x.p.id, x);
    }
    const hits = [...seen.values()];
    const early = x => !!(x.age && x.age < t.early(x.p));
    const fdr = hits.filter(x => x.k.degree === 1), sdr = hits.filter(x => x.k.degree === 2);
    const onSide = (list, side) => list.filter(x => lineageOf(x) === side || lineageOf(x) === 'both');
    const high = [], moderate = [], moderateSides = [];
    if (fdr.some(early)) high.push('A parent or sibling had it at a young age.');
    if (fdr.length >= 2) high.push('Two or more parents or siblings had it.');
    if (t.key === 'heart' && sdr.some(early)) high.push('A grandparent, aunt or uncle had heart disease at a young age.');
    for (const side of ['maternal', 'paternal']) {
      const f = onSide(fdr, side), s = sdr.filter(x => lineageOf(x) === side), all = onSide(hits.filter(x => x.k.degree <= 2), side);
      if (f.length && s.some(early)) high.push(`A parent or sibling, plus a grandparent, aunt or uncle on ${SIDE_NAME[side]} side who had it young.`);
      if (s.length >= 2 && s.some(early)) high.push(`Two grandparents, aunts or uncles on ${SIDE_NAME[side]} side, at least one at a young age.`);
      if (all.length >= 3) high.push(`${all.length} relatives on ${SIDE_NAME[side]} side.`);
      if (s.length >= 2) moderate.push(`Two grandparents, aunts or uncles on ${SIDE_NAME[side]} side.`);
      // A parent counts for one side only; a full sibling is shared by both, so does not make a side moderate alone.
      if (s.length >= 2 || fdr.some(x => lineageOf(x) === side)) moderateSides.push(side);
    }
    if (moderateSides.length === 2) high.push("A pattern on both Mom's and Dad's sides of the family.");
    if (fdr.length === 1) moderate.push('One parent or sibling had it.');
    // Keep this page consistent with the doctor report: a guideline that calls for genetic counseling raises the level.
    const flagged = (['breast', 'ovarian'].includes(t.key) && ruleFHS7()[0]?.level === 'act') || (['colorectal', 'uterine'].includes(t.key) && ruleLynch()[0]?.level === 'act') || (['ovarian', 'pancreatic'].includes(t.key) && ruleOvarianPancreatic().length);
    if (flagged && hits.length) moderate.push('A screening guideline flags this family pattern for genetic counseling. See the doctor report.');
    // Ancestry can raise a topic by itself (see ANCESTRY_RULES in content.js).
    const anc = ancestryRulesFor(t.key);
    const level = high.length ? 'high' : moderate.length || anc.length ? 'moderate' : 'average';
    const reasons = [...new Set(level === 'high' ? high : moderate.length ? moderate : hits.length && !anc.length ? ['Only a more distant relative had it, which is close to average risk.'] : [])].slice(0, 2);
    const score = { high: 300, moderate: 200, average: 100 }[level] + (anc.length ? 5 : 0) + hits.filter(early).length * 20 + hits.reduce((a, x) => a + (4 - Math.min(x.k.degree, 3)) * 5, 0);
    return { t, level, hits, reasons, early, score, ancestry: anc };
  }).filter(r => r.hits.length || r.ancestry.length).sort((a, b) => b.score - a.score);
}
