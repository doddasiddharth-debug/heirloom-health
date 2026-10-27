# Part 1: The page, the content, and offline support

This part covers the files that make up the "skeleton" and the "library" of Heirloom Health:

| File | Role in one sentence |
|---|---|
| `index.html` | The single page the browser loads: its head, the empty shell that JavaScript fills in, every style, and the list of scripts in the order they must run. |
| `manifest.webmanifest` | Tells a phone how to install the app on the home screen. |
| `js/config.js` | One setting: the address of the optional server. |
| `js/content.js` | All the words and data tables: languages, conditions, interview questions, the everyday-word dictionary, guideline sources, risk topics. |
| `js/languages.js` | Adds seven more languages to the tables in `content.js`. |
| `sw.js` | The service worker that lets the app work without internet. |
| `demo.html` | A separate page that shows the app inside a drawing of an iPhone, for recording a demo video. |

A quick reminder of how the app is built, because it shapes everything below: there is **no build step**. The browser downloads `index.html`, then each `.js` file as-is. The JavaScript files are "classic scripts" (not modules), so a `const` declared at the top of one file can be used by every file that runs after it. The files talk to each other through these shared global names.

---

## 1. `index.html`

### What it is for

This is the only HTML page of the real app. It is short on content and long on styles. Almost nothing you see on screen is written in this file directly. Instead, the file provides:

1. a `<head>` with information for browsers, phones and link previews,
2. a `<style>` block with every style rule (lines 21–552),
3. a small "shell" of empty containers (lines 556–574),
4. a list of `<script>` tags (lines 576–597) that load the JavaScript, which then draws each screen into the shell.

This design is called an **app shell**: the HTML is a frame, and JavaScript fills the frame with whatever screen is active (family tree, interview, risks, doctor report).

### 1.1 The `<head>`

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
`index.html:5`

- `width=device-width, initial-scale=1` tells a phone browser: "this page is designed for small screens, don't pretend to be a 980-pixel desktop and shrink everything." Without it the app would look tiny on a phone.
- `viewport-fit=cover` lets the page draw all the way to the rounded corners and under the notch of modern phones. The CSS then uses `env(safe-area-inset-…)` (explained below) to keep buttons out of those areas.

Other parts of the head, in order:

- **`<title>` and `<meta name="description">`** (lines 6–7): the tab name and the text search engines show. The description lists all eleven languages.
- **`<meta name="theme-color" content="#0E7C86">`** (line 8): colors the phone's browser bar in the app's teal. The same color is the CSS variable `--primary` and the manifest's `theme_color`, so all three match.
- **`og:` tags** (lines 9–12): "Open Graph" tags. When someone pastes the link in a chat app, these give the preview card its title, text and picture (`icons/og.png`).
- **`<link rel="manifest">`** (line 13): points to `manifest.webmanifest` (section 2), which makes the app installable.
- **Icons** (lines 14–15): an SVG icon for browser tabs and a 180-pixel PNG for iPhones (`apple-touch-icon`). Lines 16–17 are Apple-specific settings for running full-screen when installed.
- **Fonts** (lines 18–20). `preconnect` tells the browser to open a connection to Google Fonts early, to save time. Line 20 then loads several font families in one request:
  - *Lexend* for normal text, *Bricolage Grotesque* for headings;
  - *Noto Sans* fonts for Devanagari (Hindi), Telugu, Tamil, Kannada, Bengali, Gujarati, Simplified Chinese, and *Noto Nastaliq Urdu*.

  Why so many? A normal font has no letters for Telugu or Tamil. Without these the browser would fall back to whatever the phone has, which can look broken or be missing. `display=swap` means "show text immediately in a fallback font, then swap in the nice font when it arrives", so text is never invisible while fonts download.

### 1.2 The CSS, grouped by purpose

The `<style>` block is about 530 lines. Rather than going rule by rule, here are the main ideas and where they live.

#### A. Design tokens (CSS custom properties)

```css
:root {
  --bg: #FFFFFF; --panel: #FFFFFF; --soft: #F5F5F9; --ink: #33324A; --strong: #1E1D33; --muted: #6E6C86; --line: #E6E5EF;
  --primary: #0E7C86; --primary-dk: #08585F; --primary-soft: #DDF1F2;
  --accent: #F5A524; --accent-dk: #A8680A; --accent-soft: #FDF0D8;
```
`index.html:25–28`

**Concept: CSS custom properties (variables).** A name starting with `--` stores a value. `:root` means "the whole page", so these are available everywhere. Any rule can use them with `var(--primary)`. Change the value in one place and every button, border and highlight using it changes too. Values stored this way are called **design tokens**: named decisions ("our main color") instead of raw numbers scattered through the file.

The palette has a clear pattern. Each color family comes in three strengths:

| Family | Meaning in the app | Example use |
|---|---|---|
| `--primary` (teal) | main actions, selected things | primary buttons, selected tab |
| `--accent` (marigold) | things to discuss, family-specific | "discuss" findings, gold timeline dots |
| `--leaf` (green) | done, "about average" | progress bar, average risk |
| `--rose` (red-pink) | alerts, "act" | high risk, recording button |
| `--iris` (purple) | language help | pronunciation lines, follow-up questions |

The plain name is the full color, `-dk` is a darker version for text on light backgrounds (darker text is easier to read), and `-soft` is a pale tint for backgrounds. Font stacks are tokens too (`--f`, `--f-display`, `--f-te`, `--f-hi`, lines 33–36). A font stack is a list: the browser uses the first font it has.

The comment on lines 22–24 states that the app is "Light theme only, by design", and line 37 (`color-scheme: light`) tells the browser not to darken form controls.

#### B. Base rules and small helpers (lines 40–57)

- `* { box-sizing: border-box; }` (line 40): makes `width` include padding and border. Without it, a 100%-wide input with padding would stick out of its box.
- `[hidden] { display: none !important; }` (line 45): the HTML `hidden` attribute always wins. JavaScript can hide things just by adding `hidden` (the toast at line 574 starts hidden this way).
- `body` (line 46) sets the base font: weight 400, 16 px, line height 1.55, using `var(--f)`.
- Headings use the display font, weight 800, and `text-wrap: balance` (line 47), which spreads a two-line heading evenly instead of leaving one lonely word on line two.
- Small utility classes: `.muted`, `.small`, `.eyebrow` (small uppercase labels), `.num` (digits all the same width so columns of numbers line up).
- `.sr` (line 56) is "screen-reader only": text that is invisible on screen but still read aloud by screen readers for blind users.
- `:focus-visible` (line 57) draws a thick teal outline around whatever has keyboard focus, but not after a mouse click. This matters for people who navigate with a keyboard.

**Safe areas.** Line 42 adds padding equal to `env(safe-area-inset-top, 0px)` and `env(safe-area-inset-bottom, 0px)`. **Concept: `env()`** reads values the device provides. On an iPhone, the safe-area insets are the heights of the notch and the home-bar strip. The `0px` after the comma is a fallback for devices that don't have them. This pairs with `viewport-fit=cover` in the head.

#### C. The layout system: the app shell

```css
.app { display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: 100%; }
.side { position: sticky; top: env(safe-area-inset-top, 0px); align-self: start; height: 100vh; ...
```
`index.html:60–61`

