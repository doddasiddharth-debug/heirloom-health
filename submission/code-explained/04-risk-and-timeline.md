# 04 Risk and timeline: `risk.js` and `timeline.js`

This chapter covers the "medical brain" of Heirloom Health. `js/risk.js` turns what relatives said into facts, runs the guideline rules, ranks risk levels and picks who to interview next. `js/timeline.js` turns the guideline results into a "what to check and when" plan.

Neither file draws the family tree or asks interview questions. They read the shared state `S` (from `js/app.js`), the kinship function `kin()` (from `js/family.js`) and the data tables in `js/content.js`, and they return plain JavaScript objects that `app.js`, `handoff.js` and the PDF code turn into screens.

A reminder before we start: **none of this is a diagnosis.** The rules are simplified summaries of published guidelines, written to start a conversation with a doctor. The "What the rules do NOT do" section near the end lists the main simplifications honestly.

---

## Part 1: `js/risk.js`

### Purpose and fit

`risk.js` loads after `content.js` and `family.js`, and before `timeline.js` and `app.js` (see the `<script>` order in `index.html`). It is organized in five blocks, each marked by a comment:

1. **Reports and merged facts** (lines 8–41): storing and combining answers.
2. **Guideline rules** (lines 43–314): one function per guideline, each returning "cards".
3. **Who to ask next** (lines 316–353): scoring which living relative to interview.
4. **Family-history risk levels** (lines 355–406): the "My risks" tab.
5. Ancestry rules sit inside block 2 (lines 296–308).

Who calls these functions:
- `guidelineCards()` is used by the doctor report (`js/app.js:810`), the plain-text summary (`js/app.js:875`), the PDF (`js/app.js:929`), the doctor checklist (`js/handoff.js:45`) and the timeline.
- `familyRisk()` builds the "My risks" tab (`js/app.js:675`) and appears in the summary and PDF.
- `suggestInterviews()` fills the "Who to ask next" card (`js/app.js:425`).
- `addReport()` / `dropReports()` are called whenever an answer is ticked, typed or removed in the interview screens (`js/app.js`, `js/elder.js`).

---

### Block 1: Reports and merged facts

#### The idea: a "report" versus a "fact"

The app never stores "Grandma had breast cancer at 48" as one truth. It stores a **report**: *who* it is about (`pid`), *what* condition (`cond`), the kind (`type`, for example `'breast'`), the `age`, the relative's own words (`said`), *who said it* (`by`), and the date (`at`). If three relatives mention Grandma's cancer, there are three reports.

A **fact** is what you get when the app merges all reports about the same person and condition. This is how the app can say "Mom said 48, Uncle Ravi said 52."

#### `findReport(pid, cond, type, by)` — line 9

Looks through `S.reports` with `find` and returns the first report that matches all four keys. Note the small trick:

```js
(r.type || '') === (type || '')        // js/risk.js:9
```

`r.type || ''` turns a missing type (`undefined`) into an empty string, so "no type" always compares equal to "no type" no matter how it was stored.

**Why:** one relative should have at most one report per person + condition + kind. This function is how the app checks "did this person already say this?"

#### `addReport(pid, cond, type, by, fields = {})` — lines 10–14

1. Calls `findReport` to look for an existing report.
2. If none exists, it creates a new object with a fresh id from `uid('r')`, an empty age and words, and today's date, and pushes it onto `S.reports`.
3. `Object.assign(r, fields)` copies any extra values (like `{ age: '48' }`) onto the report.
4. Returns the report.

`fields = {}` is a **default parameter**: if the caller leaves it out, it is an empty object. **Why this design:** calling `addReport` twice with the same keys updates one report instead of creating duplicates. This is sometimes called an "upsert" (update or insert).

#### `dropReports(pred)` — line 16

```js
function dropReports(pred) { S.reports = S.reports.filter(r => !pred(r)); }   // js/risk.js:16
```

`pred` is a **predicate**: a function that answers true or false. The function keeps every report for which `pred` says false, which deletes every report for which it says true. Passing a function in lets each caller decide what to delete (`r => r.id === b.dataset.rid`, for example, at `js/app.js:1204`).

#### `facts(pid)` — lines 19–38

This is the most important function in the file. Every rule calls it. Step by step:

**Step 1: pick this person's reports** (line 20). `S.reports.filter(r => r.pid === pid)`.

**Step 2: group them with a `Map`** (lines 21–26). A `Map` is a dictionary: you store a value under a key and look it up later. The key here is the condition plus the kind, joined with a bar:

```js
const key = r.cond + '|' + (r.type || '');        // js/risk.js:23
```

So `'cancer|breast'` and `'cancer|'` (cancer, kind unknown) are separate groups. Each group holds `{ cond, type, reports: [] }`. This "loop and push into a Map by key" is the standard way to **group** items in JavaScript.

**Step 3: merge "kind unknown" into the only known kind** (lines 28–32). The comment explains the reason: "Cancer, kind unknown" from one person and "breast cancer" from another are probably the same cancer. For every condition that has kinds (`Object.keys(SUBTYPES)`: cancer, diabetes, heart, kidney, mental, blood, liver), it finds the typed groups and the untyped group. Only if there is **exactly one** typed group does it move the untyped reports into it:

```js
if (untyped && typed.length === 1) { typed[0].reports.push(...untyped.reports); groups.delete(cond + '|'); }   // js/risk.js:31
```

The `...` here is the **spread** operator: `push(...list)` pushes each item of the list separately, instead of pushing the whole list as one item. If there are two typed groups (say breast and ovarian), the app can't know which one the vague report meant, so it leaves "Cancer, kind unknown" as its own fact.

**Step 4: compute the merged age and disagreement** (lines 34–37). For each group:

