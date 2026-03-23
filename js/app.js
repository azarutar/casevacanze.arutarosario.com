/* ================================================================
   ARUTA IMMOBILI – Main Application Script
   Modern Italian Real Estate Website
   ================================================================ */

'use strict';

// ===== STATE =====
let allProperties = [];
let siteData = {};
let map = null;
let mapMarkers = {};
let currentGalleryIndex = 0;
let currentModalImages = [];
let activeFilters = { type: '', status: '', search: '' };

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadData();
  initNavbar();
  initHamburger();
  initScrollAnimations();
  initContactForm();
  document.getElementById('currentYear').textContent = new Date().getFullYear();
});

// ===== DATA LOADING =====
async function loadData() {
  try {
    const res = await fetch('./data/properties.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    siteData = data;
    allProperties = data.properties || [];

    const isLite = data.site?.liteMode === true;

    if (isLite) {
      activateLiteMode(data);
    } else {
      activateFullMode(data);
    }

    // Animate hero elements
    document.querySelectorAll('.hero .fade-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 150 + i * 100);
    });
  } catch (err) {
    console.error('Errore caricamento dati:', err);
    document.getElementById('propertiesGrid').innerHTML =
      '<div class="loading-spinner"><p style="color:var(--text-muted)">Errore nel caricamento degli immobili. Riprova più tardi.</p></div>';
  }
}

// ===== FULL MODE (default) =====
function activateFullMode(data) {
  renderHeroStats(allProperties);
  renderFilterBar(allProperties);
  renderProperties(allProperties);
  initMap(allProperties);
  renderAbout(data.owner);
  renderContact(data.owner);
  renderFooter(data.owner);
}

// ===== LITE MODE =====
function activateLiteMode(data) {
  document.body.classList.add('lite-mode');

  // Hide heavy sections
  const hideIds = ['map', 'about'];
  hideIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Hide hero search bar, stats, scroll hint
  const heroSearch = document.querySelector('.search-bar');
  const heroStats = document.getElementById('heroStats');
  const heroScroll = document.querySelector('.hero-scroll-hint');
  if (heroSearch) heroSearch.style.display = 'none';
  if (heroStats) heroStats.style.display = 'none';
  if (heroScroll) heroScroll.style.display = 'none';

  // Simplify hero text
  const heroH1 = document.querySelector('.hero h1');
  if (heroH1) heroH1.innerHTML = `Le Mie <span class="accent">Proprietà</span>`;
  const heroSub = document.querySelector('.hero-subtitle');
  if (heroSub) heroSub.innerHTML = `Immobili gestiti direttamente dal proprietario in Calabria`;

  // Hide filter bar, simplify properties header
  const filterBar = document.getElementById('filterBar');
  if (filterBar) filterBar.style.display = 'none';
  const propHeader = document.querySelector('#properties .section-header');
  if (propHeader) propHeader.style.display = 'none';

  // Render property cards (no filter)
  renderProperties(allProperties);

  // Render contact + footer
  renderContact(data.owner);
  renderFooter(data.owner);

  // Simplify navbar: only Immobili + Contatti
  const navLinks = document.getElementById('navLinks');
  if (navLinks) {
    navLinks.innerHTML = `
      <li><a href="#properties"><i class="fas fa-building"></i> Immobili</a></li>
      <li><a href="#contact"><i class="fas fa-envelope"></i> Contatti</a></li>
    `;
  }

  // Simplify footer: hide contact col + link utili, keep only brand + copyright
  const footerContactCol = document.querySelector('.footer-col:last-child');
  if (footerContactCol) footerContactCol.style.display = 'none';
  const footerLinksCol = document.querySelector('.footer-col:nth-child(2)');
  if (footerLinksCol) footerLinksCol.style.display = 'none';
}

// ===== HERO STATS =====
function renderHeroStats(properties) {
  const total = properties.length;
  const forSale = properties.filter(p => p.status === 'vendita').length;
  const forRent = properties.filter(p => p.status === 'affitto' || p.status === 'affitto_vacanze').length;

  const elTotal = document.getElementById('statTotal');
  const elSale = document.getElementById('statSale');
  const elRent = document.getElementById('statRent');

  if (elTotal) elTotal.textContent = total;
  if (elSale) elSale.textContent = forSale;
  if (elRent) elRent.textContent = forRent;
}

