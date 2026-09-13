# CLAUDE.md — Project memory for Claude Code

This file is read automatically by Claude Code when working in this repo.
Keep it updated as the site evolves — it's the persistent context that
replaces re-explaining the project every session.

## What this is

Personal portfolio / CV site for Fernando "Skippy" Velasquez — EE undergrad
(Wilbur Wright College → transferring to UIC), NSF SROP researcher at MSU
(Mendoza-Cortés Group) working on VQE/QITE for a 2D hydrogen lattice
Hamiltonian on NISQ hardware. Site is styled after Becca Chang, John Martyn,
and Patrick Rall's academic personal sites.

Repo: `fervel1234/fvelasquez.github.io` — deploys as GitHub Pages from repo
root (no build step, plain HTML/CSS/JS).

## Structure

- `index.html` — Hero, About, Research preview, Projects preview, Blog
  preview, CV, Contact
- `research.html` — full Research writeup
- `projects.html` — full Projects list
- `blog.html` — full Blog page (placeholder until real posts exist)
- `css/styles.css` — all styles (theme variables, layout, responsive rules)
- `js/main.js` — theme toggle, mobile nav, image-placeholder fallback
- `assets/images/` — project/headshot images go here (currently empty except
  `.gitkeep`)
- `assets/favicon.svg`
- `cv/` — `resume.pdf` goes here (currently empty except `.gitkeep`)

## Conventions

- No build tooling — don't introduce a bundler/framework unless explicitly
  asked. Keep it plain HTML/CSS/JS so it serves directly from Pages.
- Dark mode is the default for first-time visitors (inline script in
  `<head>` before paint). Toggle choice persists via `localStorage`.
- Two-column layout on every page: sticky left `.profile-sidebar` (photo,
  location, school, GitHub, LinkedIn) + centered `.page-content`.
  Collapses to single column on mobile.
- Placeholder `<img>` tags use an inline `onerror` handler that swaps in a
  labeled placeholder box instead of a broken-image icon — safe to leave
  image `src` paths pointing at files that don't exist yet.
- New project entries in `projects.html` use the duplicable
  `<article class="project">` template block at the bottom of that file.

## Current TODOs (real, not hypothetical — check off as done)

- [ ] Replace all `Your Name` placeholders (nav, hero, page `<title>`s,
  footer) with real name
- [ ] Add `assets/images/headshot.jpg` (square, 500x500+)
- [ ] Profile sidebar: real Location, GitHub URL, LinkedIn URL (currently
  `#` placeholders in every page's `<aside class="profile-sidebar">`)
- [ ] Add `assets/images/school-logo.png`
- [ ] Add `cv/resume.pdf` — CV section embed + download button already
  point here
- [ ] `research.html` — swap placeholder Hydrogen-Lattice-QC repo link for
  the real one (likely `dr-abrianas` org repo); add
  `assets/images/research-1.jpg` if there's a figure to show
- [ ] `projects.html` — add `assets/images/maze-robot-1.jpg` (or a GIF) for
  the ESP32 maze-solving robot project; replace placeholder Code/Demo links
- [ ] `index.html` Contact section — real email, GitHub, LinkedIn (currently
  `your.email@example.com`, `github.com/your-handle`, etc.)
- [ ] `index.html` GIF rails (`.gif-rail-left` / `.gif-rail-right`, only
  visible ≥1400px viewport — lowered from 1600px so it also fires on a
  MacBook's own built-in display, not just external/Windows monitors; see
  `css/styles.css` comment) — 2 left slots, 3 right slots, currently
  `.gif-placeholder` divs

## Useful context for research/projects content

- GitHub handles: `dr-abrianas` (research/project work),
  `fervel1234` (this portfolio repo)
- Research: VQE/QITE on 2D hydrogen lattice Hamiltonian, NISQ hardware
  (AQT, IBM `ibm_marrakesh`), error mitigation via Dynamical Decoupling,
  ZNE, DRAG pulse shaping. Also: `quantumcomputinglivebook` Jupyter Book
  project under `mendozacortesgroup` org.
- Other projects to potentially feature: TrainTrack (fitness analytics app —
  FastAPI/pywebview/SQLite), ESP32 maze-solving robot (BFS/left-hand-rule,
  WebSocket viz), PennyLane open-source contribution (Tracker class).

## Local dev on MacBook Air M5

No build step needed. To preview locally:

```bash
cd fvelasquez.github.io
python3 -m http.server 8000
# open http://localhost:8000
```

Push to `main` to deploy via GitHub Pages (confirm Pages is set to deploy
from `main` / root in repo settings if not already configured).
