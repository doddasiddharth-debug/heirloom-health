# 04 Risk and timeline: `risk.js` and `timeline.js`

This chapter covers the "medical brain" of Heirloom Health. `js/risk.js` turns what relatives said into facts, runs the guideline rules, ranks risk levels and picks who to interview next. `js/timeline.js` turns the guideline results into a "what to check and when" plan.

Neither file draws anything on its own or asks questions. They read the shared state `S` (from `js/app.js`), the kinship function `kin()` (from `js/family.js`) and the tables in `js/content.js`, and return plain objects that `app.js`, `handoff.js` and the PDF code display.

**None of this is a diagnosis.** The rules are simplified summaries of published guidelines, meant to start a conversation with a doctor. The section "What the rules do NOT do" lists the main simplifications.

---

## Part 1: `js/risk.js`

### Purpose and fit

`risk.js` loads after `content.js` and `family.js` and before `timeline.js` and `app.js`. It has four blocks, each marked by a comment: reports and merged facts (lines 8–41), guideline rules (43–313), who to ask next (316–353), and family-history risk levels (355–406).

Its main outputs: `guidelineCards()` feeds the doctor report, PDF, summary, doctor checklist and timeline; `familyRisk()` builds the "My risks" tab (`js/app.js:675`); `suggestInterviews()` fills "Who to ask next" (`js/app.js:425`).

---

### Block 1: Reports and merged facts

#### Reports versus facts

The app never stores "Grandma had breast cancer at 48" as one truth. It stores a **report**: who it is about (`pid`), the condition (`cond`), its kind (`type`, like `'breast'`), the `age`, the relative's words (`said`), **who said it** (`by`) and the date (`at`). If three relatives mention Grandma's cancer, there are three reports. A **fact** is what you get by merging all reports about the same person and condition.

#### `findReport`, `addReport`, `dropReports` — lines 9–16

- `findReport(pid, cond, type, by)` uses `find` to return the first report matching all four keys. It compares `(r.type || '') === (type || '')`, so a missing type and an empty type count as the same.
- `addReport(pid, cond, type, by, fields = {})` looks for that report; if there is none, it creates one with a new id (`uid('r')`) and today's date and pushes it onto `S.reports`. Then `Object.assign(r, fields)` copies extra values like `{ age: '48' }` onto it. `fields = {}` is a **default parameter**, used when the caller leaves it out. **Why:** calling it twice updates one report instead of making duplicates.
- `dropReports(pred)` deletes reports:

```js
function dropReports(pred) { S.reports = S.reports.filter(r => !pred(r)); }   // js/risk.js:16
```

`pred` is a **predicate**, a function that answers true or false. Every report it says true for is removed. Passing a function lets each caller decide what to delete.

#### `facts(pid)` — lines 19–38

Almost every rule calls this. Step by step:

**1. Pick this person's reports** (line 20) with `filter`.

**2. Group them in a `Map`** (lines 21–26). A `Map` is a dictionary: values stored under keys. The key joins condition and kind:

```js
const key = r.cond + '|' + (r.type || '');        // js/risk.js:23
```

So `'cancer|breast'` and `'cancer|'` (kind unknown) are separate groups, each `{ cond, type, reports: [] }`. "Loop, and push each item into a Map under its key" is the standard way to **group** things in JavaScript.

**3. Merge "kind unknown" into the only known kind** (lines 28–32). The comment says why: "Cancer, kind unknown" from one person and "breast cancer" from another are probably the same cancer. For each condition that has kinds (the keys of `SUBTYPES`: cancer, diabetes, heart, kidney, mental, blood, liver):

```js
if (untyped && typed.length === 1) { typed[0].reports.push(...untyped.reports); groups.delete(cond + '|'); }   // js/risk.js:31
```

The `...` is the **spread** operator: `push(...list)` pushes each item separately rather than the list as one item. With two known kinds (say breast and ovarian), the app can't tell which one the vague report meant, so it leaves it as its own fact.

**4. Merged age and disagreement** (lines 34–37). `+r.age` turns each age into a number; only values above 0 are kept (`+''` is 0 and `+'abc'` is `NaN`, so blank or garbled ages drop out). The fact's `age` is the **youngest** one, and:

```js
disagree: ages.length > 1 && max - min >= 3        // js/risk.js:37
```

`range` is text like `48–52` whenever the ages differ at all. The return value `{ ...g, age: ..., ... }` uses **object spread**: copy every field of `g`, then add or override the named ones.

