/* ==========================================================================
   Ruaa — admin.js
   Login, photo upload, publish, edit, hide and delete.
   ========================================================================== */

let items     = [];
let photoData = null;   // base64 string of the uploaded photo
let editingId = null;   // set while editing an existing design

/* ---------------------------------- Login --------------------------------- */

function login(){
  if ($('#pw').value === CONFIG.adminPassword){
    $('#gate').classList.add('hidden');
    $('#dash').classList.remove('hidden');
    items = Catalogue.load();
    renderCats();
    renderRows();
  } else {
    const gate = $('#gate');
    $('#pw').value = '';
    $('#pw').placeholder = 'Wrong password — try again';

    // Restart the shake even if the class is already on the panel.
    gate.classList.remove('shake');
    void gate.offsetWidth;
    gate.classList.add('shake');
    toast('That password did not match.', 'warn');
    $('#pw').focus();
  }
}

function logout(){
  $('#dash').classList.add('hidden');
  $('#gate').classList.remove('hidden');
  $('#pw').value = '';
}

/* ------------------------------ Photo upload ------------------------------ */

function usePhoto(file){
  if (!file) return;

  if (!file.type.startsWith('image/')){
    toast('That file is not an image.', 'warn');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    photoData = reader.result;
    $('#aPreview').src = photoData;
    $('#aPreview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function readPhoto(e){ usePhoto(e.target.files[0]) }

/* Lets the team drop a photo straight onto the dashed box. */
function wireDrop(){
  const zone = $('#drop');

  ['dragenter','dragover'].forEach(type => {
    zone.addEventListener(type, e => {
      e.preventDefault();
      zone.classList.add('over');
    });
  });

  ['dragleave','drop'].forEach(type => {
    zone.addEventListener(type, e => {
      e.preventDefault();
      zone.classList.remove('over');
    });
  });

  zone.addEventListener('drop', e => {
    usePhoto(e.dataTransfer.files[0]);
  });
}

/* ------------------------------- Categories ------------------------------- */

/* Everything the dropdown should offer: the saved list, plus any category an
   existing design still uses — so editing an old piece never loses its own. */
function catOptions(){
  return dedupeText(Categories.load().concat(items.map(p => p.cat)));
}

/* Rebuilds the dropdown, keeping the current choice selected where it can. */
function renderCats(keep){
  const select = $('#aCat');
  const want   = keep || select.value;

  select.innerHTML = catOptions()
    .map(c => `<option${sameText(c, want) ? ' selected' : ''}>${esc(c)}</option>`)
    .join('');

  renderCatList();
}

/* How many designs sit in a category right now. */
function usageOf(name){
  return items.filter(p => sameText(p.cat, name)).length;
}

/* Every category the store offers, each with its usage count and a delete
   button — plus any built-in that was deleted, ready to be put back. */
function renderCatList(){
  const live = catOptions();
  const gone = Categories.hidden().filter(c => !live.some(a => sameText(a, c)));
  const box  = $('#catList');

  if (!live.length && !gone.length){
    box.innerHTML = '<span class="catlist-empty">No categories yet — add one above.</span>';
    return;
  }

  box.innerHTML =
    live.map(c => `
      <span class="cat-chip">${esc(c)}<span class="n">${usageOf(c)}</span>
        <button data-delcat="${esc(c)}" title="Delete this category"
                aria-label="Delete the ${esc(c)} category">×</button>
      </span>`).join('') +
    gone.map(c => `
      <span class="cat-chip cat-chip--off">${esc(c)}
        <button data-recat="${esc(c)}" title="Put this category back"
                aria-label="Restore the ${esc(c)} category">+</button>
      </span>`).join('');

  $$('[data-delcat]').forEach(b => {
    b.addEventListener('click', () => removeCategory(b.dataset.delcat));
  });
  $$('[data-recat]').forEach(b => {
    b.addEventListener('click', () => restoreCategory(b.dataset.recat));
  });
}

function toggleNewCat(show){
  const box = $('#newCat');
  const on  = show === undefined ? box.classList.contains('hidden') : show;

  box.classList.toggle('hidden', !on);
  if (on) $('#aNewCat').focus();
  else $('#aNewCat').value = '';
}

function addCategory(){
  const result = Categories.add($('#aNewCat').value);

  if (!result.ok){
    toast(result.why, 'warn');
    $('#aNewCat').focus();
    return;
  }

  toggleNewCat(false);
  renderCats(result.name);          // land on the category they just made
  toast(`Added "${result.name}" — it is now in the store's top bar.`);
}

function removeCategory(name){
  const used = usageOf(name);

  if (used){
    toast(`${used} design${used > 1 ? 's use' : ' uses'} "${name}" — move them first.`, 'warn');
    return;
  }

  const builtIn = !Categories.isCustom(name);
  Categories.remove(name);
  renderCats();

  toast(builtIn
    ? `Deleted "${name}". Press + on the greyed chip to put it back.`
    : `Deleted "${name}".`);
}

function restoreCategory(name){
  Categories.restore(name);
  renderCats();
  toast(`"${name}" is back in the store's categories.`);
}

/* --------------------------------- Publish -------------------------------- */

function saveProduct(){
  const name  = $('#aName').value.trim();
  const price = Number($('#aPrice').value);

  if (!name || !price){
    flash('Add a design name and a selling price to publish.');
    return;
  }

  const data = {
    name,
    cat:   $('#aCat').value,
    mat:   $('#aMat').value.trim(),
    price,
    mrp:   Number($('#aMrp').value) || price,
    desc:  $('#aDesc').value.trim(),
    stock: $('#aStock').checked
  };

  if (editingId){
    const p = items.find(x => x.id === editingId);
    Object.assign(p, data);
    if (photoData) p.img = photoData;
    flash('Updated "' + name + '".');
  } else {
    items.unshift(Object.assign({
      id:  'p' + Date.now(),
      img: photoData,
      art: ART_KEYS[Math.floor(Math.random() * ART_KEYS.length)]
    }, data));
    flash('Published "' + name + '" to the catalogue.');
  }

  Catalogue.save(items);
  resetForm();
  renderRows();
}

/* ------------------------------ Row actions ------------------------------- */

function editProduct(id){
  const p = items.find(x => x.id === id);
  editingId = id;

  $('#aName').value  = p.name;
  $('#aCat').value   = p.cat;
  $('#aMat').value   = p.mat || '';
  $('#aPrice').value = p.price;
  $('#aMrp').value   = p.mrp;
  $('#aDesc').value  = p.desc || '';
  $('#aStock').checked = !!p.stock;
  $('#saveBtn').textContent = 'Save changes';

  if (p.img){
    $('#aPreview').src = p.img;
    $('#aPreview').classList.remove('hidden');
  }
  window.scrollTo({ top:0, behavior:'smooth' });
}

function toggleStock(id){
  const p = items.find(x => x.id === id);
  p.stock = !p.stock;
  Catalogue.save(items);
  renderRows();
  toast(p.stock ? `"${p.name}" is back on the store.` : `"${p.name}" is hidden from the store.`);
}

function removeProduct(id){
  const p = items.find(x => x.id === id);
  if (!confirm('Remove "' + p.name + '" from the catalogue?')) return;

  items = items.filter(x => x.id !== id);
  Catalogue.save(items);
  renderRows();
  toast(`Removed "${p.name}".`);
}

function resetForm(){
  editingId = null;
  photoData = null;
  ['aName','aPrice','aMrp','aDesc'].forEach(id => $('#' + id).value = '');
  $('#aImg').value = '';
  $('#aPreview').classList.add('hidden');
  $('#aStock').checked = true;
  $('#saveBtn').textContent = 'Publish to catalogue';
}

/* -------------------------------- Rendering ------------------------------- */

function flash(msg){
  const box = $('#flash');
  box.textContent = msg;
  box.classList.remove('hidden');
  setTimeout(() => box.classList.add('hidden'), 3200);
}

function renderRows(){
  $('#adminCount').textContent = items.length + ' designs';
  renderCatList();          // a deleted design can free up a category

  if (!items.length){
    $('#adminRows').innerHTML =
      '<div class="rows-empty">Nothing published yet. Fill in the form to add your first design.</div>';
    return;
  }

  $('#adminRows').innerHTML = items.map((p, i) => `
    <div class="row" style="--i:${Math.min(i, 11)}">
      <div class="thumb">${shotFor(p)}</div>
      <div class="meta">
        <b>${esc(p.name)}</b>
        <small>${esc(p.cat)} · ${money(p.price)} · ${p.stock ? 'In stock' : 'Hidden'}</small>
      </div>
      <div class="act">
        <button class="mini" data-edit="${p.id}">Edit</button>
        <button class="mini" data-toggle="${p.id}">${p.stock ? 'Hide' : 'Show'}</button>
        <button class="mini mini--danger" data-remove="${p.id}">Delete</button>
      </div>
    </div>`).join('');

  $$('[data-edit]').forEach(b   => b.addEventListener('click', () => editProduct(b.dataset.edit)));
  $$('[data-toggle]').forEach(b => b.addEventListener('click', () => toggleStock(b.dataset.toggle)));
  $$('[data-remove]').forEach(b => b.addEventListener('click', () => removeProduct(b.dataset.remove)));
}

/* ----------------------------------- Boot --------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Build the category dropdown: CONFIG's defaults plus anything added here.
  renderCats();

  $('#newCatBtn').addEventListener('click', () => toggleNewCat());
  $('#addCatBtn').addEventListener('click', addCategory);
  $('#cancelCatBtn').addEventListener('click', () => toggleNewCat(false));
  $('#aNewCat').addEventListener('keydown', e => {
    if (e.key === 'Enter')  addCategory();
    if (e.key === 'Escape') toggleNewCat(false);
  });

  $('#loginBtn').addEventListener('click', login);
  $('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('#logoutBtn').addEventListener('click', logout);
  $('#saveBtn').addEventListener('click', saveProduct);
  $('#clearBtn').addEventListener('click', resetForm);
  $('#aImg').addEventListener('change', readPhoto);
  wireDrop();
});