**Concept: CSS Grid.** `display: grid` turns a box into a grid. `grid-template-columns: 240px minmax(0, 1fr)` creates two columns: a 240-pixel sidebar, and a main column that takes the rest (`1fr` = "one share of the leftover space").

Why `minmax(0, 1fr)` and not just `1fr`? A plain `1fr` column refuses to get narrower than its widest content. One long word or a wide table could push the whole page wider than the screen. `minmax(0, 1fr)` allows the column to shrink to zero, so content wraps or scrolls instead. You will see `minmax(0, 1fr)` and `min-width: 0` all over this file for the same reason.

**Concept: `position: sticky`.** The sidebar scrolls normally until it reaches the top of the window, then stays put. With `height: 100vh` (100% of the viewport height), the nav is always visible on a laptop.

Inside the main column, `.page` (line 74) is limited to 1240 px wide and centered (`margin: 0 auto`), with a 20 px gap between cards. Most screens are a single column of cards. That keeps one thing in focus at a time.

#### D. Responsive design: the phone layout

**Concept: media queries.** `@media (max-width: 860px) { ... }` means "only apply these rules when the window is 860 px wide or less". This is how one stylesheet serves both laptops and phones.

```css
@media (max-width: 860px) {
  .app { grid-template-columns: minmax(0, 1fr); }
  .side { position: fixed; inset: auto 0 0 0; top: auto; height: auto; z-index: 20; flex-direction: row; ...
  .side .logo, .side .privacy, .side .acct { display: none; }
  .nav { grid-template-columns: repeat(4, 1fr); width: 100%; gap: 2px; }
```
`index.html:75–79`

On a phone:

1. The grid becomes one column (line 76).
2. The sidebar becomes a **bottom tab bar**: `position: fixed` with `inset: auto 0 0 0` pins it to the bottom edge, full width (line 77). `z-index: 20` keeps it above the page content.
3. The logo, privacy box and account chip are hidden (line 78), since there's no room.
4. The four nav buttons sit side by side in four equal columns (line 79), with the icon above the label (line 80).
5. `.mtop` (a top bar that is `display: none` on wide screens, line 72) is shown (line 82). It holds the logo and account chip instead.
6. The content gets 110 px of bottom padding plus the safe area (line 83), so the last card is not hidden behind the tab bar.

This is a common mobile pattern: the thumb can reach a bottom bar easily.

Other breakpoints are smaller adjustments:

| Width | What changes |
|---|---|
| 1100 px (line 130) | The family page's two columns (tree + editor panel) stack into one. |
| 860 px (lines 234, 378–383, 535) | Toast moves up above the tab bar; tree filter pills scroll sideways; tour card spans the screen. |
| 600 px (lines 116, 372) | The banner's button moves to its own row; the zoom hint is hidden. |
| 520 px (lines 203, 282, 442) | Interview footer buttons share the width; speech-bubble arrow hidden; Yes/No/Don't know buttons stack. |
| 480 px (line 235) | Two-column forms become one column; stat numbers shrink; cards get less padding. |

Line 537 combines two conditions, `(max-width: 860px) and (max-height: 760px)`, to shrink the tour card on short phones so it doesn't cover the thing it is pointing at.

#### E. Component styles

These are the reusable building blocks. Each JavaScript screen uses the same class names, so the look is consistent.

**Buttons (lines 87–98).** `.btn` is a pill shape (`border-radius: 999px`) with a solid shadow underneath (`box-shadow: 0 3px 0 var(--line)`). When pressed:

```css
.btn:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 0 0 transparent; }
```
`index.html:88`

The button moves down 3 px and the shadow disappears, so it looks like a real key being pushed. Variants are added as a second class: `.btn.primary` (teal), `.btn.iris`, `.btn.danger`, `.btn.danger.armed` (red, used for a "tap again to confirm" delete), `.btn.rec-live` (red while recording), `.btn.sm`, `.btn.wide`.

**Cards and inputs (lines 101–111).** `.card` is a white box with a 2 px border and 20 px rounded corners. Inputs get the soft grey background and turn teal-bordered when focused. `.pill-btn[aria-pressed="true"]` (line 110) shows the **attribute selector** pattern: the style depends on an ARIA attribute. ARIA attributes describe state to screen readers ("this toggle is pressed"). By styling the ARIA attribute directly, the visual state and the accessible state can never disagree. The same trick is used for tabs (`aria-selected="true"`, line 68), chips (line 255) and elder-mode buttons (lines 423–425).

**Stat tiles (lines 119–124).**

```css
.stat { background: color-mix(in srgb, var(--c) 12%, var(--panel)); ...
```
`index.html:120`

`--c` is not defined in `:root`. JavaScript sets it on each tile, for example `style="--c:var(--primary)"` in `js/app.js:408`. **Concept: `color-mix()`** blends two colors, here 12% of the tile's color with white, giving a pale tint. One rule, many colors.

**Condition tiles (lines 153–169).** These are the tappable "Did they have diabetes?" cards. Two clever bits:

```css
.cond:has(input[type=checkbox]:focus-visible) { outline: 3px solid var(--primary); outline-offset: 2px; }
```
`index.html:156`

**Concept: `:has()`** selects a parent based on what is inside it. The real checkbox is hidden inside the tile. When it has keyboard focus, the whole tile gets the outline.

```css
.cond.on .tick::after { content: ""; width: 7px; height: 12px; border: solid var(--on); border-width: 0 3px 3px 0; transform: translateY(-2px) rotate(45deg); }
```
`index.html:161`

The checkmark is drawn with CSS only: a small box with only its right and bottom borders, rotated 45°. **Concept: `::before` / `::after`** are "pseudo-elements": extra boxes CSS can add before or after an element's content, without extra HTML.

**Interview screen (lines 174–217).** The question appears in a speech bubble next to a mascot. The bubble's little pointer (lines 187–189) is made with the "border triangle" trick: a zero-size box with one colored border looks like a triangle. Two are stacked (grey, then white slightly smaller) to make an outlined triangle. Language-specific classes `.say.lang-te` and `.say.lang-hi` switch to the Telugu or Devanagari font. `.roman` (line 193) styles the pronunciation line in italic purple. The toggle switch `.switch` (lines 178–182) uses `appearance: none` to remove the browser's checkbox look and redraws it as a sliding pill with `::after` as the knob.

**Doctor report and risks (lines 220–304, 340–364).** Findings are list items with a level class: `.flags li.act` (rose), `.flags li.discuss` (marigold), `.flags li.note` (teal) (lines 286–294). Risk cards use `.risk.high`, `.risk.moderate`, `.risk.average` with matching border, badge and "meter" bar colors (lines 342–358). The JavaScript only needs to choose the right class name; the CSS handles all the colors.

**Pedigree chart (lines 131–147, 240–242, 366–383, 392).** The family tree is an SVG image drawn by `js/layout.js`. CSS can style SVG too, using `fill` (inside color) and `stroke` (outline). For example `svg .sym` (the square/circle symbols), `svg .ln` (connecting lines), and `svg .adopt { stroke-dasharray: 5 4; }` (dashed lines for adoption, as in standard pedigree notation). `#tree-svg` (line 373) is a scrollable, draggable area with `cursor: grab`.

