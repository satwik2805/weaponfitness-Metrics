
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkDietLib() {
    const { data, error } = await supabase.from('diet_library').select('*');
    if (error) console.log("Error:", error);
    else console.log("Data:", JSON.stringify(data, null, 2));
}
checkDietLib();
