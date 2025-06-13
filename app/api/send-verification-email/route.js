import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { email, code, type, name, lastName, position, companyName, employeeEmail } = await request.json();

    if (!email || !code || !type) {
      return NextResponse.json(
        { message: 'Email, code, and type are required' },
        { status: 400 }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let subject, htmlContent;

    switch (type) {
      case 'registration':
        subject = 'GoJob - Email Verification Required';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GoJob!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${name || 'there'}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for registering with GoJob. To complete your account setup, please verify your email address using the code below:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 3px;">${code}</span>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
                This code will expire in 10 minutes. If you didn't create an account with GoJob, please ignore this email.
              </p>
              
              <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2024 GoJob. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'login':
        subject = 'GoJob - Login Verification Code';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login Verification</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Login Verification</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Secure Login Request</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Someone is trying to log into your GoJob account. If this was you, please use the verification code below:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 3px;">${code}</span>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
                This code will expire in 5 minutes. If you didn't attempt to log in, please secure your account immediately.
              </p>
              
              <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2024 GoJob. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'employee_registration':
        subject = `GoJob - Employee Registration Request from ${name} ${lastName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Employee Registration Request</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Employee Registration Request</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">New Employee Registration</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                An employee has requested to join your company on GoJob:
              </p>
              
              <div style="background: white; border-left: 4px solid #48bb78; padding: 20px; margin: 20px 0;">
                <p><strong>Name:</strong> ${name} ${lastName}</p>
                <p><strong>Position:</strong> ${position}</p>
                <p><strong>Email:</strong> ${employeeEmail}</p>
                <p><strong>Company:</strong> ${companyName}</p>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                To approve this registration, please use the verification code below:
              </p>
              
              <div style="background: white; border: 2px dashed #48bb78; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #48bb78; letter-spacing: 3px;">${code}</span>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
                This code will expire in 10 minutes. If you don't recognize this person, please ignore this email.
              </p>
              
              <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2024 GoJob. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'employee_registration_notification':
        subject = 'GoJob - Registration Pending Company Approval';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Registration Pending</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Registration Pending</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for registering as an employee with ${companyName} on GoJob.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your registration is currently pending approval from your company. We've sent a verification request to your company's email address.
              </p>
              
              <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
                <p><strong>What happens next?</strong></p>
                <p>1. Your company will receive a verification code</p>
                <p>2. Once approved, your account will be activated</p>
                <p>3. You'll receive an email confirmation</p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
                If you have any questions, please contact your HR department or reach out to our support team.
              </p>
              
              <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2024 GoJob. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'company_registration':
        subject = 'GoJob - Company Registration Verification';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Company Registration</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GoJob!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Company Registration Verification</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for registering ${companyName} with GoJob. To complete your company registration, please verify your email address using the code below:
              </p>
              
              <div style="background: white; border: 2px dashed #9f7aea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #9f7aea; letter-spacing: 3px;">${code}</span>
              </div>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Once verified, you'll be able to:
              </p>
              
              <div style="background: white; border-left: 4px solid #9f7aea; padding: 20px; margin: 20px 0;">
                <p>✓ Post job openings</p>
                <p>✓ Manage employee registrations</p>
                <p>✓ Access candidate applications</p>
                <p>✓ Build your company profile</p>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
                This code will expire in 30 minutes. If you didn't register a company with GoJob, please ignore this email.
              </p>
              
              <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2024 GoJob. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        return NextResponse.json(
          { message: 'Invalid email type' },
          { status: 400 }
        );
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      message: 'Verification email sent successfully',
      success: true
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { message: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
