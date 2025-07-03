import nodemailer from 'nodemailer';

// Use a base64 encoded image or a full URL that works in emails
const imageUrl = 'https://raw.githubusercontent.com/it104-go-job/it104-go-job-refactored/main/public/Assets/Title.png';

export async function sendVerificationEmail({ email, code, type, name, lastName, position, companyName, employeeEmail }) {
  try {
    if (!email || !code || !type) {
      throw new Error('Email, code, and type are required');
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
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for registering with GoJob! To complete your registration, please use the verification code below:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0;">
                <h2 style="color: #667eea; margin: 0; letter-spacing: 5px; font-size: 32px;">${code}</h2>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This code will expire in 10 minutes. If you did not request this verification, please ignore this email.
              </p>
            </div>
          </body>
          </html>
        `;
        break;

      case 'login':
        subject = 'GoJob - Login Verification Required';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login Verification</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Login Verification</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 25px;">
                To complete your login, please use the verification code below:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0;">
                <h2 style="color: #667eea; margin: 0; letter-spacing: 5px; font-size: 32px;">${code}</h2>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This code will expire in 5 minutes. If you did not attempt to log in, please secure your account immediately.
              </p>
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
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Employee Registration Request</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">New Employee Registration</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                An employee has requested to join your company on GoJob. Please verify their registration using the code below:
              </p>
              
              <div style="background: white; border-left: 4px solid #48bb78; padding: 20px; margin: 20px 0;">
                <p><strong>Name:</strong> ${name} ${lastName}</p>
                <p><strong>Position:</strong> ${position}</p>
                <p><strong>Email:</strong> ${employeeEmail}</p>
                <p><strong>Company:</strong> ${companyName}</p>
              </div>
              
              <div style="background: white; border: 2px dashed #48bb78; padding: 20px; text-align: center; margin: 20px 0;">
                <h2 style="color: #48bb78; margin: 0; letter-spacing: 5px; font-size: 32px;">${code}</h2>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This code will expire in 10 minutes. If you did not expect this registration, please ignore this email.
              </p>
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
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Registration Pending</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for registering as an employee with ${companyName}. Your registration is pending approval from your company's HR department.
              </p>
              
              <p style="font-size: 16px;">
                We've sent a verification request to your company's HR email. Once they verify your registration, you'll receive a confirmation email.
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                Please contact your HR department if you don't receive a confirmation within 24 hours.
              </p>
            </div>
          </body>
          </html>
        `;
        break;

      case 'employee_verification_confirmed':
        subject = `GoJob - Employee Registration Confirmed: ${name} ${lastName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Employee Registration Confirmed</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Employee Registration Confirmed</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Employee Registration Successful</h2>
              
              <div style="background: white; border-left: 4px solid #48bb78; padding: 20px; margin: 20px 0;">
                <p><strong>Employee:</strong> ${name} ${lastName}</p>
                <p><strong>Position:</strong> ${position}</p>
                <p><strong>Company:</strong> ${companyName}</p>
              </div>
              
              <p style="font-size: 16px;">
                The employee's account has been successfully verified and activated. They can now access the GoJob platform.
              </p>
            </div>
          </body>
          </html>
        `;
        break;

      case 'employee_verification_complete':
        subject = 'GoJob - Your Account is Now Active';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Activated</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GoJob!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Great news! Your employee account with ${companyName} has been verified and activated.
              </p>
              
              <p style="font-size: 16px;">
                You can now log in to your account and start using the GoJob platform to manage job postings and applications.
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="https://your-domain.com/Login" style="background: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Log In Now
                </a>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'jobseeker_verification_complete':
        subject = 'GoJob - Account Verification Complete';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Verification Complete</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to GoJob!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${name}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 25px;">
                Your account has been successfully verified. You can now start using all features of GoJob:
              </p>
              
              <ul style="font-size: 16px; margin-bottom: 25px;">
                <li>Search and apply for jobs</li>
                <li>Create and manage your professional profile</li>
                <li>Track your job applications</li>
                <li>Connect with potential employers</li>
              </ul>
              
              <p style="font-size: 16px;">
                Get started by completing your profile and exploring job opportunities that match your skills and interests.
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </div>
          </body>
          </html>
        `;
        break;

      case 'company_registration':
        subject = 'GoJob - Verify Your Company Registration';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Company Registration Verification</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding-bottom: 20px;">
              <img src="${imageUrl}" alt="GoJob Title" style="max-width: 250px;"/>
            </div>
            <div style="background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Company</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Welcome, ${name}!</h2>
              <p style="font-size: 16px; margin-bottom: 25px;">
                Thank you for registering your company with GoJob. To activate your company profile and start posting jobs, please use the verification code below:
              </p>
              
              <div style="background: white; border: 2px dashed #f6ad55; padding: 20px; text-align: center; margin: 20px 0;">
                <h2 style="color: #f6ad55; margin: 0; letter-spacing: 5px; font-size: 32px;">${code}</h2>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                This code will expire in 30 minutes. If you did not request this registration, please ignore this email.
              </p>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        throw new Error('Invalid email type');
    }

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"GoJob" <noreply@gojob.com>',
      to: email,
      subject,
      html: htmlContent,
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