**Why the youngest age?** Guidelines usually get stricter when a relative was younger, so the youngest age is the cautious choice. The doctor report says so (see `ruleDisagreements`).

**5. Sort** (lines 33 and 38). `order` gives each fact a number: the condition's position in `CONDS` × 100, plus the kind's position in its list (99 if no kind). `sort((a, b) => order(a) - order(b))` uses a **sort comparator**: `sort` calls it on two items, and a negative result puts `a` first. Subtracting numbers sorts smallest first, so facts always follow the interview's order.

**Worked example.** Three relatives talk about Grandma:

| Report | cond | type | age | by |
|---|---|---|---|---|
| r1 | cancer | breast | 48 | Mom |
| r2 | cancer | (none) | 52 | Uncle Ravi |
| r3 | cancer | breast | (blank) | Aunt Priya |

Step 2 makes `'cancer|breast'` = [r1, r3] and `'cancer|'` = [r2]. Step 3 moves r2 into the breast group, since it's the only typed one. Step 4: ages [48, 52] (r3's blank dropped), so `age` = `'48'`, `range` = `'48–52'`, and `disagree` = true (52 − 48 = 4). Had Ravi said 50, `range` would be `'48–50'` but `disagree` false: a 2-year gap is treated as normal memory fuzziness.

#### `reporterName(id)` and `isBlank(p)` — lines 40–41

`reporterName` gives `'You'`, the reporter's name, or `'A relative'` if that person was deleted. `isBlank(p)` is true for anyone but you with no birth year, unknown living status, no facts and no notes: an empty box on the tree.

---

### Block 2: Guideline rules

#### The card

The comment at lines 43–45 describes what every rule returns: a list (possibly empty) of **cards**:

```
{ level: 'act' | 'discuss' | 'note' | 'missing', title, rec, why: [...], sources: [...] }
```

`level` is the urgency: **act** (do this), **discuss** (talk to your doctor), **note** (worth knowing), **missing** (information to find). `rec` is the advice, `why` lists the evidence ("Father (Raj): colorectal cancer at 46."), and `sources` are keys into `SOURCES` in `content.js`, which holds the full citations.

#### Helpers — lines 46–61

- **`bloodRelatives()`** returns everyone except you with `kin(p.id).blood` true. Partners who married in and adoptive relatives are never counted.
- **`possibleFor(p, f)`** uses `SEX_ONLY_CANCERS` (ovarian and uterine `'F'`, prostate `'M'`). A man recorded with ovarian cancer is probably a typing mistake, so the fact stays on the record but the rules ignore it. Unknown sex is allowed through.
- **`withFact(test, maxDegree = 3)`** is the workhorse:

```js
for (const p of bloodRelatives()) {
  const k = kin(p.id);
  if (k.degree > maxDegree) continue;
  for (const f of facts(p.id)) if (possibleFor(p, f) && test(f)) out.push({ p, f, k, age: +f.age || null });
}                                                                       // js/risk.js:52-56
```

For each blood relative close enough, it tests each fact. Each hit is `{ p, f, k, age }`: the person, the fact, their kinship, and the age as a number or `null`.

**Degree refresher** (from `kin()`): degree 1 = parents, full siblings, children; degree 2 = grandparents, aunts, uncles, half-siblings; degree 3 = first cousins, great-grandparents. `kin()` also gives `dS` (steps from you up to the shared ancestor) and `dX` (steps from the relative up to it). A parent is `dS = 1, dX = 0`; a sibling is `dS = 1, dX = 1`. Rules use this to tell parents from siblings.

- **`who(x)`** gives "Father (Raj)", **`atAge(x)`** gives "at 46" or "age unknown", and:

```js
const isCancer = (...types) => f => f.cond === 'cancer' && types.includes(f.type);   // js/risk.js:61
```

This is a function that **returns a function**: `isCancer('ovarian', 'pancreatic')` gives back a test. `...types` in a parameter list is a **rest parameter**: it collects all arguments into one array.

#### `ruleColorectal()` — lines 63–79

**Guideline:** US Multi-Society Task Force on Colorectal Cancer (`usmstf`) and USPSTF colorectal screening (`uspstfCrc`). With a first-degree relative diagnosed before 60, or two at any age: colonoscopy from 40, or 10 years before the youngest diagnosis if that's earlier, every 5 years. One first-degree relative at 60+: start at 40, usual intervals.

**The code:** `crc` = colorectal cancer in relatives up to degree 3, split into `fdr` (degree 1) and `other`.

