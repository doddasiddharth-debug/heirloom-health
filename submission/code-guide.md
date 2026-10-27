# Understanding Heirloom Health's code

A study guide to how the app works, built from the real code. Read it in order. Each part says what the code does, where it lives, shows the actual code, and explains it in plain words. At the end are practice questions judges might ask, and small changes you can make yourself.

---

## 1. The big picture

Heirloom Health is a **web app**: plain **HTML** (the page structure), **CSS** (the look) and **JavaScript** (everything it does). There is no build step and no framework like React. The browser loads the files exactly as they are.

```
index.html          the page, and all the styles (CSS)
js/content.js       the data: languages, illnesses, interview questions, guideline sources
js/languages.js     translations for 7 more languages
js/family.js        the family "graph": people and how they're connected
js/risk.js          the medical logic: combining answers, guideline rules, risk levels
js/layout.js        drawing the family tree
js/extract.js       the answer finder ("sugar" → diabetes)
js/timeline.js      My health timeline
js/share.js         invite links, answer links, encrypted sync
js/app.js           the screens, buttons, saving, and the PDF
js/tour.js          the guided tour
server/worker.js    the optional Cloudflare server (AI, speech-to-text, sync, feedback)
sw.js               the service worker that makes the app work offline
```

**Where it runs:** the files are hosted for free on **GitHub Pages**. When you push a change to GitHub, a workflow publishes the new version automatically in about a minute.

**Where data lives:** on the user's own device, in the browser's storage, not on a server. That's the privacy design.

---

## 2. How the app remembers a family (the data model)

Everything about the open family lives in one JavaScript object called **`S`** (for "state"). It has three important lists:

- **`S.people`**: each relative, e.g. `{ id, name, sex, born, living, deathAge, cause }`
- **`S.rels`**: the connections between people:
  - `{ kind: 'parent', parent: 'p-123', child: 'self', bio: true }` (a parent link; `bio: false` means adoptive or step)
  - `{ kind: 'partner', a: 'p-1', b: 'p-2' }` (a couple)
- **`S.reports`**: every health answer, and **who said it**:

```js
// js/risk.js
function addReport(pid, cond, type, by, fields = {}) {
  let r = findReport(pid, cond, type, by);
  if (!r) { r = { id: uid('r'), pid, cond, type: type || '', age: '', said: '', by, at: today() }; S.reports.push(r); }
  Object.assign(r, fields);
  return r;
}
```

**In plain words:** a report means "*person `by` told us that person `pid` had condition `cond` (kind `type`) starting at age `age`*". Keeping **who said it** lets the app combine answers from different relatives and flag when they disagree (for example, Grandma says 50 and Dad says 55).

**Saving** turns `S` into text (JSON) and stores it in the browser's **localStorage**, under the signed-in profile:

```js
// js/app.js
function save() {
  touchFamily();
  if (!S || !ACCT || ACCT.viewer) return;
  // Changes to the example family aren't kept, so it is always the same for the next visitor.
  if (ACCT.guest && !ACCT.contributor) return;
  try { localStorage.setItem(dataKey(ACCT.id), JSON.stringify(S)); } catch {}
}
```

**Key idea to explain to judges:** *"The family is stored as a graph: people are the points, parent and partner links are the lines, and health answers are attached to people with who reported them."*

---

## 3. Working out how people are related (kinship)

To apply medical rules, the app must know if someone is a **first-degree** relative (parent, sibling, child), **second-degree** (grandparent, aunt, uncle) and so on, and whether they're a **blood relative** at all.

Step one: find all of a person's biological ancestors and how many generations up each one is. This is a **breadth-first search (BFS)**, a classic algorithm that explores one generation at a time:

```js
// js/family.js
function bioAncestors(id) {
  const dist = new Map([[id, 0]]), queue = [id];
  while (queue.length) {
    const cur = queue.shift();
    for (const p of bioParents(cur)) if (!dist.has(p)) { dist.set(p, dist.get(cur) + 1); queue.push(p); }
  }
  return dist;
}
```

