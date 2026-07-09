
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function listProfiles() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role').limit(20);
    if (error) console.error(error);
    console.log(JSON.stringify(data, null, 2));
}
listProfiles();