// ===== FILTER BAR =====
function renderFilterBar(properties) {
  const bar = document.getElementById('filterBar');
  if (!bar) return;

  const types = [...new Set(properties.map(p => p.type))];

  const buttons = [
    { value: '', label: 'Tutti', icon: 'fa-th-large' },
    ...types.map(t => ({ value: t, label: getTypeLabel(t), icon: getTypeIcon(t) }))
  ];

  bar.innerHTML = buttons.map(btn => `
    <button class="filter-btn${btn.value === '' ? ' active' : ''}"
            data-type="${btn.value}"
            onclick="setTypeFilter('${btn.value}')">
      <i class="fas ${btn.icon}"></i>
      ${btn.label}
    </button>
  `).join('');
}

function setTypeFilter(type) {
  activeFilters.type = type;

  // Update button states
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  applyFilters();
}

// ===== PROPERTIES RENDERING =====
function renderProperties(properties) {
  const grid = document.getElementById('propertiesGrid');
  const noResults = document.getElementById('noResults');

  if (!grid) return;

  if (properties.length === 0) {
    grid.innerHTML = '';
    if (noResults) noResults.classList.remove('hidden');
    return;
  }

  if (noResults) noResults.classList.add('hidden');

  grid.innerHTML = properties.map(prop => createCardHTML(prop)).join('');

  // Click listeners
  grid.querySelectorAll('.property-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });

  // Re-trigger scroll animations
  initScrollAnimations();
}

function createCardHTML(prop) {
  const img = prop.images && prop.images.length > 0 ? prop.images[0] : null;
  const price = formatPrice(prop.price, prop.priceUnit);
  const typeBg = getTypeColor(prop.type);
  const statusBg = getStatusColor(prop.status);

  const imageContent = img
    ? `<img src="${img}" alt="${prop.title}" loading="lazy"
          onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'" />`
    : '';

  const areaFeature = prop.features.area > 0
    ? `<span class="feature-pill"><i class="fas fa-ruler-combined"></i> ${prop.features.area} m²</span>`
    : '';

  const bedroomsFeature = prop.features.bedrooms > 0
    ? `<span class="feature-pill"><i class="fas fa-bed"></i> ${prop.features.bedrooms} cam.</span>`
    : '';

  const bathroomsFeature = prop.features.bathrooms > 0
    ? `<span class="feature-pill"><i class="fas fa-bath"></i> ${prop.features.bathrooms} bagni</span>`
    : '';

  const seaviewFeature = prop.features.seaview
    ? `<span class="feature-pill"><i class="fas fa-water"></i> Vista mare</span>`
    : '';

  const featuredBadge = prop.featured
    ? `<div class="badge-featured"><i class="fas fa-star"></i> In Evidenza</div>`
    : '';

  return `
    <article class="property-card fade-in" data-id="${prop.id}">
      <div class="card-image">
        ${imageContent}
        <div class="card-badges">
          <span class="badge" style="background:${typeBg}22;color:${typeBg};border:1px solid ${typeBg}44">
            <i class="fas ${getTypeIcon(prop.type)}"></i> ${getTypeLabel(prop.type)}
          </span>
          <span class="badge" style="background:${statusBg}22;color:${statusBg};border:1px solid ${statusBg}44">
            ${getStatusLabel(prop.status)}
          </span>
        </div>
        ${featuredBadge}
      </div>
      <div class="card-body">
        <div class="card-price">
          ${price}
        </div>
        <h3 class="card-title">${prop.title}</h3>
        <div class="card-location">
          <i class="fas fa-map-marker-alt"></i>
          <span>${prop.location.city}, ${prop.location.province}</span>
        </div>
        <div class="card-features">
          ${areaFeature}
          ${bedroomsFeature}
          ${bathroomsFeature}
          ${seaviewFeature}
        </div>
        <button class="card-btn">
          <i class="fas fa-eye"></i> Scopri di più
        </button>
      </div>
    </article>
  `;
}

// ===== FILTERS =====
function applyFilters() {
  const searchVal = document.getElementById('heroSearch')?.value?.toLowerCase().trim() || '';
  const typeVal = document.getElementById('heroType')?.value || '';
  const statusVal = document.getElementById('heroStatus')?.value || '';

  // Sync active filters from inputs if they were changed
  if (typeVal) activeFilters.type = typeVal;
  activeFilters.search = searchVal;
  activeFilters.status = statusVal;

  let filtered = allProperties.filter(prop => {
    // Type filter (from filter bar buttons or dropdown)
    if (activeFilters.type && prop.type !== activeFilters.type) return false;

    // Status filter
    if (activeFilters.status && prop.status !== activeFilters.status) return false;

    // Search filter
    if (activeFilters.search) {
      const q = activeFilters.search;
      const searchable = [
        prop.title,
        prop.description,
        prop.location.city,
        prop.location.address,
        prop.location.province,
        prop.type,
        ...(prop.tags || [])
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });

  renderProperties(filtered);

  // Scroll to properties section
  document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function triggerSearch() {
  applyFilters();
}

function resetFilters() {
  activeFilters = { type: '', status: '', search: '' };

  const heroSearch = document.getElementById('heroSearch');
  const heroType = document.getElementById('heroType');
  const heroStatus = document.getElementById('heroStatus');

  if (heroSearch) heroSearch.value = '';
  if (heroType) heroType.value = '';
  if (heroStatus) heroStatus.value = '';

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === '');
  });

  renderProperties(allProperties);
}

// Allow Enter key in search input
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('heroSearch');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') triggerSearch();
    });
  }
});

