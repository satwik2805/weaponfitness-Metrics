
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspectTables() {
    const tables = ['diet_library', 'group_weekly_diet', 'custom_trainee_diet'];
    for (const t of tables) {
        console.log(`--- Table: ${t} ---`);
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (error) {
            console.log(`Error: ${error.message}`);
        } else {
            console.log("Sample Data:", data[0] ? Object.keys(data[0]) : "Empty");
        }
    }
}
inspectTables();
