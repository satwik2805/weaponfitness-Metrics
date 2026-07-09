
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkData() {
    const { data, error } = await supabase.from('custom_trainee_weekly_workouts').select('day_name').limit(5);
    console.log("Day names:", data);
}

checkData();
