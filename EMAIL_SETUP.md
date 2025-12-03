# Email Configuration Guide

To enable email invitations, you need to configure email settings in your `.env.local` file.

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification
   - Enable it if not already enabled

2. **Generate an App Password**
   - Go to Google Account → Security
   - Under "2-Step Verification", click "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Enter "Tech Academy" as the name
   - Click "Generate"
   - Copy the 16-character password

3. **Update .env.local**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

4. **Restart the Development Server**
   ```bash
   # Stop the current server (Ctrl+C) and restart
   npm run dev
   ```

## Alternative Email Providers

If you're using a different email provider, you may need to update the email configuration in `lib/email.ts`:

- **Outlook/Hotmail**: Use `service: 'hotmail'`
- **Yahoo**: Use `service: 'yahoo'`
- **Custom SMTP**: Configure with `host`, `port`, `secure`, etc.

## Testing Email

After configuration:
1. Invite a new user through the admin dashboard
2. Check if the email is sent successfully
3. If email fails, the password will still be displayed in the UI for manual sharing

## Troubleshooting

- **"Email not configured"**: Make sure EMAIL_USER and EMAIL_PASS are set in .env.local
- **"Invalid login"**: Verify your app password is correct (not your regular Gmail password)
- **"Connection timeout"**: Check your internet connection and firewall settings

