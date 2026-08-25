/* ==========================================================================
   Ruaa — storage.js
   Reads and writes the catalogue and the category list, plus the helpers both
   pages share.

   There are two modes, and the site picks one on its own:

   • No Supabase keys in js/data.js — everything is kept in localStorage, so
     designs live in one browser on one computer. Fine for trying things out.
   • Keys filled in — the catalogue lives in Supabase, every visitor sees the
     same designs, and browsers that are already open update the moment you
     publish. See supabase.sql and the README for the five-minute setup.

   Either way the rest of the site only ever calls Catalogue and Categories,
   and hears about changes through onChange().
   ========================================================================== */

/* ------------------------------- Connection ------------------------------- */

let db = null;                       // the Supabase client, once it is ready
const isShared = () => !!db;

function loadSdk(src){
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.onload = resolve;
    tag.onerror = () => reject(new Error('could not load the Supabase library'));
    document.head.appendChild(tag);
  });
}

/* Only fetches the Supabase library when there are keys to use it with, so an
   unconfigured site downloads nothing extra. */
async function connect(){
  const cfg = CONFIG.supabase || {};
  if (!cfg.url || !cfg.key) return null;

  try{
    if (!window.supabase) await loadSdk(cfg.sdk);
    db = window.supabase.createClient(cfg.url, cfg.key);
    console.info('Ruaa: catalogue is shared through Supabase.');
    return db;
  } catch (e){
    console.warn('Ruaa: Supabase unavailable, using this browser only —', e.message || e);
    return null;
  }
}

/* Everything that touches the database waits on this first. */
const ready = connect();

/* ------------------------------ Change events ----------------------------- */

const watchers = { products: [], categories: [] };

function notify(kind, payload){
  watchers[kind].forEach(fn => {
    try{ fn(payload); } catch (e){ console.warn('A change handler failed:', e); }
  });
}

/* Live updates from Supabase: any insert, edit or delete anyone makes. */
function watchShared(){
  db.channel('ruaa-live')
    .on('postgres_changes', { event:'*', schema:'public', table:'products' },
        async () => notify('products', await Catalogue.load()))
    .on('postgres_changes', { event:'*', schema:'public', table:'categories' },
        async () => { await Categories.sync(); notify('categories', Categories.load()); })
    .subscribe();
}

ready.then(() => { if (isShared()) watchShared(); });

/* Without a backend, other tabs in this browser are the only other viewers —
   localStorage fires this event in every tab except the one that wrote. */
window.addEventListener('storage', async e => {
  if (e.key === CONFIG.storageKey){
    notify('products', await Catalogue.load());
  }
  if (e.key === CONFIG.categoryKey || e.key === CONFIG.hiddenCategoryKey){
    await Categories.sync();
    notify('categories', Categories.load());
  }
});

/* ------------------------------- Row mapping ------------------------------ */
/* `desc` is a reserved word in SQL, so the column is called `descr`. `pos`
   keeps the order the dashboard shows. */

const rowToProduct = r => ({
  id: r.id, name: r.name, cat: r.cat, price: r.price, mrp: r.mrp,
  mat: r.mat, desc: r.descr, art: r.art, img: r.img, stock: r.stock
});

const productToRow = (p, i) => ({
  id: p.id, name: p.name, cat: p.cat,
  price: Number(p.price) || 0, mrp: Number(p.mrp) || Number(p.price) || 0,
  mat: p.mat || '', descr: p.desc || '', art: p.art || '', img: p.img || null,
  stock: !!p.stock, pos: i
});