// ===== MAP =====
function initMap(properties) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded');
    return;
  }

  const mapEl = document.getElementById('leafletMap');
  if (!mapEl) return;

  // Calculate center from property coords
  const lats = properties.map(p => p.location.lat).filter(Boolean);
  const lngs = properties.map(p => p.location.lng).filter(Boolean);
  const centerLat = lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 38.67;
  const centerLng = lngs.length ? lngs.reduce((a, b) => a + b, 0) / lngs.length : 16.0;

  // Destroy previous map instance
  if (map) {
    map.remove();
    map = null;
    mapMarkers = {};
  }

  map = L.map('leafletMap', {
    center: [centerLat, centerLng],
    zoom: 10,
    zoomControl: true,
    scrollWheelZoom: false
  });

  // Tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  // Add markers
  const bounds = [];

  properties.forEach(prop => {
    if (!prop.location.lat || !prop.location.lng) return;

    const icon = createCustomIcon(prop.type);
    const marker = L.marker([prop.location.lat, prop.location.lng], { icon });
    const price = formatPrice(prop.price, prop.priceUnit);

    marker.bindPopup(`
      <div style="min-width:200px;font-family:'Inter',sans-serif">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${getTypeColor(prop.type)};margin-bottom:4px">
          ${getTypeLabel(prop.type)} – ${getStatusLabel(prop.status)}
        </div>
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;line-height:1.3">${prop.title}</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:6px"><i class="fas fa-map-marker-alt"></i> ${prop.location.city}, ${prop.location.province}</div>
        <div style="font-size:16px;font-weight:800;color:#2563eb;margin-bottom:10px">${price}</div>
        <a class="popup-link" href="javascript:void(0)" onclick="openModal('${prop.id}')">
          <i class="fas fa-eye"></i> Scopri di più
        </a>
      </div>
    `, { maxWidth: 250 });

    marker.addTo(map);
    mapMarkers[prop.id] = marker;
    bounds.push([prop.location.lat, prop.location.lng]);
  });

  // Fit bounds
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }

  // Populate map sidebar
  renderMapSidebar(properties);
}

function getMarkerColor(type) {
  const colors = {
    villa: '#8b5cf6',
    casa: '#10b981',
    appartamento: '#3b82f6',
    terreno: '#f59e0b',
    locale_commerciale: '#ef4444'
  };
  return colors[type] || '#64748b';
}

