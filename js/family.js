// Family graph: people are nodes; "parent" links (biological or adoptive) and "partner" links are edges.
// From this graph we work out how each person is related to you, and whether they share your genes.
'use strict';

const SELF = 'self';
let KIN_CACHE = new Map();
function touchFamily() { KIN_CACHE = new Map(); }

const byId = id => S.people.find(p => p.id === id);
const uid = prefix => prefix + '-' + Math.random().toString(36).slice(2, 8);

function newPerson(o = {}) {
  return Object.assign({ id: uid('p'), name: '', sex: 'U', born: '', living: 'unknown', deathAge: '', cause: '', notes: '', sibNotes: '', parentNotes: '', interviewed: '', transcripts: {} }, o);
}

/* ---------- Edges ---------- */
// parentLinks(id): [{id, bio}] for each parent of id.
function parentLinks(id) { return S.rels.filter(r => r.kind === 'parent' && r.child === id).map(r => ({ id: r.parent, bio: r.bio !== false })); }
function bioParents(id) { return parentLinks(id).filter(l => l.bio).map(l => l.id); }
function childLinks(id) { return S.rels.filter(r => r.kind === 'parent' && r.parent === id).map(r => ({ id: r.child, bio: r.bio !== false })); }
function partnersOf(id) { return S.rels.filter(r => r.kind === 'partner' && (r.a === id || r.b === id)).map(r => r.a === id ? r.b : r.a); }
function motherOf(id, bioOnly = true) { return (bioOnly ? bioParents(id) : parentLinks(id).map(l => l.id)).map(byId).find(p => p?.sex === 'F'); }
function fatherOf(id, bioOnly = true) { return (bioOnly ? bioParents(id) : parentLinks(id).map(l => l.id)).map(byId).find(p => p?.sex === 'M'); }
function siblingsOf(id) {
  const mine = parentLinks(id).map(l => l.id);
  const out = new Set();
  for (const p of mine) for (const c of childLinks(p)) if (c.id !== id) out.add(c.id);
  return [...out];
}
function linkParent(parent, child, bio = true) {
  if (!S.rels.some(r => r.kind === 'parent' && r.parent === parent && r.child === child)) S.rels.push({ kind: 'parent', parent, child, bio });
}
function linkPartners(a, b) {
  if (a !== b && !S.rels.some(r => r.kind === 'partner' && ((r.a === a && r.b === b) || (r.a === b && r.b === a)))) S.rels.push({ kind: 'partner', a, b });
}

/* ---------- Adding and removing relatives ---------- */
// Make sure `id` has a mother and a father on the tree (blank placeholders if needed), so siblings have somewhere to attach.
function ensureParents(id) {
  let mom = motherOf(id, false), dad = fatherOf(id, false);
  if (!mom) { mom = newPerson({ sex: 'F' }); S.people.push(mom); linkParent(mom.id, id); }
  if (!dad) { dad = newPerson({ sex: 'M' }); S.people.push(dad); linkParent(dad.id, id); }
  linkPartners(dad.id, mom.id);
  return [dad.id, mom.id];
}
// kind: mother | father | sibling | halfsib-mother | halfsib-father | partner | child | adopted
function addRelative(kind, ofId, opts = {}) {
  const p = newPerson(opts);
  if (kind === 'mother' || kind === 'father') {
    p.sex = kind === 'mother' ? 'F' : 'M';
    S.people.push(p); linkParent(p.id, ofId);
    const other = kind === 'mother' ? fatherOf(ofId, false) : motherOf(ofId, false);
    if (other) linkPartners(other.id, p.id);
  } else if (kind === 'sibling') {
    const [dad, mom] = ensureParents(ofId);
    S.people.push(p); linkParent(dad, p.id); linkParent(mom, p.id);
  } else if (kind === 'halfsib-mother' || kind === 'halfsib-father') {
    const [dad, mom] = ensureParents(ofId);
    S.people.push(p); linkParent(kind === 'halfsib-mother' ? mom : dad, p.id);
  } else if (kind === 'partner') {
    const me = byId(ofId);
    if (p.sex === 'U' && me.sex !== 'U') p.sex = me.sex === 'M' ? 'F' : 'M';
    S.people.push(p); linkPartners(ofId, p.id);
  } else if (kind === 'child' || kind === 'adopted') {
    S.people.push(p); linkParent(ofId, p.id, kind === 'child');
    const partner = partnersOf(ofId)[0];
    if (partner) linkParent(partner, p.id, kind === 'child');
  }
  touchFamily();
  return p;
}
// People who would be cut off from you if `id` were removed (they are removed too).
function removalSet(id) {
  const gone = new Set([id]);
  const seen = new Set([SELF]), queue = [SELF];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of neighbors(cur)) if (!seen.has(n.id) && !gone.has(n.id)) { seen.add(n.id); queue.push(n.id); }
  }
  for (const p of S.people) if (!seen.has(p.id)) gone.add(p.id);
  return gone;
}
function removePerson(id) {
  if (id === SELF) return;
  const gone = removalSet(id);
  S.people = S.people.filter(p => !gone.has(p.id));
  S.rels = S.rels.filter(r => r.kind === 'parent' ? !gone.has(r.parent) && !gone.has(r.child) : !gone.has(r.a) && !gone.has(r.b));
  S.reports = S.reports.filter(r => !gone.has(r.pid) && !gone.has(r.by));
  touchFamily();
}

