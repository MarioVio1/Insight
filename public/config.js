const statusEl = document.getElementById('status');
const createBtn = document.getElementById('createBtn');
const loginBtn = document.getElementById('loginBtn');
const installBtn = document.getElementById('installBtn');
const manifestBox = document.getElementById('manifestBox');
const prefsForm = document.getElementById('prefsForm');
const maxCards = document.getElementById('maxCards');
const focusMode = document.getElementById('focusMode');
const pathParts = location.pathname.split('/').filter(Boolean);
let configId = pathParts[1] || null;

function selectedCardTypes() {
  return [...document.querySelectorAll('input[name="cardType"]:checked')].map(el => el.value);
}

async function loadConfig() {
  if (!configId) {
    statusEl.textContent = 'Nessuna configurazione ancora creata.';
    return;
  }
  const res = await fetch(`/api/config/${configId}`);
  const data = await res.json();
  if (!res.ok) {
    statusEl.textContent = data.error || 'Errore';
    return;
  }
  statusEl.textContent = data.trakt_username ? `Connesso come ${data.trakt_username}` : 'Trakt non collegato';
  loginBtn.href = `/auth/login/${configId}`;
  loginBtn.style.display = 'inline-block';
  prefsForm.style.display = 'grid';
  installBtn.style.display = 'inline-block';
  const manifestUrl = `${location.origin}/${configId}/manifest.json`;
  manifestBox.textContent = manifestUrl;
  installBtn.onclick = async () => {
    await navigator.clipboard.writeText(manifestUrl);
    installBtn.textContent = 'Manifest URL copiato';
  };
  if (data.preferences) {
    maxCards.value = data.preferences.max_cards || 10;
    focusMode.value = data.preferences.focus_mode || 'adaptive';
    document.querySelectorAll('input[name="cardType"]').forEach(el => {
      el.checked = (data.preferences.enabled_card_types || []).includes(el.value);
    });
  }
}

createBtn.onclick = async () => {
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
    statusEl.textContent = data.error || 'Errore creazione configurazione';
    manifestBox.textContent = JSON.stringify(data, null, 2);
    return;
  }
  window.location.href = `/configure/${data.id}`;
};

prefsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!configId) return;
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
  statusEl.textContent = res.ok ? 'Preferenze salvate. Risincronizza per vedere nuove card.' : (data.error || 'Errore salvataggio');
});

loadConfig();
