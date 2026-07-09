
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkLibrary() {
    const { data: lib, error } = await supabase.from('diet_library').select('*');
    if (error) console.error(error);
    console.log("Library:", lib);

    const { data: meals } = await supabase.from('diet_meals').select('*');
    console.log("Meals:", meals);
}
checkLibrary();