```js
if (fdr.some(x => !x.age || x.age < 60) || fdr.length >= 2) {        // js/risk.js:67
```

`some` is true if at least one item passes. A **missing age counts as young**, and the card adds "An age is missing, so the earlier rule is used to be safe." The start age:

```js
const start = youngest ? Math.min(40, youngest - 10) : 40;            // js/risk.js:69
```

That gives an **act** card, "Start colon cancer screening early", carrying `start` for the timeline. Otherwise one first-degree relative (60+) gives **discuss**, "Start colon cancer screening at 40". Otherwise only distant relatives gives a **note** saying it doesn't change screening on its own.

**Example:** Dad, colon cancer at 46 → act, `start = Math.min(40, 36) = 36`.

#### `ruleFHS7()` — lines 81–102

**Guideline:** the Family History Screen 7 (`fhs7`), seven yes/no questions the USPSTF (`uspstfBrca`) uses to decide who should get genetic counseling for BRCA1/BRCA2 (inherited breast and ovarian cancer); NCCN (`nccn`) is also cited.

**The code:** all cancers in relatives up to degree 3 are split into `breast` (both `'breast'` and `'breast2'`, cancer in both breasts), `ovarian` and `bowel`. Lines 85–93 build seven `[question, hits]` pairs:

1. A parent, sibling or child had breast or ovarian cancer.
2. A relative had cancer in both breasts.
3. A man had breast cancer.
4. A woman had both breast and ovarian cancer (same person in both lists).
5. A woman had breast cancer before 50 (known age under 50).
6. Two or more different people had breast and/or ovarian cancer.
7. Two or more different people had breast and/or bowel cancer.

For 6 and 7, `people(list)` counts unique ids with `[...new Set(...)]`. A **Set** keeps one copy of each value, so turning it back into an array removes duplicates.

```js
const yes = items.filter(([, hits]) => hits.length);                   // js/risk.js:94
```

`([, hits])` is **array destructuring**: it unpacks each pair and names the second item `hits` (the comma skips the first). One or more "yes" → **act**, "Ask about genetic counseling for inherited breast and ovarian cancer", stating how many of the 7 matched and naming the people. Breast or ovarian cancer but no "yes" → **note**, "no flags".

#### `ruleLynch()` — lines 104–131

**Guideline:** the Amsterdam II criteria (`amsterdam`) for Lynch syndrome, an inherited condition raising colon and uterine cancer risk, plus NCCN (`nccn`). Amsterdam II: at least 3 relatives with Lynch-related cancers, one a first-degree relative of the other two, in at least 2 successive generations, at least one diagnosed before 50.

**The code:**

1. `lynchTypes` = cancer types marked `lynch: true` in `CANCER_TYPES`: colorectal, uterine, small bowel, urinary.
2. `all` = hits up to **degree 4**, plus your own matching facts (line 107), since the criteria look at the whole family.
3. `gen` = everyone's generation from `generations()` (parents −1, you 0).
4. **Group people into lineages** with a classic technique called **union-find** (lines 111–113). Everyone starts as their own group (`cluster` maps each id to itself), `root(id)` follows the chain to a group's leader, and every pair of first-degree relatives (`firstDegreePair`: parent/child or full siblings) is joined:

```js
for (const a of ids) for (const b of ids) if (a < b && firstDegreePair(a, b)) cluster.set(root(a), root(b));   // js/risk.js:113
```

5. **Test each group** (lines 114–120). It meets the criteria if it has 3+ people (`grp.length >= 3`), someone in it is first-degree to two others (`linked`), two members are exactly one generation apart (`successive`), and someone was under 50 (`young`).
6. Met → **act**, "Ask about genetic counseling for Lynch syndrome". Otherwise a parent, sibling or child with colon or uterine cancer under 50 → the same **act** card citing NCCN only. Otherwise 2+ people with these cancers → **discuss**, "Several relatives with Lynch-related cancers".

**Example:** Mom's mother had colon cancer at 62, Mom uterine cancer at 47, Mom's sister colon cancer at 55. The sisters are full siblings and both are Grandma's children, so all three join one group. Grandma is first-degree to both (linked), Grandma and Mom are one generation apart, Mom was 47. Met → act.

#### `ruleOvarianPancreatic()` — lines 133–139

**Guideline:** NCCN (`nccn`) suggests genetic testing for close relatives of anyone with ovarian or pancreatic cancer. **Code:** any such cancer in a relative up to degree 2, at any age → **act**, "Ask about genetic testing because of ovarian or pancreatic cancer".

