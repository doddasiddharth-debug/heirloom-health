// Medical-records export: the family history as an HL7 FHIR R4 Bundle that a clinic system can import.
//
// The Bundle (type "collection") holds one Patient ("you"), one FamilyMemberHistory per relative, and
// Observations for the whole-family answers (genetic tests, sudden deaths, ancestry and so on).
// Every code below was checked against the published code systems:
//   - Relationship codes: HL7 v3 RoleCode (terminology.hl7.org, THO 7.0.1), all active and under FAMMEMB.
//   - Condition codes: SNOMED CT concept IDs and displays as listed in NLM VSAC / CDC PHIN VADS value sets.
// Conditions without a code that means exactly the same thing are sent as text only.
'use strict';

const FHIR_SCT = 'http://snomed.info/sct';
const FHIR_ROLE = 'http://terminology.hl7.org/CodeSystem/v3-RoleCode';
const FHIR_GENDER = 'http://hl7.org/fhir/administrative-gender';
const FHIR_UCUM = 'http://unitsofmeasure.org';

// SNOMED CT codes by condition, then by kind ('' = kind unknown). A missing entry means text only.
const FHIR_SNOMED = {
  heart: { '': ['56265001', 'Heart disease (disorder)'], attack: ['414545008', 'Ischemic heart disease (disorder)'], muscle: ['85898001', 'Cardiomyopathy (disorder)'],
    rhythm: ['698247007', 'Cardiac arrhythmia (disorder)'], failure: ['84114007', 'Heart failure (disorder)'], birth: ['13213009', 'Congenital heart disease (disorder)'] },
  stroke: { '': ['230690007', 'Cerebrovascular accident (disorder)'] },
  bp: { '': ['38341003', 'Hypertensive disorder, systemic arterial (disorder)'] },
  chol: { '': ['13644009', 'Hypercholesterolemia (disorder)'] },
  diabetes: { '': ['73211009', 'Diabetes mellitus (disorder)'], t2: ['44054006', 'Diabetes mellitus type 2 (disorder)'], t1: ['46635009', 'Diabetes mellitus type 1 (disorder)'],
    gest: ['11687002', 'Gestational diabetes mellitus (disorder)'] },
  cancer: { '': ['363346000', 'Malignant neoplastic disease (disorder)'], other: ['363346000', 'Malignant neoplastic disease (disorder)'],
    breast: ['254837009', 'Malignant neoplasm of breast (disorder)'], breast2: ['1306511004', 'Primary malignant neoplasm of bilateral breasts (disorder)'],
    ovarian: ['363443007', 'Malignant neoplasm of ovary (disorder)'], colorectal: ['1286877004', 'Malignant neoplasm of cecum and/or colon and/or rectum (disorder)'],
    uterine: ['371973000', 'Malignant neoplasm of uterus (disorder)'], smallbowel: ['363509000', 'Malignant tumor of small intestine (disorder)'],
    prostate: ['399068003', 'Malignant neoplasm of prostate (disorder)'], pancreatic: ['363418001', 'Malignant tumor of pancreas (disorder)'],
    stomach: ['363349007', 'Malignant tumor of stomach (disorder)'], lung: ['363358000', 'Malignant neoplasm of lung (disorder)'],
    bloodca: ['269475001', 'Malignant tumor of lymphoid, hemopoietic AND/OR related tissue (disorder)'], skin: ['372244006', 'Malignant melanoma (disorder)'],
    thyroidca: ['363478007', 'Malignant tumor of thyroid gland (disorder)'], kidneyca: ['363518003', 'Malignant tumor of kidney (disorder)'],
    liverca: ['93870000', 'Malignant neoplasm of liver (disorder)'], cervical: ['363354003', 'Malignant tumor of cervix (disorder)'],
    headneck: ['271323007', 'Malignant neoplasm of lip, oral cavity and/or pharynx (disorder)'], esophagus: ['363402007', 'Malignant tumor of esophagus (disorder)'],
    bladder: ['399326009', 'Malignant neoplasm of urinary bladder (disorder)'], brain: ['428061005', 'Malignant neoplasm of brain (disorder)'],
    testicular: ['363449006', 'Malignant tumor of testis (disorder)'], sarcoma: ['424413001', 'Sarcoma (disorder)'] },
  polyps: { '': ['68496003', 'Polyp of colon (disorder)'] },
  kidney: { '': ['90708001', 'Kidney disease (disorder)'], failure: ['42399005', 'Renal failure syndrome (disorder)'], stones: ['95570007', 'Kidney stone (disorder)'] },
  thyroid: { '': ['14304000', 'Disorder of thyroid gland (disorder)'] },
  asthma: { '': ['195967001', 'Asthma (disorder)'] },
  epilepsy: { '': ['128613002', 'Seizure disorder (disorder)'] },
  mental: { '': ['74732009', 'Mental disorder (disorder)'], bipolar: ['13746004', 'Bipolar disorder (disorder)'], psychosis: ['69322001', 'Psychotic disorder (disorder)'] },
  blood: { thal: ['40108008', 'Thalassemia (disorder)'], anemia: ['271737000', 'Anemia (disorder)'], bleeding: ['64779008', 'Blood coagulation disorder (disorder)'] },
  liver: { '': ['235856003', 'Disorder of liver (disorder)'], hepb: ['66071002', 'Viral hepatitis type B (disorder)'], hepc: ['50711007', 'Viral hepatitis type C (disorder)'],
    fatty: ['197321007', 'Steatosis of liver (disorder)'], iron: ['399187006', 'Hemochromatosis (disorder)'] },
  clots: { '': ['429098002', 'Thromboembolism of vein (disorder)'] },
  ibd: { '': ['24526004', 'Inflammatory bowel disease (disorder)'] },
  celiac: { '': ['396331005', 'Celiac disease (disorder)'] },
  glaucoma: { '': ['23986001', 'Glaucoma (disorder)'] },
  autoimmune: { '': ['85828009', 'Autoimmune disease (disorder)'] },
  hearing: { '': ['15188001', 'Hearing loss (disorder)'] },
};

