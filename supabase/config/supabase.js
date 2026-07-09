// config/supabase.js

// Check if credentials are saved in localStorage from the UI settings configuration
const storedUrl = localStorage.getItem('supabase_url');
const storedKey = localStorage.getItem('supabase_anon_key');

// Fallback to hardcoded values (which can be edited directly here)
const SUPABASE_URL = storedUrl || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = storedKey || 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;

// Automatically detect if credentials are still placeholder values
const isMockMode = 
  SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
  SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' || 
  !SUPABASE_URL.trim() || 
  !SUPABASE_ANON_KEY.trim();

if (!isMockMode) {
  try {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase client initialized successfully!');
    } else {
      console.warn('Supabase SDK library not found in window object. Falling back to Mock mode.');
    }
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// Seamless local storage mock implementation for offline demo testing
const mockSupabase = {
  from(table) {
    const builder = {
      select() {
        return this;
      },
      limit(count) {
        return this;
      },
      // Thenable implementation to allow awaiting the query chain
      then(onFulfilled) {
        const stored = localStorage.getItem(`mock_db_${table}`);
        const parsedData = stored ? JSON.parse(stored) : null;
        const result = { 
          data: parsedData ? [parsedData] : [], 
          error: null 
        };
        return Promise.resolve(result).then(onFulfilled);
      },
      async upsert(payload, options) {
        localStorage.setItem(`mock_db_${table}`, JSON.stringify(payload));
        return { 
          data: payload, 
          error: null 
        };
      }
    };
    return builder;
  }
};

export const supabase = (isMockMode || !supabaseClient) ? mockSupabase : supabaseClient;
export const isDemo = (isMockMode || !supabaseClient);
export const credentials = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
export const configSettings = {
  isMockMode,
  urlPlaceholder: 'YOUR_SUPABASE_URL',
  keyPlaceholder: 'YOUR_SUPABASE_ANON_KEY'
};

// Global helper to save credentials from UI settings panel
window.saveSupabaseConfig = (url, key) => {
  if (url) localStorage.setItem('supabase_url', url.trim());
  else localStorage.removeItem('supabase_url');

  if (key) localStorage.setItem('supabase_anon_key', key.trim());
  else localStorage.removeItem('supabase_anon_key');

  // Reload page to apply changes
  window.location.reload();
};

// Global helper to reset configurations
window.resetSupabaseConfig = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  window.location.reload();
};
