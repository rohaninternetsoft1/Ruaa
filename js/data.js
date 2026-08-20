/* ==========================================================================
   Ruaa — data.js
   Site config, placeholder artwork, and the starter catalogue.
   Edit this file to change the brand name, admin password, or seed products.
   ========================================================================== */

const CONFIG = {
  brand: 'Ruaa',
  tagline: 'Demi-fine jewellery, made to be worn daily',
  handle: 'official.in',            // the line under the RUAA wordmark
  currency: '₹',
  // TODO: move this to a real backend before launch. Anyone can read this file.
  adminPassword: 'rutu1234',
  categories: ['Earrings', 'Necklaces', 'Rings', 'Bracelets', 'Anklets'],
  storageKey: 'ruaa-catalogue'
};

/* The brand mark: two hands reaching towards each other with a scatter of
   sparkles, drawn as line art so it stays sharp at any size and takes the
   colour of whatever it sits on.

   Swapping in artwork from your designer: replace the whole string below with
   <img src="assets/logo.png" alt=""> and nothing else has to change. */
const LOGO = `
<svg viewBox="0 0 120 64" fill="none" aria-hidden="true">
  <g stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M118 11c-15-2-28 3-38 11"/>
    <path d="M118 19c-11 0-21 4-29 11"/>
    <path d="M80 22c-7 5-13 8-21 9"/>
    <path d="M82 26c-6 5-12 8-19 10"/>
    <path d="M85 30c-5 4-10 7-15 10"/>
    <path d="M89 35c-3 3-7 5-11 8"/>
    <path d="M2 53c15 0 29-5 39-13"/>
    <path d="M2 45c11-1 21-5 29-12"/>
    <path d="M41 40c7-4 13-6 21-7"/>
    <path d="M39 36c6-5 12-7 18-9"/>
    <path d="M36 32c5-4 10-7 15-9"/>
    <path d="M32 28c3-3 7-5 11-7"/>
  </g>
  <g fill="currentColor">
    <path d="M0-7C1-2.4 2.4-1 7 0 2.4 1 1 2.4 0 7-1 2.4-2.4 1-7 0-2.4-1-1-2.4 0-7Z" transform="translate(57 14)"/>
    <path d="M0-7C1-2.4 2.4-1 7 0 2.4 1 1 2.4 0 7-1 2.4-2.4 1-7 0-2.4-1-1-2.4 0-7Z" transform="translate(45 24) scale(.62)"/>
    <path d="M0-7C1-2.4 2.4-1 7 0 2.4 1 1 2.4 0 7-1 2.4-2.4 1-7 0-2.4-1-1-2.4 0-7Z" transform="translate(70 25) scale(.5)"/>
  </g>
</svg>`;

/* Line drawings shown when a product has no uploaded photo yet. */
const ART = {
  hoop:    `<svg viewBox="0 0 100 100" fill="none" stroke="#E3C888" stroke-width="2.4"><circle cx="50" cy="58" r="30"/><circle cx="50" cy="58" r="22" opacity=".45"/><path d="M40 30c0-8 4-13 10-13s10 5 10 13"/></svg>`,
  stud:    `<svg viewBox="0 0 100 100" fill="none" stroke="#E3C888" stroke-width="2.4"><circle cx="50" cy="34" r="13"/><path d="M50 47v18"/><circle cx="50" cy="76" r="11" fill="#E3C888" fill-opacity=".22"/></svg>`,
  pendant: `<svg viewBox="0 0 100 100" fill="none" stroke="#E3C888" stroke-width="2.4"><path d="M14 24c8 34 22 46 36 46s28-12 36-46"/><path d="M50 70v9"/><path d="M50 79l9 10-9 10-9-10z" fill="#E3C888" fill-opacity=".25"/></svg>`,
  layer:   `<svg viewBox="0 0 100 100" fill="none" stroke="#E3C888" stroke-width="2.4"><path d="M16 22c7 26 18 36 34 36s27-10 34-36"/><path d="M22 22c6 34 15 47 28 47s22-13 28-47" opacity=".5"/><circle cx="50" cy="72" r="5" fill="#E3C888" fill-opacity=".3"/></svg>`,
  ring:    `<svg viewBox="0 0 100 100" fill="none" stroke="#E3C888" stroke-width="2.4"><circle cx="50" cy="58" r="27"/><path d="M40 33l10-14 10 14" fill="#E3C888" fill-opacity=".25"/></svg>`,
  cuff:    `<svg viewBox="0 0 100 100" fill="none" stroke="#E3C888" stroke-width="2.4"><path d="M76 30a34 34 0 1 0 0 40"/><circle cx="78" cy="28" r="5" fill="#E3C888" fill-opacity=".3"/><circle cx="78" cy="72" r="5" fill="#E3C888" fill-opacity=".3"/></svg>`
};
const ART_KEYS = Object.keys(ART);

/* Starter products. Replace these with your own pieces, or delete them
   from the admin panel once you've uploaded real designs. */
const SEED = [
  { id:'p1', name:'Zoya Twisted Hoops',     cat:'Earrings',  price:1499, mrp:2499, art:'hoop',    stock:true,
    mat:'18k gold plated brass',
    desc:'Chunky twisted hoops with a click-top clasp that stays shut all day.' },

  { id:'p2', name:'Mira Pearl Drop Studs',  cat:'Earrings',  price:1299, mrp:1999, art:'stud',    stock:true,
    mat:'18k gold plated, freshwater pearl',
    desc:'A single freshwater pearl on a slim bar. The one pair that works with everything.' },

  { id:'p3', name:'Ira Solitaire Pendant',  cat:'Necklaces', price:1899, mrp:2999, art:'pendant', stock:true,
    mat:'18k gold plated, zircon',
    desc:'A brilliant-cut zircon on a 16-inch cable chain with a 2-inch extender.' },

  { id:'p4', name:'Anaya Layered Chain',    cat:'Necklaces', price:2199, mrp:3499, art:'layer',   stock:true,
    mat:'18k gold plated brass',
    desc:'Two chains, one clasp — the layered look without the tangle.' },

  { id:'p5', name:'Noor Stacking Ring Set', cat:'Rings',     price:1099, mrp:1799, art:'ring',    stock:true,
    mat:'18k gold plated brass',
    desc:'Set of three: plain band, twisted band, and a pavé-set sliver.' },

  { id:'p6', name:'Saanvi Cuff Bracelet',   cat:'Bracelets', price:1699, mrp:2699, art:'cuff',    stock:false,
    mat:'18k gold plated brass',
    desc:'An open cuff that flexes to your wrist. No clasp to fumble with.' }
];