**In plain words:** start with the person at distance 0. Take someone off the front of the queue, look up their biological parents, record each parent as "one more generation up", and add them to the queue. Repeat until there's nobody left. The result is a map like `{ you: 0, mom: 1, dad: 1, grandma: 2, … }`.

Step two (`computeKin`): run that for **you** and for the **relative**, then find the **closest shared ancestor**. The number of generations from each side gives the relationship:
- You → Mom is 1 step: **first-degree**.
- You and a cousin meet at a grandparent, 2 steps up from each of you: **first cousin, third-degree**.
- If there's no shared biological ancestor (an aunt by marriage, a step-parent), they're **not blood related**, and the medical rules leave them out.

It also works out the **side** (Mom's or Dad's) and handles half-siblings and adoption.

---

## 4. Turning answers into medical advice (the guideline rules)

Each guideline is a small function in `js/risk.js` that looks at the family and returns "cards". Here is the colon cancer rule:

```js
// js/risk.js
function ruleColorectal() {
  const crc = withFact(isCancer('colorectal'));
  const fdr = crc.filter(x => x.k.degree === 1), other = crc.filter(x => x.k.degree > 1);
  const src = ['usmstf', 'uspstfCrc'];
  if (fdr.some(x => !x.age || x.age < 60) || fdr.length >= 2) {
    const ages = fdr.map(x => x.age).filter(Boolean), youngest = ages.length ? Math.min(...ages) : null;
    const start = youngest ? Math.min(40, youngest - 10) : 40;
    return [{ level: 'act', title: 'Start colon cancer screening early', start, ... }];
  }
  if (fdr.length === 1) return [{ level: 'discuss', title: 'Start colon cancer screening at 40', ... }];
  ...
}
```

**In plain words:**
1. `withFact(...)` finds every **blood relative** who had colon cancer.
2. `fdr` keeps only the **first-degree** ones (parent, sibling, child).
3. If a first-degree relative had it **before 60** (or two of them had it at any age), the guideline from the US Multi-Society Task Force says start colonoscopy at **40, or 10 years before the youngest relative's diagnosis, whichever is earlier**. That's `Math.min(40, youngest - 10)`.
4. One first-degree relative at 60 or older means start at **40** instead of the usual 45.
5. Every card lists its **sources**, which show up as citations in the report.

There are similar rules for breast/ovarian cancer (BRCA), Lynch syndrome, heart disease and cholesterol, diabetes, prostate cancer, inherited heart conditions, hepatitis B, celiac disease and more.

**Why rules, not AI?** Rules are **predictable and checkable**. The same family always gets the same advice, and every piece of advice points to a published guideline. That matters for health information.

---

## 5. "What am I most at risk for?" (the risk ranking)

This is in `familyRisk()` in `js/risk.js`. For each condition it collects the blood relatives who had it, then asks the questions used by the **family-history method behind the CDC's Family Healthware tool** (based on Scheuner et al., 1997):

- Did a **parent or sibling** have it **young** (for heart disease, before 55 for men or 65 for women)? → **higher than average**
- Did **two or more** parents or siblings have it? → **higher than average**
- Is there a pattern on **both** Mom's and Dad's sides? → **higher than average**
- Did **one** parent or sibling have it, or **two** grandparents/aunts/uncles on the same side? → **moderate**
- Only more distant relatives? → **about average**

Ancestry can also raise a condition by itself (for example, South Asian ancestry and heart disease). The results are sorted so the biggest risks come first.

**Key idea:** *"Closer relatives, younger ages, and more relatives with the same illness all raise the risk level."*

---

## 6. Understanding what relatives say (the answer finder)

When you type what a relative said and tap **Find answers**, `findAnswers()` in `js/extract.js` runs. It is **not AI**; it's a careful word-matching system that works on the phone with no internet.

It uses an **everyday-word dictionary** in `js/content.js`:

```js
// js/content.js (shortened)
const LEXICON = [
  { cond: 'heart',    words: ['heart attack', 'heart disease', 'cardiac', 'bypass', 'stent', 'గుండెపోటు', ...] },
  { cond: 'diabetes', words: ['diabetes', 'diabetic', 'sugar', 'insulin', 'షుగర్', 'शुगर', ...] },
  ...
];
```