#### `ruleHeart()` — lines 141–163

**Guideline:** NHLBI pediatric heart guidelines (`nhlbi`): test cholesterol early in children with early heart disease in the family or high cholesterol in a parent. The 2018 AHA/ACC cholesterol guideline (`accaha`) counts early heart disease in a parent or sibling as a "risk-enhancing factor".

**The code:**

```js
const early = x => x.age && x.age < (x.p.sex === 'F' ? 65 : 55);      // js/risk.js:142
```

- `cvd` = heart disease (kind unknown, heart attack, heart failure) or any stroke, up to degree 2. Rhythm and muscle problems are left to `ruleInheritedHeart`.
- `parentChol` = high cholesterol in a **parent** only: degree 1 filtered by `dS === 1 && dX === 0`.
- Any early `cvd` or any `parentChol` → **act**, "Get a cholesterol test now". If both, it adds a line about familial hypercholesterolemia, an inherited high-cholesterol condition.
- An early case in a degree-1 relative → also **discuss**, "Early heart disease in a parent or sibling" (`accaha`).
- Heart disease or stroke with no age → also **missing**, "Find out when heart disease or stroke started".

#### `ruleDiabetes()` — lines 165–178

**Guideline:** ADA Standards of Care (`ada`). **Code:** type 1 diabetes in a degree-1 relative → **discuss**, "Ask about screening for type 1 diabetes". Diabetes of kind unknown, type 2 or during pregnancy, up to degree 2 → **discuss**, "Ask about testing for type 2 diabetes" (ADA tests young people from 10 or puberty if they have overweight plus a risk factor). If one hit is your mother, a line notes that a mother's diabetes is its own risk factor. `return [...out, {...}]` builds a new array of the old cards plus the new one.

#### `ruleProstate()` — lines 180–195

**Guideline:** American Cancer Society (`acsProstate`): talk about PSA screening from 50 at average risk, 45 if a father or brother was diagnosed before 65, 40 if more than one was.

**Code:** only runs if **you** are recorded male. `hits` = prostate cancer in male degree-1 relatives. If every age is known and 65+ → **note**, usual plan. Otherwise → **discuss**, "Talk about prostate cancer screening earlier", with `start: young.length >= 2 ? 40 : 45`. A missing age is again treated as possibly young.

#### `rulePolyps()` and `ruleInheritedHeart()` — lines 198–215

- **Polyps** (`usmstf`): an *advanced* polyp in a parent or sibling counts like colon cancer for screening age. The app can't tell advanced from small, so any polyps in a degree-1 relative give **discuss**, "Colon polyps in a parent or sibling", asking you to find out what kind.
- **Inherited heart** (`ahaHcm`, `ahaScd`): heart muscle or rhythm conditions up to degree 2, or a "yes" to the sudden-death family question. **Act** if a degree-1 relative has one or anyone reported a sudden death; otherwise **discuss**. The advice is an ECG and heart ultrasound.

#### `checkAnswers(key, answer = 'yes')` and `ruleFamilyQuestions()` — lines 217–239

The whole-family questions (`FAMILY_CHECKS` in `content.js`) are stored on **the person interviewed** as `p.checks[key] = { a: 'yes', note }`. `checkAnswers` finds everyone whose answer matches:

```js
return S.people.filter(p => p.checks?.[key]?.a === answer).map(p => ({ by: p.id, note: p.checks[key].note || '' }));   // js/risk.js:218
```

`?.` is **optional chaining**: if `p.checks` or `p.checks[key]` is missing, it gives `undefined` instead of crashing.

| "Yes" to | Card | Level | Source |
|---|---|---|---|
| `genetic` | Get a copy of the genetic test result | act | `nsgcPedigree`, `nccn` |
| `related` | Parents related by blood | discuss | `nsgcConsang` |
| `pregnancy` or `birth` | Pregnancy losses, birth differences or childhood conditions | discuss | `nsgcPedigree` |
| `anesthesia` | Tell every surgeon and dentist about the anesthesia reaction | act | `mhaus` |

The `tobacco` and `ancestry` family questions aren't used by any rule.

#### `ruleOtherConditions()` — lines 240–263

Five small rules. None checks ages; having it in a close relative is enough.