**Pop-ups and toasts (lines 233, 451–463).** `.modal-back` covers the whole screen (`position: fixed; inset: 0`) with a dark see-through layer and centers the `.modal` box using `display: grid; place-items: center`. The `.toast` (line 233) is the small message at the bottom ("Saved"), centered with `left: 50%; transform: translateX(-50%)`.

**Elder mode (lines 405–442).** Large tap-to-answer mode for grandparents. Everything is bigger: Yes/No buttons at least 92 px tall (line 419), number pad buttons 72 px tall. Text size uses **`clamp()`**:

```css
.e-q { font-size: clamp(1.6rem, 5vw, 2.3rem); ...
```
`index.html:414`

`clamp(min, preferred, max)` means "5% of the screen width, but never smaller than 1.6rem or bigger than 2.3rem". The text grows with the screen but stays in a sensible range. Yes, No and Don't know have their own colors (green, rose, grey) so they can be told apart without reading.

**Other components.** Account chip and sign-in page (lines 307–337), interview mode cards (400–403), question voices (445–449), menu and legal pages (475–497), the health timeline (499–513, with a vertical line drawn by `li::before`), the guided tour (521–537, `.tour-target` puts a glowing outline on the highlighted element) and family stories (538–551).

#### F. Page-wide states set by JavaScript

Some rules depend on a class on `<body>`:

```css
body.signed-out .app { grid-template-columns: minmax(0, 1fr); }
body.signed-out .side, body.signed-out .mtop { display: none; }
```
`index.html:313–314`

`js/app.js:1053–1055` turns these classes on and off (`signed-out`, `elder-on`, `solo`). Each one hides the navigation for a special situation: the sign-in page, elder mode (a grandparent should not wander into other tabs), and `solo` (a relative answering through an invite link, or a doctor viewing a shared report). `body.touring` (line 536) adds extra bottom padding while the tour card is open. This is a simple way to switch whole layouts with one class.

#### G. Accessibility, motion and right-to-left text

- **Reduced motion.** Every animation is wrapped in `@media (prefers-reduced-motion: no-preference)`, for example the blinking recording dot on line 208. Some people get dizzy from motion and turn it off in their phone settings. This query means "only animate if the user hasn't asked for less motion". `@keyframes` defines the steps of an animation (here: at 50%, fade to 25% opacity).
- **Right-to-left.** Urdu is written right to left. `[dir="rtl"] { text-align: right; }` (line 470) aligns such text correctly. `.lang-ur { line-height: 2; }` (line 472) gives the tall Nastaliq script room so lines don't overlap.
- **Readable text.** The `-dk` color variants are used for text on tinted backgrounds for contrast.

### 1.3 The shell markup

```html
<div class="app">
  <aside class="side">
    <div class="logo" id="logo-side"></div>
    <nav class="nav" role="tablist" aria-label="Sections">
      <button role="tab" data-tab="tree" id="tab-tree"></button>
      <button role="tab" data-tab="interview" id="tab-interview"></button>
      <button role="tab" data-tab="risks" id="tab-risks"></button>
      <button role="tab" data-tab="doctor" id="tab-doctor"></button>
    </nav>
```
`index.html:556–564`

The rest of the shell (lines 565–574):

- `#acct-side` – the account chip (who is signed in).
- `.privacy` – the "Private by design" note, with `#side-links` for menu links.
- `.content` holds `#logo-top` (the phone top bar) and **`#main`**, the container every screen is drawn into.
- `#modal-root` – where pop-up panels are inserted.
- `#toast` – has `role="status" aria-live="polite"`, which tells screen readers to read new messages aloud when they appear, without interrupting.

Notice the buttons and logo are **empty**. `js/app.js:1032–1038` fills them (icons, labels, logo, account chip) every time the screen is redrawn. Why? The labels and the selected tab (`aria-selected`) change with the app state, so it's simpler to have one piece of JavaScript produce them than to keep HTML and JavaScript in sync. `data-tab="tree"` is a **data attribute**: a custom label JavaScript can read to know which tab a button means.

`role="tablist"` / `role="tab"` are ARIA roles telling assistive technology that these four buttons work as tabs.

### 1.4 Script loading order, and why it matters

```html
<script src="vendor/jspdf.umd.min.js" defer></script>
<script src="vendor/qrcode.js" defer></script>
<script src="js/config.js"></script>
<script src="js/content.js"></script>
<script src="js/stories.js"></script>
<script src="js/languages.js"></script>
<script src="js/family.js"></script>
...
<script src="js/fhir.js"></script>
<script src="js/app.js"></script>
```
`index.html:576–597` (shortened in the middle)

**How classic scripts run.** A `<script src>` without `defer` or `async` is downloaded and run *in the order it appears*, and the browser waits for it before moving on. A top-level `const` or `function` in one classic script becomes a global name that every *later* script can see (they share one global scope). There are no `import` statements, so **the order of these tags is the only thing that wires the files together.**

The rules the order follows:

1. **`config.js` first.** It only sets `window.CONFIG`, which several files read.
2. **`content.js` early.** It declares the data tables (`LANGS`, `CONDS`, `Q`…) that almost everything uses.
3. **`stories.js` before `languages.js`.** `languages.js` runs its code immediately and *changes* the tables. It adds translations to `Q`, `CONDS` and others, and also to `STORY_PROMPTS`, which is declared in `stories.js` (`js/stories.js:11`). If `languages.js` ran before `content.js`, it would crash with "LANGS is not defined". If it ran before `stories.js`, a safety check (`typeof STORY_PROMPTS !== 'undefined'`, `js/languages.js:636`) would quietly skip the stories and they would stay English-only.
4. **The feature files in the middle** (`family.js` … `fhir.js`) mostly define functions. A function can call another file's function as long as the call happens *later*, when the user does something, after every file has loaded. That's why their exact order matters less.
5. **`app.js` last.** It is the conductor. At the end it calls `boot()` (`js/app.js:1381`), which draws the first screen. By then every other file has loaded, so everything it needs exists.
6. **Scripts at the end of `<body>`.** By the time they run, the shell elements above (`#main`, `#toast`…) already exist, so `boot()` can find them.

**Concept: `defer`.** The two vendor libraries (jsPDF for PDF export, qrcode-generator for QR codes) have `defer`. A deferred script downloads in the background and runs only *after* the whole page has been read, which here means after all the normal scripts, including `app.js`. That's fine because they are only used when the user taps a button (for example `js/app.js:917` reads `window.jspdf || {}` at PDF time). Deferring them means these larger files don't hold up the first screen.

---

## 2. `manifest.webmanifest`

### What it is for

A **web app manifest** is a small JSON file that turns a website into an installable app (a "Progressive Web App"). When a user picks "Add to Home Screen", the phone reads this file to know the app's name, icon and how to open it.

### Walkthrough

```json
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
```
`manifest.webmanifest:5–7`