/* Quotes a list of ids for a PostgREST "not in" filter. */
const idList = ids => '(' + ids.map(id => '"' + String(id).replace(/"/g, '') + '"').join(',') + ')';

/* -------------------------------- Catalogue ------------------------------- */

const Catalogue = {
  async load(){
    await ready;

    if (isShared()){
      const { data, error } = await db.from('products').select('*').order('pos');
      if (error){
        console.warn('Could not read the catalogue:', error.message);
        toast('Could not reach the catalogue — showing what this browser has.', 'warn');
        return this.local();
      }
      return data.map(rowToProduct);
    }

    return this.local();
  },

  /* The localStorage copy, used on its own or as the fallback. */
  local(){
    try{
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e){
      console.warn('Could not read saved catalogue:', e);
    }
    return SEED.slice();
  },

  async save(list){
    await ready;

    if (!isShared()){
      try{
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
        return true;
      } catch (e){
        // Usually means the photos are too large for localStorage (~5 MB total).
        console.warn('Could not save catalogue:', e);
        toast('Storage is full. Use smaller photos, or connect Supabase.', 'warn');
        return false;
      }
    }

    const rows = list.map(productToRow);
    const { error } = await db.from('products').upsert(rows);
    if (error){
      console.warn('Could not save the catalogue:', error.message);
      toast('Could not save — check your connection and try again.', 'warn');
      return false;
    }

    // Anything no longer in the list has been deleted in the dashboard.
    const gone = rows.length
      ? db.from('products').delete().not('id', 'in', idList(rows.map(r => r.id)))
      : db.from('products').delete().neq('id', '');

    const { error: cleanupError } = await gone;
    if (cleanupError) console.warn('Could not remove deleted designs:', cleanupError.message);

    return true;
  },

  reset(){
    localStorage.removeItem(CONFIG.storageKey);
  },

  /* Called whenever the catalogue changes anywhere — another tab, or another
     visitor's dashboard. Handed the fresh list. */
  onChange(fn){ watchers.products.push(fn); }
};

/* ------------------------------- Categories ------------------------------- */

/* Kept in memory so the header, footer and dropdown can be drawn without
   waiting on the network. sync() refreshes it. */
let catCache = null;

function catState(){
  if (!catCache){
    catCache = {
      added:  readList(CONFIG.categoryKey),
      hidden: readList(CONFIG.hiddenCategoryKey)
    };
  }
  return catCache;
}

const Categories = {
  /* Pulls the current lists from wherever they live. */
  async sync(){
    await ready;

    if (!isShared()){
      catCache = {
        added:  readList(CONFIG.categoryKey),
        hidden: readList(CONFIG.hiddenCategoryKey)
      };
      return this.load();
    }

    const { data, error } = await db.from('categories').select('*');
    if (error){
      console.warn('Could not read the categories:', error.message);
      return this.load();
    }

    catCache = {
      added:  data.filter(r => !r.hidden).map(r => r.name),
      hidden: data.filter(r =>  r.hidden).map(r => r.name)
    };
    return this.load();
  },

  added(){  return catState().added.slice() },
  hidden(){ return catState().hidden.slice() },

  load(){
    const gone = catState().hidden;
    const defaults = CONFIG.categories.filter(c => !gone.some(h => sameText(h, c)));
    return dedupeText(defaults.concat(catState().added));
  },

  /* True for anything the team made themselves rather than a CONFIG default. */
  isCustom(name){
    return !CONFIG.categories.some(c => sameText(c, name));
  },

  add(name){
    const clean = String(name).trim().replace(/\s+/g, ' ');

    if (!clean)            return { ok:false, why:'Give the category a name.' };
    if (clean.length > 24) return { ok:false, why:'Keep the name under 24 characters.' };
    if (this.load().some(c => sameText(c, clean)))
      return { ok:false, why:`"${clean}" is already a category.` };

    const state = catState();
    state.added.push(clean);
    // Adding a name back also un-deletes the built-in of the same name.
    state.hidden = state.hidden.filter(c => !sameText(c, clean));

    if (!saveCategories()) return { ok:false, why:'Could not save that category.' };
    return { ok:true, name:clean };
  },

  /* Deletes any category. One the team added is dropped outright; a built-in
     is remembered as hidden so restore() can bring it back. */
  remove(name){
    const state = catState();

    if (this.isCustom(name)){
      state.added = state.added.filter(c => !sameText(c, name));
    } else if (!state.hidden.some(c => sameText(c, name))){
      state.hidden.push(name);
    }
    saveCategories();
  },

  restore(name){
    const state = catState();
    state.hidden = state.hidden.filter(c => !sameText(c, name));
    saveCategories();
  },

  /* Resolves once every queued category write has actually landed. The UI
     does not need this — it updates from the cache immediately — but it lets
     anything that cares wait for the database to agree. */
  flush(){ return catWrite; },

  onChange(fn){ watchers.categories.push(fn); }
};

/* Category edits are quick and often come in bursts — delete one, add another.
   Each write replaces the whole list, so they have to reach the database in
   the order they were made or a late cleanup could undo a newer change. This
   queue guarantees that. */
let catWrite = Promise.resolve();

function saveCategories(){
  const state = catState();

  if (!isShared()){
    return writeList(CONFIG.categoryKey, state.added)
        && writeList(CONFIG.hiddenCategoryKey, state.hidden);
  }

  // Snapshot now, so the write reflects this moment rather than a later one.
  const rows = state.added.map(name => ({ name, hidden:false }))
    .concat(state.hidden.map(name => ({ name, hidden:true })));

  catWrite = catWrite
    .then(() => pushCategories(rows))
    .catch(e => console.warn('Category write failed:', e));

  return true;
}

async function pushCategories(rows){
  if (rows.length){
    const { error } = await db.from('categories').upsert(rows);
    if (error){
      console.warn('Could not save the categories:', error.message);
      toast('Could not save that category change.', 'warn');
      return;
    }
  }

  // Whatever is no longer in either list has been deleted or restored.
  const { error } = await (rows.length
    ? db.from('categories').delete().not('name', 'in', idList(rows.map(r => r.name)))
    : db.from('categories').delete().neq('name', ''));

  if (error) console.warn('Category cleanup failed:', error.message);
}

/* ------------------------------ Product photos ---------------------------- */

/* With a backend the photo goes into the storage bucket and the catalogue
   keeps only its URL. Without one, the base64 string is stored as before. */
async function uploadPhoto(dataUrl, name){
  await ready;
  if (!isShared() || !dataUrl || !dataUrl.startsWith('data:')) return dataUrl;

  try{
    const blob = await (await fetch(dataUrl)).blob();
    const ext  = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const file = `${Date.now()}-${slug(name)}.${ext}`;

    const { error } = await db.storage
      .from(CONFIG.supabase.bucket)
      .upload(file, blob, { contentType: blob.type });

    if (error) throw error;

    return db.storage.from(CONFIG.supabase.bucket).getPublicUrl(file).data.publicUrl;
  } catch (e){
    console.warn('Photo upload failed, keeping it inline:', e.message || e);
    toast('Photo upload failed — saved with the design instead.', 'warn');
    return dataUrl;
  }
}

/* --------------------------------- Helpers -------------------------------- */

/* Small JSON list in localStorage — the shape both category lists use. */
function readList(key){
  try{
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e){
    console.warn('Could not read ' + key + ':', e);
  }
  return [];
}

function writeList(key, list){
  try{
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch (e){
    console.warn('Could not save ' + key + ':', e);
    return false;
  }
}

/* Category names are compared loosely, so "anklets" cannot be added twice. */
const sameText = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

const dedupeText = list => {
  const seen = new Set();
  return list.filter(item => {
    const key = String(item).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo';

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const money = n => CONFIG.currency + Number(n).toLocaleString('en-IN');

const esc = s => String(s).replace(/[&<>"]/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'
}[c]));

const discount = p => p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;

/* Uploaded photo if there is one, otherwise a placeholder line drawing. */
function shotFor(p){
  if (p.img) return `<img src="${p.img}" alt="${esc(p.name)}">`;
  return ART[p.art] || ART[ART_KEYS[(p.name || '').length % ART_KEYS.length]];
}

/* ------------------------- Motion, toasts and reveals --------------------- */

/* One place to ask "is the visitor happy with motion?". Every effect on the
   site checks this, so the prefers-reduced-motion block in base.css stays
   honest instead of being fought by JavaScript. */
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* A small brass toast, bottom of the screen. Used instead of alert() so a
   message never freezes the page. Pass 'warn' as the tone for problems. */
function toast(msg, tone){
  let host = document.querySelector('.toast-host');
  if (!host){
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.className = 'toast' + (tone === 'warn' ? ' toast--warn' : '');
  el.setAttribute('role', 'status');
  el.textContent = msg;
  host.appendChild(el);

  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 340);
  }, 3400);
}

/* Fades things in as they scroll into view. Anything carrying [data-reveal]
   is watched; siblings are staggered through the --i custom property.
   Reveals once, then stops observing. */
function watchReveals(root){
  const nodes = Array.from((root || document).querySelectorAll('[data-reveal]'));
  if (!nodes.length) return;

  if (reducedMotion() || !('IntersectionObserver' in window)){
    nodes.forEach(n => n.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      obs.unobserve(entry.target);
    });
  }, { rootMargin:'0px 0px -8% 0px', threshold:0.08 });

  nodes.forEach(n => {
    // Stagger by position among siblings so each group cascades on its own.
    const i = Array.from(n.parentNode.children).indexOf(n);
    n.style.setProperty('--i', Math.min(i, 7));
    io.observe(n);
  });
}

/* Counts a number up when it first scrolls into view. Reads the target from
   data-count and keeps any data-suffix ("k+", " mo") glued to the end. */
function countUp(el){
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (!Number.isFinite(target)) return;

  if (reducedMotion()){
    el.textContent = target + suffix;
    return;
  }

  const DUR = 1100;
  let start = null;

  function step(now){
    if (start === null) start = now;
    const t = Math.min((now - start) / DUR, 1);
    const eased = 1 - Math.pow(1 - t, 3);          // ease-out cubic
    el.textContent = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------------------------------- Logo ---------------------------------- */

/* Drops the brand mark into every [data-logo] slot on the page, so the artwork
   itself lives in one place (LOGO in data.js) instead of being pasted into
   each template. */
function paintLogos(){
  $$('[data-logo]').forEach(slot => { slot.innerHTML = LOGO; });
}

document.addEventListener('DOMContentLoaded', paintLogos);
