# ICGymHub - Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### Code & Configuration Ready
- [x] Schema.prisma updated to PostgreSQL
- [x] Critical syntax errors fixed
- [x] .gitignore properly configured
- [ ] All TypeScript errors reviewed (warnings ok, syntax errors fixed)
- [ ] Local build test completed successfully

### Environment Variables Prepared
- [ ] JWT_SECRET generated (32+ characters)
- [ ] NEXTAUTH_SECRET generated (32+ characters)
- [ ] Azure/Entra credentials ready (if using email)
- [ ] Email configuration ready

---

## 🚀 Digital Ocean Deployment Steps

### Phase 1: Create PostgreSQL Database (10 minutes)

1. **Navigate to Digital Ocean**
   - Go to https://cloud.digitalocean.com
   - Login with your account

2. **Create Database**
   - Click **Create** → **Databases**
   - Select **PostgreSQL** (version 15 or 16)
   - Choose datacenter region: **Sydney** (or closest to users)
   - Select plan:
     - **Development**: Basic - $15/month (1GB RAM, 10GB storage)
     - **Production**: Professional - $45/month (4GB RAM, 38GB storage)
   - Database cluster name: `icgymhub-db`
   - Click **Create Database Cluster**

3. **Wait for Provisioning** (2-5 minutes)
   - Status will change from "Creating" to "Available"

4. **Configure Database Security**
   - Go to **Settings** → **Trusted Sources**
   - Add **All Digital Ocean Resources** (temporary, will restrict later)
   - Click **Save**

5. **Get Connection String**
   - Go to **Connection Details**
   - Connection mode: **Connection String**
   - Copy the connection string
   - Should look like: `postgresql://user:password@host:port/defaultdb?sslmode=require`

6. **Create Production Database**
   - Go to **Users & Databases** tab
   - Click **Add Database**
   - Database name: `icgymhub_production`
   - Click **Save**

7. **Update Connection String**
   - Replace `defaultdb` with `icgymhub_production` in your connection string
   - Final format: `postgresql://user:password@host:port/icgymhub_production?sslmode=require`
   - **Save this securely** - you'll need it soon

---

### Phase 2: Create App Platform Application (15 minutes)

1. **Navigate to App Platform**
   - In Digital Ocean dashboard
   - Click **Create** → **Apps**

2. **Connect GitHub Repository**
   - Source: **GitHub**
   - Authorize Digital Ocean (if first time)
   - Select Repository: `IanBartlett80/ICGymHub`
   - Branch: `main`
   - Source Directory: `/` (root)
   - **Enable Autodeploy**: ✓ (deploys on push)
   - Click **Next**

3. **Configure Web Service**
   - App type: **Web Service** (should auto-detect)
   - Name: `gymhub-web`
   - Environment: **Node.js**
   - Build Command: `npx prisma generate && npm run build`
   - Run Command: `npm run start`
   - HTTP Port: `3000`
   - HTTP Request Routes: `/`
   - Instance Size:
     - **Development**: Basic ($5/month)
     - **Production**: Professional ($12/month)
   - Instance Count: 1 (start with 1, scale later)

4. **Configure Environment Variables**
   Click **Environment Variables** → **Edit** and add:

   ```env
   # Database (will link in next step)
   DATABASE_URL=${icgymhub-db.DATABASE_URL}
   
   # Application
   NODE_ENV=production
   
   # Authentication - GENERATE THESE NOW!
   JWT_SECRET=YOUR_GENERATED_32_CHAR_SECRET
   NEXTAUTH_SECRET=YOUR_GENERATED_32_CHAR_SECRET
   NEXTAUTH_URL=${APP_URL}
   
   # Email (Azure/Entra)
   AZURE_CLIENT_ID=your-azure-client-id
   AZURE_CLIENT_SECRET=your-azure-client-secret
   AZURE_TENANT_ID=your-azure-tenant-id
   EMAIL_FROM=noreply@yourdomain.com
   ```

   **To Generate Secrets:**
   Open terminal and run:
   ```bash
   # Generate JWT_SECRET
   openssl rand -base64 32
   
   # Generate NEXTAUTH_SECRET  
   openssl rand -base64 32
   ```

5. **Link Database to App**
   - For `DATABASE_URL`, click the variable
   - Click **Edit**
   - Select **Reference** from dropdown
   - Choose your database: `icgymhub-db`
   - Select: `DATABASE_URL`
   - Click **Save**

6. **Configure App Info**
   - App name: `icgymhub`
   - Region: **Same as database** (important!)
   - Click **Next**

7. **Review & Create**
   - Review all settings
   - Estimated cost: ~$20/month (dev) or ~$60/month (production)
   - Click **Create Resources**

---

### Phase 3: First Deployment & Database Setup (10 minutes)

1. **Monitor Initial Deployment**
   - Go to your app → **Activity** tab
   - Watch the build progress
   - First deployment: 5-10 minutes
   - Check build logs if errors occur

