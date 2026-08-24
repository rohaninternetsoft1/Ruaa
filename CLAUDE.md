# Project context for Claude Code

## What this is

Ruaa — a static storefront for a demi-fine jewellery brand (18k gold plated,
anti-tarnish, Indian market, prices in ₹). Two pages: a customer-facing
catalogue and a password-gated admin panel for uploading designs.

## Stack

Plain HTML, CSS and vanilla JavaScript. **No framework, no build step, no
package.json.** Do not introduce React, Tailwind, a bundler, or npm
dependencies unless I explicitly ask for them.

Scripts are loaded as classic `<script>` tags, not ES modules, and they share
globals in this order: `data.js` → `storage.js` → (`shop.js` | `admin.js`).
Anything shared by both pages belongs in `storage.js`.

## Where things live

- `js/data.js` — `CONFIG` (brand, handle, admin password, categories, storage
  key), the `LOGO` mark, `ART` placeholder SVGs, `SEED` starter products.
  Single source of truth for brand-level settings.
- `js/storage.js` — the `Catalogue` object (`load`, `save`, `reset`), the
  `Categories` store (`load`, `add`, `remove`, `restore`: `CONFIG` defaults minus
  deleted ones under `CONFIG.hiddenCategoryKey`, plus ones added in the dashboard
  under `CONFIG.categoryKey`), plus
  helpers `$`, `$$`, `money`, `esc`, `discount`, `shotFor`, and the shared
  UI helpers `toast`, `watchReveals`, `countUp`, `reducedMotion`.
- `js/shop.js` — storefront: search, filters, sorting, grid, quick view, bag
  drawer, and the hero/tray motion.
- `js/admin.js` — login, photo upload via FileReader, publish, edit, hide,
  delete, and creating categories.
- `css/base.css` — design tokens in `:root`, typography, buttons, logo, price.
- `assets/favicon.svg` — the browser-tab mark.
- `css/store.css` — storefront only. `css/admin.css` — dashboard only.

## Design system — follow it

Palette (defined in `css/base.css`, never hardcode hex values elsewhere):
`--plum #3B1F35`, `--plum-deep #2A1526`, `--ink #241E1C`, `--shell #F7F2EE`,
`--shell-2 #EFE6E0`, `--brass #C8A24A`, `--brass-soft #E3C888`.

Type: **Syne** for headings (`--display`), **Manrope** for body (`--body`), and
**Playfair Display** (`--wordmark`) for the RUAA logo only — all from Google
Fonts. The logo lockup takes `--logo-ink` and inherits `currentColor`, so it
re-skins with one variable. Corners are soft (`--r: 14px`, pills for buttons).

The signature element is the **velvet display tray** in the hero — dark inset
slots that read like a jewellery box lining. Keep it. Don't add gradients,
glassmorphism, or extra accent colours.

## Conventions

- Event handlers are attached in JS with `addEventListener`, not inline
  `onclick` attributes. Use `data-` attributes to link markup to handlers.
- Any user-supplied string rendered into HTML must pass through `esc()`.
- Prices are integers in rupees; format them with `money()`.
- Keep the site responsive down to 360px and keyboard-navigable, and leave the
  `prefers-reduced-motion` block in `css/base.css` intact.
- Every animation must check `reducedMotion()` before it runs, and use `toast()`
  rather than `alert()` so nothing blocks the page.
- Scroll-in animation is opt-in markup: add `data-reveal` to an element and
  `watchReveals()` handles the rest.
- The header nav and the footer Shop list are rendered by `renderNav()` into
  `[data-nav]` slots from `Categories.load()` — don't hardcode category links.
  Anything with `data-jump="<category>"` filters the grid; wire new ones with
  `wireJumps()`.

## Known limitation

The catalogue and any added categories are persisted to `localStorage`, so both
are per-browser. If I
ask to make uploads real, the intended path is to replace only
`Catalogue.load` and `Catalogue.save` in `js/storage.js` with Supabase or
Firebase calls, and to store photos in a bucket instead of base64.

## Running it

Served over http, not `file://` — VS Code Live Server, or
`python -m http.server 5500`.
