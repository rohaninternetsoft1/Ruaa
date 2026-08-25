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
├── supabase.sql        Run once in Supabase to share the catalogue
├── js/
│   ├── data.js         Brand name, logo, password, categories, Supabase keys
│   ├── storage.js      Catalogue + categories (localStorage or Supabase)
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

## Sharing the catalogue with everyone (Supabase)

Out of the box, designs are saved in **localStorage** — one browser, one
computer. Visitors to your hosted site see only the starter products in
`js/data.js`. That is fine while you design the site.

Connect Supabase and it changes completely: every visitor reads the same
catalogue, and browsers that are already open update **the moment you publish**,
with no refresh. Setup is about five minutes and costs nothing on the free tier.

### 1. Make a project

Sign up at [supabase.com](https://supabase.com), create a project, and pick a
region close to your customers (Mumbai / `ap-south-1` for India).

### 2. Create the tables

In the Supabase dashboard open **SQL Editor → New query**, paste the whole of
[`supabase.sql`](supabase.sql) from this folder, and press **Run**. It creates
the catalogue and category tables, the photo bucket, the access rules, turns on
live updates, and loads the six starter designs. Running it twice is harmless.

### 3. Paste your keys

In the dashboard go to **Settings → API** and copy the **Project URL** and the
**anon public** key. Put them in `CONFIG.supabase` in `js/data.js`:

```js
supabase: {
  url:    'https://abcdefgh.supabase.co',
  key:    'eyJhbGciOi...',          // the anon public key
  bucket: 'photos',
  sdk:    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'
}
```

The anon key is designed to be public — it is safe in a file visitors can read.

### 4. Check it worked

Reload the store and open the browser console (F12). You should see:

```
Ruaa: catalogue is shared through Supabase.
```

Publish something in the admin panel with the storefront open in another window
and it should appear there within about a second, on any device.

Leave `url` and `key` empty at any time and the site quietly goes back to
localStorage, so nothing breaks while you are setting up.

### What changes once it is connected

| | Before | After |
|---|---|---|
| Who sees your uploads | only your browser | everyone |
| Updates for open visitors | never | within ~1 second |
| Product photos | base64, ~5 MB total limit | files in a bucket, 1 GB free |
| Categories | per browser | shared |

### Locking down writes

`supabase.sql` allows **anyone to write** to your catalogue. That is deliberate:
the admin password sits in `js/data.js`, where any visitor can read it, so a
password-only gate is not real security anyway. For a demo or a soft launch this
is fine — you are trading a small risk for a five-minute setup.

Before you take real money through this site, switch to Supabase Auth: create a
single admin user, sign in with it instead of the `js/data.js` password, and
change the write policies in `supabase.sql` from `using (true)` to
`using (auth.role() = 'authenticated')`. Ask and I will wire it up.

## Still not a shop

Even with Supabase, this takes no payments. The bag and Checkout button are a
demo. To sell, add Razorpay or a Shopify checkout, or rebuild the design as a
Shopify theme and get admin, image hosting, UPI checkout and shipping in one go.

## Deploying the static version

Drag this folder onto [Netlify Drop](https://app.netlify.com/drop), or push it
to GitHub and turn on GitHub Pages. Both are free and take about a minute.
