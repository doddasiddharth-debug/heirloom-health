# 06 Sharing, privacy and accounts

This chapter covers the parts of Heirloom Health that move information **between people and devices**, and the parts that **protect** it:

| File | Lines | What it does |
|---|---|---|
| `js/share.js` | 228 | Packs data into links, checks data that arrives, invites, merging a relative's answers, encrypted cloud sync |
| `js/handoff.js` | 153 | Doctor checklist, QR codes, the read-only doctor view, every pop-up panel |
| `js/auth.js` | 53 | Profiles on the device, PIN hashing, sessions, PIN lockout |
| `js/media.js` | 69 | Photos and documents in IndexedDB, shrinking images |
| `js/legal.js` | 71 | Terms of Use and Privacy Policy |
| `js/feedback.js` | 64 | The feedback form and the app menu |

Like every file in the app, these are **classic scripts**: they share one global space. A function defined in `share.js` (like `packData`) can be called from `app.js` or `handoff.js` without any `import`. `S` is the open family (see chapter 02), and `render()` redraws the screen from it.

A judge is likely to ask about privacy and security, so this chapter is careful to say both **what the code does** and **what it does not protect against**.

---

## Part 1. `js/share.js`: links, checking, invites, merging and sync

### Purpose and fit

The app has no accounts on a server. So how do a teen and their grandmother, on two different phones, work on the same family? `share.js` answers this two ways:

1. **Invite links** (no server needed). All the data rides *inside the link itself*.
2. **Cloud sync** (optional, needs the server in `server/`). The family is **encrypted** on the phone before upload, so the server holds data it can't read.

The file's opening comment says it directly (`js/share.js:3-7`).

> **Concept: the URL fragment.** A link like `https://example.org/app/#join=zAbc...` has two halves. Everything before `#` is sent to the web server to fetch the page. Everything **after** `#` is called the **fragment** (or "hash"). Browsers keep the fragment on the device: it is never included in the request to the server. It was designed for jumping to a spot on a page, but apps can read it with `location.hash`. That's why Heirloom puts family data there: GitHub Pages, which hosts the app, never receives it.

### Packing data into links (`js/share.js:11-28`)

To fit a family into a link, the app turns it into text, squeezes it, and makes it link-safe.

> **Concept: JSON.** JSON ("JavaScript Object Notation") is a way to write an object as plain text, like `{"name":"Lakshmi","born":"1952"}`. `JSON.stringify(obj)` turns an object into that text; `JSON.parse(text)` turns it back.

> **Concept: base64 and base64url.** Compressed data is raw **bytes** (numbers 0–255), and many of those aren't printable characters. **Base64** writes any bytes using only 64 safe characters: `A–Z`, `a–z`, `0–9`, `+` and `/`, with `=` as padding at the end. But `+`, `/` and `=` have special meanings in URLs. **Base64url** is the same idea with `-` instead of `+`, `_` instead of `/`, and no padding.

**`b64u(bytes)`** (`js/share.js:11`) turns bytes into base64url text.

```js
const b64u = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
```

How:
1. The browser's built-in `btoa()` does base64, but it wants a "binary string" (one character per byte). So the loop turns bytes into characters with `String.fromCharCode`.
2. It does this in chunks of `0x8000` (32,768) bytes. Why? `...bytes.subarray(...)` passes every byte as a separate argument to a function, and browsers have a limit on how many arguments a call can take. Chunking keeps big families from crashing.
3. `btoa(s)` makes base64, then the three `.replace` calls make it base64url: `+` → `-`, `/` → `_`, and trailing `=` removed.

**`unb64u(str)`** (`js/share.js:12`) reverses it: swap `-` and `_` back, decode with `atob`, then turn each character back into a byte with `charCodeAt(0)`. `atob` accepts missing padding, so the removed `=` don't need to be put back.

**`packData(obj)`** (`js/share.js:13-20`):

```js
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if ('CompressionStream' in window) {
    const out = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'z' + b64u(new Uint8Array(out));
  }
  return 'j' + b64u(bytes);
```

1. `JSON.stringify` makes text; `TextEncoder` turns the text into UTF-8 bytes (this is what makes Telugu or Hindi names travel correctly).
2. If the browser supports **CompressionStream**, the bytes are compressed.
3. The result gets a one-letter tag: `z` for compressed, `j` for plain JSON. That tag tells the reader how to unpack it.

> **Concept: compression streams.** `CompressionStream('deflate-raw')` is a browser built-in that squeezes data using the DEFLATE method (the same one inside ZIP files). Family data repeats a lot (`"living":"unknown"` over and over), so it shrinks a lot, which makes links and QR codes smaller. It works on **streams** (data flowing through in pieces), so the code wraps the bytes in a `Blob`, gets a stream with `.stream()`, sends it through the compressor with `.pipeThrough(...)`, and uses `new Response(...).arrayBuffer()` as a simple trick to collect everything that comes out. "Raw" means no extra header, which saves a few bytes.