/* ---------- Graph walks ---------- */
function neighbors(id) {
  return [
    ...parentLinks(id).map(l => ({ id: l.id, step: 'up', bio: l.bio })),
    ...childLinks(id).map(l => ({ id: l.id, step: 'down', bio: l.bio })),
    ...partnersOf(id).map(pid => ({ id: pid, step: 'partner', bio: false })),
  ];
}
// Every biological ancestor of `id` (including itself at distance 0), found by breadth-first search up parent links.
function bioAncestors(id) {
  const dist = new Map([[id, 0]]), queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    for (const p of bioParents(cur)) if (!dist.has(p)) { dist.set(p, dist.get(cur) + 1); queue.push(p); }
  }
  return dist;
}
// Generation of every connected person relative to you (parents -1, children +1, partners same).
function generations() {
  const gen = new Map([[SELF, 0]]), queue = [SELF];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of neighbors(cur)) {
      if (gen.has(n.id)) continue;
      gen.set(n.id, gen.get(cur) + (n.step === 'up' ? -1 : n.step === 'down' ? 1 : 0));
      queue.push(n.id);
    }
  }
  return gen;
}

/* ---------- Kinship ---------- */
const ORD = ['', 'First', 'Second', 'Third', 'Fourth'];
const TIMES = ['', 'once', 'twice', 'three times'];
const sexWord = (p, f, m, u) => p.sex === 'F' ? f : p.sex === 'M' ? m : u;
const greats = n => n <= 0 ? '' : n === 1 ? 'Great-' : `${n}x great-`;

// Possessive path label from you to `id`, e.g. "Dad's sister" or "Mom's mom's dad".
function pathLabel(id) {
  if (id === SELF) return 'You';
  const prev = new Map([[SELF, null]]), queue = [SELF];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === id) break;
    const ns = neighbors(cur).sort((a, b) => (b.bio - a.bio) || ['up', 'down', 'partner'].indexOf(a.step) - ['up', 'down', 'partner'].indexOf(b.step));
    for (const n of ns) if (!prev.has(n.id)) { prev.set(n.id, { from: cur, ...n }); queue.push(n.id); }
  }
  if (!prev.has(id)) return 'Relative';
  const steps = [];
  for (let cur = id; prev.get(cur); cur = prev.get(cur).from) steps.unshift({ ...prev.get(cur), id: cur });
  const words = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i], p = byId(s.id), nx = steps[i + 1];
    if (s.step === 'up' && nx?.step === 'down') {
      const q = byId(nx.id), from = i ? steps[i - 1].id : SELF;
      words.push((firstDegreePair(from, q.id) ? '' : 'half-') + sexWord(q, 'sister', 'brother', 'sibling'));
      i++; continue;
    }
    if (s.step === 'up') words.push((s.bio ? '' : 'adoptive ') + sexWord(p, 'mom', 'dad', 'parent'));
    else if (s.step === 'down') words.push((s.bio ? '' : 'adopted ') + sexWord(p, 'daughter', 'son', 'child'));
    else words.push(sexWord(p, 'wife', 'husband', 'partner'));
  }
  if (words.length > 4) return null;
  const s = words.join("'s ");
  return s[0].toUpperCase() + s.slice(1);
}

