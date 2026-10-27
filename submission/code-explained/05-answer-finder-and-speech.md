# Part 5: The answer finder and speech-to-text

This part covers three files:

- `js/extract.js`: the **answer finder**. It reads what a relative said (typed, or turned into text from a recording) and suggests answers such as "Mother: diabetes, age 50".
- `js/stt.js` and `js/stt-worker.js`: **speech-to-text** ("STT"). They turn a recording into text, either on the phone itself or with the Heirloom server.

Together they form one pipeline:

```
recording (audio)  --stt.js / stt-worker.js-->  transcript (text)  --extract.js-->  suggestions  --teen taps "Add"-->  saved answers
```

Nothing in these files saves an answer. They only suggest. The teen confirms each suggestion with "Add" on the interview screen (`js/app.js`).

Every example output in this part was produced by running the real code: the word lists from `js/content.js` and `js/languages.js` plus `js/extract.js`, loaded into Node.js, and checked again in a Chromium browser with Playwright. Where the text says "the code returns", that is what it returned.

---

## 1. Where these files fit

`index.html` loads the app as a list of **classic scripts** (plain `<script src="...">` tags, not modules). In classic scripts, anything declared at the top level of one file (like `const LEXICON = [...]`) is visible to every file loaded after it. The order matters:

```
js/content.js     word lists: LEXICON, CANCER_LEXICON, NEG_WORDS, KIN_WORDS, NUM_WORDS ...
js/languages.js   adds Tamil, Kannada, Bengali, Gujarati, Urdu, Chinese, Vietnamese words to those lists
js/extract.js     the finder, which reads those lists
js/stt.js         speech-to-text helpers
js/app.js         the screens, which call findAnswers / transcribeOnDevice
```

So `extract.js` contains almost no words itself. It holds the *rules*; the *vocabulary* lives in `content.js` (for example `LEXICON` at `js/content.js:388`, `NEG_WORDS` at `js/content.js:440`, `KIN_WORDS` at `js/content.js:451`, `NUM_WORDS` at `js/content.js:478`) and is extended by `languages.js`.

### How the app calls them

On the interview screen, the "Find answers" button runs `runFinder` in `js/app.js:286`. It gathers the transcript for the current step and builds a small **context** object, `ctx`, using `ivPeople` (`js/app.js:237`):

```js
return { subject, mother: mom?.id || null, father: dad?.id || null, step: st.k };
```

- `subject`: the id of the person the current question is about (the relative being interviewed, or their mother or father).
- `mother`, `father`: the ids of the interviewed relative's parents, if they are in the tree.
- `step`: which interview question this is, such as `conds_self`, `mother_cond` or `born`.

Then (`js/app.js:293`):

```js
if (!useAI) { SUGG = { key, list: fresh(findAnswers(text, ctx)), busy: false, ai: false }; showResults(SUGG.list, false); return; }
```

If the teen chose the AI option, `aiFindAnswers` runs instead, and if it fails, the app falls back to `findAnswers` (`js/app.js:295-297`).

The "Turn into text" button on a recording runs `transcribeClip` (`js/app.js:266`), which calls either `transcribeWithServer` or `transcribeOnDevice` from `stt.js` (`js/app.js:276`) and appends the text to the transcript.

---

## 2. `js/extract.js`: the answer finder

### The big idea

The finder does not "understand" language the way a person does. It uses **rules plus word lists**:

1. Clean up the text so the same word is always written the same way.
2. Split it into sentences, then into smaller parts at commas, "but" and "and".
3. In each part, decide **who** it is about (mother, father, the speaker, or "someone we can't place").
4. Look for **illness words** ("sugar", షుగర్, शुगर all mean diabetes).
5. Look for **numbers** and decide which are ages (not "type 2", not "for ten years").
6. Check for **"no"** near each illness.
7. Give each age to the nearest illness, and build suggestions.

This approach works offline, is fast, and every decision can be explained. Its weakness is that it only knows the words and patterns it was given.

### A few concepts first

**Regular expressions ("regex").** A regex is a small pattern language for finding text. In JavaScript it is written between slashes, like `/\d{1,4}/g`. Pieces used in this file:

| Piece | Meaning |
|---|---|
| `\d` | any digit 0-9 |
| `{1,4}` | the thing before, 1 to 4 times |
| `\s` | any whitespace (space, tab, newline) |
| `\S` | any non-whitespace character |
| `[abc]` | any one of these characters; `[^abc]` means any character *except* these |
| `+`, `*`, `?` | one or more / zero or more / optional |
| `(?:...)` | a group that is not saved separately |
| `a\|b` | either a or b |
| `^`, `$` | start / end of the text |
| `\b` | a "word boundary" (only reliable for English letters) |
| `(?<=X)` | **lookbehind**: "X comes right before here", without including X in the match |
| `(?<!X)` | **negative lookbehind**: "X does not come right before here" |
| `(?!X)` | **negative lookahead**: "X does not come right after here" |
| `\p{L}` | any letter in any alphabet (needs the `u` flag) |
| `\p{M}` | any "mark", such as an accent or an Indic vowel sign |
| `\p{Script=Latin}`, `\p{Script=Han}` | any character of the Latin alphabet / of Chinese characters |
| flag `g` | "global": find every match, not just the first |
| flag `i` | ignore upper/lower case |
| flag `u` | Unicode mode, needed for `\p{...}` |

**Unicode and scripts.** Computers store each character as a number called a **code point**. Unicode gives every character in every writing system a code point: `a` is U+0061, Telugu `ష` is U+0C37, Devanagari (Hindi) `दिल` is three code points. A **script** is a writing system: Latin (English, Spanish, Vietnamese), Telugu, Devanagari, Han (Chinese), and so on.

