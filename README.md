# Trakt Insights Cloud for Stremio

Railway-ready Stremio addon with:
- Trakt OAuth
- Supabase storage
- Profiles
- Stats overview cards
- Recurring habits cards
- Top genres / people
- Rewatch insights

## Required steps
1. Set Railway variables from `.env.example`
2. Run `supabase/migrations.sql` in Supabase SQL Editor
3. Set Trakt redirect URI to `https://YOUR-DOMAIN/auth/callback`
4. Optionally add TMDb API key for richer artwork
5. Deploy and open `/configure`

## Important
The addon serves custom Stremio cards via catalog + meta resources. Install the manifest URL shown in the config page.