**`unpackData(str)`** (`js/share.js:21-25`) reads the first letter, base64url-decodes the rest, decompresses if the letter was `z`, and `JSON.parse`s the result. Note that `unpackData` only *decodes*. It does not decide whether the data is trustworthy. That's the job of the next section.

**`appUrl()`** (`js/share.js:26`) is the app's own address without any `#` part, so links work wherever the app is hosted.

**`PERSON_FIELDS` and `slim(p)`** (`js/share.js:27-28`) make a smaller copy of a person with only `id, name, sex, born, living, deathAge, cause, checks`. Interview notes, transcripts and stories are left out of shared links, which keeps links short and keeps private notes off them.

### Checking data that arrives (`js/share.js:33-76`)

Anyone can type or edit a link. So data coming *in* from a link or the sync server is treated as **untrusted**. The comment explains why (`js/share.js:31-32`): "Ids end up inside the page's HTML, and an unknown illness would break every screen."

> **Concept: XSS / code injection.** The app draws screens by building HTML text and putting it into the page. If someone could sneak text like `"><img src=x onerror="steal()">` into a spot that becomes HTML, the browser would *run* their code inside your app. That's called **cross-site scripting (XSS)**, a kind of code injection. Such code could read the family data on that phone.

The app defends in two layers:
- **Escaping.** Free text such as names goes through `esc()` (`js/app.js:7`) before it's put into HTML, which turns `<` into `&lt;`, `"` into `&quot;`, and so on, so it shows as text instead of acting as code.
- **Strict shapes for ids.** Ids are placed into HTML attributes *without* escaping, for example `data-pid="${p.id}"` (`js/handoff.js:135`, `js/media.js:55`). That's only safe if an id can never contain a quote or `<`. So every incoming id must pass this test:

```js
const ID_OK = /^[\w-]{1,40}$/;
```
(`js/share.js:33`) This regular expression means: 1 to 40 characters, each one a letter, digit, underscore (`\w`) or hyphen. No quotes, spaces or angle brackets, so an id can't break out of an attribute.

The small checkers (`js/share.js:34-37`):
- **`okId(v)`**: is it a string matching `ID_OK`?
- **`okNum(v, digits)`**: is it a number or string of only digits, at most `digits` long? Returns it as a string, or `''`. A birth year gets 4 digits, an age 3.
- **`okText(v, max)`**: if it's a string, cut it to `max` characters; otherwise `''`. Limits stop someone from stuffing a giant blob into a name.
- **`okDate(v)`**: does it look like `2026-10-27`? Otherwise `''`.

**`cleanPerson(p)`** (`js/share.js:38-51`) builds a **brand-new** object, field by field, from checked values. It never copies the incoming object as a whole, so unexpected extra fields are simply dropped. Choices are limited to known lists: `sex` must be `M`, `F` or `U`, `living` must be `yes`, `no` or `unknown`. For health answers (`checks`) only keys that exist in the app's `CHECK` list are kept (`js/share.js:46`). Transcripts are capped at 20,000 characters, and ancestry values must match the app's `ANCESTRIES` list. The edit timestamp `u` is kept only if it's a number (used by sync, below). If the id is bad, the whole person is rejected (`return null`).

**`cleanReport(r)`** (`js/share.js:52-62`) does the same for a health answer ("report"). The person id must be valid and the condition must be one the app knows (`COND[r.cond]`), because, as the comment said, an unknown illness would break every screen that looks it up. The `type` (like a kind of cancer) is kept only if it's a known subtype, or free text (max 60 characters) for "something else".

**`cleanRel(r)`** (`js/share.js:63-67`) accepts only two kinds of link: `parent` (with valid, different parent and child ids) and `partner`. Anything else becomes `null`.

**`cleanFamily(d)`** (`js/share.js:69-76`) puts them together:
1. Clean every person, drop the rejects (`filter(Boolean)`), and drop duplicate ids (the `findIndex` trick keeps only the first person with each id).
2. Make a `Set` of the surviving ids.
3. Keep only relationships and reports that point at people who exist.

The result is a family that has the right shape no matter what was in the link. That's why a damaged or hostile link can't inject code or crash the screens.

### Invites: the teen's side (`js/share.js:79-90`)

**`familyId()`** (`js/share.js:79`): `S.familyId ||= uid('fam')` means "use the family's id, or make one and remember it if there isn't one yet."

**`inviteLink(pid)`** (`js/share.js:80-84`) builds the invite for one relative:

```js
  const data = { v: 1, kind: 'invite', fam: familyId(), from: nameOf(byId(SELF)), lang: S.iv.lang, person: slim(P), mother: mom ? slim(mom) : null, father: dad ? slim(dad) : null };
  return `${appUrl()}#join=${await packData(data)}`;
