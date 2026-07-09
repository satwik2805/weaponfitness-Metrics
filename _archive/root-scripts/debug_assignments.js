
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkAssignments() {
    console.log("--- custom_trainee_diet ---");
    const { data: c, error: ce } = await supabase.from('custom_trainee_diet').select('*');
    if (ce) console.log("CE:", ce);
    else console.log(JSON.stringify(c, null, 2));

    console.log("\n--- group_weekly_diet ---");
    const { data: g, error: ge } = await supabase.from('group_weekly_diet').select('*');
    if (ge) console.log("GE:", ge);
    else console.log(JSON.stringify(g, null, 2));

    console.log("\n--- diet_library ---");
    const { data: l } = await supabase.from('diet_library').select('*');
    console.log(JSON.stringify(l, null, 2));
}
checkAssignments();
