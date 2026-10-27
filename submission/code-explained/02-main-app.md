# Part 2: The main app (`js/app.js`)

`js/app.js` is the biggest file in Heirloom Health (about 1,390 lines) and the one that ties everything together. The other files mostly *know things*: `content.js` knows the questions, `family.js` knows how people are related, `risk.js` knows the guideline rules, `layout.js` knows how to draw the tree. `app.js` is the part that *does things*: it keeps the current family in memory, draws every screen, listens for taps and typing, saves to the device, records audio, and builds the PDF.

This guide is organized by area, not strictly top to bottom. Line numbers like `js/app.js:120` point to the real code so you can open the file and look. Every snippet below is copied from the file exactly.

---

## 0. Before we start: how this file fits with the others

The app has no build step and no framework. `index.html` loads each script with a plain `<script>` tag, in a fixed order, and `app.js` is loaded last:

```html
<script src="js/tour.js"></script>
<script src="js/fhir.js"></script>
<script src="js/app.js"></script>
```

These are "classic scripts". In a classic script, anything declared at the top level (a `function`, `const` or `let` outside any function) becomes a **global**: every other script on the page can use it. That is why `app.js` can call `byId()` (from `family.js`), `addReport()` (from `risk.js`) or `treeSVG()` (from `layout.js`) without importing them. It also means the order of the tags matters: `app.js` goes last because, at the very bottom, it calls `boot()`, which immediately uses functions from all the other files.

Two scripts are different. jsPDF and the QR code library in `vendor/` are loaded with `defer`, which means "load in the background and run after the page is parsed". That is fine because `app.js` only uses jsPDF when someone taps "Download PDF", long after loading has finished.

The very first lines of the file set up two constants and turn on strict mode:

```js
'use strict';
const YEAR = new Date().getFullYear();
const KEY = 'heirloom-health-v2';
```
(`js/app.js:2-4`)

`'use strict'` makes JavaScript complain about some common mistakes (like assigning to a variable you never declared) instead of silently allowing them.

---

## 1. The big idea: state-driven re-rendering

If you remember one thing about this file, remember this loop:

```
state (S)  →  render()  →  HTML strings  →  page
   ↑                                         │
   │                                         ▼
 save()  ←  change state  ←  event listener (click / input / change)
```

1. **State.** Everything about the open family lives in one JavaScript object called `S` (short for "state"): the people, the links between them, every health answer, which tab is open, which interview step you are on, whether a pop-up is open.
2. **Render.** A function called `render()` looks at `S` and builds the *entire* visible page as one long string of HTML, then puts it on the screen.
3. **Events.** When you tap or type, a listener attached to the whole document notices, figures out what you touched, and *changes `S`*. It never edits the page directly.
4. **Save and render again.** The listener calls `save()` (write `S` to the device) and then `render()` again, which redraws the page from the new state.

Why do it this way? Because there is only one source of truth. The page is always a picture of `S`. You never have to remember to update three different places on screen when one answer changes: you change the data, and the whole picture is redrawn. Big frameworks like React are built on the same idea; this app does it by hand with plain strings.

### A worked example: ticking "Diabetes" during an interview

Say you are using the example family. You are interviewing your mother, Lakshmi, and you are on the step that asks about her own health (the step with key `conds_self` in `content.js`). She says "I have sugar", so you tap the **Diabetes** tile. Here is what happens, function by function.

**Step 1: the tile was drawn by `condTiles()`.** Earlier, `renderInterview()` called `condTiles(target, { by: W.id, pre: 'iv-' + st.k, ... })` (`js/app.js:596`). Inside, each illness is drawn as a hidden checkbox with a label:

```js
<input type="checkbox" class="sr" id="${pre}-${c.id}" data-pid="${p.id}" data-cond="${c.id}" data-by="${by}" data-cf="on" ${on ? 'checked' : ''}>
```
(`js/app.js:348`)

So the real HTML on the page looks something like `<input type="checkbox" id="iv-conds_self-diabetes" data-pid="lakshmi" data-cond="diabetes" data-by="lakshmi" data-cf="on">`. The `data-...` attributes are notes the code left for itself: *this checkbox is about Lakshmi, about diabetes, the answer is from Lakshmi, and it controls whether the condition is on.* (More on `data-*` attributes in section 12.)

**Step 2: the browser fires a `change` event.** Tapping the label ticks the checkbox. The browser then sends a `change` event, which "bubbles" up through every parent element to `document`, where `app.js` is listening (`js/app.js:1128`).

**Step 3: the listener reads the notes and changes the state.**

```js
  if (d.cf === 'on') {
    if (t.checked) addReport(p.id, d.cond, '', d.by);
    else { const gone = r => r.pid === p.id && r.cond === d.cond && r.by === d.by; noteDeleted('r', S.reports.filter(gone).map(r => r.id)); dropReports(gone); }
    save(); render();
    if (t.checked) document.getElementById(t.id + '-age')?.focus();
```
(`js/app.js:1146-1150`)

Here `d` is the checkbox's `dataset` (its `data-*` notes) and `p` is the person looked up with `byId(d.pid)`. Because the box is now checked, it calls `addReport('lakshmi', 'diabetes', '', 'lakshmi')`. That function lives in `risk.js`: it adds a small "report" object to the list `S.reports`, something like `{ id: 'r-x8k2p1', pid: 'lakshmi', cond: 'diabetes', type: '', age: '', said: '', by: 'lakshmi', at: '2026-10-27' }`. A report means "**by** said that **pid** had **cond**". Storing *who said it* is what lets the app later combine answers from several relatives and notice when they disagree.

**Step 4: `save()`** turns `S` into text and writes it to the browser's storage (section 3).

**Step 5: `render()`** redraws everything. It calls `renderInterview()` again, which calls `condTiles()` again. This time `condTiles` finds the new report, so the Diabetes tile is drawn "on". Diabetes comes in kinds (type 1, type 2 and so on, listed in `SUBTYPES` in `content.js`), so the tile also shows a "What kind?" row of chips from `kindExtra()`, plus an age box. The follow-up cards from `followUps()` notice there is now an answer with no age and add "At what age?" in Lakshmi's language. None of that had to be told to update: it all reads from `S`.

**Step 6: focus.** The last line tries to put the cursor in the age box, so you can type the age right away.

That is the whole pattern. Every feature in this file is a variation on it.

---

## 2. Small helpers used everywhere

The top of the file (`js/app.js:6-13`) defines tiny tools.

### `esc()` and why it matters for security

```js
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
```
(`js/app.js:7`)

This app builds HTML with **template literals**: strings written between backticks, where `${...}` drops in a value. For example `` `<h2>${name}</h2>` `` with `name = 'Padma'` becomes `<h2>Padma</h2>`. It's a quick way to write HTML.

The danger: if someone's "name" is `<img src=x onerror="stealData()">`, dropping it straight into HTML makes the browser treat it as a real image tag and run that code. This attack is called **cross-site scripting (XSS)**. It matters here because names and answers can arrive from *other people*, through invite links and answer links.

