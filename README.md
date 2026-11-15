# FlameScope

NASA's microgravity fire experiments, checked against the air crews will breathe on the ISS, the Moon and Mars.
Built by team **SL-Pyronix** (Colombo) for the NASA Space Apps Challenge 2026: *Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data*.

## What it does

| Tab | What you get |
|---|---|
| **Mission scenarios** | Pick a habitat (ISS, Moon base, pressurized rover, Mars base). The 7 NASA studies are ranked by how useful their evidence is there, with the score broken into parts, plain reasons, and an evidence-gap banner. |
| **Evidence explorer** | Filter 1,018 NASA test records by study, oxygen, result and fuel. The atmosphere map places every test by oxygen and pressure against the habitat zones. Every row links to its NASA source. |
| **Prevention · Detection · Suppression** | 7 findings computed from the records and re-checked automatically, including 2 evidence gaps. |
| **Ask FlameScope** | Every question gets an evidence status (Direct / Related / No direct evidence) and source links. On the public site, answers are **prepared** from the verified findings (no AI call, no cost). With an `ANTHROPIC_API_KEY` set, Claude writes the answer **only** from the retrieved NASA records, citing test IDs. |

## Run it

```bash
npm install
cp .env.example .env.local      # add your ANTHROPIC_API_KEY (optional; without it, Ask uses prepared answers)
npm run dev                     # http://localhost:3000
```

## Deploy (Vercel)

1. Push this folder to a **public** GitHub repo.
2. Import it at vercel.com → New Project (framework: Next.js, no settings to change).
3. Add the environment variable `ANTHROPIC_API_KEY` (and optionally `FLAMESCOPE_MODEL`, default `claude-sonnet-5-5`).
4. Deploy, then open the URL in a private window to confirm it works without a login.

## Data

All data comes from NASA Physical Sciences Informatics (PSI), licence CC0-1.0:

| ID | Investigation | DOI |
|---|---|---|
| PSI-25 | Burning and Suppression of Solids II (BASS-II) | [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) |
| PSI-26 | Burning and Suppression of Solids (BASS) | [10.60555/58h4-dy80](https://doi.org/10.60555/58h4-dy80) |
| PSI-99 | Spacecraft Fire Experiment II (SAFFIRE-II) | [10.60555/2chp-m469](https://doi.org/10.60555/2chp-m469) |
| PSI-20 | ACME Burning Rate Emulator (BRE) | [10.60555/vb93-3y72](https://doi.org/10.60555/vb93-3y72) |
| PSI-159 | ACME Cool Flames Investigation with Gases (CFI-G) | [10.60555/cyt1-kh64](https://doi.org/10.60555/cyt1-kh64) |
| PSI-101 | Smoke Aerosol Measurement Experiment Reflight (SAME-R) | [10.60555/2np7-jv14](https://doi.org/10.60555/2np7-jv14) |
| PSI-69 | Flame Extinguishment Experiment (FLEX) | [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451) |

- `data/tests.json`: all records in one format, with the raw source row kept. `public/data/tests_slim.json` is the same data without the raw rows, for the browser.
- `data/rankings.json`, `data/insights.json`, `data/investigations.json`: habitat rankings, verified findings, investigation cards.
- The Python scripts that build these from the official PSI downloads are in the separate data package (`flamescope_data.zip`).

Known source issues (spreadsheet errors, missing pressure, unlabeled units) are flagged on each record in `quality_flags`, not silently fixed.

## Use of Super Intelligence (SI)

SI tools were used, and every SI-assisted part is marked:

- **Claude (Anthropic)** helped write the data-normalization scripts, the ranking method, the wording of the findings, the Q&A prompt and parts of this interface. Each source file carries an `SI note` comment.
- **Ask FlameScope** can call Claude to write answers from retrieved NASA records when an API key is configured; such answers are labelled as AI-written. The public deployment runs without a key and shows prepared answers, labelled as such.
- Every number shown in the findings is computed from the NASA records and re-checked by a script. The team checked samples against the PSI pages.
- No SI-generated images are used. No NASA logos or insignia are used.

## Limits

A research prototype, not a safety certification tool. All PSI flight tests are microgravity; there is no partial-gravity data yet. Findings from gas flames and fuel droplets do not transfer directly to cabin materials. Missing data is never treated as evidence of safety or danger.
