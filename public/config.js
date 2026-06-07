const statusEl = document.getElementById('status');
const spinner = statusEl?.querySelector('.spinner');
const statusText = statusEl?.querySelector('span:last-child');
const createBtn = document.getElementById('createBtn');
const loginBtn = document.getElementById('loginBtn');
const installBtn = document.getElementById('installBtn');
const manifestBox = document.getElementById('manifestBox');
const prefsForm = document.getElementById('prefsForm');
const maxCards = document.getElementById('maxCards');
const focusMode = document.getElementById('focusMode');
const stepAuth = document.getElementById('stepAuth');
const stepPrefs = document.getElementById('stepPrefs');
const stepInstall = document.getElementById('stepInstall');
const connectedBadge = document.getElementById('connectedBadge');
const usernameDisplay = document.getElementById('usernameDisplay');

const syncBtn = document.getElementById('syncBtn');
const syncStatus = document.getElementById('syncStatus');
const pathParts = location.pathname.split('/').filter(Boolean);
let configId = pathParts[1] || null;

document.querySelectorAll('.card-option').forEach(el => {
  el.addEventListener('click', () => {
    const cb = el.querySelector('input[type="checkbox"]');
    if (!cb) return;
    cb.checked = !cb.checked;
    el.classList.toggle('checked', cb.checked);
  });
});

document.getElementById('incCards')?.addEventListener('click', () => {
  let v = parseInt(maxCards.value || '10');
  if (v < 16) maxCards.value = String(v + 1);
});
document.getElementById('decCards')?.addEventListener('click', () => {
  let v = parseInt(maxCards.value || '10');
  if (v > 3) maxCards.value = String(v - 1);
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
  const manifestUrl = `${location.origin}/${configId}/manifest.json?_=${t}`;
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

async function loadConfig() {
  if (!configId) {
    setStatus('Crea una configurazione per iniziare.', false);
    return;
  }
  setStatus('Caricamento configurazione...', false);
  const res = await fetch(`/api/config/${configId}`);
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.error || 'Errore', false);
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
    maxCards.value = data.preferences.max_cards || 10;
    focusMode.value = data.preferences.focus_mode || 'adaptive';
    const savedTypes = data.preferences.enabled_card_types || [];
    const allDefaults = ['totals','streak','peak','weekly','genre','binge','monthly','recurring','rewatch','seasonal','actor','director','anime','ranking'];
    document.querySelectorAll('input[name="cardType"]').forEach(el => {
      const checked = savedTypes.includes(el.value) || (savedTypes.length === 0 && allDefaults.includes(el.value));
      el.checked = checked;
      el.closest('.card-option')?.classList.toggle('checked', checked);
    });
  }

  updateManifestUrl(data.last_sync_at);
  installBtn.onclick = async () => {
    await navigator.clipboard.writeText(manifestUrl);
    installBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 10l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copiato!';
    installBtn.style.background = '#22c55e';
    setTimeout(() => {
      installBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 14l4 4 4-4M10 2v12" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copia URL';
      installBtn.style.background = '';
    }, 2000);
  };
}

createBtn.onclick = async () => {
  createBtn.disabled = true;
  createBtn.textContent = 'Creazione...';
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_cards: parseInt(maxCards.value || '10', 10),
      enabled_card_types: selectedCardTypes(),
      focus_mode: focusMode.value,
      seasonal_enabled: true,
      festive_enabled: true,
      style_mode: 'cinematic'
    })
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.error || 'Errore creazione', false);
    createBtn.disabled = false;
    createBtn.textContent = 'Crea configurazione';
    return;
  }
  window.location.href = `/configure/${data.id}`;
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
      max_cards: parseInt(maxCards.value || '10', 10),
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
    // Ricarica la config per aggiornare l'URL manifest
    loadConfig();
  } else {
    syncStatus.textContent = data.error || 'Errore sync';
    syncStatus.className = 'sync-status error';
  }
});

loadConfig();
