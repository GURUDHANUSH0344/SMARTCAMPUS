const nodemailer = require("nodemailer");

function createTransporter() {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true",
    service: process.env.EMAIL_HOST ? undefined : "gmail",
    auth: { user, pass },
  });
}

exports.sendEmail = async (to, subject, text) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"SmartCampus ERP" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email failed:", err.message);
    throw err;
  }
};

exports.sendHtmlEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"SmartCampus ERP" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("✅ HTML Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ HTML Email failed:", err.message);
    throw err;
  }
};

exports.sendEmailWithAttachment = async (to, subject, text, attachments) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"SmartCampus ERP" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      attachments,
    });
    console.log("✅ Email with attachment sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email attachment failed:", err.message);
    throw err;
  }
};

