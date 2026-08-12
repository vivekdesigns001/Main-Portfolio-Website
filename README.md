# Portfolio — Vivek Singh

Static site. No build step, no dependencies, no framework. Open `index.html` and it works.

```
index.html      the whole page (~190 lines)
styles.css      tokens at the top — change those, not the rules below
main.js         reveal, copy-to-clipboard, ink blob, custom cursor (~320 lines)
assets/
  project-hero.jpg    1536×1024  the work section's image
  portrait.jpg         757×946   About
```

Total ~660KB, most of it the two images.

---

## Still to do

| What | Where |
|---|---|
| `og:image` → absolute URL | `index.html` head |

Everything else is wired.

### Domains

```
Case study   https://kiranaclub-casestudy.vivekdesigns.xyz
Visuals      https://ui-library.vivekdesigns.xyz
```

Both open in a new tab. Both resolve — `CNAME` on each points to Vercel (`*.vercel-dns-*.com`). The original underscore versions (`kiranaclub_casestudy`, `ui_library`) never resolved; `_` isn't a legal character in a DNS hostname label, and the hyphenated versions above replaced them for exactly that reason.

### og:image

Social platforms generally won't resolve a relative `og:image`. Once the domain is live, change both `og:image` and `twitter:image` to the full `https://…/assets/project-hero.jpg`.

---

## Design decisions, so you don't undo them by accident

**Type scale is the hierarchy.** Hero 132px → "Let's talk." 96px → project title 60px. If you scale one up, scale another down.

**One accent, used sparingly.** `--accent` (rust) appears on the hero em-dash, link hover, and the case-study cursor ring. `--good` (green) has exactly one job: the outcome arrow, because time going down is good news.

**No shadows or gradients in the layout.** The only exceptions are inside the ink panel, which is a deliberate set-piece.

**The reveal is one effect** — 10px rise + fade, 600ms, staggered 80ms via `data-delay`. A second kind of motion would make it read as a template.

**The Visuals link is deliberately below the project.** You said the case study is the selling point; the layout has to agree or people click the shiny thing first.

---

## The moving parts in `main.js`

Four independent scripts, each gated so it degrades cleanly:

1. **Reveal on scroll** — IntersectionObserver; falls back to showing everything if unsupported.
2. **Copy to clipboard** — email + phone. Falls back to `execCommand`, then to `mailto:`/`tel:`.
3. **Ink blob** — five circles fused by an SVG "goo" filter (blur → alpha threshold), chasing the cursor. Paused by IntersectionObserver when the panel is off-screen, because it reads layout every frame.
4. **Custom cursor** — a dot with a fading trail, plus a ring that grows and labels itself over the two main links.

**Both cursor scripts and the ink require `pointer: fine`** and are skipped entirely under `prefers-reduced-motion`. On touch, none of them are created and the normal cursor is left alone — important, because `cursor: none` is applied globally when the custom one *is* active.

### Two Safari-specific things

- The ink's `.ink` element must **never** get a CSS `mask-image`. Safari silently drops an SVG filter when a mask sits on an ancestor of the filtered element — the drops stop fusing and just slide past each other. That's why the soft edge is a painted gradient, not a mask.
- The `<filter>` carries an explicit oversized region (`x/y/width/height`); Safari's default is tighter than Chrome's and clips a blur this large.

---

## Publishing

Drag the folder onto [netlify.com/drop](https://app.netlify.com/drop), or push to GitHub and enable Pages. Nothing to build.

Local preview:

```bash
cd "$HOME/Desktop/Main Portfolio Website" && python3 -m http.server 4321
```

Hard-refresh (**Cmd+Shift+R**) after editing CSS or JS — the plain server sends no cache headers and Chrome holds onto them.
