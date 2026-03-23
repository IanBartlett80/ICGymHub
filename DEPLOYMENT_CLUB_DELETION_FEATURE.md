# DEPLOYMENT INSTRUCTIONS - Club Deletion & Backup Feature

## 🚨 PRE-DEPLOYMENT CHECKLIST

Before applying any changes to production:

- [ ] **BACKUP PRODUCTION DATABASE**
  ```bash
  # Create manual backup via DigitalOcean dashboard
  # Or use pg_dump command
  ```

- [ ] Review all code changes
- [ ] Test in local development environment
- [ ] Test in staging environment (if available)
- [ ] Get approval from stakeholders
- [ ] Schedule maintenance window (optional)

---

## 📋 STEP-BY-STEP DEPLOYMENT

### Step 1: Update Dependencies

```bash
# On your local machine or CI/CD
cd /workspaces/ICGymHub
npm install
```

This installs:
- `jszip@^3.10.1`
- `@types/jszip`

### Step 2: Apply Database Migration

**⚠️ CRITICAL**: This modifies the production database schema.

#### Option A: Using Prisma Migrate (Recommended for Production)

```bash
# This applies the migration without creating a shadow database
npx prisma migrate deploy
```

#### Option B: Manual SQL (if migrate deploy fails)

Connect to your DigitalOcean PostgreSQL database and run:

```sql
-- Migration: 20260323000000_add_club_soft_delete_and_backups

-- AlterTable: Add soft delete fields to Club
ALTER TABLE "Club" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Club" ADD COLUMN "deletionScheduledFor" TIMESTAMP(3);
ALTER TABLE "Club" ADD COLUMN "deletedBy" TEXT;

-- CreateTable: ClubBackup
CREATE TABLE "ClubBackup" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "backupType" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "recordCount" INTEGER,
    "includesImages" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ClubBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Club_deletedAt_idx" ON "Club"("deletedAt");
CREATE INDEX "Club_deletionScheduledFor_idx" ON "Club"("deletionScheduledFor");
CREATE INDEX "ClubBackup_clubId_idx" ON "ClubBackup"("clubId");
CREATE INDEX "ClubBackup_status_idx" ON "ClubBackup"("status");
CREATE INDEX "ClubBackup_createdAt_idx" ON "ClubBackup"("createdAt");

-- AddForeignKey
ALTER TABLE "ClubBackup" ADD CONSTRAINT "ClubBackup_clubId_fkey" 
    FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

#### Verify Migration

```bash
# Check that migration was applied
npx prisma migrate status
```

### Step 3: Regenerate Prisma Client

```bash
npx prisma generate
```

This updates the Prisma Client with the new `ClubBackup` model and soft delete fields.

### Step 4: Set Environment Variables

#### On DigitalOcean App Platform:

1. Go to your app in the DigitalOcean dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Key**: `CRON_SECRET`
   - **Value**: Generate with `openssl rand -base64 32`
   - **Scope**: All components
   - **Type**: Secret

#### Generate Strong Secret:

```bash
openssl rand -base64 32
```

Example output: `xK8vL2mN9pQ4rS7tU1wV3xY5zA8bC0dE2fG4hI6jK8lM0nO2pR4sT6uW8xZ0`

### Step 5: Deploy Code to Production

#### Option A: Git Push (DigitalOcean App Platform Auto-Deploy)

```bash
git add .
git commit -m "feat: Add club deletion and backup functionality"
git push origin main
```

DigitalOcean will automatically deploy.

#### Option B: Manual Deployment

1. Push code to repository
2. Trigger deployment in DigitalOcean dashboard
3. Monitor deployment logs

### Step 6: Set Up Cron Job

#### Using DigitalOcean App Platform:

DigitalOcean doesn't have built-in cron jobs, so use an external service.

#### Option A: cron-job.org (Free)

1. Go to https://cron-job.org
2. Create account and new cron job:
   - **Title**: GymHub Club Deletion
   - **URL**: `https://your-domain.com/api/cron/delete-clubs`
   - **Schedule**: `0 2 * * *` (Daily at 2 AM)
   - **Headers**: Add `Authorization: Bearer {your-cron-secret}`
   - **Method**: POST

#### Option B: EasyCron

1. Go to https://www.easycron.com
2. Create new cron job:
   - **URL**: `https://your-domain.com/api/cron/delete-clubs`
   - **When**: Daily at 2:00 AM
   - **HTTP Headers**: `Authorization: Bearer {your-cron-secret}`
   - **HTTP Method**: POST

#### Option C: GitHub Actions (If using GitHub)

Create `.github/workflows/daily-cleanup.yml`:

```yaml
name: Daily Club Cleanup

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Club Deletion Cron
        run: |
          curl -X POST https://your-domain.com/api/cron/delete-clubs \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add `CRON_SECRET` to GitHub Secrets.

### Step 7: Verify Deployment

#### Test Backup Creation

1. Log in as an admin user
2. Navigate to **Profile Settings**
3. Scroll to **Danger Zone**
4. Click **Download Backup**
5. Verify ZIP file downloads
6. Extract and verify `backup.json` contains data

#### Test Password Verification

1. Try to schedule club deletion
2. Verify password prompt appears
3. Test with wrong password (should fail)
4. Test with correct password (should work)
5. Cancel the deletion immediately

#### Test API Endpoints Manually

```bash
# Get deletion status
curl -X GET https://your-domain.com/api/clubs/delete \
  -H "Authorization: Bearer {access-token}"