What the finder does with a sentence like *"My mother had sugar since she was 50, but no heart problems"*:
1. **Splits** the text into sentences and clauses (at periods, commas, and words like "but").
2. **Finds illness words** from the dictionary: "sugar" means diabetes, and "heart problems" means heart disease.
3. **Checks for "no"** in the same clause: "no heart problems" means heart disease is *not* added.
4. **Finds the age** nearest the illness: 50, including spoken numbers like "forty-seven" and numbers in Indian scripts.
5. **Finds who** it's about: "my mother".
6. Shows **suggestions** that you confirm. Nothing is saved without your OK.

**Find with AI** is the optional second option: it sends the text (after you agree) to your Cloudflare server, which asks an AI model to do the same job for longer, messier answers.

Real bugs that had to be fixed here, which make good examples to mention:
- "heartburn" was matching heart disease, so Latin-script words now have to match whole words.
- "Delhi" matched the Hindi word for heart (दिल), so non-Latin words now have to start at a word boundary.
- "type 2 diabetes" was read as age 2, so numbers after words like "type" or "stage" are skipped.

---

## 7. Drawing the family tree

`layoutFamily()` and `treeSVG()` in `js/layout.js` draw the tree as **SVG** (scalable vector graphics: shapes described in code, so they stay sharp at any zoom).

The layout follows a well-known approach for drawing layered graphs (the **Sugiyama method**):
1. **Layers:** put each generation in its own row (grandparents, parents, you).
2. **Order:** within each row, reorder people to **reduce crossing lines**, moving each person toward the average position of their connections (the "barycenter" method).
3. **Place:** space people out so couples sit together and **labels don't overlap**. The app measures how wide each name label actually is.

Then it draws the **standard medical pedigree symbols**: squares (male), circles (female), filled gold (has a condition), a slash (died), and dashed outlines (not blood related).

---

## 8. Sharing and privacy

**Invite and doctor links carry the data inside the link itself**, after the `#`. Browsers never send that part of a link to a web server:

```js
// js/share.js
async function packData(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if ('CompressionStream' in window) {
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'z' + b64u(new Uint8Array(out));
  }
  return 'j' + b64u(bytes);
}
```

**In plain words:** turn the data into text (JSON), **compress** it (like a zip file) so the link is shorter, then encode it in a link-safe alphabet (base64url). Opening the link reverses the steps.

**Cloud sync is end-to-end encrypted:**

```js
// js/share.js
async function encryptFamily() {
  const key = await aesKey(S.sync.key), iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({ people: ..., rels: S.rels, reports: S.reports, ... }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  return JSON.stringify({ iv: b64u(iv), ct: b64u(ct) });
}
```

**In plain words:** the family is locked with **AES-GCM**, a standard encryption method built into browsers, using a random key that exists **only in the sync link**. The server stores only scrambled data it can't read.

**Security fix worth mentioning:** a review found that a specially crafted share link could inject code into the page. Now every link is **validated** before use (`cleanFamily` in `js/share.js`): only expected values are accepted.

---

## 9. The server (optional)

`server/worker.js` runs on **Cloudflare Workers** (free). It does four things:
1. `/api/extract`: AI answer finding, using Cloudflare's free **Workers AI** models.
2. `/api/transcribe`: speech-to-text with the open-source **Whisper** model.
3. `/api/family/:id`: stores the **encrypted** sync copy.
4. `/api/feedback`: saves bug reports and ideas.

It only accepts requests from your website (a security setting called **CORS**), and it limits how many requests each visitor can make (**rate limiting**), so nobody can use up the free AI allowance.

---

## 10. Working offline

`sw.js` is a **service worker**: a small script the browser runs in the background. The first time you open the app, it saves copies of the app's files. After that, if there's no internet, it serves the saved copies, so interviews still work offline. That's useful at a grandparent's home with weak Wi-Fi.

---

