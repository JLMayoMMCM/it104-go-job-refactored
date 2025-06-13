import { NextResponse } from 'next/server';
const nodemailer = require('nodemailer');

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export async function POST(request) {
  const { email, code } = await request.json();

  // Load credentials from env
  const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER || process.env.GOOGLE_EMAIL;
  const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.GOOGLE_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = process.env.SMTP_PORT || 587;

  if (!emailUser || !emailPass) {
    console.warn('Email credentials not configured. Email sending will be simulated.');
    return NextResponse.json({ simulated: true, success: true });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: {
      name: 'GO JOB',
      address: emailUser
    },
    to: email,
    subject: 'GO JOB - Email Verification Code',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff; font-size: 2.5em; margin: 0; font-weight: bold;">GO JOB</h1>
            <p style="color: #666; font-size: 1.1em; margin: 10px 0 0 0;">Find Your Perfect Career Match</p>
          </div>
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Email Verification</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Thank you for registering with GO JOB! To complete your account setup, please use the verification code below:
          </p>
          <div style="background: linear-gradient(135deg, #007bff, #0056b3); padding: 25px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <div style="color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${code}
            </div>
          </div>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⏰ Important:</strong> This code will expire in <strong>10 minutes</strong> for security purposes.
            </p>
          </div>
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            If you didn't create an account with GO JOB, please ignore this email. Your email address will not be used for any further communications.
          </p>
          <hr style="border: none; height: 1px; background-color: #eee; margin: 30px 0;">
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} GO JOB. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
