# Heirloom Health, explained: start here

This folder explains **every part of Heirloom Health's code**, file by file and function by function, in plain language. It's written so that you can understand how the app really works, explain it to judges, and change it yourself.

## How to read this

Read the chapters in order. Each one explains a group of related files, quotes the real code (with the file name and line number, like `js/app.js:7`, so you can open the file and look), and ends with **Check your understanding** questions.

| Chapter | Files | What you'll learn |
|---|---|---|
| **00 Start here** (this page) | none | The JavaScript you need to read the rest |
| **01 Page, content and offline** | `index.html`, `content.js`, `languages.js`, `config.js`, `sw.js`, `demo.html` | How the page is built and styled, where all the questions, illnesses and translations live, and how the app works offline |
| **02 The main app** | `app.js` | The heart of the app: state, screens, saving, recording, the PDF, and how every tap is handled |
| **03 Family and tree** | `family.js`, `layout.js` | How relatives and relationships are stored, and how the family tree is drawn |
| **04 Risk and timeline** | `risk.js`, `timeline.js` | The guideline rules, the risk ranking, "who to ask next", and the health timeline |
| **05 Answer finder and speech** | `extract.js`, `stt.js`, `stt-worker.js` | How "sugar" becomes diabetes, and how recordings become text |
| **06 Sharing, privacy and accounts** | `share.js`, `handoff.js`, `auth.js`, `media.js`, `legal.js`, `feedback.js` | Invite links, encryption, profiles and PINs, photos, the doctor hand-off |
| **07 Large mode, tour, stories, export, server** | `elder.js`, `tour.js`, `stories.js`, `fhir.js`, `server/` | Grandparent mode, the guided tour, family stories, the medical-records export, and the Cloudflare server |

There's also `../code-guide.md`, a shorter overview with practice questions and small changes to try.

---

## The JavaScript you need to know

The app uses modern JavaScript. These are the features you'll see over and over, each with an example from your app.

### Variables: `const` and `let`
`const` makes a name that can't be reassigned; `let` makes one that can.
```js
let ACCT = null, S = null;        // js/app.js: changes as you sign in and out
const SELF = 'self';              // js/family.js: never changes
```
`S` is the most important variable in the app: it holds the whole open family.

### Objects and arrays
An **object** groups named values; an **array** is an ordered list.
```js
{ id: 'p-k3x9', name: 'Lakshmi', sex: 'F', born: '1978', living: 'yes' }   // one person
S.people   // an array of person objects
```
You read a value with a dot (`p.name`) or brackets (`obj[lang]`). Brackets let the name come from a variable.

### Arrow functions
A short way to write a function. `x => x * 2` means "take x, give back x times 2".
```js
const byId = id => S.people.find(p => p.id === id);              // js/family.js:9
const tr = (obj, lang) => obj[lang] || obj.en;                   // js/app.js:13
```
`byId('p-k3x9')` finds the person with that id. `tr(question, 'te')` gives the Telugu text, or the English text (`obj.en`) if there's no Telugu.

### Array methods: `find`, `filter`, `map`, `some`
These loop over a list for you:
- `find(test)` returns **the first** item that passes the test.
- `filter(test)` returns **all** items that pass, as a new list.
- `map(change)` returns a new list with every item **changed**.
- `some(test)` returns **true** if **any** item passes.

```js
S.people.filter(p => p.living !== 'no')     // everyone who might still be living
S.people.map(p => p.name)                   // just the names
S.reports.some(r => r.cond === 'diabetes')  // did anyone report diabetes?
```

### `||`, `??` and `?.`
- `a || b` means "a, unless a is empty or false, then b".
- `a ?? b` means "a, unless a is missing (null/undefined), then b".
- `a?.b` means "a.b, but don't crash if a is missing; just give undefined".

### Template literals
Text in backticks can include `${...}`, which inserts a value. The app builds almost all of its screens this way, as HTML text:
```js
`<h1>${esc(me.name)}'s family</h1>`
```

### `esc()`: why it matters for security
```js
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));  // js/app.js:7
```
Whenever text that a person typed (a name, an illness) is put into HTML, it goes through `esc()` first. It replaces characters like `<` and `"` with safe codes, so if someone typed `<script>…`, it shows up as text instead of running as code. This is how the app prevents **code injection** (also called XSS).

### Regular expressions
The `/[&<>"']/g` above is a **regular expression**: a pattern for finding text. `[...]` means "any one of these characters", and `g` means "every match, not just the first". The answer finder uses many of these.

### Functions that wait: `async` and `await`
Some jobs take time: saving a recording, encrypting data, talking to the server. An `async` function can `await` them, pausing until they finish without freezing the page:
```js
const blob = await makePDF();   // wait for the PDF to be built, then continue
```

### The page (the DOM) and events
The browser turns HTML into objects you can find and change (the **DOM**):
```js
const $ = s => document.querySelector(s);   // js/app.js:8 — $('#main') finds the element with id="main"
```
When you tap something, the browser fires an **event**. Instead of attaching a listener to every button, the app uses **one listener for the whole page** (`document.addEventListener('click', …)` at `js/app.js:1154`) and checks which button was tapped by reading its `data-action="…"` attribute. This is called **event delegation**; Chapter 02 explains it in detail.

### The app's main loop
Almost everything in the app follows the same cycle:

1. **State:** the family and settings live in `S`.
2. **Render:** `render()` turns `S` into HTML and puts it on the page.
3. **Event:** you tap or type something.
4. **Update:** the event handler changes `S`.
5. **Save and redraw:** `save()` stores `S` in the browser, and `render()` draws the page again.

For example:
```js
function setTab(t) { S.tab = t; save(); render(); window.scrollTo({ top: 0 }); }   // js/app.js:1111
```
Tapping a tab sets `S.tab`, saves, redraws, and scrolls to the top. Once you see this pattern, the rest of `app.js` is much easier to follow.

### Files that share names (global scripts)
The app has no build tool and doesn't use JavaScript modules (except the speech worker). Each file is loaded with a `<script>` tag in `index.html`, in order, and they all share one global space. That's why `app.js` can call `kin()` from `family.js` or `guidelineCards()` from `risk.js`. It's also why the **order of the script tags matters**: a file can only use, at load time, things defined in files loaded before it.

---

Next: **01 Page, content and offline**.