- `ages` = every report's age turned into a number with `+r.age`, keeping only values above 0. (`+''` is `0` and `+'abc'` is `NaN`; both fail `a > 0`, so blank or garbled ages drop out.)
- `min` and `max` of those ages. `Math.min(...ages)` uses spread again, to pass the list as separate arguments.
- The fact's `age` is the **youngest** age, as a string.
- `disagree` is true when there are at least two ages and they differ by 3 or more years:

```js
disagree: ages.length > 1 && max - min >= 3        // js/risk.js:37
```

- `range` is a text like `48–52` whenever the ages differ at all.

`{ ...g, age: ..., ... }` is **object spread**: it copies every field of `g` into a new object, then adds or overrides the listed fields.

**Why the youngest age?** Most guidelines get stricter when a relative was diagnosed younger (for example, colon screening starts 10 years before the youngest diagnosis). Using the youngest reported age is the cautious choice, and the doctor report says so (see `ruleDisagreements`).

**Step 5: sort** (lines 33 and 38). The `order` function gives each fact a number: the condition's position in `CONDS` times 100, plus the kind's position in its subtype list (or 99 if no kind). `sort((a, b) => order(a) - order(b))` is a **sort comparator**: `sort` calls it with two items, and a negative result puts `a` first, positive puts `b` first. Subtracting two numbers is the usual way to sort smallest first. The result is that facts always appear in the same order as the interview (heart first, then stroke, and so on).

**Worked example.** Suppose three relatives talked about Grandma (`gm`):

| Report | cond | type | age | by |
|---|---|---|---|---|
| r1 | cancer | breast | 48 | Mom |
| r2 | cancer | (none) | 52 | Uncle Ravi |
| r3 | cancer | breast | (blank) | Aunt Priya |