```

It sends the relative's own slim record, their mother and father (so the relative can answer about them too), the teen's name ("from"), and the interview language. `v: 1` is a version number so future formats can be told apart.

**`shareLink(url, title, text)`** (`js/share.js:86-90`) opens the phone's **share sheet** (`navigator.share`) if there is one. If the person cancels, that's an `AbortError` and nothing else happens. On other errors, or on computers without a share sheet, it copies the link to the clipboard, and if even that is blocked, it asks the person to copy it by hand.

### Contributor mode: the relative's side (`js/share.js:94-129`)

When the relative opens the invite, `boot()` in `app.js` sees `#join=` (`js/app.js:1343-1350`), unpacks it, and creates a temporary "contributor" profile with an id built from the family and person ids. It doesn't touch any real profile on that phone.

**`contributorState(inv)`** (`js/share.js:94-110`) builds a tiny family from the invite:
1. Runs `cleanPerson` on the person, mother and father. If the person is missing or bad, it throws `'bad invite'`, which `boot()` catches and reports as a damaged link.
2. Checks the language is one the app has, otherwise English. Cuts `from` to 80 characters.
3. Creates the person and their parents, links the parents to the person, and links the two parents as partners.
4. A neat trick (`js/share.js:106-108`): the app's kinship code expects someone called `SELF` ("you"). On the relative's phone, the relative *is* "you". So the person's id is swapped to `SELF`, and their real id is kept in `realId`.
5. Returns a full state object that opens straight on the interview tab.

**`renderContribStart()`** (`js/share.js:111-120`) is the welcome screen: "Hello, [name]!", who asked, a language grid, and a link to the terms. Every name goes through `esc()`.

**`contribAnswersLink()`** (`js/share.js:121-129`) runs when the relative taps "Send your answers back" (`js/elder.js:227` → `js/app.js:1234`). It undoes the `SELF` trick (`mapId` turns `SELF` back into the real id), slims everyone, keeps only `pid, cond, type, age` of each answer, and packs it as `#answers=...`, with `from` set to the relative's real id.

### Merging answers: back on the teen's phone (`js/share.js:134-161`)

**`mergeAnswers(ans)`** step by step:
1. `by = ans.from` must be a valid id (`js/share.js:136`).
2. `Object.assign(ans, cleanFamily(ans))` replaces the incoming people, links and answers with cleaned versions.
3. The sender must be on the teen's tree. If not, stop with a message.
4. For each incoming person: if new, add them. If already there, the rule is (`js/share.js:142`): "What a relative says about themselves replaces your guess; about others it only fills blanks." So `own` (is this the sender?) decides whether a field is overwritten or only filled when empty. Then `mine.u = Date.now()` marks the person as just edited.
5. Add any new parent/partner links (`linkParent` and `linkPartners` skip ones that already exist).
6. Replace this relative's earlier answers: find old reports *by this relative* about *people in this message* (`js/share.js:154`), record them as deleted with `noteDeleted` (so sync won't bring them back), drop them, then add the new ones with `addReport(..., by, ...)`. Every answer remembers who said it.
7. Mark the sender as interviewed, clear the kinship cache with `touchFamily()`, and return how many answers were added.

### Trace: one full invite round trip

Here's the whole story, with the code at each step.

1. **The teen creates the invite.** Menu → "Invite a relative" opens the `invite-pick` panel (`js/handoff.js:127-137`), listing living relatives, closest blood relatives first. The teen taps "Send link" next to Grandma Lakshmi. `js/app.js:1223` calls `inviteLink(p.id)` and opens the `invite` panel with the link, a QR code, and Share / Copy / WhatsApp buttons.
2. **What's in the link.** Something like `https://…/heirloom-health/#join=z3VbL…`. Unpacked, it's `{v:1, kind:'invite', fam:'fam-…', from:'Priya', lang:'te', person:{id:'p-ab12cd', name:'Lakshmi', …}, mother:{…}, father:{…}}`, compressed and base64url-encoded. The web host never sees the part after `#`. The messaging app used to send it *does* carry the whole link, though, since it's just text in a message.
3. **The relative opens it.** On Grandma's phone, `boot()` matches `#join=` (`js/app.js:1337`), unpacks it, and builds the contributor family with `contributorState`. If she's opened it before, `loadFor(ACCT)` brings back her saved progress instead.
4. **She answers.** She picks Telugu on `renderContribStart`, which starts the large tap-to-answer mode (`js/app.js:1233`). Each tap saves to her phone only.
5. **The answers link.** At the end she taps "Send your answers back". `contribAnswersLink()` packs `{v:1, kind:'answers', from:'p-ab12cd', name:'Lakshmi', at:'2026-10-27', people, rels, reports}` into `#answers=…`, and the `contrib-done` panel shows it with a QR code (`js/handoff.js:114-118`).
6. **The teen opens it.** `boot()` doesn't merge right away. It stores the data in `sessionStorage` as "pending" and removes it from the address bar with `history.replaceState` (`js/app.js:1351-1354`). After the teen signs in, `handlePending()` (`js/app.js:1370-1380`) unpacks and cleans it and shows the `answers` panel: "Lakshmi sent their answers: 6 health answers, from Oct 27" with a short preview.
7. **The teen merges.** "Add to my family" → `js/app.js:1220` calls `mergeAnswers`, saves, and shows "Added 6 answers".

