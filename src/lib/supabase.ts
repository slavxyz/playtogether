import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

let _supabase: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (_supabase) return _supabase

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Copy .env.local.example to .env.local and add your Supabase credentials.',
    )
  }

  _supabase = createClient<Database>(url, key)
  return _supabase
}
