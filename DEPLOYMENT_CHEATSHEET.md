# Digital Ocean Deployment Cheat Sheet

Quick reference for deploying ICGymHub to Digital Ocean.

## 🚀 Quick Deploy Steps

### 1. Create PostgreSQL Database (5 min)
```
1. Create → Databases → PostgreSQL
2. Choose region (e.g., Sydney)
3. Select plan ($15/month for dev)
4. Name: icgymhub-db
5. Copy connection string
```

### 2. Create App (5 min)
```
1. Create → Apps → GitHub
2. Select: IanBartlett80/ICGymHub
3. Branch: main
4. Enable Autodeploy
```

### 3. Configure Environment Variables
```bash
# In App Platform → Environment Variables
DATABASE_URL={icgymhub-db.DATABASE_URL}  # Select from dropdown
NODE_ENV=production
JWT_SECRET=<generate-random-32-chars>
NEXTAUTH_SECRET=<generate-random-32-chars>
NEXTAUTH_URL=${APP_URL}
AZURE_CLIENT_ID=<from-azure-portal>
AZURE_CLIENT_SECRET=<from-azure-portal>
AZURE_TENANT_ID=<from-azure-portal>
EMAIL_FROM=<your-email>
```

### 4. Configure Build Settings
```bash
# Build Command
npx prisma generate && npm run build

# Run Command  
npm run start

# HTTP Port
3000
```

### 5. Deploy & Initialize
```bash
# After first deployment, open Console and run:
npx prisma migrate deploy
node prisma/seed.js
```

## 📝 Generate Secrets

```bash
# JWT_SECRET (32+ characters)
openssl rand -base64 32

# NEXTAUTH_SECRET (32+ characters)
openssl rand -base64 32
```

## 🔄 Update & Redeploy

```bash
# Local changes
git add .
git commit -m "Your changes"
git push origin main

# Digital Ocean auto-deploys (if Autodeploy enabled)
# Or manually: Apps → Actions → Force Rebuild
```

## 🗄️ Run New Migrations

```bash
# Option 1: App Console
npx prisma migrate deploy

# Option 2: Local with production DB
# (⚠️ Use carefully - connects to production)
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

## 💰 Cost Estimate

| Service | Plan | Cost/Month |
|---------|------|------------|
| App Platform | Basic | $5 |
| PostgreSQL | Dev | $15 |
| **Total** | | **$20** |

## 🆘 Common Issues

### Build Fails
```bash
# Check: Apps → Activity → Build Logs
# Fix: Usually missing env vars or TypeScript errors
```

### Database Connection Fails
```bash
# Check:
# 1. DATABASE_URL has ?sslmode=require
# 2. Trusted sources includes app
# 3. Database and app in same region
```

### Migrations Not Running
```bash
# Run manually in Console:
npx prisma migrate deploy

# Or add to build command:
npx prisma generate && npx prisma migrate deploy && npm run build
```

## 🔗 Quick Links

- [Full Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Digital Ocean Console](https://cloud.digitalocean.com)
- [Prisma PostgreSQL Docs](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

## ⚙️ Future Improvements

- [ ] Set up CI/CD with GitHub Actions
- [ ] Configure custom domain
- [ ] Enable CDN for static assets  
- [ ] Set up error monitoring (Sentry)
- [ ] Implement database backups verification
- [ ] Set up staging environment
