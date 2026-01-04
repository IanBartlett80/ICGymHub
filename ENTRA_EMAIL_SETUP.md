# Email Configuration with Azure Entra ID (Recommended for MFA)

## Why Use Azure Entra ID?

Azure Entra ID (formerly Azure AD) with Microsoft Graph API is the **modern, secure method** for sending emails from Microsoft 365, especially when:
- Your account has Multi-Factor Authentication (MFA) enabled
- You want to avoid using App Passwords
- You need enterprise-grade security and auditing
- You're deploying to production

## Step-by-Step Setup Guide

### 1. Create an App Registration in Azure Portal

1. **Sign in to Azure Portal**: https://portal.azure.com
2. **Navigate to** Azure Active Directory (or Microsoft Entra ID)
3. **Go to** "App registrations" → "New registration"
4. **Fill in the details**:
   - **Name**: `ICGymHub Email Service` (or any descriptive name)
   - **Supported account types**: **"Accounts in this organizational directory only (Single tenant)"**
     - This is correct for service-to-service authentication
     - You're NOT doing user authentication, so single tenant is perfect
     - Most secure option - limits access to your organization only
   - **Redirect URI**: Leave blank (not needed for client credentials flow)
5. **Click** "Register"

### 2. Note Your Application Details

After registration, you'll see the Overview page. **Copy these values** (you'll need them later):

- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 3. Create a Client Secret