### Cloud sync: end-to-end encryption (`js/share.js:164-228`)

> **Concept: hashing vs. encryption.** **Hashing** is one-way: it turns input into a fixed-size fingerprint, and you can't turn the fingerprint back into the input. **Encryption** is two-way: it scrambles data with a **key**, and anyone with the key can unscramble it. PINs are hashed (part 3). Synced families are encrypted, because they need to be read again.

> **Concept: the Web Crypto API.** Browsers have built-in, well-tested cryptography under `crypto.subtle` (plus `crypto.getRandomValues` for strong random numbers). The app uses these instead of writing its own crypto, which is the right choice: homemade crypto is a common source of security bugs.

> **Concept: AES-GCM and the IV.** **AES** is the standard encryption method used across the internet. **GCM** is a mode of AES that also adds a tag that detects tampering: if anyone changes even one byte of the encrypted data, decryption fails instead of producing garbage. GCM needs an **IV** ("initialization vector", also called a nonce): a random value used once per encryption. The IV isn't secret, but it must **never be reused** with the same key, or the protection breaks. So the app makes a new random 12-byte IV every time it encrypts.

**`cloudOn()`** (`js/share.js:164`) is true only if `config.js` sets a server address.

**`aesKey(raw)`** (`js/share.js:165`) turns the key text from the link into a key object the browser can use for AES-GCM. `false` means the key can't be exported back out of that object.

**`encryptFamily()`** (`js/share.js:166-171`):

```js
  const key = await aesKey(S.sync.key), iv = crypto.getRandomValues(new Uint8Array(12));
```

It turns people (without stories, via `withoutStories`), links, answers, the family id, and the deletion markers into JSON bytes, encrypts them, and returns `{"iv": "...", "ct": "..."}` (`ct` is "ciphertext", the scrambled data). Photos, documents and recordings are not included.

**`decryptFamily(body)`** (`js/share.js:172-175`) does the reverse. If the key is wrong or the data was changed, `crypto.subtle.decrypt` throws an error.

**`startCloud()`** (`js/share.js:227`) creates two random values:

```js
function startCloud() { S.sync = { id: b64u(crypto.getRandomValues(new Uint8Array(16))), key: b64u(crypto.getRandomValues(new Uint8Array(32))) }; save(); return cloudSync(); }
```

The **id** (16 random bytes) names the storage slot on the server. The **key** (32 bytes = 256 bits) is the AES key. **`cloudLink()`** (`js/share.js:228`) puts both after the `#`: `#sync=<id>.<key>`. The server is only ever sent the id (in the URL path), never the key, because the key lives in the fragment. That's what "end-to-end encrypted" means here: only the devices at the ends can read the data.

**`noteDeleted(kind, ids)`** (`js/share.js:177-180`) records `id → time` in `S.deleted.p` (people) or `S.deleted.r` (reports). Why? Suppose you delete Uncle Raj on your phone, but your mom's phone still has him. Without a note, the next sync would see him as "new" and add him back. These notes are sometimes called **tombstones**. They're called from the "remove" button (`js/app.js:1252`) and from `mergeAnswers`.

**`mergeFamily(remote)`** (`js/share.js:182-210`) combines the server copy with yours. The rules, from the comment: "deletions win, a newer edit of a person wins, and blanks are filled in."
1. Combine both sides' deletion notes, keeping the later time for each id (`js/share.js:183-184`).
2. Clean the remote family with `cleanFamily`. Even your own server copy is treated as untrusted.
3. For each remote person: skip if deleted; add if new. If both have them, compare edit times `u` (set with `Date.now()` whenever a field is edited, for example `js/app.js:1125`). If the remote one is newer, it replaces yours, but transcripts from both are kept (`js/share.js:191`). If not, it only fills your blanks.
4. Add missing links, and add remote reports whose id you don't have and that aren't deleted.
5. Apply deletions: remove deleted people (never `SELF`), their links, and deleted or orphaned reports.
6. If the selected person was deleted, select "you" again.

**`cloudSync()`** (`js/share.js:211-226`):
1. **GET** the encrypted copy from `/api/family/<id>`.
2. If found, decrypt and `mergeFamily`. If decryption fails, show "couldn't be unlocked" and stop. A 404 just means nobody has uploaded yet.
3. **PUT** the merged family, freshly encrypted with a new IV.
4. Record the time, save, redraw, "Family synced". Any network error shows a calm message: your family is still saved on the phone.

### Trace: one sync round trip

