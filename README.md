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

## Design tokens

All colors, spacing, radii and type sizes live in the `:root` block at the top of `index.html`. Use the tokens (`var(--s-4)`, `var(--r-md)`, `var(--t-sm)`) instead of raw pixel values so the page stays consistent. Dark mode is a second set of the same color tokens.

Components: `.btn` (`.btn-primary`, `.btn-ghost`, `.btn-sm`), `.pill` (`.pill-ok` shipped, `.pill-wip` building, `.pill-plan` planned, `.pill-accent`), `.tag`, `.card`, `.flow` (pipeline diagram; mark the validation step with `class="qa"`).

## How to update it

1. Edit `index.html` (on GitHub: open the file, click the pencil icon).
2. Commit. GitHub Pages republishes in about a minute.

Typical updates:
- **Project shipped:** move it from "Building now" into Selected work, switch its pill to `pill-ok`, add the repo link.
- **Learning log:** add a new `<li>` at the top of the `log` list.
- **New certificate:** copy a `cert` card in Certifications, and add it to `resume/resume.html`.
- Bump "Last updated" in the footer.

## Regenerating the resume PDF

Open `resume/resume.html` in Chrome, press Ctrl+P, choose **Save as PDF**, paper size **A4**, margins **Default**, and turn on **Background graphics**. Save it over `resume/Miguel-Jay-Faustino-Resume.pdf`. Keep it to one page.