const fhirUuid = () => (window.crypto?.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); }));
const fhirYear = s => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(String(s || '').trim()) ? String(s).trim() : null;
const fhirAge = n => ({ value: n, unit: 'a', system: FHIR_UCUM, code: 'a' });
const fhirGender = sex => sex === 'M' ? 'male' : sex === 'F' ? 'female' : 'unknown';
const fhirText = s => String(s ?? '').trim();

// The most specific v3 RoleCode for how `p` is related to you, plus our own label as text.
function fhirRelationship(p) {
  const k = kin(p.id), sx = (f, m, u) => p.sex === 'F' ? f : p.sex === 'M' ? m : u;
  const side = (mat, pat, none) => k.side === 'maternal' ? mat : k.side === 'paternal' ? pat : none;
  let code = null;
  if (k.blood) {
    const { dS, dX } = k;
    if (dX === 0) code = dS === 1 ? sx('NMTH', 'NFTH', 'NPRN')
      : dS === 2 ? side(sx('MGRMTH', 'MGRFTH', 'MGRPRN'), sx('PGRMTH', 'PGRFTH', 'PGRPRN'), sx('GRMTH', 'GRFTH', 'GRPRN'))
      : dS === 3 ? side(sx('MGGRMTH', 'MGGRFTH', 'MGGRPRN'), sx('PGGRMTH', 'PGGRFTH', 'PGGRPRN'), sx('GGRMTH', 'GGRFTH', 'GGRPRN')) : 'EXT';
    else if (dS === 0) code = dX === 1 ? sx('DAU', 'SON', 'NCHILD') : dX === 2 ? sx('GRNDDAU', 'GRNDSON', 'GRNDCHILD') : 'EXT';
    else if (dS === 1 && dX === 1) code = k.full ? sx('NSIS', 'NBRO', 'NSIB') : sx('HSIS', 'HBRO', 'HSIB');
    else if (dS === 2 && dX === 1) code = p.sex === 'F' || p.sex === 'M' ? side(sx('MAUNT', 'MUNCLE'), sx('PAUNT', 'PUNCLE'), sx('AUNT', 'UNCLE')) : 'EXT';
    else if (dS === 1 && dX === 2) code = sx('NIECE', 'NEPHEW', 'NIENEPH');
    else if (dS >= 2 && dX >= 2) code = side('MCOUSN', 'PCOUSN', 'COUSN');
    else code = 'EXT';
  } else {
    const myParents = parentLinks(SELF), myKids = childLinks(SELF), myPartners = partnersOf(SELF);
    const parentOfMe = myParents.find(l => l.id === p.id), kidOfMine = myKids.find(l => l.id === p.id);
    const isPartnerOf = ids => partnersOf(p.id).some(x => ids.includes(x));
    const sibIds = siblingsOf(SELF);
    if (myPartners.includes(p.id)) code = sx('WIFE', 'HUSB', 'SPS');
    else if (parentOfMe && !parentOfMe.bio) code = sx('ADOPTM', 'ADOPTF', 'ADOPTP');
    else if (kidOfMine && !kidOfMine.bio) code = sx('DAUADOPT', 'SONADOPT', 'CHLDADOPT');
    else if (isPartnerOf(myParents.map(l => l.id))) code = sx('STPMTH', 'STPFTH', 'STPPRN');
    else if (parentLinks(p.id).some(l => myPartners.includes(l.id))) code = sx('STPDAU', 'STPSON', 'STPCHLD');
    else if (parentLinks(p.id).some(l => partnersOf(l.id).some(x => myParents.some(m => m.id === x)) && !myParents.some(m => m.id === l.id))) code = sx('STPSIS', 'STPBRO', 'STPSIB');
    else if (childLinks(p.id).some(l => myPartners.includes(l.id))) code = sx('MTHINLAW', 'FTHINLAW', 'PRNINLAW');
    else if (isPartnerOf(myKids.map(l => l.id))) code = sx('DAUINLAW', 'SONINLAW', 'CHLDINLAW');
    else if (isPartnerOf(sibIds) || myPartners.some(x => siblingsOf(x).includes(p.id))) code = sx('SISINLAW', 'BROINLAW', 'SIBINLAW');
    else code = 'FAMMEMB';
  }
  const DISPLAY = { NMTH: 'natural mother', NFTH: 'natural father', NPRN: 'natural parent', MGRMTH: 'maternal grandmother', MGRFTH: 'maternal grandfather', MGRPRN: 'maternal grandparent',
    PGRMTH: 'paternal grandmother', PGRFTH: 'paternal grandfather', PGRPRN: 'paternal grandparent', GRMTH: 'grandmother', GRFTH: 'grandfather', GRPRN: 'grandparent',
    MGGRMTH: 'maternal great-grandmother', MGGRFTH: 'maternal great-grandfather', MGGRPRN: 'maternal great-grandparent', PGGRMTH: 'paternal great-grandmother',
    PGGRFTH: 'paternal great-grandfather', PGGRPRN: 'paternal great-grandparent', GGRMTH: 'great grandmother', GGRFTH: 'great grandfather', GGRPRN: 'great grandparent',
    DAU: 'natural daughter', SON: 'natural son', NCHILD: 'natural child', GRNDDAU: 'granddaughter', GRNDSON: 'grandson', GRNDCHILD: 'grandchild',
    NSIS: 'natural sister', NBRO: 'natural brother', NSIB: 'natural sibling', HSIS: 'half-sister', HBRO: 'half-brother', HSIB: 'half-sibling',
    MAUNT: 'maternal aunt', MUNCLE: 'maternal uncle', PAUNT: 'paternal aunt', PUNCLE: 'paternal uncle', AUNT: 'aunt', UNCLE: 'uncle',
    NIECE: 'niece', NEPHEW: 'nephew', NIENEPH: 'niece/nephew', MCOUSN: 'maternal cousin', PCOUSN: 'paternal cousin', COUSN: 'cousin',
    WIFE: 'wife', HUSB: 'husband', SPS: 'spouse', ADOPTM: 'adoptive mother', ADOPTF: 'adoptive father', ADOPTP: 'adoptive parent',
    DAUADOPT: 'adopted daughter', SONADOPT: 'adopted son', CHLDADOPT: 'adopted child', STPMTH: 'stepmother', STPFTH: 'stepfather', STPPRN: 'step parent',
    STPDAU: 'stepdaughter', STPSON: 'stepson', STPCHLD: 'step child', STPSIS: 'stepsister', STPBRO: 'stepbrother', STPSIB: 'step sibling',
    MTHINLAW: 'mother-in-law', FTHINLAW: 'father-in-law', PRNINLAW: 'parent in-law', DAUINLAW: 'daughter in-law', SONINLAW: 'son in-law', CHLDINLAW: 'child-in-law',
    SISINLAW: 'sister-in-law', BROINLAW: 'brother-in-law', SIBINLAW: 'sibling in-law', EXT: 'extended family member', FAMMEMB: 'family member' };
  return { coding: [{ system: FHIR_ROLE, code, display: DISPLAY[code] }], text: relOf(p) };
}

