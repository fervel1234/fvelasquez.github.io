# Portfolio Site

Plain HTML/CSS/JS, no build step — ready to serve as-is from GitHub Pages
(root of the repo you eventually point Pages at, or via a `docs/` folder /
project settings if this folder ends up nested in a larger repo).

## Structure

- `index.html` — Hero, About, Research preview, Projects preview, Blog preview, CV, Contact
- `research.html` — full Research writeup
- `projects.html` — full Projects list
- `blog.html` — full Blog page (placeholder text + image until there are posts)
- `css/styles.css` — all styles (theme variables, layout, responsive rules)
- `js/main.js` — theme toggle, mobile nav, image-placeholder fallback
- `assets/images/` — drop project/headshot images here
- `assets/favicon.svg` — site favicon
- `cv/` — put `resume.pdf` here

## TODOs before this is "done"

Search each file for `TODO` comments, or just look for anything marked
"placeholder":

- [ ] Replace `Your Name` (nav, hero, page titles, footer) with your actual name
- [ ] Add `assets/images/headshot.jpg` (square, 500x500+) — the profile
      sidebar photo (on every page) will pick it up automatically once the
      file exists
- [ ] Profile sidebar (in every page's `<aside class="profile-sidebar">`) —
      real Location, GitHub URL, and LinkedIn URL
- [ ] Add `assets/images/school-logo.png` — small logo shown next to "School"
      in the sidebar; falls back to a generic icon until it exists
- [ ] Add `cv/resume.pdf` — the CV section's embed and download button both
      point here already
- [ ] `research.html` — replace the placeholder Hydrogen-Lattice-QC repo link
      with the real URL, and add `assets/images/research-1.jpg` if you have a
      figure/diagram to show
- [ ] `projects.html` — add `assets/images/maze-robot-1.jpg` (or a GIF), and
      replace the placeholder "Code" / "Demo" links with real ones
- [ ] `blog.html` — currently just placeholder text and a placeholder image
      (`assets/images/blog-placeholder.jpg`); replace with real posts
      whenever that happens
- [ ] `index.html` Contact section — real email, GitHub URL, and LinkedIn URL
- [ ] Add more `<article class="project">` blocks in `projects.html` as you
      build more things — a duplicable template block is already at the
      bottom of the file
- [ ] `index.html` GIF rails (`.gif-rail-left` / `.gif-rail-right`, only
      visible on very wide screens ≥ 1600px) — replace each
      `.gif-placeholder` div with an `<img src="...">` pointing at a real
      GIF once you have links or files. Left has 2 slots, right has 3.

## Notes

- The site defaults to **dark mode** for first-time visitors (set via an
  inline script in `<head>`, before anything paints). The header toggle
  button lets a visitor switch to light mode, and that choice is
  remembered in `localStorage` on repeat visits.
- Every page uses a two-column layout: a sticky left `.profile-sidebar`
  (photo, location, school, GitHub, LinkedIn) next to the centered
  `.page-content` column. On mobile it collapses to a single column with
  the sidebar stacked above the content.
- Any placeholder `<img>` with an inline `onerror` handler that 404s
  (because the real file hasn't been added yet) automatically shows a
  labeled placeholder box instead of a broken-image icon — so it's safe to
  leave image paths pointing at files that don't exist yet.
