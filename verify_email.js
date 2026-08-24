const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");

  console.log('--- Email Configuration Test ---');
  console.log('User:', user);
  console.log('Pass Length:', pass.length);
  console.log('--------------------------------');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  try {
    console.log('Connecting to Gmail SMTP...');
    await transporter.verify();
    console.log('✅ SUCCESS: Your credentials are CORRECT and the system can send emails!');
  } catch (err) {
    console.error('❌ FAILED: Google rejected the login.');
    console.error('Error Details:', err.message);
    if (err.message.includes('Username and Password not accepted')) {
      console.log('\nTIP: Please double-check your App Password. Make sure you copied all 16 characters correctly.');
    }
  }
}

test();