- `name` / `short_name` (lines 2–3): "Heirloom Health" in full, "Heirloom" under the home-screen icon where space is short.
- `start_url: "./"`: open the folder the manifest is in. A relative path means it works whether the site is at the root of a domain or in a GitHub Pages sub-folder.
- `scope: "./"`: which pages count as "inside the app".
- `display: "standalone"`: open without the browser's address bar, like a native app.
- `background_color` and `theme_color` (lines 8–9): the splash screen and status bar colors. The theme color matches `--primary`.
- `icons` (lines 10–15): PNGs at 192 and 512 px, an SVG for any size, and one marked:

```json
{ "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
```
`manifest.webmanifest:13`

A **maskable** icon has extra padding so Android can crop it into a circle, squircle or other shape without cutting off the logo.

---

## 3. `js/config.js`

### What it is for

The one place to set the address of the optional server (the Cloudflare Worker in `server/`).

```js
window.CONFIG = {
  apiBase: 'https://heirloom-health.dodda-siddharth.workers.dev',
  // GitHub repository for feedback issues when there is no server.
  repo: 'doddasiddharth-debug/heirloom-health',
};
```
`js/config.js:5–9`

- **`window.CONFIG`.** Assigning to `window` creates a global explicitly. Other files read it, for example `js/extract.js:282` builds `` `${CONFIG.apiBase}/api/extract` ``, `js/feedback.js:39` posts feedback, and `js/share.js:213` uses it for cloud sync.
- **`apiBase`** is the server's address. The comment on lines 1–4 explains that it can be left empty: the app still works on the device, but AI answer-finding on the website, server speech-to-text, and cloud sync won't.
- **`repo`** is used to build a "new GitHub issue" link when feedback can't go to the server (`js/feedback.js:50`).

**Why a separate file?** Someone who copies the project and runs their own server only has to change this one line, without touching the app's code.

---

## 4. `js/content.js`

### What it is for

The first two comment lines say it plainly:

> Everything a translator or reviewer might need to check lives in this one file.

`content.js` holds almost no logic. It is data: words, questions, lists, and the medical sources. Keeping data apart from code means a translator or a doctor can review it without reading the program, and code files stay focused on behavior.

The file starts with `'use strict';` (line 3). **Concept: strict mode** makes JavaScript stricter about mistakes, such as turning a typo'd variable name into an error instead of silently creating a new global.

### 4.1 `LANGS`: the base languages

```js
const LANGS = [
  { id: 'en', label: 'English', speech: 'en-US' },
  { id: 'te', label: 'తెలుగు · Telugu', speech: 'te-IN', roman: true },
```
`js/content.js:5–7`

Each language has:
- `id`: a short code used as a key in every other table (`te` for Telugu).
- `label`: shown in the language picker, in its own script first.
- `speech`: the code the browser's speech recognition and text-to-speech need (`js/app.js:226`, `js/app.js:1326`).
- `roman: true`: this language has a pronunciation line in Latin letters. The interview screen only offers "Show pronunciation" when this is true (`js/app.js:627`).

Only four languages are here. `languages.js` adds seven more (section 5).

### 4.2 `CONDS` and `COND`: the conditions

**Shape of one entry:**

```js
  { id: 'stroke', short: 'Stroke', en: 'Stroke', te: 'పక్షవాతం (స్ట్రోక్)', te_r: 'Pakshavaatam (stroke)', hi: 'लकवा (स्ट्रोक)', hi_r: 'Lakwa (stroke)', es: 'Derrame cerebral' },
```
`js/content.js:14`

| Field | Meaning |
|---|---|
| `id` | the internal name, saved with each answer (`'stroke'`) |
| `short` | a tiny label for the crowded pedigree chart |
| `en`, `te`, `hi`, `es` | the condition name in each language |
| `te_r`, `hi_r` | the pronunciation line ("_r" for romanized) |
| `more: true` | (some entries) a less common condition, shown under "Less common" |
| `free: true`, `report` | (only `other`) the "Something else" entry where relatives use their own words |

The naming convention is the key idea of the whole file: **text for language X is stored under key `X`, and its pronunciation under `X_r`.** Every table follows it. That's why a tiny helper can look up any text:

```js
const tr = (obj, lang) => obj[lang] || obj.en;
```
`js/app.js:13`

"Give me this object's text in `lang`, or English if there's no translation." The `||` operator returns the right side when the left side is empty or missing.

Notice the translations often start with the everyday word, with the formal term in brackets: Telugu `షుగర్ (మధుమేహం)` is "Sugar (diabetes)" (line 17). That matches how many elders actually talk.

There are 23 named conditions plus `other`. Readers: `js/app.js:352–354` draws the tiles, putting `more` conditions in a second group; `js/elder.js:128–131` builds the elder-mode cards the same way; `js/extract.js:256` lists allowed condition ids for the AI.

```js
const COND = Object.fromEntries(CONDS.map(c => [c.id, c]));
```
`js/content.js:42`

**Concept: `Object.fromEntries`.** `CONDS.map(c => [c.id, c])` turns the list into pairs like `['stroke', {…}]`. `Object.fromEntries` turns pairs into an object: `{ heart: {…}, stroke: {…}, … }`. Now `COND.stroke` or `COND[id]` finds an entry instantly, without searching the list. The list (`CONDS`) keeps the display order; the lookup object (`COND`) gives fast access by id. The same pattern makes `CTYPE` (line 71) and `CHECK` (line 354).

### 4.3 `CANCER_TYPES`, `SUBTYPES` and the naming helpers

`CANCER_TYPES` (lines 45–70) has the same shape as `CONDS`, with two extras:

```js
  { id: 'colorectal', short: 'Colon ca', en: 'Colon or rectum', te: 'పెద్దప్రేగు', te_r: 'Peddapregu', hi: 'आंत (कोलन)', hi_r: 'Aant (colon)', es: 'Colon o recto', lynch: true },
```
`js/content.js:49`

- `lynch: true` marks the cancers counted by the Amsterdam II criteria for Lynch syndrome (an inherited cancer condition). `js/risk.js:105` collects these ids with `CANCER_TYPES.filter(t => t.lynch)`. Because the medical fact lives in the data, a doctor reviewer could change it without touching the rule code.
- `name` (on some entries) is the full report name, such as `'Uterine cancer'`.

`isBreast` (line 72) is a one-line helper, `t === 'breast' || t === 'breast2'`, because "breast, both sides" is stored as its own type but should count as breast cancer (used in `js/risk.js`).

`SUBTYPES` (lines 75–115) is an object that maps a condition to its "kinds": `cancer` uses `CANCER_TYPES`, `diabetes` has type 2 / type 1 / gestational, `heart` has heart attack / cardiomyopathy / rhythm / failure / from birth, and so on for `kidney`, `mental`, `blood` and `liver`. The comment on lines 73–74 explains why: type 1 and type 2 diabetes mean different things for the risk rules.

```js
const subtypeOf = (cond, type) => type && SUBTYPES[cond]?.find(t => t.id === type);
```
`js/content.js:116`

**Concept: `?.` (optional chaining).** `SUBTYPES[cond]?.find(...)` means "if `SUBTYPES[cond]` exists, call `.find` on it; otherwise give `undefined` instead of crashing". Conditions like `asthma` have no kinds, so this avoids an error.