1. On the teen's phone, "Sync with family" → "Turn on sync" runs `startCloud()` (`js/app.js:1229`). It makes the id and key, and `cloudSync()` finds nothing (404), encrypts, and uploads. The server (`server/worker.js:214-230`) checks only that the body is JSON with exactly `iv` and `ct` strings and stores it, kept for about 400 days after the last sync.
2. The `cloud` panel (`js/handoff.js:144-150`) shows `#sync=<id>.<key>` as a link and QR code. The teen sends it to Mom.
3. Mom opens it. `boot()` stashes it as pending and removes it from the address bar. After she signs in, the `cloud-join` panel warns her if her profile already has a different family. She taps "Combine and sync" (`js/app.js:1231`), which saves the id and key and runs `cloudSync()`.
4. Her phone downloads the encrypted copy, decrypts it with the key from the link, merges it with hers, re-encrypts the result, and uploads it.
5. Later the teen taps "Sync now". Their phone downloads Mom's version, merges (newer person edits win, deletions win), and uploads. Sync runs only when someone taps a button. It isn't automatic.

### Honest limits of sharing and sync

- **Anyone with a link can read it.** Invite, answers and report links aren't encrypted, just compressed. The sync link *is* the key, so anyone who gets it can read and change the family. The app says so in the panels (`js/handoff.js:105`).
- **The fragment is hidden from the web host, not from everyone.** The messaging app, the phone's browser history, and anyone looking at the screen can see the link. `answers` and `sync` links are removed from the address bar (`js/app.js:1353`), but `join` and `report` links stay there.
- **Answers links aren't signed.** `mergeAnswers` trusts that `from` is who it says. Someone who knows a person's id could send a fake answers link. The safeguard is the preview panel and the teen's own judgment. The `fam` field travels in the link, but `mergeAnswers` doesn't check it.
- **Sync conflicts are simple.** "Newer wins" uses each phone's clock, so a phone with the wrong time can win when it shouldn't. Reports already on both phones aren't compared, so an edited age on one phone doesn't replace the other's. If two phones upload at the same moment, the server keeps the last upload, though the other phone still has its changes and usually adds them back on its next sync.
- **There's no way to revoke a sync link.** "Stop syncing" (`js/app.js:1232`) only stops *this* phone. The locked copy stays on the server until it expires.
- **Metadata.** The server can see the id, the size of the data, and when syncs happen, just not the contents.

---

## Part 2. `js/handoff.js`: doctor checklist, QR, doctor view, pop-ups

### Purpose and fit

The goal of the whole app is a good conversation with a doctor. `handoff.js` makes that easy: a list of questions to ask, and a QR code that opens a read-only copy of the report on the doctor's phone. It also draws all the pop-up panels used by sharing.

### QR codes

**`qrSVG(text)`** (`js/handoff.js:6-10`) uses the bundled `vendor/qrcode.js` library:

```js
  try { const qr = qrcode(0, 'L'); qr.addData(text, 'Byte'); qr.make(); return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true }); }
```

`0` means "pick the QR size automatically". `'L'` is the lowest error-correction level. It survives less damage, but leaves the most room for data, which matters because these links are long. The result is an SVG image (drawn with shapes, so it stays sharp at any size). If the library didn't load, or the data is too big for any QR code, it returns `null` and the panels show a link instead.

### Questions for the next checkup

**`ASK`** (`js/handoff.js:13-41`) maps the title of each guideline card (made by `risk.js`) to a plain question a teen can ask, for example `'Get a cholesterol test now': 'Can I get a cholesterol test now?'`.

**`slug(s)`** (`js/handoff.js:42`) turns a question into a safe id: lowercase, with anything that isn't a letter or digit turned into `-`.

**`checklist()`** (`js/handoff.js:43-51`) loops over `guidelineCards()`, looks up each card's question, and skips duplicates with a `Set` (two cards can map to the same question, like the two prostate cards). Then it adds the teen's own questions from `S.myQuestions`.

**`checklistHTML(readOnly)`** (`js/handoff.js:52-61`) draws the list with checkboxes (ticked ones come from `S.asked`), a "Remove" button for your own questions, and an "Add your own question" box. When `readOnly` is true, the checkboxes are disabled and the editing controls are hidden. Ticking a box is handled at `js/app.js:1132`.

### The read-only report for the doctor

**`reportLink()`** (`js/handoff.js:64-74`) packs the family (slim people, plus "your" ancestry, which the ancestry rules need), links, answers, who was interviewed when, the checklist questions, and your name into `#report=…`.

**`viewerState(rep)`** (`js/handoff.js:75-81`) runs on the doctor's phone. `boot()` matches `#report=` (`js/app.js:1338-1342`), creates a pretend "Doctor view" account that's marked `viewer`, and calls this. It cleans everything with `cleanFamily`, checks the date and name, keeps at most 40 questions of up to 300 characters each, and returns a state that opens on the doctor tab. Because `save()` refuses to save for viewers (`js/app.js:104`), nothing is stored on the doctor's phone, and the report is never stored on a server. It lives only in the link.

### Pop-up panels

**`renderModal()`** (`js/handoff.js:84-153`) draws whichever panel `S.modal.kind` names. Two helpers build shared pieces: `linkBox` (a read-only text box that selects itself when tapped) and `shareBtns` (Share, Copy, and a WhatsApp link that uses `encodeURIComponent` to put the text safely into a URL). The panels:

