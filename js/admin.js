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
  // Build the category dropdown from CONFIG so there's one source of truth.
  $('#aCat').innerHTML = CONFIG.categories
    .map(c => `<option>${esc(c)}</option>`).join('');

  $('#loginBtn').addEventListener('click', login);
  $('#pw').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('#logoutBtn').addEventListener('click', logout);
  $('#saveBtn').addEventListener('click', saveProduct);
  $('#clearBtn').addEventListener('click', resetForm);
  $('#aImg').addEventListener('change', readPhoto);
  wireDrop();
});