| Condition | Who counts | Card | Level | Source |
|---|---|---|---|---|
| Hepatitis B | up to degree 2 | Get a hepatitis B blood test | act | `cdcHepB` |
| Celiac disease | degree 1 | Ask about a celiac blood test | discuss | `acgCeliac` |
| Blood clots | degree 1 | Blood clots in a parent or sibling | discuss | `ashVte` |
| Polycystic kidney disease | degree 1 | Polycystic kidney disease in a parent or sibling | discuss | `kdigoPkd` |
| Glaucoma | degree 1 | Glaucoma in a parent or sibling | note | `aaoGlaucoma` |

#### Housekeeping cards — lines 266–294

- `ruleOtherReported`: "Something else" conditions (up to degree 3) that no rule understands → **note** asking the doctor to look.
- `ruleDisagreements`: every fact (any person) with `disagree` true, as lines like "Grandma, breast cancer: Mom said 48, Uncle Ravi said 52." → **note** explaining the youngest age was used.
- `ruleNotBlood`: relatives by marriage or adoption who have health facts → **note** explaining why they don't change your inherited risk.
- `ruleMissing`: blank degree 1–2 relatives → **missing**, "Close relatives with nothing recorded".

#### Ancestry — lines 296–308

Ancestry is stored only on your record (`byId(SELF).ancestry`, like `['southasian']`). `myAncestry()` turns it into a `Set`. `ancestryRulesFor(topic)` returns the `ANCESTRY_RULES` for one topic that match any of your groups (used by `familyRisk`). `ruleAncestry()` makes a card for each matching rule, skipping a repeated title (the Ashkenazi BRCA rule exists twice, for breast and ovarian) and rules whose topic is for the other sex.

The rules (`js/content.js:603-616`):

| Ancestry | Card | Level | Source |
|---|---|---|---|
| South Asian | South Asian ancestry and heart disease | discuss | `accaha` |
| South, East, Southeast Asian; Black; Hispanic; Native American; Pacific Islander | Ancestry and type 2 diabetes | discuss | `ada` |
| South, Southeast, East Asian; Middle Eastern/North African; Mediterranean; Black | Thalassemia and sickle cell trait | note | `acog` |
| Ashkenazi Jewish | Ashkenazi Jewish ancestry and BRCA | discuss | `uspstfBrca` |
| Black | Ancestry and prostate cancer | discuss | `acsProstate` |

#### `guidelineCards()` — lines 309–313

```js
const cards = [ruleColorectal, rulePolyps, ruleAncestry, ruleFHS7, ruleLynch, ruleOvarianPancreatic, ruleHeart, ruleInheritedHeart, ruleDiabetes, ruleProstate, ruleFamilyQuestions, ruleOtherConditions, ruleOtherReported, ruleDisagreements, ruleNotBlood, ruleMissing].flatMap(r => r());   // js/risk.js:310
```

This is a list of **functions**. `flatMap(r => r())` calls each and joins the returned arrays into one flat list (`map` would give a list of lists). Then it sorts with `rank = { act: 0, discuss: 1, note: 2, missing: 3 }`. JavaScript's sort is **stable**, so cards of the same level keep the order the rules ran.

---

### Block 3: Who to ask next

#### `gapsOf(p)` — lines 316–330

Lists what's missing about one person: nothing for you; `'nothing recorded yet'` for a blank person; otherwise unknown living status, a missing age or cause of death, and for each fact a missing cancer kind, diabetes type or age, or an age disagreement.

#### `suggestInterviews(limit = 3)` — lines 332–353

It answers: "Which living relative could fill the most important gaps?" The key idea is that a person can tell you about **other** people.

1. **How much each target matters** (line 333): degree 1 = 3, degree 2 = 2, degree 3 = 1, further = 0.5, not blood related = 0.
2. **For each possible interviewee** `I` (not you, not deceased), build a "circle" of people they likely know about, with a factor for how well (line 337): themself 1, their parents 0.9, siblings, children and partners 0.8, grandparents 0.5.
3. **Score each target** once (a `Set` skips repeats): `weight × min(gaps, 3) × factor`. Capping at 3 gaps stops one messy record from dominating.
4. **Total** (line 348):

```js
const score = items.reduce((a, b) => a + b.score, 0) * (I.interviewed ? 0.35 : 1);   // js/risk.js:348
```

`reduce` walks a list carrying a running total: start at `0`, add each `b.score` to `a`. Someone already interviewed keeps 35% of the score, a nudge toward new people.

5. Keep each interviewee's top 3 targets, sort by score highest first (`b.score - a.score`), return the top `limit`.

