import crypto from 'crypto';
import { supabase } from './supabase.js';

export async function ensureDefaultProfile(configId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('config_id', configId)
    .limit(1);

  if (data && data.length > 0) return;

  await supabase.from('user_profiles').insert({
    id: crypto.randomUUID(),
    config_id: configId,
    name: 'Main',
    slug: 'main',
    is_default: true,
    avatar_url: null,
    accent_color: '#0ea5e9'
  });
}

export async function listProfiles(configId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id,name,slug,is_default,avatar_url,accent_color')
    .eq('config_id', configId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
