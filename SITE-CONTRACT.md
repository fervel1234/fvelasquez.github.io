# Markup contract between blog-admin and this site

`blog-admin/` is local-only and has never been committed, so the markup it
generates and the markup this site styles can drift apart with nothing to
catch it. This file is the shared contract: **if blog-admin emits what's
below, the site renders it correctly with no further CSS or JS changes.**

Everything here is already implemented on the site side. Nothing in
blog-admin has been changed — see "Still to do in blog-admin" at the end.

---

## 1. Listing pages

Three pages now behave identically. Each has a filter bar, an empty state,
and a list container:

| Page | List container | Empty state |
|---|---|---|
| `blog.html` | `<div class="blog-list" id="blog-list">` | `#blog-empty-state` (already removed) |
| `research.html` | `<div class="blog-list" id="research-list">` | `#research-empty-state` |
| `projects.html` | `<div class="blog-list" id="projects-list">` | `#projects-empty-state` |

`blog.html`'s container line is **byte-identical to before** — blog-admin's
existing regex patching still works untouched. Research and projects use the
same `.blog-list` class (so they inherit card styling) with their own ids.

Generated pages go in `blog/<slug>.html`, `research/<slug>.html`,
`projects/<slug>.html`. Post pages one directory deep need `../` on every
asset path, exactly as blog posts already do.

## 2. Card markup

Unchanged from today, with one optional addition — a `.tag-list` **after**
the excerpt, inside `.blog-card-body`:

```html
<a href="blog/my-post.html" class="blog-card">
  <div class="img-frame">…unchanged…</div>
  <div class="blog-card-body">
    <p class="blog-card-date">2026-08-22</p>
    <h2 class="blog-card-title">My Post</h2>
    <p class="blog-card-excerpt">Short excerpt</p>
    <ul class="tag-list">
      <li class="tag">ESP32</li>
      <li class="tag">Audio</li>
    </ul>
  </div>
</a>
```

**Do not add attributes to the opening `<a …class="blog-card">` tag.** The
tag list is read from the `.tag` elements inside the card precisely so that
the anchor blog-admin matches on stays exactly as it is. Omit the whole
`<ul>` when a post has no tags.

`js/tags.js` builds the filter bar from these elements — deduped,
alphabetical, with counts, plus an "All" chip. The bar stays hidden while no
post has a tag, so nothing appears until you start tagging. Filtering is
linkable: `blog.html#tag=ESP32`.

## 3. Tags on a post page

Inside the `.page-hero`, after the title/excerpt:

```html
<ul class="tag-list post-hero-tags">
  <li class="tag">ESP32</li>
</ul>
```

## 4. Video

```html
<figure class="post-attachment post-video">
  <video controls preload="metadata" playsinline poster="../assets/images/blog/<slug>/poster.jpg">
    <source src="../assets/images/blog/<slug>/clip.mp4" type="video/mp4">
  </video>
  <figcaption>Optional caption</figcaption>
</figure>
```

Fills the column, holds a 16:9 box at every width. For YouTube/Vimeo, swap
the `<video>` for an `<iframe>` — same wrapper class, same styling.

Store uploads alongside images in `assets/images/<section>/<slug>/`. Encode
to H.264/AAC MP4; that is the only format that plays everywhere. Do not
re-encode an already-web-safe MP4, same reasoning as the existing
byte-identical passthrough for GIFs.

## 5. PDF

```html
<figure class="post-attachment post-pdf">
  <object data="../assets/images/blog/<slug>/doc.pdf" type="application/pdf"></object>
  <a class="pdf-card" href="../assets/images/blog/<slug>/doc.pdf" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h4"/>
    </svg>
    <span class="pdf-name">doc.pdf</span>
    <span class="pdf-hint">Open PDF</span>
  </a>
  <figcaption>Optional caption</figcaption>
</figure>
```

Both elements are always emitted. Below 720px the `<object>` is hidden by CSS
and only the link card shows — phone browsers render inline PDFs poorly or
not at all, so the card is the real interface there.

## 6. Things that will break if changed

- The literal `<div class="blog-list" id="blog-list">` line in `blog.html`.
- The `<a href="blog/<slug>.html" class="blog-card">` opening tag shape.
- `.blog-card-date` must stay `YYYY-MM-DD` — `js/activity.js` parses it for
  the posting heatmap, and `js/tags.js` walks the same cards.

## 7. Still to do in blog-admin (not done — it isn't in this repo)

1. **Tag editor** — a field on the post form with `+` / `−` to add and remove
   tags. No presets. Persist to `posts/<slug>.json` so the edit flow round-
   trips them, and emit the `.tag-list` markup above.
2. **Destination picker** — blog / research / projects. Drives the output
   directory, which listing file gets patched, and which empty state gets
   removed. The `update_blog_index()` regexes need to take the container id
   as a parameter instead of hardcoding `blog-list`.
3. **PDF + video blocks** — two new content block types alongside
   Text/Code/Quote/Image, emitting the markup in §4 and §5, keyed by block id
   like image blocks already are.
4. **Post template** — add the activity graph include (see below) and the
   hero tag list.

Post pages also need these two additions to `site_template/post_template.html`
for the activity graph, which is already live on every committed page:

```html
  <section class="activity-section">
    <h2>Activity</h2>
    <div id="activity-graph" class="activity-graph" aria-live="polite">
      <p class="activity-summary">Loading activity&hellip;</p>
    </div>
  </section>
```
```html
<script src="../js/activity.js"></script>
```