**Unicode normalization.** Some characters can be stored two ways. "é" can be one code point (U+00E9) or "e" plus a separate accent mark (U+0065 U+0301). They look identical but are different data, so a plain text search for one will not find the other. **NFC** ("composed") picks one standard form. Speech engines and keyboards do not always agree, so the finder converts both the transcript and every word in its lists to NFC before comparing. (`languages.js` goes further and adds each new word in both NFC and NFD forms; see `js/languages.js:643`.)

### Lines 13-17: small building blocks

```js
const LATIN = /[a-záéíóúñü]/i;
```
(`js/extract.js:13`) A test: "does this word contain an English/Spanish letter?" It decides which matching rules a word gets.

```js
const reEsc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```
(`js/extract.js:15`) Puts a backslash before any character that has a special meaning in regex. Without it, the word `"dr."` would turn into a pattern where `.` means "any character". `$&` means "the matched character itself".

```js
const WORDCH = /[\p{L}\p{M}]/u, HAN = /\p{Script=Han}/u, VIRAMA = /[्্્்్್]/;
```
(`js/extract.js:16`)
- `WORDCH`: "is this character part of a word?" (a letter or a mark, in any script).
- `HAN`: "is this a Chinese character?"
- `VIRAMA`: the **virama** (also called halant) in six Indian scripts. It is a small sign that removes a consonant's built-in vowel and joins it to the next consonant. In Hindi, `दिल्ली` (Delhi) is `द ि ल ् ल ी`: the `्` after `दिल` glues it to the next `ल`. So if a virama follows a match, the match is really part of a longer word.

```js
const falseFriend = (text, word, i) => (FALSE_FRIENDS[word] || []).some(p => { const k = p.indexOf(word); return text.startsWith(p, i - k); });
```
(`js/extract.js:17`) "False friends" are longer phrases that contain an illness word but mean something else. `FALSE_FRIENDS` (`js/content.js:512`) says, for example, that `दिल` (heart) inside `दिलचस्प` ("interesting") does not count, and `गर्भाशय` (uterus) inside `गर्भाशय ग्रीवा` (cervix) does not count as uterine cancer. The function checks whether, at the position where `word` was found, the text actually spells out one of those longer phrases.

### `findWord(text, word, from)`: the matching rule (lines 24-43)

Every lookup in the file goes through this function. It answers: "where does `word` appear in `text`, starting at position `from`? Return the position, or -1." The hard part is deciding what counts as "the word".

**Step 1: normalize and do a quick check.**
```js
if (!NFC.has(word)) NFC.set(word, word.normalize('NFC'));
word = NFC.get(word);
if (text.indexOf(word, from) < 0) return -1; // texts and words are lower case
```
(`js/extract.js:25-27`) The NFC form of each word is remembered in a `Map` (a key-value table) so it is computed only once. If the word is not in the text at all, stop early. This fast check skips most of the work, because most words in the lists are not in any given sentence.

