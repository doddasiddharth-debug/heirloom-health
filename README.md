# Heirloom Health

**Ask your elders now. Hand your doctor a family tree later.**

Most people can't answer "Does heart disease run in your family?" because nobody ever asked the grandparents. Heirloom Health walks a teenager through interviewing relatives in English, Telugu, Hindi or Spanish. It builds a medical family tree (a pedigree), applies published screening guidelines, and produces a report to hand to a doctor.

## What it does

- **Guided interviews in four languages.** Each question appears in the relative's language with a pronunciation line, for teens who speak the language but can't read the script. The app adds follow-up questions when an answer is incomplete ("What kind of cancer?").
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
| `js/auth.js` | Profiles and PINs on the device |
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

The Telugu, Hindi and Spanish text was drafted for this project and should be checked by fluent speakers. Corrections are welcome.
