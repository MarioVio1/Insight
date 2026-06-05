const statusEl = document.getElementById('status');
const createBtn = document.getElementById('createBtn');
const loginBtn = document.getElementById('loginBtn');
const installBtn = document.getElementById('installBtn');
const manifestBox = document.getElementById('manifestBox');
const profilesBox = document.getElementById('profilesBox');
const pathParts = location.pathname.split('/').filter(Boolean);
let configId = pathParts[1] || null;

async function loadProfiles() {
  if (!configId) return;
  const res = await fetch(`/api/profiles/${configId}`);
  if (!res.ok) return;
  const data = await res.json();
  const profiles = data.profiles || [];
  if (!profiles.length) return;
  profilesBox.innerHTML = `<h3>Profili</h3><div class="profiles">${profiles.map(p => `<div class="profile-card"><strong>${p.name}</strong><div class="muted">${p.is_default ? 'Principale' : 'Secondario'}</div></div>`).join('')}</div>`;
}

async function loadConfig() {
  if (!configId) {
    statusEl.textContent = 'Nessuna configurazione ancora creata.';
    loginBtn.style.display = 'none';
    installBtn.style.display = 'none';
    manifestBox.textContent = '';
    return;
  }

  try {
    const res = await fetch(`/api/config/${configId}`);
    if (!res.ok) {
      const text = await res.text();
      statusEl.textContent = `Errore caricamento configurazione (${res.status})`;
      manifestBox.textContent = text;
      return;
    }

    const data = await res.json();
    const manifestUrl = `${location.origin}/manifest.json?configId=${configId}`;

    statusEl.textContent = data.trakt_username
      ? `Connesso come ${data.trakt_username}`
      : 'Trakt non collegato';

    loginBtn.href = `/auth/login/${configId}`;
    loginBtn.style.display = 'inline-block';
    installBtn.style.display = 'inline-block';
    manifestBox.textContent = manifestUrl;
    installBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(manifestUrl);
        installBtn.textContent = 'Manifest URL copiato';
      } catch {
        manifestBox.textContent = manifestUrl;
      }
    };
    await loadProfiles();
  } catch (error) {
    statusEl.textContent = 'Errore caricamento configurazione';
    manifestBox.textContent = error instanceof Error ? error.message : 'Errore sconosciuto';
  }
}

createBtn.onclick = async () => {
  statusEl.textContent = 'Creazione configurazione in corso...';
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      const text = await res.text();
      statusEl.textContent = `Errore creazione configurazione (${res.status})`;
      manifestBox.textContent = text;
      return;
    }
    const data = await res.json();
    if (!data || !data.id) {
      statusEl.textContent = 'Risposta API non valida';
      manifestBox.textContent = JSON.stringify(data, null, 2);
      return;
    }
    window.location.href = `/configure/${data.id}`;
  } catch (error) {
    statusEl.textContent = 'Errore creazione configurazione';
    manifestBox.textContent = error instanceof Error ? error.message : 'Errore sconosciuto';
  }
};

loadConfig();
