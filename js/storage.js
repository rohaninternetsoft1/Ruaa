/* ==========================================================================
   Ruaa — storage.js
   Reads and writes the catalogue, plus helpers shared by both pages.

   Right now the catalogue lives in the browser's localStorage, which means
   uploads are visible on THIS computer only. To go live, swap the two
   functions in Catalogue below for calls to a real backend (Supabase,
   Firebase, or your own API). Nothing else in the project needs to change.
   ========================================================================== */

const Catalogue = {
  load(){
    try{
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e){
      console.warn('Could not read saved catalogue:', e);
    }
    return SEED.slice();
  },

  save(list){
    try{
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(list));
    } catch (e){
      // Usually means the photos are too large for localStorage (~5 MB total).
      console.warn('Could not save catalogue:', e);
      toast('Storage is full. Use smaller photos, or connect a real backend.', 'warn');
    }
  },

  reset(){
    localStorage.removeItem(CONFIG.storageKey);
  }
};

/* --------------------------------- Helpers -------------------------------- */

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
