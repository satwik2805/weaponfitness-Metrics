
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function probeJunctions() {
    const { data: g } = await supabase.from('group_weekly_diet').select('*').limit(1);
    console.log("group_weekly_diet cols:", g?.[0] ? Object.keys(g[0]) : "No data");

    if (!g?.[0]) {
        const cols = ['id', 'group_id', 'diet_id', 'day_name', 'trainee_id'];
        for (const c of cols) {
            const { error } = await supabase.from('group_weekly_diet').select(c).limit(1);
            if (!error) console.log(`group_weekly_diet has: ${c}`);
        }
    }

    const { data: c } = await supabase.from('custom_trainee_diet').select('*').limit(1);
    console.log("custom_trainee_diet cols:", c?.[0] ? Object.keys(c[0]) : "No data");

    if (!c?.[0]) {
        const cols = ['id', 'trainee_id', 'diet_id', 'day_name', 'group_id'];
        for (const col of cols) {
            const { error } = await supabase.from('custom_trainee_diet').select(col).limit(1);
            if (!error) console.log(`custom_trainee_diet has: ${col}`);
        }
    }
}
probeJunctions();
