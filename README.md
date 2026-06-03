# InsightBoard – Stremio Addon v1.2

Analytics delle tue abitudini di visione direttamente in home su Stremio.
**Non richiede nessun database esterno** – usa SQLite locale (file `data/insightboard.db`).

## Setup rapido (locale)

```bash
cp .env.example .env      # Compila TRAKT_CLIENT_ID/SECRET e BASE_URL
npm install
node src/server.js
# → http://localhost:7000/configure
```

## Variabili .env obbligatorie

| Variabile | Dove trovarla |
|---|---|
| `TRAKT_CLIENT_ID` + `SECRET` | https://trakt.tv/oauth/applications/new |
| `TRAKT_REDIRECT_URI` | Deve corrispondere all'URI dell'app Trakt |
| `BASE_URL` | Il tuo URL pubblico (in locale: http://localhost:7000) |

La TMDB API Key la inserisce l'utente in fase di registrazione su `/configure`.



## Deploy su Render

### 1. Crea un account Render

Vai su [render.com](https://render.com) e crea un account.

### 2. Crea un Web Service

- Clicca **New** → **Web Service**.
- Connetti il tuo repo GitHub (o carica lo ZIP).
- Imposta:
  - **Branch**: main
  - **Root Directory**: (root del repo)
  - **Build Command**: `npm install`
  - **Start Command**: `node src/server.js`

### 3. Variabili d'ambiente

Nella dashboard Render, aggiungi:

```nob
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
TRAKT_CLIENT_ID=...
TRAKT_CLIENT_SECRET=...
TRAKT_REDIRECT_URI=https://tuo-progetto.onrender.com/auth/trakt/callback
BASE_URL=https://tuo-progetto.onrender.com
TRAKT_USER_AGENT=InsightBoard/1.1.0 (Render)
TMDB_API_KEY=...
```

### 4. Deploy

Render avvierà�® il servizio in automatico.

### 5. Usa l'addon

- Vai su `https://tuo-progetto.onrender.com/configure`
- Crea utente, connetti Trakt, crea profili.
- Installa su Stremio:  
  `https://tuo-progetto.onrender.com/<slug>/<profilo>/manifest.json`



## Deploy

### Hugging Face Spaces (Docker)
- Tipo: Docker
- Carica tutti i file
- Settings → Variables: aggiungi le variabili da .env.example
- `BASE_URL=https://TUONOME-insightboard.hf.space`
- `TRAKT_REDIRECT_URI=https://TUONOME-insightboard.hf.space/auth/trakt/callback`
- Il file SQLite viene salvato in `/data/insightboard.db` nel container

### Render
- Runtime: Node 20 oppure Docker
- Build: `npm install`
- Start: `node src/server.js`
- Aggiungi un **Persistent Disk** montato su `/app/data` per non perdere il DB al restart

## Features
- 📊 11 Insight Cards in home (watchtime, generi, streak, mood, binge, serie in corso, anniversari, orario, heatmap, goal, dropped)
- 👥 Profile Splitter – profili separati con manifest URL distinti
- 🗺️ Heatmap SVG generata dinamicamente
- 🎯 Goal settimanale configurabile
- 🔔 Webhook per notifiche Discord/Ntfy/n8n
- ⬇️ Export CSV dello storico


## Setup Supabase obbligatorio

Prima di usare il bottone **Continua**, devi creare le tabelle nel database Supabase.

1. Apri il tuo progetto su Supabase
2. Vai in **SQL Editor**
3. Crea una nuova query
4. Incolla tutto il contenuto di `supabase/migrations.sql`
5. Premi **Run**

Se non lo fai, l'app mostra questo errore:

```text
Could not find the table 'public.ib_users' in the schema cache
```

Questo errore significa semplicemente che lo schema non è stato ancora creato.


## Redirect URI Trakt

Se Trakt mostra:

`The requested redirect uri is malformed or doesn't match client redirect URI`

devi verificare che **siano identici al carattere**:

- Nel pannello Trakt App: `https://marcogian-insight.hf.space/auth/trakt/callback`
- In HF Space variable `TRAKT_REDIRECT_URI`: `https://marcogian-insight.hf.space/auth/trakt/callback`
- In HF Space variable `BASE_URL`: `https://marcogian-insight.hf.space`

Per debug rapido apri:

`/api/debug/env`

così vedi l'URI realmente letto dal backend.


## Errore profili 23502

Se vedi l'errore Postgres `23502 null value in column "name"`, era dovuto a una firma incoerente della funzione `upsertProfile()`. Nella versione corretta il backend accetta sia:

- `upsertProfile(userId, 'default', { name: 'Default' })`
- `upsertProfile(userId, { slug: 'default', name: 'Default' })`


## Trakt 403 nel callback

Se nei log compare `trakt_http_403` durante `/auth/trakt/callback`, il problema di solito è uno di questi:

- `TRAKT_CLIENT_ID` e `TRAKT_CLIENT_SECRET` non appartengono alla stessa app
- la app Trakt ha un Redirect URI diverso da quello usato dal backend
- le variabili dello Space non sono state aggiornate dopo aver ricreato l'app

Con questa build i log mostrano anche `status`, `body` e `json` della risposta Trakt.


## Trakt 403 / Cloudflare

Se Trakt risponde con una pagina Cloudflare `Sorry, you have been blocked`, prova a impostare `TRAKT_USER_AGENT` nelle variabili HF. Alcuni casi recenti di Trakt API hanno richiesto un User-Agent esplicito per non essere bloccati dal firewall.


## Trakt manuale su HF

Se Cloudflare blocca l'OAuth diretto verso Trakt, usa la card "Trakt manuale" in `/configure`.

Endpoint disponibile:

- `POST /api/user/:slug/trakt/manual`

Body JSON:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "trakt_username": "...",
  "expires_in": 7776000
}
```
