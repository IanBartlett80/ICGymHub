# ICGymHub - Digital Ocean Deployment Guide

This guide walks through deploying ICGymHub to production on Digital Ocean with a managed PostgreSQL database.

## Prerequisites

- Digital Ocean account (linked to your GitHub account)
- GitHub repository with your code (IanBartlett80/ICGymHub)
- Domain name (optional, but recommended for production)

---

## Part 1: Prepare Your Application for Production

### Step 1: Confirm Database Configuration

ICGymHub runs on PostgreSQL in production.

**1.1 Ensure `prisma/schema.prisma` datasource is:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**1.2 Install PostgreSQL Prisma dependency:**
```bash
npm install @prisma/client
npx prisma generate
```

### Step 2: Create Production Environment Variables File

Create a `.env.production` file (don't commit this):
```env
# Database
DATABASE_URL="postgresql://doadmin:<DIGITALOCEAN_DB_PASSWORD>@icgymhub-db-do-user-25561005-0.m.db.ondigitalocean.com:25060/icgymhub_production?sslmode=require"

# Auth
JWT_SECRET="your-production-jwt-secret-min-32-chars"
NEXTAUTH_SECRET="your-production-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"

# Email (if using Azure/Entra)
AZURE_CLIENT_ID="your-azure-client-id"
AZURE_CLIENT_SECRET="your-azure-client-secret"
AZURE_TENANT_ID="your-azure-tenant-id"
EMAIL_FROM="noreply@yourdomain.com"

# App
NODE_ENV="production"
```

### Step 3: Update package.json Scripts

Your scripts already look good. Ensure you have:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "prisma:generate": "prisma generate",
    "db:setup": "prisma migrate deploy && node prisma/seed.js"
  }
}
```

### Step 4: Create Production Build Configuration

Create or update `next.config.js` to ensure it's production-ready:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Optimizes for containerized deployments
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
}

module.exports = nextConfig
```

---

## Part 2: Set Up Digital Ocean Infrastructure

### Step 1: Create a PostgreSQL Database

1. **Log into Digital Ocean**
   - Go to https://cloud.digitalocean.com

2. **Create a Managed Database**
   - Click **Create** → **Databases**
   - Choose **PostgreSQL**
   - Select version: **PostgreSQL 15** or **16** (latest stable)
   - Choose datacenter region: (closest to your users, e.g., Sydney for Australia)
   - Choose cluster configuration:
     - **Development**: Basic node - $15/month (1GB RAM, 1 vCPU, 10GB storage)
     - **Production**: Higher tier based on needs
   - Name your database: `icgymhub-db`
   - Click **Create Database Cluster**

3. **Wait for Database Creation** (2-5 minutes)

4. **Get Connection Details**
   - Once created, click on your database cluster
   - Go to **Connection Details** tab
   - Note down:
     - Host
     - Port
     - Username
     - Password
     - Database name
     - Connection String (select "Connection String" mode)

