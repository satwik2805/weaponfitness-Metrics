const brevoApi = require("../utils/brevoClient");

const MAX_RECIPIENTS = 500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.sendEmailToUsers = async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "No recipients provided" });
    }

    if (recipients.length > MAX_RECIPIENTS) {
      return res.status(400).json({
        error: `Too many recipients (max ${MAX_RECIPIENTS})`,
        count: recipients.length,
      });
    }

    const invalidEmails = recipients.filter(
      (email) => typeof email !== "string" || !EMAIL_REGEX.test(email.trim())
    );
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: "Invalid recipient email address(es)",
        invalid: invalidEmails,
      });
    }

    if (
      !subject || typeof subject !== "string" || !subject.trim() ||
      !message || typeof message !== "string" || !message.trim()
    ) {
      return res.status(400).json({ error: "Subject and message are required" });
    }

    const emailData = {
      sender: { email: process.env.SENDER_EMAIL, name: "Weapon Fitness" },
      to: recipients.map((email) => ({ email: email.trim() })),
      subject,
      htmlContent: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ff6b00;">Weapon Fitness</h2>
              <p>${message.replace(/\n/g, "<br>")}</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                © Weapon Fitness. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `,
    };

    await brevoApi.sendTransacEmail(emailData);

    console.log(`✓ Emails sent to ${recipients.length} recipients`);
    return res.json({
      success: true,
      message: "Emails sent successfully!",
      count: recipients.length,
    });
  } catch (err) {
    console.error("❌ Email Error:", err);
    return res.status(500).json({ error: "Failed to send email", details: err.message });
  }
};