const statusEl = document.getElementById('status');
const createBtn = document.getElementById('createBtn');
const loginBtn = document.getElementById('loginBtn');
const installBtn = document.getElementById('installBtn');
const manifestBox = document.getElementById('manifestBox');
const pathParts = location.pathname.split('/').filter(Boolean);
let configId = pathParts[1] || null;

async function loadConfig() {
  if (!configId) {
    statusEl.textContent = 'Nessuna configurazione ancora creata.';
    return;
  }
  const res = await fetch(`/api/config/${configId}`);
  const data = await res.json();
  const manifestUrl = `${location.origin}/manifest.json?configId=${configId}`;
  statusEl.textContent = data.trakt_username ? `Connesso come ${data.trakt_username}` : 'Trakt non collegato';
  loginBtn.href = `/auth/login/${configId}`;
  loginBtn.style.display = 'inline-block';
  installBtn.style.display = 'inline-block';
  manifestBox.textContent = manifestUrl;
  installBtn.onclick = async () => {
    await navigator.clipboard.writeText(manifestUrl);
    installBtn.textContent = 'Manifest URL copiato';
  };
}
createBtn.onclick = async () => {
  const res = await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  const data = await res.json();
  location.href = data.configureUrl;
};
loadConfig();