function createCustomIcon(type) {
  const color = getMarkerColor(type);
  const iconHtml = `
    <div style="
      width: 34px;
      height: 34px;
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="transform: rotate(45deg); font-size: 13px; color: #fff;">
        <i class="fas ${getTypeIcon(type)}" style="font-family:'Font Awesome 6 Free';font-weight:900"></i>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36]
  });
}

function renderMapSidebar(properties) {
  const sidebar = document.getElementById('mapSidebar');
  if (!sidebar) return;

  // Keep header, replace list
  let list = sidebar.querySelector('.map-sidebar-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'map-sidebar-list';
    sidebar.appendChild(list);
  }

  list.innerHTML = properties.map(prop => `
    <div class="map-sidebar-card" onclick="flyToMarker('${prop.id}')">
      <div class="sc-title">${prop.title}</div>
      <div class="sc-meta">
        <span class="sc-city"><i class="fas fa-map-marker-alt" style="color:${getMarkerColor(prop.type)}"></i> ${prop.location.city}</span>
        <span class="sc-price">${formatPriceShort(prop.price, prop.priceUnit)}</span>
      </div>
    </div>
  `).join('');
}

function flyToMarker(propId) {
  const prop = allProperties.find(p => p.id === propId);
  if (!prop || !map) return;

  if (prop.location.lat && prop.location.lng) {
    map.flyTo([prop.location.lat, prop.location.lng], 14, { duration: 1.2 });
    setTimeout(() => {
      const marker = mapMarkers[propId];
      if (marker) marker.openPopup();
    }, 1300);
  }
}

// ===== MODAL =====
function openModal(propId) {
  const prop = allProperties.find(p => p.id === propId);
  if (!prop) return;

  currentModalImages = (prop.images || []).filter(Boolean);
  currentGalleryIndex = 0;

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');

  body.innerHTML = createModalHTML(prop);
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Bind events
  bindGalleryEvents();

  const closeBtn = document.getElementById('modalClose');
  if (closeBtn) closeBtn.onclick = closeModal;

  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  // Keyboard close
  document.addEventListener('keydown', handleModalKey);
}

function handleModalKey(e) {
  if (e.key === 'Escape') {
    closeModal();
  } else if (e.key === 'ArrowLeft') {
    navigateGallery(-1);
  } else if (e.key === 'ArrowRight') {
    navigateGallery(1);
  }
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleModalKey);
}

function createModalHTML(prop) {
  const price = formatPrice(prop.price, prop.priceUnit);
  const typeBg = getTypeColor(prop.type);
  const statusBg = getStatusColor(prop.status);
  const f = prop.features;

  // Gallery
  const hasImages = currentModalImages.length > 0;
  const galleryHTML = hasImages ? `
    <div class="gallery-container">
      <img class="gallery-img" id="galleryImg"
           src="${currentModalImages[0]}"
           alt="${prop.title}"
           onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,#667eea 0%,#764ba2 100%)'" />
      ${currentModalImages.length > 1 ? `
        <button class="gallery-nav prev" onclick="navigateGallery(-1)" aria-label="Precedente">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button class="gallery-nav next" onclick="navigateGallery(1)" aria-label="Successiva">
          <i class="fas fa-chevron-right"></i>
        </button>
        <div class="gallery-dots" id="galleryDots">
          ${currentModalImages.map((_, i) => `
            <button class="gallery-dot${i === 0 ? ' active' : ''}"
                    onclick="goToGallerySlide(${i})"
                    aria-label="Foto ${i + 1}"></button>
          `).join('')}
        </div>
        <div class="gallery-count" id="galleryCount">1 / ${currentModalImages.length}</div>
      ` : ''}
    </div>
  ` : `
    <div class="gallery-container">
      <div class="gallery-placeholder">
        <i class="fas ${getTypeIcon(prop.type)}"></i>
      </div>
    </div>
  `;

  // Features: numeric
  const numFeatures = [];
  if (f.area > 0) numFeatures.push({ icon: 'fa-ruler-combined', value: `${f.area} m²`, label: 'Superficie' });
  if (f.landArea > 0) numFeatures.push({ icon: 'fa-seedling', value: `${f.landArea} m²`, label: 'Terreno' });
  if (f.rooms > 0) numFeatures.push({ icon: 'fa-th-large', value: f.rooms, label: 'Locali' });
  if (f.bedrooms > 0) numFeatures.push({ icon: 'fa-bed', value: f.bedrooms, label: 'Camere' });
  if (f.bathrooms > 0) numFeatures.push({ icon: 'fa-bath', value: f.bathrooms, label: 'Bagni' });
  if (f.floors > 0) numFeatures.push({ icon: 'fa-layer-group', value: f.floors, label: 'Piani' });
  if (f.energyClass && f.energyClass !== 'N/A') {
    numFeatures.push({ icon: 'fa-bolt', value: f.energyClass, label: 'Classe Energ.' });
  }

  const featuresGridHTML = numFeatures.map(feat => `
    <div class="feature-item">
      <i class="fas ${feat.icon}"></i>
      <span class="fi-value">${feat.value}</span>
      <span class="fi-label">${feat.label}</span>
    </div>
  `).join('');

  // Boolean features
  const boolFeatureMap = [
    { key: 'pool', label: 'Piscina', icon: 'fa-swimmer' },
    { key: 'seaview', label: 'Vista Mare', icon: 'fa-water' },
    { key: 'garden', label: 'Giardino', icon: 'fa-leaf' },
    { key: 'terrace', label: 'Terrazza', icon: 'fa-sun' },
    { key: 'balcony', label: 'Balcone', icon: 'fa-window-maximize' },
    { key: 'parking', label: 'Parcheggio', icon: 'fa-car' },
    { key: 'elevator', label: 'Ascensore', icon: 'fa-elevator' },
    { key: 'airConditioning', label: 'Aria Condiz.', icon: 'fa-wind' },
    { key: 'heating', label: 'Riscaldamento', icon: 'fa-fire' },
    { key: 'furnished', label: 'Arredato', icon: 'fa-couch' },
    { key: 'buildable', label: 'Edificabile', icon: 'fa-building' }
  ];

  const boolFeaturesHTML = boolFeatureMap
    .filter(bf => f[bf.key] !== undefined)
    .map(bf => {
      const yes = f[bf.key] === true;
      return `
        <span class="bool-pill ${yes ? 'yes' : 'no'}">
          <i class="fas ${yes ? 'fa-check' : 'fa-times'}"></i>
          ${bf.label}
        </span>
      `;
    }).join('');

  // Tags
  const tagsHTML = (prop.tags || []).map(t =>
    `<span class="modal-tag">#${t}</span>`
  ).join('');

  // Owner contact
  const owner = siteData.owner || {};
  const waLink = owner.whatsapp ? owner.whatsapp.replace(/\s+/g, '').replace('+', '') : '';
  const mapsUrl = `https://www.google.com/maps?q=${prop.location.lat},${prop.location.lng}`;

  const actionsHTML = `
    <div class="modal-actions">
      ${owner.whatsapp ? `
        <a href="https://wa.me/${waLink}?text=${encodeURIComponent('Ciao, sono interessato all\'immobile: ' + prop.title)}"
           target="_blank" rel="noopener" class="btn-whatsapp">
          <i class="fab fa-whatsapp"></i> WhatsApp
        </a>
      ` : ''}
      ${owner.phone ? `
        <a href="tel:${owner.phone.replace(/\s+/g, '')}" class="btn-phone">
          <i class="fas fa-phone"></i> Chiama
        </a>
      ` : ''}
      ${owner.email ? `
        <a href="mailto:${owner.email}?subject=${encodeURIComponent('Richiesta info: ' + prop.title)}"
           class="btn-outline">
          <i class="fas fa-envelope"></i> Email
        </a>
      ` : ''}
      <a href="${mapsUrl}" target="_blank" rel="noopener" class="modal-map-link">
        <i class="fas fa-map-location-dot"></i> Vedi su Mappa
      </a>
    </div>
  `;

  return `
    ${galleryHTML}
    <div class="modal-body">
      <div class="modal-header">
        <div class="modal-badges">
          <span class="badge" style="background:${typeBg}22;color:${typeBg};border:1px solid ${typeBg}44;padding:5px 12px">
            <i class="fas ${getTypeIcon(prop.type)}"></i> ${getTypeLabel(prop.type)}
          </span>
          <span class="badge" style="background:${statusBg}22;color:${statusBg};border:1px solid ${statusBg}44;padding:5px 12px">
            ${getStatusLabel(prop.status)}
          </span>
          ${prop.featured ? '<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:5px 12px"><i class="fas fa-star"></i> In Evidenza</span>' : ''}
        </div>
        <h2 class="modal-title" id="modalTitle">${prop.title}</h2>
        <div class="modal-location">
          <i class="fas fa-map-marker-alt"></i>
          <span>${prop.location.address ? prop.location.address + ', ' : ''}${prop.location.city} (${prop.location.province}) – ${prop.location.region}</span>
        </div>
        <div class="modal-price">${price}</div>
      </div>

      <div class="modal-divider"></div>

      <p class="modal-desc">${prop.description}</p>

      ${numFeatures.length > 0 ? `
        <div class="modal-section-title"><i class="fas fa-info-circle"></i> Caratteristiche</div>
        <div class="features-grid">${featuresGridHTML}</div>
      ` : ''}

      ${boolFeaturesHTML ? `
        <div class="modal-section-title"><i class="fas fa-list-check"></i> Dotazioni</div>
        <div class="bool-features">${boolFeaturesHTML}</div>
      ` : ''}

      ${tagsHTML ? `
        <div class="modal-section-title"><i class="fas fa-tags"></i> Tag</div>
        <div class="modal-tags">${tagsHTML}</div>
      ` : ''}

      <div class="modal-divider"></div>

      ${actionsHTML}
    </div>
  `;
}

