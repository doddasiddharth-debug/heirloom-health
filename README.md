# Heirloom Health

**Ask your elders now. Hand your doctor a family tree later.**

Most people can't answer "Does heart disease run in your family?" because nobody ever asked the grandparents. Heirloom Health walks a teenager through interviewing relatives in English, Telugu, Hindi or Spanish. It builds a medical family tree (a pedigree), applies published screening guidelines, and produces a report to hand to a doctor.

## What it does

- **A guided tour** that opens the first time you use the app. It walks through every screen and highlights each feature. Replay it any time from **Menu → Take the tour** or **How the app works**.
- **Guided interviews in eleven languages:** English, Telugu, Hindi, Spanish, Tamil, Kannada, Bengali, Gujarati, Urdu, Chinese and Vietnamese. Each question appears in the relative's language with a pronunciation line, for teens who speak the language but can't read the script. The app adds follow-up questions when an answer is incomplete ("What kind of cancer?").
- **A thorough interview.** 23 conditions, with kinds where they matter (type 1 vs type 2 diabetes, heart attack vs heart rhythm or heart muscle problems, polycystic kidneys, hepatitis B, sickle cell and more), and 24 kinds of cancer. Answers are saved for the person, their parents, each brother and sister, and each child. Anything not on the list can be added under "Something else" with the relative's own words and an age; it shows on the tree and in the report, and notes typed during interviews are included in the doctor report too. Whole-family questions cover genetic test results, sudden deaths before 50, parents related by blood, pregnancy losses, birth differences, anesthesia reactions, tobacco and ancestry.
- **Large tap-to-answer mode** for grandparents: one illness per screen, huge Yes / No / Don't know buttons, and number pads for ages.
- **Question voices.** A fluent family member records each question once, and "Listen" plays their voice. Voice packs can be shared between phones.
- **Family stories.** Twelve optional prompts, not about health, in all eleven languages: where elders grew up, how they met, their parents' and grandparents' names, recipes, festivals, songs, advice. Record their answers and type memories, then save each relative's album as one HTML file with the recordings inside that plays offline and prints. Stories stay on the device and are left out of reports, links and sync.
- **Family sharing without accounts.** Send a relative a link; they answer on their own phone and send a link back that merges into the tree. Optional encrypted cloud sync with the server in `server/`.
- **Ancestry-aware rules,** such as South Asian ancestry and heart disease, ancestry and diabetes testing, and BRCA and thalassemia screening.
- **Doctor hand-off.** A checklist of questions for the next checkup, and a QR code that opens a read-only copy of the report. The report travels inside the link and is never stored on a server.
- **Photos and documents** for each relative, kept on the device.
- **Free speech-to-text** on the phone itself (Whisper running in the browser, private, works offline after one download), or with the free server.
- **Terms of Use and Privacy Policy** in plain language, agreed to when a profile is created.
- **Send feedback**: bug reports and ideas go to the server (or a GitHub issue).
- **Recording and answer finding.** Record each answer. Type or dictate what was said, and the app suggests answers to confirm. It maps everyday words to medical terms ("sugar" / షుగర్ / शुगर → diabetes) and notices when someone says "no".
- **A real family graph.** Grandparents, great-grandparents, cousins, half-siblings, step-parents and adoption. The app works out each relationship ("First cousin, Dad's side") and how closely related each person is. Relatives who aren't blood related are left out of the risk rules.
- **Automatic pedigree layout** for any family shape, using standard medical symbols.
- **Combined answers.** Every answer remembers who said it. When relatives disagree, the app shows both answers and uses the more cautious one.
- **My risks.** Ranks conditions as higher than average, moderate or about average, using the family-history method behind the CDC's Family Healthware tool.
- **Doctor report.** Applies screening guidelines (colon cancer screening age, inherited breast/ovarian cancer, Lynch syndrome, early cholesterol testing, diabetes testing). Each finding names its source. Exports to PDF.
- **Who to ask next.** Suggests the relative who can fill the most important gaps.
- **Private by design.** Everything stays on the device. Profiles with an optional PIN let siblings share a phone. Works offline once loaded, and can be installed on a phone's home screen.

## How the code is organized

| File | What it holds |
|---|---|
| `index.html` | Page structure and all styles |
| `js/content.js` | Languages, conditions, interview questions, the everyday-word dictionary, guideline sources |
| `js/family.js` | The family graph: people, parent and partner links, kinship calculation |
| `js/layout.js` | Pedigree layout (layering, crossing reduction, placement) and chart drawing |
| `js/risk.js` | Combining answers, guideline rules, risk levels, "who to ask next" |
| `js/extract.js` | Finding answers in interview transcripts |
| `js/languages.js` | Tamil, Kannada, Bengali, Gujarati, Urdu, Chinese and Vietnamese text |
| `js/auth.js` | Profiles and PINs on the device |
| `js/media.js` | Photos and documents |
| `js/elder.js` | Large tap-to-answer mode and recorded question voices |
| `js/share.js` | Invite links, merging answers, encrypted cloud sync |
| `js/handoff.js` | Doctor checklist, QR code, read-only doctor view, pop-up panels |
| `js/config.js` | The address of the optional server |
| `js/stt.js`, `js/stt-worker.js` | Speech-to-text on the device (Whisper via Transformers.js) or with the server |
| `js/legal.js` | Terms of Use and Privacy Policy |
| `js/feedback.js` | Feedback form and the app menu |
| `js/tour.js` | The guided tour of the app |
| `server/` | Optional Cloudflare Worker for AI, speech-to-text and sync (see `server/README.md`) |
| `vendor/` | jsPDF and qrcode-generator (MIT licensed), kept here so PDF and QR work offline. Transformers.js (Apache-2.0) loads from jsDelivr, pinned to 4.3.0. |
| `js/app.js` | Screens, recordings, PDF export, event handling |
| `sw.js` | Offline support |

There is no build step and no server. It is plain HTML, CSS and JavaScript.

## Run it on your computer

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Put it online with GitHub Pages

1. Push this folder to a GitHub repository.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then branch **main** and folder **/ (root)**. Click **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

When you change a file, bump `VERSION` in `sw.js` so phones that installed the app pick up the update.

## Sources

The screening rules and risk levels summarize published guidance. Full citations appear in the app's doctor report. They include the US Preventive Services Task Force, the US Multi-Society Task Force on Colorectal Cancer, NCCN, NHLBI, the American Diabetes Association, the American Cancer Society, the Family History Screen 7, the Amsterdam II criteria, and Scheuner et al. (1997) / CDC Family Healthware.

**This app is not a diagnosis.** It organizes family history to start a conversation with a doctor.

## Translations

All non-English text was drafted for this project and should be checked by fluent speakers before real use. Corrections are welcome.
