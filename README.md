# certjay.github.io

Personal portfolio of **Miguel Jay Faustino**: Business Analyst moving into data engineering.

Live site: https://certjay.github.io

## What's here

| File | What it is |
|---|---|
| `index.html` | The whole site: one self-contained page (HTML, CSS, a few lines of JavaScript). No build step. |
| `resume/Miguel-Jay-Faustino-Resume.pdf` | The one-page resume linked from the site. |
| `resume/resume.html` | Source for the PDF. Edit this, then regenerate the PDF. |
| `og.png` | The preview image shown when the link is shared on LinkedIn, Messenger, etc. |
| `.nojekyll` | Tells GitHub Pages to serve files as they are. |

## Design system: Ledger

The page is a ledger sheet: pale columnar-pad paper, a red margin rule down the left, and ink. Every color has a job in the data, so use them only for that job:

| Token | Light | Job |
|---|---|---|
| `--paper` / `--sheet` | `#E7ECE3` / `#F4F7F1` | Page and raised sheet |
| `--rule` / `--rule-2` | `#C3CFC0` / `#A6B5A2` | Ledger lines and borders |
| `--ink` / `--ink-2` | `#1C2620` / `#4B5B50` | Text and secondary text |
| `--red` | `#B23A2B` | Rejected or quarantined; the margin rule |
| `--green` | `#2C6E49` | Validated and loaded |
| `--blue` | `#2E5A87` | A value that was corrected |

Type is **Recursive**, one family with three voices: plain sans for reading, `.data` (its monospace axis) only inside real data, and `.pen` (its casual, slanted axis) for auditor's notes in the margin. Spacing (`--s-*`) and type sizes (`--t-*`) are tokens too; dark mode redefines the same color tokens.

Patterns:
- `.margin`: a date or pen note that sits in the ledger margin on desktop and inline on phones.
- `.project` with `.spec`: a shipped project with a ruled spec sheet beside it.
- `.steps`: a data flow; mark the validation step with `class="gate"`.
- `table.ruled`: any tabular content (planned work, certifications). Add `stack` to collapse rows on phones.
- `.register`: the experience timeline.
- The hero sheet (`#demo`) is driven by the script at the bottom: `RAW` holds the rows, and the five rules run in order.

## How to update it

1. Edit `index.html` (on GitHub: open the file, click the pencil icon).
2. Commit. GitHub Pages republishes in about a minute.

Typical updates:
- **Project shipped:** move it from the "Building now" table into Shipped work as a new `.project`, with a `.margin.pen` note like "shipped, public repo".
- **Learning log:** add a new `<li>` at the top of the `log` list.
- **New certificate:** add a row to the Certifications table, and add it to `resume/resume.html`.
- Bump "Last updated" in the footer.

## Regenerating the resume PDF

Open `resume/resume.html` in Chrome, press Ctrl+P, choose **Save as PDF**, paper size **A4**, margins **Default**, and turn on **Background graphics**. Save it over `resume/Miguel-Jay-Faustino-Resume.pdf`. Keep it to one page. The resume uses Arial on purpose, because applicant-tracking systems read standard fonts most reliably.
