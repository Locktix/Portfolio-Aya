/* ============================================================
   AYAA — Admin Panel SPA
   ============================================================ */

const API = 'api.php';
let content = null;
let isDirty  = false;

// ── API helpers ───────────────────────────────────────────────────────────

async function apiFetch(action, opts = {}) {
  const url = `${API}?action=${action}`;
  const res = await fetch(url, opts);
  if (action === 'get_content' && res.ok) return res.json();
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function loadContent() {
  return apiFetch('get_content');
}

async function saveContent() {
  try {
    await apiFetch('save_content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setDirty(false);
    showToast('Sauvegardé avec succès', 'success');
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error');
  }
}

async function uploadImage(file, category) {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('category', category);
  const res = await fetch(`${API}?action=upload_image`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Upload failed');
  return data;
}

async function deleteImageApi(path) {
  return apiFetch('delete_image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

function moveImageApi(path, category) {
  return apiFetch('move_image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, category }),
  });
}

function createCategoryApi(id) {
  return apiFetch('create_category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

function deleteCategoryApi(id) {
  return apiFetch('delete_category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}

// ── Sélecteur d'image réutilisable ──────────────────────────────────────────
// imageField(valeur, catégorieUpload, onChange) → markup HTML branché sur le
// modal de sélection (choisir une image existante OU en uploader une nouvelle).

let imgFieldSeq = 0;
const imgFields = {};

function imageField(value, category, onChange) {
  const id = 'imgf' + (++imgFieldSeq);
  imgFields[id] = {
    category,
    value: value || '',
    apply(v) { this.value = v; onChange(v); markDirty(); },
  };
  return imageFieldMarkup(id);
}

function imageFieldMarkup(id) {
  const v = imgFields[id].value;
  return `<div class="img-field" data-imgfield="${id}">
      <div class="img-field-preview${v ? '' : ' is-empty'}">
        ${v ? `<img src="../${esc(v)}" alt="">` : '<span class="img-field-ph">∅</span>'}
      </div>
      <div class="img-field-side">
        <div class="img-field-path">${v ? esc(v) : '<em class="muted">aucune image</em>'}</div>
        <div class="img-field-btns">
          <button type="button" class="btn btn-ghost btn-sm" data-img-pick="${id}">Choisir / uploader</button>
          ${v ? `<button type="button" class="btn btn-danger btn-sm" data-img-clear="${id}">Retirer</button>` : ''}
        </div>
      </div>
    </div>`;
}

function rerenderImageField(id) {
  const el = document.querySelector(`[data-imgfield="${id}"]`);
  if (el) el.outerHTML = imageFieldMarkup(id);
}

// Délégation globale (attachée une fois dans init)
function setupImageFieldDelegation() {
  document.addEventListener('click', e => {
    const pick = e.target.closest('[data-img-pick]');
    if (pick) {
      const id  = pick.dataset.imgPick;
      const reg = imgFields[id];
      if (!reg) return;
      openImagePicker(reg.category, path => { reg.apply(path); rerenderImageField(id); });
      return;
    }
    const clr = e.target.closest('[data-img-clear]');
    if (clr) {
      const id = clr.dataset.imgClear;
      if (imgFields[id]) { imgFields[id].apply(''); rerenderImageField(id); }
    }
  });
}

async function openImagePicker(category, onPick) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>Choisir une image</h3>
        <button class="modal-close" data-modal-close title="Fermer">✕</button>
      </div>
      <div class="modal-body">
        <div class="picker-upload">
          <button class="btn btn-primary btn-sm picker-upload-btn">⊕ Uploader une nouvelle image</button>
          <span class="picker-upload-cat">→ dossier « ${esc(category)} »</span>
          <span class="picker-upload-status"></span>
          <input type="file" accept="image/*" class="picker-file" style="display:none;">
        </div>
        <div class="picker-divider"><span>ou choisir une image déjà présente</span></div>
        <div class="picker-grid"><div class="loading"><div class="loading-spinner"></div>Chargement…</div></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  let closed = false;
  function closeModal() {
    if (closed) return;
    closed = true;
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 220);
  }
  function done(path) { onPick(path); closeModal(); }

  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-modal-close]')) closeModal();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
  });

  // Upload
  const fileInput = overlay.querySelector('.picker-file');
  overlay.querySelector('.picker-upload-btn').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const status = overlay.querySelector('.picker-upload-status');
    status.textContent = 'Upload…';
    try {
      const r = await uploadImage(file, category);
      done(r.path);
    } catch (err) {
      status.textContent = 'Erreur : ' + err.message;
    }
  };

  // Parcourir l'existant
  const grid = overlay.querySelector('.picker-grid');
  try {
    const data = await apiFetch('list_all_images');
    const cats = data.categories || {};
    const keys = Object.keys(cats);
    if (!keys.length) {
      grid.innerHTML = '<p class="picker-empty">Aucune image pour le moment — uploadez-en une.</p>';
    } else {
      grid.innerHTML = keys.map(cat => `
        <div class="picker-cat-label">${esc(cat)}</div>
        <div class="picker-cat-grid">
          ${cats[cat].map(p => `
            <button class="picker-thumb" type="button" data-pick-path="${esc(p)}" title="${esc(p)}">
              <img src="../${esc(p)}" alt="" loading="lazy">
            </button>`).join('')}
        </div>`).join('');
      grid.querySelectorAll('[data-pick-path]').forEach(b => {
        b.onclick = () => done(b.dataset.pickPath);
      });
    }
  } catch (err) {
    grid.innerHTML = `<p class="picker-empty">Erreur : ${esc(err.message)}</p>`;
  }
}

// ── Dirty state ───────────────────────────────────────────────────────────

function setDirty(val) {
  isDirty = val;
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (dot && text) {
    dot.className  = 'status-dot' + (val ? ' dirty' : '');
    text.textContent = val ? 'Modifications non sauvegardées' : 'Synchronisé';
  }
}

function markDirty() { setDirty(true); }

// ── Toast ─────────────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const icons = { success: '✓', error: '✕', info: '◎', warning: '⚠' };
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type] || '◎'}</span><span class="toast-msg">${esc(message)}</span>`;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    t.addEventListener('transitionend', () => t.remove(), { once: true });
  }, 3200);
}

// ── Navigation ────────────────────────────────────────────────────────────

let currentSection = 'site';

function navigate(section) {
  currentSection = section;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.section === section)
  );
  const main = document.getElementById('section-container');
  main.innerHTML = `<div class="loading"><div class="loading-spinner"></div>Chargement…</div>`;
  requestAnimationFrame(() => {
    main.innerHTML = '';
    const renderers = {
      site:     renderSite,
      accueil:  renderAccueil,
      galerie:  renderGalerie,
      demarche: renderDemarche,
      parcours: renderParcours,
      contact:  renderContact,
    };
    renderers[section]?.(main);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bind(id, setter) {
  const el = document.getElementById(id);
  if (!el) return;
  const handler = e => { setter(e.target.value); markDirty(); };
  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}

function bindDelegate(parent, attr, handler) {
  parent.addEventListener('input',  e => { if (e.target.dataset[attr] !== undefined) { handler(e); markDirty(); } });
  parent.addEventListener('change', e => { if (e.target.dataset[attr] !== undefined) { handler(e); markDirty(); } });
}

function saveBar(hint = '') {
  return `
    <div class="save-bar">
      <button class="btn-save" id="btn-save-section">SAUVEGARDER</button>
      ${hint ? `<span class="save-hint">${hint}</span>` : ''}
    </div>`;
}

function attachSave() {
  const btn = document.getElementById('btn-save-section');
  if (btn) btn.onclick = saveContent;
}

// ── SECTION: Site ─────────────────────────────────────────────────────────

function renderSite(c) {
  const s = content.site;
  c.innerHTML = `
    <h1 class="section-title">SITE</h1>
    <p class="section-subtitle">Informations globales du portfolio</p>

    <div class="form-group">
      <label class="form-label">Nom du site</label>
      <input type="text" class="form-input" id="site-name" value="${esc(s.name)}">
    </div>
    <div class="form-group">
      <label class="form-label">Tagline</label>
      <input type="text" class="form-input" id="site-tagline" value="${esc(s.tagline)}">
    </div>
    <div class="form-group">
      <label class="form-label">Copyright</label>
      <input type="text" class="form-input" id="site-copyright" value="${esc(s.copyright)}">
    </div>
    ${saveBar()}`;

  bind('site-name',      v => s.name      = v);
  bind('site-tagline',   v => s.tagline   = v);
  bind('site-copyright', v => s.copyright = v);
  attachSave();
}

// ── SECTION: Accueil ──────────────────────────────────────────────────────

function renderAccueil(c) {
  const a = content.accueil;
  c.innerHTML = `
    <h1 class="section-title">ACCUEIL</h1>
    <p class="section-subtitle">Page principale — héro, travaux récents, introduction</p>

    <div class="block-heading">Héro</div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Watermark</label>
        <input type="text" class="form-input" id="hero-watermark" value="${esc(a.hero.watermark)}">
      </div>
      <div class="form-group">
        <label class="form-label">Nom affiché</label>
        <input type="text" class="form-input" id="hero-name" value="${esc(a.hero.name)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Sous-titre</label>
      <input type="text" class="form-input" id="hero-subtitle" value="${esc(a.hero.subtitle)}">
    </div>
    <div class="form-group">
      <label class="form-label">Tags (séparés par des virgules)</label>
      <input type="text" class="form-input" id="hero-tags" value="${esc(a.hero.tags.join(', '))}">
    </div>
    <div class="form-group">
      <label class="form-label">Image héro</label>
      ${imageField(a.hero.image, 'accueil', v => a.hero.image = v)}
    </div>

    <hr class="divider">
    <div class="block-heading">Travaux récents</div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Label</label>
        <input type="text" class="form-input" id="feat-label" value="${esc(a.featured.label)}">
      </div>
      <div class="form-group">
        <label class="form-label">Titre</label>
        <input type="text" class="form-input" id="feat-title" value="${esc(a.featured.title)}">
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Titre (accent)</label>
        <input type="text" class="form-input" id="feat-accent" value="${esc(a.featured.titleAccent)}">
      </div>
      <div class="form-group">
        <label class="form-label">Texte du lien "Voir tout"</label>
        <input type="text" class="form-input" id="feat-link" value="${esc(a.featured.linkText)}">
      </div>
    </div>

    <div class="block-heading">Items mis en avant</div>
    <div id="feat-items-list"></div>
    <button class="btn btn-ghost btn-sm" id="btn-add-feat" style="margin-top:4px;">+ Ajouter un item</button>

    <hr class="divider">
    <div class="block-heading">Intro</div>
    <div class="form-group">
      <label class="form-label">Label</label>
      <input type="text" class="form-input" id="intro-label" value="${esc(a.intro.label)}">
    </div>
    <div class="form-group">
      <label class="form-label">Citation</label>
      <input type="text" class="form-input" id="intro-quote" value="${esc(a.intro.quote)}">
    </div>
    <div class="form-group">
      <label class="form-label">Texte</label>
      <textarea class="form-textarea" id="intro-text">${esc(a.intro.text)}</textarea>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Texte du bouton</label>
        <input type="text" class="form-input" id="intro-btn-text" value="${esc(a.intro.buttonText)}">
      </div>
      <div class="form-group">
        <label class="form-label">Lien du bouton</label>
        <input type="text" class="form-input" id="intro-btn-link" value="${esc(a.intro.buttonLink)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Image intro</label>
      ${imageField(a.intro.image, 'accueil', v => a.intro.image = v)}
    </div>
    <div class="form-group">
      <label class="form-label">Alt de l'image intro</label>
      <input type="text" class="form-input" id="intro-image-alt" value="${esc(a.intro.imageAlt || '')}">
    </div>

    ${saveBar()}`;

  bind('hero-watermark', v => a.hero.watermark = v);
  bind('hero-name',      v => a.hero.name = v);
  bind('hero-subtitle',  v => a.hero.subtitle = v);
  bind('hero-tags',      v => { a.hero.tags = v.split(',').map(t => t.trim()).filter(Boolean); markDirty(); });
  bind('feat-label',  v => a.featured.label = v);
  bind('feat-title',  v => a.featured.title = v);
  bind('feat-accent', v => a.featured.titleAccent = v);
  bind('feat-link',   v => a.featured.linkText = v);
  bind('intro-label',    v => a.intro.label = v);
  bind('intro-quote',    v => a.intro.quote = v);
  bind('intro-text',     v => a.intro.text = v);
  bind('intro-btn-text', v => a.intro.buttonText = v);
  bind('intro-btn-link', v => a.intro.buttonLink = v);
  bind('intro-image-alt', v => a.intro.imageAlt = v);

  renderFeaturedItems();
  document.getElementById('btn-add-feat').onclick = () => {
    a.featured.items.push({ image: '', title: 'Nouvel item', category: '' });
    renderFeaturedItems();
    markDirty();
  };
  attachSave();
}

function renderFeaturedItems() {
  const items = content.accueil.featured.items;
  const list  = document.getElementById('feat-items-list');
  if (!list) return;

  list.innerHTML = items.map((item, i) => `
    <div class="card" data-fi="${i}">
      <div class="card-header">
        <span class="card-label">Item ${i + 1}</span>
        <button class="btn btn-danger btn-sm" data-fi-del="${i}">Supprimer</button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Titre</label>
          <input type="text" class="form-input" data-fi-f="title" data-fi-i="${i}" value="${esc(item.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">Catégorie</label>
          <select class="form-select" data-fi-f="category" data-fi-i="${i}">
            ${featuredCategoryOptions(item.category)}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Image</label>
        ${imageField(item.image, 'accueil', v => item.image = v)}
      </div>
    </div>`).join('');

  list.querySelectorAll('[data-fi-f]').forEach(el => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, e => {
      items[+e.target.dataset.fiI][e.target.dataset.fiF] = e.target.value;
      markDirty();
    });
  });
  list.querySelectorAll('[data-fi-del]').forEach(el => {
    el.onclick = () => { items.splice(+el.dataset.fiDel, 1); renderFeaturedItems(); markDirty(); };
  });
}

// ── SECTION: Galerie ──────────────────────────────────────────────────────

// Les catégories de galerie sont définies dans content.galerie.filters
// ('all' est le filtre spécial « Tout », pas une vraie catégorie).
function galleryFilters() {
  return content.galerie.filters.filter(f => f.id !== 'all');
}

function labelForCategory(id) {
  const f = content.galerie.filters.find(f => f.id === id);
  return f ? f.label : id;
}

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
}

function categoryOptions(current) {
  return galleryFilters().map(f =>
    `<option value="${esc(f.id)}" ${current === f.id ? 'selected' : ''}>${esc(f.label)}</option>`
  ).join('');
}

// Pour les items "Travaux récents" : on affiche le label de catégorie tel quel
// sur le site, donc le menu propose les labels des filtres (+ la valeur actuelle
// si elle ne correspond à aucun filtre, pour ne rien perdre).
function featuredCategoryOptions(current) {
  const labels = galleryFilters().map(f => f.label);
  if (current && !labels.includes(current)) labels.unshift(current);
  return labels.map(l =>
    `<option value="${esc(l)}" ${current === l ? 'selected' : ''}>${esc(l)}</option>`
  ).join('');
}

// Icônes réellement dessinées sur la page contact (voir ICONS dans js/main.js).
const ICON_CHOICES = [['mail', 'Email'], ['location', 'Localisation'], ['instagram', 'Instagram']];

function iconOptions(current) {
  const choices = ICON_CHOICES.slice();
  if (current && !choices.some(c => c[0] === current)) choices.unshift([current, current]);
  return choices.map(([v, l]) =>
    `<option value="${esc(v)}" ${current === v ? 'selected' : ''}>${esc(l)}</option>`
  ).join('');
}

function renderGalerie(c) {
  const g = content.galerie;
  c.innerHTML = `
    <h1 class="section-title">GALERIE</h1>
    <p class="section-subtitle">Photos, catégories, tri par glisser-déposer</p>

    <div class="block-heading">En-tête</div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Label</label>
        <input type="text" class="form-input" id="gal-label" value="${esc(g.header.label)}">
      </div>
      <div class="form-group">
        <label class="form-label">Titre</label>
        <input type="text" class="form-input" id="gal-title" value="${esc(g.header.title)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Watermark</label>
      <input type="text" class="form-input" id="gal-watermark" value="${esc(g.header.watermark || '')}">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="gal-desc">${esc(g.header.description)}</textarea>
    </div>

    <hr class="divider">
    <div class="block-heading">Catégories</div>
    <p class="section-subtitle" style="margin-top:-6px;">Renommer met aussi à jour le filtre affiché sur le site. Une catégorie non vide ne peut pas être supprimée.</p>
    <div id="cat-manager"></div>
    <div class="cat-add">
      <input type="text" class="form-input" id="cat-new-label" placeholder="Nom d'une nouvelle catégorie (ex : Mariage)">
      <button class="btn btn-ghost btn-sm" id="btn-add-cat">+ Ajouter</button>
    </div>

    <hr class="divider">
    <div class="block-heading">Ajouter des photos</div>
    <div class="form-group" style="max-width:240px;">
      <label class="form-label">Catégorie</label>
      <select class="form-select" id="upload-category">
        ${categoryOptions((galleryFilters()[0] || {}).id)}
      </select>
    </div>
    <div class="upload-zone" id="upload-zone">
      <div class="upload-zone-icon">⊕</div>
      <div class="upload-zone-text">Glisser des photos ici ou cliquer pour sélectionner</div>
      <div class="upload-zone-sub">JPG · PNG · WEBP — 15 MB max par fichier</div>
    </div>
    <input type="file" id="upload-input" accept="image/*" multiple style="display:none;">
    <div class="upload-progress" id="upload-progress"></div>
    <button class="btn btn-ghost btn-sm" id="btn-import-existing" style="margin-top:12px;">⟳ Importer les images déjà sur le serveur (FTP)</button>

    <hr class="divider">
    <div class="block-heading" id="gallery-heading">Photos (${g.items.length}) — glisser pour réordonner</div>
    <div class="gallery-grid" id="gallery-grid"></div>

    ${saveBar('Les uploads sont immédiats — pensez à sauvegarder pour mettre à jour le catalogue.')}`;

  bind('gal-label',     v => g.header.label = v);
  bind('gal-title',     v => g.header.title = v);
  bind('gal-watermark', v => g.header.watermark = v);
  bind('gal-desc',      v => g.header.description = v);

  renderCategoryManager();
  document.getElementById('btn-add-cat').onclick = addCategory;
  document.getElementById('cat-new-label').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addCategory(); }
  });

  renderGalleryGrid();
  setupUploadZone();
  document.getElementById('btn-import-existing').onclick = importExistingImages;
  attachSave();
}

// Enregistre dans la galerie les fichiers présents sur le serveur (déposés par
// FTP) mais absents de content.json. Ne touche qu'aux catégories de galerie
// (ignore les dossiers système accueil/demarche).
async function importExistingImages() {
  let data;
  try {
    data = await apiFetch('list_all_images');
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error');
    return;
  }
  const cats        = data.categories || {};
  const galleryIds  = new Set(galleryFilters().map(f => f.id));
  const existing    = new Set(content.galerie.items.map(it => it.image));
  let added = 0;

  Object.keys(cats).forEach(cat => {
    if (!galleryIds.has(cat)) return; // dossier hors galerie (accueil, demarche, ou sans filtre)
    cats[cat].forEach(path => {
      if (existing.has(path)) return;
      const title = path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      content.galerie.items.push({ image: path, title, category: cat, categoryLabel: labelForCategory(cat) });
      existing.add(path);
      added++;
    });
  });

  if (added) {
    renderGalleryGrid();
    renderCategoryManager();
    markDirty();
    showToast(`${added} image(s) importée(s) — pensez à sauvegarder`, 'success');
  } else {
    showToast('Aucune nouvelle image à importer', 'info');
  }
}

function renderCategoryManager() {
  const wrap = document.getElementById('cat-manager');
  if (!wrap) return;
  const filters = galleryFilters();

  wrap.innerHTML = filters.map(f => {
    const count = content.galerie.items.filter(it => it.category === f.id).length;
    return `<div class="cat-row" data-cat="${esc(f.id)}">
        <span class="cat-slug">${esc(f.id)}</span>
        <input type="text" class="form-input cat-label-input" data-cat-label="${esc(f.id)}" value="${esc(f.label)}">
        <span class="cat-count">${count} photo${count > 1 ? 's' : ''}</span>
        <button class="btn btn-danger btn-sm" data-cat-del="${esc(f.id)}">Supprimer</button>
      </div>`;
  }).join('') || '<p class="muted" style="padding:4px 0;">Aucune catégorie — ajoutez-en une.</p>';

  wrap.querySelectorAll('[data-cat-label]').forEach(el => {
    el.addEventListener('input', e => {
      const id = e.target.dataset.catLabel;
      const f  = content.galerie.filters.find(f => f.id === id);
      if (!f) return;
      f.label = e.target.value;
      // Garder categoryLabel des photos synchronisé avec le label du filtre
      content.galerie.items.forEach(it => { if (it.category === id) it.categoryLabel = e.target.value; });
      markDirty();
    });
  });

  wrap.querySelectorAll('[data-cat-del]').forEach(el => {
    el.onclick = async () => {
      const id    = el.dataset.catDel;
      const count = content.galerie.items.filter(it => it.category === id).length;
      if (count > 0) {
        showToast(`« ${id} » contient ${count} photo(s) — videz la catégorie d'abord`, 'warning');
        return;
      }
      if (!confirm(`Supprimer la catégorie « ${id} » ?`)) return;
      try {
        await deleteCategoryApi(id);
        content.galerie.filters = content.galerie.filters.filter(f => f.id !== id);
        renderCategoryManager();
        refreshCategorySelects();
        markDirty();
        showToast('Catégorie supprimée — pensez à sauvegarder', 'success');
      } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
      }
    };
  });
}

