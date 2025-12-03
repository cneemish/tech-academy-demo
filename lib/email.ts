import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendInviteEmail(
  email: string,
  firstName: string,
  password: string
): Promise<void> {
  if (!transporter) {
    console.warn('Email not configured. User credentials:', { email, password });
    console.warn('Please configure EMAIL_USER and EMAIL_PASS in .env.local to send emails');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@techacademy.com',
    to: email,
    subject: 'Welcome to Tech Academy - Your Account Details',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Welcome to Tech Academy!</h2>
        <p>Hello ${firstName},</p>
        <p>You have been invited to join Tech Academy. Your account has been created with the following credentials:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p>Please log in using these credentials and change your password after your first login.</p>
        <p style="color: #ef4444; font-weight: bold;">Keep this password secure and do not share it with anyone.</p>
        <p>Best regards,<br>Tech Academy Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send invitation email');
  }
}