1. In your app registration, go to **"Certificates & secrets"**
2. Click **"New client secret"**
3. **Description**: `ICGymHub Email Secret`
4. **Expires**: Choose duration (recommended: 24 months)
5. Click **"Add"**
6. **IMPORTANT**: Copy the **Value** immediately (you can't see it again!)
   - This is your `AZURE_CLIENT_SECRET`

### 4. Configure API Permissions

1. Go to **"API permissions"** in your app registration
2. Click **"Add a permission"**
3. Select **"Microsoft Graph"**
4. Choose **"Application permissions"** (NOT "Delegated permissions")
   - **Application permissions** = Service-to-service (no user login needed) ✅
   - **Delegated permissions** = Requires user sign-in (NOT what you want) ❌
5. Search for and select:
   - ✅ **Mail.Send** - "Send mail as any user"
6. Click **"Add permissions"**
7. **IMPORTANT**: Click **"Grant admin consent for [Your Organization]"**
   - You need Global Administrator or Application Administrator role
   - The status should show a green checkmark ✅

### 5. Configure Environment Variables

Update your `.env.local` file with the values you copied:

```bash
# Email Configuration - Azure Entra ID (Microsoft Graph API)
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your-secret-value-from-step-3
AZURE_SENDER_EMAIL=your-email@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important Notes:**
- `AZURE_SENDER_EMAIL` must be a valid mailbox in your Microsoft 365 tenant
- This email address will be used as the "From" address for all emails
- The mailbox must exist and be active (can be a shared mailbox)

### 6. Restart Your Dev Server

```bash
# Kill existing process
pkill -f "next dev"

# Start fresh
npm run dev
```

### 7. Test Your Configuration

#### Option A: Using the API Endpoint
```bash
curl http://localhost:3000/api/test-email
```

**Success Response:**
```json
{
  "success": true,
  "message": "SMTP connection successful! Email configuration is working.",
  "provider": "graph"
}
```

#### Option B: Register a Test Club
1. Go to http://localhost:3000/register
2. Use a real email address from your domain
3. Complete the registration form
4. Check your inbox for the verification email

### 8. Verify It's Working

Check your terminal output. You should see:
```
✅ Microsoft Graph API connection verified successfully
✅ Verification email sent via Microsoft Graph to user@domain.com
```

## Troubleshooting

### Error: "Insufficient privileges to complete the operation"

**Problem**: The app doesn't have admin consent for Mail.Send permission.

**Solution**:
1. Go to App Registration → API permissions
2. Click "Grant admin consent for [Your Organization]"
3. You need Global Admin or Application Admin role
4. Ensure the status shows a green checkmark

### Error: "The tenant for tenant guid [GUID] does not exist"

**Problem**: Incorrect Tenant ID.

**Solution**:
1. Verify your `AZURE_TENANT_ID` in .env.local
2. Check Azure Portal → Azure Active Directory → Overview → Tenant ID
3. Ensure no extra spaces or quotes in the .env file

### Error: "AADSTS7000215: Invalid client secret provided"

**Problem**: Incorrect or expired client secret.

**Solution**:
1. Go to App Registration → Certificates & secrets
2. Create a new client secret
3. Update `AZURE_CLIENT_SECRET` in .env.local
4. Restart dev server

### Error: "Sender email not configured"

**Problem**: `AZURE_SENDER_EMAIL` is not set or mailbox doesn't exist.

**Solution**:
1. Set `AZURE_SENDER_EMAIL` in .env.local
2. Verify the mailbox exists in Microsoft 365 Admin Center
3. Use the full email address (e.g., noreply@yourdomain.com)

### Emails not arriving

**Checks**:
1. **Check Spam/Junk folder** in recipient's mailbox
2. **Verify sender mailbox**: Ensure `AZURE_SENDER_EMAIL` mailbox exists and is active
3. **Check Exchange Online Protection**: Emails might be blocked by security policies
4. **Enable audit logging**: Check Message Trace in Exchange Admin Center
5. **Console logs**: Look for error messages in your terminal

## Permission Levels Explained

### Mail.Send (Application Permission)
- **Type**: Application permission
- **What it does**: Allows the app to send email as ANY user without a signed-in user
- **Use case**: Background services, automated emails
- **Requires**: Admin consent
- **Security**: High - app can impersonate any user

### Alternative: Mail.Send (Delegated Permission)
- **Type**: Delegated permission
- **What it does**: Send email as the signed-in user only
- **Use case**: User-interactive scenarios
- **Requires**: User consent
- **Security**: Lower - limited to signed-in user

For this application, we use **Application permission** because we're sending system emails without user interaction.

## Security Best Practices

### 1. Rotate Client Secrets Regularly
- Set secret expiration to 12-24 months maximum
- Create calendar reminder to rotate before expiry
- Consider using Azure Key Vault in production

### 2. Use Least Privilege
- Only grant Mail.Send permission (nothing more)
- Don't use Global Admin account for sending emails
- Consider creating a dedicated service account

### 3. Monitor Usage
- Enable Azure AD audit logs
- Review Message Trace in Exchange Admin Center
- Set up alerts for unusual sending patterns

### 4. Protect Credentials
- Never commit .env files to Git
- Use environment variables in production
- Consider Azure Key Vault for secret storage
- Rotate secrets if compromised

### 5. Sender Email Best Practices
- Use a dedicated sending address (e.g., noreply@domain.com)
- Don't use personal email accounts
- Consider creating a shared mailbox
- Set up SPF, DKIM, and DMARC records for your domain

## Production Deployment

### Environment Variables for Production

```bash
# Production environment
AZURE_TENANT_ID=your-production-tenant-id
AZURE_CLIENT_ID=your-production-client-id
AZURE_CLIENT_SECRET=your-production-secret
AZURE_SENDER_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Deployment Checklist

- [ ] Create separate App Registration for production
- [ ] Use different client secret for production
- [ ] Store secrets in secure vault (Azure Key Vault, AWS Secrets Manager)
- [ ] Configure proper SPF/DKIM/DMARC records
- [ ] Set up monitoring and alerts
- [ ] Test email delivery to various providers (Gmail, Outlook, etc.)
- [ ] Document client secret expiration date
- [ ] Set calendar reminder for secret rotation

## Switching Between Entra ID and SMTP

The application automatically detects which method to use:

- **If Entra credentials are present** → Uses Microsoft Graph API
- **If only SMTP credentials are present** → Uses SMTP

To switch from Entra to SMTP:
1. Remove or comment out the `AZURE_*` variables
2. Configure `SMTP_*` variables instead
3. Restart the server

## Microsoft Graph API Limits

Be aware of Microsoft Graph API throttling limits:

- **Per-app per-tenant**: 10,000 requests per 10 seconds
- **Per mailbox**: 10,000 messages per day (Office 365)
- **Burst limit**: 30 messages per minute per mailbox

For high-volume scenarios, consider:
- Implementing retry logic with exponential backoff
- Using a queue system (Azure Queue, RabbitMQ)
- Monitoring throttling responses (HTTP 429)

## Additional Resources

- [Microsoft Graph Mail API Documentation](https://learn.microsoft.com/en-us/graph/api/user-sendmail)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph Permissions Reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Message Trace in Exchange Admin Center](https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify all permissions are granted with admin consent
4. Test with the `/api/test-email` endpoint first
5. Check Microsoft 365 Message Trace for delivery status