function bindGalleryEvents() {
  // Events are handled via inline onclick in the HTML (gallery-nav buttons)
  // This function ensures the gallery display is correct
  updateGalleryDisplay();
}

function navigateGallery(direction) {
  if (currentModalImages.length === 0) return;
  currentGalleryIndex = (currentGalleryIndex + direction + currentModalImages.length) % currentModalImages.length;
  updateGalleryDisplay();
}

function goToGallerySlide(index) {
  if (index < 0 || index >= currentModalImages.length) return;
  currentGalleryIndex = index;
  updateGalleryDisplay();
}

function updateGalleryDisplay() {
  const imgEl = document.getElementById('galleryImg');
  const dotsEl = document.getElementById('galleryDots');
  const countEl = document.getElementById('galleryCount');

  if (imgEl && currentModalImages[currentGalleryIndex]) {
    imgEl.style.opacity = '0';
    setTimeout(() => {
      imgEl.src = currentModalImages[currentGalleryIndex];
      imgEl.style.opacity = '1';
    }, 150);
  }

  if (dotsEl) {
    dotsEl.querySelectorAll('.gallery-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentGalleryIndex);
    });
  }

  if (countEl) {
    countEl.textContent = `${currentGalleryIndex + 1} / ${currentModalImages.length}`;
  }
}