**Example:** Grandma (living, not interviewed) has no gaps herself. Her daughter, your Mom (degree 1), has diabetes with no type and no age: 3 × 2 × 0.8 = 4.8. Her late husband (degree 2) has no age at death or cause: 2 × 2 × 0.8 = 3.2. Grandma scores 8.0. A step-parent can also be suggested, because they may know about blood relatives; only their *own* gaps weigh zero.

---

### Block 4: Risk levels (`familyRisk`)

#### The method

The comment at lines 355–363 summarizes the method of Scheuner et al. (1997), the basis of the CDC's Family Healthware tool (sources `scheuner`, `healthware`). In short: **high** if a parent or sibling had it early, two or more did, or certain combinations on one side (or patterns on both sides); **moderate** for one parent or sibling, or two second-degree relatives on one side; **average** otherwise.

#### `lineageOf(x)` — lines 364–367

```js
if (x.k.degree === 1) return x.k.dX === 0 ? (x.p.sex === 'F' ? 'maternal' : x.p.sex === 'M' ? 'paternal' : 'unknown') : 'both';
return x.k.side || 'unknown';                                          // js/risk.js:365-366
```

A mother is `'maternal'`, a father `'paternal'`. Other degree-1 relatives (full siblings, children) are `'both'`. Everyone else uses `side` from `kin()`.

#### `familyRisk()` — lines 369–406

For each topic in `RISK_TOPICS` that fits your sex (all of them if unknown). Each topic has a `cond`, maybe `types`, and an `early(p)` cutoff: heart disease 65 for women and 55 otherwise; diabetes, breast and colon cancer 50; prostate cancer 65; and so on.

