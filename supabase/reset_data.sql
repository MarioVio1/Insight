-- Reset completo: cancella tutti i dati utente per ripartire da zero
-- Dopo aver eseguito, rifai il sync da /configure/IL_TUO_SLUG
--
-- ATTENZIONE: cancella TUTTI i dati di tutti gli utenti.
-- Se vuoi cancellare un solo utente, usa:
--   delete from trakt_events where config_id = 'IL_SUO_UUID';
--   delete from insight_snapshots where config_id = 'IL_SUO_UUID';

-- 1. Eventi Trakt
delete from trakt_events;

-- 2. Snapshot delle statistiche
delete from insight_snapshots;

-- 3. Card/Metadati (catalogo rigenerato al prossimo sync)
delete from adaptive_rows;
delete from adaptive_meta;

-- 4. Opzionale: resetta il timestamp sync così parte una sync forzata
-- update addon_configs set last_sync_at = null;
