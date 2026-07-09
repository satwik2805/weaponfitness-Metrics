const express = require("express");
const router = express.Router();
const { sendEmailToUsers } = require("../controller/emailController");
const { createClient } = require("@supabase/supabase-js");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.post("/send", sendEmailToUsers);

// ✓ Test endpoint for absent reminder cron (exact replica)
router.post("/test-absent-reminder", async (req, res) => {
  console.log("🧪 Testing absent reminder...");

  try {
    const today = new Date();

    // Get all trainees
    const { data: trainees } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "Trainee");

    let targetEmails = [];

    for (const t of trainees) {
      // Find last attendance
      const { data: last } = await supabase
        .from("attendance")
        .select("date")
        .eq("trainee_id", t.id)
        .order("date", { ascending: false })
        .limit(1);

      if (!last || last.length === 0) {
        // never attended → send reminder
        targetEmails.push(t.id);
        continue;
      }

      const lastDate = new Date(last[0].date);
      const diff = (today - lastDate) / (1000 * 60 * 60 * 24);

      if (diff >= 3) {
        targetEmails.push(t.id);
      }
    }

    if (targetEmails.length === 0) {
      console.log("No absent trainees found.");
      return res.json({ message: "No absent trainees found", count: 0 });
    }

    // Fetch their email IDs
    const { data: traineeEmails, error: emailErr } = await supabase.rpc(
      "get_user_emails_with_id_by_role",
      { role_name: "Trainee" }
    );

    if (emailErr) {
      console.error("❌ Error fetching trainee emails via RPC:", emailErr);
      return res.status(500).json({ error: "Failed to fetch emails" });
    }

    console.log("📋 Debug Info:");
    console.log("  Target absent trainee IDs:", targetEmails);
    console.log("  RPC returned emails:", traineeEmails);

        const recipientList = traineeEmails
            .filter((t) => targetEmails.includes(t.id))
            .map((t) => t.email)
            .filter(Boolean);
            
    if (recipientList.length === 0) {
      console.log("⚠️ No absent trainees with valid email.");
      return res.json({ 
        message: "No absent trainees with valid email", 
        count: 0,
        debug: {
          targetEmails,
          traineeEmails,
          // profileMap
        }
      });
    }

    // Send reminder mail
    await sendEmail({
      to: recipientList,
      subject: "[TEST] We Miss You at the Gym!",
      text: "[TEST EMAIL]\n\nIt's been a few days since your last visit. Come back today and keep your streak alive 💪🔥",
    });

    console.log(`📨 Sent reminder to ${recipientList.length} trainees.`);
    return res.json({
      success: true,
      message: "Test email sent successfully!",
      absentTraineeCount: targetEmails.length,
      emailsSent: recipientList.length,
      recipients: recipientList,
    });
  } catch (err) {
    console.error("❌ Test error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;