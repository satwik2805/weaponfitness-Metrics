
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking group_members...");
    const { data: d1, error: e1 } = await supabase.from('group_members').select('*').limit(1);
    if (e1) console.log("group_members error:", e1.message);
    else console.log("group_members exists, count:", d1.length);

    console.log("Checking trainee_group_members...");
    const { data: d2, error: e2 } = await supabase.from('trainee_group_members').select('*').limit(1);
    if (e2) console.log("trainee_group_members error:", e2.message);
    else console.log("trainee_group_members exists, count:", d2.length);
}
check();