5. **Add Trusted Sources**
   - In the database dashboard, go to **Settings** → **Trusted Sources**
   - Add "All Digital Ocean Resources" (we'll restrict this later)
   - Or add your App Platform region

6. **Create Production Database**
   - Click **Users & Databases** tab
   - Click **Add Database**
   - Create database: `icgymhub_production`

Your connection string will look like:
```
postgresql://username:password@host:port/icgymhub_production?sslmode=require
```

### Step 2: Create App Platform Application

1. **Go to App Platform**
   - Click **Create** → **Apps**

2. **Connect GitHub Repository**
   - Choose **GitHub**
   - Authorize Digital Ocean to access your GitHub
   - Select repository: `IanBartlett80/ICGymHub`
   - Select branch: `main`
   - Enable **Autodeploy** (deploys automatically on git push)

3. **Configure Your App**
   - **App Type**: Web Service
   - **Detected**: Should auto-detect Next.js
   
4. **Edit Build Settings**
   - Build Command: `npm run build`
   - Run Command: `npm run start`
   - HTTP Port: `3000` (Next.js default)
   - Environment: Node.js
   - Instance Size: 
     - **Development**: Basic ($5/month)
     - **Production**: Professional ($12/month or higher)

5. **Configure Environment Variables**
   Click **Environment Variables** and add:
   
   ```
   DATABASE_URL={icgymhub-db.DATABASE_URL}
   NODE_ENV=production
   JWT_SECRET=<generate-random-32-char-string>
   NEXTAUTH_SECRET=<generate-random-32-char-string>
   NEXTAUTH_URL=${APP_URL}
   AZURE_CLIENT_ID=<your-azure-client-id>
   AZURE_CLIENT_SECRET=<your-azure-client-secret>
   AZURE_TENANT_ID=<your-azure-tenant-id>
   EMAIL_FROM=<your-email>
   ```

   **To link the database:**
   - For `DATABASE_URL`, click the dropdown and select your database
   - Digital Ocean will automatically inject the connection string

6. **Add Build Time Environment Variables**
   - Under "Build Phase" section, add:
   ```
   DATABASE_URL=${icgymhub-db.DATABASE_URL}
   ```

7. **Configure Build Settings**
   - Add to "Build Command":
   ```
   npx prisma generate && npm run build
   ```

8. **Choose a Name**
   - App Name: `icgymhub` (This will give you icgymhub-xxxxx.ondigitalocean.app)

9. **Review and Create**
   - Review your settings
   - Click **Create Resources**

---

## Part 3: Deploy and Initialize Database

### Step 1: Wait for Initial Deployment

The first deployment will take 5-10 minutes. Digital Ocean will:
- Clone your repository
- Install dependencies
- Run Prisma generate
- Build your Next.js app
- Deploy it

### Step 2: Run Database Migrations

After the app is deployed, you need to initialize the database:

**Option A: Using Digital Ocean Console (Recommended)**

1. Go to your App in Digital Ocean
2. Click on **Console** tab
3. Click **Create Console**
4. Run these commands:
   ```bash
   npx prisma migrate deploy
   node prisma/seed.js
   ```

**Option B: Using Digital Ocean CLI**

1. Install doctl (Digital Ocean CLI):
   ```bash
   # On Ubuntu/Debian
   cd ~
   wget https://github.com/digitalocean/doctl/releases/download/v1.98.0/doctl-1.98.0-linux-amd64.tar.gz
   tar xf ~/doctl-1.98.0-linux-amd64.tar.gz
   sudo mv ~/doctl /usr/local/bin
   ```

2. Authenticate:
   ```bash
   doctl auth init
   ```

3. Get your app ID:
   ```bash
   doctl apps list
   ```

4. Run migration command:
   ```bash
   doctl apps create-deployment <your-app-id> --force-rebuild
   ```

### Step 3: Test Your Deployment

1. **Access your app:**
   - URL: `https://icgymhub-xxxxx.ondigitalocean.app`
   - Or your custom domain if configured

2. **Test registration:**
   - Create a test account
   - Verify email verification works
   - Test login

3. **Check database:**
   - Go to your Digital Ocean database cluster
   - Click **Users & Databases**
   - You should see tables created

---

## Part 4: Post-Deployment Configuration

### Step 1: Set Up Custom Domain (Optional but Recommended)

1. **In Digital Ocean App Settings:**
   - Go to **Settings** → **Domains**
   - Click **Add Domain**
   - Enter your domain: `app.yourdomain.com`

2. **Configure DNS:**
   - Add CNAME record in your DNS provider:
     ```
     Type: CNAME
     Name: app
     Value: icgymhub-xxxxx.ondigitalocean.app
     ```

3. **Enable SSL:**
   - Digital Ocean auto-provisions Let's Encrypt SSL
   - Wait 5-10 minutes for certificate

4. **Update Environment Variables:**
   ```
   NEXTAUTH_URL=https://app.yourdomain.com
   ```

### Step 2: Configure Database Backups

1. **In Database Settings:**
   - Go to **Settings** → **Backups**
   - Enable **Daily Backups** (included free)
   - Set backup time to low-traffic hours

### Step 3: Set Up Monitoring

1. **Enable App Insights:**
   - In App Platform, go to **Insights**
   - Monitor CPU, Memory, Request rates

2. **Set Up Alerts:**
   - Go to **Settings** → **Alerts**
   - Configure alerts for:
     - High CPU usage
     - High memory usage
     - Failed deployments

### Step 4: Security Configuration

1. **Database Connection Pooling:**
   - In your database, enable connection pooling
   - Use the pooled connection string in DATABASE_URL

2. **Restrict Database Access:**
   - Go to database **Settings** → **Trusted Sources**
   - Remove "All Digital Ocean Resources"
   - Add only your App Platform resources

3. **Environment Secrets:**
   - Never commit `.env` files
   - Rotate JWT secrets periodically
   - Use strong, random secrets (32+ characters)

---

## Part 5: Ongoing Deployments

### Automatic Deployments

With Autodeploy enabled, every push to `main` branch will:
1. Trigger a new build
2. Run tests (if configured)
3. Deploy automatically (if build succeeds)

### Manual Deployments

To force a deployment:
1. Go to your App in Digital Ocean
2. Click **Actions** → **Force Rebuild and Deploy**

### Database Migrations on Updates

When you add new migrations:

1. **Create migration locally:**
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add database migration"
   git push origin main
   ```

3. **After deployment, run migration:**
   - Use App Console
   ```bash
   npx prisma migrate deploy
   ```

**OR** add to your build command:
```
npx prisma generate && npx prisma migrate deploy && npm run build
```

⚠️ **WARNING:** This auto-runs migrations on deploy, which can be risky. Only do this if:
- You trust your migration safety
- You have good backups
- It's a low-traffic app

---

## Part 6: Cost Estimate

**Monthly Costs (USD):**
- App Platform (Basic): $5/month
- PostgreSQL Database (Basic): $15/month
- **Total: ~$20/month**

**For Production:**
- App Platform (Professional): $12-$24/month
- PostgreSQL Database (Production): $45+/month
- **Total: ~$60-$70/month**

---

## Part 7: Rollback Plan

If deployment fails:

1. **Rollback to Previous Version:**
   - Go to your App → **Deployments**
   - Find previous successful deployment
   - Click **...** → **Redeploy**

2. **Database Rollback:**
   - Digital Ocean keeps daily backups
   - Can restore from backup if needed
   - Go to Database → **Backups** → **Restore**

---

## Troubleshooting

### Build Fails

Check build logs in Digital Ocean:
1. Go to your App → **Activity**
2. Click on failed deployment
3. Review **Build Logs**

Common issues:
- Missing environment variables
- Prisma generation failing
- TypeScript errors

### Database Connection Issues

Check:
1. DATABASE_URL is correctly set
2. Database is in same region as app
3. Trusted sources includes your app
4. Connection string includes `?sslmode=require`

### App Won't Start

Check:
1. Run command is `npm run start`
2. HTTP Port is `3000`
3. Environment variables are set
4. Check runtime logs in Activity tab

---

## Quick Start Checklist

- [ ] Update schema.prisma to use PostgreSQL
- [ ] Create Digital Ocean database
- [ ] Note database connection string
- [ ] Create App Platform app
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Link database to app
- [ ] Deploy app
- [ ] Run migrations in console
- [ ] Test registration and login
- [ ] Configure custom domain (optional)
- [ ] Enable backups
- [ ] Set up monitoring

---

## Next Steps After Deployment

1. **Monitor performance** for the first few days
2. **Test all features** in production
3. **Set up CI/CD** for automated testing
4. **Configure CDN** for static assets (optional)
5. **Set up error tracking** (Sentry, LogRocket, etc.)
6. **Plan scaling strategy** based on usage

---

## Support Resources

- Digital Ocean Docs: https://docs.digitalocean.com/products/app-platform/
- Digital Ocean Community: https://www.digitalocean.com/community
- Prisma Postgres Guide: https://www.prisma.io/docs/concepts/database-connectors/postgresql
- Next.js Deployment: https://nextjs.org/docs/deployment

---

**Last Updated:** March 2, 2026
