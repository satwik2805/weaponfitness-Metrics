const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_LOGIN,     // SMTP login from Brevo (e.g. 9d1674001@smtp-brevo.com)
    pass: process.env.SMTP_KEY      // SMTP password/key (xsmtpsib-... or the SMTP key Brevo gave)
  },
});

// optional: verify connection at startup (logs connection/auth errors early)
transporter.verify().then(() => {
  console.log("✓ SMTP transporter verified");
}).catch(err => {
  console.error("✖ SMTP transporter verify failed:", err && err.message);
});

async function sendEmail({ to, subject, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Weapon Fitness" <${process.env.SENDER_EMAIL}>`,
      to: Array.isArray(to) ? to.join(",") : to,
      subject,
      text,
    });
    return info;
  } catch (err) {
    console.error("✖ sendEmail error:", err && err.message);
    throw err;
  }
}

module.exports = sendEmail;