function fhirConditionCode(f) {
  const text = factName(f.cond, f.type);
  const c = f.cond === 'other' ? null : FHIR_SNOMED[f.cond]?.[f.type || ''];
  return c ? { coding: [{ system: FHIR_SCT, code: c[0], display: c[1] }], text } : { text };
}

// Which of a relative's recorded conditions the reported cause of death refers to.
function fhirCauseFacts(cause, fs) {
  const low = fhirText(cause).toLowerCase();
  if (!low) return new Set();
  const hit = new Set();
  let hits = [];
  try { if (typeof condHits === 'function') hits = condHits(low, [{ at: 0, end: low.length }]); } catch { hits = []; }
  for (const h of hits) {
    const same = fs.filter(f => f.cond === h.cond);
    const exact = h.type ? same.filter(f => f.type === h.type || !f.type) : same;
    if (exact.length === 1 || (exact.length && h.type)) exact.forEach(f => hit.add(f));
  }
  for (const f of fs) {
    const names = [factName(f.cond, f.type), f.cond === 'other' ? f.type : COND[f.cond]?.en, subtypeOf(f.cond, f.type)?.name].filter(Boolean).map(s => s.toLowerCase());
    if (names.some(n => n.length >= 4 && (low.includes(n) || (low.length >= 4 && n.includes(low)) || n.split(/\s+or\s+|,\s*/).some(part => part.trim().length >= 4 && low.includes(part.trim()))))) hit.add(f);
  }
  return hit;
}

