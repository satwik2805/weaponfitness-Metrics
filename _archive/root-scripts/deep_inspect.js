
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspectTable(table) {
    console.log(`\n--- Inspecting ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(5);
    if (error) {
        console.log("Error selecting:", error.message);
    } else {
        console.log("Data count:", data.length);
        if (data.length > 0) {
            console.log("Columns found in first row:", Object.keys(data[0]));
            data.forEach(row => console.log("Row:", row));
        } else {
            console.log("No data found to inspect columns.");
        }
    }
}

async function run() {
    await inspectTable('custom_trainee_diet');
    await inspectTable('group_weekly_diet');
}
run();