2. **Wait for "Deployed" Status**
   - Status will change from "Building" → "Deploying" → "Deployed"
   - You'll get a live URL: `https://icgymhub-xxxxx.ondigitalocean.app`

3. **Open App Console**
   - Go to **Console** tab
   - Click **Launch Console**
   - Wait for connection (15-30 seconds)

4. **Run Database Migrations**
   In the console, run:
   ```bash
   # Deploy all migrations
   npx prisma migrate deploy
   
   # Seed initial data
   node prisma/seed.js
   ```

   Expected output:
   - Migrations: Shows list of applied migrations
   - Seed: Creates initial club, admin user, etc.

5. **Verify Database**
   - Go back to your database in Digital Ocean
   - Click **Users & Databases**
   - You should see tables created in `icgymhub_production`

---

### Phase 4: Testing & Verification (15 minutes)

1. **Access Your Application**
   - Open: `https://icgymhub-xxxxx.ondigitalocean.app`
   - Should see the ICGymHub login page
   - SSL certificate should be valid (green lock)

2. **Test Registration**
   - Try creating a new account
   - Check email verification works
   - Verify you can login

3. **Test Core Features**
   - [ ] Login/Logout works
   - [ ] Dashboard loads
   - [ ] Navigation works
   - [ ] Database operations work (create/read/update/delete)
   - [ ] Email notifications work

4. **Check Application Logs**
   - Go to your app → **Runtime Logs**
   - Look for any errors or warnings
   - Should see successful startup messages

5. **Monitor Performance**
   - Go to **Insights** tab
   - Check CPU and Memory usage
   - Should be normal during light testing

---

### Phase 5: Production Hardening (10 minutes)

1. **Restrict Database Access**
   - Go to database → **Settings** → **Trusted Sources**
   - Remove "All Digital Ocean Resources"
   - Add only your app's VPC network
   - Or add your app's specific IP

2. **Enable Database Backups**
   - Go to database → **Settings** → **Backups**
   - Verify **Daily Backups** enabled (should be default)
   - Set backup time to low-traffic hours (e.g., 3 AM)

3. **Configure Alerts**
   - Go to your app → **Settings** → **Alerts**
   - Enable alerts for:
     - Deployment failures
     - High CPU usage (>80%)
     - High memory usage (>80%)
     - App crashes

4. **Set Up Health Checks** (Optional)
   - Go to app → **Settings** → **Health Checks**
   - HTTP endpoint: `/api/health` (if you have one)
   - Or use root path: `/`

5. **Review Security**
   - [ ] No secrets in code
   - [ ] All env vars configured
   - [ ] Database access restricted
   - [ ] SSL/HTTPS enabled
   - [ ] .env files not committed to git

---

### Phase 6: Custom Domain Setup (Optional - 10 minutes)

1. **Add Domain in Digital Ocean**
   - Go to your app → **Settings** → **Domains**
   - Click **Add Domain**
   - Enter: `app.yourdomain.com` or `yourdomain.com`
   - Click **Add Domain**

2. **Configure DNS**
   - Go to your DNS provider (e.g., Namecheap, GoDaddy, Cloudflare)
   - Add CNAME record:
     ```
     Type: CNAME
     Name: app (or @ for root domain)
     Value: icgymhub-xxxxx.ondigitalocean.app
     TTL: 3600
     ```
   - Save DNS settings

3. **Wait for SSL**
   - Digital Ocean auto-provisions Let's Encrypt SSL
   - Takes 5-15 minutes
   - Status will show "Certificate Pending" → "Active"

4. **Update Environment Variables**
   - Go to app → **Settings** → **Environment**
   - Update `NEXTAUTH_URL` to your custom domain:
     ```
     NEXTAUTH_URL=https://app.yourdomain.com
     ```
   - Save and redeploy

---

## 📊 Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor application logs every 2-4 hours
- [ ] Check error rates in Insights
- [ ] Verify backups are running
- [ ] Test all critical user flows

### First Week
- [ ] Review performance metrics daily
- [ ] Monitor database size growth
- [ ] Check for any unusual errors
- [ ] Verify email notifications working

### Ongoing
- [ ] Weekly review of logs and metrics
- [ ] Monthly security audit
- [ ] Quarterly load testing
- [ ] Database backup restoration test (quarterly)

---

## 🔄 Ongoing Deployments

### Automatic Deployments
Every push to `main` branch will:
1. Trigger build automatically
2. Run Prisma generate
3. Build Next.js app
4. Deploy if successful
5. Send notification

### Manual Deployment
If needed:
1. Go to your app in Digital Ocean
2. Click **Actions** → **Force Rebuild and Deploy**
3. Confirm

### Database Migrations
When you create new migrations:

1. **Create locally:**
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add migration: your_migration_name"
   git push origin main
   ```

3. **After deployment, run migration:**
   - Open app Console
   - Run: `npx prisma migrate deploy`

**OR** add to build command (risky!):
```
npx prisma generate && npx prisma migrate deploy && npm run build
```

---

## 💰 Cost Summary

### Development/Testing
| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PostgreSQL | Dev DB (1GB) | $15 |
| App Platform | Basic (512MB) | $5 |
| **Total** | | **$20** |

### Production
| Service | Plan | Monthly Cost |
|---------|------|--------------|
| PostgreSQL | Professional (4GB) | $45 |
| App Platform | Professional (1GB) | $12 |
| **Total** | | **$57** |

### Scaling Options
- Add more app instances: +$12/each
- Upgrade database: $90-$240/month
- Add CDN: ~$5-20/month
- Add monitoring (Sentry): $26-$80/month

---

## 🆘 Troubleshooting Guide

### Build Fails

**Symptoms:** Deployment fails during build phase

**Check:**
1. Go to app → **Activity** → View failed deployment
2. Read build logs

**Common Causes:**
- Missing environment variables
- TypeScript errors
- Dependency issues
- Prisma generation failure

**Solutions:**
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Regenerate Prisma client
npx prisma generate
```

---

### Database Connection Fails

**Symptoms:** App crashes on startup, can't connect to database

**Check:**
1. Runtime logs show "Failed to connect to database"
2. DATABASE_URL is set correctly

**Solutions:**
1. Verify DATABASE_URL format:
   - Must include `?sslmode=require`
   - Must reference correct database name
   - Check username/password are correct

2. Check trusted sources:
   - Database allows app's VPC or IP
   - Both in same region

3. Test connection in console:
   ```bash
   npx prisma db execute --stdin <<< "SELECT 1;"
   ```

---

### App Won't Start

**Symptoms:** Build succeeds but app won't start

**Check:**
1. Runtime logs in Activity tab
2. Environment variables

**Solutions:**
1. Verify run command: `npm run start`
2. Verify HTTP port: `3000`
3. Check for startup errors in logs
4. Verify all required env vars are set

---

### Email Not Sending

**Symptoms:** Email verification/notifications not working

**Check:**
1. Runtime logs for email errors
2. Azure/Entra credentials

**Solutions:**
1. Verify all email env vars set:
   - AZURE_CLIENT_ID
   - AZURE_CLIENT_SECRET
   - AZURE_TENANT_ID
   - EMAIL_FROM

2. Test Azure credentials locally first

3. Check Azure app permissions:
   - Mail.Send
   - User.Read

---

## 🔙 Rollback Procedure

If something goes wrong:

### Rollback Application
1. Go to app → **Deployments**
2. Find last working deployment
3. Click **...** → **Redeploy**
4. Confirm

### Rollback Database
**⚠️ CAREFUL - Can cause data loss!**

1. Go to database → **Backups**
2. Select backup point
3. Click **Restore**
4. **This will overwrite current data!**

**Better approach:**
- Restore to new database
- Switch connection string
- Verify data
- Then delete old database

---

## 📋 Quick Command Reference

```bash
# Generate secrets
openssl rand -base64 32

# Run migrations
npx prisma migrate deploy

# Seed database
node prisma/seed.js

# Check database connection
npx prisma db execute --stdin <<< "SELECT 1;"

# View logs (if using doctl)
doctl apps logs <app-id>

# Force deployment (if using doctl)
doctl apps create-deployment <app-id> --force-rebuild
```

---

## ✅ Final Checklist

Before declaring deployment complete:

- [ ] App is accessible at production URL
- [ ] SSL certificate is active (green lock)
- [ ] User registration works
- [ ] Email verification works
- [ ] Login/logout works
- [ ] Database operations work
- [ ] All environment variables set
- [ ] Database backups enabled
- [ ] Alerts configured
- [ ] Monitoring in place
- [ ] Database access restricted
- [ ] Custom domain configured (if applicable)
- [ ] Team has access credentials
- [ ] Documentation updated
- [ ] Rollback procedure tested

---

## 📞 Support Resources

- **Digital Ocean Docs**: https://docs.digitalocean.com/products/app-platform/
- **Digital Ocean Community**: https://www.digitalocean.com/community
- **Prisma PostgreSQL**: https://www.prisma.io/docs/concepts/database-connectors/postgresql
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Digital Ocean Support**: Available in dashboard (paid plans)

---

**Deployment Prepared:** March 2, 2026  
**Last Updated:** March 2, 2026  
**Prepared By:** GitHub Copilot

---

## 🎯 Next Steps After Deployment

1. **Set up monitoring** (Sentry, LogRocket, etc.)
2. **Configure CDN** for static assets
3. **Implement CI/CD** with GitHub Actions
4. **Set up staging environment**
5. **Plan scaling strategy**
6. **Schedule security audit**
7. **Document incident response procedure**

Good luck with your deployment! 🚀