const fhirReporter = id => id === SELF ? `${nameOf(byId(SELF))} (the patient)` : byId(id) ? `${nameOf(byId(id))} (${relOf(byId(id)).toLowerCase()})` : 'a relative';

function fhirFamilyMember(p, patientRef, when) {
  const fs = facts(p.id), k = kin(p.id);
  const res = { resourceType: 'FamilyMemberHistory', id: fhirUuid(), status: 'completed', patient: { reference: patientRef }, date: when };
  if (fhirText(p.name)) res.name = fhirText(p.name);
  res.relationship = fhirRelationship(p);
  res.sex = { coding: [{ system: FHIR_GENDER, code: fhirGender(p.sex), display: { male: 'Male', female: 'Female', unknown: 'Unknown' }[fhirGender(p.sex)] }] };
  const born = fhirYear(p.born);
  if (born) res.bornDate = born;
  if (p.living === 'no') {
    if (+p.deathAge > 0) res.deceasedAge = fhirAge(+p.deathAge); else res.deceasedBoolean = true;
  } else if (p.living === 'yes') res.deceasedBoolean = false;

  const notes = [];
  const reporters = [...new Set(fs.flatMap(f => f.reports.map(r => r.by)))];
  notes.push(`Family-reported history collected with Heirloom Health. Relationship: ${relOf(p)}${shortOf(p) && shortOf(p) !== relOf(p) ? ` (${shortOf(p)})` : ''}.${k.blood ? '' : ' Not a blood relative.'}`);
  if (reporters.length) notes.push(`Conditions reported by: ${reporters.map(fhirReporter).join('; ')}.`);
  const causeHits = p.living === 'no' ? fhirCauseFacts(p.cause, fs) : new Set();
  if (p.living === 'no' && fhirText(p.cause)) notes.push(`Cause of death as reported by the family: ${fhirText(p.cause)}.${causeHits.size ? '' : ' It does not match a condition recorded for this relative.'}`);
  for (const [key, label] of [['notes', 'Interview notes'], ['parentNotes', 'About their parents'], ['sibNotes', 'About their brothers and sisters'], ['kidNotes', 'About their children']]) {
    const t = fhirText(p[key]);
    if (t) notes.push(`${label}: ${t}`);
  }
  res.note = notes.map(text => ({ text }));

  const conds = fs.map(f => {
    const c = { code: fhirConditionCode(f) };
    if (causeHits.has(f)) c.contributedToDeath = true;
    if (+f.age > 0) c.onsetAge = fhirAge(+f.age);
    const cn = [`Reported by ${f.reports.map(r => `${fhirReporter(r.by)}${+r.age > 0 ? `, age ${r.age}` : ''}${fhirText(r.said) ? `, in their words "${fhirText(r.said)}"` : ''}`).join('; ')}.`];
    if (f.disagree) cn.push(`Relatives gave different ages at diagnosis (${f.range}); the earliest is used as the onset age.`);
    if (!(+f.age > 0)) cn.push('Age at diagnosis unknown.');
    c.note = cn.map(text => ({ text }));
    return c;
  });
  if (conds.length) res.condition = conds;
  return res;
}

