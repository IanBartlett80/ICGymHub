# Quick Start: Azure Entra Email Setup

## TL;DR - 5 Minute Setup

### 1. Create App in Azure Portal
https://portal.azure.com → Entra ID → App registrations → New registration

### 2. Get These 3 Values
- **Tenant ID**: Overview page
- **Client ID**: Overview page  
- **Client Secret**: Certificates & secrets → New secret → Copy value

### 3. Add Permission
API permissions → Add → Microsoft Graph → Application → Mail.Send → Grant admin consent

### 4. Update .env.local
```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
AZURE_SENDER_EMAIL=your-email@domain.com
```

### 5. Test
```bash
curl http://localhost:3000/api/test-email
```

## Full Documentation
See [ENTRA_EMAIL_SETUP.md](ENTRA_EMAIL_SETUP.md) for complete guide.