```js
function factName(cond, type) {
  if (cond === 'other') return type || 'Another condition, name unknown';
  const t = subtypeOf(cond, type);
  if (cond !== 'cancer') return t ? t.name : COND[cond].en;
  if (!type) return 'Cancer, kind unknown';
  if (type === 'other') return 'Cancer, another kind';
  return t ? t.name || `${t.en.replace(' (womb)', '')} cancer` : 'Cancer';
}
```
`js/content.js:117–124`

`factName` turns a saved answer (condition + kind) into a readable English name for reports. Step by step:
1. For "Something else", the relative's own words were stored as the `type`, so just return them.
2. For other non-cancer conditions, use the kind's `name` if a kind was chosen, otherwise the condition's English name.
3. For cancer with no kind, or "another kind", return a clear phrase.
4. Otherwise use the type's `name`, or build one from its English label: "Ovary" + " cancer". The `.replace(' (womb)', '')` tidies one label.

`factShort` (line 125) does the same for the tiny chart labels, cutting long free-text names to 15 characters plus "…". Both are used widely (`app.js`, `risk.js`, `layout.js`, `handoff.js`, `fhir.js`, `extract.js`), which is why they live with the data rather than in one feature file.

### 4.4 `Q`, `FOLLOW`, `STEPS`: the interview script

`Q` (lines 128–265) holds the interview questions, keyed by name. **Shape:**

```js
  born: {
    en: 'What year were you born?',
    te: 'మీరు ఏ సంవత్సరంలో పుట్టారు?', te_r: 'Meeru ee samvatsaramlo puttaaru?',
    hi: 'आपका जन्म किस साल में हुआ था?', hi_r: 'Aapka janm kis saal mein hua tha?',
    es: '¿En qué año nació?',
  },
```
`js/content.js:137–142`

`FOLLOW` (lines 268–318) has the same shape and holds follow-up questions the app adds when an answer is incomplete: `other_what`, `kind`, `cancer_type` ("What kind of cancer was it?"), `age_you`, `age_them`, `death_cause`, `death_age`. Read by `js/app.js` and `js/elder.js`.

`Q` only holds *words*. The **order** and **type** of each step are in `STEPS`:

```js
const STEPS = [
  { k: 'intro', type: 'intro', tip: 'Sit together and ask permission first. Some memories are painful, so it is fine to stop and come back another day.' },
  { k: 'born', type: 'born', who: 'self' },
  { k: 'conds_self', type: 'conds', who: 'self', tip: 'Read each illness out loud and tap the ones they say yes to. Many elders call diabetes "sugar" and high blood pressure "BP".' },
```
`js/content.js:320–323`

| Field | Meaning |
|---|---|
| `k` | which question in `Q` to show |
| `type` | which kind of answer area to draw: `intro`, `born`, `conds` (condition tiles), `notes`, `vital` (living? age at death?), `siblings`, `children`, `check` (whole-family question), `closing` |
| `who` | whose answers are being saved: `self` (the relative being interviewed), `mother`, `father` |
| `tip` | (optional) coaching advice for the teen, in English |

`js/app.js:588` reads it like this: `st = STEPS[step], q = Q[st.k]`. Splitting "what to say" (`Q`) from "how the step behaves" (`STEPS`) means a translator only touches `Q`, and reordering the interview only touches `STEPS`.

`FAMILY_CHECKS` (lines 344–353) gives a short English name for each whole-family question (`{ id: 'sudden', en: 'Sudden death before 50, fainting with exercise, or drowning' }`) for the doctor report. It is read by `js/app.js:850` and `js/fhir.js:187`; `CHECK` (line 354) is its lookup object, used in `js/share.js:46`.

### 4.5 `ELDER_TEXT`: short phrases for elder mode

```js
  yes: { en: 'Yes', te: 'అవును', te_r: 'Avunu', hi: 'हाँ', hi_r: 'Haan', es: 'Sí' },
```
`js/content.js:358`

Large tap-to-answer mode needs very short phrases: Yes, No, Don't know, Next, Back, "Did your mother have this?", and so on (lines 357–383). Same key pattern. Read by `js/elder.js` and `js/handoff.js`.

### 4.6 The answer-finder vocabulary: `LEXICON` and friends

When the teen types or dictates what a relative said, `js/extract.js` searches the text for illness words. `content.js` provides the word lists. **Shape of a `LEXICON` entry:**

```js
  { cond: 'stroke', words: ['stroke', 'paralysis', 'పక్షవాతం', 'స్ట్రోక్', 'pakshavaatam', 'pakshavatam', 'लकवा', 'लकवे', 'स्ट्रोक', 'lakwa', 'lakva', 'derrame', 'embolia', 'ictus'] },
```
`js/content.js:390`

One condition id, and a list of the words people actually say for it: English, Telugu and Hindi in their scripts, romanized spellings (because speech-to-text and teens type them different ways), and Spanish. This is how "sugar" or "BP" can become `diabetes` or `bp`.

The other lists (lines 413–515) help the finder understand a sentence, not just spot words:

| List | Purpose |
|---|---|
| `CANCER_LEXICON` | cancer kinds, only matched when the sentence also mentions cancer (`{ type: 'breast', words: [...] }`) |
| `DEATH_WORDS`, `LIVING_WORDS` | "passed away", "still alive" |
| `NEG_WORDS`, `NEG_BEFORE`, `NEG_STOPS` | "no" words, and where "no" applies ("no diabetes" vs. "no problems until he got diabetes") |
| `BUT_WORDS`, `AND_WORDS` | where one part of a sentence ends and another begins |
| `KIN_WORDS` | words for mother and father, with `not` lists of look-alikes (Telugu అమ్మమ్మ, grandmother, starts with అమ్మ, mother) |
| `KIN_OF`, `KIN_OF_ENDS`, `SELF_WORDS`, `PRONOUNS` | who a sentence is about ("mom's dad", "I", "she") |
| `NUM_WORDS`, `NUM_UNITS`, `NUM_TEENS` | spoken numbers in several languages, so "forties" becomes 45 |
| `NUM_LABELS`, `YEAR_UNITS`, `FOR_BEFORE`… | numbers that are *not* ages ("type 2", "for ten years") |
| `FALSE_FRIENDS` | words that contain an illness word but mean something else (Hindi दिलचस्प, "interesting", contains दिल, "heart") |

```js
const KIN_WORDS = {
  mother: { stems: ['mother', 'mom', 'mum', 'amma', 'అమ్మ', 'माँ', 'मां', 'माता', 'mamá', 'madre'], not: ['ammamma', 'అమ్మమ్మ', 'అమ్మాయి', 'mother-in-law', 'मांग', 'माँग', 'मांस', 'माँस'] },
```
`js/content.js:451–452`

All of these are read by `js/extract.js` (part of another section of this guide). The point here is the design: the hard-won language knowledge is data that a fluent speaker can check and extend, and the matching logic stays in one place.

### 4.7 `SOURCES`: the guideline citations

**Shape:**

```js
  usmstf: { short: 'US Multi-Society Task Force on Colorectal Cancer, 2017', full: 'Rex DK, et al. Colorectal cancer screening: recommendations for physicians and patients from the U.S. Multi-Society Task Force on Colorectal Cancer. Gastroenterology. 2017;153:307-323.', url: 'https://doi.org/10.1053/j.gastro.2017.05.013' },
```
`js/content.js:519`

