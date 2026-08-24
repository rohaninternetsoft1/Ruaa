/* ==========================================================================
   Ruaa — shop.js
   Storefront behaviour: search, filters, sorting, product grid, quick view,
   the bag drawer, and the small pieces of motion that make it feel finished.
   ========================================================================== */

let products  = [];
let activeCat = 'All';
let query     = '';
let sortBy    = 'featured';
let bag       = [];        // [{ id, qty }] — demo only, not persisted

let lastFocus = null;      // element to return focus to when an overlay closes
let locks     = 0;         // how many overlays are currently holding the scroll

/* ------------------------- Which products are shown ----------------------- */

function matchesQuery(p){
  if (!query) return true;
  const hay = [p.name, p.cat, p.mat, p.desc].join(' ').toLowerCase();
  return hay.includes(query);
}

function sorted(list){
  const out = list.slice();
  if (sortBy === 'low')  out.sort((a, b) => a.price - b.price);
  if (sortBy === 'high') out.sort((a, b) => b.price - a.price);
  if (sortBy === 'off')  out.sort((a, b) => discount(b) - discount(a));
  if (sortBy === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  // "Featured" keeps the catalogue order but floats in-stock pieces up.
  if (sortBy === 'featured') out.sort((a, b) => (b.stock ? 1 : 0) - (a.stock ? 1 : 0));
  return out;
}

function visible(){
  return sorted(products.filter(p =>
    (activeCat === 'All' || p.cat === activeCat) && matchesQuery(p)
  ));
}

/* ------------------------- Top bar and footer list ------------------------- */

/* Both category lists are built from the same store the dashboard writes to,
   so a category added there turns up here as soon as the page is loaded. */
function renderNav(){
  const list = Categories.load();

  $$('[data-nav]').forEach(box => {
    const asList = box.dataset.nav === 'list';

    box.innerHTML = list.map(c => {
      const btn = `<button data-jump="${esc(c)}">${esc(c)}</button>`;
      return asList ? `<li>${btn}</li>` : btn;
    }).join('');
  });
}

/* Every element that jumps to a category, including the ones just rendered. */
function wireJumps(){
  $$('[data-jump]').forEach(el => {
    if (el.dataset.wired) return;             // don't stack handlers on re-render
    el.dataset.wired = '1';
    el.addEventListener('click', () => filterTo(el.dataset.jump));
  });
}

/* --------------------------------- Filters -------------------------------- */

function categoriesInUse(){
  const used = dedupeText(products.map(p => p.cat));

  // Keep the chosen category on screen even when nothing uses it yet — you
  // land here by picking a brand new category from the top bar.
  if (activeCat !== 'All' && !used.some(c => sameText(c, activeCat))) used.push(activeCat);

  return ['All', ...used];
}

/* Each chip carries the number of pieces in that category. */
function countIn(cat){
  return products.filter(p => cat === 'All' || p.cat === cat).length;
}

function renderFilters(){
  $('#filters').innerHTML = categoriesInUse().map(c => `
    <button class="chip ${c === activeCat ? 'on' : ''}" data-cat="${esc(c)}">
      ${esc(c)}<span class="n">${countIn(c)}</span>
    </button>
  `).join('');

  $$('#filters .chip').forEach(btn => {
    btn.addEventListener('click', () => filterTo(btn.dataset.cat));
  });
}

function filterTo(cat){
  activeCat = cat;
  renderFilters();
  renderGrid();
  $('#catalogue').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

function clearFilters(){
  activeCat = 'All';
  query = '';
  $('#search').value = '';
  $('#clearSearch').classList.add('hidden');
  renderFilters();
  renderGrid();
}

/* ------------------------------ Product grid ------------------------------ */

function renderGrid(){
  const list  = visible();
  const ready = products.filter(p => p.stock).length;

  $('#countLine').textContent = list.length === products.length
    ? `${products.length} pieces · ${ready} ready to ship`
    : `Showing ${list.length} of ${products.length} pieces`;

  if (!list.length){
    $('#grid').innerHTML = `
      <div class="empty">
        <b>Nothing matches that yet.</b>
        <span>${query
          ? `No piece is called &ldquo;${esc(query)}&rdquo;. Try a shorter word.`
          : `There is nothing in ${esc(activeCat)} right now.`}</span>
        <button class="btn btn--sm btn--line" id="resetFilters">Show everything</button>
      </div>`;
    $('#resetFilters').addEventListener('click', clearFilters);
    return;
  }

  $('#grid').innerHTML = list.map((p, i) => {
    const off = discount(p);
    return `
      <button class="prod ${p.stock ? '' : 'out'}" data-id="${p.id}" style="--i:${i % 12}">
        <div class="shot">
          ${p.stock
            ? (off ? `<span class="tag">${off}% off</span>` : '')
            : `<span class="tag tag--out">Sold out</span>`}
          ${shotFor(p)}
          <span class="peek">${p.stock ? 'Quick view' : 'Notify me'}</span>
        </div>
        <div class="info">
          <h3>${esc(p.name)}</h3>
          <p class="cat">${esc(p.cat)}</p>
          <div class="price">
            <span class="now">${money(p.price)}</span>
            ${off ? `<span class="was">${money(p.mrp)}</span><span class="off">${off}% off</span>` : ''}
          </div>
        </div>
      </button>`;
  }).join('');

  $$('#grid .prod').forEach(card => {
    card.addEventListener('click', () => quickView(card.dataset.id));
  });
}

/* ------------------------------- Overlays --------------------------------- */

/* Keeps the page behind an overlay from scrolling, and copes with the quick
   view and the bag being open one after the other. */
function lockScroll(on){
  locks = Math.max(0, locks + (on ? 1 : -1));
  document.body.style.overflow = locks ? 'hidden' : '';
}

/* Keeps Tab inside the overlay while it is open. */
function trapFocus(box){
  box.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const items = Array.from(box.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;

    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
}

/* ------------------------------- Quick view ------------------------------- */

function quickView(id){
  const p = products.find(x => x.id === id);
  if (!p) return;

  lastFocus = document.activeElement;
  const off = discount(p);

  $('#modalHost').innerHTML = `
    <div class="veil" id="veil">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
        <button class="close" id="closeQv" aria-label="Close">×</button>
        <div class="qv">
          <div class="shot" id="qvShot">
            ${off && p.stock ? `<span class="tag">${off}% off</span>` : ''}
            ${shotFor(p)}
          </div>
          <div class="qv-body">
            <p class="kicker kicker--dark">${esc(p.cat)}</p>
            <h3>${esc(p.name)}</h3>
            <div class="price">
              <span class="now">${money(p.price)}</span>
              ${p.mrp > p.price ? `<span class="was">${money(p.mrp)}</span>` : ''}
              ${off ? `<span class="off">${off}% off</span>` : ''}
            </div>
            <p class="desc">${esc(p.desc || '')}</p>
            <div class="specs">
              <div><span>Material</span><span>${esc(p.mat || '18k gold plated brass')}</span></div>
              <div><span>Warranty</span><span>6 months on plating</span></div>
              <div><span>Dispatch</span><span>${p.stock ? 'Within 48 hours' : 'Back in 2 weeks'}</span></div>
            </div>
            <button class="btn btn--gold btn--block qv-add ${p.stock ? '' : 'is-out'}" id="addBag">
              ${p.stock ? 'Add to bag' : 'Sold out'}
            </button>
          </div>
        </div>
      </div>
    </div>`;

  lockScroll(true);
  trapFocus($('.sheet'));

  $('#closeQv').addEventListener('click', closeModal);
  $('#veil').addEventListener('click', e => { if (e.target.id === 'veil') closeModal(); });
  if (p.stock) $('#addBag').addEventListener('click', () => addToBag(p));

  $('#closeQv').focus();
}

function modalOpen(){ return !!$('#veil') }

function closeModal(){
  if (!modalOpen()) return;
  $('#modalHost').innerHTML = '';
  lockScroll(false);
  if (lastFocus) lastFocus.focus();
}

/* ----------------------------------- Bag ---------------------------------- */

function bagCount(){ return bag.reduce((n, line) => n + line.qty, 0) }

function bagTotal(){
  return bag.reduce((sum, line) => {
    const p = products.find(x => x.id === line.id);
    return sum + (p ? p.price * line.qty : 0);
  }, 0);
}

function renderBagCount(){
  const el  = $('#bagCount');
  const now = bagCount();
  el.textContent = now;
  el.classList.toggle('filled', now > 0);

  // Restart the pop animation even if the class is already there.
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function addToBag(p){
  const line = bag.find(l => l.id === p.id);
  if (line) line.qty++;
  else bag.push({ id: p.id, qty: 1 });

  flyToBag($('#qvShot'));
  closeModal();
  renderBagCount();
  toast(`${p.name} added to your bag.`);
}

function dropFromBag(id){
  bag = bag.filter(l => l.id !== id);
  renderBagCount();
  renderBagDrawer();
}

/* A gold bead arcs from the product photo into the bag button. */
function flyToBag(fromEl){
  const btn = $('#bagBtn');
  if (reducedMotion() || !fromEl || !btn || !fromEl.animate) return;

  const from = fromEl.getBoundingClientRect();
  const to   = btn.getBoundingClientRect();
  const x0 = from.left + from.width  / 2 - 7;
  const y0 = from.top  + from.height / 2 - 7;
  const x1 = to.left   + to.width    / 2 - 7;
  const y1 = to.top    + to.height   / 2 - 7;

  const bead = document.createElement('div');
  bead.className = 'fly';
  document.body.appendChild(bead);

  const run = bead.animate([
    { transform:`translate(${x0}px, ${y0}px) scale(1)`, opacity:1 },
    { transform:`translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 90}px) scale(1.35)`,
      opacity:1, offset:.55 },
    { transform:`translate(${x1}px, ${y1}px) scale(.35)`, opacity:.15 }
  ], { duration:720, easing:'cubic-bezier(.35,.05,.35,1)' });

  run.onfinish = () => bead.remove();
}

function openBag(){
  lastFocus = document.activeElement;
  renderBagDrawer();
  lockScroll(true);
}

function bagOpen(){ return !!$('#drawerVeil') }

function closeBag(){
  if (!bagOpen()) return;
  $('#drawerHost').innerHTML = '';
  lockScroll(false);
  if (lastFocus) lastFocus.focus();
}

function renderBagDrawer(){
  const lines = bag
    .map(l => ({ line: l, p: products.find(x => x.id === l.id) }))
    .filter(x => x.p);

  const body = lines.length
    ? lines.map(({ line, p }) => `
        <div class="bag-row">
          <div class="thumb">${shotFor(p)}</div>
          <div class="meta">
            <b>${esc(p.name)}</b>
            <small>${esc(p.cat)} · ${money(p.price)}${line.qty > 1 ? ` × ${line.qty}` : ''}</small>
          </div>
          <button class="drop-item" data-drop="${p.id}" aria-label="Remove ${esc(p.name)}">×</button>
        </div>`).join('')
    : `<div class="drawer-empty">Your bag is empty.<br>Tap any piece to take a closer look.</div>`;

  $('#drawerHost').innerHTML = `
    <div class="drawer-veil" id="drawerVeil">
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="Your bag">
        <div class="drawer-head">
          <h3>Your bag</h3>
          <button class="close" id="closeBag" aria-label="Close the bag">×</button>
        </div>
        <div class="drawer-list">${body}</div>
        <div class="drawer-foot">
          <div class="drawer-total"><span>Total</span><b>${money(bagTotal())}</b></div>
          <button class="btn btn--gold btn--block" id="checkout" ${lines.length ? '' : 'disabled'}>
            Checkout
          </button>
          <p class="note">Free shipping over ₹999 · GST included</p>
        </div>
      </aside>
    </div>`;

  trapFocus($('.drawer'));
  $('#closeBag').addEventListener('click', closeBag);
  $('#drawerVeil').addEventListener('click', e => { if (e.target.id === 'drawerVeil') closeBag(); });
  $$('[data-drop]').forEach(b => b.addEventListener('click', () => dropFromBag(b.dataset.drop)));
  $('#checkout').addEventListener('click', () => {
    toast('Checkout is a demo — connect Razorpay or Shopify to take real orders.');
  });
  $('#closeBag').focus();
}

/* --------------------------- Motion and chrome ---------------------------- */

/* Announcement bar: one message at a time, cross-faded. */
function rotateTicker(){
  const ticks = $$('#ticker .tick');
  if (ticks.length < 2 || reducedMotion()) return;

  let i = 0;
  setInterval(() => {
    const leaving = ticks[i];
    i = (i + 1) % ticks.length;

    leaving.classList.remove('on');
    leaving.classList.add('out');
    ticks[i].classList.add('on');
    setTimeout(() => leaving.classList.remove('out'), 500);
  }, 4200);
}

/* The velvet tray leans towards the pointer. Fine pointers only — on a phone
   there is nothing to follow. */
function trayTilt(){
  const tray = $('#tray'), hero = $('#hero');
  if (!tray || !hero || reducedMotion()) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  hero.addEventListener('pointermove', e => {
    const r  = hero.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  - .5;   // -0.5 … 0.5
    const py = (e.clientY - r.top)  / r.height - .5;

    tray.classList.add('tilting');
    tray.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg');
    tray.style.setProperty('--rx', (py * -8).toFixed(2) + 'deg');
  });

  hero.addEventListener('pointerleave', () => {
    tray.classList.remove('tilting');
    tray.style.setProperty('--ry', '0deg');
    tray.style.setProperty('--rx', '0deg');
  });
}

/* A soft light walks from slot to slot, like a lit display case. */
function traySpotlight(){
  const slots = ['tray1','tray2','tray3','tray4'].map(id => $('#' + id)).filter(Boolean);
  if (slots.length < 2 || reducedMotion()) return;

  let i = 0;
  setInterval(() => {
    slots.forEach(s => s.classList.remove('lit'));
    slots[i].classList.add('lit');
    i = (i + 1) % slots.length;
  }, 2000);
}

/* Hero numbers count up the first time they are seen. */
function startStats(){
  const box = $('#heroStats');
  if (!box) return;

  const run = () => $$('#heroStats b').forEach(countUp);
  if (!('IntersectionObserver' in window)) return run();

  const io = new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting){ run(); obs.disconnect(); }
  }, { threshold:.4 });
  io.observe(box);
}

/* One scroll listener drives the slim header and the back-to-top button. */
function watchScroll(){
  const header = $('#siteHeader');
  const toTop  = $('#toTop');

  const onScroll = () => {
    header.classList.toggle('slim', window.scrollY > 24);
    toTop.classList.toggle('on', window.scrollY > 700);
  };

  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  toTop.addEventListener('click', () => {
    window.scrollTo({ top:0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  });
}

/* --------------------------------- Search --------------------------------- */

function wireSearch(){
  const input = $('#search');
  const clear = $('#clearSearch');
  let timer = null;

  input.addEventListener('input', () => {
    clear.classList.toggle('hidden', !input.value);
    clearTimeout(timer);
    timer = setTimeout(() => {           // wait for a pause in typing
      query = input.value.trim().toLowerCase();
      renderGrid();
    }, 160);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape'){ input.value = ''; query = ''; clear.classList.add('hidden'); renderGrid(); }
  });

  clear.addEventListener('click', () => {
    input.value = ''; query = '';
    clear.classList.add('hidden');
    renderGrid();
    input.focus();
  });

  $('#sort').addEventListener('change', e => {
    sortBy = e.target.value;
    renderGrid();
  });
}

/* ----------------------------------- Boot --------------------------------- */

function initShop(){
  products = Catalogue.load();

  // Fill the hero display tray with four placeholder drawings.
  ['tray1','tray2','tray3','tray4'].forEach((id, i) => {
    $('#' + id).innerHTML = ART[ART_KEYS[i]];
  });

  renderNav();
  renderFilters();
  renderGrid();
  wireSearch();
  wireJumps();

  // The dashboard is usually open in another tab. When it saves, catch up
  // without needing a refresh.
  window.addEventListener('storage', e => {
    if (e.key === CONFIG.categoryKey){
      renderNav();
      wireJumps();
    }
    if (e.key === CONFIG.storageKey){
      products = Catalogue.load();
      renderFilters();
      renderGrid();
    }
  });

  $('#bagBtn').addEventListener('click', openBag);

  // Escape closes whatever is on top.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (bagOpen()) closeBag();
    else if (modalOpen()) closeModal();
  });

  watchReveals();
  watchScroll();
  rotateTicker();
  trayTilt();
  traySpotlight();
  startStats();
}

document.addEventListener('DOMContentLoaded', initShop);