async function addCategory() {
  const input = document.getElementById('cat-new-label');
  const label = input.value.trim();
  if (!label) { showToast('Entrez un nom de catégorie', 'warning'); return; }
  const id = slugify(label);
  if (id.length < 2) { showToast('Nom trop court ou invalide', 'warning'); return; }
  if (content.galerie.filters.some(f => f.id === id)) {
    showToast('Cette catégorie existe déjà', 'warning');
    return;
  }
  try {
    await createCategoryApi(id);
    content.galerie.filters.push({ id, label });
    input.value = '';
    renderCategoryManager();
    refreshCategorySelects();
    markDirty();
    showToast(`Catégorie « ${label} » créée — pensez à sauvegarder`, 'success');
  } catch (err) {
    showToast('Erreur : ' + err.message, 'error');
  }
}

function refreshCategorySelects() {
  const up = document.getElementById('upload-category');
  if (up) up.innerHTML = categoryOptions(up.value);
  document.querySelectorAll('#gallery-grid [data-gi-f="category"]').forEach(sel => {
    sel.innerHTML = categoryOptions(sel.value);
  });
}

function renderGalleryGrid() {
  const g    = content.galerie;
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const head = document.getElementById('gallery-heading');
  if (head) head.textContent = `Photos (${g.items.length}) — glisser pour réordonner`;

  grid.innerHTML = g.items.map((item, i) => `
    <div class="gallery-item" draggable="true" data-gi="${i}">
      <div class="gallery-drag-handle" title="Réordonner">
        <div class="dots-grid"><span></span><span></span><span></span><span></span></div>
      </div>
      <div class="gallery-actions">
        <button class="btn btn-danger btn-sm" data-gi-del="${i}" title="Supprimer">✕</button>
      </div>
      <img class="gallery-thumb"
           src="../${esc(item.image)}"
           onerror="this.src='../assets/img/placeholder.svg'"
           alt="${esc(item.title)}" loading="lazy">
      <div class="gallery-item-body">
        <input type="text" class="form-input" data-gi-f="title" data-gi-i="${i}"
               value="${esc(item.title)}" placeholder="Titre">
        <select class="form-select" data-gi-f="category" data-gi-i="${i}">
          ${categoryOptions(item.category)}
        </select>
      </div>
    </div>`).join('');

  // Field bindings
  grid.querySelectorAll('[data-gi-f]').forEach(el => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, async e => {
      const item = content.galerie.items[+e.target.dataset.giI];
      const f    = e.target.dataset.giF;

      if (f === 'category') {
        const newCat = e.target.value;
        item.category      = newCat;
        item.categoryLabel = labelForCategory(newCat);
        markDirty();
        // Déplacer physiquement le fichier dans le dossier de la nouvelle catégorie
        const curDir = item.image ? item.image.split('/').slice(-2, -1)[0] : '';
        if (item.image && curDir !== newCat) {
          try {
            const r = await moveImageApi(item.image, newCat);
            item.image = r.path;
            renderGalleryGrid();
          } catch (err) {
            showToast('Image non déplacée : ' + err.message, 'warning');
          }
        }
      } else {
        item[f] = e.target.value;
        markDirty();
      }
    });
  });

  // Delete
  grid.querySelectorAll('[data-gi-del]').forEach(el => {
    el.onclick = async e => {
      e.stopPropagation();
      const idx  = +el.dataset.giDel;
      const item = content.galerie.items[idx];
      if (!confirm(`Supprimer « ${item.title} » ?\n\nLe fichier image sera également supprimé.`)) return;
      try { await deleteImageApi(item.image); } catch (_) { /* image may not exist */ }
      content.galerie.items.splice(idx, 1);
      renderGalleryGrid();
      markDirty();
      showToast('Photo supprimée', 'success');
    };
  });

  // Drag & drop reorder
  setupGalleryDrag(grid);
}

