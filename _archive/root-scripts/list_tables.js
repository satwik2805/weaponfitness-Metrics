
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function listTables() {
    // This is a bit tricky with just anon key, but we can try to query some likely names.
    const tables = ['trainee_groups', 'group_members', 'diet_library', 'diet_meals', 'diet_items', 'group_weekly_diet', 'custom_trainee_diet', 'trainees'];
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('count').limit(1);
        if (error) console.log(`Table ${t}: Error - ${error.message}`);
        else console.log(`Table ${t}: Found`);
    }
}
listTables();