## Practice: questions judges might ask

**"How does the app decide someone's risk?"**
> It looks at which blood relatives had a condition, how closely related they are, how young they were, and how many had it, on each side of the family. It follows the family-history method behind the CDC's Family Healthware tool and ranks each condition as higher than average, moderate or about average.

**"How do you know the advice is correct?"**
> The rules come from published guidelines (US Preventive Services Task Force, the American Diabetes Association, the American Cancer Society and others), and every card names its source. They're fixed rules, not AI, so the same family always gets the same advice. The app also says clearly that it's not a diagnosis.

**"How does it understand 'sugar' means diabetes?"**
> An everyday-word dictionary in 11 languages, plus rules for negation ("no"), ages and who the sentence is about. The user confirms every suggestion.

**"Where is the data stored? Is it safe?"**
> On the user's own phone, in the browser. Share links carry data inside the link, after the #, which browsers never send to a server. Cloud sync is encrypted with a key only the family has.

**"What was the hardest part?"**
> Pick one you can explain well: drawing the tree for complicated families, making the answer finder work across languages, or getting the medical rules exactly right.

**"How did you use AI?"**
> Be honest and specific. Claude Code wrote the code from my instructions. I designed every feature, set the design direction, tested it and found bugs, set up the hosting and server, and checked the medical sources. Then name one part of the code you can explain in detail, from this guide.

**"What would you do next?"**
> Have fluent speakers review the translations, test with real families and doctors, and connect directly to clinic record systems.

---

## Try it yourself: small changes you can make

Each change is small and safe. Make them on GitHub in your browser: open your repository, press the **`.`** key to open the web editor, edit the file, then **Commit**. The site updates about a minute later. (Reload twice to see it.)

### Change 1: Change the main color (easy)
1. Open `index.html` and find the line near the top that starts with `:root {`.
2. Change `--primary: #0E7C86;` to another color, such as `#2563EB` (blue).
3. Commit and reload: buttons, links and headings change color.
4. **What you learned:** CSS variables let one value control the whole app's look. Change it back after.

### Change 2: Teach the answer finder a new word (easy)
1. Open `js/content.js` and find `const LEXICON = [`.
2. In the `bp` line, add a word or phrase people in your family use for high blood pressure, inside quotes and followed by a comma, in the `words: [...]` list.
3. Commit, then in the app's interview type a sentence with that word and tap **Find answers**.
4. **What you learned:** the finder is driven by data, so improving it often means improving the dictionary, not the code.

### Change 3: Rewrite a tour step (easy)
1. Open `js/tour.js` and find `title: 'Your family tree'`.
2. Change its `text:` to your own words.
3. Commit and start the tour from **Menu → Take the tour**.

### Change 4: Add a tip to an interview question (medium)
1. In `js/content.js`, find `const STEPS = [`. Each line is one interview step.
2. Find `{ k: 'father_cond', type: 'conds', who: 'father' },` and add a tip so it reads:
   `{ k: 'father_cond', type: 'conds', who: 'father', tip: 'Your tip here.' },`
3. Commit, go to the interview, and step to the questions about the father. Your tip appears.
4. **What you learned:** the interview is built from a list, so adding or changing steps doesn't need new screen code.

### Change 5: Add an item to the health timeline (harder)
1. Open `js/timeline.js` and find `const TIMELINE_BASE = [`.
2. Copy one line, such as the `bp` line, and change it into a new item. For example, a yearly checkup from age 18:
   `{ key: 'checkup', age: 18, title: 'Yearly checkup', text: 'See your doctor once a year and bring this report.' },`
   (Leave out `source:` unless you add a real one.)
3. Commit and open **My risks**: your item appears in the timeline at age 18.
4. **What you learned:** how data and logic are separated. `TIMELINE_BASE` is the data; `timelineItems()` is the logic that merges it with family-based advice.

**If something breaks:** on GitHub, open the file's history, view the previous version, and copy it back. Or ask me and I'll help you fix it. Making a few of these changes yourself means you can honestly say you modified and tested the code, and you'll understand it much better.