| `kind` | What it shows |
|---|---|
| `invite` | QR code, link and share buttons for one relative |
| `qr` | "Show my doctor": a big QR code, or a message that the family is too large for one |
| `answers` | Preview of incoming answers and the "Add to my family" button. If the sender isn't on this tree, it explains how to open the right profile |
| `contrib-done` | The relative's "send back" screen, in their language |
| `ai-consent` | Asks permission before sending audio or text to the AI server |
| `feedback`, `menu`, `stt` | Drawn by other files (`feedbackHTML`, `menuHTML`, `sttChooserHTML`) |
| `invite-pick` | Everyone who could answer, closest blood relatives first (`rank` uses `kin()`) |
| `cloud-join` | Warns before combining a shared family into a profile that already has one |
| `cloud` | Turn on sync, or the sync link, QR code, "Sync now" and "Stop syncing" |

Every panel is wrapped in a dark backdrop with `data-action="m-close"`, so tapping outside closes it. `data-stop="1"` on the panel itself keeps taps inside it from closing it. `role="dialog"` and `aria-modal` tell screen readers it's a pop-up.

---

## Part 3. `js/auth.js`: profiles, PINs and sessions

### Purpose and fit

Siblings often share a phone or tablet. `auth.js` gives each person a **profile** with its own family, plus an optional PIN. The file's header is honest about what this is: "It is a device lock, not a cloud account" (`js/auth.js:5`).

### Storage helpers

- **`ACCOUNTS_KEY`, `SESSION_KEY`** (`js/auth.js:8-9`) are the names of storage slots.
- **`GUEST`** (`js/auth.js:10`) is the pretend account for the example family.
- **`dataKey(id)`** (`js/auth.js:11`) gives each profile its own slot: `heirloom-health-v2:<id>`.
- **`SESSION_ID`** (`js/auth.js:12`) remembers who's signed in, in memory, in case the browser blocks storage.
- **`store`** (`js/auth.js:14-18`) wraps `localStorage` and `sessionStorage` with JSON and `try/catch`. Some browsers (for example in private mode) throw errors when you use storage, and this keeps the app from crashing. `localStorage` lasts until it's cleared. `sessionStorage` ends when the tab closes.
- **`listAccounts()`** (`js/auth.js:19`) reads the list of profiles.
- **`randomHex(n)`** (`js/auth.js:20`) makes `n` strong random bytes with `crypto.getRandomValues` and writes them as hex (`0-9a-f`).

### PIN hashing

> **Concept: salt.** If two people both choose PIN `1234`, plain hashing gives them the same fingerprint, and an attacker could look up common PINs in a pre-made table. A **salt** is a random value mixed in before hashing, different for each profile, so identical PINs give different hashes and pre-made tables don't help.

**`hashPin(pin, salt)`** (`js/auth.js:22-25`):

```js
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
```

It joins salt and PIN as `salt:pin`, hashes it with **SHA-256** (a standard hash that makes a 256-bit fingerprint), and writes the result as 64 hex characters.