// People who are only empty placeholders on the chart (no name, no details) are left out.
const fhirHasInfo = p => fhirText(p.name) || fhirYear(p.born) || p.living !== 'unknown' || facts(p.id).length || fhirText(p.notes) || fhirText(p.cause);

function fhirBundle() {
  const me = byId(SELF), when = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const entry = r => ({ fullUrl: 'urn:uuid:' + r.id, resource: r });
  const patient = { resourceType: 'Patient', id: fhirUuid() };
  if (fhirText(me.name)) patient.name = [{ text: fhirText(me.name), given: [fhirText(me.name)] }];
  patient.gender = fhirGender(me.sex);
  const myBorn = fhirYear(me.born);
  if (myBorn) patient.birthDate = myBorn;
  const pref = 'urn:uuid:' + patient.id;
  const entries = [entry(patient)];
  for (const p of S.people) if (p.id !== SELF && fhirHasInfo(p)) entries.push(entry(fhirFamilyMember(p, pref, when.slice(0, 10))));

  const obs = (text, value, note) => ({ resourceType: 'Observation', id: fhirUuid(), status: 'final', code: { text }, subject: { reference: pref }, effectiveDateTime: when, valueString: value, ...(note ? { note: [{ text: note }] } : {}) });
  const ANSWER = { yes: 'Yes', no: 'No', unknown: "Doesn't know" };
  for (const c of FAMILY_CHECKS) for (const p of S.people) {
    const a = p.checks?.[c.id];
    if (!a || (!ANSWER[a.a] && !fhirText(a.note))) continue;
    entries.push(entry(obs(`Family history: ${c.en}`, [ANSWER[a.a], fhirText(a.note)].filter(Boolean).join('. '), `Answered by ${fhirReporter(p.id)}.`)));
  }
  const anc = (me.ancestry || []).map(id => (typeof ANCESTRIES !== 'undefined' ? ANCESTRIES.find(a => a.id === id)?.en : null) || id);
  if (anc.length) entries.push(entry(obs('Family ancestry', anc.join(', '), 'Self-reported by the patient.')));
  const myNotes = fhirText(me.notes);
  if (myNotes) entries.push(entry(obs('Family history interview notes', myNotes, `Written by ${fhirReporter(SELF)}.`)));

  return { resourceType: 'Bundle', id: fhirUuid(), meta: { lastUpdated: when }, type: 'collection', timestamp: when, entry: entries };
}

async function exportFHIR() {
  try {
    const blob = new Blob([JSON.stringify(fhirBundle(), null, 2)], { type: 'application/fhir+json' });
    const fname = `family-history-${(nameOf(byId(SELF)) || 'me').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'me'}.fhir.json`;
    await saveFile(fname, blob);
  } catch (e) {
    if (e?.code !== 'declined') toast(e?.message && !e.code ? e.message : "Couldn't save the file here. Use Copy as text instead.");
  }
}
