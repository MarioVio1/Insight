# Stremio Adaptive Insights

A Railway-ready Stremio addon that builds one adaptive row of personalized insight cards from Trakt, with configurable card types, seasonal logic, profiles, and series-style detail views.

## Core idea
- One single row in Stremio
- Adaptive cards based on user taste
- Configure before generating installable manifest
- Cards open as series-style detail pages with videos that behave like episodes
- TMDb artwork enrichment with SVG generated fallback posters

## Setup
1. Fill Railway variables from `.env.example`
2. Run `supabase/migrations.sql` in Supabase SQL editor
3. Set Trakt callback to `https://YOUR-DOMAIN/auth/callback`
4. Optionally set TMDb credentials for artwork enrichment
5. Deploy and open `/configure`
6. Create config, connect Trakt, choose card preferences, install manifest URL
