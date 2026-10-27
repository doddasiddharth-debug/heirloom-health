# Part 3: The family graph and the pedigree chart

This part covers two files:

- `js/family.js` (256 lines) stores who is related to whom and works out what each person is to you ("Maternal aunt", "Half-sister", "First cousin (Mom's side)") and how closely you share genes.
- `js/layout.js` (237 lines) decides where every person goes on the family tree and draws it as an SVG picture with standard medical pedigree symbols.

Every quote below is copied from the real files, with the file name and line number, like `js/family.js:184`. If you change the code later, the line numbers will move.

---

## Before we start: how these files fit into the app

The app has no build step. `index.html` loads each JavaScript file with a plain `<script>` tag, in order: `family.js` at line 582, then `risk.js`, `timeline.js`, and `layout.js` at line 585, and `app.js` last. These are "classic scripts", so everything declared at the top level of one file (functions, `const`, `let`) is visible to the files loaded after it. That is how `layout.js` can call `generations()` and `kin()` from `family.js` without importing anything.

Both files read the global state object `S`, which `js/app.js` sets up. A new family starts like this (`js/app.js:60`):

```js
const S0 = { v: 2, example: false, people: [newPerson({ ...me, id: SELF, living: 'yes' })], rels: [], reports: [], sel: SELF, hl: 'any', tab: 'tree', iv: { who: '', step: 0, lang: 'te', roman: true } };
```

The three parts that matter here:

- `S.people` is a list of person objects. The user is always the person whose id is `'self'`.
- `S.rels` is a list of links ("relationships") between people.
- `S.reports` holds health answers. Each report has a `pid` (who it is about) and a `by` (who said it). `family.js` only touches reports when a person is deleted.

Who uses these files: `risk.js` calls `kin()` to decide who is a blood relative and how close (for example `bloodRelatives()` at `js/risk.js:46`); `fhir.js` uses `kin()` for the medical-records export; and `app.js` calls `addRelative()`, `removePerson()` and `treeSVG()` when you tap buttons or open the Tree tab.

---

# File 1: `js/family.js`

## The big idea: a family is a graph

In computer science, a **graph** is a set of **nodes** (things) connected by **edges** (links). Here, people are nodes. There are only two kinds of edges, stored in `S.rels`:

- A **parent** edge: `{ kind: 'parent', parent, child, bio }`. `bio` is `true` for a birth parent and `false` for an adoptive parent.
- A **partner** edge: `{ kind: 'partner', a, b }`, for couples.

Notice what is *not* stored: there is no "aunt" edge or "cousin" edge. Every relationship is worked out from parent and partner edges. An aunt is "a child of one of your parent's parents". This is a good design because there is only one source of truth. If you stored "aunt" separately, it could disagree with the parent links.

The file comment says this directly (`js/family.js:1`):

```js
// Family graph: people are nodes; "parent" links (biological or adoptive) and "partner" links are edges.
```

## Our running example

To trace the code, we will use a small family. You can build it in the app by adding relatives:

- **You** (female)
- **Mom** and **Dad**
- **Grandma** and **Grandpa** (Mom's parents)
- **Aunt** (Mom's sister) and her husband, **Uncle** (married in)
- **Cousin** (the aunt's son)

Later we will add a **Brother** and a **Half-sister** (Dad's daughter with another partner) to show full and half siblings.

I ran the real `family.js` and `layout.js` on this family to check the results quoted below.

## Setup: the cache, ids and new people (lines 5–14)

```js
const SELF = 'self';
let KIN_CACHE = new Map();
function touchFamily() { KIN_CACHE = new Map(); }
```
(`js/family.js:5-7`)

`SELF` is a named constant for the id `'self'`, so the code can say `SELF` instead of repeating a string that could be mistyped.

**Concept: Map.** A `Map` is a lookup table: you store a value under a key with `map.set(key, value)` and get it back with `map.get(key)`. `map.has(key)` asks whether a key is there. It is like a dictionary.

**Concept: caching (memoization).** Working out a relationship takes some effort (several searches through the family). The app asks "what is this person to me?" many times per screen. So the first answer for each person is saved in `KIN_CACHE`, and later questions just look it up. This is called **memoization**: remembering the result of a function call. The danger of any cache is that it goes **stale**: if the family changes, the saved answers may be wrong. `touchFamily()` solves this by throwing the whole cache away. It is called after adding or removing people, and also from `save()` in `app.js` (`js/app.js:102-103`), which runs after almost every edit. So a change of name or sex also clears it.

```js
const byId = id => S.people.find(p => p.id === id);
const uid = prefix => prefix + '-' + Math.random().toString(36).slice(2, 8);
```
(`js/family.js:9-10`)

**Concept: arrow functions.** `id => S.people.find(...)` is a short way to write a function. It means "a function that takes `id` and returns `S.people.find(...)`". `byId('mom')` returns the person object whose id is `'mom'`, or `undefined` if there is none.

`uid` makes a random id like `p-k3x9qa` from six base-36 characters of `Math.random()`. **Limitation:** nothing checks that the id is unused. A clash is very unlikely (about 2 billion possibilities) but not impossible.

`newPerson(o = {})` (`js/family.js:12-14`) builds a person with default fields (`name: ''`, `sex: 'U'` for unknown, `living: 'unknown'`, and so on) and then `Object.assign` copies anything you pass in `o` on top. So `newPerson({ sex: 'F' })` is a blank person whose sex is female. `o = {}` is a **default parameter**: if you call `newPerson()` with nothing, `o` is an empty object.

## Edge helpers: reading the links (lines 16–42)

These small functions answer simple questions by filtering `S.rels`.

```js
function parentLinks(id) { return S.rels.filter(r => r.kind === 'parent' && r.child === id).map(r => ({ id: r.parent, bio: r.bio !== false })); }
function bioParents(id) { return parentLinks(id).filter(l => l.bio).map(l => l.id); }
```
(`js/family.js:18-19`)

`parentLinks('self')` keeps the parent edges whose child is you, and turns each into `{ id, bio }`. In our example it returns `[{ id: 'mom', bio: true }, { id: 'dad', bio: true }]`. `bioParents` keeps only birth parents and returns just their ids: `['mom', 'dad']`.

Why `r.bio !== false` instead of just `r.bio`? It means "biological unless it is *explicitly* false". If an older saved link had no `bio` field at all, it counts as biological. That is a safe default for old data.

`childLinks(id)` is the same thing in the other direction. `partnersOf(id)` finds partner edges that mention `id` on either end and returns the *other* person (`js/family.js:21`).

### Mother and father roles

`parentRoles(id)` (`js/family.js:23-28`) returns `{ mom, dad }`: the first female parent and the first male parent. A parent whose sex is unknown fills an empty role, mother first, so the app can still find "a mother" before the sex is filled in. `motherOf` and `fatherOf` (lines 29–30) return one half of that.

### Siblings

```js
function siblingsOf(id) {
  const mine = parentLinks(id).map(l => l.id);
  const out = new Set();
  for (const p of mine) for (const c of childLinks(p)) if (c.id !== id) out.add(c.id);
  return [...out];
}
```
(`js/family.js:31-36`)

**Concept: Set.** A `Set` is a collection where each value can appear only once. Adding the same value twice does nothing. Here that matters: your brother is a child of Mom *and* of Dad, so the loop finds him twice, but the set keeps one copy. `[...out]` turns the set back into an ordinary array (the `...` "spreads" its items into a new list).

This finds anyone who shares *any* parent with you, birth or adoptive, so it includes half-siblings and adopted siblings.

### Adding links without duplicates

`linkParent` (`js/family.js:37-39`) adds a parent edge only if an identical one is not already there (`.some(...)` returns true if any item matches). `linkPartners` (lines 40–42) does the same for couples, checks both orders (a–b and b–a), and refuses to partner someone with themselves.

## Adding relatives (lines 44–87)

### `ensureParents`: make room for siblings

A sibling is "another child of your parents". If your parents are not on the chart yet, there is nowhere to attach a sibling. So before adding one, the app makes sure there is a mother and a father, creating blank placeholders if needed:

```js
  if (!mom) { mom = newPerson({ sex: 'F' }); S.people.push(mom); linkParent(mom.id, id); }
  if (!dad) { dad = newPerson({ sex: 'M' }); S.people.push(dad); linkParent(dad.id, id); }
  linkPartners(dad.id, mom.id);
  return [dad.id, mom.id];
```
(`js/family.js:52-55`)

The first line of the function, `let { mom, dad } = parentRoles(id, false);` (`js/family.js:47`), uses **destructuring**.

**Concept: destructuring.** `parentRoles` returns an object `{ mom, dad }`. Writing `let { mom, dad } = ...` pulls those two properties out into two variables in one step. The same works for arrays: `const [dad, mom] = ensureParents(ofId);` (`js/family.js:66`) takes the first and second items of the returned array.

Lines 49–51 handle an unusual case: if someone already has two parents of the same sex, the second fills the empty role instead of a placeholder being added. On the chart, placeholders show a "?".

### `addRelative`: one function for every kind

`addRelative(kind, ofId, opts)` creates a new person and wires up the right edges. The comment lists the kinds (`js/family.js:57`):

```js
// kind: mother | father | sibling | halfsib-mother | halfsib-father | partner | child | adopted
```

- **mother / father** (lines 60–64): set the sex, link as parent, and if the other parent exists, make them partners. The function itself does not check whether a mother already exists; the app only shows the "add mother" button when there is none (`js/app.js:444`).
- **sibling** (lines 65–67): call `ensureParents`, then link the new person to both parents.
- **half-sibling** (lines 68–75): a half-sibling shares one parent. Their other parent is the shared parent's *other* partner. If there is none, a placeholder of the opposite sex is created and partnered:

```js
    let step = partnersOf(shared).find(x => x !== other);
    if (!step) { const sp = newPerson({ sex: byId(shared).sex === 'F' ? 'M' : 'F' }); S.people.push(sp); linkPartners(shared, sp.id); step = sp.id; }
```
(`js/family.js:73-74`)

Why the placeholder? The code that decides "full or half sibling" needs to see a *different* other parent (see `fullSiblings` below), and it matches how medical pedigrees are drawn.

- **partner** (lines 76–79): if the partner's sex is not given, it guesses the opposite of yours.
- **child / adopted** (lines 80–84): link as a child (with `bio` false for adopted) and also link the person's partner as the other parent. **Limitation:** it uses `partnersOf(ofId)[0]`, the *first* partner only. If someone has had two partners, the new child is linked to whichever partner was added first.

Finally `touchFamily()` clears the cache and the new person is returned. In our example, `addRelative('child', 'aunt')` creates Cousin and links him to both Aunt and Uncle automatically.

## Removing relatives (lines 88–106)

If you delete your aunt, her husband and son would be left floating, connected to nobody. So deleting someone also deletes everyone who would be cut off from you. This uses **breadth-first search**.

**Concept: queue and breadth-first search (BFS).** A **queue** is a waiting line: you add to the back (`queue.push(x)`) and take from the front (`queue.shift()`). BFS explores a graph from a starting node in "rings": first everyone one step away, then two steps, and so on. You keep a `seen` set so you never visit someone twice. The pattern looks like this:

```js
  const gone = new Set([id]);
  const seen = new Set([SELF]), queue = [SELF];
  while (queue.length) {
    const cur = queue.shift();
    for (const n of neighbors(cur)) if (!seen.has(n.id) && !gone.has(n.id)) { seen.add(n.id); queue.push(n.id); }
  }
  for (const p of S.people) if (!seen.has(p.id)) gone.add(p.id);
  return gone;
```
(`js/family.js:90-97`)

The trick: start the BFS from *you*, but pretend the person being deleted is a wall (`!gone.has(n.id)`). Anyone the search cannot reach is cut off, so they go too.

**Trace: removing Aunt.** BFS from You reaches Mom, Dad, then Grandma and Grandpa. From the grandparents it would reach Aunt, but Aunt is in `gone`, so it stops there. Uncle and Cousin are only reachable through Aunt, so they are never seen. Result (checked by running it): `['aunt', 'uncleM', 'cousin']`. `app.js` shows how many extra people will go before you confirm (`js/app.js:443`).

`removePerson` (lines 99–106) refuses to delete you, then filters `S.people`, `S.rels` and `S.reports` to drop anything that mentions a removed person, including answers they gave about others (`r.by`).

You may notice `removalSet` calls `neighbors`, which is defined lower in the file (line 109). That works because **function declarations are "hoisted"**: JavaScript makes every `function name() {}` in a script available before the code runs.

## Graph walks (lines 108–137)

### `neighbors`: one step in any direction

```js
function neighbors(id) {
  return [
    ...parentLinks(id).map(l => ({ id: l.id, step: 'up', bio: l.bio })),
    ...childLinks(id).map(l => ({ id: l.id, step: 'down', bio: l.bio })),
    ...partnersOf(id).map(pid => ({ id: pid, step: 'partner', bio: false })),
  ];
}
```
(`js/family.js:109-115`)

Each neighbor says which way the step goes: up to a parent, down to a child, or sideways to a partner. The `...` spreads three lists into one.

### `bioAncestors`: BFS up the birth-parent links

This is the heart of the genetics. It finds every biological ancestor and how many generations up they are:

```js
function bioAncestors(id) {
  const dist = new Map([[id, 0]]), queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    for (const p of bioParents(cur)) if (!dist.has(p)) { dist.set(p, dist.get(cur) + 1); queue.push(p); }
  }
  return dist;
}
```
(`js/family.js:117-124`)

`new Map([[id, 0]])` creates a map that starts with one entry: the person themself at distance 0. The map does two jobs: it records distances, and `dist.has(p)` doubles as the "already seen" check.

**Trace: `bioAncestors('self')`.**

| Step | Take from queue | Birth parents found | Map after | Queue after |
|---|---|---|---|---|
| start | | | self→0 | [self] |
| 1 | self | mom, dad | +mom→1, dad→1 | [mom, dad] |
| 2 | mom | grandma, grandpa | +grandma→2, grandpa→2 | [dad, grandma, grandpa] |
| 3 | dad | (none on chart) | | [grandma, grandpa] |
| 4, 5 | grandma, grandpa | (none) | | [] |

Result: `{ self: 0, mom: 1, dad: 1, grandma: 2, grandpa: 2 }`.

For the cousin, `bioAncestors('cousin')` gives `{ cousin: 0, aunt: 1, uncle: 1, grandpa: 2, grandma: 2 }`.

Only birth parents are followed (`bioParents`), so adoptive parents never count as ancestors. That is the whole reason adopted relatives are not "blood" relatives in the risk rules.

### `generations`: which row each person is on

```js
      gen.set(n.id, gen.get(cur) + (n.step === 'up' ? -1 : n.step === 'down' ? 1 : 0));
```
(`js/family.js:132`)

This is another BFS, starting from you at generation 0 and walking every kind of edge. Going up subtracts 1, down adds 1, partners stay level. In our example: Mom, Dad, Aunt and Uncle are −1; Grandma and Grandpa are −2; Cousin is 0. The chart uses these numbers as rows.

**Limitation:** the first route the search finds decides the number, and it is never checked again. In unusual families (for example, someone who partners with a person from a different generation), two routes might disagree, and the second one is ignored. People not connected to you at all get no generation and are left off the chart.

## Kinship: what is this person to me? (lines 139–219)

There are two kinds of names the app shows:

- A **path label** like "Mom's sister's son" (from `pathLabel`). It is easy to understand in any family.
- A **kinship label** like "First cousin (Mom's side)" plus a **degree** (from `computeKin`). This is what doctors and the risk rules use.

### Small word helpers (lines 140–143)

```js
const sexWord = (p, f, m, u) => p.sex === 'F' ? f : p.sex === 'M' ? m : u;
const greats = n => n <= 0 ? '' : n === 1 ? 'Great-' : `${n}x great-`;
```
(`js/family.js:142-143`)

`sexWord(p, 'sister', 'brother', 'sibling')` picks the word for the person's sex. `a ? b : c` is the **conditional operator** ("if a then b else c"). `greats(2)` gives `"2x great-"`; the backtick string is a **template literal**, where `${...}` inserts a value into the text.

### `pathLabel`: BFS that remembers the route

`pathLabel` runs BFS from you, but instead of storing distances it stores, for each person, **how we got there** (`prev`):

```js
    const ns = neighbors(cur).sort((a, b) => (b.bio - a.bio) || ['up', 'down', 'partner'].indexOf(a.step) - ['up', 'down', 'partner'].indexOf(b.step));
    for (const n of ns) if (!prev.has(n.id)) { prev.set(n.id, { from: cur, ...n }); queue.push(n.id); }
```
(`js/family.js:152-153`)

The sort decides which route wins when there are ties: birth links before adoptive ones (`b.bio - a.bio` turns `true`/`false` into 1/0), then up before down before partner. So the label prefers "Mom's sister" over a route through a partner.

Then it walks backwards from the target to you along `prev`, building a list of steps (line 157), and turns each step into a word: up becomes "mom"/"dad", down becomes "daughter"/"son", partner becomes "wife"/"husband". One special case: "up then down" is a sibling, so those two steps become one word (lines 161–165), with "half-", "adopted" or "adoptive" in front when needed.

**Trace for Cousin.** BFS finds the route You → Mom (up) → Grandma (up) → Aunt (down) → Cousin (down). Turning it into words:

1. Step "up to Mom", next step is also up → `"mom"`.
2. Step "up to Grandma", next step is down → sibling case. `firstDegreePair('mom', 'aunt')` is true (full sisters) → `"sister"`, and the down step is skipped.
3. Step "down to Cousin" → `"son"`.

Joined with `"'s "` and capitalized: **"Mom's sister's son"**. That is exactly what the code produced when I ran it.

If the path needs more than four words, it returns `null` (line 170), because "Mom's mom's dad's sister's son" is not helpful. The kinship label is used instead. If the person is not connected at all, it returns `'Relative'`.

### `kin`: the cached front door

```js
function kin(id) {
  if (KIN_CACHE.has(id)) return KIN_CACHE.get(id);
  KIN_CACHE.set(id, { blood: false, degree: null, label: 'Relative', short: 'Relative', side: null }); // breaks cycles between married-in partners
  const r = computeKin(id);
  KIN_CACHE.set(id, r);
  return r;
}
```
(`js/family.js:177-183`)

This is the memoization described earlier. *Before* computing, it stores a temporary "not blood" answer. Why? `computeKin` can call `sideOf`, which can call `kin()` on the person's partner, which can call `kin()` back on the first person. Without the placeholder, two married-in partners would call each other forever; with it, the second call finds the placeholder and stops.

### `computeKin`: the main algorithm

The idea comes from genetics. To know how related two people are, find their **closest common ancestor** and count the generations from each person up to that ancestor:

- `dS` = generations from **S**elf (you) up to the common ancestor
- `dX` = generations from the other person (**X**) up to the common ancestor

**Step 1: find the common ancestors at the shortest total distance.**

```js
  const aS = bioAncestors(SELF), aX = bioAncestors(id);
  let best = Infinity, common = [];
  for (const [c, dX] of aX) if (aS.has(c)) {
    const tot = aS.get(c) + dX;
    if (tot < best) { best = tot; common = [c]; } else if (tot === best) common.push(c);
  }
```
(`js/family.js:187-192`)

`for (const [c, dX] of aX)` loops over the map's entries and destructures each into the ancestor `c` and its distance. `Infinity` is a starting value bigger than any number, so the first match always wins.

**Trace for Cousin.** `aS = { self 0, mom 1, dad 1, grandma 2, grandpa 2 }`, `aX = { cousin 0, aunt 1, uncle 1, grandpa 2, grandma 2 }`. Shared: Grandpa (2 + 2 = 4) and Grandma (2 + 2 = 4). So `best = 4` and `common = [grandpa, grandma]`.

**Step 2: no common ancestor means not blood.** (lines 193–196) Uncle has no ancestors in common with you, so he gets `blood: false` and his path label ("Mom's sister's husband") as his label. The `adopted` flag is set if he is your adopted child or your adoptive parent, so the chart can say "Adoptive · not blood related".

**Step 3: lineal or not, full or half.**

```js
  const c = common[0], dS = aS.get(c), dX = aX.get(c);
  const lineal = dS === 0 || dX === 0;
```
(`js/family.js:197-198`)

**Lineal** means one person is the other's direct ancestor (a parent, grandparent, child or grandchild): one of the distances is 0.

```js
  const full = common.length >= 2 || (!lineal && below(aS, dS).some(a => below(aX, dX).some(b => a !== b && fullSiblings(a, b))));
```
(`js/family.js:201`)

The relationship is **full** if the two lines meet at a couple (two common ancestors at the same distance), or if they meet at one parent whose two children (the people just below `c` on each line, found by `below`) are full siblings. Otherwise it is **half**.

**Step 4: the degree.**

```js
  const degree = lineal ? dS + dX : (full ? dS + dX - 1 : dS + dX);
```
(`js/family.js:202`)

Degree is how geneticists group relatives. First-degree relatives (parents, children, full siblings) share about half their DNA with you, second-degree about a quarter, third-degree about an eighth. The formula gives:

| Relative | dS | dX | lineal? | full? | degree |
|---|---|---|---|---|---|
| Mom | 1 | 0 | yes | | 1 + 0 = **1** |
| Grandma | 2 | 0 | yes | | **2** |
| Brother | 1 | 1 | no | yes | 1 + 1 − 1 = **1** |
| Half-sister | 1 | 1 | no | no | 1 + 1 = **2** |
| Aunt | 2 | 1 | no | yes | **2** |
| Cousin | 2 | 2 | no | yes | **3** |

Why subtract 1 for full relationships? Sharing *both* grandparents (a couple) roughly doubles the shared DNA compared with sharing one, which moves the relative one degree closer. A half-sibling shares only one parent, so they stay at degree 2, the same as a grandparent.

**Step 5: the side and the words.** `sideOf` (below) decides maternal or paternal. Then a chain of `if`s picks the name (lines 208–216):

- `dX === 0`: an ancestor. 1 up is Mother/Father; 2 up is "Maternal grandmother"; more gets "Great-".
- `dS === 0`: a descendant (Daughter, Granddaughter, ...).
- `dS === 1 && dX === 1`: sibling, with "Half-" if not full.
- `dX === 1`: aunt/uncle (and great-aunts).
- `dS === 1`: niece/nephew.
- Everything else is a cousin:

```js
    const n = Math.min(dS, dX) - 1, removed = Math.abs(dS - dX);
```
(`js/family.js:214`)

The cousin number is one less than the shorter distance, and "removed" is the difference in generations. For our Cousin: `n = min(2, 2) − 1 = 1` → "first", `removed = 0`. Your mom's first cousin would have dS = 3, dX = 2: `n = 1`, `removed = 1` → "First cousin once removed".

**Results from running the code on our example:**

| Person | label | short (path) | degree | side |
|---|---|---|---|---|
| Mom | Mother | Mom | 1 | none |
| Grandma | Maternal grandmother | Mom's mom | 2 | maternal |
| Aunt | Maternal aunt | Mom's sister | 2 | maternal |
| Uncle | Mom's sister's husband | Mom's sister's husband | none (not blood) | maternal |
| Cousin | First cousin (Mom's side) | Mom's sister's son | 3 | maternal |
| Brother | Brother | Brother | 1 | none |
| Half-sister | Half-sister | Half-sister | 2 | paternal |

### `sideOf`: Mom's side or Dad's side?

The side is "which of your parents the connection runs through" (`js/family.js:221-236`). Three cases:

1. **Half-siblings** (`dS === 1` and not full): the side of the one shared parent. Half-sister shares Dad, so "paternal".
2. **Relatives through a grandparent or higher** (`dS >= 2`): for each of your birth parents, check if the common ancestor is exactly one generation above that parent (`a.get(commonAncestor) === dS - 1`). For Cousin, the common ancestor is Grandpa at dS = 2; Grandpa is 1 generation above Mom, so "maternal".
3. **Married-in relatives** (no common ancestor): take the side of the blood relative they are partnered with. Uncle is married to Aunt (maternal), so he is maternal. This is the call to `kin(q)` that could loop, which the cache placeholder prevents.

Your parents, siblings and children get no side (`null`). That makes sense: Mom is not "on Mom's side". `risk.js` handles first-degree relatives separately (`js/risk.js:365`).

### Full siblings and first-degree pairs (lines 240–256)

```js
function fullSiblings(a, b) {
  const pa = bioParents(a), pb = bioParents(b), shared = pa.filter(x => pb.includes(x));
  if (!shared.length) return false;
  if (shared.length >= 2) return true;
  const oa = parentLinks(a).map(l => l.id).filter(x => !shared.includes(x)), ob = parentLinks(b).map(l => l.id).filter(x => !shared.includes(x));
  return !(oa.some(x => !ob.includes(x)) && ob.some(x => !oa.includes(x)));
}
```
(`js/family.js:250-256`)

Two people sharing two birth parents are full siblings. If they share exactly one, the code looks at their *other* parents. They count as half-siblings only if **each** has a known other parent that the other one does not have.

**Trace: You and Half-sister.** Shared birth parent: Dad. Your other parent: Mom. Her other parent: the placeholder created by `addRelative('halfsib-father', ...)`. Each has a different other parent, so the function returns `false`: half-siblings. This is why `addRelative` always creates that placeholder.

Why treat "other parent unknown" as full? The comment explains (`js/family.js:248`): "A missing or deleted parent is "unknown", not "different"." If you only know one parent of a sibling, the code does not guess "half". Treating them as full makes them first-degree, which is the more cautious choice for health risk.

`firstDegreePair(a, b)` (lines 242–246) is true for parent–child or full siblings. `pathLabel` uses it to choose "sister" or "half-sister".

### Known limitations of the kinship code

- **Only one common ancestor is used** for the distances (`common[0]`). In families where the parents are related by blood, or with **double cousins** (two sisters marry two brothers), people share more DNA than the label and degree show. Double first cousins would be labeled ordinary "First cousin", degree 3.
- **"Full" means "two common ancestors at the same distance"** (`common.length >= 2`). That is right for a married couple, but the code does not check that the two are actually partners.
- **Unknown other parents count as full** on purpose (see above), so a true half-sibling entered without their other parent will be treated as a full sibling.
- **Sex-based words** fall back to neutral words ("Parent", "sibling", "aunt or uncle") when sex is not set.
- Labels are in **English only**, even though the interviews come in eleven languages.

---

# File 2: `js/layout.js`

## What it is for

Drawing a family tree by hand is easy. Getting a computer to do it for *any* family shape (remarriages, half-siblings, in-laws) without lines crossing everywhere is hard. `layout.js` solves it with a standard method for layered graphs called the **Sugiyama method** (named after Kozo Sugiyama, who published it in 1981). The file's top comment summarizes it in three phases (`js/layout.js:1-8`):

1. **Layering:** each person's row is their generation.
2. **Ordering:** reorder people in each row to remove most line crossings.
3. **Placement:** give each person an x coordinate so parents sit centered over their children and nobody overlaps.

Then it draws the result as SVG.

**Concept: SVG coordinates.** SVG (Scalable Vector Graphics) is a way to describe a picture as shapes in text, like `<circle cx="50" cy="40" r="20"/>`. The browser draws it at any size without blurring. Coordinates start at the top-left; **x grows to the right and y grows downward** (unlike math class, where y goes up). That is why the top row (oldest generation) has the smallest y. The `viewBox` attribute says which rectangle of these coordinates to show, so the layout can use any numbers (even negative x) and the browser scales them to fit.

## Constants (lines 11–13)

```js
const LAYOUT = { W: 156, ROW: 240, TOP: 64, SZ: 40, LABEL: 142, GUTTER: 46 };
const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
let TREE_GEOM = null; // the last interactive chart drawn, used for zoom and "center on me"
```
(`js/layout.js:11-13`)

`W` is the width of one person's slot (people sit at least 156 units apart), `ROW` the distance between generations, `TOP` the y of the first row, `SZ` the symbol size, `LABEL` the maximum label width (a bit less than `W`, so neighbors' labels do not touch) and `GUTTER` the space on the left for generation numbers. `avg` averages a list (`.reduce` adds everything up, starting from 0). `TREE_GEOM` saves the last layout so `app.js` can zoom and scroll to "you".

## `layoutFamily`: the whole algorithm (lines 15–76)

### Phase 1: layering into rows of blocks

```js
  const gen = generations();
  const ids = S.people.map(p => p.id).filter(id => gen.has(id));
  const gens = [...new Set(ids.map(id => gen.get(id)))].sort((a, b) => a - b);
  const rows = gens.map(g => buildBlocks(ids.filter(id => gen.get(id) === g)));
```
(`js/layout.js:17-20`)

Get every connected person's generation, list the distinct generation numbers sorted from oldest (most negative) to youngest, and build one row per generation. `new Set(...)` removes duplicates. Note `.sort((a, b) => a - b)`: JavaScript's default sort compares as text, so a number comparison function is needed.

Each row is a list of **blocks**. A block is a group of partners who must stay side by side. `buildBlocks` (lines 78–92) finds them with a small BFS over partner links within the row, so a couple becomes one block, and a person with two partners becomes a block of three.

`orderBlock` (lines 94–104) picks the starting order inside a block. For two people, the man goes on the left (`js/layout.js:96`), which is the usual pedigree convention. For three or more, it starts from someone with only one partner in the block and walks along partner links, so a person with two partners ends up in the middle.

**Trace.** Our family has generations −2, −1, 0, so three rows. The starting blocks were (from a run of the code):

```
row 0: [Grandpa, Grandma]
row 1: [Dad, Mom]  [Uncle, Aunt]
row 2: [You]  [Cousin]
```

### Families: grouping children by their parents

```js
    const key = links.map(l => l.id).sort().join('|');
    if (!famMap.has(key)) famMap.set(key, { parents: links.map(l => l.id).sort(), kids: [] });
    famMap.get(key).kids.push({ id, bio: links.every(l => l.bio) });
```
(`js/layout.js:27-29`)

Children with exactly the same set of parents form one "family", which will share one horizontal sibling bar. The key is the sorted parent ids joined with `|` (for example `"grandma|grandpa"`). Sorting makes sure "Mom and Dad" and "Dad and Mom" give the same key. A child counts as `bio` only if *all* their parent links are biological; otherwise their line is drawn dashed.

In our example there are three families: Mom+Dad → You; Grandma+Grandpa → Mom, Aunt; Aunt+Uncle → Cousin.

### Phase 2: crossing reduction with barycenters

**Concept: barycenter.** The barycenter is just the average position. If your parents sit at positions 3 and 5 in the row above, your barycenter is 4. Sorting a row by barycenters tends to put each person under their parents, which removes most crossing lines. It is a simple rule that works well in practice; finding the perfect order with the fewest crossings is a famously hard problem, so the code does not try.

```js
  for (let it = 0; it < 6; it++) {
    for (let r = 1; r < rows.length; r++) sortRow(rows[r], m => parentLinks(m).map(l => l.id), rowIndex(rows[r - 1]), true);
    if (it < 5) for (let r = rows.length - 2; r >= 0; r--) sortRow(rows[r], m => childLinks(m).map(l => l.id), rowIndex(rows[r + 1]), false);
  }
```
(`js/layout.js:34-37`)

Each round does a **top-down pass** (sort each row by where the parents are in the row above) and then a **bottom-up pass** (sort each row by where the children are in the row below). Six top-down passes and five bottom-up ones mean the last pass is always top-down, which is also the pass that turns couples to face their parents (`true` as the last argument).

`rowIndex(row)` (line 105) gives each person their position number in a row: 0, 1, 2, ... across all blocks.

`sortRow` (lines 106–122) works in two parts:

1. If `orient` is true, call `orientBlock` on each block (explained next).
2. Give each block a sort key: the average barycenter of its members. A block with no links in the neighbor row gets `prev + 1e-3` (the previous key plus 0.001), so it stays right after whatever it followed. Then sort by key. Modern JavaScript's sort is **stable** (equal keys keep their order), which also helps blocks stay put.

### Turning couples: `orientBlock`

The goal: each partner should sit on the side nearer their own parents, and a person who married in (no parents on the chart) should sit on the *outside*, away from the family, so a blood relative stays next to their brothers and sisters.

For a couple (`js/layout.js:127-134`): if both have parents on the chart, the one whose parents are further left goes left. If only one does, the code looks at whether that person's barycenter is left or right of the row's middle (`mid`), and puts the married-in partner on the outer side:

```js
      const blood = ba != null ? 0 : 1, side = (ba ?? bb) < mid ? 'left' : 'right';
      // married-in partner goes outside: left of a left-side relative, right of a right-side relative
      if ((side === 'left') !== (blood === 1)) m.reverse();
```
(`js/layout.js:131-133`)

`ba ?? bb` is the **nullish coalescing operator**: "use `ba`, unless it is `null` or `undefined`, then use `bb`".

There is a similar set of rules for blocks of three (lines 135–141).

**Trace.** In row 1, Mom and Aunt both have parents in row 0, at positions 0 and 1, so each has barycenter 0.5. The row's middle is also 0.5. Dad and Uncle have no parents on the chart. For block [Dad, Mom]: Mom is the blood member, `0.5 < 0.5` is false, so her side is "right", and the block is flipped so Dad (married in) is on her right: [Mom, Dad]. The same happens to [Uncle, Aunt] → [Aunt, Uncle]. Final order after Phase 2:

```
row 0: [Grandpa, Grandma]
row 1: [Mom, Dad]  [Aunt, Uncle]
row 2: [You]  [Cousin]
```

**Limitation shown by this trace:** because both sisters had exactly the middle value, they were both treated as "right side", so Dad ended up *between* Mom and Aunt. The comment at the top of the file says a person "always stays next to their brothers and sisters", but with a tie like this they don't. The chart is still correct (the sibling bar runs behind Dad), just less tidy. Also, blocks of four or more people are never turned at all, since `orientBlock` only handles sizes 2 and 3.

### Phase 3: coordinates

First everyone gets a simple starting x: blocks laid out left to right, `W` apart (`js/layout.js:41`). The `where` map remembers, for each person, which block they are in and their position inside it. Then:

```js
  const px = id => { const w = where.get(id); return w.b.x + w.i * W; };
```
(`js/layout.js:42`)

A person's x is their block's x plus their slot inside the block. Because `px` reads the block's *current* x, moving a block moves everyone in it.

The main loop runs 80 times, alternating top-to-bottom and bottom-to-top (line 44). For each block it collects "pulls", the x where the block would like to be:

```js
          if (f.parents.every(p => b.members.includes(p))) pulls.push(b.x + (km - pm)); // center parents over kids
          if (f.kids.some(k => b.members.includes(k.id))) pulls.push(b.x + (pm - km));  // center kids under parents
```
(`js/layout.js:51-52`)

`pm` is the average x of a family's parents and `km` the average x of its children. If this block holds the parents, it wants to move by `km − pm` to sit centered above the kids. If it holds a child, it wants to move by `pm − km` to sit centered under the parents. The block's desired x is the average of all its pulls. Then `pack` places the row.

### `pack`: no overlaps, as close as possible

```js
  row.forEach((b, i) => { L[i] = i ? Math.max(desired[i], L[i - 1] + w(row[i - 1]) + W) : desired[i]; });
  for (let i = row.length - 1; i >= 0; i--) R[i] = i < row.length - 1 ? Math.min(desired[i], R[i + 1] - w(row[i]) - W) : desired[i];
  row.forEach((b, i) => { b.x = (L[i] + R[i]) / 2; });
```
(`js/layout.js:148-150`)

`w(b)` is the width a block takes beyond its first member. `L` sweeps left to right: each block goes where it wants, unless that would overlap the previous block, in which case it is pushed right. `R` does the same sweeping right to left, pushing left. Each of these alone would lean the row to one side, so the final x is the average of the two. Since both `L` and `R` keep every gap at least `W` wide, their average does too, so nothing overlaps.

**Trace of the first round** (I checked these numbers by running the code with the loop stopped after one round). Starting x: Grandpa 0, Grandma 156; Mom 0, Dad 156, Aunt 312, Uncle 468; You 0, Cousin 156.

- **Row 0, grandparents block.** Their family's parents average `pm = 78`; their kids Mom and Aunt average `km = (0 + 312) / 2 = 156`. Pull: `0 + (156 − 78) = 78`. Block moves to 78: Grandpa 78, Grandma 234.
- **Row 1, [Mom, Dad] block (x = 0).** As parents of You: `pm = 78`, `km = 0`, pull `0 + (0 − 78) = −78`. As a child of the grandparents (Mom): `pm = 156`, `km = 156`, pull `0`. Desired: average = −39.
- **Row 1, [Aunt, Uncle] block (x = 312).** As parents of Cousin: `pm = 390`, `km = 156`, pull `78`. As a child: pull `312`. Desired: 195.
- **Pack row 1.** `L = [−39, max(195, −39 + 156 + 156)] = [−39, 273]`. `R = [min(−39, 195 − 156 − 156), 195] = [−117, 195]`. Averages: −78 and 234. So Mom −78, Dad 78, Aunt 234, Uncle 390.
- **Row 2.** You are pulled under your parents' middle (0); Cousin is pulled under Aunt and Uncle's middle (312).

After all 80 rounds the chart settles at: Grandpa 26, Grandma 182; Mom −52, Dad 104, Aunt 260, Uncle 416; You 26, Cousin 338. You sit exactly under the middle of Mom and Dad ((−52 + 104) / 2 = 26), and the grandparents' center (104) is close to the center of Mom and Aunt (104). The repeated small moves are why the code loops many times: each pass fixes one row a little, which shifts the rows above and below, until nothing changes much.

### Final positions and the sibling-bar stagger (lines 60–75)

Each person's final `{ x, y }` goes into `pos`, with `y = TOP + r * ROW` (64, 304, 544 in our example). The code also tracks the leftmost and rightmost x so the picture can be sized.

If two families' sibling bars are on the same row, they could sit at the same height and overlap. Lines 71–73 sort the families on each row by their children's average x and give them a `stagger` of 0, 1 or 2 (`i % 3`, the remainder after dividing by 3). Each step raises the bar 9 units. **Limitation:** with four or more families on one row, the fourth reuses stagger 0, so two bars can still line up at the same height (usually they are far apart, so it rarely matters).

The function returns everything the drawing needs. For our example: `minX` is −176 (Mom's −52, minus half a slot, minus the gutter), the width is 682 and the height is 692.

## Measuring label text (lines 153–175)

Labels must fit under each symbol without spilling into the neighbor's space. To know how wide a piece of text will be, the code uses a hidden HTML **canvas**:

```js
const MEASURE = document.createElement('canvas').getContext('2d');
function textWidth(cls, t) { MEASURE.font = FONTS[cls]; return MEASURE.measureText(t).width; }
```
(`js/layout.js:158-159`)

The canvas is never shown; `measureText` gives the width of a string in the font listed in `FONTS` (lines 154–157) for that kind of line. `fitText` (lines 160–164) removes one character at a time until the text plus "…" fits. `wrapItems` (lines 166–175) puts conditions into lines, adding " · next item" until a line would be too wide, then starting a new one.

## Drawing (lines 177–237)

### `symbol`: standard pedigree shapes

```js
  if (p.sex === 'M') return `<rect class="${cls}" x="${x - h}" y="${y - h}" width="${LAYOUT.SZ}" height="${LAYOUT.SZ}" rx="4" fill="${fill}"/>`;
  if (p.sex === 'F') return `<circle class="${cls}" cx="${x}" cy="${y}" r="${h}" fill="${fill}"/>`;
```
(`js/layout.js:180-181`)

These are the standard medical pedigree shapes: a **square for male**, a **circle for female**, and a **diamond for unknown** sex (line 182, a four-cornered `path`). `h` is half the symbol size, so `x - h` puts the square's corner where its center lands on `(x, y)`. The SVG is built as text with template literals. `fill` is the accent color if the person has a condition; `faint` gives non-blood relatives a dashed outline (`index.html:242`).

### `nodeLabel`: the text under each symbol

`nodeLabel` (lines 185–198) builds a list of lines: the name (or the relationship if there is no name), the relationship, "Not blood related" when it applies, birth or death details ("d. 61 · Heart attack"), and up to three lines of conditions from `facts()` in `risk.js`, with a `*` when relatives disagreed and " +more" if there are more. It then draws a rounded rectangle (`lbl-bg`) as wide as the widest line, with the text on top. The backing hides any line that passes behind the label. Every piece of text goes through `esc()` (from `js/app.js:7`), which turns characters like `<` into safe codes so a name typed by a user can never inject code into the page.

### `treeSVG`: putting it all together

```js
function treeSVG({ interactive = true, hl = S.hl, zoom = null } = {}) {
```
(`js/layout.js:200`)

This combines destructuring with defaults: the function takes one options object and pulls out three settings, each with a default value. The Tree tab calls `treeSVG({ zoom: S.zoom || 1 })` (`js/app.js:467`); the doctor report calls `treeSVG({ interactive: false, hl: 'any' })` (`js/app.js:844`).

It draws in this order, so later items appear on top:

1. **Generation numbers** I, II, III on the left of each row (line 203), a pedigree convention.
2. **Partner lines** between partners on the same row (lines 204–207).
3. **Family lines** (lines 208–217): down from the middle of the couple to the sibling bar at height `sy`, across the bar, and down to each child. Adopted children's lines are dashed (`svg .adopt`, `index.html:241`).
4. **People** (lines 218–234): a selection ring, the symbol, an optional round photo (cut to a circle with a `clipPath`), a "?" for a blank placeholder, a **diagonal slash if they died**, an **arrow pointing at you** (on medical pedigrees the arrow marks the "proband", the person the chart is about), a check mark if interviewed, and the label. Each person is wrapped in a `<g>` (group) with an `aria-label` (name, relationship, conditions) that screen readers read aloud; on the interactive chart it also gets `tabindex="0"` and `role="button"` for keyboard use.
5. **The `<svg>` wrapper** (lines 235–236):

```js
  return `<svg viewBox="${L.minX} 0 ${L.width} ${L.height}" ${size} role="img" aria-label="Family pedigree chart">${g}</svg>`;
```
(`js/layout.js:236`)

The `viewBox` starts at `L.minX` (−176 in our example), so the whole chart is visible even with negative x values. `treeSVG` reruns the full layout (80 placement rounds) on every call; that is quick for tens of people but grows with family size.

### Other layout limitations

Besides the ones above (orientation ties, blocks of four, three stagger heights): partner lines assume the partners sit next to each other, so a line can pass behind someone in between; a child with one birth parent and one adoptive parent gets a dashed line even toward the birth parent, because `bio` is decided for the whole family; and the `FONTS` table must stay in sync with the CSS or label widths will be measured wrong.

---

## Check your understanding

**1. Why does the app store only "parent" and "partner" links, not "aunt" or "cousin" links?**
Every other relationship can be worked out from those two. Storing one kind of fact means there is a single source of truth, so labels like "aunt" can never disagree with the actual parent links.

**2. What does `bioAncestors('self')` return for our example family, and why is it a breadth-first search?**
A Map: `self 0, mom 1, dad 1, grandma 2, grandpa 2`. BFS visits people in order of distance, so the first time it reaches someone is by the shortest route, which gives the correct number of generations.

**3. Why is a full sibling first-degree but a half-sibling second-degree?**
In `computeKin`, a full relationship meets at two common ancestors (a couple), so the code uses `dS + dX − 1` = 1. A half-sibling shares only one parent, so it uses `dS + dX` = 2, about a quarter of shared DNA, the same as a grandparent.

**4. What is `KIN_CACHE` for, and how does the app make sure it is not out of date?**
It memoizes `kin()` results so relationships are not recomputed many times per screen. `touchFamily()` replaces it with an empty Map whenever the family changes; it is called by `addRelative`, `removePerson` and `save()`. The temporary placeholder entry also stops two married-in partners from calling each other forever.

**5. In `pack`, why does the code sweep left-to-right and right-to-left and then average?**
Each sweep alone pushes overlapping blocks to one side, which would make the chart lopsided. Both sweeps keep at least one slot (`W`) between neighbors, so their average does too: nothing overlaps, and the row stays centered on where the blocks wanted to be.
