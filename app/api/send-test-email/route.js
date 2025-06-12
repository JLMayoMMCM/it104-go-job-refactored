import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { connectionStatus, selectedTable, tableData, tableCount } = body;

    // Create transporter using environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.GOOGLE_SMTP_HOST,
      port: parseInt(process.env.GOOGLE_SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Prepare email content
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Format sample data for email
    let sampleDataText = '';
    if (tableData && tableData.length > 0) {
      const headers = Object.keys(tableData[0]);
      sampleDataText = `\n\nSample Data from ${selectedTable} table (showing first ${Math.min(5, tableData.length)} records):\n`;
      sampleDataText += headers.join(' | ') + '\n';
      sampleDataText += '-'.repeat(headers.join(' | ').length) + '\n';
      
      tableData.slice(0, 5).forEach(row => {
        sampleDataText += headers.map(header => row[header] || 'N/A').join(' | ') + '\n';
      });
      
      if (tableCount > 5) {
        sampleDataText += `\n... and ${tableCount - 5} more records in total.`;
      }
    }

    const emailSubject = `GoJob Database Test - ${connectionStatus === 'connected' ? 'SUCCESS' : 'FAILED'}`;
    const emailBody = `
GoJob Database Connection Test Report
=====================================

Test Timestamp: ${currentTime}
Connection Status: ${connectionStatus === 'connected' ? '✅ CONNECTED' : '❌ FAILED'}
Database URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}
Selected Table: ${selectedTable}
Total Records: ${tableCount !== null ? tableCount : 'N/A'}

${sampleDataText}

Test Details:
- Application: GoJob Portal System
- Environment: ${process.env.NODE_ENV || 'development'}
- Framework: Next.js with Supabase

This is an automated test email sent from the GoJob application's TestConnection feature.
    `;

    // Send email
    const mailOptions = {
      from: `"GoJob Portal" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: emailSubject,
      text: emailBody,
    };

    const info = await transporter.sendMail(mailOptions);

    return Response.json({
      success: true,
      message: 'Test email sent successfully!',
      messageId: info.messageId,
      recipient: process.env.RECEIVER_EMAIL
    });

  } catch (error) {
    console.error('Email sending failed:', error);
    
    return Response.json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    }, { status: 500 });
  }
}
