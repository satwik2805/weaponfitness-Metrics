
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkAssignmentTables() {
    const tables = ['group_weekly_diet', 'custom_trainee_diet'];
    for (const t of tables) {
        // Try to insert a dummy to see if it works or if there is a specific PK
        const { data, error } = await supabase.from(t).select('*').limit(1);
        console.log(`Table ${t}:`, data?.[0] ? Object.keys(data[0]) : "No data to check keys");
    }
}
checkAssignmentTables();