# List backups
curl -X GET https://your-domain.com/api/clubs/backup \
  -H "Authorization: Bearer {access-token}"

# Test cron endpoint (should return success or no clubs to delete)
curl -X POST https://your-domain.com/api/cron/delete-clubs \
  -H "Authorization: Bearer {cron-secret}"
```

#### Check Audit Logs

```sql
SELECT * FROM "AuditLog" 
WHERE action LIKE 'CLUB_%' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Step 8: Monitor Initial Usage

- Check CloudWatch logs for errors
- Monitor API response times
- Watch audit logs for suspicious activity
- Verify cron job runs successfully first night

---

## 🔄 ROLLBACK PROCEDURE

If something goes wrong:

### 1. Quick Rollback (Code Only)

```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

### 2. Database Rollback (if needed)

**⚠️ WARNING**: This will lose any backups created and deletion schedules.

```sql
-- Remove indexes
DROP INDEX IF EXISTS "Club_deletedAt_idx";
DROP INDEX IF EXISTS "Club_deletionScheduledFor_idx";
DROP INDEX IF EXISTS "ClubBackup_clubId_idx";
DROP INDEX IF EXISTS "ClubBackup_status_idx";
DROP INDEX IF EXISTS "ClubBackup_createdAt_idx";

-- Drop ClubBackup table
DROP TABLE IF EXISTS "ClubBackup";

-- Remove columns from Club
ALTER TABLE "Club" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "Club" DROP COLUMN IF EXISTS "deletionScheduledFor";
ALTER TABLE "Club" DROP COLUMN IF EXISTS "deletedBy";
```

Then regenerate Prisma client:
```bash
npx prisma generate
```

---

## 🐛 POST-DEPLOYMENT TROUBLESHOOTING

### Issue: TypeScript Errors in IDE

**Solution**: Restart TypeScript server or VS Code
```bash
# In VS Code: Cmd/Ctrl + Shift + P
> TypeScript: Restart TS Server
```

### Issue: Prisma Client Errors

**Solution**: Regenerate client
```bash
npx prisma generate
```

### Issue: Migration Already Applied Error

**Solution**: Mark as applied
```bash
npx prisma migrate resolve --applied 20260323000000_add_club_soft_delete_and_backups
```

### Issue: Backup Download Fails

**Check**:
1. CloudWatch logs for errors
2. Database connectivity
3. Disk space on server
4. Memory limits

### Issue: Cron Job Not Running

**Check**:
1. CRON_SECRET is correctly set
2. Cron service configuration
3. URL is correct (https://)
4. Test endpoint manually

---

## 📊 MONITORING QUERIES

### Check Clubs Pending Deletion

```sql
SELECT 
  id, 
  name, 
  "deletedAt", 
  "deletionScheduledFor", 
  "deletedBy",
  EXTRACT(DAY FROM ("deletionScheduledFor" - CURRENT_TIMESTAMP)) as days_until_deletion
FROM "Club"
WHERE "deletedAt" IS NOT NULL
ORDER BY "deletionScheduledFor" ASC;
```

### Check Recent Backups

```sql
SELECT 
  cb.*,
  c.name as club_name
FROM "ClubBackup" cb
JOIN "Club" c ON c.id = cb."clubId"
ORDER BY cb."createdAt" DESC
LIMIT 20;
```

### Check Audit Logs

```sql
SELECT 
  al.*,
  u."fullName" as user_name,
  c.name as club_name
FROM "AuditLog" al
LEFT JOIN "User" u ON u.id = al."userId"
LEFT JOIN "Club" c ON c.id = al."clubId"
WHERE al.action LIKE 'CLUB_%'
ORDER BY al."createdAt" DESC
LIMIT 50;
```

---

## 🔔 NOTIFICATION TO USERS

After deployment, consider notifying existing club admins:

**Email Template:**

```
Subject: New Feature: Club Data Backup & Management

Hi {Admin Name},

We've added new data management features to GymHub:

✅ Backup Export - Download all your club data
✅ Data Restore - Restore from a previous backup
✅ Club Deletion - Permanently delete your club (with 30-day grace period)

These features are available in Profile Settings under the "Danger Zone" section.

Important: Before deleting your club, please download a backup and retain it for 
at least 7 years to comply with Australian WHS injury report retention requirements.

For more information, see our documentation or contact support.

Thanks,
The GymHub Team
```

---

## ✅ DEPLOYMENT COMPLETE CHECKLIST

- [ ] Dependencies installed
- [ ] Database migration applied
- [ ] Prisma client regenerated
- [ ] CRON_SECRET environment variable set
- [ ] Code deployed to production
- [ ] Cron job configured and tested
- [ ] Backup creation tested
- [ ] Password verification tested
- [ ] Audit logs verified
- [ ] Monitoring queries validated
- [ ] Rollback procedure documented
- [ ] Users notified (if needed)
- [ ] Documentation created
- [ ] Support team trained

---

## 📞 SUPPORT CONTACTS

If you encounter issues during deployment:

1. Check CloudWatch logs
2. Review audit logs in database
3. Test endpoints with curl
4. Verify environment variables
5. Check Prisma schema and client

---

**Deployment Guide Version**: 1.0  
**Feature**: Club Deletion and Backup  
**Date**: March 23, 2026  
**Status**: Ready for Production Deployment
