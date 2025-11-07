import nodemailer from 'nodemailer';
import { emailConfig, config } from '../config';

export interface VerificationEmailPayload {
  to: string;
  token: string;
}

const transporter = nodemailer.createTransport({
  host: emailConfig.smtp.host,
  port: emailConfig.smtp.port,
  secure: emailConfig.smtp.port === 465,
  auth: emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass ? {
    user: emailConfig.smtp.auth.user as string,
    pass: emailConfig.smtp.auth.pass as string,
  } : undefined,
});

export const sendVerificationEmail = async ({ to, token }: VerificationEmailPayload): Promise<void> => {
  // Construct verification link to backend API
  const backendVerifyUrl = `${config.backendUrl.replace(/\/$/, '')}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;

  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Verify your email</h2>
      <p>Thanks for registering. Please verify your email to activate your account.</p>
      <p><a href="${backendVerifyUrl}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><code>${backendVerifyUrl}</code></p>
    </div>
  `;

  const mailOptions = {
    from: emailConfig.from,
    to,
    subject: 'Verify your email address',
    html,
  };

  // If SMTP credentials are missing in development, skip actual send
  if (config.nodeEnv !== 'production' && (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass)) {
    console.log('DEV: Skipping email send. Verification link:', backendVerifyUrl);
    return;
  }

  await transporter.sendMail(mailOptions);
};