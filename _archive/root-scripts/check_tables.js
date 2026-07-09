
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTables() {
    const { data: diets, error: err1 } = await supabase.from('custom_trainee_diet').select('*').limit(1);
    console.log("custom_trainee_diet exists:", !err1);

    const { data: workouts, error: err2 } = await supabase.from('custom_trainee_weekly_workouts').select('*').limit(1);
    console.log("custom_trainee_weekly_workouts exists:", !err2);
    if (err2) console.log("Workout Error:", err2.message);
}

checkTables();