Each source has a key, a `short` label shown next to a finding, a `full` citation for the reference list, and a `url`. Risk rules refer to a source by key (like `'usmstf'`), and the report looks it up: `SOURCES[a.source].short` (`js/app.js:692`) and the PDF prints `SOURCES[s].full` and `.url` (`js/app.js:999`). `js/timeline.js` uses them too. So every piece of advice can point to where it came from, and a citation is written only once.

A few sources are added later in the file, right next to the data that uses them, for example:

```js
SOURCES.scheuner = { short: 'Scheuner et al., family history risk method, 1997', ...
```
`js/content.js:584` (shortened)

This works because `const` stops you from *replacing* `SOURCES`, but you can still add properties to the object it points to.

### 4.8 `RISK_TOPICS`: what the "My risks" tab scores

**Shape:**

```js
  { key: 'heart', cond: 'heart', types: ['', 'attack', 'failure'], name: 'Heart disease', early: p => p.sex === 'F' ? 65 : 55, tip: 'Ask for a cholesterol check, stay active most days, and skip smoking and vaping.' },
```
`js/content.js:545`

| Field | Meaning |
|---|---|
| `key` | the topic's own id |
| `cond` | which condition's answers count |
| `types` | (optional) which kinds count. `''` means "kind not given". Here, heart attack or failure counts, but rhythm problems are a separate topic (`inheritedheart`, line 567). |
| `sex` | (optional) only shown for this sex (ovarian: `'F'`, prostate: `'M'`) |
| `name` | the title shown to the user |
| `early` | a **function** that returns the age before which a diagnosis counts as "early" |
| `tip` | general, friendly advice |

Why is `early` a function and not a number? Because for heart disease the answer depends on the relative: `p => p.sex === 'F' ? 65 : 55` means "65 for women, 55 for men". **Concept: arrow functions and the ternary.** `p => …` is a short way to write a function with one input `p`. `a ? b : c` means "if a, then b, else c". The other topics just use `() => 50` and so on, so the code that calls them can treat all topics the same way. That call is in `js/risk.js:378`: `x.age < t.early(x.p)`.

There are 38 topics (lines 545–582). They are read by `js/risk.js` (scoring) and `js/app.js` (display).

### 4.9 `ANCESTRIES` and `ANCESTRY_RULES`

`ANCESTRIES` (lines 590–602) is the list of choices for the ancestry question, such as `{ id: 'southasian', en: 'South Asian', hint: 'Indian, Pakistani, Bangladeshi, Sri Lankan, Nepali' }`.

`ANCESTRY_RULES` (lines 603–616) are guidelines where ancestry alone matters. **Shape:**

```js
  { topic: 'heart', groups: ['southasian'], source: 'accaha', level: 'discuss', title: 'South Asian ancestry and heart disease',
    text: 'Heart guidelines count South Asian ancestry as a "risk-enhancing factor" by itself, because heart disease tends to start earlier in South Asian families. Ask your doctor to note it on your record.' },
```
`js/content.js:604–605`

- `topic` links to a `RISK_TOPICS` key.
- `groups` lists the ancestry ids it covers.
- `source` links to a `SOURCES` key.
- `level` is how serious it is (`discuss` or `note`), which becomes a CSS class color in the report.
- `title` and `text` are what the user reads.

`js/risk.js:297–300` filters these rules by the family's chosen ancestries. Notice how the tables connect by ids: rule → topic → condition, and rule → source. The ids are the glue.

---

## 5. `js/languages.js`

### What it is for

This file adds seven more languages (Tamil, Kannada, Bengali, Gujarati, Urdu, Simplified Chinese, Vietnamese) to the tables `content.js` already built. The header comment (lines 3–5) is honest that these translations were drafted for the prototype and must be checked by fluent speakers before real use. Line 7 says: "It only adds to the globals content.js declares."

### 5.1 The IIFE wrapper

```js
(() => {
  LANGS.push(
    { id: 'ta', label: 'தமிழ் · Tamil', speech: 'ta-IN', roman: true, dir: 'ltr', font: 'Noto Sans Tamil' },
```
`js/languages.js:12–14`

**Concept: IIFE (Immediately Invoked Function Expression).** `(() => { ... })();` defines a function and runs it right away. Why? Everything declared inside (`put`, `QT`, `LEX` and so on) stays private to this function. Since all classic scripts share one global scope, a helper named `add` or `put` here could otherwise clash with a same-named global in another file. Only the *changes* to existing globals (like `LANGS`) escape, which is exactly the goal.

### 5.2 New language entries

`LANGS.push(...)` (lines 13–21) adds seven entries with two new fields:

- `dir`: `'rtl'` for Urdu (right to left), `'ltr'` for the others.
- `font`: which Noto font to use (`null` for Vietnamese, which uses Latin letters).

These are read by `langAttrs` in `js/elder.js`:

```js
const langInfo = id => LANGS.find(l => l.id === id) || LANGS[0];
// Inline attributes so text in any script gets the right font and direction.
function langAttrs(id) {
  const L = langInfo(id);
  return `lang="${id}"${L.dir ? ` dir="${L.dir}"` : ''} class="lang-${id}"${L.font ? ` style="font-family:'${L.font}', var(--f)"` : ''}`;
}
```
`js/elder.js:6–10`

So the font for a new language comes from data, not from a hand-written CSS rule. That's why the CSS only has special classes for Telugu and Hindi (the original two): the newer languages get their font inline. And the `dir="rtl"` produced here is what the CSS rule `[dir="rtl"] { text-align: right; }` matches. The `lang` attribute also helps screen readers pick the right voice.

Vietnamese has `roman: false` because it is already written in Latin letters, so a pronunciation line isn't needed.

### 5.3 The `put` helper

```js
  function put(target, data) {
    for (const [lang, v] of Object.entries(data)) {
      if (Array.isArray(v)) { target[lang] = v[0]; target[lang + '_r'] = v[1]; } else target[lang] = v;
    }
  }
```
`js/languages.js:24–28`

The translations below are written in a compact form: `ta: [text, pronunciation]`, or just `vi: text`. `put` copies them onto an existing `content.js` entry in the standard key pattern:

1. `Object.entries(data)` turns `{ ta: [...], vi: '...' }` into pairs like `['ta', [...]]`.
2. `const [lang, v]` is **destructuring**: it unpacks each pair into two variables.
3. If `v` is an array, store `v[0]` as `target.ta` and `v[1]` as `target.ta_r`; otherwise store the plain string.

The result is that a translated object looks exactly as if it had been written in `content.js` with `ta`, `ta_r` and so on. The rest of the app needs no changes: `tr(obj, lang)` and `obj[lang + '_r']` just work.

### 5.4 The translation tables and where they go

The file defines translation tables, each matching a `content.js` table:

| Table here | Added onto | Lines |
|---|---|---|
| `QT` | `Q` (interview questions) | 31–311 |
| `FT` | `FOLLOW` | 314–361 |
| `ET` | `ELDER_TEXT` | 364–419 |
| `CT` | `CONDS` | 422–446 |
| `KT` | `CANCER_TYPES` | 449–474 |
| `STT` | the kinds in `SUBTYPES` | 477–516 |
| `ST` | `STORY_PROMPTS` (from `stories.js`) | 526–635 |

