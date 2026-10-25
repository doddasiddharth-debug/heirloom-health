// Automatic pedigree layout for any family shape, in three phases (the Sugiyama method for layered graphs):
//   1. Layering: each person's row is their generation (parents one row up, children one row down).
//   2. Ordering: partners are glued into "blocks"; blocks are reordered by the average position of their
//      parents (top-down) and children (bottom-up) a few times, which removes most line crossings.
//   3. Placement: each block is pulled toward the spot that centers parents over their children,
//      then packed so nobody overlaps. Repeating this settles into a balanced chart.
'use strict';

const LAYOUT = { W: 134, ROW: 232, TOP: 64, SZ: 40 };
const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

function layoutFamily() {
  const { W, ROW, TOP } = LAYOUT;
  const gen = generations();
  const ids = S.people.map(p => p.id).filter(id => gen.has(id));
  const gens = [...new Set(ids.map(id => gen.get(id)))].sort((a, b) => a - b);
  const rows = gens.map(g => buildBlocks(ids.filter(id => gen.get(id) === g)));

  // Families: children grouped by their exact set of parents.
  const famMap = new Map();
  for (const id of ids) {
    const links = parentLinks(id).filter(l => gen.has(l.id));
    if (!links.length) continue;
    const key = links.map(l => l.id).sort().join('|');
    if (!famMap.has(key)) famMap.set(key, { parents: links.map(l => l.id).sort(), kids: [] });
    famMap.get(key).kids.push({ id, bio: links.every(l => l.bio) });
  }
  const fams = [...famMap.values()];

  // Phase 2: crossing reduction by barycenters.
  for (let it = 0; it < 4; it++) {
    for (let r = 1; r < rows.length; r++) sortRow(rows[r], m => parentLinks(m).map(l => l.id), rowIndex(rows[r - 1]));
    for (let r = rows.length - 2; r >= 0; r--) sortRow(rows[r], m => childLinks(m).map(l => l.id), rowIndex(rows[r + 1]));
  }

  // Phase 3: coordinates.
  const where = new Map();
  rows.forEach(row => { let x = 0; row.forEach(b => { b.x = x; x += b.members.length * W; b.members.forEach((m, i) => where.set(m, { b, i })); }); });
  const px = id => { const w = where.get(id); return w.b.x + w.i * W; };
  for (let it = 0; it < 60; it++) {
    const order = it % 2 === 0 ? rows.map((_, i) => i) : rows.map((_, i) => rows.length - 1 - i);
    for (const r of order) {
      const row = rows[r];
      const desired = row.map(b => {
        const pulls = [];
        for (const f of fams) {
          const pm = avg(f.parents.map(px)), km = avg(f.kids.map(k => px(k.id)));
          if (f.parents.every(p => b.members.includes(p))) pulls.push(b.x + (km - pm)); // center parents over kids
          if (f.kids.some(k => b.members.includes(k.id))) pulls.push(b.x + (pm - km));  // center kids under parents
        }
        return pulls.length ? avg(pulls) : b.x;
      });
      pack(row, desired);
    }
  }

  const pos = {};
  let minX = Infinity, maxX = -Infinity;
  rows.forEach((row, r) => row.forEach(b => b.members.forEach((m, i) => {
    const x = b.x + i * W;
    pos[m] = { x, y: TOP + r * ROW };
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  })));
  // Stagger sibling bars that share a row so they don't sit on top of each other.
  const byRow = new Map();
  for (const f of fams) { const y = pos[f.kids[0].id].y; if (!byRow.has(y)) byRow.set(y, []); byRow.get(y).push(f); }
  for (const list of byRow.values()) list.sort((a, b) => avg(a.kids.map(k => pos[k.id].x)) - avg(b.kids.map(k => pos[k.id].x))).forEach((f, i) => f.stagger = i % 3);
  return { pos, fams, minX: minX - W / 2 - 16, width: maxX - minX + W + 26, height: TOP + rows.length * ROW - 100 };
}