`esc()` ("escape") replaces the five characters that have special meaning in HTML with harmless codes: `<` becomes `&lt;`, which the browser *displays* as `<` but never treats as the start of a tag. So the rule in this file is: **any text that came from a person goes through `esc()` before it goes into HTML.** You will see `esc(nameOf(p))`, `esc(p.notes)`, `esc(r.said)` all over the file. The `s ?? ''` part means "if `s` is `null` or `undefined`, use an empty string instead".

### The others

- `$` (`js/app.js:8`) is a shortcut: `$('#toast')` means `document.querySelector('#toast')`, "find the first element matching this CSS selector".
- `toast(msg)` (`js/app.js:9`) shows a short message at the bottom of the screen and hides it after 2.8 seconds. It stores its timer on the function itself (`toast.h`) so a new message cancels the old timer.
- `clip(s, n)` cuts long text and adds "…".
- `fmtDate(iso)` turns `2026-10-12` into a readable date in the user's own format. It adds `T12:00` (noon) so time zones can't shift the date to the day before.
- `today()` returns today as `YYYY-MM-DD`.
- `tr(obj, lang)` (`js/app.js:13`) picks the translation for a language, falling back to English: `obj[lang] || obj.en`.

---

## 3. The data: example family, blank family, and the global state

### What the state looks like

A family is plain data that can be written as **JSON** (JavaScript Object Notation): a text format for objects and lists, like `{"name":"Ravi","born":"1975"}`. `JSON.stringify()` turns an object into that text; `JSON.parse()` turns text back into an object. That's how the app saves and loads.

`exampleState()` (`js/app.js:16-58`) builds the demo family (Ananya, her parents Ravi and Lakshmi, grandparents and so on). It shows the three main lists clearly:

- `people`: each person, made with `newPerson()` from `family.js`, which fills in default fields (`name`, `sex`, `born`, `living`, `transcripts`, ...).
- `rels`: links. `par('ravi', 'self')` means "Ravi is a parent of me"; `pt('ravi', 'lakshmi')` means "Ravi and Lakshmi are partners".
- `reports`: who said who had what. For example:

```js
    R('venkata', 'heart', '', 54, 'ravi', 'heart attack'), R('venkata', 'heart', '', 51, 'saraswathi', 'గుండెపోటు'),
```
(`js/app.js:48`)

Ravi says his father Venkata had a heart attack at 54; Saraswathi says 51, in Telugu. Both are kept. The risk code in `risk.js` later combines them, notices the disagreement, and uses the younger (more cautious) age.

The function ends by returning the whole state, including screen settings:

```js
  return { v: 2, example: true, people, rels, reports, sel: SELF, hl: 'any', tab: 'tree', iv: { who: 'lakshmi', step: 0, lang: 'te', roman: true } };
```
(`js/app.js:57`)

