
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkGroupMembersCols() {
    const { data, error } = await supabase.from('group_members').select('*').limit(1);
    if (error) console.log("Error:", error);
    else console.log("Group Members Columns:", Object.keys(data[0]));
}
checkGroupMembersCols();
