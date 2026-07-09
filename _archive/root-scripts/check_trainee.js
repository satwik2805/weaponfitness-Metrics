
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTraineeSchema() {
    const { data, error } = await supabase.from('trainees').select('*').limit(1);
    if (error) console.log("Error:", error);
    else console.log("Trainee Columns:", Object.keys(data[0]));
}
checkTraineeSchema();
