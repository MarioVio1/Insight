const statusEl = document.getElementById('status');
const spinner = statusEl?.querySelector('.spinner');
const statusText = statusEl?.querySelector('span:last-child');
const createForm = document.getElementById('createForm');
const createBtn = document.getElementById('createBtn');
const slugInput = document.getElementById('slugInput');
const loginBtn = document.getElementById('loginBtn');
const installBtn = document.getElementById('installBtn');
const manifestBox = document.getElementById('manifestBox');
const prefsForm = document.getElementById('prefsForm');
const maxCards = document.getElementById('maxCards');
const focusMode = document.getElementById('focusMode');
const stepAuth = document.getElementById('stepAuth');
const stepPrefs = document.getElementById('stepPrefs');
const stepPreview = document.getElementById('stepPreview');
const stepInstall = document.getElementById('stepInstall');
const previewGrid = document.getElementById('previewGrid');
const connectedBadge = document.getElementById('connectedBadge');
const usernameDisplay = document.getElementById('usernameDisplay');
const syncBtn = document.getElementById('syncBtn');
const syncStatus = document.getElementById('syncStatus');

const pathParts = location.pathname.split('/').filter(Boolean);
let configId = pathParts[1] || null;
let manifestUrl = '';

document.querySelectorAll('.card-option').forEach(el => {
  el.addEventListener('click', () => {
    const cb = el.querySelector('input[type="checkbox"]');
    if (!cb) return;
    cb.checked = !cb.checked;
    el.classList.toggle('checked', cb.checked);
  });
});



function setStatus(text, done) {
  if (!statusEl) return;
  if (done) {
    statusEl.style.display = 'none';
  } else {
    statusEl.style.display = 'flex';
    if (statusText) statusText.textContent = text;
  }
}

function updateManifestUrl(lastSync) {
  const t = Date.now();
  manifestUrl = `${location.origin}/${configId}/manifest.json?_=${t}`;
  manifestBox.textContent = manifestUrl;
  const syncInfo = document.getElementById('syncInfo');
  if (syncInfo && lastSync) {
    const d = new Date(lastSync);
    syncInfo.textContent = `Ultimo sync: ${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT')}`;
  }
}

function selectedCardTypes() {
  return [...document.querySelectorAll('input[name="cardType"]:checked')].map(el => el.value);
}

async function loadPreview() {
  if (!configId || !previewGrid) return;
  previewGrid.innerHTML = '<p style="color:var(--muted)">Caricamento anteprima...</p>';
  stepPreview.style.display = 'flex';
  try {
    const res = await fetch(`/${configId}/catalog/movie/adaptive-insights.json`);
    const data = await res.json();
    if (!data.metas || data.metas.length === 0) {
      previewGrid.innerHTML = '<p style="color:var(--muted)">Nessuna card disponibile. Fai il sync con Trakt.</p>';
      return;
    }
    previewGrid.innerHTML = '';
    for (const m of data.metas) {
      const card = document.createElement('div');
      card.className = 'preview-card';
      card.innerHTML = `
        <img src="${m.poster}" alt="${m.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect fill=%22%230f172a%22 width=%22200%22 height=%22300%22/><text x=%22100%22 y=%22150%22 fill=%22%2364748b%22 font-size=%2214%22 text-anchor=%22middle%22 font-family=%22Arial%22>${encodeURIComponent(m.name)}</text></svg>'">
        <div class="preview-label">${m.name}</div>
      `;
      previewGrid.appendChild(card);
    }
  } catch {
    previewGrid.innerHTML = '<p style="color:var(--muted)">Errore nel caricamento anteprima.</p>';
  }
}