// ===== ABOUT =====
function renderAbout(owner) {
  const content = document.getElementById('aboutContent');
  if (!content || !owner) return;

  // Owner photo
  const photoWrap = document.getElementById('ownerPhotoWrap');
  if (photoWrap && owner.photo) {
    photoWrap.innerHTML = `
      <img src="${owner.photo}"
           alt="${owner.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="owner-photo-placeholder" style="display:none">
        <i class="fas fa-user-tie"></i>
      </div>
    `;
  }

  const whatsappNum = owner.whatsapp ? owner.whatsapp.replace(/\s+/g, '').replace('+', '') : '';

  content.innerHTML = `
    <span class="section-tag">Chi Sono</span>
    <h2>Direttamente dal <span class="accent">Proprietario</span></h2>

    <div class="about-name">
      <div class="about-name-icon">
        <i class="fas fa-user-tie"></i>
      </div>
      <div class="about-name-text">
        <strong>${owner.name}</strong>
        <span>${owner.role}</span>
      </div>
    </div>

    <p>${owner.bio}</p>

    <div class="about-stats">
      <div class="about-stat">
        <span class="num">${allProperties.length}+</span>
        <span class="lbl">Immobili</span>
      </div>
      <div class="about-stat">
        <span class="num">${allProperties.filter(p => p.status === 'vendita').length}</span>
        <span class="lbl">In Vendita</span>
      </div>
      <div class="about-stat">
        <span class="num">${allProperties.filter(p => p.status !== 'vendita').length}</span>
        <span class="lbl">In Affitto</span>
      </div>
      <div class="about-stat">
        <span class="num">0%</span>
        <span class="lbl">Intermediari</span>
      </div>
    </div>

    <div class="about-actions">
      ${owner.whatsapp ? `
        <a href="https://wa.me/${whatsappNum}" target="_blank" rel="noopener" class="btn-whatsapp">
          <i class="fab fa-whatsapp"></i> Scrivimi su WhatsApp
        </a>
      ` : ''}
      ${owner.phone ? `
        <a href="tel:${owner.phone.replace(/\s+/g, '')}" class="btn-phone">
          <i class="fas fa-phone"></i> ${owner.phone}
        </a>
      ` : ''}
      ${owner.email ? `
        <a href="mailto:${owner.email}" class="btn-outline">
          <i class="fas fa-envelope"></i> Email
        </a>
      ` : ''}
    </div>
  `;
}

