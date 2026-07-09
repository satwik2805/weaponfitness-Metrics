
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkDuplicates() {
    const { data } = await supabase.from('custom_trainee_diet').select('*');
    const counts = {};
    data.forEach(r => {
        const k = `${r.trainee_id}_${r.day_name}`;
        counts[k] = (counts[k] || 0) + 1;
    });
    console.log("Duplicate Check (custom_trainee_diet):", Object.entries(counts).filter(([k, v]) => v > 1));

    const { data: g } = await supabase.from('group_weekly_diet').select('*');
    const gcounts = {};
    g.forEach(r => {
        const k = `${r.group_id}_${r.day_name}`;
        gcounts[k] = (gcounts[k] || 0) + 1;
    });
    console.log("Duplicate Check (group_weekly_diet):", Object.entries(gcounts).filter(([k, v]) => v > 1));
}
checkDuplicates();