function buildBlocks(ids) {
  const set = new Set(ids), seen = new Set(), blocks = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const comp = [], queue = [id];
    seen.add(id);
    while (queue.length) {
      const cur = queue.shift();
      comp.push(cur);
      for (const o of partnersOf(cur)) if (set.has(o) && !seen.has(o)) { seen.add(o); queue.push(o); }
    }
    blocks.push({ members: orderBlock(comp), x: 0 });
  }
  return blocks;
}
// Couples: man on the left (pedigree convention). Someone with two partners sits between them.
function orderBlock(comp) {
  if (comp.length === 1) return comp;
  if (comp.length === 2) return byId(comp[0]).sex === 'F' && byId(comp[1]).sex !== 'F' ? [comp[1], comp[0]] : comp;
  const inBlock = id => partnersOf(id).filter(o => comp.includes(o));
  const out = [comp.find(id => inBlock(id).length === 1) || comp[0]], used = new Set(out);
  while (out.length < comp.length) {
    const next = inBlock(out[out.length - 1]).find(o => !used.has(o)) || comp.find(o => !used.has(o));
    out.push(next); used.add(next);
  }
  return out;
}
function rowIndex(row) { const idx = new Map(); let i = 0; row.forEach(b => b.members.forEach(m => idx.set(m, i++))); return idx; }
function sortRow(row, nbrs, idx) {
  let prev = -1;
  const keyed = row.map(b => {
    const vals = b.members.flatMap(m => nbrs(m).filter(n => idx.has(n)).map(n => idx.get(n)));
    const k = vals.length ? avg(vals) : prev + 1e-3; // blocks with no links keep their place
    prev = k;
    return { b, k };
  });
  keyed.sort((a, b) => a.k - b.k);
  keyed.forEach((o, i) => row[i] = o.b);
}
// Place blocks as close to their desired x as possible while keeping one slot between neighbors.
// Packing left-to-right and right-to-left, then averaging, keeps the result centered.
function pack(row, desired) {
  const { W } = LAYOUT, w = b => (b.members.length - 1) * W;
  const L = [], R = [];
  row.forEach((b, i) => { L[i] = i ? Math.max(desired[i], L[i - 1] + w(row[i - 1]) + W) : desired[i]; });
  for (let i = row.length - 1; i >= 0; i--) R[i] = i < row.length - 1 ? Math.min(desired[i], R[i + 1] - w(row[i]) - W) : desired[i];
  row.forEach((b, i) => { b.x = (L[i] + R[i]) / 2; });
}

