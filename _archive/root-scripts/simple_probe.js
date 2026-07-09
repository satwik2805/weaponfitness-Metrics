
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function probe() {
    const { error: e1 } = await supabase.from('group_weekly_diet').select('group_id').limit(1);
    console.log("group_weekly_diet has group_id:", !e1);
    const { error: e2 } = await supabase.from('custom_trainee_diet').select('trainee_id').limit(1);
    console.log("custom_trainee_diet has trainee_id:", !e2);
}
probe();
