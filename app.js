const config = window.APP_CONFIG || {};

const state = {
  files: [],
  selectedCategory: 'Todos',
  search: '',
  sort: 'recent',
  sourceLabel: 'Manual'
};

const els = {
  appTitle: document.getElementById('appTitle'),
  appSubtitle: document.getElementById('appSubtitle'),
  openFolderBtn: document.getElementById('openFolderBtn'),
  statFiles: document.getElementById('statFiles'),
  statCategories: document.getElementById('statCategories'),
  statSource: document.getElementById('statSource'),
  categorySummary: document.getElementById('categorySummary'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  cardsGrid: document.getElementById('cardsGrid'),
  emptyState: document.getElementById('emptyState'),
  categoryFilters: document.getElementById('categoryFilters'),
  featuredList: document.getElementById('featuredList'),
  resultCountText: document.getElementById('resultCountText'),
  resultCountBadge: document.getElementById('resultCountBadge'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  uploadModal: document.getElementById('uploadModal'),
  openUploadModalBtn: document.getElementById('openUploadModalBtn'),
  closeUploadModalBtn: document.getElementById('closeUploadModalBtn'),
  manualFileForm: document.getElementById('manualFileForm'),
  clearLocalDataBtn: document.getElementById('clearLocalDataBtn')
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFileTypeFromMime(mimeType, name = '') {
  const extension = name.includes('.') ? name.split('.').pop().toUpperCase() : '';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet')) return 'Planilha';
  if (mimeType.includes('document')) return 'Documento';
  if (mimeType.includes('presentation')) return 'Slides';
  if (mimeType.includes('folder')) return 'Pasta';
  return extension || 'Arquivo';
}

function inferCategory(file) {
  const text = normalizeText(`${file.title} ${file.description} ${file.type}`);
  if (text.includes('orcamento') || text.includes('controle') || text.includes('planilha') || text.includes('finance')) return 'Controle e Financeiro';
  if (text.includes('mapa') || text.includes('atividade') || text.includes('disciplina') || text.includes('teologia') || text.includes('qualidade')) return 'MAPAs e Atividades';
  if (text.includes('estagio') || text.includes('supervisionado') || text.includes('formacao')) return 'Estágio e Formação';
  if (text.includes('extens') || text.includes('evidenc') || text.includes('relatorio') || text.includes('contacao')) return 'Extensão e Evidências';
  return 'Outros';
}

function fileIcon(type) {
  const text = normalizeText(type);
  if (text.includes('pdf')) return 'PDF';
  if (text.includes('plan')) return 'XLS';
  if (text.includes('slide')) return 'PPT';
  if (text.includes('doc')) return 'DOC';
  return 'ARQ';
}

function loadLocalManualItems() {
  try {
    return JSON.parse(localStorage.getItem(config.localStorageKey) || '[]');
  } catch {
    return [];
  }
}

function saveLocalManualItems(items) {
  localStorage.setItem(config.localStorageKey, JSON.stringify(items));
}

async function loadManualSeed() {
  const response = await fetch('./data/manual-files.json');
  if (!response.ok) throw new Error('Não foi possível carregar manual-files.json');
  return response.json();
}

async function loadDriveFiles() {
  const drive = config.drive || {};
  if (!drive.enabled || !drive.apiKey || !drive.folderId) return [];

  const params = new URLSearchParams({
    key: drive.apiKey,
    q: `'${drive.folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink,iconLink)',
    orderBy: drive.orderBy || 'modifiedTime desc',
    pageSize: String(drive.pageSize || 100)
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Falha no Google Drive API: ${message}`);
  }

  const data = await response.json();
  return (data.files || []).map(file => ({
    title: file.name,
    type: getFileTypeFromMime(file.mimeType, file.name),
    category: inferCategory({ title: file.name, description: '', type: getFileTypeFromMime(file.mimeType, file.name) }),
    description: 'Arquivo carregado automaticamente da pasta pública do Google Drive.',
    url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    updated: file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('pt-BR') : 'Sem data',
    featured: false,
    source: 'drive'
  }));
}

function uniqueByTitleAndUrl(items) {
  const map = new Map();
  items.forEach(item => {
    const key = `${item.title}::${item.url}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function getAllCategories(items) {
  const seeded = Array.isArray(config.categories) ? config.categories : [];
  const dynamic = [...new Set(items.map(item => item.category).filter(Boolean))];
  return ['Todos', ...new Set([...seeded, ...dynamic])];
}

function countByCategory(items) {
  return items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
}

function getFilteredFiles() {
  const term = normalizeText(state.search);
  const list = state.files.filter(file => {
    const matchesCategory = state.selectedCategory === 'Todos' || file.category === state.selectedCategory;
    const matchesSearch = !term || normalizeText(`${file.title} ${file.description} ${file.category} ${file.type}`).includes(term);
    return matchesCategory && matchesSearch;
  });

  const sorters = {
    az: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
    type: (a, b) => a.type.localeCompare(b.type, 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR'),
    category: (a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR'),
    recent: (a, b) => String(b.updated).localeCompare(String(a.updated), 'pt-BR')
  };

  return [...list].sort(sorters[state.sort] || sorters.recent);
}

function renderSummary() {
  const counts = countByCategory(state.files);
  els.categorySummary.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `<div class="summary-row"><span>${escapeHtml(category)}</span><span>${count}</span></div>`)
    .join('');
}

function renderFilters() {
  const counts = countByCategory(state.files);
  const categories = getAllCategories(state.files);
  els.categoryFilters.innerHTML = categories.map(category => {
    const total = category === 'Todos' ? state.files.length : (counts[category] || 0);
    const activeClass = state.selectedCategory === category ? 'is-active' : '';
    return `
      <button type="button" class="filter-btn ${activeClass}" data-category="${escapeHtml(category)}">
        <span>${escapeHtml(category)}</span>
        <span class="tag">${total}</span>
      </button>
    `;
  }).join('');

  els.categoryFilters.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedCategory = btn.getAttribute('data-category');
      render();
    });
  });
}

function renderFeatured() {
  const featured = state.files.filter(file => file.featured).slice(0, config.featuredLimit || 4);
  if (!featured.length) {
    els.featuredList.innerHTML = '<div class="featured-item"><strong>Sem destaques</strong><br><small>Marque arquivos como destaque no JSON ou no cadastro manual.</small></div>';
    return;
  }

  els.featuredList.innerHTML = featured.map(file => `
    <a class="featured-item" href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">
      <strong>${escapeHtml(file.title)}</strong><br>
      <small>${escapeHtml(file.category)} · ${escapeHtml(file.type)}</small>
    </a>
  `).join('');
}

function renderCards() {
  const files = getFilteredFiles();
  els.resultCountText.textContent = `${files.length} resultado(s)`;
  els.resultCountBadge.textContent = String(files.length);
  els.emptyState.classList.toggle('hidden', files.length !== 0);

  els.cardsGrid.innerHTML = files.map(file => `
    <article class="card">
      <div class="card__top">
        <span class="file-icon">${escapeHtml(fileIcon(file.type))}</span>
        <span class="tag">${escapeHtml(file.type)}</span>
      </div>

      <div class="card__body">
        <small class="card__meta">${escapeHtml(file.category)}</small>
        <h3>${escapeHtml(file.title)}</h3>
        <p>${escapeHtml(file.description || 'Sem descrição cadastrada.')}</p>
      </div>

      <div class="card__chips">
        <span class="tag">${escapeHtml(file.source === 'drive' ? 'Drive' : 'Manual')}</span>
        <span class="tag">${escapeHtml(file.updated || 'Sem data')}</span>
      </div>

      <div class="card__footer">
        <small class="muted-text">${escapeHtml(file.url)}</small>
        <a class="btn btn--light" href="${escapeHtml(file.url)}" target="_blank" rel="noreferrer">Abrir</a>
      </div>
    </article>
  `).join('');
}

function updateStats() {
  const categories = new Set(state.files.map(item => item.category).filter(Boolean));
  els.statFiles.textContent = String(state.files.length);
  els.statCategories.textContent = String(categories.size);
  els.statSource.textContent = state.sourceLabel;
}

function renderBranding() {
  els.appTitle.textContent = config.branding?.title || 'Portal de Arquivos';
  els.appSubtitle.textContent = config.branding?.subtitle || '';
  els.openFolderBtn.href = config.drive?.folderUrl || '#';
}

function render() {
  renderBranding();
  updateStats();
  renderSummary();
  renderFilters();
  renderFeatured();
  renderCards();
}

function openModal() {
  els.uploadModal.classList.remove('hidden');
  els.uploadModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  els.uploadModal.classList.add('hidden');
  els.uploadModal.setAttribute('aria-hidden', 'true');
}

function exportCurrentJson() {
  const data = JSON.stringify(state.files, null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'portal-arquivos-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function bootstrap() {
  try {
    const [seeded, driveFiles] = await Promise.all([
      loadManualSeed().catch(() => []),
      loadDriveFiles().catch(error => {
        console.warn(error.message);
        return [];
      })
    ]);

    const localItems = loadLocalManualItems();
    state.files = uniqueByTitleAndUrl([...driveFiles, ...seeded, ...localItems]).map(item => ({
      featured: false,
      updated: 'Sem data',
      description: '',
      source: 'manual',
      ...item,
      category: item.category || inferCategory(item)
    }));

    state.sourceLabel = driveFiles.length ? 'Drive + Manual' : 'Manual';
    render();
  } catch (error) {
    console.error(error);
    els.cardsGrid.innerHTML = `<div class="empty-state"><h3>Falha ao carregar os arquivos</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

els.searchInput.addEventListener('input', event => {
  state.search = event.target.value;
  renderCards();
});

els.sortSelect.addEventListener('change', event => {
  state.sort = event.target.value;
  renderCards();
});

els.exportJsonBtn.addEventListener('click', exportCurrentJson);
els.openUploadModalBtn.addEventListener('click', openModal);
els.closeUploadModalBtn.addEventListener('click', closeModal);
els.uploadModal.addEventListener('click', event => {
  if (event.target.dataset.closeModal === 'true') closeModal();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});

els.manualFileForm.addEventListener('submit', event => {
  event.preventDefault();
  const formData = new FormData(els.manualFileForm);
  const item = {
    title: formData.get('title'),
    category: formData.get('category'),
    type: formData.get('type'),
    url: formData.get('url'),
    description: formData.get('description'),
    updated: formData.get('updated') || 'Adicionado manualmente',
    featured: formData.get('featured') === 'on',
    source: 'manual'
  };

  const localItems = loadLocalManualItems();
  localItems.unshift(item);
  saveLocalManualItems(localItems);
  state.files = uniqueByTitleAndUrl([item, ...state.files]);
  render();
  els.manualFileForm.reset();
  closeModal();
});

els.clearLocalDataBtn.addEventListener('click', () => {
  localStorage.removeItem(config.localStorageKey);
  window.location.reload();
});

bootstrap();
