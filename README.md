# Stremio Trakt Addon

Railway-ready Stremio addon with Trakt OAuth, Supabase-backed config storage, basic catalogs, and scheduled sync.

## Setup
1. Deploy to Railway.
2. Set BASE_URL and TRAKT_REDIRECT_URI to your Railway domain.
3. Create the Supabase tables from `supabase/migrations.sql`.
4. Run `npm install` and `npm run dev` locally, or deploy directly.

## Routes
- `/health`
- `/manifest.json`
- `/configure/:configId?`
- `/auth/login/:configId`
- `/auth/callback`
- `/api/config/:configId`
- `/catalog/:type/:id/:extra?.json`