1. **One hit per person** (lines 372–376): `withFact(..., 3)` finds matches; a `Map` called `seen` keeps one per person, swapping in a younger age if one appears.
2. **Split:** `early(x)` is true when the age is known and below the cutoff. `fdr` = degree 1, `sdr` = degree 2. `onSide(list, side)` keeps hits on that side or `'both'`.
3. **High** (lines 382–394): any early `fdr`; two or more `fdr`; for heart disease, any early `sdr`. Then for each side, with `f` = degree-1 hits on it, `s` = degree-2 hits strictly on it, `all` = degree 1–2 hits on it: `f` plus an early `s`; two `s` with one early; or three in `all`. Also high if **both** sides are "moderate sides" (two `s`, or a **parent**, on that side; a sibling, being "both", doesn't count, per the comment at line 391).
4. **Moderate:** two `s` on one side; exactly one `fdr`; a genetic-counseling card firing for this topic (FHS-7 for breast/ovarian, Lynch for colon/uterine, the ovarian/pancreatic rule), which the comment says keeps "My risks" consistent with the doctor report; or a matching ancestry rule.
5. **Level, reasons, score** (lines 401–403):

```js
const level = high.length ? 'high' : moderate.length || anc.length ? 'moderate' : 'average';   // js/risk.js:401
```

This chains the **ternary** operator (`condition ? ifTrue : ifFalse`). Reasons are the high list, else the moderate list, else "Only a more distant relative had it…", deduplicated with a `Set`, at most two. The score is 300/200/100 by level, plus 5 for ancestry, 20 per early relative, and 15/10/5 per degree-1/2/3 relative.
6. Keep topics with a relative or ancestry match; sort by score, highest first.

#### Worked example

You are male. Dad had a heart attack at 52; Dad's father at 70; Mom's sister has heart disease, age unknown. For the **heart** topic:

1. `hits` = Dad (degree 1, 52), Grandpa (degree 2, 70), Aunt (degree 2, no age).
2. `early`: Dad yes (52 < 55); Grandpa no; Aunt no (unknown age is never early).
3. High: `fdr.some(early)` → "A parent or sibling had it at a young age."
4. Maternal side: `s` = [Aunt], nothing fires. Paternal: `f` = [Dad], `s` = [Grandpa] (not early), `all` = 2 people. Dad makes paternal a moderate side, but only one side qualifies.
5. Level **high**. Score = 300 + 20 (Dad early) + 15 + 10 + 10 = **355**.

The doctor report, from `ruleHeart`, shows **act** "Get a cholesterol test now", **discuss** "Early heart disease in a parent or sibling" and **missing** for the aunt's age. If Dad had been 60, nothing would be early, and `fdr.length === 1` would make it **moderate**.

---

## Part 2: `js/timeline.js`

### Purpose and fit

`timeline.js` builds "My health timeline": the usual screenings by age, with items moved earlier or added because of the guideline cards. It appears on the "My risks" tab (`js/app.js:684-685`), in compact form in the doctor report (`js/app.js:827`), and as text in the summary and PDF (`js/app.js:882`, `js/app.js:964`). It loads right after `risk.js`.

### Extra sources — lines 6–13

`Object.assign(SOURCES, {...})` adds USPSTF breast, cervical, blood pressure, diabetes and lung screening and CDC HPV citations into the shared `SOURCES` object from `content.js`, which loaded earlier.

### `TIMELINE_BASE` — lines 16–27

The usual plan. Each item has a `key`, a starting `age`, sometimes `until`, a `title`, `text`, `source`, and sometimes `sex`:

| key | Age | Who | Source |
|---|---|---|---|
| chol1 | 9–11 | all | `nhlbi` |
| hpv | 11–12 | all | `cdcHpv` |
| chol2 | 17–21 | all | `nhlbi` |
| bp | 18 | all | `uspstfBp` |
| cervical | 21 | F | `uspstfCervical` |
| diabetes | 35 | all | `uspstfDiabetes` |
| breast | 40 | F | `uspstfBreast` |
| colon | 45 | all | `uspstfCrc` |
| prostate | 50 | M | `acsProstate` |
| lung | 50 | all | `uspstfLung` |

A family item with the same `key` replaces the usual one.

### `TIMELINE_FROM_CARD` — lines 30–54

A lookup table from **card title** to a function that returns timeline items:

```js
'Start colon cancer screening early': c => [{ key: 'colon', age: c.start || 40, title: 'Colonoscopy, then every 5 years', text: 'Earlier than the usual 45 because of colon cancer in a parent or sibling.' }],   // js/timeline.js:31
```

The function receives the card, so it can use `c.start`. `age` is a number, `'now'`, or `'event'` (do it when a situation comes up). Highlights: colon cards replace `colon`; the polyps card replaces it at 40 with `maybe: true`; the four genetic-counseling cards all become `genetic` at `'now'`; "Get a cholesterol test now" replaces `chol1` with `'now'`; prostate cards replace `prostate`; type 2 diabetes in the family adds `diabetes-teen` at 10; blood clots, the anesthesia reaction and related parents become `'event'` items.

Cards with no entry (like "Early heart disease in a parent or sibling" or any "missing" card) add nothing. Because the link is the exact title text, renaming a card in `risk.js` without updating this table would silently drop it from the timeline.

### `ageOf(p)` — line 56

```js
const ageOf = p => p?.born && /^\d{4}$/.test(p.born) ? Math.max(0, YEAR - +p.born) : null;   // js/timeline.js:56
```

With a four-digit birth year, age is `YEAR` minus it (never below 0); otherwise `null`. It ignores birthdays. `YEAR` lives in `app.js`, which loads later, but it's only looked up when `ageOf` runs, after every script has loaded.

### `timelineItems()` — lines 59–78

**1. Setup** (lines 60–62). `now` is your age. `forMe` keeps items with no `sex`, a matching sex, or all items if yours is unknown. Then:

```js
const items = new Map(TIMELINE_BASE.filter(forMe).map(it => [it.key, { ...it, family: false }]));   // js/timeline.js:62
```

`new Map([[key, value], ...])` builds a Map from pairs, so "replace the colon item" is one `set`.

**2. Apply cards** (lines 63–69). `TIMELINE_FROM_CARD[c.title]?.(c) || []` looks up the function and calls it; `?.(c)` gives `undefined` instead of crashing when there's no function, and `|| []` makes that an empty list. Each new item gets `family: true`, the card's first source and its level. The merge rule:

```js
const rank = x => x.age === 'now' ? -1 : x.age === 'event' ? 999 : x.age;
if (!prev || !prev.family || (rank(item) < rank(prev) && !(item.maybe && !prev.maybe))) items.set(it.key, item);   // js/timeline.js:67-68
```

The new item goes in if the key is empty, **or** the existing item is a usual one (family advice always replaces usual), **or** it's earlier than the existing family item (`'now'` earliest, `'event'` latest), unless it's only a "maybe" replacing a firm one. Cards arrive with "act" first, so on a tie the more urgent card's item stays. A Map keeps each key's original position when its value changes.

**3. Due and catch-up** (lines 70–75). `due` is true for `'now'` or a number at or below your age. `catchUp` is true for a **usual** item whose last age (`it.until ?? it.age`) is behind you. `??` picks the right side only when the left is missing.

**4. Order** (lines 76–77):

```js
const order = it => it.age === 'event' ? 1e4 : it.due ? (it.family ? -2 : -1) : it.age;
return list.sort((a, b) => order(a) - order(b) || (b.family - a.family));   // js/timeline.js:76-77
```

Family items due now (−2), then usual items due now (−1), then future items by age, then events (`1e4` = 10,000). On a tie the difference is `0`, which counts as false, so `||` moves on to `b.family - a.family` (`true - false` is 1), putting family items first.

### `timelineHTML({ compact = false } = {})` — lines 80–95

`{ compact = false } = {}` is **destructuring with a default**: it pulls `compact` from an options object and works even with no argument. The function counts family items, writes a label for each item with `when(it)` ("When it comes up", "Now", or "At 17–21 · in 1 year"), splits items into "Now", "Later" and "When it comes up" (dropping empty groups) and builds HTML with template literals. Family items get the class `fam` (gold) and a "Because of your family" tag; catch-up items show "If you missed it". All text goes through `esc()`, so typed text can't inject code. Compact mode, used in the doctor report, leaves out the explanations and sources.

### `timelineLines()` — lines 97–99

The same items as plain text for the summary and PDF, like `Now: Cholesterol test now (because of family history)`.

### Worked example

A girl born in 2010 (so `now` is 16 in 2026) whose Dad had colon cancer at 46:

- `ruleColorectal` returns a card with `start: 36`, which becomes a family `colon` item at 36, replacing the usual one at 45. It shows under "Later" as "At 36 · in 20 years", in gold.
- `chol1` (9–11) and `hpv` (11–12) are due and catch-up items: "Now", "If you missed it".
- `chol2` shows under "Later" as "At 17–21 · in 1 year".
- `prostate` is skipped (male only).

---

## What the rules do NOT do

- **They don't diagnose.** They flag patterns guidelines say are worth discussing. The doctor decides.
- **They trust the interview.** If a relative mixes up colon and stomach cancer, the rules can't tell. Only the sex mix-up check and the disagreement flag catch errors.
- **Youngest age wins.** Cautious, but it can overstate risk if one person misremembers.
- **Missing ages are handled differently by rule.** The colon and prostate rules treat a missing age as young; FHS-7, the heart "early" checks, Lynch and `familyRisk` treat it as not young (the heart rule adds a "missing" card instead).
- **Amsterdam II is simplified.** The real criteria also need another polyp syndrome (FAP) ruled out and tumors confirmed by pathology.
- **Polyps can't be graded**, so the app only suggests asking.
- **Personal factors are missing.** Weight, smoking and test results aren't asked, though the ADA diabetes advice, for example, depends on weight.
- **"Parent or sibling" sometimes includes children,** since children are also degree 1.
- **`familyRisk` levels use only degrees 1 and 2.** Cousins and great-grandparents only add to the score.
- **Ages are approximate.** `ageOf` ignores birthdays, and ongoing usual items with no `until` (like blood pressure from 18) are labeled "If you missed it" once you're past the start age.
- **US guidelines only.**

---

## Check your understanding

1. **Mom says Grandpa's heart attack was at 50, Dad says 52, Grandpa's sister says 56. Which age is used, and is it a disagreement?**
   *50, the youngest. Yes: two or more ages and 56 − 50 = 6, at least 3 (`js/risk.js:37`).*

2. **Your sister had colon cancer at 38. What start age does `ruleColorectal` give, and how does it reach the timeline?**
   *28, from `Math.min(40, 38 − 10)`. The card carries `start: 28`, and `TIMELINE_FROM_CARD` turns it into a `colon` item at 28 that replaces the usual one at 45.*

3. **Why doesn't an aunt by marriage count toward your risk, and where does she still appear?**
   *`withFact` only looks at `bloodRelatives()`, which needs `kin(p.id).blood`. She is listed in the `ruleNotBlood` note card and stays on the tree.*

4. **In `familyRisk`, why does one brother with diabetes at 45 give "high", but at 60 only "moderate"?**
   *Diabetes's cutoff is 50. At 45, `fdr.some(early)` adds a high reason. At 60, only `fdr.length === 1` fires, a moderate reason.*

5. **What does `.flatMap(r => r())` in `guidelineCards` do, and why are "act" cards first?**
   *It calls every rule and joins their arrays into one list. Then it sorts by `rank` (`act: 0` to `missing: 3`); the stable sort keeps same-level cards in rule order.*

---

Next: **05 Answer finder and speech**.