// kin(id) → { blood, degree, label, short, side, dS, dX }
// degree: 1 = parents/children/full siblings, 2 = grandparents/aunts/uncles/half-siblings, 3 = first cousins/great-grandparents.
function kin(id) {
  if (KIN_CACHE.has(id)) return KIN_CACHE.get(id);
  KIN_CACHE.set(id, { blood: false, degree: null, label: 'Relative', short: 'Relative', side: null }); // breaks cycles between married-in partners
  const r = computeKin(id);
  KIN_CACHE.set(id, r);
  return r;
}
function computeKin(id) {
  if (id === SELF) return { blood: true, degree: 0, label: 'You', short: 'You', side: null, dS: 0, dX: 0 };
  const p = byId(id), short = pathLabel(id);
  const aS = bioAncestors(SELF), aX = bioAncestors(id);
  let best = Infinity, common = [];
  for (const [c, dX] of aX) if (aS.has(c)) {
    const tot = aS.get(c) + dX;
    if (tot < best) { best = tot; common = [c]; } else if (tot === best) common.push(c);
  }
  if (!common.length) {
    const adopted = parentLinks(id).some(l => l.id === SELF && !l.bio) || parentLinks(SELF).some(l => l.id === id && !l.bio);
    return { blood: false, degree: null, label: short || 'Relative by marriage', short: short || 'Relative', side: sideOf(id, null, null), adopted };
  }
  const c = common[0], dS = aS.get(c), dX = aX.get(c), full = common.length >= 2;
  const lineal = dS === 0 || dX === 0;
  const degree = lineal ? dS + dX : (full ? dS + dX - 1 : dS + dX);
  const side = sideOf(id, c, dS);
  const sideAdj = side === 'paternal' ? 'Paternal ' : side === 'maternal' ? 'Maternal ' : '';
  const sideSuffix = side === 'paternal' ? " (Dad's side)" : side === 'maternal' ? " (Mom's side)" : '';
  const half = full ? '' : 'Half-';
  let label;
  if (dX === 0) label = dS === 1 ? sexWord(p, 'Mother', 'Father', 'Parent') : dS === 2 ? sideAdj + sexWord(p, 'grandmother', 'grandfather', 'grandparent') : greats(dS - 2) + sexWord(p, 'grandmother', 'grandfather', 'grandparent') + sideSuffix;
  else if (dS === 0) label = dX === 1 ? sexWord(p, 'Daughter', 'Son', 'Child') : greats(dX - 2) + sexWord(p, 'granddaughter', 'grandson', 'grandchild');
  else if (dS === 1 && dX === 1) label = half + sexWord(p, 'sister', 'brother', 'sibling');
  else if (dX === 1) label = dS === 2 ? sideAdj + (full ? '' : 'half-') + sexWord(p, 'aunt', 'uncle', 'aunt or uncle') : greats(dS - 2) + sexWord(p, 'aunt', 'uncle', 'aunt or uncle') + sideSuffix;
  else if (dS === 1) label = greats(dX - 2) + sexWord(p, 'niece', 'nephew', 'niece or nephew');
  else {
    const n = Math.min(dS, dX) - 1, removed = Math.abs(dS - dX);
    label = `${full ? '' : 'Half '}${ORD[n] || n + 'th'} cousin${removed ? ' ' + (TIMES[removed] || removed + ' times') + ' removed' : ''}${sideSuffix}`;
  }
  label = label[0].toUpperCase() + label.slice(1);
  return { blood: true, degree, label, short: short || label, side, dS, dX, full };
}
// Which side of your family `id` is on: the parent of yours that the connection runs through.
function sideOf(id, commonAncestor, dS) {
  if (dS === 0) return null;
  if (commonAncestor != null && dS >= 2) {
    for (const par of bioParents(SELF)) {
      const a = bioAncestors(par);
      if (a.get(commonAncestor) === dS - 1) return byId(par)?.sex === 'F' ? 'maternal' : byId(par)?.sex === 'M' ? 'paternal' : null;
    }
  }
  if (commonAncestor == null) {
    // Married-in relatives take the side of the blood relative they are married to.
    for (const q of partnersOf(id)) { const k = kin(q); if (k.blood && k.side) return k.side; }
  }
  return null;
}
function relOf(p) { return kin(p.id).label; }
function shortOf(p) { return kin(p.id).short; }
function nameOf(p) { return (p.name || '').trim() || shortOf(p); }
const isFirstDegree = p => kin(p.id).blood && kin(p.id).degree === 1;
// True when a and b are first-degree relatives of each other (parent/child or full siblings).
function firstDegreePair(a, b) {
  const pa = bioParents(a), pb = bioParents(b);
  if (pa.includes(b) || pb.includes(a)) return true;
  return pa.length === 2 && pb.length === 2 && pa.every(x => pb.includes(x));
}
