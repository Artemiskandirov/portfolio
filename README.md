# Artem Iskandirov — Portfolio

Live: https://artemiskandirov.github.io/portfolio/ (RU: `/ru/`)

A one-page CV site: plain semantic HTML that people, ATS parsers and AI screeners can all read,
plus two playful extras — a 3D light bulb that switches the theme and a 3D voxel cat in the corner.

## Files

- **`index.html`** — English page. All text lives right here, in plain HTML.
- **`ru/index.html`** — Russian page, same structure.
- `assets/css/site.css` — layout, colors (light/dark tokens at the top), print styles.
- `assets/css/cat.css`, `assets/js/cat.js` — the cat: state machine, moods, reactions, fish feeding, toys, walks, pixel-sprite fallback.
- `assets/js/cat3d.js` — the 3D voxel cat (three.js): model built from voxels in code, one procedural pose per cat state,
  and a voxel fish built from the same pixel map as the fish icon.
- `assets/js/bulb.js` — the 3D bulb (three.js, vendored in `assets/vendor/`).
- `assets/js/site.js` — theme switching, screenshot lightbox, lazy start of the bulb.
- `assets/js/sound.js` — procedural Web Audio sounds (no audio files).
- `assets/fonts/` — Lebowski by Pragmatica (free license, see the `.rtf` next to the fonts; files must stay unmodified).
- `Artem_Iskandirov_CV_EN.pdf`, `Artem_Iskandirov_CV_RU.pdf` — downloadable one-page CVs, built from `cv/cv-en.html` and `cv/cv-ru.html`.

## Editing content

Edit the text in `index.html` and `ru/index.html` directly — keep both in sync.

- **Experience**: one `<article class="row job">` per job. Dates go in `<time datetime="YYYY-MM">`.
  Metrics wrapped in `<strong>` get the accent color.
- **Screenshots**: add a `<button class="shot" data-full="…">` inside `.shots`; images live in `assets/img/work/`.
- **Structured data**: the `application/ld+json` block in `<head>` mirrors the CV for search engines and AI parsers —
  update it when a job, title or contact changes.
- **Cat lines** (what it says) are at the top of `assets/js/cat.js`, in both languages.
- **CV**: edit `cv/cv-en.html` / `cv/cv-ru.html` (styles in `cv/cv.css`), then run `node cv/build.js` (needs Playwright).
  It rewrites both PDFs and warns if a CV no longer fits on one page.

## How the extras work

- **Bulb**: tap it, or pull it down by the cord, to switch the theme (lamp on = dark theme). Drag it sideways to swing it.
  Keyboard: Tab to it, press Enter. Without WebGL it falls back to a plain icon button.
- **Cat** (3D voxels; the old pixel sprite is used when WebGL is unavailable): its head follows the cursor; click to pet (4+ clicks — purring, 7+ — it gets annoyed), double-click to make it jump, hold to annoy,
  drag to carry it around. It only eats fish, and a fish comes from writing to Artem: a click on an email, Telegram or LinkedIn
  link (they carry a small "fish +1" badge) throws a fish from the link into its mouth. One fish lasts about a minute.
  Toys next to the fish counter: a ball (the cat chases and bats it; grab and throw it yourself) and a laser pointer
  (the cat stalks the red dot along the bottom of the screen and pounces; Esc turns it off). Now and then it takes a walk on its own.
- **Sound** is on by default and plays only on interaction; the speaker button in the header mutes it.

## Local preview

```
python3 -m http.server
```

then open http://localhost:8000. No build step, no dependencies.