**`createAccount({ name, pin, terms })`** (`js/auth.js:26-31`) makes a 16-byte salt and a random id, stores `pinHash` (or `null` if there's no PIN), the date, and which version of the terms was agreed to. The PIN itself is never stored.

**`checkPin(acct, pin)`** (`js/auth.js:32`): if there's no PIN, it's always true. Otherwise it hashes what was typed with the same salt and compares.

**`agreeTerms(id, version)`** (`js/auth.js:34`) records that a profile accepted new terms. **`deleteAccount(id)`** (`js/auth.js:35`) removes the profile and its family slot. `app.js` also deletes its files (`js/app.js:1292`).

### Sessions

**`startSession(id, remember)`** (`js/auth.js:38-42`): "Stay signed in" puts the session in `localStorage` (it survives closing the browser). Otherwise it goes in `sessionStorage` and any old `localStorage` session is removed. **`endSession()`** (`js/auth.js:43`) clears all three places. **`currentAccount()`** (`js/auth.js:44-48`) checks memory, then the tab's session, then the remembered one, and returns that profile, `GUEST`, or `null`.

### PIN lockout

```js
function notePinMiss() { if (++PIN_TRIES.count >= 5) { PIN_TRIES.count = 0; PIN_TRIES.until = Date.now() + 30000; } }
```
(`js/auth.js:53`) After 5 wrong PINs, `pinLocked()` (`js/auth.js:52`) returns true for 30 seconds, and the sign-in code refuses to check (`js/app.js:791`).

### Honest limits: what the PIN does and doesn't protect

**It does** stop a brother or sister from casually opening your family in the app. And it means the PIN itself isn't sitting in storage in readable form.

**It does not** protect against someone who knows a little about browsers:
- **The family data isn't encrypted.** `save()` writes the family as plain JSON to `localStorage` (`js/app.js:107`). Anyone with the unlocked phone who opens the browser's developer tools can read it without the PIN. The PIN only guards the app's own front door.
- **A 4–6 digit PIN is easy to brute-force offline.** There are only 10,000 four-digit PINs. Someone who copies the salt and hash can try them all in well under a second, because SHA-256 is fast. Slow hashes such as PBKDF2 or bcrypt exist to make this harder, but with this few possible PINs, even those would only slow it down.
- **The lockout is in memory.** `PIN_TRIES` resets when the page reloads, so it only slows down guessing by tapping.
- **Profiles can be deleted without the PIN** through "Forgot your PIN?" (`js/app.js:737`, `js/app.js:1292`). That's on purpose, since a forgotten PIN can't be recovered, but it means a sibling could wipe your profile.
- **Nothing is stored online.** If the phone is lost or the browser data is cleared, the family is gone unless there's a backup code or sync.

For a family history app on a shared phone, this is a reasonable "lock on a diary," not a bank vault, and that's how the code describes it.

---

## Part 4. `js/media.js`: photos and documents

### Purpose and fit

Teens can attach a photo of each relative and documents like old prescriptions or lab reports. Files are too big for `localStorage` (which holds only a few megabytes of text), so they go into **IndexedDB**.

> **Concept: IndexedDB.** A database built into the browser that can store large items, including **Blobs** (raw file data), on the device. The app's small wrapper `IDB` lives in `js/app.js:164-178` and has `all`, `put` and `del`. Media goes in the `media` store, next to `clips` (recordings) and `voices`.

### Functions

**`loadMedia()`** (`js/media.js:6-10`) first frees the old preview URLs (`URL.revokeObjectURL`), then loads all media, keeps only items whose `acct` is the signed-in profile, and gives each one a **blob URL** (`URL.createObjectURL`): a temporary `blob:` address that `<img>` and links can use to show the file.

**`photoOf(pid)`** and **`docsOf(pid)`** (`js/media.js:11-12`) find a relative's photo, and their documents sorted oldest first.

**`shrinkImage(file, max, quality)`** (`js/media.js:15-29`):

> **Concept: canvas and `toBlob`.** A `<canvas>` is a drawing surface. You can draw an image onto it at any size, then `canvas.toBlob()` saves what's drawn as a new image file, here a JPEG at 85% quality.

1. Load the file into an `Image` through a blob URL.
2. Work out the scale: `k = Math.min(1, max / Math.max(img.width, img.height))` (`js/media.js:19`). The longest side becomes at most `max`, and `Math.min(1, …)` means small images are never enlarged.
3. Make a canvas that size and draw the image onto it.
4. `c.toBlob(b => res(b || file), 'image/jpeg', quality)` (`js/media.js:24`): give back the smaller JPEG, or the original if that fails. If the image won't load at all, the original is returned too.

Why? A phone photo can be 4,000 pixels wide and several megabytes. A family-tree photo only needs 512 pixels.

**`addMedia(pid, file, kind)`** (`js/media.js:30-39`):
1. Photos must be images, and nothing over 25 MB is accepted.
2. Images are shrunk: 512 pixels for photos, 1,800 for document photos (big enough to read). PDFs are stored as they are.
3. A new photo replaces the old one.
4. Saves a record with the profile id, relative id, kind, name, type and blob, then shows a toast. If storage is blocked, it says so.

**`removeMedia(id, quiet)`** and **`removeMediaOf(pids)`** (`js/media.js:40-47`) delete from IndexedDB and free the blob URL. `removeMediaOf` runs when relatives are removed from the tree (`js/app.js:1252`).

**`mediaHTML(p)`** (`js/media.js:49-69`) draws the section: hidden file inputs (`accept="image/*"` or `image/*,application/pdf`) behind button-style labels, a list of documents with a thumbnail or "PDF" badge, an escaped name, the date, "Open", and a two-tap "Remove" (`S.confirmMedia`).

**Privacy note:** media never leaves the device. It isn't in invite links, reports, or sync (`encryptFamily` sends only people, links and answers). Like the family, it's stored unencrypted in this browser.

---

## Part 5. `js/legal.js`: Terms of Use and Privacy Policy

### Purpose and fit

The app handles health information about family members, many of them minors or elders, so it needs clear terms. This file holds them as an HTML page written in plain language.

- **`TERMS_VERSION`** (`js/legal.js:5`) is `'2026-10-26'`. Each profile stores the version it agreed to. At sign-in, if `acct.terms !== TERMS_VERSION`, the person is asked to agree again (`js/app.js:795`). Change this date when the terms change.
- **`TERMS_DATE`** is the same date for people to read. **`LEGAL_OPEN`** is a global switch: when true, `render()` shows the terms page instead of the app (`js/app.js:1049`). Opening `#terms` sets it (`js/app.js:1336`).
- **`legalHTML()`** (`js/legal.js:9-63`) is the text: a short version (not medical advice, data stays on the device, ask before recording), then Terms (who can use it, respecting family, no guarantees) and Privacy. The Privacy part lists exactly what leaves the device and when: share links, server speech-to-text and the AI helper, family sync, and feedback. If `CONFIG.repo` is set, it adds a GitHub issues link.
- **`renderLegal()`** (`js/legal.js:64-70`) wraps it with Back buttons.
- **`termsLink(text)`** (`js/legal.js:71`) is a small button used inside other screens, such as the contributor welcome.

The privacy text matches the code: the fragment explanation matches part 1, "stored only in scrambled form" matches the PIN hashing, and "kept about a year" matches the server's 400-day expiry. A careful reader might add that "PINs scrambled" doesn't mean the *family* is scrambled on the device (see part 3).

---

## Part 6. `js/feedback.js`: feedback and the app menu

### Purpose and fit

Users need a way to report bugs and translation mistakes. This file builds the feedback form and sends it, and also draws the app's menu.

- **`APP_VERSION`, `FB_KINDS`, `FB_HINTS`** (`js/feedback.js:4-11`): the version string, the four kinds of feedback, and a hint for each.
- **`deviceInfo()`** (`js/feedback.js:12`): the browser's user-agent text (cut to 160 characters), screen size and app version. It's sent only if the box is ticked.
- **`feedbackHTML(m)`** (`js/feedback.js:14-28`) draws either "Thank you!" or the form: kind buttons (`role="radio"` for accessibility), a message box limited to 4,000 characters, an optional email, and the device-details checkbox. It also has a hidden field:

```js
    <label class="sr" aria-hidden="true">Leave this empty<input type="text" id="fb-website" tabindex="-1" autocomplete="off"></label>
```
(`js/feedback.js:22`) This is a **honeypot**. People can't see it, but simple spam bots fill in every field. If there's no server, the form offers "Open a GitHub issue" or "Copy message" instead.
- **`feedbackText(m)`** (`js/feedback.js:29-32`) makes the plain-text version used for copying and for GitHub.
- **`sendFeedback()`** (`js/feedback.js:33-47`): if the honeypot is filled, it pretends to succeed (so the bot learns nothing) and sends nothing (`js/feedback.js:35`). It requires at least 5 characters, shows "Sending…", and POSTs JSON to `/api/feedback`. On error it shows the server's message and suggests copying instead.
- **`githubIssueUrl(m)`** (`js/feedback.js:48-51`) builds a "new issue" link with the title and body filled in, using `encodeURIComponent` so the text is safe inside a URL.
- **`menuHTML()`** (`js/feedback.js:53-64`): the menu items (tour, feedback, invite, speech-to-text, terms, sign out). The `item` helper gives the tour button `data-tour="start"` and every other button a `data-action`.

**Privacy note:** feedback *does* leave the device and is stored on the server (for up to a year, `server/worker.js:199`). That's why the form says "Please don't include anyone's health details."

---

## Summary: where data lives

| Data | Where it's kept | Who can read it |
|---|---|---|
| Family, answers, notes | `localStorage`, one slot per profile | Anyone using this browser on this device (not encrypted) |
| PIN | Only a salted SHA-256 hash | Not stored, though short PINs can be guessed from the hash |
| Photos, documents, recordings | IndexedDB on this device | Same as the family |
| Invite / answers / report links | Inside the link, after `#` | Anyone who has the link. Never the web host |
| Synced family | Server, encrypted with AES-GCM | Only people with the sync link (which holds the key) |
| Feedback | Server | The app's makers |

---

## Check your understanding

**1. Why does the app put family data after the `#` in a link instead of uploading it?**
Browsers never send the part after `#` (the fragment) to the web server, so the host never receives it. But anyone who has the full link, including the messaging app that carried it, can read it.

**2. Ids are put into HTML without `esc()`. Why is that safe?**
Every id coming from a link or sync must match `ID_OK = /^[\w-]{1,40}$/` (`js/share.js:33`): only letters, digits, `_` and `-`. It can't contain a quote or `<`, so it can't break out of an attribute and inject code. `cleanFamily` rebuilds everything from checked fields and drops anything else.

**3. Your mom deletes a relative on her phone. Why doesn't your phone add them back at the next sync?**
`noteDeleted` records a deletion marker (`S.deleted.p[id] = time`). It's encrypted and synced along with the family, and `mergeFamily` combines both phones' markers, skips deleted people, and removes them. Deletions win.

**4. What's the difference between how the PIN and the synced family are protected?**
The PIN is **hashed** (one-way, with a salt) because the app only needs to check it, never read it back. The synced family is **encrypted** with AES-GCM because it has to be read again. The key is random, lives only in the sync link, and is never sent to the server.

**5. Name one thing the PIN does *not* protect against, and why.**
Someone with the unlocked device and the browser's developer tools can read the family directly from `localStorage`, because the family data isn't encrypted with the PIN. (Other answers: short PINs can be brute-forced from the hash, the lockout resets on reload, and profiles can be deleted without the PIN.)