function setupGalleryDrag(grid) {
  let dragSrc = null;
  grid.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrc = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      grid.querySelectorAll('.gallery-item').forEach(i => i.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (dragSrc && item !== dragSrc) item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || dragSrc === item) return;
      const src = +dragSrc.dataset.gi;
      const tgt = +item.dataset.gi;
      const [moved] = content.galerie.items.splice(src, 1);
      content.galerie.items.splice(tgt, 0, moved);
      renderGalleryGrid();
      markDirty();
    });
  });
}

function setupUploadZone() {
  const zone  = document.getElementById('upload-zone');
  const input = document.getElementById('upload-input');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-active'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.classList.remove('drag-active');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    await handleUploads(files);
  });
  input.addEventListener('change', async e => {
    await handleUploads(Array.from(e.target.files));
    input.value = '';
  });
}

async function handleUploads(files) {
  if (!files.length) return;
  const category   = document.getElementById('upload-category')?.value || 'accueil';
  const progressEl = document.getElementById('upload-progress');
  progressEl.textContent = `Upload de ${files.length} fichier(s)…`;

  let done = 0; const errors = [];
  for (const file of files) {
    try {
      const result = await uploadImage(file, category);
      const title  = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      content.galerie.items.push({ image: result.path, title, category, categoryLabel: labelForCategory(category) });
      done++;
    } catch (e) {
      errors.push(`${file.name}: ${e.message}`);
    }
  }

  progressEl.textContent = '';
  renderGalleryGrid();
  markDirty();

  if (errors.length) showToast(`${done} uploadé(s) — ${errors.length} erreur(s)`, 'warning');
  else showToast(`${done} photo(s) ajoutée(s) — pensez à sauvegarder`, 'success');
}

