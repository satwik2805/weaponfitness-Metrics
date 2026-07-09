
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'custom_trainee_weekly_workouts' });
    console.log("Schema:", data);
    if (error) {
        // fallback to a simple query to see columns if RPC fails
        const { data: cols } = await supabase.from('custom_trainee_weekly_workouts').select('*').limit(0);
        console.log("Cols:", Object.keys(cols?.[0] || {}));
    }
}

checkSchema();
