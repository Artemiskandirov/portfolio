# Artem Iskandirov — Portfolio

A single-page portfolio site with a sleeping cat companion, fantasy mode with forest scene, mini-games, and full Web Audio sound design.

## Files

- **`index.html`** — the entire site. Don't edit unless you want to change layout, animations, or code.
- **`data.json`** — **all editable text and links live here.** Edit this file to update bio, projects, links, experience, etc.

## How to edit content

Open `data.json` in any editor. Change any text, URL, or array. Save. Push to your hosting — site updates.

### What you can edit
- **`site`** — page title, brand text, splash CTA, profile photo
- **`tabs`** — labels for tabs (Overview / Experience / etc.)
- **`themes.cat`** and **`themes.fantasy`** — bio, meta lines, status text, game titles, win/lose messages for both modes
- **`overviewLinks`** — the 4 inline links on the Overview screen
- **`experience`** — work history rows. `co` is the avatar color slot (`uchi` / `miry` / `ailet` / `akbars` / `bars`). `initial` is the letter shown in the avatar.
- **`projects`** — all 11 project cards. The `**bold**` markers in `problem`, `approach`, `outcome` get the orange accent color.
- **`education`**, **`skills`**, **`languages`** — education tab content
- **`social`** — the 5 social rows
- **`labels`** — small UI labels (Tools, Languages, Open full case, game labels)
- **`catBubbles`** — what the cat says in different moods (sleeping clicks, when annoyed, etc.)

### Markup inside text
You can use HTML tags in any text field:
- `<strong>important</strong>` — bold/highlight
- `<br>` — line break
- `<em>italic</em>` — italic

In project narratives (`problem`, `approach`, `outcome`), use `**double asterisks**` for the orange accent — they get converted automatically.

### Project gradients
The `bg` field on each project is a CSS gradient. Examples:
- `linear-gradient(135deg, #4a90e2, #7c5fce)` — blue → purple
- `linear-gradient(135deg, #ffb85c, #ff7a6b)` — orange → coral
- `linear-gradient(135deg, #2a4d3a, #6ab37a)` — dark green → emerald
- `linear-gradient(180deg, #color1, #color2)` — vertical instead of diagonal

## Deploy to Vercel

1. Create a Git repo (GitHub recommended) and push these files
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "Add New" → "Project" → import your repo
4. Click "Deploy" — no build step needed, no settings to change
5. You get a `*.vercel.app` URL in ~30 seconds

Every push to `main` auto-deploys. Pull requests get preview URLs.

To use a custom domain: Project Settings → Domains → add your domain, follow DNS instructions.

## Local preview

Open `index.html` directly in a browser. It will load `data.json` via `fetch()` — this works on any local server but **not when opened as `file://`** (browsers block local file fetch). If you want to preview locally without setting up a server:
- The site has a fallback — if `data.json` fails to load, it uses a built-in copy of the same data, so it still works
- Or run a quick server: `python3 -m http.server` in this folder, then open `http://localhost:8000`

## Tech notes

- No build step, no dependencies, no framework
- Web Audio API for all sound (procedural, no audio files)
- All graphics inline as SVG or pixel-rendered SVG
- One image asset: the cat photo (Framer CDN)
- Works offline once loaded