// ── SECTION: Démarche ─────────────────────────────────────────────────────

function renderDemarche(c) {
  const d = content.demarche;
  c.innerHTML = `
    <h1 class="section-title">DÉMARCHE</h1>
    <p class="section-subtitle">Blocs de contenu, citation et valeurs artistiques</p>

    <div class="block-heading">En-tête</div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Label</label>
        <input type="text" class="form-input" id="dem-label" value="${esc(d.header.label)}">
      </div>
      <div class="form-group">
        <label class="form-label">Titre</label>
        <input type="text" class="form-input" id="dem-title" value="${esc(d.header.title)}">
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Titre (accent)</label>
        <input type="text" class="form-input" id="dem-accent" value="${esc(d.header.titleAccent || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">Watermark</label>
        <input type="text" class="form-input" id="dem-watermark" value="${esc(d.header.watermark || '')}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="dem-desc">${esc(d.header.description)}</textarea>
    </div>

    <hr class="divider">
    <div class="block-heading">Blocs de contenu</div>
    <div id="demarche-blocks"></div>
    <button class="btn btn-ghost btn-sm" id="btn-add-block" style="margin-top:4px;">+ Ajouter un bloc</button>

    <hr class="divider">
    <div class="block-heading">Citation</div>
    <div class="form-group">
      <label class="form-label">Texte de la citation</label>
      <textarea class="form-textarea" id="dem-quote">${esc(d.quote.text)}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Auteur</label>
      <input type="text" class="form-input" id="dem-quote-author" value="${esc(d.quote.author)}">
    </div>

    <hr class="divider">
    <div class="block-heading">Valeurs</div>
    <div class="values-grid" id="dem-values"></div>
    <button class="btn btn-ghost btn-sm" id="btn-add-value" style="margin-top:12px;">+ Ajouter une valeur</button>

    ${saveBar()}`;

  bind('dem-label',        v => d.header.label = v);
  bind('dem-title',        v => d.header.title = v);
  bind('dem-accent',       v => d.header.titleAccent = v);
  bind('dem-watermark',    v => d.header.watermark = v);
  bind('dem-desc',         v => d.header.description = v);
  bind('dem-quote',        v => d.quote.text = v);
  bind('dem-quote-author', v => d.quote.author = v);

  renderDemarcheBlocks();
  renderDemarcheValues();

  document.getElementById('btn-add-block').onclick = () => {
    d.blocks.push({ label: `0${d.blocks.length + 1} — Nouveau`, title: 'TITRE', paragraphs: ['', ''], image: '', imageAlt: '', reverse: false });
    renderDemarcheBlocks();
    markDirty();
  };
  document.getElementById('btn-add-value').onclick = () => {
    d.values.push({ title: 'VALEUR', text: '' });
    renderDemarcheValues();
    markDirty();
  };
  attachSave();
}