A `QT` entry's shape:

```js
    born: {
      ta: ['நீங்கள் எந்த வருடம் பிறந்தீர்கள்?', 'Neengal endha varudam pirandheergal?'],
```
`js/languages.js:47–48`

Then the merge happens in a few lines:

```js
  for (const [k, v] of Object.entries(QT)) put(Q[k], v);
  for (const [k, v] of Object.entries(FT)) put(FOLLOW[k], v);
  for (const [k, v] of Object.entries(ET)) put(ELDER_TEXT[k], v);
  for (const c of CONDS) if (CT[c.id]) put(c, CT[c.id]);
  for (const c of CANCER_TYPES) if (KT[c.id]) put(c, KT[c.id]);
  for (const [cond, kinds] of Object.entries(STT)) for (const t of SUBTYPES[cond] || []) if (kinds[t.id]) put(t, kinds[t.id]);
```
`js/languages.js:518–523`

Two things to notice:
- Lists (`CONDS`, `CANCER_TYPES`) are matched by `id`; keyed objects (`Q`, `FOLLOW`) by key.
- `if (CT[c.id])` skips anything without a translation, so a missing translation falls back to English (through `tr`) instead of crashing.

Why can this file change `Q` if `Q` is a `const`? `const` only means the *name* can't be pointed at a different object. The object's contents can still be changed.

Line 636 does the same for story prompts, but only if `stories.js` has already loaded (the `typeof` check discussed in section 1.4).

### 5.5 Extending the answer-finder vocabulary

```js
  const forms = w => [...new Set([w, w.normalize('NFC'), w.normalize('NFD')])];
  function add(list, words) {
    for (const w of words) for (const f of forms(w.toLowerCase())) if (!list.includes(f)) list.push(f);
  }
```
`js/languages.js:643–646`

**Concept: Unicode normalization.** Some letters can be stored in more than one way. For example, a Vietnamese letter with a tone mark can be one character, or a base letter plus a separate mark. They look identical but don't match as text. `normalize('NFC')` gives the "combined" form and `normalize('NFD')` the "separated" form. The comment on lines 638–642 explains that different speech engines produce different forms, so each word is stored in all its forms. `new Set([...])` removes duplicates (a **Set** keeps only unique values), and `[...set]` turns it back into an array. `add` also skips words already in the list.

Then `LEX` (lines 648–830) holds new words per condition and `CLEX` (831–852) per cancer type, in the seven languages. They are merged into the `content.js` lists:

```js
  for (const e of LEXICON) if (LEX[e.cond]) add(e.words, LEX[e.cond]);
```
`js/languages.js:854`

Lines 856–869 add more `FALSE_FRIENDS` with a small helper `ff`. For example, `ff('子宫', ['子宫颈'])`: in Chinese, 子宫 means uterus and 子宫颈 means cervix, so "cervical cancer" should not be counted as uterine cancer. Lines 871–933 add kin words, "no" words, death words and "alive" words.

The header comment on lines 638–640 also explains a matching difference: Latin-script words are matched as whole words, while words in other scripts are matched as parts of words (stems), because those languages often attach endings directly to the word.

---

## 6. `sw.js`: the service worker

### What it is for

**Concept: service worker.** A service worker is a script the browser runs *in the background*, separately from the page. It sits between the page and the network: every time the page requests a file, the service worker can decide whether to fetch it from the internet or answer from a saved copy. That's what lets Heirloom Health keep working in a grandparent's house with no Wi-Fi.

It is registered by the app at the end of `js/app.js`:

```js
if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window.self) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
```
`js/app.js:1386–1387`

It only registers when the browser supports it, the site uses HTTPS (browsers require it), and the page is not inside a frame (so not inside `demo.html` or an embedded preview). Registration waits for `load` so it doesn't slow the first screen.

A service worker has no `window` and no page. It refers to itself as `self`, and it reacts to **events**.

### 6.1 Version and file list

```js
const VERSION = 'heirloom-v19';
const APP_FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'js/config.js', 'js/content.js', 'js/stories.js', 'js/languages.js', ...
```
`sw.js:4–7` (shortened)

- `VERSION` names the cache. The comment on line 3 says: "Bump VERSION whenever you change a file, so phones pick up the new copy." Changing even one character of `sw.js` makes the browser treat it as a new service worker and run the install steps again.
- `APP_FILES` (lines 5–11) lists every file the app needs: the page, every script (including the speech worker `js/stt-worker.js`), the two vendor libraries, and the icons. `'./'` is included as well as `index.html`, because the browser treats "the folder address" and "index.html" as different requests.

### 6.2 Lifecycle: install and activate

**Concept: the service worker lifecycle.** A new service worker goes through:
1. **install**: a good time to download and save files;
2. **waiting**: normally it waits until every tab using the old version is closed;
3. **activate**: it takes over, a good time to clean up old caches.

```js
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
```
`sw.js:13–15`

**Concept: the Cache API.** `caches` is browser storage for saved requests and responses. `caches.open(VERSION)` opens (or creates) a cache with that name. `c.addAll(APP_FILES)` downloads every file and stores it. If any one fails, the whole install fails, so the app is never half-cached.

**Concept: Promises and `.then`.** These operations take time, so they return a *Promise*: an object meaning "I'll have the result later". `.then(next)` runs `next` when it's done. `e.waitUntil(promise)` tells the browser "don't consider install finished until this promise is done".

`self.skipWaiting()` skips the waiting stage, so the new version takes over right away instead of waiting for all tabs to close.

```js
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
```
`sw.js:16–18`

Step by step:
1. `caches.keys()` lists all cache names, such as `heirloom-v18` and `heirloom-v19`.
2. `.filter(k => k !== VERSION)` keeps only the old ones.
3. `.map(k => caches.delete(k))` starts deleting each, giving a list of promises.
4. `Promise.all(...)` waits for all of them.
5. `self.clients.claim()` makes this worker control pages that are already open, right now.

Together, `skipWaiting` and `clients.claim` mean updates take effect quickly, which suits an app that changes often.

### 6.3 The fetch handler: network first, cache as backup

```js
const CDNS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const host = new URL(e.request.url).host;
  if (host !== location.host && !CDNS.includes(host)) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
```
`sw.js:22–35`

The `fetch` event fires for every request the page makes. Step by step:

1. **Only `GET` requests** (line 24). Sending data to the server (`POST`, such as feedback or sync) is never cached; it goes straight through. A plain `return` without calling `respondWith` means "let the browser handle this normally".
2. **Only certain hosts** (lines 25–26): this site's own files, plus Google Fonts and jsDelivr (where Transformers.js, the speech engine, loads from). The comment on lines 19–21 explains why everything else, such as the server's replies and the speech models, is left alone: if you're offline, a failed server call should be reported as a failure, not answered with the app page.
3. **Network first** (line 28): try to download the fresh file.
4. **If it worked, save a copy** (line 30). `res.ok` means a success status (200–299). `res.type === 'opaque'` covers some cross-site responses whose status the browser hides. Those are saved too, so fonts work offline. `res.clone()` is needed because a response body can only be read once: one copy goes to the page, one into the cache.
5. **If the network fails** (line 33), look in the cache with `caches.match`. If there's no match and the browser is loading a whole page (`mode === 'navigate'`), answer with the cached `index.html`, so the app still opens. Otherwise return `Response.error()`, a normal network error.

