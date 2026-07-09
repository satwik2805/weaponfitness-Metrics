
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testSave() {
    const traineeId = "8de66061-591b-4f93-851d-616954be7e27"; // A known trainee from my logs
    const dietId = "9055bec5-720f-488b-a320-c75245842c75"; // A known diet
    const day = "monday";

    console.log("Testing insert into custom_trainee_diet...");
    const { data, error } = await supabase
        .from("custom_trainee_diet")
        .insert({
            trainee_id: traineeId,
            diet_id: dietId,
            day_name: day
        })
        .select();

    if (error) {
        console.log("Insert failed:", error.message);
    } else {
        console.log("Insert success:", data);

        // Try update
        console.log("Testing update...");
        const { error: updErr } = await supabase
            .from("custom_trainee_diet")
            .update({ diet_id: dietId })
            .eq("id", data[0].id);

        if (updErr) console.log("Update failed:", updErr.message);
        else console.log("Update success");
    }
}
testSave();