function renderDemarcheBlocks() {
  const blocks = content.demarche.blocks;
  const c = document.getElementById('demarche-blocks');
  if (!c) return;

  c.innerHTML = blocks.map((b, i) => `
    <div class="demarche-block">
      <div class="demarche-block-header">
        <span class="card-label">${esc(b.label) || `Bloc ${i + 1}`}</span>
        <button class="btn btn-danger btn-sm" data-db-del="${i}">Supprimer</button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Label</label>
          <input type="text" class="form-input" data-db-f="label" data-db-i="${i}" value="${esc(b.label)}">
        </div>
        <div class="form-group">
          <label class="form-label">Titre</label>
          <input type="text" class="form-input" data-db-f="title" data-db-i="${i}" value="${esc(b.title)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Paragraphe 1</label>
        <textarea class="form-textarea" data-db-f="p0" data-db-i="${i}">${esc(b.paragraphs[0] || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Paragraphe 2</label>
        <textarea class="form-textarea" data-db-f="p1" data-db-i="${i}">${esc(b.paragraphs[1] || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Image</label>
        ${imageField(b.image, 'demarche', v => b.image = v)}
      </div>
      <div class="form-group">
        <label class="form-label">Alt de l'image</label>
        <input type="text" class="form-input" data-db-f="imageAlt" data-db-i="${i}" value="${esc(b.imageAlt || '')}">
      </div>
      <label class="toggle">
        <input type="checkbox" data-db-f="reverse" data-db-i="${i}" ${b.reverse ? 'checked' : ''}>
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
        <span class="toggle-label">Image à droite (reverse)</span>
      </label>
    </div>`).join('');

  c.querySelectorAll('[data-db-f]').forEach(el => {
    const evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, e => {
      const i = +e.target.dataset.dbI;
      const f = e.target.dataset.dbF;
      if      (f === 'p0')      blocks[i].paragraphs[0] = e.target.value;
      else if (f === 'p1')      blocks[i].paragraphs[1] = e.target.value;
      else if (f === 'reverse') blocks[i].reverse = e.target.checked;
      else                      blocks[i][f] = e.target.value;
      markDirty();
    });
  });
  c.querySelectorAll('[data-db-del]').forEach(el => {
    el.onclick = () => { blocks.splice(+el.dataset.dbDel, 1); renderDemarcheBlocks(); markDirty(); };
  });
}