**Why network first and not cache first?** Cache first would be faster but would keep showing old code until the cache is replaced. Network first shows updates immediately when online, and only falls back to saved copies when offline. Every successful online load also refreshes the cache.

---

## 7. `demo.html`: the phone demo page

### What it is for

A separate page for making a demo video. It draws an iPhone frame on a colored background and runs the real app inside it, with a visible "tap circle" wherever you click. It is not part of the app itself. The comment says:

> Phone demo: the real app inside an iPhone frame, for screen-recording a demo video on a computer.

`demo.html:11`

`<meta name="robots" content="noindex">` (line 7) asks search engines not to list this page.

### 7.1 The styles

It has its own small set of tokens (line 16) and five backgrounds selected by a body class (lines 20–23), including `bg-green`: a pure green "green screen" that video editors can remove.

```css
.stage { position: fixed; left: 50%; top: 50%; transform-origin: center center; }
```
`demo.html:26`

The phone is built from plain boxes at a real iPhone screen size: `.phone` is 430 × 884 px with 68 px rounded corners and a dark gradient (line 27), side buttons drawn with `::before` and `::after` (lines 28–30), and `.screen` is 390 × 844 px (line 31). A fake status bar (`.status`, with the time 9:41 and SVG signal/Wi-Fi/battery icons), a black "Dynamic Island" (`.island`), and a home bar (`.home`) are layered on top with `z-index`. `pointer-events: none` on them means clicks pass through to the app below.

### 7.2 The app in an iframe

```html
<iframe id="app" src="./" title="Heirloom Health"></iframe>
```
`demo.html:59`

**Concept: iframe.** An `<iframe>` shows another web page inside this one. Here it loads `./` (the real app) at 390 × 794 px, starting 50 px down, below the fake status bar (line 35). Because the iframe is only 390 px wide, the app's own `@media (max-width: 860px)` rules kick in and it shows its true phone layout, bottom tab bar and all. No special demo code is needed in the app. Also, since the app is inside a frame, `window.top === window.self` is false, so the service worker is not registered from here.

### 7.3 The script

**`fit()`: scale to the window.**

```js
  function fit() {
    const s = Math.min((innerHeight - 24) / 884, (innerWidth - 24) / 430, 1.4);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`; // pinned to the window's center, so it always fits
  }
  addEventListener('resize', fit); fit();
```
`demo.html:83–87`

It works out how much the 430 × 884 phone can be scaled to fit the window with 24 px to spare, using the smaller of the two ratios so both height and width fit, and never more than 1.4×. `translate(-50%, -50%)` combined with `left: 50%; top: 50%` centers the stage. It runs once at start and again whenever the window is resized.

**`hook()`: tap circles and cursor.** This runs when the iframe finishes loading (`app.addEventListener('load', hook)`, line 108).

```js
    try { doc = app.contentDocument; } catch { return; }
```
`demo.html:92`

`contentDocument` lets this page reach into the iframe's page. Browsers only allow that when both pages come from the same site; otherwise it fails, and the `try … catch` quietly gives up. Then the function:
1. Adds a style to the app that hides the mouse cursor and scrollbars (lines 94–96), so the video looks like a phone, not a computer.
2. Listens for keys inside the app too (line 97), so shortcuts work even when the app has focus.
3. Converts positions: `const where = e => ({ x: e.clientX, y: e.clientY + 50 });` (line 98). Positions inside the iframe start at its top, which sits 50 px below the screen's top, so 50 is added.
4. On `pointermove`, moves a soft round "finger" cursor (line 99).
5. On `pointerdown`, adds a `.tap` circle at the spot and removes it after 500 ms (lines 101–106). The `.tap` animation (lines 38–39) grows and fades the circle. The `true` at the end of line 106 listens in the **capture phase**: the event reaches this listener on its way *down* to the clicked element, before the app's own handlers, so the tap is shown even if the app stops the event.

**Controls and shortcuts (lines 110–128).** `toggleTaps`, `nextBg` (cycles through the `BGS` classes with `% BGS.length`, the remainder operator, so it wraps back to the first), `full` (enter or exit full screen; `requestFullscreen?.()` only calls the method if the browser has it), reload, and hide.

```js
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
```
`demo.html:120`

The keyboard handler ignores keys held with Cmd/Ctrl/Alt (so normal shortcuts like Cmd+Shift+5 for recording still work) and keys typed into text boxes (so typing an "h" in an interview note doesn't hide the controls). `closest(...)` checks whether the element or any parent matches the selector.

---

## How these files fit together

```
index.html ──loads──> config.js ─> content.js ─> stories.js ─> languages.js ─> ... ─> app.js ─> boot()
    │                                  ▲                          │
    │                                  └──── adds 7 languages ────┘
    ├─ manifest.webmanifest  (install as an app)
    └─ app.js registers sw.js (offline copy of every file above)

demo.html ──iframe──> index.html (the real app, shown in its phone layout)
```

- `index.html` sets the look and the order.
- `content.js` + `languages.js` hold the words and medical knowledge as data tables that connect through ids.
- Feature files read those tables; `app.js` draws everything into `#main`.
- `sw.js` makes all of it available offline.

---

## Check your understanding

**1. Why must `languages.js` be loaded after `content.js` and `stories.js`?**
Because it immediately adds to globals they declare (`LANGS`, `Q`, `CONDS`, `STORY_PROMPTS`…). Before `content.js` it would crash ("LANGS is not defined"). Before `stories.js`, its `typeof STORY_PROMPTS` check would skip the story prompts, leaving them in English only.

**2. How does the app show a question in Tamil with a pronunciation line, if `content.js` only has English, Telugu, Hindi and Spanish?**
`languages.js` uses `put()` to copy `[text, pronunciation]` pairs onto the same objects as `ta` and `ta_r`. The app reads `obj[lang] || obj.en` and `obj[lang + '_r']`, so it finds the Tamil text with no other code changes.

**3. What turns the sidebar into a bottom tab bar on a phone?**
The media query `@media (max-width: 860px)` at `index.html:75`. It makes the grid one column, fixes `.side` to the bottom edge, hides the logo and privacy box, and lays out the four tab buttons in four equal columns.

**4. In `RISK_TOPICS`, why is `early` a function instead of a number?**
Because the "early" age can depend on the relative. For heart disease it's 65 for women and 55 for men (`p => p.sex === 'F' ? 65 : 55`). Making every topic a function lets `risk.js` call `t.early(x.p)` the same way for all of them.

**5. You fix a typo in `js/risk.js` and publish. Why might phones still run the old version, and what fixes it?**
The service worker may serve cached copies when offline, and the browser only re-runs install when `sw.js` itself changes. Bumping `VERSION` in `sw.js` (for example to `heirloom-v20`) makes a new worker install, cache fresh files, and delete the old cache when it activates. Online, the network-first fetch handler already gets the new file.
