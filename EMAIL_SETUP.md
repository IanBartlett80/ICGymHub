# Email Configuration Guide - Microsoft 365

## Setting Up SMTP for Email Verification

This application uses Microsoft 365 (Outlook) SMTP to send email verifications. Follow these steps to configure it:

### 1. Get Your Microsoft 365 Credentials

You'll need:
- Your Microsoft 365 email address (e.g., `admin@yourdomain.com`)
- An **App Password** (recommended) or your account password

### 2. Create an App Password (Recommended)

For better security, use an App Password instead of your main account password:

1. Sign in to your Microsoft account at https://account.microsoft.com/security
2. Under **Security info**, select **Add sign-in method**
3. Choose **App password** and follow the prompts
4. Copy the generated password - you'll use this as `SMTP_PASS`

**Note:** If you don't see the App Password option, your organization may require you to use your regular password or have Multi-Factor Authentication (MFA) enabled differently.

### 3. Configure Environment Variables

Update your `.env.local` file with your Microsoft 365 credentials:

```bash
# Email Configuration (Microsoft 365 / Outlook SMTP)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-app-password-here
SMTP_FROM_EMAIL=your-email@yourdomain.com
SMTP_FROM_NAME=ICGymHub
```

Replace:
- `your-email@yourdomain.com` - Your Microsoft 365 email address
- `your-app-password-here` - Your App Password or account password

### 4. Test Your Configuration

After updating `.env.local`, restart your development server and test the SMTP connection:

```bash
# Restart the dev server
# Then visit:
http://localhost:3000/api/test-email
```

You should see:
```json
{
  "success": true,
  "message": "SMTP connection successful! Email configuration is working."
}
```

### 5. Verify Email Workflow

1. **Register a new club** at http://localhost:3000/register
   - Use a real email address that matches your domain
   - You'll receive a verification email

2. **Check your inbox** for the verification email
   - Subject: "Verify Your Email - [Your Club Name]"
   - Click the verification link

3. **Your club status** will change from `PENDING_VERIFICATION` to `ACTIVE`

### Troubleshooting

#### Error: "Authentication failed"
- Double-check your email and password
- Ensure you're using an App Password if MFA is enabled
- Verify your account has permission to send SMTP emails

#### Error: "Connection timeout"
- Check your firewall settings
- Ensure port 587 is open
- Try port 25 if 587 doesn't work (update `SMTP_PORT=25`)

#### Emails not sending
- Check the terminal/console for error messages
- Verify `.env.local` file has been saved
- Restart the dev server after changing environment variables

#### Error: "SMTP configuration is incomplete"
- Ensure all SMTP variables are set in `.env.local`
- No quotes needed around values
- Restart dev server after changes

### Microsoft 365 SMTP Limits

Be aware of Microsoft 365 sending limits:
- **30 messages per minute**
- **10,000 messages per day** (varies by plan)

For production, consider implementing:
- Email queuing
- Rate limiting
- Retry logic

### Production Deployment

The same configuration works in production. Update your production environment variables with:
- Your production domain in `NEXT_PUBLIC_APP_URL`
- Same Microsoft 365 SMTP credentials
- Consider using a dedicated sending account (e.g., `noreply@yourdomain.com`)

### Alternative: Gmail SMTP

If you prefer Gmail:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

You must enable 2FA and create an App Password: https://myaccount.google.com/apppasswords