**Step 2: words with Latin letters must be whole words.**
```js
if (!re) WORD_RE.set(word, re = new RegExp(`(?<![\\p{Script=Latin}\\p{M}])${reEsc(word)}(?:${word.length < 4 ? '' : 's|es|'}'s)?(?![\\p{Script=Latin}\\p{M}])`, 'giu'));
```
(`js/extract.js:30`) This builds a regex for the word. For `heart` it becomes, in effect:

```
(?<![\p{Script=Latin}\p{M}])heart(?:s|es|'s)?(?![\p{Script=Latin}\p{M}])
```

Read it as: "no Latin letter just before; then `heart`; then optionally `s`, `es` or `'s`; then no Latin letter just after." So:

- `findWord('i had heartburn', 'heart')` returns `-1` (a letter follows).
- `findWord('the hearts', 'heart')` returns `4` (the plural is allowed).
- `findWord('now', 'no')` returns `-1`. Words under 4 letters only allow `'s`, never a plural `s`, so short words cannot accidentally match longer ones (the comment's example: Spanish "más" is not "má").

The regex is built once per word and stored in `WORD_RE`. With the `g` flag, `re.lastIndex = from` tells `re.exec` where to start; the loop (`js/extract.js:32-35`) skips false friends. (Plain `\b` would not work: it only knows English letters and treats the `ñ` in "riñón" as a word break.)

**Step 3: other scripts allow endings.**
```js
const startOK = HAN.test(word) || !WORDCH.test(word[0]) || !WORDCH.test(text[i - 1] || ' ');
if (startOK && !VIRAMA.test(text[i + word.length] || '') && !falseFriend(text, word, i)) return i;
```
(`js/extract.js:39-40`) Telugu, Hindi, Tamil and others attach endings directly to words: `షుగర్‌తో` means "with sugar". So for these scripts only the **start** must be a word start (the character before must not be a letter), while the end may continue. The exceptions:

- Chinese (`HAN`) has no spaces between words, so a Chinese word may match anywhere.
- If a virama comes right after, the match is glued into a longer word, so it is rejected.

| Call | Result | Why |
|---|---|---|
| `findWord('అమ్మకి షుగర్‌తో', 'షుగర్')` | `7` | the ending `‌తో` is allowed |
| `findWord('उन्हें दिल की बीमारी', 'दिल')` | `7` | "heart disease": a real match |
| `findWord('वह दिल्ली में', 'दिल')` | `-1` | virama after `दिल`: this is "Delhi" |
| `findWord('पैंतीस', 'तीस')` | `-1` | `तीस` (30) starts mid-word in `पैंतीस` (35) |

`hasWord` (`js/extract.js:44`) is a shortcut for `findWord` that nothing in the app currently calls.

### `allWords(low, words)`: every match, longest wins (lines 46-51)

Finds every place any word in a list appears. When two matches overlap, the longer one wins:

```js
out.sort((a, b) => b.len - a.len || a.at - b.at);
return out.filter((x, k) => !out.slice(0, k).some(y => x.at < y.at + y.len && y.at < x.at + x.len)).sort((a, b) => a.at - b.at);
```
(`js/extract.js:49-50`) Sort longest first; drop any match that overlaps one already kept; then sort back into reading order. `allWords('small bowel cancer', ['bowel', 'small bowel'])` returns only `small bowel`.

The test `x.at < y.at + y.len && y.at < x.at + x.len` is the standard way to ask "do two ranges overlap?"

### `normalize(s)`: one way of writing text and digits (lines 53-55)

```js
const normalize = s => s.normalize('NFC').replace(/[०-९০-৯ ... ０-９]/g,
  d => String(d.codePointAt(0) - DIGIT_ZEROS.find(z => d.codePointAt(0) >= z && d.codePointAt(0) <= z + 9)));
```
(`js/extract.js:54-55`, middle of the character list shortened here) Many scripts have their own digits: Hindi `४७`, Telugu `౪౭`, full-width `４７`. In Unicode, each script's digits 0-9 sit in a row of ten code points. `DIGIT_ZEROS` (`js/extract.js:53`) lists where each row's zero is. For each such digit, the code finds its row and subtracts the zero, giving 0-9. The real result: `normalize('౪౭ and ४७ and ４７')` returns `"47 and 47 and 47"`. After this, the rest of the code only needs to handle 0-9.

### `aboutWhom(part)`: who is this about? (lines 58-74)

Returns `'mother'`, `'father'`, `'other'` (a relative the finder cannot place), `'self'` (the speaker) or `null` (no clue).

1. **Split into tokens** (words):
   ```js
   const toks = part.toLowerCase().replace(/[\s-]+in[\s-]+law\b/g, '-in-law').split(/[\s,;:"()!?.।，、،]+/).filter(Boolean);
   ```
   (`js/extract.js:59`) First "mother in law" is joined into one token `mother-in-law`, so it is not mistaken for "mother". Then the text is split at spaces and punctuation (including the Hindi full stop `।` and Chinese and Arabic commas). `.filter(Boolean)` removes empty strings.

2. **Match each token against `KIN_WORDS`** (`js/extract.js:62-64`). `KIN_WORDS` (`js/content.js:451`) has `stems` and `not` lists for `mother`, `father` and `other`. The rule depends on the word:
   - Short English stems (under 4 letters, like `mom`, `dad`) must match the token exactly, or with `'s`. So "moment" is not "mom".
   - Other stems only need to *start* the token, so Telugu `అమ్మకి` ("to mother") matches the stem `అమ్మ`.
   - Chinese "other" relatives may sit anywhere in a token, since Chinese has no spaces.
   - The `not` list blocks look-alikes: `అమ్మమ్మ` (grandmother, "mother's mother") starts with `అమ్మ` but is listed under `not` for mother and under `stems` for other.

3. **"Mom's dad" is not dad** (`js/extract.js:67-71`). If a parent word is followed by a possessive ending (`'s`, Bengali `ের`, Telugu `గారి`…) or a linking word (Hindi `के/की/का`, Spanish `de`) and then another kin word, the person is someone else's parent: `'other'`. Real result: `aboutWhom("my mom's dad had diabetes")` returns `"other"`.

4. **Pick the answer** (`js/extract.js:72-73`): mother first, then father, then other; if none, check `SELF_WORDS` ("I", "me", నేను, मैं…) and return `'self'`; otherwise `null`.

More real results: `aboutWhom('i have asthma')` is `"self"`; `aboutWhom('ammamma ki sugar')` is `"other"`; `aboutWhom('a moment later')` is `null`.

### `numbersIn(low)`: every number, spoken or written (lines 78-97)

Returns a list of `{ n, at, len }`: the value, where it starts, and how many characters it covers.

1. **Digits**: `low.matchAll(/\d{1,4}/g)` (`js/extract.js:80`) finds runs of 1 to 4 digits. `matchAll` returns every match along with its position.

2. **Tens words** (`js/extract.js:82-94`): for each word in `NUM_WORDS` ("forty", `నలభై`, `चालीस`, "cuarenta", `四十`…), find it, then look just after it for a ones word from `NUM_UNITS`. The separator regex allows a space, hyphen, or Spanish "y":
   ```js
   sep = rest.match(LATIN.test(w) ? /^[\s-]+(?:y\s+)?/ : /^[\s-]*/);
   ```
   (`js/extract.js:85`) If the tens value ends in 0 and a ones word follows, they are added: "forty-seven" becomes 47. The units list is sorted longest first (`js/extract.js:81`) so a longer ones word is tried before a shorter one that starts the same way. Real results:
   - `numbersIn('cuarenta y siete años')` gives `[{"n":47,"at":0,"len":16}]`
   - `numbersIn('నలభై ఏడు లో')` gives `[{"n":47,"at":0,"len":8}]`
   - `numbersIn('in her forties')` gives 45. ("Forties" style words map to the middle, set in `js/content.js:480`.)

3. **Ambiguous words**: `NUM_NEEDS` (`js/content.js:500`) says the Hindi word "saath" (60) counts only before a word like "saal" (years), because "saath" also means "with". `numbersIn('saath saal ki umar')` finds 60; `numbersIn('mere saath')` finds nothing.

4. **Teens** like "fifteen" and Spanish "veintisiete" (27) come from `NUM_TEENS` (`js/extract.js:95`).

5. **Drop labels and durations** (`js/extract.js:96`):
   ```js
   return out.filter(x => !isLabel(low, x) && !isDuration(low, x));
   ```

**`isLabel`** (`js/extract.js:99-100`) throws out a number that comes right after a label word (`NUM_LABELS`: "type", "stage", `టైప్`…) or right before Chinese `型`/`期`. `numbersIn('type 2 diabetes')` returns `[]`.

**`isDuration`** (`js/extract.js:101-109`) throws out "how long" numbers. A number is a duration if:
- it is followed by Chinese `年` or Vietnamese `năm`, or a Hindi phrase like "saal se" ("for ... years"), or
- it is followed by a years word (`YEAR_UNITS`), *and* either that word carries a "for/ago" ending or is followed by one (`FOR_AFTER`: "ago", Telugu `గా`, Hindi `से`…), or one of the two words before the number is "for", "past", "since", "hace"… (`FOR_BEFORE`).

Real results:
- `numbersIn('10 saal se sugar hai')` → `[]` ("for 10 years")
- `numbersIn('10 సంవత్సరాలుగా షుగర్')` → `[]` (`సంవత్సరాలు` + `గా` = "for years")
- `numbersIn('at 47, 10 years ago')` → only 47
- But in `47 ఏళ్ళప్పుడు` ("when she was 47 years"), the years word has no "for/ago" ending, so 47 stays.

### `cutsIn(low, and)`: where a sentence's parts end (lines 112-116)

Returns the positions of commas, semicolons (also Chinese `，、` and Arabic `،؛`) and "but" words (`BUT_WORDS`: "but", "pero", `కానీ`, `लेकिन`…). With `and = true`, it also cuts at "and" words (`AND_WORDS`). Two versions are used: cuts *without* "and" limit how far a "no" can reach; cuts *with* "and" split the sentence into parts that might be about different people.

### `negatedNear(...)`: did they say "no"? (lines 120-133)

This decides whether an illness word was denied. Languages put "no" in different places: English says "**no** diabetes" (before), Telugu says "షుగర్ **లేదు**" (after), Hindi "शुगर **नहीं** है" (after).

1. `NEG_AFTER` (`js/extract.js:121`) is computed once: all `NEG_WORDS` that are not in `NEG_BEFORE`. The `||=` operator means "assign only if it is still empty".
2. **The window** (`js/extract.js:122-123`): look back from the illness word to the nearest earlier cut, but at most 48 characters; look ahead to the next cut, the next illness word (`stops`), or 32 characters.
3. **Stop words** (`js/extract.js:125`): if "until", "when", "after", "because"… appears before the illness, only the text after it counts. So in "No problems until he got diabetes at forty-five", the "no" does not reach "diabetes". (Real result: diabetes, age 45, not negated.)
4. **"No" before** (`js/extract.js:126-130`): a `NEG_BEFORE` word with at most 5 words between it and the illness.
5. **"No" after** (`js/extract.js:131-132`): a `NEG_AFTER` word within the next 4 words.

A negated suggestion is not thrown away. It is shown with a note: "They may have said no. Check before adding." (`js/app.js`, in `suggestionHTML`). That lets a person make the final call.

### `firstWord(low, list)` (line 134)

Finds which word from a list appears first in the text (ties go to the longer word). Used for birth words, "still alive" words, and pronouns.

### `assignAges(hits, ages)`: which age goes with which illness (lines 138-146)

```js
const dist = (x, h) => x.at >= h.at ? x.at - (h.at + h.len) : (h.at - x.at) * 2;
```
(`js/extract.js:139`) The distance from a number to an illness word. A number **after** the illness ("sugar at 50") costs its real gap. A number **before** the illness costs **double**, because English speakers usually say the age after. It is not forbidden, though, because Telugu and Hindi often put the age first ("47 లో షుగర్").

Each number goes to the closest illness, if it is within 60 and closer than any number that illness already has (`js/extract.js:141-142`). `reduce` here walks the list keeping the best so far. Then, cancer kinds named by the same cancer word share its age (`js/extract.js:145`): "Breast and ovarian cancer at 45" gives both breast and ovarian cancer age 45 (real result).

Only non-negated illnesses take ages (`js/extract.js:218`). That is why in "No diabetes, but her cholesterol was high at 47", the 47 goes to cholesterol.

### `condHits(low, parts)`: find illness words (lines 149-168)

Walks through `LEXICON` (`js/content.js:388`), one entry per condition.

- **Cancer** (`js/extract.js:152-159`): every cancer word counts. For each kind word from `CANCER_LEXICON` ("breast", `రొమ్ము`, "de mama"…), find the nearest cancer word; if it is within 40 characters, that cancer gets that kind. One cancer word can get several kinds. `new Set(...)` removes duplicates. Kind words alone ("breast") never create a hit; there must be a cancer word nearby.
- **Everything else** (`js/extract.js:161-165`): within each part, only the first matching word counts. So "sugar, diabetes" in one part makes one diabetes hit, not two.

Each hit looks like `{ kind: 'cond', cond: 'diabetes', type: '', at: 14, len: 5 }`.

### `findAnswers(text, ctx)`: putting it together (lines 171-241)

1. **Normalize and split into sentences** (`js/extract.js:173`):
   ```js
   const sentences = normalize(text).split(/(?<=[.!?।。！？۔؟\n])\s*/).map(s => s.trim()).filter(Boolean);
   ```
   The split pattern uses a lookbehind: "split at any spaces that come right after `.`, `!`, `?`, the Hindi `।`, Chinese `。`, Urdu `۔`, or a new line." Because it is a lookbehind, the punctuation stays with its sentence.

2. `parentStep` (`js/extract.js:174`) is true if this is a question about a parent (`mother_...` or `father_...`).

3. For each sentence:
   - Lowercase it and turn curly apostrophes into straight ones (`js/extract.js:177`), so "don’t" matches "don't".
   - Find cuts and numbers. Ages are numbers from 1 to 110; years are 1900 to the current year (`js/extract.js:179`).
   - **Split into segments** at commas, "but" and "and" (`js/extract.js:182-184`).
   - Find illness hits, death words, birth words, "alive" words (`js/extract.js:185-186`).
   - **Merge empty segments** (`js/extract.js:188-193`): a segment with no facts in it joins the next one. "My mother, father and brother had…" stays together. The `??=` operator means "assign only if it is null or undefined".
   - **Assign a person to each part** (`js/extract.js:196-203`). Each part is about whoever `aboutWhom` names. If it names no one, it keeps the person of the part before. For the first part of a sentence that starts with a pronoun ("He…", "She…", `ఆయన`…), it continues with whoever the last sentence was about (`lastPid`); otherwise it is about `ctx.subject`. Note that `ctx` has no `other` field, so `ctx['other']` is undefined and the person becomes `null`: things said about a relative the finder cannot place are dropped.
   - **Birth year** (`js/extract.js:208-211`): if a year was said, and either a birth word is present or this is the birth-year question.
   - **Negation** for every hit, then **deaths** that are not negated, keeping one per person (`js/extract.js:213-217`).
   - **Ages** (`js/extract.js:218-219`). A death with no age takes the first age after it ("Died of a stroke at 72": 72 is both).
   - **Build results** (`js/extract.js:221-234`). Each result is stored in the `found` Map under a key such as `cond|<person id>|diabetes|`. Using a key means saying the same thing twice gives one suggestion, and a later "yes" is not overwritten by a "no" (`js/extract.js:232`). For a death, the cause is the first non-negated condition for that person in the sentence, or else words after "from / of / due to" (`js/extract.js:226-228`).
   - **Still living** (`js/extract.js:237-238`).

4. Return all the values in `found` as an array.

### Trace 1: "My mother had sugar since she was 50, but no heart problems."

Context: the relative being interviewed (`W`) is answering about themself, step `conds_self`; their mother is `W-mom`.

| Stage | What the real code produced |
|---|---|
| normalize | unchanged (no special digits) |
| sentences | one sentence |
| `low` | `my mother had sugar since she was 50, but no heart problems.` |
| cuts (no "and") | `,` at 36 and `but` at 38 |
| numbers | `{"n":50,"at":34,"len":2}`. "since" is a `FOR_BEFORE` word, but no years word follows 50, so it is not a duration |
| segments | `my mother had sugar since she was 50` / ` ` (the space between the comma and "but") / ` no heart problems.` |
| hits | `heart problem` at 45 (matched with the plural "s"); `sugar` at 14 → diabetes |
| parts | the empty middle segment has no facts, so it joins the next: `my mother had sugar since she was 50` → **mother**; ` but no heart problems.` → `null`, so it keeps **mother** |
| negation | heart: the window starts after "but" (position 41), contains "no" one word before → **negated**. Diabetes: the window ends at the comma, no "no" → not negated |
| ages | 50 is 15 characters after "sugar" (ends at 19) → diabetes gets 50. Heart is negated, so it takes no age |

Final output:

```json
[
 { "kind": "cond", "pid": "W-mom", "cond": "heart", "type": "", "age": "", "said": "heart problem", "negated": true, "quote": "My mother had sugar since she was 50, but no heart problems." },
 { "kind": "cond", "pid": "W-mom", "cond": "diabetes", "type": "", "age": "50", "said": "sugar", "negated": false, "quote": "..." }
]
```

The app shows "Diabetes · age 50" ready to add, and the heart item marked "They may have said no". Note `said` is `heart problem`, not `heart problems`: the plural was accepted but the stored length is the list word's length (`len: hit.w.length` at `js/extract.js:164`).

### Trace 2: "మా అమ్మకి 47 లో షుగర్ వచ్చింది" ("My mother got sugar at 47")

Same context.

| Stage | Result |
|---|---|
| sentences | one (no full stop needed) |
| cuts | none |
| numbers | `{"n":47,"at":10,"len":2}`. Not a label; `లో` ("in/at") is not a years word, so not a duration |
| segments / parts | the whole sentence |
| who | tokens `మా`, `అమ్మకి`, `47`, `లో`, `షుగర్`, `వచ్చింది`. `అమ్మకి` starts with the stem `అమ్మ` and not with `అమ్మమ్మ` or `అమ్మాయి` → **mother** |
| hits | `షుగర్` at 16 → diabetes (the space before it is not a letter, so the start is OK) |
| negation | no `లేదు` after → not negated |
| ages | 47 is *before* the illness: distance (16 − 10) × 2 = 12, under 60 → diabetes gets 47 |

Output: `{ kind: 'cond', pid: 'W-mom', cond: 'diabetes', age: '47', said: 'షుగర్', negated: false }`. The same result came back when the code ran inside Chromium.

### Trace 3: the built-in demo, three Telugu sentences

The demo family in `js/app.js:21` has this transcript for the `mother_cond` step: "మా అమ్మకి 47 ఏళ్ళప్పుడు రొమ్ము క్యాన్సర్ వచ్చింది. తర్వాత థైరాయిడ్ కూడా వచ్చింది, అరవై లో. షుగర్ లేదు." ("My mother got breast cancer when she was 47. Later she also got thyroid, at sixty. No sugar.") Here `ctx.subject` and `ctx.mother` are both the mother.

1. Sentence 1: `47` followed by `ఏళ్ళప్పుడు` (a years word, but not "for/ago") → kept as age. `క్యాన్సర్` is a cancer word; `రొమ్ము` (breast) is within 40 characters → **cancer, breast, age 47**.
2. Sentence 2: `అరవై` = 60. `థైరాయిడ్` → thyroid. The 60 is in the next comma part, but ages are matched across the whole sentence, so 60 (16 characters after) goes to thyroid. No person is named and it does not start with a pronoun, so it is about `ctx.subject` (the mother) → **thyroid, age 60**.
3. Sentence 3: `షుగర్` followed by `లేదు` ("is not") → **diabetes, negated**.

### A few more real results

- "My mom has asthma and my dad has diabetes." → asthma for mom, diabetes for dad (the "and" cut gives each part its own person).
- "मेरी माँ को शुगर नहीं है।" → mother, diabetes, negated.
- "My father had sugar from about 50. He had a heart attack at 54, and he passed away at 61." (father step) → diabetes 50; heart 54; death at 61, cause "Heart disease or heart attack". "He" continues with the father.
- "My grandmother died of cancer at 70." → nothing (a relative the finder cannot place).

### The optional AI helpers (lines 244-308)

**`async` / `await` and Promises.** Some work takes time (a network request, a download). A **Promise** is an object that stands for a result that will arrive later. A function marked `async` can say `await somePromise`, which pauses that function (not the whole page) until the result is ready. If the Promise fails, `await` throws an error that `try/catch` can catch.

**`aiFindAnswers(text, ctx, people)`** (`js/extract.js:244-277`):
1. If the app is running inside Claude's artifact viewer, `window.claude.use('sample')` gives access to Claude (`js/extract.js:245`). If not, but a server address is set in `js/config.js`, it uses `serverFindAnswers` instead (`js/extract.js:246`). If neither, it throws `{ code: 'unavailable' }`, and `runFinder` falls back to the word lists.
2. It builds a **roster** of who the facts can be about, like `- "mother": Lakshmi` (`js/extract.js:248`).
3. It writes a prompt (`js/extract.js:249-265`) that lists the allowed condition ids and cancer types, asks for JSON only, and includes at most 6,000 characters of transcript (`text.slice(0, 6000)`).
4. It **checks everything that comes back** (`js/extract.js:268-276`): unknown people fall back to the subject; ages must be 1-110; unknown condition ids are dropped; cancer types must be in `CTYPE`. Each result is marked `ai: true`. This matters because an AI model can return something unexpected; the app never trusts its output blindly.

Note that, unlike `findAnswers`, the AI path does not return negated items; the prompt tells the model to ignore denied illnesses.

**`serverFindAnswers(text, people)`** (`js/extract.js:280-298`) does the same through the Heirloom server: it `POST`s JSON to `/api/extract` with up to 8,000 characters, using `fetch`, the browser's built-in way to make web requests. `res.json().catch(() => ({}))` means "if the reply is not valid JSON, use an empty object". The same checks are applied to the reply; ages may arrive as a number or as digits in a string (`js/extract.js:292`). On the server (`server/worker.js`), this runs a language model on Cloudflare Workers AI.

**`serverTranscribe(blob, lang)`** (`js/extract.js:300-308`) sends audio to `/api/transcribe` as a `FormData` (the same format a web form upload uses), with a file name like `answer.wav` taken from the audio type, and returns the text. It lives in `extract.js` but is used by `stt.js`.

Before any text or audio goes to the server, `js/app.js` asks the user's consent once (`needsConsent`, `js/app.js:260`).

---

## 3. `js/stt.js`: speech-to-text, the main-page side

### Purpose

Turn a recorded answer into text. Two choices, picked in a small dialog:
- **On this phone**: Whisper, an open speech-recognition model released by OpenAI, running inside the browser. Private; works offline after a one-time download.
- **With the Heirloom server**: the audio is sent to the server, which runs Whisper on Cloudflare.

### Settings (lines 6-12)

```js
const STT_MODELS = {
  base: { id: 'onnx-community/whisper-base', label: 'Quick', size: 'about 80 MB' },
  small: { id: 'onnx-community/whisper-small', label: 'More accurate', size: 'about 250 MB' },
};
```
(`js/stt.js:6-9`) Two Whisper sizes hosted on Hugging Face. Bigger is more accurate but slower and a larger download.

`WHISPER_LANG` (`js/stt.js:11`) maps the app's language codes to the English names Whisper expects (`te` → `'telugu'`). Telling Whisper the language helps it, especially for short clips.

`sttSupported` (`js/stt.js:12`) checks that the browser has `Worker` and `OfflineAudioContext`. If not, the "Turn into text" button is hidden (unless the server is available; see `js/app.js:216`).

### `decodeTo16k(blob)`: get the audio into Whisper's format (lines 15-24)

**Audio basics.** Digital sound is a long list of numbers called **samples**, each the position of the sound wave at one moment. The **sample rate** is how many samples per second: phones often record at 44,100 or 48,000 per second. Whisper was trained on **16,000 samples per second, one channel (mono)**, so audio must be converted. A **Blob** is the browser's object for a chunk of raw file data, like a recording.

**AudioContext and OfflineAudioContext** are parts of the browser's Web Audio API. `AudioContext` can decode compressed audio (WebM, MP4, etc.) into raw samples. `OfflineAudioContext` processes audio as fast as possible into memory instead of playing it through speakers.

Step by step:
1. `new Ctx()` creates an `AudioContext` (`window.webkitAudioContext` is the old name on some Safari versions) (`js/stt.js:16-17`).
2. `ctx.decodeAudioData(await blob.arrayBuffer())` turns the recording into raw samples. `finally { ctx.close?.(); }` closes the context whether decoding worked or not, since browsers limit how many can be open (`js/stt.js:19`). `?.()` means "call it only if it exists".
3. `new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * 16000)), 16000)` (`js/stt.js:20`) sets up 1 channel, enough samples for the whole clip, at 16,000 per second.
4. A "buffer source" plays the decoded audio into it (`js/stt.js:21-22`). When the source has more channels or a different rate, the browser mixes it down and **resamples** it automatically.
5. `startRendering()` produces the result; `getChannelData(0)` returns a `Float32Array` of samples between -1 and 1 (`js/stt.js:23`).

Checked in Chromium: a 2-second tone at 44,100 samples per second (88,200 samples) came out as a `Float32Array` of 32,000 samples, exactly 2 seconds at 16,000.

### `wavBlob(samples, rate)`: make a WAV file (lines 26-34)

**The WAV format** is one of the simplest audio files: a 44-byte **header** that describes the audio, then the raw samples. "16-bit PCM" means each sample is stored as a whole number from -32,768 to 32,767. Every speech service accepts it, which is why the server path uses it.

The code uses an `ArrayBuffer` (a block of raw bytes) and a `DataView` (a tool to write numbers into it at exact positions). The `true` at the end of each `set...` call means **little-endian** (low byte first), which WAV requires.

| Bytes | Written by | Meaning |
|---|---|---|
| 0-3 | `str(0, 'RIFF')` | file type marker |
| 4-7 | `v.setUint32(4, 36 + samples.length * 2, true)` | size of the rest of the file |
| 8-15 | `'WAVE'`, `'fmt '` | format marker, start of format section |
| 16-19 | `16` | the format section is 16 bytes |
| 20-21 | `1` | 1 = PCM (uncompressed) |
| 22-23 | `1` | 1 channel |
| 24-27 | `rate` | samples per second |
| 28-31 | `rate * 2` | bytes per second (2 bytes per sample) |
| 32-33 | `2` | bytes per sample frame |
| 34-35 | `16` | bits per sample |
| 36-43 | `'data'`, `samples.length * 2` | start of the sound data and its size |

Then (`js/stt.js:32`) each sample is clamped to -1..1 and multiplied by `0x7fff` (32,767). Real check in Node: samples `[0, 0.5, -1, 2]` became `[0, 16383, -32767, 32767]` in a 52-byte file (44 header + 4 × 2). The 2 was clamped to 1. The header read back as PCM, 1 channel, 16,000 Hz, 32,000 bytes per second, 16 bits.

### Web Workers and `postMessage`

JavaScript on a page runs on one main thread, which also draws the screen and handles taps. Running Whisper there would freeze the app for seconds or minutes. A **Web Worker** is a separate background thread with its own JavaScript. The page and the worker cannot share variables; they talk by sending messages: `worker.postMessage(data)` sends, and an `onmessage` handler receives. Data is normally copied. For large data, a **transfer list** moves ownership instead of copying (fast, but the sender can no longer use it).

### `sttWorker()`: start the worker once (lines 36-53)

```js
STT_WORKER = new Worker('js/stt-worker.js', { type: 'module' });
```
(`js/stt.js:40`) Creates the worker only the first time; later calls return the same one. `{ type: 'module' }` lets the worker use `import` (below).

`STT_JOBS` (`js/stt.js:37`) is a `Map` from a job id to `{ resolve, reject, onProgress }`. When a message comes back (`js/stt.js:41-47`), the id says which job it belongs to:
- `done` → remove the job and resolve its Promise with the text,
- `error` → remove the job and reject,
- anything else → a progress update.

If the worker itself crashes (for example, the library could not download while offline), `onerror` (`js/stt.js:48-51`) rejects every waiting job, clears the list and throws the worker away, so the next attempt starts fresh.

### `progressTracker(onText)` (lines 55-64)

Whisper's model is several files. Transformers.js reports progress per file (the code reads `status`, `file`, `loaded` and `total`). The tracker remembers the latest numbers for each file in a Map and adds them up into one percentage: "Downloading the speech model (one time only)… 42%". A `working` message shows "Listening to the recording…".

### `transcribeOnDevice(blob, lang, modelKey, onText)` (lines 65-72)

1. Decode and resample the audio (`await decodeTo16k(blob)`).
2. Make a job id with `uid('stt')` (from `js/family.js:10`).
3. Return a new Promise. Its `resolve` and `reject` functions are saved in `STT_JOBS`, so the worker's answer can finish it later. This is how a message-based worker is turned into something `transcribeClip` can simply `await`.
4. Send the job:
   ```js
   sttWorker().postMessage({ id, model: (STT_MODELS[modelKey] || STT_MODELS.base).id, audio, language: WHISPER_LANG[lang] || null }, [audio.buffer]);
   ```
   (`js/stt.js:70`) The second argument `[audio.buffer]` is the transfer list: the sample data moves to the worker without copying.

### `transcribeWithServer(blob, lang)` (line 73)

Decode to 16 kHz, wrap as WAV, send with `serverTranscribe` (in `extract.js`). Converting first means the server always gets the same simple, small format, whatever the phone recorded in.

### `sttChooserHTML(clipId)` (lines 75-88)

Builds the HTML for the choice dialog. The server option appears only if a server is configured (`cloudOn()`); the `data-action` attributes tell `js/app.js` which button was pressed (`stt-save` at `js/app.js:1217`).

---

## 4. `js/stt-worker.js`: the background worker

### ES modules and `import`

Unlike the other files, this one is an **ES module**. A module does not share globals; instead it pulls in exactly what it needs with `import`:

```js
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js';
```
(`js/stt-worker.js:5`) This loads **Transformers.js**, a library that runs AI models in the browser, from the jsDelivr CDN, pinned to version 4.3.0 so an update cannot silently change behavior. The service worker (`sw.js:22`) lists `cdn.jsdelivr.net`, so the library is cached for offline use. The model files themselves are cached by Transformers.js in the browser (the comment at `sw.js:19-21` says the service worker leaves them alone for that reason).

`env.allowLocalModels = false;` (`js/stt-worker.js:7`) tells the library not to look for models on this website, only on Hugging Face.

### One model, one job at a time (lines 9-10)

```js
let current = null; // { model, ready: Promise<pipeline> }
let queue = Promise.resolve();
```
`current` remembers which model is loaded (or loading). `queue` is a chain of Promises: each new job is attached to the end with `.then`, so jobs run one after another. A second recording waits instead of loading the model twice or running two at once, which could run out of memory on a phone.

### `pickDevice()` (lines 12-15)

```js
try { if (navigator.gpu && await navigator.gpu.requestAdapter()) return 'webgpu'; } catch {}
return 'wasm';
```
**WebGPU** lets web pages use the graphics chip for fast math. If the browser has it and a GPU adapter is available, use it. Otherwise use **WebAssembly** ("wasm"), which runs on the regular processor: slower but works almost everywhere.

### `load(model, id)` (lines 16-26)

1. If this model is already loaded or loading, return the same Promise (`js/stt-worker.js:17`).
2. Otherwise, pick a device and create an `'automatic-speech-recognition'` pipeline (`js/stt-worker.js:18`).
3. `dtype` (`js/stt-worker.js:20`) picks the number precision. On WebGPU, the encoder (which listens to the audio) uses full 32-bit numbers (`fp32`) and the decoder (which writes the words) uses 4-bit (`q4`). On wasm everything uses 8-bit (`q8`). Smaller numbers ("quantized") mean smaller downloads and faster running, at some cost in accuracy.
4. `progress_callback` sends each download update to the page with the job id.
5. If loading fails, `current` is cleared (`js/stt-worker.js:24`) so the next job tries again instead of reusing a failed load.

### `self.onmessage` (lines 28-40)

Inside a worker, `self` is the worker itself. For each job:

1. `queue = queue.then(async () => { ... })` adds the job to the end of the line.
2. Wait for the model, then tell the page `working`.
3. Run Whisper:
   ```js
   const out = await asr(audio, { language: language || null, task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
   ```
   (`js/stt-worker.js:34`) `task: 'transcribe'` means write what was said in the same language (Whisper can also translate to English). Whisper listens to 30 seconds at a time, so longer recordings are cut into 30-second **chunks** that overlap by 5 seconds (`stride_length_s`), and the pieces are joined. The overlap keeps words at the edges from being cut in half.
4. Send `done` with the trimmed text, or `error` with the message.

Because errors are caught inside each job, one failed job never breaks the `queue` chain for the next one.

---

## 5. Limitations (honest list)

**Answer finder.** All of these were checked by running the code:

- **It only knows its word lists.** "She has diabeetus." returns nothing. Hindi `सैंतालीस` (47) is not in `NUM_WORDS` (only tens like `चालीस` are), so "उन्हें सैंतालीस की उम्र में शुगर हुई।" gives diabetes with no age. Spoken numbers are mostly tens plus ones; hundreds are not handled.
- **Words, not meaning.** "Her sugar was fine." suggests diabetes. "She never stopped taking insulin." suggests diabetes marked as a possible "no", which is wrong.
- **Nearest number wins.** "My mother, who is 80, had diabetes." gives diabetes at age 80, though 80 is her current age.
- **Only mother, father and the speaker.** "My grandmother died of cancer at 70." produces nothing; the teen has to add it by hand on the right person.
- **Durations are skipped, not used.** "He has had diabetes for ten years" gives no age; the code does not subtract ten years from the current age.
- **Translations and word lists were drafted for this project** and need checking by fluent speakers (the README says the same).

These are why every result is only a suggestion, shown with the sentence and the matched words highlighted, and why negated items carry a warning.

**AI helpers.** They need a network connection and the server (or the Claude artifact viewer). Text is cut at 6,000 or 8,000 characters. A language model can still make mistakes; the code checks the shape of the answers, not whether they are true.

**Speech-to-text.** The first on-device use needs an 80 MB or 250 MB download. On older phones without WebGPU it can be slow. Whisper is less accurate for Telugu, Tamil and other languages with less training data (the app's own dialog recommends the larger model for them, `js/stt.js:83`), and it can mishear medical words or invent text in silence. The server option sends audio off the device (the server says it does not store it) and has a daily limit.

---

## Check your understanding

1. **Why does `findWord` treat "heart" in "heartburn" differently from "షుగర్" in "షుగర్‌తో"?**
   Latin-script words must be whole words (only a plural or `'s` may follow), because English and Spanish separate words with spaces. Telugu and other Indian scripts attach endings to words, so only the start must be a word start, as long as no virama glues the match into a longer word.

2. **In "No diabetes, but her cholesterol was high at 47", why does 47 go to cholesterol and not diabetes?**
   Diabetes is negated (the "no" is right before it), and only non-negated illnesses take ages (`js/extract.js:218`). Cholesterol is also the closest illness to 47.

3. **How does the finder know "10 సంవత్సరాలుగా" is not an age?**
   `isDuration` sees that the number is followed by a years word (`సంవత్సరా`) whose token ends with `గా` ("for"), which is in `FOR_AFTER`, so the number is a length of time and is dropped.

4. **Why does Whisper run in a Web Worker instead of on the page?**
   Running the model takes a lot of computing. On the main thread it would freeze the screen. In a worker it runs in the background, and the page gets progress and results through `postMessage`.

5. **Why does the app resample audio to 16,000 samples per second, mono?**
   That is the format Whisper was trained on. `decodeTo16k` uses an `OfflineAudioContext` to decode whatever the phone recorded and convert it, both for the on-device model and before making the WAV file for the server.
