const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter if configuration is present.
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT || 465;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Sends a password reset OTP verification code email.
 * Gracefully falls back to console logging if SMTP settings are missing or if sending fails.
 */
const sendResetOtpEmail = async (email, otpCode) => {
  const from = process.env.SMTP_FROM || process.env.EMAIL_USER || 'noreply@precastcrm.com';
  const toEmail = process.env.EMAIL_RECEIVER || email;
  const transporter = getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n----------------- [MAIL SIMULATION] -----------------');
      console.log(`To: ${toEmail}`);
      console.log(`Subject: Password Reset Verification OTP Code`);
      console.log(`Message: Your password reset verification OTP is ${otpCode}.`);
      console.log(`Expiry: 10 minutes`);
      console.log('Reason: SMTP credentials not fully configured in environment.');
      console.log('-----------------------------------------------------\n');
    }
    return;
  }

  const mailOptions = {
    from,
    to: toEmail,
    subject: 'Password Reset Verification OTP Code - Precast CRM',
    text: `Hello,\n\nYou requested a password reset. Your verification OTP is: ${otpCode}\n\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.\n`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .email-container {
            max-width: 580px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          .email-header {
            background: linear-gradient(135deg, #0a7b84 0%, #0056b3 100%);
            padding: 32px 24px;
            text-align: center;
          }
          .email-header h1 {
            color: #ffffff;
            font-size: 22px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .email-body {
            padding: 40px 32px;
          }
          .email-body p {
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 20px 0;
            color: #475569;
          }
          .otp-card {
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-label {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #64748b;
            margin-bottom: 8px;
          }
          .otp-code {
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
            font-size: 32px;
            font-weight: 700;
            color: #0a7b84;
            letter-spacing: 4px;
            display: inline-block;
            padding: 4px 12px;
          }
          .warning-banner {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .warning-text {
            font-size: 13px;
            color: #b45309;
            line-height: 1.5;
            margin: 0;
          }
          .email-footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 24px 32px;
            text-align: center;
          }
          .email-footer p {
            font-size: 12px;
            color: #94a3b8;
            margin: 0 0 8px 0;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Gir Precast CRM</h1>
          </div>
          <div class="email-body">
            <p>Hello,</p>
            <p>A password reset request was received for your account. Please use the following One-Time Password (OTP) code to verify your identity and finalize your password reset:</p>
            
            <div class="otp-card">
              <div class="otp-label">Verification OTP Code</div>
              <div class="otp-code">${otpCode}</div>
            </div>

            <div class="warning-banner">
              <p class="warning-text">
                ⚠️ This verification code is only valid for <strong>10 minutes</strong>. If you did not request a password reset, please secure your account settings and ignore this email.
              </p>
            </div>
            
            <p style="margin-bottom: 0;">Regards,<br><strong>Gir Precast Security Team</strong></p>
          </div>
          <div class="email-footer">
            <p>© ${new Date().getFullYear()} Gir Precast CRM. All rights reserved.</p>
            <p>This is an automated system notification. Please do not reply directly to this mail box.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Mail Service] Password reset OTP sent successfully to ${toEmail}`);
    }
  } catch (error) {
    console.error(`[Mail Service] Failed to send email to ${toEmail}:`, error);
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n----------------- [MAIL FALLBACK] -----------------');
      console.log(`To: ${toEmail}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log('---------------------------------------------------\n');
    }
  }
};

module.exports = {
  sendResetOtpEmail,
};
