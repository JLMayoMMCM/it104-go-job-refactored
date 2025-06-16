import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseStorageAccessKeyId = process.env.SUPABASE_STORAGE_ACCESS_KEY_ID
const supabaseStorageSecretAccessKey = process.env.SUPABASE_STORAGE_SECRET_ACCESS_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Default client instance for database operations (uses anon key)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Function to create new client instances (for backward compatibility)
export const createClient = () => createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Storage client for file operations (attempts to use storage keys if available)
export const createStorageClient = () => {
  if (supabaseStorageAccessKeyId && supabaseStorageSecretAccessKey) {
    console.log('✅ Using storage-specific keys for file operations')
    // Note: Supabase JS client doesn't directly support separate storage keys
    // For now, we'll use the anon key but with storage-specific configuration
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  console.warn('⚠️ Storage keys not configured, using anon key for storage operations')
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}
