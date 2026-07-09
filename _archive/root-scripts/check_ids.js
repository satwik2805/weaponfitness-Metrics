
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTrainees() {
    const { data, error } = await supabase.from('trainees').select('*').limit(2);
    if (error) console.log("Error:", error.message);
    else console.log(JSON.stringify(data, null, 2));

    const { data: d, error: e } = await supabase.from('custom_trainee_diet').select('*').limit(1);
    console.log("Custom Trainee Diet Sample:", d?.[0] || "None");
}
checkTrainees();