// ===== CONTACT =====
function renderContact(owner) {
  const info = document.getElementById('contactInfo');
  if (!info || !owner) return;

  const whatsappNum = owner.whatsapp ? owner.whatsapp.replace(/\s+/g, '').replace('+', '') : '';

  info.innerHTML = `
    <h3>Mettiti in Contatto</h3>
    <p style="color:var(--text-muted);font-size:15px;line-height:1.7;margin-bottom:8px">
      Tratti direttamente con il proprietario, senza intermediari. Contattami per informazioni o per fissare una visita.
    </p>

    ${owner.phone ? `
      <a href="tel:${owner.phone.replace(/\s+/g, '')}" class="contact-item">
        <div class="contact-item-icon phone"><i class="fas fa-phone"></i></div>
        <div class="contact-item-text">
          <strong>Telefono</strong>
          <span>${owner.phone}</span>
        </div>
      </a>
    ` : ''}

    ${owner.email ? `
      <a href="mailto:${owner.email}" class="contact-item">
        <div class="contact-item-icon email"><i class="fas fa-envelope"></i></div>
        <div class="contact-item-text">
          <strong>Email</strong>
          <span>${owner.email}</span>
        </div>
      </a>
    ` : ''}

    ${owner.whatsapp ? `
      <a href="https://wa.me/${whatsappNum}" target="_blank" rel="noopener" class="contact-item">
        <div class="contact-item-icon whatsapp"><i class="fab fa-whatsapp"></i></div>
        <div class="contact-item-text">
          <strong>WhatsApp</strong>
          <span>${owner.whatsapp}</span>
        </div>
      </a>
    ` : ''}

    <div class="contact-item">
      <div class="contact-item-icon location"><i class="fas fa-map-marker-alt"></i></div>
      <div class="contact-item-text">
        <strong>Zona di Operatività</strong>
        <span>Calabria, Provincia di Vibo Valentia</span>
      </div>
    </div>
  `;
}