- Step 2 makes two groups: `'cancer|breast'` → [r1, r3] and `'cancer|'` → [r2].
- Step 3: for `cancer`, there is exactly one typed group, so r2 joins it and `'cancer|'` is deleted.
- Step 4: ages are [48, 52] (r3's blank age dropped). `age` = `'48'`, `range` = `'48–52'`, and `disagree` = true because 52 − 48 = 4 ≥ 3.

If Uncle Ravi had said 50 instead, `range` would still be `'48–50'` but `disagree` would be false, because a 2-year gap is treated as normal memory fuzziness.

#### `reporterName(id)` — line 40

Turns a reporter's id into a display name: `'You'` for yourself, the person's name if they exist, or `'A relative'` if that person was deleted.

#### `isBlank(p)` — line 41

True for anyone except you who has no birth year, unknown living status, no facts and no notes. In other words, a box on the tree that nobody has filled in yet. Used by `ruleMissing` and `gapsOf`.

---

### Block 2: Guideline rules

#### The "card" shape

The comment at lines 43–45 describes what each rule returns: a list of **cards**, each shaped like

```
{ level: 'act' | 'discuss' | 'note' | 'missing', title, rec, why: [...], sources: [...] }
```

- `level` sets how urgent it looks: **act** (do this), **discuss** (talk to your doctor), **note** (worth knowing), **missing** (information to go find).
- `rec` is the recommendation in plain words.
- `why` lists the evidence lines, such as "Father (Raj): colorectal cancer at 46."
- `sources` are keys into the `SOURCES` table in `content.js`, which holds full citations.

Every rule returns an **array** (possibly empty), so the caller can join them all together easily.

#### Helpers

**`bloodRelatives()`** (line 46) returns everyone except you whose `kin(p.id).blood` is true. Partners who married in and adoptive relatives are not blood relatives, so the rules never count them.

**`SEX_ONLY_CANCERS` and `possibleFor(p, f)`** (lines 48–49). Ovarian and uterine cancer are listed as `'F'`, prostate as `'M'`. If a person is recorded as male with ovarian cancer (probably a typing mistake), `possibleFor` returns false. The fact stays on the record, but the rules ignore it. If the sex is unknown (`'U'`), the fact is kept, because the app can't tell.

**`withFact(test, maxDegree = 3)`** (lines 50–57) is the workhorse that almost every rule uses:

```js
for (const p of bloodRelatives()) {
  const k = kin(p.id);
  if (k.degree > maxDegree) continue;
  for (const f of facts(p.id)) if (possibleFor(p, f) && test(f)) out.push({ p, f, k, age: +f.age || null });
}                                                                       // js/risk.js:52-56
```

For each blood relative within `maxDegree`, it checks each of their facts with the `test` function. Each hit is a small object: the person `p`, the fact `f`, their kinship `k`, and the age as a number (or `null` if unknown; `+f.age || null` turns `0` and `NaN` into `null`).

A quick refresher on **degree** (from `kin()` in `js/family.js`): degree 1 = parents, full siblings and children (they share about half your DNA); degree 2 = grandparents, aunts, uncles, half-siblings; degree 3 = first cousins, great-grandparents. `kin()` also gives `dS` (steps from you up to the shared ancestor) and `dX` (steps from the relative up to it). A parent has `dS = 1, dX = 0`. A sibling has `dS = 1, dX = 1`. The rules use this to tell a parent apart from a sibling.

**Small text helpers** (lines 59–61): `who(x)` gives "Father (Raj)", `atAge(x)` gives "at 46" or "age unknown", and `isCancer(...types)` builds a test function:

```js
const isCancer = (...types) => f => f.cond === 'cancer' && types.includes(f.type);   // js/risk.js:61
```

This is a function that **returns a function**. `isCancer('ovarian', 'pancreatic')` gives back a test that is true for either kind. The `...types` in the parameter list is a **rest parameter**: it gathers all arguments into one array.

---

#### `ruleColorectal()` — lines 63–79

**Guideline:** US Multi-Society Task Force on Colorectal Cancer (source `usmstf`) and USPSTF colorectal screening (`uspstfCrc`). For people with a parent, sibling or child with colorectal cancer: if diagnosed before 60, or two such relatives at any age, start colonoscopy at 40 or 10 years before the youngest diagnosis, whichever is earlier, and repeat every 5 years. One such relative diagnosed at 60 or older: start at 40 with the usual intervals.

**The code:**
1. `crc` = every blood relative (up to degree 3) with colorectal cancer. Split into `fdr` (first-degree relatives, degree 1) and `other` (degree 2 or 3).
2. **Act** if any first-degree relative was under 60 **or has no age**, or there are two or more:

```js
if (fdr.some(x => !x.age || x.age < 60) || fdr.length >= 2) {        // js/risk.js:67
```

`some` returns true if at least one item passes. A missing age counts as "young", and the card adds the line "An age is missing, so the earlier rule is used to be safe."

3. The start age:

```js
const start = youngest ? Math.min(40, youngest - 10) : 40;            // js/risk.js:69
```

If no ages are known, it is 40. The card carries this as `start`, which the timeline uses later.
4. Otherwise, exactly one first-degree relative (who must be 60+) → **discuss**, "Start colon cancer screening at 40".
5. Otherwise, only more distant relatives → **note**, "Colon cancer in more distant relatives", saying it doesn't change screening on its own.
6. Nobody → `[]` (no card).

**Example:** Dad had colon cancer at 46. `fdr` has one item with age 46 < 60 → act. `youngest = 46`, so `start = Math.min(40, 36) = 36`. The card says "Start colonoscopy at age 36 and repeat every 5 years."

#### `ruleFHS7()` — lines 81–102

**Guideline:** the Family History Screen 7 (`fhs7`), a 7-question checklist that the USPSTF (`uspstfBrca`) uses to decide who should get genetic counseling for BRCA1/BRCA2 (inherited breast and ovarian cancer). NCCN (`nccn`) is also cited.

**The code:** it collects every cancer in blood relatives up to degree 3, then splits them into `breast` (both `'breast'` and `'breast2'`, cancer in both breasts, via `isBreast`), `ovarian` and `bowel` (colorectal). Then it builds the seven questions as a list of `[question, hits]` pairs (lines 85–93):

1. A parent, sibling or child (degree 1) had breast or ovarian cancer.
2. A relative had cancer in both breasts (`'breast2'`).
3. A man had breast cancer (`x.p.sex === 'M'`).
4. A woman had both breast and ovarian cancer (same person id in both lists).
5. A woman had breast cancer before 50 (`x.age && x.age < 50`).
6. Two or more different people had breast and/or ovarian cancer.
7. Two or more different people had breast and/or bowel cancer.

For 6 and 7, the helper `people(list)` makes a list of unique person ids with `new Set(...)`. A **Set** is a collection that keeps only one copy of each value, so spreading it back into an array (`[...new Set(ids)]`) removes duplicates.

```js
const yes = items.filter(([, hits]) => hits.length);                   // js/risk.js:94
```

`([, hits])` is **array destructuring**: it unpacks each pair and names the second item `hits` (the leading comma skips the first). A question is a "yes" if its hit list is not empty.

- One or more "yes" → **act**, "Ask about genetic counseling for inherited breast and ovarian cancer", with the count ("yes to 2 of the 7 questions") and one `why` line per question naming the people.
- Breast or ovarian cancer present but no "yes" → **note**, "no flags".
- Neither → nothing.

Note: question 5 needs a known age under 50. Unlike the colon rule, a missing age here does **not** count as young.

#### `ruleLynch()` — lines 104–131

**Guideline:** the Amsterdam II criteria for Lynch syndrome (`amsterdam`), an inherited condition that raises colon and uterine cancer risk, plus NCCN (`nccn`). Amsterdam II asks for at least 3 relatives with Lynch-related cancers, one a first-degree relative of the other two, across at least 2 successive generations, with at least one diagnosed before 50.

**The code, step by step:**

1. `lynchTypes` = the cancer types marked `lynch: true` in `CANCER_TYPES`: colorectal, uterine, small bowel and urinary (ureter/kidney pelvis).
2. `all` = hits in blood relatives **up to degree 4**, plus your own facts if you have one of these cancers (line 107). Amsterdam II looks at the whole family, which can include the patient.
3. `ids` = the unique people involved. `gen` = everyone's generation number from `generations()` in `family.js` (parents −1, you 0, children +1).
4. **Group people into lineages** (lines 110–113). Amsterdam II wants the three people to be connected to one another, not scattered across unrelated branches. The code uses a classic technique called **union-find**: every person starts as their own group (`cluster` maps each id to itself), `root(id)` follows the chain to find a group's leader, and for every pair who are first-degree relatives of each other (`firstDegreePair(a, b)`: parent/child or full siblings), it joins their groups:

```js
for (const a of ids) for (const b of ids) if (a < b && firstDegreePair(a, b)) cluster.set(root(a), root(b));   // js/risk.js:113
```

(`a < b` just makes sure each pair is checked once.)

5. **Test each group** (lines 114–120). A group meets the criteria if all four are true:
   - `grp.length >= 3`: three or more people.
   - `linked`: some member is first-degree to at least two others in the group.
   - `successive`: two members are exactly one generation apart.
   - `young`: someone in the group was diagnosed before 50.

6. Results:
   - Criteria met → **act**, "Ask about genetic counseling for Lynch syndrome" (sources `amsterdam`, `nccn`).
   - Otherwise, if a parent, sibling or child had colon or uterine cancer before 50 → **act** with the same title, citing NCCN only.
   - Otherwise, if two or more people had Lynch-related cancers → **discuss**, "Several relatives with Lynch-related cancers".
   - Otherwise nothing.

**Example:** Grandma (Mom's mother) had colon cancer at 62, Mom had uterine cancer at 47, and Mom's sister had colon cancer at 55. Mom and her sister are full siblings and both are Grandma's children, so union-find puts all three in one group. Grandma is first-degree to both (linked), Grandma and Mom are one generation apart (successive), Mom was 47 (young). Criteria met → act.

#### `ruleOvarianPancreatic()` — lines 133–139

**Guideline:** NCCN (`nccn`) suggests genetic testing for close relatives of anyone with ovarian or pancreatic cancer, at any age.

**The code:** any ovarian or pancreatic cancer in a blood relative up to degree 2 (parents, siblings, children, grandparents, aunts, uncles, half-siblings) → one **act** card, "Ask about genetic testing because of ovarian or pancreatic cancer". There is no age condition.

#### `ruleHeart()` — lines 141–163

**Guideline:** the NHLBI pediatric heart guidelines (`nhlbi`) recommend testing cholesterol early in children whose family has early heart disease or high cholesterol in a parent. The 2018 AHA/ACC cholesterol guideline (`accaha`) calls early heart disease in a parent or sibling a "risk-enhancing factor".

**The code:**
1. "Early" means before 65 for a woman and before 55 otherwise:

```js
const early = x => x.age && x.age < (x.p.sex === 'F' ? 65 : 55);      // js/risk.js:142
```

2. `cvd` = heart disease of kind unknown, heart attack or heart failure, **or** any stroke, in relatives up to degree 2. (Heart rhythm and heart muscle conditions are left to `ruleInheritedHeart`.)
3. `premature` = the early ones.
4. `parentChol` = high cholesterol in a **parent** only. `withFact(..., 1)` gives degree 1, and the filter `x.k.dS === 1 && x.k.dX === 0` keeps only parents, not siblings or children.
5. If either list is non-empty → **act**, "Get a cholesterol test now". If both are present, it adds a line explaining that this pattern can point to familial hypercholesterolemia, an inherited high-cholesterol condition.
6. If any premature case is a first-degree relative → also **discuss**, "Early heart disease in a parent or sibling" (`accaha`).
7. Any heart disease or stroke with no age → also **missing**, "Find out when heart disease or stroke started", because the app can't decide "early" without an age.

This rule can return up to three cards, which is why it builds an `out` array.

#### `ruleDiabetes()` — lines 165–178

**Guideline:** the American Diabetes Association Standards of Care (`ada`).

**The code:**
1. Type 1 diabetes in a degree-1 relative → **discuss**, "Ask about screening for type 1 diabetes" (antibody blood test, warning signs).
2. Diabetes of kind unknown, type 2, or diabetes during pregnancy (`'gest'`) in a relative up to degree 2 → **discuss**, "Ask about testing for type 2 diabetes". The ADA tests young people from age 10 or puberty if they have overweight plus a risk factor, and family history is one.
3. If one of those hits is your mother (`dS === 1 && dX === 0 && sex 'F'`), it adds a line that a mother's diabetes, including in pregnancy, is its own risk factor.

The final line, `return [...out, { ... }]`, builds a new array from the old cards plus the new one.

#### `ruleProstate()` — lines 180–195

**Guideline:** the American Cancer Society's prostate screening advice (`acsProstate`): talk about PSA screening from 50 at average risk, 45 if a father or brother was diagnosed before 65, and 40 if more than one was.

**The code:**
1. Returns nothing unless **you** are recorded as male (`byId(SELF).sex !== 'M'`). Unknown sex also returns nothing here.
2. `hits` = prostate cancer in a degree-1 relative who is male (a father, brother or son).
3. `young` = under 65; `noAge` = age unknown.
4. If all known ages are 65+ and none is missing → **note**, saying the usual plan (from 50) applies.
5. Otherwise → **discuss**, "Talk about prostate cancer screening earlier", with `start: young.length >= 2 ? 40 : 45`. A missing age is treated as possibly young, again "to be safe".

#### `rulePolyps()` — lines 198–204

**Guideline:** USMSTF (`usmstf`) treats an *advanced* polyp in a parent or sibling like colon cancer for deciding when to start screening.

**The code:** any colon polyps in a degree-1 relative → **discuss**, "Colon polyps in a parent or sibling", telling you to find out what kind they were. The app can't tell advanced from small polyps, so it doesn't change screening by itself; the timeline marks it as a "maybe".

#### `ruleInheritedHeart()` — lines 206–215

**Guideline:** AHA/ACC cardiomyopathy guideline (`ahaHcm`) and AHA/ACC/HRS sudden cardiac death guideline (`ahaScd`), which recommend checking close relatives with an ECG and heart ultrasound.

**The code:**
- `heart` = heart muscle or heart rhythm conditions in relatives up to degree 2.
- `sudden` = everyone who answered "yes" to the whole-family question about sudden deaths (see `checkAnswers` below).
- If neither, no card. If a degree-1 relative has one, or anyone reported a sudden death → **act**; otherwise **discuss**.

#### `checkAnswers(key, answer = 'yes')` — lines 217–219

The whole-family questions (genetic tests, sudden deaths, parents related by blood, and so on, defined in `FAMILY_CHECKS` in `content.js`) are stored on **the person who was interviewed**, as `p.checks[key] = { a: 'yes', note: '...' }`. This function finds everyone whose answer matches and returns `{ by, note }` for each:

```js
return S.people.filter(p => p.checks?.[key]?.a === answer).map(p => ({ by: p.id, note: p.checks[key].note || '' }));   // js/risk.js:218
```

`?.` is **optional chaining**: if `p.checks` or `p.checks[key]` is missing, the expression gives `undefined` instead of crashing.

#### `ruleFamilyQuestions()` — lines 220–239

Turns those answers into cards. `said(list, what)` makes lines like "Mom: my uncle had a BRCA test", using the typed note if there is one.

| Answer "yes" to | Card | Level | Source |
|---|---|---|---|
| `genetic` (a relative had a genetic test) | Get a copy of the genetic test result | act | `nsgcPedigree`, `nccn` |
| `related` (parents related by blood) | Parents related by blood | discuss | `nsgcConsang` |
| `pregnancy` or `birth` | Pregnancy losses, birth differences or childhood conditions | discuss | `nsgcPedigree` |
| `anesthesia` | Tell every surgeon and dentist about the anesthesia reaction | act | `mhaus` |

The `tobacco` and `ancestry` family questions are not used by any rule.

#### `ruleOtherConditions()` — lines 240–263

Five smaller rules in one function, each adding a card to `out`:

| Condition | Who counts | Card | Level | Source |
|---|---|---|---|---|
| Hepatitis B (`liver`/`hepb`) | up to degree 2 | Get a hepatitis B blood test | act | `cdcHepB` |
| Celiac disease | degree 1 | Ask about a celiac blood test | discuss | `acgCeliac` |
| Blood clots | degree 1 | Blood clots in a parent or sibling | discuss | `ashVte` |
| Polycystic kidney disease (`kidney`/`pkd`) | degree 1 | Polycystic kidney disease in a parent or sibling | discuss | `kdigoPkd` |
| Glaucoma | degree 1 | Glaucoma in a parent or sibling | note | `aaoGlaucoma` |

None of these check ages: having it in a close relative is enough.

#### `ruleOtherReported()` — lines 266–271

Conditions typed under "Something else" (`cond === 'other'`) in relatives up to degree 3. No rule understands them, so a **note** card lists them and asks the doctor to look. It cites no sources.

#### `ruleDisagreements()` — lines 273–279

Goes through **every** person (not only blood relatives) and every fact with `disagree` true, and writes lines like "Grandma, breast cancer: Mom said 48, Uncle Ravi said 52." One **note** card, "Family members remember different ages", explains that the youngest age was used.

#### `ruleNotBlood()` — lines 281–286

Lists relatives who are not blood related but have health facts (a step-parent, an aunt by marriage) in a **note** card. This is the honest explanation of why their illnesses are on the chart but don't change your risk.

#### `ruleMissing()` — lines 288–294

Blood relatives of degree 1 or 2 who are still blank (`isBlank`) → **missing** card, "Close relatives with nothing recorded", pointing to "Who to ask next".

#### Ancestry: `myAncestry()`, `ancestryRulesFor(topic)`, `ruleAncestry()` — lines 296–308

Your ancestry is stored only on your own record (`byId(SELF).ancestry`, a list like `['southasian']`).

- `myAncestry()` turns it into a `Set` for quick `has()` checks. `byId(SELF)?.ancestry || []` protects against a missing value.
- `ancestryRulesFor(topic)` returns the `ANCESTRY_RULES` for one risk topic where at least one of the rule's groups is in your ancestry. `familyRisk` uses this.
- `ruleAncestry()` goes through every rule in `ANCESTRY_RULES` (in `content.js`) and makes a card for each one that matches your ancestry. Two details:
  - `seen` skips a second rule with the same title. The Ashkenazi Jewish BRCA rule exists twice (once for the breast topic and once for ovarian), and you only need one card.
  - If the rule's topic is for one sex only (ovarian for women, prostate for men) and your sex is known and different, it is skipped.

The six rules in `content.js` (lines 603–616) are:

| Ancestry | Card title | Level | Source |
|---|---|---|---|
| South Asian | South Asian ancestry and heart disease | discuss | `accaha` |
| South Asian, East Asian, Southeast Asian, Black, Hispanic, Native American, Pacific Islander | Ancestry and type 2 diabetes | discuss | `ada` |
| South Asian, Southeast Asian, East Asian, Middle Eastern/North African, Mediterranean, Black | Thalassemia and sickle cell trait | note | `acog` |
| Ashkenazi Jewish (breast and ovarian topics) | Ashkenazi Jewish ancestry and BRCA | discuss | `uspstfBrca` |
| Black | Ancestry and prostate cancer | discuss | `acsProstate` |

The `why` line lists only the ancestries you picked that the rule covers.

#### `guidelineCards()` — lines 309–313

The function everything else calls:

```js
const cards = [ruleColorectal, rulePolyps, ruleAncestry, ruleFHS7, /* ... */ ruleMissing].flatMap(r => r());   // js/risk.js:310 (shortened)
```

It is a list of **functions**, not results. `flatMap(r => r())` calls each one and joins all the returned arrays into one flat list. (`map` would give a list of lists; `flatMap` flattens it one level.)

Then it sorts by level using a lookup table:

```js
const rank = { act: 0, discuss: 1, note: 2, missing: 3 };              // js/risk.js:311
```

`sort((a, b) => rank[a.level] - rank[b.level])` puts all "act" cards first. JavaScript's sort is **stable**, so cards with the same level stay in the order the rules ran. That's why the order of the rule list matters.

---

### Block 3: Who to ask next

#### `gapsOf(p)` — lines 316–330

Lists what is missing about one person, in plain words:

- You → nothing (you are not interviewed).
- A blank person → just `'nothing recorded yet'`.
- Otherwise: unknown living status; for someone who died, a missing age at death or cause of death; and for each fact, a missing cancer kind, a missing diabetes type, a missing age, or a disagreement about the age.

#### `suggestInterviews(limit = 3)` — lines 332–353

The question it answers: "Which living relative, if I interview them next, could fill the most important gaps?" The trick is that a person can tell you about **other** people: Grandma knows about her own parents and her children.

**Step 1: how much each target matters** (line 333). `weight` gives degree 1 relatives 3 points, degree 2 relatives 2, degree 3 relatives 1, anyone further 0.5, and non-blood relatives 0 (their gaps don't affect your risk).

**Step 2: for each possible interviewee `I`** (skipping you and anyone who has died, `I.living === 'no'`), build their "circle" of people they probably know about, each with a factor for how well they'd know (line 337):

| Who | Factor |
|---|---|
| `I` themself | 1 |
| `I`'s parents | 0.9 |
| `I`'s siblings, children and partners | 0.8 |
| `I`'s grandparents | 0.5 |

**Step 3: score each target in the circle** (lines 339–345). Skip repeats (with a `Set` called `seen`) and you. For each target with gaps and weight above 0:

```
score = weight × min(number of gaps, 3) × factor
```

Capping the gap count at 3 stops one messy record from dominating.

**Step 4: total score for `I`** (line 348):

```js
const score = items.reduce((a, b) => a + b.score, 0) * (I.interviewed ? 0.35 : 1);   // js/risk.js:348
```

`reduce` walks a list carrying a running total: it starts at `0`, and for each item adds `b.score` to the total `a`. Someone already interviewed has their score cut to 35%, so the app nudges you toward new people without hiding a past interviewee who could fill big gaps.

**Step 5:** keep each interviewee's top 3 targets (for display), sort interviewees by score from highest down (`b.score - a.score` sorts largest first), and return the top `limit`.

**Example.** Grandma (living, not yet interviewed, degree 2) has no gaps herself. Her daughter, your Mom (degree 1), has diabetes with no type and no age: 2 gaps → 3 × 2 × 0.8 = 4.8. Grandma's late husband, Grandpa (degree 2), has no age at death and no cause: 2 gaps → 2 × 2 × 0.8 = 3.2. Grandma's score is 8.0. Note that a step-parent (not blood related) can still be suggested as an interviewee, because they might know about blood relatives; only their *own* gaps count as zero.

---

### Block 4: Family-history risk levels (`familyRisk`)

#### The method

The comment at lines 355–363 summarizes the method from Scheuner et al. (1997), which the CDC's Family Healthware tool is based on (`scheuner`, `healthware` in `SOURCES`). For each condition, family history is sorted into:

- **High:** a parent or sibling had it early; two or more parents/siblings; a parent/sibling plus an early grandparent/aunt/uncle on the same side; two second-degree relatives on one side with one early; three or more relatives on one side; a moderate pattern on both sides; and, for heart disease, any early grandparent, aunt or uncle.
- **Moderate:** one parent or sibling (not early); two grandparents/aunts/uncles on one side (not early).
- **Average:** one more distant relative, or none.

#### `lineageOf(x)` — lines 364–367

Which side of the family a hit belongs to:

- A parent (degree 1, `dX === 0`) is on Mom's side (`'maternal'`) if female, Dad's side if male, `'unknown'` if not recorded.
- Any other degree-1 relative (a full sibling, or a child) is `'both'`, since a full sibling shares both parents.
- Everyone else uses `side` from `kin()`, or `'unknown'`.

`SIDE_NAME` (line 368) just turns `'maternal'` into "Mom's" for display.

#### `familyRisk()` — lines 369–406

For each topic in `RISK_TOPICS` (in `content.js`) that applies to your sex (or every topic if your sex is unknown), it computes a result. Each topic has a `cond`, optionally a list of `types`, and an `early(p)` function giving the age cutoff (heart disease: 65 for women, 55 for men; diabetes 50; breast cancer 50; prostate cancer 65; and so on).

**Step 1: one hit per person, youngest age** (lines 372–376). `withFact(..., 3)` finds matching facts in relatives up to degree 3. A `Map` called `seen` keeps one entry per person, replacing it only when a younger age shows up. (One person can have two matching facts, like heart attack and heart failure.)

**Step 2: split the hits.** `early` is true when the age is known and under the cutoff (`!!` turns the result into a real true/false). `fdr` = degree 1, `sdr` = degree 2. `onSide(list, side)` keeps hits on that side or on `'both'`.

**Step 3: the "high" checks** (lines 382–394):
- Any `fdr` early.
- Two or more `fdr`.
- Heart disease only: any `sdr` early.
- For each side (maternal, then paternal), with `f` = degree-1 hits on that side (or both), `s` = degree-2 hits strictly on that side, `all` = degree 1 and 2 hits on that side (or both):
  - `f` non-empty and some `s` early.
  - Two or more `s` with at least one early.
  - Three or more in `all`.
- If **both** sides are "moderate sides" → high. A side counts as a moderate side if it has two or more `s`, or a **parent** on that side (siblings, being "both", don't count here, as the comment at line 391 explains).

**Step 4: the "moderate" checks:**
- Two or more `s` on one side (line 390).
- Exactly one `fdr` (line 395).
- A genetic-counseling guideline fired for this topic (lines 397–398): the FHS-7 card is "act" for breast or ovarian, the Lynch card is "act" for colon or uterine, or the ovarian/pancreatic rule fired for ovarian or pancreatic. The comment explains this keeps the "My risks" page consistent with the doctor report.
- An ancestry rule for this topic (`ancestryRulesFor(t.key)`).

**Step 5: level, reasons, score** (lines 401–404).

```js
const level = high.length ? 'high' : moderate.length || anc.length ? 'moderate' : 'average';   // js/risk.js:401
```

This is a chained **ternary**: `condition ? valueIfTrue : valueIfFalse`. Reasons are the high reasons, or the moderate ones, or "Only a more distant relative had it…", with duplicates removed by a `Set` and at most two kept. The score puts all highs above all moderates above all averages (300/200/100), then adds 5 for ancestry, 20 per early relative, and 15/10/5 per degree-1/2/3 relative, so the most worrying topics within a level come first.

**Step 6:** keep only topics with a relative or an ancestry match, and sort by score, highest first.

#### Worked example

You are male. Your family:
- Dad: heart attack at 52.
- Dad's father (paternal grandfather): heart attack at 70.
- Mom's sister (maternal aunt): heart disease, age unknown.

Trace for the **heart** topic (types: unknown kind, heart attack, heart failure; early = under 55 for men, under 65 for women):

1. `hits` = Dad (degree 1, 52), Grandpa (degree 2, 70), Aunt (degree 2, no age).
2. `early`: Dad yes (52 < 55). Grandpa no. Aunt no, because her age is unknown.
3. `fdr` = [Dad]; `sdr` = [Grandpa, Aunt].
4. High checks: `fdr.some(early)` is true → "A parent or sibling had it at a young age." Two or more `fdr`? No. Early `sdr`? No.
5. Maternal side: `f` = [] (Dad is paternal), `s` = [Aunt], `all` = [Aunt]. Nothing fires, not a moderate side.
   Paternal side: `f` = [Dad], `s` = [Grandpa] (not early), `all` = [Dad, Grandpa] (only 2). Dad is a parent on this side → paternal is a moderate side.
6. Only one moderate side, so no "both sides" high. `fdr.length === 1` → moderate reason added (but high wins).
7. Level **high**. Reason: "A parent or sibling had it at a young age."
8. Score = 300 + 0 (no ancestry) + 1 × 20 (Dad early) + 15 (Dad) + 10 (Grandpa) + 10 (Aunt) = **355**.

In the doctor report, the same family produces from `ruleHeart`: an **act** card "Get a cholesterol test now", a **discuss** card "Early heart disease in a parent or sibling" (Dad), and a **missing** card asking when the aunt's heart disease started.

If Dad had been 60 instead, `early` would be false for everyone: no high reason fires, `fdr.length === 1` gives **moderate**.

---

## Part 2: `js/timeline.js`

### Purpose and fit

`timeline.js` builds "My health timeline": the usual screenings everyone gets by age, with items moved earlier, added or changed because of the guideline cards. It is shown at the top of the "My risks" tab (`js/app.js:684-685`), in compact form in the doctor report (`js/app.js:827`), and as plain text lines in the summary and PDF (`js/app.js:882`, `js/app.js:964`).

It loads right after `risk.js`, so it can use `guidelineCards()` and the `SOURCES` table.

### Adding sources — lines 6–13

```js
Object.assign(SOURCES, {                                               // js/timeline.js:6
```

`Object.assign` copies new entries into the existing shared `SOURCES` object from `content.js`: USPSTF breast, cervical, blood pressure, diabetes and lung screening, and CDC HPV vaccination. This only works because `content.js` is loaded earlier.

### `TIMELINE_BASE` — lines 16–27

The usual plan for everyone. Each item has a `key` (a short name like `'colon'`), a starting `age`, sometimes an `until` age, a `title`, `text`, a `source`, and sometimes a `sex`:

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

The `key` matters: a family item with the same key **replaces** the usual one.

### `TIMELINE_FROM_CARD` — lines 30–54

A lookup table from a **card title** to a small function that returns timeline items. For example:

```js
'Start colon cancer screening early': c => [{ key: 'colon', age: c.start || 40, title: 'Colonoscopy, then every 5 years', text: '...' }],   // js/timeline.js:31 (text shortened)
```

The function receives the card `c`, so it can use `c.start` (the age computed by `ruleColorectal` or `ruleProstate`). `age` can be a number, `'now'`, or `'event'` (something to do when a situation comes up, like before surgery).

Some mappings worth knowing:
- Colon cards map to key `colon` (age 40 or the computed start). The polyps card maps to `colon` at 40 with `maybe: true`.
- The four genetic-counseling cards all map to key `genetic` at `'now'`.
- "Get a cholesterol test now" replaces `chol1` with `'now'`.
- "Ask about testing for type 2 diabetes" adds a new key, `diabetes-teen`, at 10. "Ancestry and type 2 diabetes" replaces adult `diabetes` at 35 with a lower-weight version.
- Prostate cards replace `prostate` at 45 or the computed start.
- Blood clots, the anesthesia reaction and parents related by blood become `'event'` items.

Cards with no entry here (for example "Early heart disease in a parent or sibling", "South Asian ancestry and heart disease", or any "missing" card) add nothing to the timeline. Because the link is the exact title text, changing a card's title in `risk.js` without changing it here would silently drop it from the timeline.

### `ageOf(p)` — line 56

```js
const ageOf = p => p?.born && /^\d{4}$/.test(p.born) ? Math.max(0, YEAR - +p.born) : null;   // js/timeline.js:56
```

If the person has a four-digit birth year, their age is the current year (`YEAR`, from `app.js`) minus it, never below 0. Otherwise `null` (unknown). It ignores birthdays, so it can be a year off. `YEAR` is defined in `app.js`, which loads later, but that's fine: the name is only looked up when `ageOf` runs, by which time every script has loaded.

### `timelineItems()` — lines 59–78

**Step 1: who and how old** (lines 60–61). `now` is your age (or `null`). `forMe` keeps items with no `sex`, or matching your sex, or all items if your sex is unknown.

**Step 2: start a Map of usual items** (line 62):

```js
const items = new Map(TIMELINE_BASE.filter(forMe).map(it => [it.key, { ...it, family: false }]));   // js/timeline.js:62
```

`new Map([[key, value], ...])` builds a Map from pairs. Each item is copied with spread and marked `family: false`. Using a Map keyed by `key` makes "replace the colon item" a single `set`.

**Step 3: apply each card** (lines 63–69). For each card, `TIMELINE_FROM_CARD[c.title]?.(c) || []` looks up the function and calls it. The `?.(c)` is optional chaining on a **call**: if there's no function for this title, it gives `undefined` instead of crashing, and `|| []` turns that into an empty list. Each new item is marked `family: true`, takes the card's first source and level.

Then the merge rule:

```js
const rank = x => x.age === 'now' ? -1 : x.age === 'event' ? 999 : x.age;
if (!prev || !prev.family || (rank(item) < rank(prev) && !(item.maybe && !prev.maybe))) items.set(it.key, item);   // js/timeline.js:67-68
```

In words, the new family item goes in if:
- nothing has that key yet, **or**
- the existing item is a usual one (a family item always replaces the usual one), **or**
- it's earlier than the existing family item (`'now'` counts as earliest, `'event'` as latest), **unless** the new one is only a "maybe" and the old one is firm.

So the earliest firm family advice wins. Since cards arrive sorted with "act" first, a tie keeps the more urgent card's item. A `Map` keeps each key in its original position even when its value is replaced.

**Step 4: due and catch-up** (lines 70–75). For each item:
- `due` is true if the age is `'now'`, or a number at or below your age.
- `catchUp` is true for a **usual** item whose last age (`until`, or `age` if there is no `until`) is already behind you. `it.until ?? it.age` uses `??`, which picks `it.age` only when `until` is missing.

**Step 5: order** (lines 76–77):

```js
const order = it => it.age === 'event' ? 1e4 : it.due ? (it.family ? -2 : -1) : it.age;
return list.sort((a, b) => order(a) - order(b) || (b.family - a.family));   // js/timeline.js:76-77
```

Family items due now come first (−2), then usual items due now (−1), then future items by age, then "event" items last (`1e4` is 10,000). If two items tie, `b.family - a.family` breaks the tie: `true - false` is 1, so family items come before usual ones at the same age. The `||` works because a tie gives `0`, which counts as false, so the second comparison is used.

### `timelineHTML({ compact = false } = {})` — lines 80–95

`{ compact = false } = {}` is **destructuring with defaults**: the function takes an options object, pulls out `compact` (default false), and works even if called with no argument at all.

1. It gets your age and the items, and counts family items (`fam`).
2. `when(it)` writes the label: "When it comes up", "Now", or "At 17–21 · in 1 year" (the "in N years" part only if your age is known).
3. It splits items into three groups, "Now", "Later" and "When it comes up", and drops empty groups.
4. It builds HTML with template literals. Family items get the CSS class `fam` (the gold styling) and a "Because of your family" tag; catch-up items get the class `catch` and the label "If you missed it". Every piece of text goes through `esc()` before being put into HTML, so names and typed text can't inject code. In compact mode (the doctor report), the explanation text and sources are left out.
5. It ends with the fine print: "Based on US guidelines. Your doctor decides what is right for you…"

### `timelineLines()` — lines 97–99

The same items as plain text for the summary and PDF, for example `Now: Cholesterol test now (because of family history)` or `At 45: Colon cancer screening`.

### Worked example

You are a girl born in 2010, so in 2026 `now` is 16. Dad had colon cancer at 46.

- `ruleColorectal` returns an act card with `start: 36`. `TIMELINE_FROM_CARD` makes `{ key: 'colon', age: 36, title: 'Colonoscopy, then every 5 years', family: true }`, which replaces the usual colon item at 45.
- `chol1` (9–11) and `hpv` (11–12) are due and are catch-up items, since 11 and 12 are below 16. They show under "Now" with "If you missed it".
- `chol2` at 17 shows under "Later" as "At 17–21 · in 1 year".
- The colon item shows under "Later" as "At 36 · in 20 years", in gold, tagged "Because of your family".
- `prostate` is skipped because it is for males.

---

## What the rules do NOT do

Being clear about limits is part of understanding the code (and a good answer for judges):

- **They don't diagnose anything.** They flag patterns that published guidelines say are worth discussing. The doctor decides.
- **They trust the interview.** If a relative misremembers "colon" for "stomach" cancer, the rules can't tell. Only the sex mix-up check (`possibleFor`) and the disagreement flag catch errors.
- **They use the youngest reported age.** That is cautious, but it can overstate risk if one relative misremembers.
- **Missing ages are handled differently by rule.** The colon and prostate rules treat a missing age as young "to be safe"; FHS-7, heart "early", Lynch "under 50" and `familyRisk` treat a missing age as not early (the heart rule adds a "missing" card instead).
- **Amsterdam II is simplified.** The real criteria also require ruling out another polyp syndrome (FAP) and confirming the tumors with pathology reports. The code only checks counts, links, generations and age.
- **Polyps can't be graded.** The app doesn't know if a polyp was "advanced", so it only suggests asking.
- **Personal factors are left out.** Weight, smoking, blood pressure readings and test results aren't in the data. For example, the ADA type 2 diabetes advice depends on overweight, which the app never asks about.
- **The labels simplify degree 1.** Children count as degree 1, so wording like "parent or sibling" is sometimes really "parent, sibling or child".
- **`familyRisk` only uses degree 1 and 2 for its level.** Cousins and great-grandparents (degree 3) only add to the score and the "more distant relative" reason.
- **Ancestry is a self-reported label** and only one input. It is stored on your record only.
- **Ages are approximate.** `ageOf` ignores birthdays. Usual items with no `until` (like blood pressure from 18) are labeled "If you missed it" once you're past their start age, even though they're ongoing.
- **Not every card reaches the timeline.** The link is by exact title, and some cards have no timeline entry.
- **US guidelines only.** Other countries' guidelines differ.

---

## Check your understanding

1. **Mom says Grandpa's heart attack was at 50, Dad says 52, and Grandpa's sister says 56. What age does the fact use, and is it flagged as a disagreement?**
   *50, the youngest. Yes: there are at least two ages and 56 − 50 = 6, which is 3 or more (`js/risk.js:37`).*

2. **Your sister had colon cancer at 38. What start age does `ruleColorectal` give, and how does it reach the timeline?**
   *28: `Math.min(40, 38 − 10)`. The card carries `start: 28`; `TIMELINE_FROM_CARD['Start colon cancer screening early']` makes a `colon` item at age 28 that replaces the usual one at 45.*

3. **Why doesn't Aunt Meena, who married your uncle, count toward your risk, and where does she still appear?**
   *`withFact` only looks at `bloodRelatives()`, which needs `kin(p.id).blood` to be true. She's not blood related, so the rules skip her, but `ruleNotBlood` lists her health in a note card and she stays on the tree.*

4. **In `familyRisk`, why does one brother with early diabetes make the level "high", but one brother with diabetes at 60 only "moderate"?**
   *Diabetes's early cutoff is 50. Under 50, `fdr.some(early)` adds a high reason. At 60 it isn't early, so only `fdr.length === 1` fires, which is a moderate reason.*

5. **What does `.flatMap(r => r())` in `guidelineCards` do, and why are "act" cards first?**
   *It calls every rule function and joins the arrays they return into one flat list. Then it sorts by `rank` (`act: 0` … `missing: 3`), and the stable sort keeps rules of the same level in their original order.*

---

Next: **05 Answer finder and speech**.
