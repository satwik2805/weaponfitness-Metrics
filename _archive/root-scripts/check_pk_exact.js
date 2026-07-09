
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkPKs() {
    const check = async (t, c) => {
        const { error } = await supabase.from(t).select(c).limit(1);
        return !error;
    };

    console.log("group_weekly_diet has id:", await check('group_weekly_diet', 'id'));
    console.log("group_weekly_diet has group_weekly_diet_id:", await check('group_weekly_diet', 'group_weekly_diet_id'));

    console.log("custom_trainee_diet has id:", await check('custom_trainee_diet', 'id'));
    console.log("custom_trainee_diet has custom_trainee_diet_id:", await check('custom_trainee_diet', 'custom_trainee_diet_id'));
}
checkPKs();