/* ---------- Drawing ---------- */
function symbol(p, x, y, fill, faint) {
  const h = LAYOUT.SZ / 2, cls = `sym${faint ? ' faint' : ''}`;
  if (p.sex === 'M') return `<rect class="${cls}" x="${x - h}" y="${y - h}" width="${LAYOUT.SZ}" height="${LAYOUT.SZ}" rx="4" fill="${fill}"/>`;
  if (p.sex === 'F') return `<circle class="${cls}" cx="${x}" cy="${y}" r="${h}" fill="${fill}"/>`;
  return `<path class="${cls}" d="M${x} ${y - h - 3}L${x + h + 3} ${y}L${x} ${y + h + 3}L${x - h - 3} ${y}Z" stroke-linejoin="round" fill="${fill}"/>`;
}
function nodeLabels(p, x, y) {
  const k = kin(p.id), lines = [['t-nm', clip(nameOf(p), 17)]];
  if ((p.name || '').trim() && p.id !== SELF) lines.push(['t-rl', clip(shortOf(p), 20)]);
  if (!k.blood && p.id !== SELF) lines.push(['t-nb', k.adopted ? 'Adoptive · not blood' : 'Not blood related']);
  if (p.living === 'no') lines.push(['t-dt', clip(`d. ${p.deathAge || '?'}${p.cause ? ' · ' + p.cause : ''}`, 19)]);
  else if (p.born) lines.push(['t-dt', `b. ${p.born}${p.living === 'yes' ? ' · ' + (YEAR - p.born) + 'y' : ''}`]);
  let cur = '';
  const cl = [];
  for (const f of facts(p.id)) {
    const item = `${factShort(f.cond, f.type)}${f.age ? ' ' + f.age : ''}${f.disagree ? '*' : ''}`;
    if (cur && (cur + ' · ' + item).length > 19) { cl.push(cur); cur = item; } else cur = cur ? cur + ' · ' + item : item;
  }
  if (cur) cl.push(cur);
  cl.slice(0, 3).forEach(t => lines.push(['t-cd', t]));
  return lines.map(([c, t], i) => `<text class="${c}" x="${x}" y="${y + LAYOUT.SZ / 2 + 18 + i * 14}" text-anchor="middle">${esc(t)}</text>`).join('');
}
function treeSVG({ interactive = true, hl = S.hl } = {}) {
  const L = layoutFamily(), P = L.pos, h = LAYOUT.SZ / 2;
  let g = '';
  for (const r of S.rels) if (r.kind === 'partner' && P[r.a] && P[r.b] && P[r.a].y === P[r.b].y) {
    const [a, b] = P[r.a].x < P[r.b].x ? [P[r.a], P[r.b]] : [P[r.b], P[r.a]];
    g += `<line class="ln" x1="${a.x + h}" y1="${a.y}" x2="${b.x - h}" y2="${b.y}"/>`;
  }
  for (const f of L.fams) {
    const ps = f.parents.map(id => P[id]);
    const couple = ps.length === 2 && ps[0].y === ps[1].y;
    const ky = P[f.kids[0].id].y, sy = ky - h - 30 - f.stagger * 8;
    let mx, d;
    if (couple) { mx = (ps[0].x + ps[1].x) / 2; d = `M${mx} ${ps[0].y}V${sy}`; }
    else { mx = ps[0].x + h + 16; d = `M${ps[0].x + h} ${ps[0].y}H${mx}V${sy}`; } // single parent: step out sideways to clear the labels
    const xs = f.kids.map(k => P[k.id].x).concat(mx);
    g += `<path class="ln" d="${d}M${Math.min(...xs)} ${sy}H${Math.max(...xs)}"/>`;
    for (const k of f.kids) g += `<line class="ln${k.bio ? '' : ' adopt'}" x1="${P[k.id].x}" y1="${sy}" x2="${P[k.id].x}" y2="${ky - h - (byId(k.id).sex === 'U' ? 3 : 0)}"/>`;
  }
  for (const p of S.people) {
    if (!P[p.id]) continue;
    const { x, y } = P[p.id], fs = facts(p.id), k = kin(p.id);
    const hit = hl === 'any' ? fs.length > 0 : fs.some(f => f.cond === hl);
    const fill = hit ? 'var(--accent)' : 'var(--panel)';
    let n = '';
    if (interactive && S.sel === p.id) n += `<rect class="ring" x="${x - h - 10}" y="${y - h - 10}" width="${LAYOUT.SZ + 20}" height="${LAYOUT.SZ + 20}" rx="14"/>`;
    n += symbol(p, x, y, fill, !k.blood && p.id !== SELF);
    if (isBlank(p)) n += `<text class="t-q" x="${x}" y="${y + 6}" text-anchor="middle">?</text>`;
    if (p.living === 'no') n += `<line class="ln" x1="${x - h - 7}" y1="${y + h + 7}" x2="${x + h + 7}" y2="${y - h - 7}" style="stroke:var(--sym);stroke-width:2.5"/>`;
    if (p.id === SELF) n += `<path class="ln" d="M${x - h - 26} ${y + h + 16}L${x - h - 6} ${y + h - 2}" style="stroke:var(--primary);stroke-width:3"/><path d="M${x - h - 4} ${y + h - 4}l-10 1.5 7 7z" fill="var(--primary)"/>`;
    if (p.interviewed) n += `<circle class="chk" cx="${x + h + 3}" cy="${y - h - 3}" r="9"/><path d="M${x + h - 1} ${y - h - 3}l3 3 5-6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    n += nodeLabels(p, x, y);
    const aria = `${nameOf(p)}, ${relOf(p)}${p.living === 'no' ? ', deceased' : ''}${fs.length ? ', ' + fs.map(f => factName(f.cond, f.type)).join(', ') : ''}`;
    g += interactive ? `<g class="node" data-node="${p.id}" tabindex="0" role="button" aria-label="${esc(aria)}">${n}</g>` : `<g aria-label="${esc(aria)}">${n}</g>`;
  }
  return `<svg viewBox="${L.minX} 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" style="max-width:100%;min-width:${Math.min(L.width, 820)}px;height:auto" role="img" aria-label="Family pedigree chart">${g}</svg>`;
}
