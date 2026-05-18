import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@example.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    // In development without email config, use ethereal (test email service)
    if (process.env.NODE_ENV === 'development' && !SMTP_USER) {
      logger.warn({
        type: 'EMAIL_CONFIG_WARNING',
        message: 'No SMTP credentials configured - emails will be logged only (not sent)'
      });
      return null;
    }

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    logger.info({
      type: 'EMAIL_SERVICE_INITIALIZED',
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
    });
  }
  
  return transporter;
};

/**
 * Send email verification
 *
 * Styling note: all critical button styles (background, color,
 * padding, border) are inlined directly on the <a> tag. Gmail —
 * especially the mobile clients — strips most rules from <head><style>,
 * which is what was making the previous CTA render as bright blue
 * background with default-blue underlined link text (invisible).
 * Inline + !important + table-based layout = bulletproof across
 * Gmail, Outlook, Apple Mail, ProtonMail, Yahoo.
 */
export const sendVerificationEmail = async (email: string, token: string, name: string) => {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Verify your email — MyBookClubs',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f1ea;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(60,40,20,0.06);">
          <!-- Brand strip -->
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#928470;">MyBookClubs</p>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding:8px 40px 0 40px;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#1a1612;font-weight:700;">Confirm your email</h1>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3d3830;">Hi ${name},</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#3d3830;">Click the button below to verify your email address and finish setting up your account.</p>
            </td>
          </tr>

          <!-- CTA button — table-based, all styles inline + !important so
               Gmail / Outlook can't strip them. -->
          <tr>
            <td style="padding:28px 40px 8px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" bgcolor="#1a1612" style="border-radius:10px;background-color:#1a1612;">
                    <a href="${verificationUrl}"
                       target="_blank"
                       style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none !important;border-radius:10px;background-color:#1a1612;mso-padding-alt:0;">
                      Verify email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:#6a6051;">Or open this link in your browser:</p>
              <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.5;color:#928470;">
                <a href="${verificationUrl}" style="color:#928470;text-decoration:underline;">${verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Meta info -->
          <tr>
            <td style="padding:28px 40px 32px 40px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6a6051;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #ede9e1;background-color:#faf7f1;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#928470;text-align:center;">Automated message from MyBookClubs. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Hi ${name},

Confirm your email to finish setting up your MyBookClubs account.

Verify here: ${verificationUrl}

This link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
  };

  return sendEmail(mailOptions, 'EMAIL_VERIFICATION');
};

/**
 * Send password reset email — same bulletproof inline-style template
 * as the verification mail, just with reset-specific copy.
 */
export const sendPasswordResetEmail = async (email: string, token: string, name: string) => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Reset your password — MyBookClubs',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f1ea;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(60,40,20,0.06);">
          <tr>
            <td style="padding:32px 40px 8px 40px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#928470;">MyBookClubs</p>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 40px 0 40px;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#1a1612;font-weight:700;">Reset your password</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 8px 40px;">
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3d3830;">Hi ${name},</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#3d3830;">We received a request to reset your password. Click the button below to choose a new one.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 8px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" bgcolor="#1a1612" style="border-radius:10px;background-color:#1a1612;">
                    <a href="${resetUrl}"
                       target="_blank"
                       style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none !important;border-radius:10px;background-color:#1a1612;mso-padding-alt:0;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:#6a6051;">Or open this link in your browser:</p>
              <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.5;color:#928470;">
                <a href="${resetUrl}" style="color:#928470;text-decoration:underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color:#fef7e7;border-left:3px solid #d4a015;border-radius:6px;">
                <tr>
                  <td style="padding:12px 14px;">
                    <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#7a5a08;">Security note</p>
                    <p style="margin:0;font-size:12px;line-height:1.55;color:#7a5a08;">This link expires in 1 hour and can be used once. If you didn't request a reset, you can ignore this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 32px 40px;"></td>
          </tr>

          <tr>
            <td style="padding:20px 40px;border-top:1px solid #ede9e1;background-color:#faf7f1;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#928470;text-align:center;">Automated message from MyBookClubs. Please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Hi ${name},

We received a request to reset your MyBookClubs password.

Reset here: ${resetUrl}

This link expires in 1 hour and can be used once. If you didn't request a reset, ignore this email.`,
  };

  return sendEmail(mailOptions, 'PASSWORD_RESET');
};

/**
 * Send email helper
 */
const sendEmail = async (mailOptions: nodemailer.SendMailOptions, type: string) => {
  const transport = getTransporter();
  
  // In development without email config, just log
  if (!transport) {
    logger.info({
      type: `${type}_EMAIL_LOGGED`,
      to: mailOptions.to,
      subject: mailOptions.subject,
      note: 'Email not sent - configure SMTP credentials to enable email delivery'
    });
    return { logged: true };
  }

  try {
    const info = await transport.sendMail(mailOptions);
    
    logger.info({
      type: `${type}_EMAIL_SENT`,
      to: mailOptions.to,
      messageId: info.messageId,
    });
    
    return info;
  } catch (error: any) {
    logger.error({
      type: `${type}_EMAIL_FAILED`,
      to: mailOptions.to,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async () => {
  const transport = getTransporter();
  
  if (!transport) {
    return { configured: false, verified: false };
  }

  try {
    await transport.verify();
    logger.info({ type: 'EMAIL_CONFIG_VERIFIED' });
    return { configured: true, verified: true };
  } catch (error: any) {
    logger.error({
      type: 'EMAIL_CONFIG_INVALID',
      error: error.message,
    });
    return { configured: true, verified: false, error: error.message };
  }
};
