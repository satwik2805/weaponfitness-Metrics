
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTpl() {
    const { data, error } = await supabase.from('workout_templates').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("Cols:", JSON.stringify(Object.keys(data[0])));
    } else {
        console.log("No templates found or error:", error);
    }
}

checkTpl();