async function loadConfig() {
  if (!configId) {
    setStatus('Inserisci un nome e premi "Crea / Apri".', false);
    return;
  }
  setStatus('Caricamento configurazione...', false);
  const res = await fetch(`/api/config/${configId}`);
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.error || 'Configurazione non trovata. Creane una nuova sopra.', false);
    return;
  }
  setStatus('', true);

  stepAuth.style.display = 'flex';
  stepPrefs.style.display = 'flex';
  stepInstall.style.display = 'flex';

  if (data.trakt_username) {
    loginBtn.style.display = 'none';
    connectedBadge.style.display = 'inline-flex';
    usernameDisplay.textContent = data.trakt_username;
  } else {
    loginBtn.href = `/auth/login/${configId}`;
    loginBtn.style.display = 'inline-flex';
    connectedBadge.style.display = 'none';
  }

  if (data.preferences) {
    focusMode.value = data.preferences.focus_mode || 'adaptive';
    const savedTypes = data.preferences.enabled_card_types || [];
    const allDefaults = ['totals','streak','peak','weekly','genre','binge','monthly','recurring','rewatch','seasonal','actor','director','anime','ranking','memories','giorni','migliore'];
    document.querySelectorAll('input[name="cardType"]').forEach(el => {
      const checked = savedTypes.includes(el.value) || (savedTypes.length === 0 && allDefaults.includes(el.value));
      el.checked = checked;
      el.closest('.card-option')?.classList.toggle('checked', checked);
    });
  }

  updateManifestUrl(data.last_sync_at);

  if (data.last_sync_at) {
    loadPreview();
  }
}

installBtn.onclick = async () => {
  await navigator.clipboard.writeText(manifestUrl);
  installBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copiato!';
  installBtn.style.background = '#22c55e';
  setTimeout(() => {
    installBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 14l4 4 4-4M10 2v12" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copia URL';
    installBtn.style.background = '';
  }, 2000);
};

createForm.onsubmit = async (e) => {
  e.preventDefault();
  const slug = slugInput.value.trim().replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  if (!slug) return;

  createBtn.disabled = true;
  createBtn.textContent = 'Creazione...';
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      enabled_card_types: selectedCardTypes(),
      focus_mode: focusMode.value,
      seasonal_enabled: true,
      festive_enabled: true,
      style_mode: 'cinematic'
    })
  });
  const data = await res.json();
  createBtn.disabled = false;
  createBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg> Crea / Apri';
  if (!res.ok) {
    setStatus(data.error || 'Errore creazione', false);
    return;
  }
  window.location.href = `/configure/${data.slug}`;
};

prefsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!configId) return;
  const submitBtn = prefsForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvataggio...';
  const res = await fetch(`/api/config/${configId}/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled_card_types: selectedCardTypes(),
      focus_mode: focusMode.value,
      seasonal_enabled: true,
      festive_enabled: true,
      style_mode: 'cinematic'
    })
  });
  const data = await res.json();
  submitBtn.disabled = false;
  if (res.ok) {
    submitBtn.textContent = '✓ Salvato!';
    submitBtn.style.background = '#22c55e';
    setTimeout(() => {
      submitBtn.textContent = 'Salva preferenze';
      submitBtn.style.background = '';
    }, 2000);
  } else {
    submitBtn.textContent = 'Errore, riprova';
    setTimeout(() => { submitBtn.textContent = 'Salva preferenze'; }, 2000);
  }
});

syncBtn.addEventListener('click', async () => {
  if (!configId) return;
  syncBtn.disabled = true;
  syncBtn.textContent = 'Sincronizzazione...';
  syncStatus.textContent = '';
  syncStatus.className = 'sync-status';
  const res = await fetch(`/api/config/${configId}/sync`, { method: 'POST' });
  const data = await res.json();
  syncBtn.disabled = false;
  syncBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 0112 0M16 10l-3-3M4 10l3-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg> Sincronizza ora con Trakt';
  if (data.ok) {
    syncStatus.textContent = `Sync riuscita! ${data.count} eventi importati.`;
    syncStatus.className = 'sync-status success';
    loadConfig();
    loadPreview();
  } else {
    syncStatus.textContent = data.error || 'Errore sync';
    syncStatus.className = 'sync-status error';
  }
});

loadConfig();
