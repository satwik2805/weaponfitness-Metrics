
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function probeColumns() {
    const tables = ['group_weekly_diet', 'custom_trainee_diet'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (error) console.log(`${t}: id column check failed - ${error.message}`);
        else console.log(`${t}: id column exists`);

        const { error: err2 } = await supabase.from(t).select(`${t}_id`).limit(1);
        if (err2) console.log(`${t}: ${t}_id column check failed - ${err2.message}`);
        else console.log(`${t}: ${t}_id column exists`);
    }
}
probeColumns();
