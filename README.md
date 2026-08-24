# Ruaa — demi-fine jewellery store

A static jewellery storefront with an admin panel for uploading designs.
No build step, no npm install. Plain HTML, CSS and JavaScript.

## Run it

The site needs to be served over `http://`, not opened as a file, because the
storefront and the admin panel share browser storage and that only works when
both pages come from the same origin.

**Easiest way — VS Code Live Server:**

1. Open this folder in VS Code
2. Install the "Live Server" extension
3. Right-click `index.html` → **Open with Live Server**

**Or from the terminal:**

```bash
python -m http.server 5500
```

Then open <http://localhost:5500>.

## What the storefront does

- **Search** across name, category, material and description, as you type
- **Sort** by price, discount or name, on top of the category chips
- **Quick view** — click any piece for a full card, with Escape and focus trapping
- **Bag drawer** — slides in from the right, remove lines, running total
  (the checkout button is a demo, see *this is a front-end only* below)
- Motion: the velvet tray leans towards your pointer with a light moving slot to
  slot, hero numbers count up, sections fade in as you scroll, and the header
  tightens once you leave the top

All of it switches off for visitors who ask for reduced motion in their OS.

## Pages

| File | What it is |
|---|---|
| `index.html` | The storefront customers see |
| `admin.html` | Login + catalogue manager |

Admin password: **`ruaa123`** — change it in `js/data.js`.
The admin panel also takes a photo dragged straight onto the dashed box.

## Project structure

```
ruaa/
├── index.html          Storefront
├── admin.html          Admin panel
├── css/
│   ├── base.css        Colours, fonts, buttons — edit the palette here
│   ├── store.css       Header, hero, product grid, quick view, footer
│   └── admin.css       Dashboard styling
├── js/
│   ├── data.js         Brand name, logo, password, categories, starter products
│   ├── storage.js      Saving and loading the catalogue + helpers
│   ├── shop.js         Storefront behaviour
│   └── admin.js        Upload, edit, hide, delete
└── assets/
    └── favicon.svg     Browser-tab mark — put product photos here too
```

## Common edits

**Change the colours** — `css/base.css`, the `:root` block at the top.
`--plum` is the deep background, `--brass` is the gold accent.

**Change the brand name** — search for `Ruaa` in `index.html`, `admin.html`
and `js/data.js`.

**Change the logo** — the mark is the `LOGO` string in `js/data.js`, drawn once
and dropped into every `data-logo` slot. To use artwork from your designer,
save it as `assets/logo.png` (transparent background) and replace that whole
string with `<img src="assets/logo.png" alt="">`. Its colour comes from
`--logo-ink` in `css/base.css`.

**Add a category** — in the admin panel, click **+ New** beside the Category
dropdown, type a name and press Add. It is saved in that browser and appears in the
storefront's top bar and footer straight away, and as a filter chip once a
design uses it. Under **Store categories** every
category is listed as a chip with the number of designs using it and an × to
delete it. A category still in use can&rsquo;t be deleted — move those designs
first. Deleting one of the five built-ins only hides it: it comes back as a
dashed chip with a **+** to restore it, and `js/data.js` is never touched.

To add one permanently for everyone, put it in `CONFIG.categories` in
`js/data.js` instead — that list ships with the site, so it is the one that
reaches a hosted copy.

**Change the admin password** — `CONFIG.adminPassword` in `js/data.js`.

## Important: this is a front-end only

Uploaded designs and any categories you add are saved in **localStorage**, which
lives in one browser on one computer. That is fine for demos and for designing the site, but a customer
visiting your hosted site would only see the starter products in `js/data.js`.

To take real orders you need a backend. Three realistic paths:

1. **Shopify** — rebuild this design as a Shopify theme. You get the admin,
   image hosting, Razorpay/UPI checkout and shipping out of the box.
2. **Supabase or Firebase** — keep this front-end, replace the two functions in
   `js/storage.js` (`Catalogue.load` and `Catalogue.save`) with database calls.
   Product photos go to their storage bucket instead of base64.
3. **Your own API** — same swap, pointed at your server.

The code is deliberately structured so that only `js/storage.js` has to change.

## Deploying the static version

Drag this folder onto [Netlify Drop](https://app.netlify.com/drop), or push it
to GitHub and turn on GitHub Pages. Both are free and take about a minute.