`v: 2` is a version number for the data format. `sel` is who is selected on the tree, `hl` which illness is highlighted, `tab` which page is open, and `iv` holds interview settings (who you're talking to, which step, which language, whether to show pronunciation).

### `blankState()`: a new family

`blankState(me)` (`js/app.js:59-66`) makes the starting family for a new profile: you, plus your two parents and four grandparents. It does this in a slightly sneaky way. The helper functions `ensureParents()` and `addRelative()` in `family.js` always work on the global `S`. So `blankState` temporarily swaps its new object into `S`, calls them, and swaps the old one back:

```js
  const keep = S; S = S0; touchFamily();
```
(`js/app.js:61`)

It also sets the first interviewee to your mother (`S0.iv.who = mom`). This is a good example of a trade-off of global variables: easy to use, but a function has to be careful about which "S" is current.

### `migrateV1()`: upgrading old saved data

The first version of the app stored relatives by fixed roles (`father`, `pgf` for paternal grandfather, `paunt` for paternal aunt). `migrateV1()` (`js/app.js:68-85`) converts that older format into the newer family graph of people plus links, so anyone who used version 1 didn't lose their family.

### The global variables `S`, `ACCT`, `AUTH`

```js
let ACCT = null, S = null;
let AUTH = { mode: 'signin', pick: null, forgot: false };
```
(`js/app.js:87-88`)

- `S` is the open family (or `null` when nobody is signed in).
- `ACCT` is the profile using the app. It can be a real profile, the guest (example family), a **contributor** (a relative who opened an invite link) or a **viewer** (a doctor who opened a report link).
- `AUTH` remembers what the sign-in page is showing: sign in or create, which profile is picked, whether "Forgot your PIN?" is open.

Other globals are declared near the code that uses them: `CLIPS` and `REC` (recordings), `RECOG` (live captions), `SUGG` (answer suggestions), `TRANSCRIBING`, `DRAG`. Some come from other files, like `E` (large tap-to-answer mode, from `elder.js`) and `LEGAL_OPEN` (from `legal.js`).

---

## 4. Loading and saving with localStorage

**localStorage** is a small storage area the browser gives each website. It keeps text under names ("keys") and survives closing the browser. It's simple and synchronous (the code waits for it, which is fine for small data), but it only stores text and has a size limit of a few megabytes. That's why the family is stored here as JSON, but audio and photos are not (see section 6).

### `loadFor(acct)`

```js
  if (acct.guest && !acct.contributor && !acct.viewer) { const ex = exampleState(); ex.toured = true; return ex; }
  try { const v = JSON.parse(localStorage.getItem(dataKey(acct.id))); if (v?.v === 2 && Array.isArray(v.people)) return v; } catch {}
  return null;
```
(`js/app.js:92-94`)

How it works:
1. A guest always gets a fresh example family.
2. Otherwise it reads the text saved under this profile's key. `dataKey()` from `auth.js` builds a key like `heirloom-health-v2:acct-3f9a1c`, so each profile on a shared phone has its own slot.
3. It checks the data looks right (version 2, has a people list) before trusting it.
4. `try { ... } catch {}` means "if anything goes wrong (no data, broken JSON, storage blocked), ignore the error". Then it returns `null`, and the caller makes a new family.

`?.` is "optional chaining": `v?.v` means "`v.v`, unless `v` is null, in which case just give `undefined` instead of crashing".

`legacyData()` (`js/app.js:97-101`) looks for a family saved before profiles existed (under the old single key `KEY`, or the even older `heirloom-health-v1`), so the first new profile can keep it.

### `save()`

```js
function save() {
  touchFamily();
  if (!S || !ACCT || ACCT.viewer) return;
  // Changes to the example family aren't kept, so it is always the same for the next visitor.
  if (ACCT.guest && !ACCT.contributor) return;
  try { localStorage.setItem(dataKey(ACCT.id), JSON.stringify(S)); } catch {}
}
```
(`js/app.js:102-108`)

Step by step:
1. `touchFamily()` (from `family.js`) clears a cache of relationship calculations, because the family may just have changed.
2. A doctor viewing a shared report never saves anything on their device.
3. The example family is never saved, so every visitor sees the same demo.
4. Otherwise, the whole state is turned into JSON and written to this profile's slot.

Notice it saves the *entire* state every time, even for one keystroke. That is simple and safe (the saved copy can never be half-updated), at the cost of doing more work than needed.

### `enter(acct, state)` and `signOut()`

`enter()` (`js/app.js:109-117`) is what happens after a successful sign-in. It sets `ACCT`, picks a state (one passed in, else the saved one, else a new one), resets a few temporary flags (`pdfBusy`, `celebrate`, `micBlocked`), starts the tour if this profile has never seen it, then saves and renders. After that it starts loading recordings and photos (`loadFiles().then(render)`, which redraws again when they arrive) and handles any pending answer or sync link (section 14).

`signOut()` (`js/app.js:120-128`) does the reverse: stops any recording or captions, frees the memory used by audio and photo URLs, sets `S` and `ACCT` back to `null`, and renders the sign-in page.

---

## 5. The sign-in page

### Drawing it: `renderAuth()`

`renderAuth()` (`js/app.js:708-761`) returns one of three things:
- If the terms have changed since this profile last agreed (`AUTH.agree` is set), a "We updated our terms" card.
- In sign-in mode, a button for each profile on this device, a PIN box if that profile has a PIN, and "Stay signed in".
- In create mode, a form for first name, birth year, sex, an optional PIN typed twice, and a terms checkbox.

Below either form is "Explore the example family".

### Keeping what you typed: `authForm()` and `restoreAuthForm()`

Because `render()` replaces the whole page, anything typed into a form would be wiped by a redraw (for example, after opening the Terms and coming back). These two functions fix that:

```js
  const els = [...document.querySelectorAll('#main [id^="auth-"]')].filter(el => /INPUT|SELECT/.test(el.tagName));
  return els.length ? Object.fromEntries(els.map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value])) : null;
```
(`js/app.js:764-765`)

`authForm()` finds every input whose id starts with `auth-` and copies its value into an object like `{ 'auth-name': 'Maya', 'auth-remember': true }`. After redrawing, `restoreAuthForm()` puts the values back. This is a recurring theme: with full redraws, anything that lives only in the page (not in `S`) has to be rescued.

### `signUp()` and `signIn()`

`signUp()` (`js/app.js:771-787`) checks the form in order and stops at the first problem, showing a message with `authErr()`:
- a name is required,
- a PIN, if given, must be 4 to 8 digits (`/^\d{4,8}$/` is a pattern meaning "only 4 to 8 digits"),
- both PINs must match,
- the name must not already be used on this device,
- the terms box must be ticked.

Then it calls `createAccount()` from `auth.js`. That function never stores the PIN itself; it stores a *hash* (a scrambled fingerprint made with SHA-256 plus a random "salt"). Checking a PIN later means hashing what was typed and comparing fingerprints. `signUp` then double-checks the profile really got saved (private browsing windows sometimes block storage), starts a session, builds a blank family (or keeps the legacy one if that box was ticked), and calls `enter()`.

These functions are `async`, which needs a short explanation.

**async/await.** Some jobs take time: hashing, reading a database, recording audio. JavaScript doesn't freeze the page while waiting. Instead such a job returns a **Promise**, an object that means "the answer will arrive later". Inside a function marked `async`, writing `await somePromise` pauses *that function only* until the answer arrives, while the rest of the page keeps working. It lets you write waiting code in normal top-to-bottom order:

```js
  try { ok = await checkPin(acct, $('#auth-pin')?.value.trim() || ''); } catch { return authErr("This browser can't check PINs here. Try another browser."); }
```
(`js/app.js:793`)

`signIn()` (`js/app.js:788-799`) also respects a lockout from `auth.js` (`pinLocked()`: after 5 wrong PINs, wait 30 seconds) and sends the user to the updated-terms card if needed.

### The buttons: `authAction()` and the submit listener

Taps on sign-in buttons have `data-action` values starting with `auth-`, and the click listener hands them to `authAction()` (`js/app.js:1287-1300`). It switches mode, picks a profile, shows "Forgot your PIN?", deletes a profile (with a "tap again" confirmation), starts the guest example plus tour, or records agreement to new terms.

Pressing Enter or the main button submits the form. A `submit` listener catches it:

```js
  e.preventDefault();
  AUTH.mode === 'signin' ? signIn() : signUp();
```
(`js/app.js:1303-1304`)

`preventDefault()` stops the browser's normal behavior for forms, which would be to reload the page.

---

## 6. Recordings on the device: IndexedDB, Blobs and MediaRecorder

### Why not localStorage?

Audio recordings, photos and recorded question voices are big binary files. localStorage holds only a few megabytes of text. **IndexedDB** is a second, larger storage system built into browsers. It can hold real files and much more data, and it works asynchronously (it hands back results later instead of making the page wait). The trade-off is that its built-in interface is clumsy, so `app.js` wraps it in a small helper object called `IDB`.

### The `IDB` helper

```js
  open() {
    return this.db ||= new Promise((res, rej) => {
      const r = indexedDB.open('heirloom-audio', 2);
      r.onupgradeneeded = () => { for (const name of this.STORES) if (!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name, { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
```
(`js/app.js:167-173`)

What, how, why:
- It opens a database named `heirloom-audio`, version 2.
- `onupgradeneeded` runs when the database is new or its version went up. It creates three "object stores" (like tables): `clips`, `media` and `voices`, each keyed by an `id` field.
- The old IndexedDB interface uses callbacks (`onsuccess`, `onerror`). Wrapping them in `new Promise(...)` turns that into something you can `await`.
- `this.db ||= ...` means "if `this.db` is already set, use it; otherwise set it". It stores the *promise*, so the database is only opened once, no matter how many times `open()` is called.

`run(store, mode, fn)` (`js/app.js:174`) opens a transaction (a group of reads or writes that all succeed or fail together), runs your function on the store, and resolves when the transaction completes. On top of it, `all`, `put` and `del` are one-liners for "get everything", "save one" and "delete one".

### Blobs and object URLs

A **Blob** is the browser's object for a chunk of raw file data, like an audio recording. An `<audio>` tag can't play a Blob directly; it needs a URL. `URL.createObjectURL(blob)` makes a temporary address like `blob:https://.../4f1c...` that points at the Blob in memory. When it's no longer needed, `URL.revokeObjectURL(url)` frees that memory. You'll see these two calls in pairs throughout this section.

### Loading, adding and deleting clips

```js
async function loadClips() { CLIPS.forEach(c => URL.revokeObjectURL(c.url)); try { CLIPS = (await IDB.all()).filter(c => c.acct ? c.acct === ACCT?.id : ACCT && !ACCT.guest).map(c => ({ ...c, url: URL.createObjectURL(c.blob) })).sort((a, b) => a.created - b.created); } catch { CLIPS = []; } }
```
(`js/app.js:179`)

Reading it left to right: free the old URLs, read every clip from IndexedDB, keep only this profile's clips (very old clips saved before profiles existed have no `acct`, so they are shown to any real profile but never to the guest), give each a playable URL, and sort oldest first. The result goes into the global list `CLIPS`, which the screens read.

`addClip()` (`js/app.js:180-185`) builds a record (`id`, which profile, which person, which interview step, when, length in seconds, the Blob), saves it with `IDB.put`, adds it to `CLIPS`, and shows a toast. If storage fails, it says so. `removeClip()` deletes from the database and from `CLIPS`. `deleteFilesOf(acctId)` wipes a profile's clips and media, used when a profile is deleted or the family is erased.

### Recording with MediaRecorder

**MediaRecorder** is the browser's built-in recorder. You give it a live microphone stream; it hands you chunks of recorded data; when you stop, you glue the chunks into one Blob.

```js
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream), chunks = [], start = Date.now(), acct = ACCT?.id; // kept even if you sign out mid-recording
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
```
(`js/app.js:202-204`)

Step by step in `startRec(pid, step)` (`js/app.js:199-209`):
1. Check the browser supports recording at all.
2. `getUserMedia({ audio: true })` asks permission to use the microphone. `await` waits for the user to answer.
3. Create the recorder. Every time it has data, push it into `chunks`.
4. When it stops (`onstop`, line 205): turn off the microphone (`stream.getTracks().forEach(t => t.stop())`, so the "recording" light goes off), stop the on-screen timer, clear `REC`, and call `addClip` with `new Blob(chunks, ...)` and the length in seconds.
5. Store the recorder and a timer in `REC`. The timer updates the `#rec-time` display twice a second *directly*, without a full `render()`, because redrawing the whole page twice a second would be wasteful.
6. Start recording and render, so the button changes to "Stop".

If anything fails (no microphone, permission denied), the `catch` sets `S.micBlocked = true`. The interview screen then hides the Record button and shows "Use phone's recorder" instead, a file input with `capture` that opens the phone's own recorder app.

`clipList()` (`js/app.js:210-217`) draws the list of recordings: date, length, a Delete button, an `<audio controls>` player, and (on the interview tab, if speech-to-text is available) a "Turn into text" button.

---

## 7. Live captions, transcription, and the answer finder

### Live captions

`startCaptions()` (`js/app.js:221-236`) uses the browser's speech recognition (`SpeechRecognition`, called `webkitSpeechRecognition` in Chrome and Safari). It sets the language from the interview language (for example `te-IN` for Telugu) and listens continuously. Each time a final phrase is recognized, it is added to the person's transcript for this step:

```js
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) p.transcripts[stepKey] = ((p.transcripts[stepKey] || '') + ' ' + e.results[i][0].transcript).trim();
      save(); const ta = $('#iv-tr'); if (ta) ta.value = p.transcripts[stepKey];
```
(`js/app.js:229-230`)

Notice it updates the text box directly (`ta.value = ...`) instead of calling `render()`. A full redraw while someone is talking would be jumpy. If the browser has no speech recognition, `S.capBlocked` is set and the button disappears.

### Turning a recording into text: `transcribeClip()`

`transcribeClip(id)` (`js/app.js:266-285`):
1. Finds the clip and its person. Does nothing if another transcription is running.
2. If the user has never chosen how to do speech-to-text, it opens a pop-up to choose (on the device, or with the Heirloom server) and stops. The pop-up's Save button calls it again with `confirmed = true`.
3. If the server was chosen, it asks for AI consent first (below).
4. Sets `TRANSCRIBING = id` and renders, so the button reads "Turning into text…".
5. Calls `transcribeWithServer()` or `transcribeOnDevice()` (both in `stt.js`), passing a `status` function that writes progress messages straight into a small `<span>`.
6. Adds the text to the transcript for that interview step. If the clip was a family story (its `step` is a string, not a number), the text goes to that story instead.
7. Whatever happens, clears `TRANSCRIBING` and renders.

### Asking before using AI: `needsConsent()`

```js
function needsConsent(what, then) {
  if (SAMPLE_OK || S.aiConsent) return false;
  S.modal = { kind: 'ai-consent', what, then }; render(); return true;
}
```
(`js/app.js:260-263`)

Before interview text or audio leaves the device for the optional server, the app asks once. If consent hasn't been given, it opens a pop-up and *remembers what you were trying to do* in `then` (for example `{ action: 'find-ai' }`). When you agree, the click handler for `m-consent` (`js/app.js:1221`) sets `S.aiConsent = true` and re-runs that action. `SAMPLE_OK` is a separate flag: it is set in `boot()` when the page is running inside Claude's own environment and an AI helper is offered there. `aiOK()` (`js/app.js:258`) decides whether to show the "Find with AI" button at all.

### Finding answers: `runFinder()`

`runFinder(useAI)` (`js/app.js:286-300`) takes the transcript for the current step and asks `extract.js` to find answers in it (for example "sugar at 50" becomes diabetes, age 50).

1. `ivPeople()` (`js/app.js:237-241`) works out who the step is about: the interviewee, their mother or their father. If that person isn't on the tree yet, it says so.
2. Without AI, it calls `findAnswers()` (the built-in word list).
3. With AI, it shows "Reading…" and calls `aiFindAnswers()`. If AI fails, it **falls back** to the word list and says so in a toast. The app keeps working without the server.
4. `isNew()` (`js/app.js:243-251`) drops suggestions that are already saved exactly as heard, so you aren't asked to add the same thing twice.
5. Results go in `SUGG`, and `showResults()` renders, scrolls to them and shows a count.

Nothing is saved yet. Each suggestion is drawn by `suggestionHTML()` with **Add** and **Dismiss** buttons; you confirm each one. This is a deliberate design choice: the finder may misunderstand, so a human always checks.

`suggestionHTML()` also highlights the words that matched in the original sentence. Look at how it handles escaping:

```js
  const quote = at >= 0 ? `${esc(q.slice(0, at))}<mark>${esc(q.slice(at, at + s.said.length))}</mark>${esc(q.slice(at + s.said.length))}` : esc(q);
```
(`js/app.js:310`)

It cuts the sentence into three parts, escapes each part separately, and only then wraps the middle in `<mark>`. If it added `<mark>` first and escaped afterwards, the `<mark>` tag itself would be turned into harmless text and wouldn't work. If it didn't escape at all, a transcript could inject HTML.

Each suggestion also has a dropdown to change *who* it's about (`data-sugg` on the `<select>`), handled in the change listener at `js/app.js:1142`.

---

## 8. Shared form pieces

These functions return HTML strings used on more than one screen.

- **`langBlock(obj, lang, roman)`** (`js/app.js:323-326`): shows a phrase in the chosen language, then (optionally) its pronunciation in English letters, then the English. `langAttrs(lang)` adds the right `lang` and text-direction attributes, which matters for Urdu, written right to left.
- **`condTiles(p, {...})`** (`js/app.js:333-355`): the grid of illness tiles. Two modes:
  - In an interview, `by` is the person answering, and a tile is "on" only if *they* said yes. Answers from other relatives show as "Also heard: ...".
  - In the family tree editor, `merged: true` shows a tile "on" if *anyone* said yes, and lists every reporter with a Remove button.

  Common illnesses come first; rarer ones go under "Less common, but worth asking".
- **`otherTile()`** (`js/app.js:357-372`): "Something else", for an illness not on the list, saved under the relative's own words.
- **`kindExtra()`** (`js/app.js:374-388`): the "What kind?" chips for illnesses that come in kinds, plus an age box per kind. Each chip uses `aria-pressed` so screen readers know whether it's selected.
- **`vitalFields(p, pre)`** (`js/app.js:389-399`): Living / Passed away / Don't know buttons, birth year, and, only if they passed away, age at death and cause.
- **`avatar(p)`**: a photo if there is one, otherwise the medical pedigree symbol: square for male, circle for female, diamond for unknown, filled if they have a condition, with a slash if deceased.
- **`statTiles()`**, **`keyHTML()`** (the chart legend), and **`nextAskHTML()`** ("Who to ask next", ranked by `suggestInterviews()` in `risk.js`).

The `pre` parameter ("prefix") deserves a note. The same tiles can appear in different places, and every element `id` on a page must be unique. So each place passes a different prefix (`ed` in the editor, `iv-conds_self` in an interview step), giving ids like `ed-diabetes` and `iv-conds_self-diabetes`. Unique, *stable* ids also matter for keeping focus after a redraw (section 10).

---

## 9. The four screens

`render()` picks one of these based on `S.tab`.

### Family tree: `renderTree()`

`renderTree()` (`js/app.js:438-503`) builds:
1. A heading ("Ananya's family") and an "Invite a relative to answer" button.
2. Stat tiles: blood relatives filled in, interviews, recordings.
3. The chart card: zoom buttons, condition "pills" to shade the chart by one illness (`data-hl`), and the chart itself from `treeSVG()` in `layout.js`, inside `<div id="tree-svg">`.
4. The editor panel for the selected person (`S.sel`): name, sex, birth and death details, illness tiles (merged), notes, recordings, photos and documents, buttons to add relatives, and "Remove from tree".
5. "Who to ask next" and the backup section from `storeHTML()`.

The Remove button shows a **two-tap confirmation**. The first tap sets `S.confirmRemove = p.id` and the button turns into "Tap again to remove (and 2 people only connected through them)". `removalSet()` from `family.js` works out who would be left disconnected. The same pattern protects deleting clips, media, and "Erase and start over". Because the confirmation lives in `S`, the normal render shows it; no special code needed.

### Interview: `renderInterview()`

`renderInterview()` (`js/app.js:572-655`) is driven by the `STEPS` list in `content.js`. Each step has a key `k`, a `type`, and sometimes `who` and a `tip`. The function:

1. Lists living relatives you can talk to. If there are none, it shows a "No one to interview yet" card.
2. If you just finished (`S.celebrate === W.id`), it shows "Interview complete!" with counts.
3. Otherwise it picks the current step, clamped to a valid range with `Math.max(0, Math.min(STEPS.length - 1, S.iv.step))`, finds the question text `Q[st.k]`, and builds the answer area based on the step type:
   - `intro` / `closing`: a short instruction.
   - `born`: a birth-year box.
   - `conds` / `vital`: illness tiles or living/death fields for the person the step is about, plus follow-ups. If that parent isn't on the tree, a button to add them.
   - `siblings` / `children`: pills to pick each brother, sister or child, a quick "add to tree" row, then that person's fields and tiles.
   - `check`: a whole-family question (genetic tests, sudden deaths, and so on) with Yes / No / Don't know, and a "Who was it?" box if yes. Answers are saved on the person who answered (`W.checks`).
   - `notes`: free text only.
4. Around that it adds: a progress bar, the "Talking to" and language selectors, mode cards (large tap-to-answer, question voices, send a link, family stories), the question in a speech bubble with a Listen button, the tip, and, for every step except intro and closing, the recording area (`recHTML`) and transcript area (`transcriptHTML`).

`followUps()` (`js/app.js:520-541`) is the "smart follow-up" feature. It looks at the answers just given and adds a card when something is missing: a cancer with no kind, a "something else" with no name, an illness with no age, a death with no cause (if they died young or the age is unknown) or no age. Each card shows the follow-up question in the relative's language. Because it runs on every render, a follow-up disappears by itself once you answer it.

`storiesCard` is checked with `typeof storiesCard === 'function'` before it's used. That makes the stories feature optional: if `stories.js` weren't loaded, the screen would still work.

### My risks: `renderRisks()`

`renderRisks()` (`js/app.js:674-705`) mostly *displays* results computed in `risk.js`. `familyRisk()` returns a ranked list of conditions, each with a level (`high`, `moderate`, `average`), reasons, ancestry notes, and the relatives who had it. The page shows the health timeline (from `timeline.js`), counts per level, the ranked list with a three-step meter, a "What helps" tip for each, conditions not seen yet, and a "How this works" box citing the CDC Family Healthware method. If there are no blood relatives, it explains that, including a kind note for adopted users.

### Doctor report: `renderDoctor()`

`renderDoctor()` (`js/app.js:809-846`) builds the report a doctor would read:
- A header with name, birth year, date prepared, and buttons: Download PDF, Download for medical records (the FHIR file from `fhir.js`), Show my doctor (a QR code), Copy as text.
- The checklist of questions for the visit, or, for a doctor viewing a shared link, the patient's questions (`viewerQuestionsHTML()`).
- "What the guidelines say", one card per rule from `guidelineCards()` in `risk.js`. Each card has a level (Act on this / Discuss / Good to know / Missing info, from the `LEVEL` table at line 806), a recommendation, numbered citation links, and a "Why" list. `sourceOrder()` numbers the sources in the order they first appear.
- A table of conditions in the family, grouped by illness, with side of the family (`sideLabel()`), age, who reported it, and a `*` when reporters disagree. Non-blood relatives are greyed.
- Relatives who have died, whole-family answers (`familyAnswers()`), free-text notes (`interviewNotes()`), the pedigree (non-interactive), and the source list.

`personNotes()` (`js/app.js:867-869`) collects every free-text note about a person from several fields (`NOTE_PARTS`, line 859). Some of these were stored in different places by older versions, so both are read and duplicates removed with a `Set`.

`summaryText()` (`js/app.js:874-892`) builds the same report as plain text lines for "Copy as text", for pasting into an email or patient portal.

---

## 10. The `render()` pipeline in detail

```js
function render() { renderApp(); applyTour(); }
```
(`js/app.js:1045`)

`render()` draws the app, then lets `tour.js` place the tour bubble on top (the tour needs the page to exist first, so it can find the element it is pointing at).

### `renderApp()`, step by step

1. **Remember what to restore.** Before replacing anything, it saves the `id` of the element that has keyboard focus, and the chart's scroll position:

```js
  const keep = document.activeElement?.id;
  const ts0 = $('#tree-svg'), scroll = ts0 ? [ts0.scrollLeft, ts0.scrollTop] : null;
```
(`js/app.js:1047-1048`)

2. **Terms page.** If the Terms are open, show only that and stop.
3. **Body classes.** It toggles CSS classes on `<body>` (`signed-out`, `elder-on`, `solo`) so the stylesheet can hide the sidebar or tabs in special modes.
4. **Pop-ups.** `renderModal()` (in `handoff.js`) draws the current pop-up from `S.modal`, or nothing, into `#modal-root`.
5. **Pop-up focus.** When a pop-up opens, focus moves into it; when it closes, focus returns to whatever had it before. `MODAL_FOCUS` remembers the previous element. `setTimeout(..., 0)` waits until the new HTML is in place before focusing. This matters for keyboard and screen-reader users.
6. **Special modes, each of which replaces the whole main area and stops:** large tap-to-answer mode (`E`), a relative answering through an invite (`contributor`), a doctor viewing a report (`viewer`), and the sign-in page (when `S` is null), which also restores typed form values.
7. **Normal app.** `renderShell()` fills the logo, the tab buttons (with `aria-selected` on the current tab) and the account chip. Then it picks the page function, which can also be the voices or stories pages, and does the one big write:

```js
  $('#main').innerHTML = renderBanner() + page();
```
(`js/app.js:1071`)

Setting `innerHTML` tells the browser: throw away everything inside `#main` and build new elements from this HTML string.

8. **Chart zoom and scroll.** The first time the chart is shown, `S.zoom` is null, so it picks a zoom that fits the screen. If there was a scroll position, it's put back; otherwise the chart centers on the selected person.
9. **Focus.** `if (keep) document.getElementById(keep)?.focus();` puts focus back on the element with the same id in the new page. This is why stable ids matter.

`renderBanner()` (`js/app.js:1040-1043`) shows "You're exploring an example family" for guests, or "Shared by ... Read-only" for doctors.

### Why some events *don't* call `render()`

Look at the `input` listener (section 12). When you type in a name or an age, it updates `S` and calls `save()` and `refreshTree()`, but not `render()`. A full redraw on every keystroke would rebuild the text box you're typing in. Focus would come back, but the cursor position and on-screen keyboard could jump. So typing updates only the chart:

```js
function refreshTree() { const el = $('#tree-svg'); if (el) el.innerHTML = treeSVG({ zoom: S.zoom || 1 }); }
```
(`js/app.js:1079`)

The full redraw waits for the `change` event, which fires when you leave the box or tick a checkbox.

---

## 11. Zoom and drag for the family chart

- `clampZoom(z)` (`js/app.js:1081`) keeps zoom between 30% and 180%, rounded to whole percents.
- `fitZoom()` computes the zoom that fits the chart's width (`TREE_GEOM`, set by `layout.js`) into the box.
- `setZoom(z)` (`js/app.js:1083-1089`) remembers which point is at the *center* of the view as a fraction (for example 40% across), redraws the chart at the new zoom, then scrolls so the same point is still centered. Without this, zooming would jump to the top-left corner.
- `centerOn(id)` scrolls so a person (yourself, for "Find me") is in the middle.

**Dragging with the mouse** uses three document-level listeners (`js/app.js:1097-1110`):
1. `pointerdown` on the chart, left mouse button only, records the starting point and scroll position in `DRAG`.
2. `pointermove` computes how far the mouse moved. Once it has moved more than 5 pixels, it counts as a drag and scrolls the chart the opposite way, like grabbing paper.
3. `pointerup` ends the drag. If it really moved, it sets `SUPPRESS_CLICK` for one tick, so the click that browsers fire at the end of a mouse press doesn't also select whatever person was under the mouse.

Touch screens are left alone (`e.pointerType === 'mouse'`), because phones already scroll with a finger.

---

## 12. Event delegation: how taps and typing reach the code

### The problem

The page is rebuilt from scratch on every render. If the code attached a click handler to each button (`button.addEventListener('click', ...)`), those handlers would be thrown away with the old buttons at every redraw, and would have to be attached again each time.

### The solution: event delegation

Most browser events **bubble**: a click on a button is also a click on its parent, and its parent's parent, all the way up to `document`. So `app.js` attaches *one* listener for each event type to `document` itself, once, when the file loads. `document` never gets replaced, so the listeners survive every redraw. When an event arrives, the listener looks at `e.target` (the element actually touched) to decide what to do. This is called **event delegation**.

### `data-*` attributes and `dataset`

To know *what* a button means, each one carries notes in attributes starting with `data-`:

```js
<button class="btn sm" data-action="add" data-kind="mother" data-pid="${p.id}">+ Mother</button>
```
(`js/app.js:489`)

In JavaScript, those appear on `element.dataset`: `b.dataset.action` is `'add'`, `b.dataset.kind` is `'mother'`. Dashed names become camelCase, so `data-other-name` is read as `dataset.otherName`. The browser ignores `data-*` attributes; they exist only for your code.

### `closest()`

A tap often lands on something *inside* a button, like its icon. `e.target.closest('[data-action]')` starts at the touched element and walks up through its parents until it finds one matching the selector (or returns `null`). So tapping the icon inside a button still finds the button.

### The `click` listener (`js/app.js:1154-1286`)

It checks things in order, most specific first:

```js
  const tab = e.target.closest('.nav button'); if (tab) return setTab(tab.dataset.tab);
  const node = e.target.closest('[data-node]'); if (node) { S.sel = node.dataset.node; S.confirmRemove = null; save(); render(); if (innerWidth <= 1100) document.querySelector('.editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
```
(`js/app.js:1156-1157`)

1. A tab button: switch tabs.
2. A person on the chart (`data-node`, put there by `layout.js`): select them, redraw, and on narrow screens scroll down to the editor.
3. A condition pill (`data-hl`) or a living-status button (`data-living`).
4. Anything else with `data-action`. Legal and sign-in actions are handled even when signed out; the rest require `S`. Then `elder.js` and `stories.js` each get a chance to claim the action (each returns `true` if it handled it).
5. Before the big `switch`, it resets any "tap again to confirm" state belonging to a *different* action, so an armed Delete button goes back to normal if you tap something else.
6. A `switch (a)` with one `case` per action: start or stop recording, find answers, add a suggestion, pick a cancer kind, add or remove a relative, move between interview steps, open pop-ups, zoom, back up, restore, erase, and more. Almost every case ends the same way: change `S`, `save()`, `render()`.

Two cases worth reading closely:

- **`ctype`** (`js/app.js:1191-1198`), tapping a kind chip such as "Type 2". If this person already reported that kind, it's removed. Otherwise, if there's a report with no kind yet, that report gets the kind; if not, a new report is added. Finally, if nothing is left, a kind-less report is added back, so the illness stays ticked even after un-picking every kind.
- **`iv-done`** (`js/app.js:1266`), finishing an interview: marks the person as interviewed today, sets `S.celebrate` so the next render shows the celebration screen, and selects them on the tree.

### The `input` listener (`js/app.js:1118-1127`)

Fires on every keystroke. Depending on the element's `data-*` notes it updates a transcript (`data-tr`), a whole-family note (`data-chk`), a person field like name or birth year (`data-f`), or an illness age (`data-cf="age"`, which calls `addReport` with `{ age }`). It also sets `p.u = Date.now()`, a "last updated" time used by `share.js` when merging data from different phones. As explained above, it saves but does not fully re-render.

### The `change` listener (`js/app.js:1128-1153`)

Fires when a checkbox, dropdown or file input changes, or when you leave a text box. It handles the speech-to-text mode choice, checklist ticks, voice-pack and media uploads, audio file uploads (`rec-file`), renaming "something else" (on change, not input, because renaming regroups the answer and would redraw under your fingers), the suggestion "who" dropdown, interview settings (`data-ivf`; changing who you're talking to resets to step 0), illness checkboxes (the Diabetes example in section 1), and dropdown fields like sex.

### The `keydown` listener (`js/app.js:1306-1317`)

Keyboard support:
- Enter in a "something else" box presses its Add button.
- Escape closes a pop-up.
- Tab is kept inside an open pop-up: from the last focusable item it wraps to the first, and Shift+Tab from the first wraps to the last. This is called a **focus trap**, a standard accessibility pattern for dialogs.
- Enter or Space on a person in the chart acts like a click, so the tree can be used without a mouse (`layout.js` gives each person `tabindex="0"` and `role="button"`).

### Other actions worth knowing

- **`speak()`** (`js/app.js:1318-1328`) reads the question aloud. If a family member recorded this question (`VOICES`, from `elder.js`), it plays their voice. Otherwise it uses the device's text-to-speech in the right language, and warns if the device has no voice for that language.
- **`copyText()`** (`js/app.js:1112-1115`) copies to the clipboard. If the browser refuses, it shows the text in a selected box so you can copy by hand.
- **Backup and restore** (`js/app.js:1269-1279`). Backup turns the people, links and reports into JSON and then into **Base64** (`btoa`), a format made only of letters, digits, `+`, `/` and `=`, safe to paste anywhere. `btoa` only accepts simple characters, so `unescape(encodeURIComponent(...))` first converts Telugu, Hindi and other text into a byte form it accepts. Family stories are left out (`withoutStories`). Restore reverses the steps, then checks and cleans the data with `cleanFamily()` from `share.js` and makes sure "you" are in it. Any failure shows "That code didn't work."

---

## 13. Making the PDF with jsPDF

jsPDF is a library (in `vendor/`) that writes PDF files in the browser. A PDF isn't HTML: you place each piece of text yourself at x/y coordinates, in points (72 points = 1 inch). So `makePDF()` (`js/app.js:916-1007`) acts like a typewriter that tracks how far down the page it has written.

### The two key helpers

```js
  const need = h => { if (y + h > PH - M - 20) { doc.addPage(); y = M; } };
```
(`js/app.js:922`)

`y` is the current height on the page. `need(h)` says "I'm about to write something `h` points tall; if it won't fit above the bottom margin, start a new page and go back to the top". Every write calls it, so page breaks happen automatically.

`text(s, {...})` (`js/app.js:923-926`) sets font, size and color, uses `doc.splitTextToSize()` to wrap long text into lines that fit the width, and writes each line, moving `y` down. `heading(s)` adds space, bold text, and a thin line under it.

### The order of the PDF

A teal bar and title, then: guideline cards (with a colored level label in the left column and the text indented 78 points), risk levels, the checklist with `[ ]` boxes to tick by hand, the health timeline, the conditions table (the `row()` helper wraps each cell to its column width and makes the row as tall as its tallest cell), interview notes, whole-family answers, deaths, the pedigree picture, sources, and finally a footer on every page ("Page 2 of 4"). The footer is added last because the total page count is only known at the end.

### Putting the chart in the PDF: `pedigreePNG()`

jsPDF can't draw SVG directly, so `pedigreePNG()` (`js/app.js:896-913`) converts the chart into a PNG picture:
1. Get the chart SVG text from `treeSVG()`.
2. The chart's colors use CSS variables like `var(--accent)`, which only work inside the web page. A regular expression replaces each with a real color from the `LIGHT` table, and a small stylesheet is embedded for the fonts.
3. Load the SVG into an `Image` using a `data:` URL (the whole file written into the address itself).
4. When it loads, draw it on a `<canvas>` at twice the size (sharper when printed) on a white background, and export it with `toDataURL('image/png')`.

It returns a Promise because loading the image takes a moment; `makePDF` uses `await pedigreePNG()`.

### The Latin-1 limitation: `lat()`

```js
const lat = s => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x00-\xFF]/g, '?');
```
(`js/app.js:915`)

The PDF uses the built-in Helvetica font, which only has Western European characters (called Latin-1). `lat()` swaps curly quotes and dashes for plain ones, and replaces any other character with `?`. This is an honest limitation: a name typed in Telugu, Hindi, Chinese or another script appears as `???` in the PDF. The on-screen report, "Copy as text" and the FHIR file keep the real characters. Fixing it would mean embedding a font file for each script, which would make the app much larger.

### Saving the file

`exportPDF()` (`js/app.js:1017-1026`) sets `S.pdfBusy = true` and renders (the button says "Making PDF…" and is disabled), builds the PDF, picks a file name from your name, and calls `saveFile()`. The `finally` block always turns `pdfBusy` off, even if something failed, so the button can never get stuck.

`saveFile()` (`js/app.js:1009-1016`) tries three ways: inside Claude's environment it uses the download feature offered there; inside an embedded frame where downloads are blocked, it says so; otherwise it creates a temporary invisible link with the `download` attribute pointing at an object URL for the Blob, clicks it, and removes it. That's the standard trick for making a browser download a file built in JavaScript.

---

## 14. Starting up: `boot()`, URL-hash routing, and offline support

### The URL hash

The **hash** is the part of a web address after `#`, as in `https://example.org/#report=ABC123`. Two useful facts: changing it doesn't reload the page, and browsers never send it to the web server. The comment above `boot()` says this directly (`js/app.js:1331-1332`). Heirloom Health uses the hash to carry data inside links, such as an invite for a relative or a whole report for a doctor, without it ever being stored on a server.

### `boot()`, step by step (`js/app.js:1333-1368`)

1. Read `location.hash` and set up `AUTH` (sign in if profiles exist, otherwise create).
2. `#terms` opens the Terms page directly.
3. Match share links with a regular expression:

```js
  const link = hash.match(/^#(join|answers|report|sync)=(.+)$/);
```
(`js/app.js:1337`)

4. **`#report=...`** (a doctor's link): unpack the report (`unpackData()` in `share.js`), sign in as a read-only "Doctor view", render, and stop. Nothing is saved.
5. **`#join=...`** (an invite for a relative): create a contributor profile just for this invite, load their earlier answers or start fresh, render, and stop.
6. **`#answers=...`** or **`#sync=...`**: these should only open inside a real profile, which may not be signed in yet. So the data is put in **sessionStorage** (like localStorage, but cleared when the tab closes) as "pending", and `history.replaceState()` removes it from the address bar so private keys don't linger there or end up in bookmarks.
7. If someone is already signed in (`currentAccount()` from `auth.js`), load their family. A plain tab name in the hash (`#doctor`) opens that tab.
8. Render. If signed in, load recordings and photos, then handle the pending link.
9. Quietly check whether an AI helper is available inside Claude's environment, and set `SAMPLE_OK` if so.

`handlePending()` (`js/app.js:1370-1380`) runs when a real profile is open. For answers, it unpacks and **cleans** the data (`okId`, `cleanFamily`, `okText`, `okDate` from `share.js` check every field) and opens a pop-up to review them before merging. For sync, it opens a pop-up to join. Data from a link is treated as untrusted until checked.

The last lines:

```js
boot();
// A share link opened in a tab where the app is already running: start over so it is read.
window.addEventListener('hashchange', () => { if (/^#(join|answers|report|sync)=/.test(location.hash)) location.reload(); });
```
(`js/app.js:1381-1383`)

`boot()` runs once, as soon as the script loads. If a share link opens in a tab where the app is already running, only the hash changes and the page doesn't reload, so this listener forces a reload so `boot()` reads the new link.

### Service worker registration

```js
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
```
(`js/app.js:1386-1388`)

A **service worker** is a script the browser keeps running in the background for a website. It can answer the page's requests for files from a saved copy (a cache) when there's no internet. `sw.js` saves all the app's files on the first visit, which is why interviews keep working at a grandparent's house with no Wi-Fi. This code registers it only if the browser supports it, the site is on `https` (browsers require that), and the app is not inside an embedded frame. It waits for the `load` event so it doesn't slow down the first visit. `.catch(() => {})` means that if registration fails, the app just works online-only.

---

## 15. Honest limitations

These are real trade-offs in this file. Knowing them, and why they were accepted, makes a stronger answer to judges than pretending there are none.

1. **Redrawing everything is simple but wasteful.** Each `render()` rebuilds the whole screen from strings, including the family chart. For a family of a few dozen people this is instant. For hundreds of people it would get slow. The code works around the worst cases (no full redraw while typing; the recording timer and captions update single elements), but those workarounds are exceptions you have to remember.
2. **Redraws lose small bits of page state.** Focus is restored by element id, and the chart's scroll position is kept, but things like the cursor position inside a text box, scroll positions of other boxes, and open/closed `<details>` sections aren't. That's why typing doesn't trigger a render, and why the sign-in form has its own save-and-restore code.
3. **Security depends on discipline.** Escaping works only if every piece of user text goes through `esc()`. There is no automatic safety net, so a single forgotten `esc()` in a future change could open an XSS hole. Some values go in without `esc()`, such as person ids in `data-pid="${p.id}"`. They are safe because ids are created by the app (`uid()`), and ids arriving in links are checked by `okId()` in `share.js`.
4. **Saving can fail silently.** `save()` wraps the write in `try { ... } catch {}` with nothing in the catch. If storage is full or blocked, the user isn't told that their latest change wasn't saved. It also writes the whole family on every keystroke, which is fine at this size but not efficient.
5. **Data on the device is not encrypted.** The PIN stops a sibling from opening your profile in the app, but the family is stored as plain JSON in localStorage. Someone with the device and the browser's developer tools could read it. `auth.js` says honestly that it is "a device lock, not a cloud account". Clearing browser data also erases everything, which is why the backup code exists.
6. **The PDF can't show non-Latin scripts** (section 13). Names in Telugu or Chinese become `?`.
7. **Browser support varies.** Live captions need `SpeechRecognition`, which Firefox doesn't have. Recording needs `MediaRecorder` and microphone permission. The code checks for each and offers a fallback (type instead, use the phone's recorder), but the experience differs between browsers.
8. **Lots of globals and one very long click handler.** Any file can change `S`, and the order of script tags matters. The `switch` in the click listener has dozens of cases. This is easy to follow for a project this size, but harder to test piece by piece than code split into modules.
9. **Small rough edges.** Clip ids come from the current time (`'clip-' + Date.now().toString(36)`), so two recordings saved in the same millisecond would clash (very unlikely in practice). And after ticking an illness that comes in kinds, like diabetes, the line that tries to focus the age box (`js/app.js:1150`) looks for an id ending in `-age`, while `kindExtra()` names that box with the kind in it (`...-diabetes-unk-age`). So for those illnesses the cursor doesn't jump to the age box. Nothing breaks; you just tap the box yourself.

---

## Check your understanding

**1. When you tick an illness checkbox, which function actually changes the data, and what happens right after?**
The `change` listener on `document` reads the checkbox's `data-*` attributes and calls `addReport()` (from `risk.js`), which adds a report to `S.reports`. Then `save()` writes `S` to localStorage and `render()` redraws the page from the new state.

**2. Why does the code put one click listener on `document` instead of one on each button?**
Because `render()` replaces the page's HTML on every change, so per-button listeners would be thrown away each time. Clicks bubble up to `document`, which never gets replaced. The listener uses `closest('[data-action]')` to find which button was tapped, and reads its `data-*` attributes to know what it means.

**3. What would go wrong if a relative's name were put into a template literal without `esc()`?**
If the name contained HTML such as `<img src=x onerror=...>`, the browser would treat it as a real tag and could run code. That's cross-site scripting. `esc()` turns `<`, `>`, `&` and quotes into safe codes so the text is only displayed.

**4. Why are recordings kept in IndexedDB but the family in localStorage?**
localStorage only holds a few megabytes of text, which suits the family as JSON. Recordings are large binary Blobs, and IndexedDB can store real files and much more data, asynchronously.

**5. Typing in the Name box calls `save()` and `refreshTree()` but not `render()`. Why?**
A full re-render on every keystroke would rebuild the text box you're typing in, which could move the cursor or disturb the on-screen keyboard. Updating only the chart is enough. The full redraw happens on the `change` event when you leave the box.

**6. How can a doctor read the report from a link if it's never stored on a server?**
The report is packed into the link after `#report=`. Browsers never send the hash part of an address to the server. `boot()` reads `location.hash`, unpacks the report, and shows it read-only in "Doctor view", and `save()` skips saving for viewers.