function renderDemarcheValues() {
  const values = content.demarche.values;
  const c = document.getElementById('dem-values');
  if (!c) return;

  c.innerHTML = values.map((v, i) => `
    <div class="value-card">
      <div class="form-group">
        <label class="form-label">Titre</label>
        <input type="text" class="form-input" data-dv-f="title" data-dv-i="${i}" value="${esc(v.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">Texte</label>
        <textarea class="form-textarea" data-dv-f="text" data-dv-i="${i}" style="min-height:60px;">${esc(v.text)}</textarea>
      </div>
      <button class="btn btn-danger btn-sm" data-dv-del="${i}">Supprimer</button>
    </div>`).join('');

  c.querySelectorAll('[data-dv-f]').forEach(el => {
    el.addEventListener('input', e => {
      values[+e.target.dataset.dvI][e.target.dataset.dvF] = e.target.value;
      markDirty();
    });
  });
  c.querySelectorAll('[data-dv-del]').forEach(el => {
    el.onclick = () => { values.splice(+el.dataset.dvDel, 1); renderDemarcheValues(); markDirty(); };
  });
}

// ── SECTION: Parcours ─────────────────────────────────────────────────────

function renderParcours(c) {
  const p = content.parcours;
  c.innerHTML = `
    <h1 class="section-title">PARCOURS</h1>
    <p class="section-subtitle">Timeline — formations, stages, expériences</p>

    <div class="block-heading">En-tête</div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Label</label>
        <input type="text" class="form-input" id="par-label" value="${esc(p.header.label)}">
      </div>
      <div class="form-group">
        <label class="form-label">Titre</label>
        <input type="text" class="form-input" id="par-title" value="${esc(p.header.title)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="par-desc">${esc(p.header.description)}</textarea>
    </div>

    <hr class="divider">
    <div class="block-heading">Entrées — glisser pour réordonner</div>
    <div id="timeline-list"></div>
    <button class="btn btn-ghost btn-sm" id="btn-add-timeline" style="margin-top:4px;">+ Ajouter une entrée</button>

    ${saveBar()}`;

  bind('par-label', v => p.header.label = v);
  bind('par-title', v => p.header.title = v);
  bind('par-desc',  v => p.header.description = v);

  renderTimeline();
  document.getElementById('btn-add-timeline').onclick = () => {
    p.timeline.push({ type: 'Formation', date: '2026', title: 'Nouveau', subtitle: '', description: '' });
    renderTimeline();
    markDirty();
  };
  attachSave();
}

