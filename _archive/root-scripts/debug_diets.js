
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function debugDiets() {
    console.log("--- Group Weekly Diets ---");
    const { data: gwd } = await supabase.from('group_weekly_diet').select('*');
    console.log(JSON.stringify(gwd, null, 2));

    console.log("\n--- Custom Trainee Diets ---");
    const { data: ctd } = await supabase.from('custom_trainee_diet').select('*');
    console.log(JSON.stringify(ctd, null, 2));

    console.log("\n--- Diets List ---");
    const { data: diets } = await supabase.from('diets').select('id, diet_name');
    console.log(JSON.stringify(diets, null, 2));
}
debugDiets();
