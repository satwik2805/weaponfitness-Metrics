import { createClient } from '@supabase/supabase-js';
import storageAdapter from '../utils/SecureStoreAdapter';
import Constants from 'expo-constants';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = Constants.expoConfig?.extra || {};

const supabaseUrl = SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://mock-project.supabase.co';
const supabaseKey = SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'mock-anon-key-for-development';

if (!SUPABASE_URL && !process.env.EXPO_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
  console.warn('⚠️  Supabase credentials missing! Using mock values for development.');
}

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (e) {
  console.error('Failed to initialize Supabase:', e);
  // Create a dummy client to prevent app from crashing
  supabase = createClient('https://dummy.supabase.co', 'dummy-key');
}

export { supabase };