function renderTimeline() {
  const tl = content.parcours.timeline;
  const c  = document.getElementById('timeline-list');
  if (!c) return;

  const types = ['Formation', 'Stage', 'Projet', 'Prix', 'Expo', 'Autre'];

  c.innerHTML = tl.map((e, i) => `
    <div class="timeline-item" draggable="true" data-ti="${i}">
      <div class="timeline-drag" title="Réordonner">⠿</div>
      <div class="timeline-fields">
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" data-ti-f="type" data-ti-i="${i}">
            ${types.map(t => `<option ${e.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="text" class="form-input" data-ti-f="date" data-ti-i="${i}" value="${esc(e.date)}">
        </div>
        <div class="form-group">
          <label class="form-label">Titre</label>
          <input type="text" class="form-input" data-ti-f="title" data-ti-i="${i}" value="${esc(e.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">Sous-titre</label>
          <input type="text" class="form-input" data-ti-f="subtitle" data-ti-i="${i}" value="${esc(e.subtitle)}">
        </div>
        <div class="form-group timeline-full">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" data-ti-f="description" data-ti-i="${i}" style="min-height:58px;">${esc(e.description)}</textarea>
        </div>
      </div>
      <div class="timeline-actions">
        <button class="btn btn-danger btn-sm" data-ti-del="${i}">✕</button>
      </div>
    </div>`).join('');

  c.querySelectorAll('[data-ti-f]').forEach(el => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, e => {
      tl[+e.target.dataset.tiI][e.target.dataset.tiF] = e.target.value;
      markDirty();
    });
  });
  c.querySelectorAll('[data-ti-del]').forEach(el => {
    el.onclick = () => { tl.splice(+el.dataset.tiDel, 1); renderTimeline(); markDirty(); };
  });

  // Drag reorder
  let dragSrc = null;
  c.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrc = item; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      c.querySelectorAll('.timeline-item').forEach(i => i.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (dragSrc && item !== dragSrc) item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || dragSrc === item) return;
      const src = +dragSrc.dataset.ti, tgt = +item.dataset.ti;
      const [m] = tl.splice(src, 1);
      tl.splice(tgt, 0, m);
      renderTimeline();
      markDirty();
    });
  });
}

// ── SECTION: Contact ──────────────────────────────────────────────────────

function renderContact(c) {
  const ct = content.contact;
  c.innerHTML = `
    <h1 class="section-title">CONTACT</h1>
    <p class="section-subtitle">Coordonnées affichées sur la page contact</p>

    <div class="block-heading">En-tête</div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Label</label>
        <input type="text" class="form-input" id="con-label" value="${esc(ct.header.label)}">
      </div>
      <div class="form-group">
        <label class="form-label">Titre</label>
        <input type="text" class="form-input" id="con-title" value="${esc(ct.header.title)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="con-desc">${esc(ct.header.description)}</textarea>
    </div>

    <hr class="divider">
    <div class="block-heading">Bloc info</div>
    <div class="form-group">
      <label class="form-label">Titre du bloc</label>
      <input type="text" class="form-input" id="con-info-title" value="${esc(ct.info.title)}">
    </div>
    <div class="form-group">
      <label class="form-label">Texte</label>
      <textarea class="form-textarea" id="con-info-text">${esc(ct.info.text)}</textarea>
    </div>

    <hr class="divider">
    <div class="block-heading">Coordonnées</div>
    <div id="con-details"></div>
    <button class="btn btn-ghost btn-sm" id="btn-add-detail" style="margin-top:4px;">+ Ajouter</button>

    ${saveBar()}`;

  bind('con-label',      v => ct.header.label = v);
  bind('con-title',      v => ct.header.title = v);
  bind('con-desc',       v => ct.header.description = v);
  bind('con-info-title', v => ct.info.title = v);
  bind('con-info-text',  v => ct.info.text = v);

  renderContactDetails();
  document.getElementById('btn-add-detail').onclick = () => {
    ct.info.details.push({ icon: 'mail', label: 'Nouveau', value: '' });
    renderContactDetails();
    markDirty();
  };
  attachSave();
}

function renderContactDetails() {
  const details = content.contact.info.details;
  const c = document.getElementById('con-details');
  if (!c) return;

  c.innerHTML = details.map((d, i) => `
    <div class="detail-row">
      <select class="form-select" style="width:150px;flex-shrink:0;" data-cd-f="icon" data-cd-i="${i}">
        ${iconOptions(d.icon)}
      </select>
      <input type="text" class="form-input" style="width:130px;flex-shrink:0;"
             data-cd-f="label" data-cd-i="${i}" value="${esc(d.label)}" placeholder="Label">
      <input type="text" class="form-input"
             data-cd-f="value" data-cd-i="${i}" value="${esc(d.value)}" placeholder="Valeur / URL">
      <button class="btn btn-danger btn-sm" data-cd-del="${i}" style="flex-shrink:0;">✕</button>
    </div>`).join('');

  c.querySelectorAll('[data-cd-f]').forEach(el => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, e => {
      details[+e.target.dataset.cdI][e.target.dataset.cdF] = e.target.value;
      markDirty();
    });
  });
  c.querySelectorAll('[data-cd-del]').forEach(el => {
    el.onclick = () => { details.splice(+el.dataset.cdDel, 1); renderContactDetails(); markDirty(); };
  });
}

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  try {
    content = await loadContent();
  } catch (e) {
    document.getElementById('section-container').innerHTML = `
      <div style="padding:60px;color:var(--danger);font-family:var(--font-body);">
        Erreur : impossible de charger content.json.<br>
        <small style="color:var(--muted);">${esc(e.message)}</small>
      </div>`;
    return;
  }

  setupImageFieldDelegation();

  // Drawer mobile (sidebar repliable)
  const sidebarEl  = document.querySelector('.sidebar');
  const toggleBtn  = document.getElementById('sidebar-toggle');
  const backdropEl = document.getElementById('sidebar-backdrop');
  const closeDrawer = () => {
    sidebarEl.classList.remove('open');
    backdropEl.classList.remove('show');
    toggleBtn.setAttribute('aria-expanded', 'false');
  };
  const openDrawer = () => {
    sidebarEl.classList.add('open');
    backdropEl.classList.add('show');
    toggleBtn.setAttribute('aria-expanded', 'true');
  };
  toggleBtn.addEventListener('click', () =>
    sidebarEl.classList.contains('open') ? closeDrawer() : openDrawer()
  );
  backdropEl.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // Nav clicks (referme le drawer après navigation sur mobile)
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.section); closeDrawer(); });
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    if (isDirty && !confirm('Des modifications non sauvegardées seront perdues.\n\nSe déconnecter quand même ?')) return;
    try { await apiFetch('logout', { method: 'POST' }); } catch (_) {}
    window.location.reload();
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', e => {
    if (isDirty) { e.preventDefault(); e.returnValue = ''; }
  });

  navigate('site');
}

document.addEventListener('DOMContentLoaded', init);