function renderFooter(owner) {
  if (!owner) return;

  const footerDesc = document.getElementById('footerDesc');
  if (footerDesc) footerDesc.textContent = siteData.site?.subtitle || 'Immobili in Affitto e Vendita in Calabria';

  const footerContact = document.getElementById('footerContact');
  if (footerContact) {
    footerContact.innerHTML = `
      ${owner.phone ? `
        <li>
          <i class="fas fa-phone"></i>
          <a href="tel:${owner.phone.replace(/\s+/g, '')}">${owner.phone}</a>
        </li>
      ` : ''}
      ${owner.email ? `
        <li>
          <i class="fas fa-envelope"></i>
          <a href="mailto:${owner.email}">${owner.email}</a>
        </li>
      ` : ''}
      ${owner.whatsapp ? `
        <li>
          <i class="fab fa-whatsapp"></i>
          <a href="https://wa.me/${owner.whatsapp.replace(/\s+/g, '').replace('+', '')}" target="_blank" rel="noopener">
            WhatsApp
          </a>
        </li>
      ` : ''}
      <li>
        <i class="fas fa-map-marker-alt"></i>
        <span>Calabria, Italia</span>
      </li>
    `;
  }

  // Social links
  const footerSocial = document.getElementById('footerSocial');
  if (footerSocial && owner.social) {
    let socialHTML = '';
    if (owner.social.facebook) socialHTML += `<a href="${owner.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>`;
    if (owner.social.instagram) socialHTML += `<a href="${owner.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><i class="fab fa-instagram"></i></a>`;
    if (owner.social.linkedin) socialHTML += `<a href="${owner.social.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`;
    footerSocial.innerHTML = socialHTML;
  }

  document.getElementById('currentYear').textContent = new Date().getFullYear();
}

// ===== CONTACT FORM =====
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('input[name="name"]')?.value || '';
    const email = form.querySelector('input[name="email"]')?.value || '';
    const subject = form.querySelector('input[name="subject"]')?.value || '';
    const message = form.querySelector('textarea[name="message"]')?.value || '';
    const ownerEmail = siteData.owner?.email || 'info@arutarosario.com';

    if (!name.trim() || !email.trim() || !message.trim()) {
      alert('Per favore compila tutti i campi obbligatori (*).');
      return;
    }

    const bodyText = `Nome: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:${ownerEmail}?subject=${encodeURIComponent(subject || 'Richiesta dal sito')}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailto;
  });
}

// ===== THEME =====
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

// ===== NAVBAR =====
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // Scrolled state
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    highlightActiveNavLink();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function highlightActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  let current = '';

  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) {
      current = s.id;
    }
  });

  navLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}

// ===== HAMBURGER =====
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: make all visible immediately
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.property-card, .fade-in').forEach(el => {
    if (!el.classList.contains('visible')) {
      observer.observe(el);
    }
  });
}

// ===== HELPERS =====
function formatPrice(price, unit) {
  if (!price && price !== 0) return 'Prezzo su richiesta';
  const formatted = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(price);

  if (!unit || unit === '€') return formatted;
  // Replace the € symbol and append the unit suffix
  const suffix = unit.replace('€', '').trim();
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function formatPriceShort(price, unit) {
  if (!price && price !== 0) return 'Su richiesta';
  let num;
  if (price >= 1000000) {
    num = (price / 1000000).toFixed(1).replace('.0', '') + 'M';
  } else if (price >= 1000) {
    num = (price / 1000).toFixed(0) + 'K';
  } else {
    num = price;
  }
  const suffix = unit && unit !== '€' ? ' ' + unit.replace('€', '').trim() : '';
  return `€${num}${suffix}`;
}

function getTypeLabel(type) {
  const labels = {
    villa: 'Villa',
    casa: 'Casa',
    appartamento: 'Appartamento',
    terreno: 'Terreno',
    locale_commerciale: 'Locale Commerciale'
  };
  return labels[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Immobile');
}

function getStatusLabel(status) {
  const labels = {
    vendita: 'In Vendita',
    affitto: 'In Affitto',
    affitto_vacanze: 'Affitto Vacanze'
  };
  return labels[status] || status;
}

function getTypeColor(type) {
  const colors = {
    villa: '#8b5cf6',
    casa: '#10b981',
    appartamento: '#3b82f6',
    terreno: '#f59e0b',
    locale_commerciale: '#ef4444'
  };
  return colors[type] || '#64748b';
}

function getStatusColor(status) {
  const colors = {
    vendita: '#ef4444',
    affitto: '#10b981',
    affitto_vacanze: '#f97316'
  };
  return colors[status] || '#64748b';
}

function getTypeIcon(type) {
  const icons = {
    villa: 'fa-house-chimney',
    casa: 'fa-house',
    appartamento: 'fa-building',
    terreno: 'fa-mountain-sun',
    locale_commerciale: 'fa-store'
  };
  return icons[type] || 'fa-home';
}
