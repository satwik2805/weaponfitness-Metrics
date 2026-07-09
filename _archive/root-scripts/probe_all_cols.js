
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function probeAll() {
    const tables = ['diet_library', 'group_weekly_diet', 'custom_trainee_diet', 'diet_meals', 'diet_items'];
    for (const t of tables) {
        console.log(`\n--- ${t} ---`);
        // We can't use information_schema with anon key usually, 
        // but we can try to select one row and see the keys.
        // If empty, we can try to insert a garbage row and catch the error which might list columns,
        // or just try common ones.
        const { data, error } = await supabase.from(t).select('*').limit(1);
        if (data && data.length > 0) {
            console.log("Columns:", Object.keys(data[0]));
        } else {
            console.log("No data. Probing common names...");
            const common = ['id', `${t}_id`, 'diet_id', 'trainee_id', 'group_id', 'day_name', 'meal_id', 'diet_library_id'];
            for (const c of common) {
                const { error: err } = await supabase.from(t).select(c).limit(1);
                if (!err) console.log(`  Found column: ${c}`);
            }
        }
    }
}
probeAll();
