# Heirloom Health, explained: 07 Large mode, tour, stories, export and server

This chapter covers five pieces that sit around the edges of the app:

| File | What it does |
|---|---|
| `js/elder.js` | Large tap-to-answer mode for grandparents, and recorded "question voices" |
| `js/tour.js` | The guided tour that highlights each feature |
| `js/stories.js` | Family stories: prompts, recordings, and a keepsake album file |
| `js/fhir.js` | The "Download for medical records" file in the HL7 FHIR format |
| `server/worker.js`, `server/wrangler.toml` | The optional Cloudflare server: AI answer-finding, speech-to-text, encrypted sync, feedback |

A reminder of how the app is built (chapter 00 has more): every file in `js/` is a **classic script**. They are loaded one after another by `<script>` tags in `index.html` and share **global** names. `S` is the open family (people, reports, settings). `render()` in `js/app.js` rebuilds the screen from `S`. One click listener in `app.js` reads the `data-action` attribute of whatever was tapped and decides what to do. The files in this chapter plug into that system: they provide render functions that return HTML text, and action handlers that `app.js` calls.

Line numbers below were checked against the code. If the code changes later, they may shift a little.

---

## Part 1: `js/elder.js`, large mode and question voices

### Purpose and fit

Many grandparents find a normal phone app hard to use: small text, many buttons, English only. Elder mode shows **one question per screen** with three huge buttons (Yes / No / Don't know) in the relative's language, and number pads instead of a keyboard. The second half of the file lets a fluent family member **record their own voice** reading each question, so "Listen" plays a real person instead of a robotic computer voice.

How it plugs in:
- `app.js` checks for elder mode at the start of drawing the page: `if (E && S) { $('#main').innerHTML = renderElder(); return; }` (`js/app.js:1065`).
- In the click handler, `app.js` asks elder mode first: `if (elderAction(a, b)) return;` (`js/app.js:1168`).
- Recorded voices are loaded with the other files when a profile opens (`js/app.js:119`).

### Text helpers (lines 6 to 13)

```js
const langInfo = id => LANGS.find(l => l.id === id) || LANGS[0];   // js/elder.js:6
```
`LANGS` (from `content.js`) lists the 11 languages, each with an `id` like `'te'`, a `label`, a `speech` code like `'te-IN'`, and sometimes a font and a text direction. `langInfo` finds one, falling back to English.

`langAttrs(id)` (lines 8 to 11) builds the HTML attributes that make text in any script display correctly: `lang="ur"`, `dir="rtl"` for Urdu (written right to left), a CSS class, and a font if the language needs one. **Why:** the `lang` attribute tells the browser and screen readers which language the text is in, so they choose the right font and pronunciation.

`say(obj, lang)` returns the text in that language, or English if missing. `sayRoman(obj, lang)` returns the "pronunciation line", stored under keys like `te_r` (Telugu written in English letters), or an empty string.

### Recorded question voices

#### The voice store (lines 16 to 21)

Every phrase the app can speak has a **key**: `q:` for an interview question, `f:` for a follow-up, `e:` for an elder-mode phrase, `c:` for a condition, `t:` for a cancer type, `s:` for a story prompt (comment at `js/elder.js:16`). A recording is saved under the id `lang|key`, for example `te|c:diabetes`.

```js
let VOICES = new Map();                                              // js/elder.js:17
```
A **Map** is a lookup table: give it a key, get a value. `loadVoices()` reads every saved recording from **IndexedDB** (the browser's on-device database for large files; the small `IDB` helper is in `js/app.js:164`) and builds the Map.

Concept: **Blob and object URL.** A *Blob* is a chunk of raw file data in memory, like an audio recording. An `<audio>` element can't play a Blob directly; it needs a URL. `URL.createObjectURL(blob)` makes a temporary URL like `blob:https://...` that points at the Blob. These URLs hold memory until released with `URL.revokeObjectURL`. That's why `loadVoices` starts by revoking the old ones (line 19) before making new ones (line 20).

#### `voicePhrases()` (lines 22 to 32)

Returns a list of groups (Interview questions, Follow-up questions, Tap-to-answer words, Illnesses, Kinds of cancer, Kinds of other illnesses, Family stories), each with `[key, textObject]` pairs. With today's content that is 135 phrases. Line 30 adds the stories group only `if (typeof STORY_PROMPTS !== 'undefined')`, a safety check in case `stories.js` isn't loaded.

#### Playing phrases: `stopSpeaking()` and `speakSeq()` (lines 33 to 50)

Concept: **Web Speech API.** Browsers have a built-in text-to-speech engine, `window.speechSynthesis`. You create a `SpeechSynthesisUtterance` (a piece of text to speak), set its language and speed, and call `speechSynthesis.speak(...)`. Which languages work depends on the device: many phones have no Telugu or Kannada voice at all. That gap is why recorded voices exist.

`stopSpeaking()` pauses any recording that is playing (`PLAYING`) and cancels any synthetic speech. It's wrapped in `try { } catch {}` so it can never crash.

`speakSeq(items, lang)` plays several phrases one after another. Elder mode often says two things, like "Did your mother ever have..." then "Diabetes". Step by step:

1. Stop whatever is playing (line 37).
2. For each `{ key, text }`, look for a recording under `lang|key` (line 40).
3. If there is one, play it and **wait until it ends**:
   ```js
   await new Promise(res => { const a = new Audio(v.url); PLAYING = a; a.onended = a.onerror = res; a.play().catch(res); });   // js/elder.js:42
   ```
   A **Promise** is a value that will be ready later; `await` pauses this function until it is. Here the Promise resolves when the audio ends, fails, or is blocked from starting, so the loop never gets stuck.
4. If there is no recording, use speech synthesis. Line 45 looks for a device voice whose language starts with the same two letters (for example `te`). Line 46 shows a helpful message and stops if the device has voices loaded but none in this language. If the voice list is still empty (some browsers load it late), it tries anyway, using only the `lang` setting.
5. Line 47 speaks at `rate = 0.85`, a little slower than normal, and waits for it to finish.

#### Recording a voice: `recordVoice(lang, key)` (lines 52 to 68)

Concept: **MediaRecorder.** `navigator.mediaDevices.getUserMedia({ audio: true })` asks permission to use the microphone and returns a live audio **stream**. A `MediaRecorder` turns the stream into a file. It hands over pieces of data (`ondataavailable`), and when you call `stop()`, it fires `onstop`, where you glue the pieces into one Blob.

Step by step:
1. If the browser lacks the microphone API or MediaRecorder, `throw 0` jumps to the `catch`, which explains what to do (line 55 and 67).
2. Ask for the microphone and create the recorder (lines 56 and 57).
3. Collect non-empty chunks (line 58).
4. When stopped (lines 59 to 65): turn off the microphone (`getTracks().forEach(t => t.stop())`, which also turns off the phone's "recording" indicator); build a record `{ id, lang, key, blob, created }`; save it to IndexedDB; replace any old version in the Map, revoking its URL; then clear `VREC` and redraw.
5. `VREC = { lang, key, mr }` remembers which phrase is being recorded so the screen can show a red Stop button for just that phrase (line 66). The Stop button's action in `app.js` calls `VREC?.mr.stop()` (`js/app.js:1239`).

`deleteVoice(id)` (line 69) removes a recording from IndexedDB and the Map, then redraws.

#### Voice packs: export and import (lines 71 to 90)

A voice pack is one JSON file with all recordings for one language, so a grandchild who records the Telugu voices can share them with a cousin's phone.

Concept: **base64 and data URIs.** JSON can only hold text, but audio is binary data. *Base64* is a way to write any binary data using only 64 safe characters (A to Z, a to z, 0 to 9, `+`, `/`). It makes the data about one third bigger. A *data URI* is a URL that contains the file itself: `data:audio/webm;base64,GkXfo59...`.

```js
const blobToB64 = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(b); });   // js/elder.js:72
```
`FileReader.readAsDataURL` turns a Blob into a data URI. Splitting on the comma and keeping part `[1]` keeps only the base64 part. `stories.js` reuses this same global function for albums.

`exportVoicePack(lang)` (lines 73 to 78): collect this language's recordings; stop with a message if there are none; build `{ kind: 'heirloom-voices', lang, voices: [{ key, type, data }] }`; save it with `saveFile` (`js/app.js:1009`), which downloads the file.

`importVoicePack(file)` (lines 79 to 90) does the reverse:
1. Read and parse the JSON.
2. Check `pack.kind === 'heirloom-voices'` so a random JSON file is refused (line 82).
3. For each voice, turn base64 back into a Blob with a neat trick: `fetch` a data URI (line 84). `fetch` normally downloads from the internet, but given a data URI it just decodes it.
4. Save each to IndexedDB, then reload the Map and redraw.

Any error, including bad JSON, lands in the `catch` with one friendly message.

**Limitation:** the import trusts the pack's `type` and `data`. A broken file shows the error message rather than crashing, but there's no size limit, so a huge pack could fill the phone's storage.

#### `renderVoices()` (lines 92 to 114)

Draws the Question voices screen: a language menu, a "Recorded 12 / 135" count, and every phrase with Play, Record/Redo/Stop and Delete. All Record buttons are `disabled` while any recording runs (line 110), so only one recording happens at a time.

### Elder mode

#### The state `E` (lines 117 to 120)

```js
let E = null;                                                         // js/elder.js:118
```
When elder mode is off, `E` is `null`. When on, it holds `{ who, i, lang, decade, contributor }`: the person answering, which card is showing, the language, the number pad's chosen decade, and whether this is a relative answering from an invite link. Later it also gains `moveT` (a timer), `no` and `unsure`.

`startElder` sets `E`, redraws and scrolls to the top. `exitElder` stops speech and sets `E` back to `null`.

#### The card list: `elderCards()` (lines 122 to 138)

Elder mode is a list of "cards" (screens). Instead of storing the list, the function builds it fresh each time from the content data:

1. `welcome` and `born` (birth year).
2. For each of three sections, `self`, `mother`, `father` (line 122):
   - For parents: `living` (still living?) and `deathAge`.
   - For each common condition (not `more`, not `free`): a `cond` card (Yes/No), then a `ctype` card if the condition has kinds (like type 1 or type 2 diabetes), then an `age` card (line 125 and 128).
   - One `more` card that shows all nine less common illnesses on one screen (line 130), followed by `ctype`/`age` cards for each of them.
   - `otherq`: "anything else?" (line 133).
3. A `check` card for each whole-family question except ancestry (line 135).
4. `thanks`.

With today's content the full list has 152 cards. **Why build so many?** Most are skipped (next section), so the elder only sees the ones that apply. Building the list from data means a new condition in `content.js` appears in elder mode automatically.

#### Who a card is about: `elderTarget(sect, create)` (lines 140 to 146)

For `self` it returns the person answering. For `mother` or `father` it looks them up on the tree. If they aren't on the tree and `create` is true, it adds them with `addRelative` and saves. **Why only on demand:** a "No" answer shouldn't add an empty mother to the tree; a "Yes, she had diabetes" needs somewhere to store it.

`elderReports(pid, cond)` (line 147) finds reports about that person and condition **said by the person answering** (`r.by === E.who`). Every answer in the app remembers who said it (chapter 04), and elder mode only touches its own answers.

#### Skipping: `elderSkip(card)` (lines 148 to 153)

- Skip `deathAge` unless the person is known to have died (`t.living !== 'no'`).
- Skip `age` and `ctype` unless there is a "Yes" report for that condition.
- Show everything else.

#### Moving and the double-tap guard (lines 154 to 166)

Older hands sometimes tap twice. If every tap moved to the next card, a double tap would skip a question. The fix:

```js
function elderAdvance(ms) {                                           // js/elder.js:155
  if (!E || E.moveT) return;
  E.moveT = setTimeout(() => { if (E) { E.moveT = null; elderMove(1); } }, ms);
}
```
After an answer, the app waits 200 or 250 milliseconds, then moves on. If a move is already waiting (`E.moveT` is set), a second tap changes nothing about moving. The short pause also lets the elder see their button light up before the screen changes.

`elderMove(dir)` (lines 159 to 166): cancel any waiting auto-move (so pressing Next by hand doesn't move twice), step `i` by `dir` (+1 or -1), keep stepping while the card should be skipped (but never past the first or last card), clamp `i` into range, reset the number pad, stop speech, redraw, and scroll to the top.

#### Listen: `elderListen()` (lines 167 to 183)

Builds the list of phrases for the current card and passes it to `speakSeq`. For a condition card it says two things: "Did [mother] ever have" (`e:had_mother`) and the condition name (`c:diabetes`). This is why phrases are recorded as separate pieces: one recording of "Diabetes" works for self, mother and father.

#### Number pad: `numberPad(kind, value)` (lines 185 to 194)

Typing "72" on a phone keyboard is hard for many elders. The pad takes two taps:
1. If no decade is chosen yet, show ten decade buttons. For ages: 0–9, 10s, 20s ... 90s. For birth years: 1920s to 2010s, leaving out decades after the current year (`d <= YEAR`).
2. After a decade is chosen, show its ten numbers, a wide "Not sure" button and a Back button. "Not sure" picks the middle of the decade (`E.decade + 5`, line 192). Both sides of that line's `? :` give the same value, so the condition there does nothing.

**Limitations:** ages stop at 99. "Not sure" saves a guessed number (like 45) that looks exact in the report; nothing marks it as approximate.

#### Drawing a card: `renderElder()` (lines 195 to 239)

Two small helpers do most of the work:
- `big(obj)` (line 198): the question in large text, plus the pronunciation line if turned on.
- `yn(state, action)` (lines 199 and 200): the Yes / No / Don't know buttons. `aria-pressed="${state === v}"` marks the chosen one, which both styles it and tells screen readers it's selected.

Then a long `if / else if` picks the body for each kind of card. On a `cond` card, line 208 works out the current answer ("yes" if a report exists, else "no" or "unknown" from `E.no` / `E.unsure`). Non-English cards also show the English name in small text (line 210), so a teen who can't read the script knows what's on screen. The `thanks` card shows "Send back" for a relative answering from an invite link, or "Back to the interview".

Line 228 computes the progress bar: `Math.round(E.i / (cards.length - 1) * 100)`. Because it counts all 152 cards, including skipped ones, the bar jumps forward in uneven steps.

#### Handling taps: `elderAction(a, b)` (lines 241 to 289)

`a` is the action name; `b` is the button. It returns `true` if it handled the tap. The cases:

- `elder-next`, `elder-prev`, `elder-listen`, `elder-exit`: simple.
- `e-living` (line 249): create the parent if needed, store `'yes'`, `'no'` or `'unknown'`, save, auto-advance.
- `e-cond` (lines 250 to 257): remember No/Don't know in `E.no` / `E.unsure`. On Yes, add a report (if there isn't one). On No or Don't know, remove this elder's reports for it, and record the deletion with `noteDeleted` (from `share.js`) so family sync also deletes it on other phones. Then save and auto-advance.
- `e-ctype` (lines 258 to 265): kinds are **toggles**, and several can be chosen (someone could have had two cancers). Tapping a chosen kind removes it. Tapping a new kind fills in an existing "kind unknown" report if there is one, or adds a new one. Line 263 makes sure at least one report remains, so un-tapping every kind still leaves "had cancer, kind unknown". No auto-advance, since the elder may tap several.
- `e-more` (lines 266 to 271): toggles one of the less common illnesses.
- `e-otherq` (lines 272 to 277): a Yes adds an `other` report with no name. The regular interview then reminds the teen to ask what it was.
- `e-check` (line 278): stores the whole-family answer on the person in `W.checks`.
- `pad-decade` and `pad-pick` (lines 279 to 286): pick a decade, then a number. The number becomes the birth year, the death age, or the age on **all** this elder's reports for that condition.

**Limitations worth knowing:**
- "No" and "Don't know" are kept only in `E`, which disappears when you exit. They're not saved as data, so returning later shows those questions unanswered. Only "Yes" leaves a record. (In the risk logic, a missing answer and a "no" are both treated as "not reported".)
- Elder mode asks about the person, their mother and father only, not siblings or grandparents. The regular interview covers the rest.

---

## Part 2: `js/tour.js`, the guided tour

### Purpose and fit

The tour opens the first time a profile is used and walks through 22 steps on all four tabs, highlighting the button or panel each step talks about. It starts by itself through `app.js` (`if (!S.toured) { TOUR_I = 0; S.tab = 'tree'; }`, `js/app.js:113`) and from Menu → Take the tour.

The key connection: `render()` in `app.js` is `function render() { renderApp(); applyTour(); }` (`js/app.js:1045`). So **after every redraw**, the tour redraws its card and highlight. That matters because `render()` replaces the page's HTML, which would wipe out a highlight added earlier.

### The steps data: `TOUR` (lines 5 to 32)

Each step is an object such as:
```js
{ tab: 'interview', sel: ['[data-action="elder-start"]'], title: 'Let grandparents answer on their own', text: "..." },   // js/tour.js:21
```
- `tab`: which tab to show.
- `sel`: a list of **CSS selectors** (patterns that find elements, like `#tree-svg` for the element with id `tree-svg`, or `[data-action="find"]` for the element with that attribute). The first one that is found and visible gets highlighted. Having fallbacks matters because the page looks different on a phone, a laptop, or with an empty family.
- `step` (optional): which interview question to open, so the recording and Find buttons exist.

### State and when the tour is "on" (lines 34 and 35)

`TOUR_I` is the current step number, or `null` when the tour is off. `tourOn()` is true only if a step is set, a family is open, elder mode is off, the page isn't a read-only doctor view or a relative's answer page, and the Terms page isn't open. The tour never covers screens where it would make no sense.

### Starting, ending, showing a step (lines 37 to 54)

- `startTour()`: go to step 0, close any pop-up, Question voices or Family stories, and show the step.
- `endTour()`: set `TOUR_I = null`, and the first time, save `S.toured = true` so it doesn't start again by itself.
- `showTourStep()`: switch to the step's tab, open the step's interview question if it names one (line 52), then `render()`.

(Two older lines that handled `step.relative` and `step.capture` were removed after this review found that no step used them any more.)

### Drawing the card: `applyTour()` (lines 56 to 75)

1. Remove the `tour-target` class from anything highlighted before (line 57).
2. If the tour is off, remove the card and stop (line 59).
3. Make the `#tour-root` container if it doesn't exist yet (line 60).
4. Find the target:
   ```js
   const target = (step.sel || []).map(s => document.querySelector(s)).find(el => el && el.offsetParent !== null);   // js/tour.js:63
   ```
   `offsetParent` is `null` when an element is hidden (`display: none`), so this skips hidden matches. (It's also `null` for `position: fixed` elements, so a fixed element can't be a target; the steps use fallbacks for this.)
5. Write the card's HTML: "3 of 22", Skip, a progress bar, the title and text, Back and Next. If there is no target, the card gets the class `center` and sits in the middle of the screen.
6. Add the `tour-target` class (CSS draws the highlight) and call `placeTour`.
7. Move keyboard focus to the Next button with `preventScroll: true`, so pressing Enter moves on without the page jumping.

The text goes through `esc()`, which turns characters like `<` into safe codes so text can't be mistaken for HTML.

### Placing the card: `placeTour(card, target)` (lines 76 to 111)

This is the most mathematical part of the tour. The goal: **the card must never cover the thing it is talking about**, and on phones it must not cover the tab bar at the bottom.

Concept: **`getBoundingClientRect()` and scrolling.** `el.getBoundingClientRect()` returns where an element is on the screen right now: `top`, `bottom`, `left`, `right`, `height`, in pixels from the top-left corner of the visible window (not the page). `window.scrollBy(0, dy)` scrolls the page down by `dy` pixels (up if negative). After scrolling by `dy`, an element's `top` becomes about `top - dy`. The browser won't scroll past the top or bottom of the page, so sometimes the scroll is smaller than asked.

The card is `position: fixed` (`index.html` CSS), normally at the bottom right. With the class `at-top` it sits at the top instead.

Step by step:

1. **Measure** (lines 79 to 84). `phone` is true for screens 860 pixels wide or less. On phones, measure the tab bar (`.side`) and how tall it is (`navH`), then set the card's `bottom` so it sits 10 pixels above the bar. Read the card's height `h` and width `w`.
2. **Free bands** (line 86). For each card position, the "band" is the strip of screen not covered by the card:
   - Card at the bottom: free from `gap` (16px) down to just above the card.
   - Card at the top: free from just below the card down to just above the tab bar.
3. **`covers(r)`** (lines 87 to 92): how many pixels of the target are visible on screen but outside the free band, meaning hidden under the card. On a wide screen, if the target ends to the left of the card, it returns 0 because they are side by side.
4. **`fit(side)`** (lines 93 to 100): put the card on that side, then scroll so the target is centered in the free band. If the target is taller than the band, line up its top with the top of the band instead (line 98). Return how much is still covered.
5. **Wide screens** (lines 102 to 106): if the target fits entirely to the left of the card, just scroll it to the vertical middle and stop.
6. **Otherwise** (lines 107 to 110): try the bottom. If something is still covered (often because the page can't scroll far enough, for example a target near the very bottom of the page), remember the scroll position and the amount covered, then try the top. If the top is no better, go back to the bottom position and the saved scroll.

**Why this design:** where a target ends up depends on screen size, family size and language. Measuring after drawing, and switching sides only when it actually helps, works for any layout.

**Limitations:** a target taller than the free band will be partly covered no matter what. If the user scrolls by hand afterwards, the card doesn't move until the next redraw.

### Resize and keyboard (lines 112 to 128)

- On window resize, wait until 150 ms after the last resize event, then redo `applyTour` (lines 112 and 113). This **debounce** avoids recalculating dozens of times while a window is dragged.
- Clicks on `[data-tour]` buttons are handled in a listener registered with `true` as the third argument (line 122), the **capture** phase. That means it runs *before* the app's normal click listener. `start` also calls `stopPropagation()` so the app doesn't treat the same click as something else.
- Keys (lines 123 to 128): Escape ends the tour; the right and left arrows move between steps. The listener ignores keys typed into inputs, text areas and menus, and ignores them while a pop-up is open.

---

## Part 3: `js/stories.js`, family stories

### Purpose and fit

Health questions are only part of what's worth asking grandparents. This file adds 12 prompts about their lives (growing up, parents' names, how they met, recipes, festivals, songs, advice), lets the teen record answers and type memories, and saves an **album**: one HTML file that plays the recordings offline and prints.

Privacy design: stories stay on the device. The comment at the top says they are left out of doctor reports, PDFs, links, backup codes and sync (lines 3 to 5). The tool for that is `withoutStories(p)` (line 85), which returns a copy of a person without the `stories` field. Other files (mainly `share.js`) call it when data leaves the device.

`stories.js` loads after `content.js` and **before** `languages.js` (`index.html` lines 579 to 581), because `languages.js` adds the seven extra languages' text to these prompts.

### Prompts (lines 11 to 73)

Each prompt has an `id`, an English `title`, and the question in each language, with a pronunciation line (`te_r`, `hi_r`) where the script isn't Latin letters. `STORY` (line 73) turns the list into a lookup table by id.

### Data helpers (lines 76 to 87)

Stories reuse the interview's audio clip system (`CLIPS` and `addClip` in `app.js`). A story recording is a clip whose `step` is the text `'story:food'` instead of an interview question number.
- `storyStep(id)` builds that text; `isStoryClip(c)` checks for it; `storyIdOf(c)` reads the id back (`slice(6)` drops the 6 letters of `story:`).
- `storyClips(pid, id)`: one person's story clips, optionally for one prompt.
- `storyText(p, id)`: the typed memory, stored on the person as `p.stories[id]`.
- `storyDone`: a prompt counts as done if it has text or a recording. `storyCount` and `hasStories` build on it.
- `storyClipLabel(c)`: a label like "Story: Food from home" for clip lists elsewhere.

### Screens (lines 90 to 187)

- `storiesCard(W)` is the button on the Interview tab; `storiesPeople()` lists living relatives other than you; `storiesTop(view)` draws the heading and the Prompts / Album switch.
- `renderStories()` (lines 97 to 141) draws one card per prompt: the question with a Listen button and an English gloss, Record (or Stop with a timer), "Add audio file" for phones where in-browser recording doesn't work, the recordings, and a text box.
- `albumPerson()` and `renderAlbum()` (lines 157 to 187) choose whose album to show (the chosen relative first, then anyone with stories; `new Set` removes repeats) and show their finished stories, the audio size in MB, and Save album.

### Building the album file: `buildAlbum(pid)` (lines 190 to 243)

The album is a complete web page written as one long string. Step by step:
1. For each prompt the person has done (lines 198 and 199):
2. Turn each recording into a data URI and put it in an `<audio>` tag:
   ```js
   audio.push(`<figure><audio controls preload="none" src="data:${esc(type)};base64,${await blobToB64(c.blob)}"></audio>...`);   // js/stories.js:203
   ```
   `preload="none"` stops the browser from decoding every recording when the page opens.
3. Add the English question, the question in the interview language, and the typed memory split into paragraphs (`paras`, line 196).
4. Wrap everything in a page with its own CSS (lines 210 to 242): a book-like serif font, a header with the name and birth year, and a footer. The `@media print` rules hide audio players and write "Audio recording ·" in front of each caption, so a printed copy still makes sense.

**Why one self-contained file:** it needs no app, no internet and no account to open, decades from now. Any browser can play it. That fits the "heirloom" idea.

### Saving: `saveAlbum(pid)` (lines 244 to 257)

1. Add up the size of the recordings. Above 60 MB (`ALBUM_WARN_BYTES`, line 190), ask before continuing. The estimate multiplies by 1.37 because base64 makes data about a third bigger, plus some room for the rest of the page.
2. Set `S.albumBusy` and redraw, so the button says "Building the album…".
3. Build it and save it as `family-stories-<name>.html`.
4. `finally` always clears the busy flag, even if something failed. An error with `code: 'declined'` (the user cancelled the save) shows no message.

**Limitations:** the file name keeps only English letters and digits, so a name written only in Telugu script becomes `family-stories-relative.html`. Large albums are slow to open on phones, and the whole file is built in memory at once.

### Events (lines 259 to 288)

- `storiesAction(a, b)`: open and close the page, switch views, choose an album person, save, listen (through `speakSeq`, with the key `s:<id>` so recorded story voices work), and record (through `startRec` in `app.js`, with the step `story:<id>`).
- An `input` listener (lines 275 to 282) saves typed memories **as you type**, cut to 20,000 characters, and deletes empty ones. It only reacts to text boxes carrying `data-story-id` and `data-story-pid`, so it doesn't interfere with `app.js`'s own listeners.
- A `change` listener (lines 283 to 288) handles "Add audio file" and clears the input so the same file can be picked again.

---

## Part 4: `js/fhir.js`, the medical-records export

### What FHIR is

Clinic record systems (Epic, Cerner and others) don't read PDFs as data. They exchange information in standard formats. **HL7 FHIR** (Fast Healthcare Interoperability Resources, said "fire") is the current main standard. **R4** is the version most widely used. FHIR describes health information as **resources**: JSON objects of known types, such as `Patient` or `Observation`, with set field names.

Three ideas you need:
- **Resource:** one JSON object with a `resourceType`. This file uses `Bundle`, `Patient`, `FamilyMemberHistory` and `Observation`.
- **Bundle:** a resource that holds a list of other resources in `entry`. This export is a Bundle of type `collection`, meaning "just a set of resources", not an instruction to change anything.
- **Coding:** a code from a published **code system**, so computers agree on meaning. A `CodeableConcept` looks like `{ coding: [{ system, code, display }], text }`. `system` is a URL naming the code list; `code` is the official code; `display` is its official name; `text` is the plain-words version.

The code systems used here (lines 11 to 14):
- **SNOMED CT** (`http://snomed.info/sct`): a huge medical vocabulary. `44054006` means "Diabetes mellitus type 2".
- **HL7 v3 RoleCode** (`.../v3-RoleCode`): family relationship codes like `MGRMTH` (maternal grandmother).
- **Administrative gender** (`.../administrative-gender`): `male`, `female`, `unknown`.
- **UCUM** (`http://unitsofmeasure.org`): units of measure. Code `a` means years (from the Latin *annus*).

### SNOMED codes: `FHIR_SNOMED` (lines 16 to 52)

A table from the app's condition and kind to `[code, display]`. The `''` key means "kind unknown":
```js
diabetes: { '': ['73211009', 'Diabetes mellitus (disorder)'], t2: ['44054006', 'Diabetes mellitus type 2 (disorder)'], ...   // js/fhir.js:23
```
The comment at the top says these codes were checked against published value sets. Some conditions and kinds have no entry on purpose, for example dementia, osteoporosis, polycystic kidneys, depression and the whole "blood disorder, kind unknown". A **missing entry means text only** (line 8). Sending a near-match code would be worse than sending none, because the receiving system would trust it.

### Small helpers (lines 54 to 58)

- `fhirUuid()`: a random unique id. It uses `crypto.randomUUID()` when available, otherwise builds one from `Math.random()` in the same pattern.
- `fhirYear(s)`: accepts only `YYYY`, `YYYY-MM` or `YYYY-MM-DD` (the date formats FHIR allows), otherwise `null`. "around 1950" is dropped instead of producing an invalid file.
- `fhirAge(n)`: `{ value: n, unit: 'a', system: UCUM, code: 'a' }`, an age in years.
- `fhirGender`: the app's `M`/`F`/`U` to FHIR's words.
- `fhirText`: turns anything into trimmed text.

### Relationship codes: `fhirRelationship(p)` (lines 61 to 106)

This picks the most specific RoleCode. It uses `kin(p.id)` from `family.js` (chapter 03), which counts generations from you up to the nearest shared ancestor (`dS`) and from that ancestor down to the relative (`dX`).

For **blood relatives** (lines 65 to 75):
- `dX === 0` means the relative *is* your ancestor: 1 generation is a parent (`NMTH`, `NFTH`), 2 is a grandparent, with maternal or paternal side when known (`MGRMTH`, `PGRFTH`...), 3 is a great-grandparent.
- `dS === 0` means they descend from you: child or grandchild.
- `dS === 1 && dX === 1`: sibling, full (`NSIS`) or half (`HSIS`).
- `dS === 2 && dX === 1`: aunt or uncle, with side.
- `dS === 1 && dX === 2`: niece or nephew.
- Both 2 or more: cousin, with side.
- Anything else: `EXT`, "extended family member".

Small helpers pick by sex (`sx(f, m, u)`) and side (`side(mat, pat, none)`).

For **non-blood relatives** (lines 76 to 91) it checks, in order: spouse, adoptive parent, adopted child, step-parent, step-child, step-sibling, parent-in-law, child-in-law, sibling-in-law, and otherwise `FAMMEMB` ("family member").

The `DISPLAY` table (lines 92 to 104) gives each code its official display name. The result also includes the app's own label as `text`, for example "First cousin, Dad's side".

### Condition codes and cause of death (lines 108 to 131)

`fhirConditionCode(f)` returns a coded concept if `FHIR_SNOMED` has the condition and kind, otherwise text only. "Something else" conditions are always text only.

`fhirCauseFacts(cause, fs)` decides which recorded conditions the family's "cause of death" refers to, so it can mark them `contributedToDeath`. It tries two ways:
1. The answer finder's word matcher `condHits` from `extract.js`, if loaded (line 120). This understands everyday words in several languages.
2. Plain text matching against the condition's names (lines 126 to 129), only for names of 4 or more letters, to avoid false matches on tiny words.

When a death cause matches nothing, the note says so (line 152), instead of guessing.

### One relative: `fhirFamilyMember(p, patientRef, when)` (lines 135 to 168)

Builds one `FamilyMemberHistory`:
1. `status: 'completed'`, a link back to the Patient (`patient: { reference }`), and the date.
2. Name (if any), relationship, sex.
3. `bornDate` if the birth year is valid.
4. Death: `deceasedAge` if a death age is known, else `deceasedBoolean: true`. Living: `deceasedBoolean: false`. Unknown: nothing.
5. Notes (lines 147 to 154): where the data came from, who reported it, the cause of death in the family's words, and typed interview notes.
6. Conditions (lines 156 to 166): each with its code, `contributedToDeath` if it matched, `onsetAge` (age at diagnosis) in UCUM years, and a note listing who reported it, at what age and in what words. When relatives gave ages 3 or more years apart, the note says so and explains that the **earliest** age is used (the cautious choice, from `facts()` in `risk.js`).

### A concrete example

Here is a real output, made by running the app's own code on a tiny family: you (Asha), your mother Priya, and Priya's mother Lakshmi, born 1948, who died at 79 of a "heart attack". Priya reported that Lakshmi had type 2 diabetes at 50 (she called it "sugar") and a heart attack at 72. The ids are random and shortened here; Lakshmi's entry is:

```json
{
  "fullUrl": "urn:uuid:7732...",
  "resource": {
    "resourceType": "FamilyMemberHistory",
    "id": "7732...",
    "status": "completed",
    "patient": { "reference": "urn:uuid:879d..." },
    "date": "2026-10-27",
    "name": "Lakshmi",
    "relationship": {
      "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode", "code": "MGRMTH", "display": "maternal grandmother" }],
      "text": "Maternal grandmother"
    },
    "sex": { "coding": [{ "system": "http://hl7.org/fhir/administrative-gender", "code": "female", "display": "Female" }] },
    "bornDate": "1948",
    "deceasedAge": { "value": 79, "unit": "a", "system": "http://unitsofmeasure.org", "code": "a" },
    "note": [
      { "text": "Family-reported history collected with Heirloom Health. Relationship: Maternal grandmother (Mom's mom)." },
      { "text": "Conditions reported by: Priya (mother)." },
      { "text": "Cause of death as reported by the family: heart attack." }
    ],
    "condition": [
      {
        "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "414545008", "display": "Ischemic heart disease (disorder)" }], "text": "Heart attack or blocked arteries" },
        "contributedToDeath": true,
        "onsetAge": { "value": 72, "unit": "a", "system": "http://unitsofmeasure.org", "code": "a" },
        "note": [{ "text": "Reported by Priya (mother), age 72." }]
      },
      {
        "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "44054006", "display": "Diabetes mellitus type 2 (disorder)" }], "text": "Type 2 diabetes" },
        "onsetAge": { "value": 50, "unit": "a", "system": "http://unitsofmeasure.org", "code": "a" },
        "note": [{ "text": "Reported by Priya (mother), age 50, in their words \"sugar\"." }]
      }
    ]
  }
}
```

How each part was made: `kin` found Lakshmi two generations up on your mother's side, so `dX === 0`, `dS === 2`, maternal, female, which gives `MGRMTH`. Her death age became `deceasedAge`. "heart attack" matched the heart attack condition, so it got `contributedToDeath: true`. The heart condition comes first because `facts()` sorts conditions in the app's list order.

### The whole file: `fhirBundle()` (lines 173 to 198)

1. `when`: the current time in ISO format without milliseconds (line 174).
2. A `Patient` for you: name, gender, birth date.
3. One `FamilyMemberHistory` per relative, skipping empty placeholders (`fhirHasInfo`, line 171). The tree often has blank boxes for unknown parents, and they'd be noise in a medical record.
4. `Observation` resources (line 185) for whole-family answers (genetic tests, sudden deaths, and so on), each with `status: 'final'`, the question as `code.text`, and the answer as `valueString`; one for ancestry; one for your own interview notes.
5. Wrap them in a `Bundle` of type `collection`.

Each entry has `fullUrl: 'urn:uuid:<id>'`. A `urn:uuid:` is a way to name something without a web address. Relatives point to the patient with that same name, which is how FHIR links resources inside one Bundle.

`exportFHIR()` (lines 200 to 208) turns the Bundle into indented JSON with the media type `application/fhir+json` and saves it as `family-history-<name>.fhir.json`.

### Limitations

- The file hasn't been tested against a real hospital's import. Whether a clinic system accepts it depends on that system.
- Observations have only plain text (`code.text`), no standard LOINC codes, so a computer can display them but not understand them.
- The Patient's full name is put in `given` (first name) too, because the app stores one name field.
- Conditions without an exact SNOMED code are text only.
- It's family-reported history, and the notes say so; it's not verified medical data.

---

## Part 5: `server/worker.js` and `server/wrangler.toml`, the server

### Purpose and fit

The app works without any server. The server adds four optional features (`server/README.md`): **Find with AI**, **server speech-to-text**, **encrypted family sync**, and **feedback**. The app finds it through `CONFIG.apiBase` in `js/config.js`.

Concepts first:

- **Serverless function.** Instead of renting a computer that runs all the time, you upload one function. The provider (here Cloudflare) runs it when a request arrives, close to the user, and you pay nothing within the free allowance. A **Cloudflare Worker** is such a function. Its whole entry point is an object with a `fetch(request, env)` method (`server/worker.js:19` and `:20`).
- **HTTP methods and status codes.** Every web request has a *method*: `GET` (read), `POST` (send data to be processed), `PUT` (store this at this address), `OPTIONS` (ask what's allowed). Every response has a *status code*: 200 OK, 204 OK with no content, 400 bad request, 403 forbidden, 404 not found, 405 method not allowed, 413 too large, 422 can't process, 429 too many requests, 500 server error, 502 a service behind the server failed, 503 service unavailable.
- **Environment variables and secrets.** `env` holds settings and connections given to the Worker from outside the code: plain settings from `[vars]` in `wrangler.toml`, connections ("bindings") to Cloudflare services, and **secrets** like API keys. Secrets are set with `npx wrangler secret put` and never written in a file, so they don't end up on GitHub.

### `wrangler.toml`, the configuration

`wrangler` is Cloudflare's command-line tool; this file tells it how to deploy.
- `name`, `main = "worker.js"`, `compatibility_date` (which version of Cloudflare's runtime behavior to use), and `compatibility_flags = ["nodejs_compat"]`, which turns on support for Node.js features that some npm packages, like the Anthropic SDK, rely on.
- `workers_dev = true`: give it a free `*.workers.dev` address.
- `[vars]` (lines 10 to 19): `ALLOWED_ORIGINS` (the websites allowed to call the server), the free model names, the OpenAI model name, and `GITHUB_REPO`. These are not secret.
- `[ai] binding = "AI"`: makes Workers AI available as `env.AI`.
- `[[kv_namespaces]] binding = "FAMILY"`: makes a KV store available as `env.FAMILY`.
- `[[ratelimits]]`: two rate limiters, `LIMITER` (20 requests a minute) and `FEEDBACK_LIMITER` (3 a minute).
- The comment at the end lists the optional secrets: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`.

Concept: **KV store.** *Key-value* storage is like one giant Map stored in the cloud: `put(key, value)`, `get(key)`. Cloudflare KV is fast to read, allows values to expire automatically (`expirationTtl`, in seconds), and its free plan allows about 1,000 writes a day. It is not a full database: no searching inside values, and changes can take a little while to show up everywhere.

### Limits at the top (lines 14 to 17)

8,000 characters of transcript, 10 MB of audio, 900 KB per family, and 40 AI requests per hour per visitor for the backup counter.

### Routing and errors: `fetch(request, env)` (lines 19 to 37)

1. Work out the CORS headers for this request (line 21).
2. `OPTIONS` requests get an empty answer: 204 if the website is allowed, 403 if not (line 22).
3. Any other request from a website not on the list gets 403 (line 23).
4. Match the path and method:
   ```js
   if (url.pathname === '/api/extract' && request.method === 'POST') return withCors(await extract(request, env), cors);   // server/worker.js:26
   ```
   The same pattern handles `/api/transcribe` and `/api/feedback`. `/api/family/<id>` uses a **regular expression** (a text pattern): `^\/api\/family\/([A-Za-z0-9_-]{16,80})$` means "exactly this path, followed by 16 to 80 letters, digits, `_` or `-`" (line 29). The part in parentheses is captured as the id.
5. Anything else: 404.
6. The whole thing is inside `try { } catch`. Any unexpected error is logged and becomes a polite 500 message, still with CORS headers so the app can read it (lines 32 to 35).

### CORS: `corsHeaders` and `withCors` (lines 234 to 240)

Concept: **CORS** (Cross-Origin Resource Sharing). Browsers protect users by refusing to let a page on one website read responses from another website, unless that other website says it's fine. The app lives on GitHub Pages; the server lives on `workers.dev`. Different **origins**, so the server must answer with headers like `access-control-allow-origin: https://...github.io`. For requests that send JSON, the browser first sends a **preflight** `OPTIONS` request to ask permission.

`corsHeaders` reads the request's `origin` header and returns headers only if that origin is in `ALLOWED_ORIGINS`; otherwise `null`. It allows `GET, PUT, POST, OPTIONS`, the `content-type` header, and lets browsers remember the answer for a day (`access-control-max-age: 86400` seconds). `vary: origin` tells caches that the answer depends on the origin.

`withCors` copies a response and adds those headers. `json(data, status)` makes a JSON response.

**Honest limitation:** CORS only restrains *browsers*. A script outside a browser can send any `origin` header it likes. So the allowed-origins list stops other websites from using your server from their pages, but it is not a password. The rate limits are the real protection against overuse.

### Rate limiting: `allow(request, env, bucket, limit)` (lines 242 to 254)

1. Identify the visitor by IP address. Cloudflare puts it in the `cf-connecting-ip` header (line 245).
2. If a Cloudflare rate limiter is bound, ask it: `limiter.limit({ key: 'ai:<ip>' })` returns `{ success }` (line 247). If the limiter itself fails, the code allows the request ("fail open"), so a Cloudflare hiccup doesn't break the app.
3. Otherwise, fall back to a counter in KV, one per visitor per hour. `Math.floor(Date.now() / 3600000)` is the number of hours since 1970, so the key changes every hour. The counter expires after 3,700 seconds so old ones clean themselves up.

**Limitations:** the error message now says "Please wait a minute and try again", matching the per-minute limiter in the default config (an earlier version wrongly said "in an hour"). The KV counter isn't exact: two requests at the same moment can both read the same number. Visitors behind one school network share an IP and so share a limit. `GET` on a family isn't limited at all.

### Find with AI: a request traced from start to finish

Here is what happens when a teen types what Grandma said and taps **Find with AI**.

**In the browser:**
1. The button has `data-action="find-ai"` (`js/app.js:552`), so the click handler runs `runFinder(true)` (`js/app.js:1181`).
2. `runFinder` first checks permission: the user must agree before any text is sent to an AI (`js/app.js:287`).
3. `aiFindAnswers` (`js/extract.js:244`) sees there's no built-in Claude helper, but there is a server address, so it calls `serverFindAnswers` (`js/extract.js:246`).
4. `serverFindAnswers` (`js/extract.js:280`) sends:
   ```js
   const res = await fetch(`${CONFIG.apiBase}/api/extract`, {        // js/extract.js:282
     method: 'POST', headers: { 'content-type': 'application/json' },
   ```
   with a body like `{ "text": "My mother had sugar from 50...", "people": [{ "role": "subject", "name": "Lakshmi" }, ...], "conditions": ["heart", "stroke", ...], "cancerTypes": [...] }`.
5. Because this is JSON sent to another origin, the browser first sends an `OPTIONS` preflight. The Worker answers 204 with CORS headers, and the browser sends the real `POST`.

**In the Worker:**
6. `fetch` finds the origin allowed and routes to `extract` (line 26).
7. `extract` (lines 65 to 126) checks that some AI is set up (else 503), then calls `allow(request, env, 'ai')` (else 429).
8. It reads the body safely: `await request.json().catch(() => null)` gives `null` instead of crashing on bad JSON (line 68). It cuts the text to 8,000 characters, keeps at most 6 people, 40 conditions and 40 cancer types, and returns 400 if something essential is missing. **Why:** never trust what a client sends; limits keep cost and abuse down.
9. It builds the **prompt** (lines 75 to 94): instructions in plain English, the list of people with their roles, rules ("Leave out illnesses the speaker says someone did not have", "'In her forties' means 45"), and the transcript between `"""` marks.
10. It builds a **JSON schema** with `FACTS_SCHEMA` (lines 40 to 63).

    Concept: **JSON schema.** A JSON schema is a description of what a JSON answer must look like: which fields, which types, which values are allowed. Here it says the answer is `{ facts: [...] }`, and each fact has `person` (one of the roles sent), `kind` (`cond` or `death`), `cond` (one of the app's condition ids, or empty), `type`, `age` (whole number or null), `said` and `quote`. `additionalProperties: false` means no extra fields. Using `enum` with the app's own ids means the AI can't invent a condition like "sugar disease": it must pick `diabetes`.

11. With no Anthropic key (the free default), it calls `extractFree` (line 97). That runs the open Gemma model on **Workers AI**, Cloudflare's service for running AI models next to the Worker:
    ```js
    response_format: { type: 'json_schema', json_schema: { name: 'health_facts', schema, strict: true } },   // server/worker.js:134
    ```
    This asks Workers AI to make the model's output follow the schema. `enable_thinking: false` asks for a direct answer, which is faster. If the call fails (busy, or the free daily allowance is used up), it returns 503 with a message pointing to the built-in word list.
12. Different models reply in slightly different shapes, so line 142 reads either `choices[0].message.content` or `response`. Line 144 strips code fences like ```` ```json ```` in case the model added them, then parses the JSON. If parsing fails: 502.
13. It returns `{ facts: [...] }` with status 200. `withCors` adds the CORS headers.

**Back in the browser:**
14. `serverFindAnswers` checks `res.ok`; on an error it throws the server's message. On success it turns each fact into a suggestion: matches the role to a real person, accepts ages 1 to 110 whether sent as a number or as digits, and drops any condition id the app doesn't know (`js/extract.js:288` to `:297`).
15. The suggestions are shown for the teen to confirm. Nothing is saved until they tap to accept. If anything failed, `runFinder` falls back to the built-in word list and says so (`js/app.js:296` to `:298`).

That chain shows the design: the AI only *suggests*, the schema keeps its answer in a shape the app understands, the app checks the answer again, and there is always a non-AI fallback.

#### The optional Claude path (lines 99 to 125)

If the `ANTHROPIC_API_KEY` secret is set, `extract` uses the Anthropic SDK (line 12) with the same prompt and the same schema (`format: { type: 'json_schema', schema }`, line 109). Errors become clear status codes: rate limit 429, bad key 503, bad request 400, other 502 (lines 114 to 117). A `refusal` stop reason returns 422, and a cut-off answer (`max_tokens`) returns 413.

### Speech to text: `transcribe(request, env)` (lines 149 to 180)

1. Check that a speech service exists and the rate limit allows it.
2. Read the upload as **multipart form data** (the standard way browsers send files), take `file`, reject if missing (400) or over 10 MB (413). Take `lang`, cut to 5 characters.
3. **Free path, Whisper on Workers AI** (lines 157 to 171). Whisper is an open speech-recognition model. This Workers AI model takes the audio as base64 text. Converting is done in chunks of `0x8000` (32,768) bytes:
   ```js
   for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));   // server/worker.js:161
   ```
   **Why chunks:** `String.fromCharCode(...bytes)` passes every byte as a separate argument, and JavaScript has a limit on how many arguments one call can take. A few million at once would crash. Then `btoa` turns the binary string into base64. The language is passed only if it is two lowercase letters. `vad_filter: true` turns on voice activity detection, which skips silent parts.
4. **Paid path, OpenAI** (lines 172 to 179): forward the file in a new form to OpenAI's transcription address with the secret key in the `authorization` header. A 429 from OpenAI becomes a 429 here; other failures become 502.

Nothing is stored. The comment at the top says so (line 11), and the code has no `put` in these routes.

### Feedback: `feedback(request, env)` (lines 185 to 210)

1. Needs KV (else 503).
2. **Honeypot** (line 189): the feedback form has a hidden "Leave this empty" box that people never see (`js/feedback.js:22`). Spam bots tend to fill in every box. The app checks it first, and the server checks the `website` field again; if it has a value, the server pretends to succeed and saves nothing.
3. Clean the inputs: a known `kind` or `other`; message up to 4,000 characters and at least 5; email optional, up to 200 characters and checked with a simple pattern; device info up to 600 characters.
4. Rate limit (3 a minute with the config).
5. Save to KV under a key like `feedback:2026-10-27T15:04:05.000Z:1a2b3c4d` for one year.
6. If `GITHUB_TOKEN` and `GITHUB_REPO` are set, also open a GitHub issue through GitHub's API. The issue doesn't include the email address, only a note that one was left. A failure here is logged and ignored (`.catch`), so the user still sees success because the feedback was already saved.

### Encrypted family sync: `family(request, env, id)` (lines 212 to 231)

The phone encrypts the family with AES-GCM before uploading (that code is in `share.js`, chapter 06). The key lives in the share link after the `#`, which browsers never send to servers. So the server stores data it can't read.

- `GET`: return the stored text, or 404. `cache-control: no-store` stops browsers and networks from keeping a copy.
- `PUT`: rate limit, size limit (413 above 900 KB), then a **shape check**: the body must be JSON with exactly two text fields, `iv` and `ct` (line 225). `iv` is the encryption's random starting value, `ct` the encrypted *ciphertext*. **Why check:** this refuses unencrypted data, so nobody can use the server to store readable family data by mistake, or to store random files. Then save it for 400 days, renewed with each sync.
- Other methods: 405.

**Limitations:** the shape check can't prove the data is really encrypted, only that it looks right. The id works like a password for writing: anyone who knows a family's id could overwrite it with junk. They still couldn't read it or make valid data without the key, but they could break a sync. The id is long and random, which makes guessing impractical.

---

## Check your understanding

**1. In elder mode, why doesn't a quick double tap on "Yes" skip the next question?**
After an answer, `elderAdvance` sets a timer (`E.moveT`) to move on after 250 ms. A second tap finds the timer already set and returns without setting another, so the screen moves exactly once (`js/elder.js:155` to `:158`).

**2. How does "Listen" play Grandpa's own voice for "Did your father ever have... diabetes?"**
`elderListen` builds two keys, `e:had_father` and `c:diabetes`. `speakSeq` looks up each as `lang|key` in `VOICES`. If a recording exists it plays it and waits for it to end; if not, it uses the device's speech synthesis in that language.

**3. How does the tour card avoid covering the button it is describing?**
`placeTour` measures the button with `getBoundingClientRect()`, works out the strip of screen the card leaves free, and scrolls the button into the middle of that strip. If the page can't scroll far enough, it tries putting the card at the top of the screen and keeps whichever position covers less. On phones it also measures the tab bar and keeps the card above it.

**4. In the FHIR file, why does Lakshmi's heart attack have a SNOMED code but a relative's "polycystic kidneys" has only text?**
`FHIR_SNOMED` has an entry for heart attack (`414545008`) but none for the `pkd` kind. The code sends text only when there's no code with exactly the same meaning, because a wrong code could be trusted by a clinic's system.

**5. If someone copies the server address into their own website, can they use your free AI allowance?**
Not from their web page: their site isn't in `ALLOWED_ORIGINS`, so the Worker answers 403 and the browser blocks the response. But CORS only restrains browsers. A script outside a browser can fake the `origin` header, which is why the per-visitor rate limits exist as well.
