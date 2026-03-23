# Club Deletion and Backup Feature Guide

## Overview

This feature allows club administrators to:
1. **Backup club data** - Export all club data as a compressed backup file
2. **Restore club data** - Import and restore from a previous backup
3. **Delete club** - Permanently delete a club with a 30-day cooling-off period

## 🔒 Security Features

- **Password verification required** for all sensitive operations
- **Confirmation text matching** for club deletion
- **30-day cooling-off period** before permanent deletion
- **Audit logging** for all club management actions
- **Admin-only access** - Only club admins can perform these operations

## 📦 Backup Feature

### What's Included in a Backup

A backup file contains:
- Club information and settings
- All users (passwords excluded for security)
- Venues and zones
- Gym sports and coaches
- Class templates and sessions
- Rosters and roster templates
- Equipment and maintenance records
- Injury forms and submissions
- Compliance categories and items
- Safety issues and repair requests
- Audit logs (last 1000 entries)

### Creating a Backup

1. Navigate to **Profile Settings** (accessible from the user menu)
2. Scroll to the **Danger Zone - Club Management** section
3. Click **Download Backup**
4. A ZIP file will be downloaded with format: `gymhub-backup-{club-slug}-{date}.zip`

The backup file includes:
- `backup.json` - Complete club data in JSON format
- `README.md` - Backup metadata and statistics

### Backup File Structure

```
gymhub-backup-yourclub-2026-03-23.zip
├── backup.json          # Complete club data
└── README.md           # Backup information and statistics
```

## 🔄 Restore Feature

### Important Warnings

⚠️ **CRITICAL**: Restoring a backup will **OVERWRITE ALL CURRENT DATA** for your club. This action **CANNOT BE UNDONE**.

- All current data will be permanently deleted
- Admin users are preserved (passwords remain unchanged)
- The backup must be from the same club (cross-club restoration is blocked)

### Restoring from a Backup

1. Navigate to **Profile Settings**
2. Scroll to **Danger Zone - Club Management**
3. Click **Restore from Backup**
4. Select your backup ZIP file
5. Enter your admin password when prompted
6. Confirm the restoration
7. Wait for the process to complete
8. The page will automatically refresh

### What Gets Preserved During Restore

- Club ID and core identifiers
- Club domain and slug
- Admin user passwords (not overwritten)

### What Gets Replaced

- All other club data and settings
- Non-admin users
- All records and submissions

## 🗑️ Club Deletion Feature

### 30-Day Cooling-Off Period

When you schedule a club for deletion:
1. Club is marked as **PENDING_DELETION**
2. Deletion is scheduled for **30 days** in the future
3. A warning banner appears in Profile Settings
4. You can **cancel the deletion** at any time within 30 days
5. After 30 days, the club is **permanently deleted** automatically

### Initiating Club Deletion

1. Navigate to **Profile Settings**
2. Scroll to **Danger Zone - Club Management**
3. Read the warnings carefully
4. Click **Schedule Club Deletion**
5. Type your club name exactly to confirm
6. Enter your admin password
7. Confirm the deletion

### Cancelling a Scheduled Deletion

If you change your mind:
1. Navigate to **Profile Settings**
2. You'll see a red banner showing the scheduled deletion date
3. Click **Cancel Deletion**
4. The club will remain active

### What Happens When a Club is Deleted

All data associated with the club is permanently deleted:
- Club record
- All users
- All venues, zones, and equipment
- All rosters and class sessions
- All injury forms and submissions
- All compliance items
- All audit logs
- All backups

**This action is PERMANENT and IRREVERSIBLE.**

## 📋 Australian Compliance

### Injury Report Retention Requirements

⚠️ **LEGAL REQUIREMENT**: Under Australian WHS (Work Health and Safety) regulations:
- Injury/incident records must be retained for **minimum 7 years**
- Some states have different requirements
- Best practice: Retain for **7 years** to comply with strictest regulations

### Compliance Recommendations

Before deleting a club:
1. **Download a backup** containing all injury reports
2. Store the backup securely for at least 7 years
3. Consider exporting injury submissions to PDF separately
4. Maintain records as required by SafeWork Australia and state authorities

## 🔧 Technical Implementation

### API Endpoints

#### Backup Club Data
```
POST /api/clubs/backup
Authorization: Bearer {access_token}
Response: application/zip (backup file)
```

#### Restore Club Data
```
POST /api/clubs/restore
Content-Type: multipart/form-data
Body: 
  - file: ZIP backup file
  - password: Admin password
Response: Success/Error JSON
```

#### Schedule Deletion
```
POST /api/clubs/delete
Body: 
  - password: Admin password
  - confirmationText: Club name
Response: Deletion scheduled confirmation
```

#### Cancel Deletion
```
DELETE /api/clubs/delete
Response: Cancellation confirmation
```

#### Check Deletion Status
```
GET /api/clubs/delete
Response: Current deletion status
```

### Cron Job for Permanent Deletion

A cron job endpoint processes permanent deletions:

```
POST /api/cron/delete-clubs
Authorization: Bearer {CRON_SECRET}
```

This should be called **daily** by your cron job service.

### Setting Up the Cron Job

#### On DigitalOcean App Platform

1. Add `CRON_SECRET` to your environment variables
2. Set up a scheduled job (cron) with:
   - Schedule: `0 2 * * *` (runs daily at 2 AM)
   - Command: 
   ```bash
   curl -X POST https://your-domain.com/api/cron/delete-clubs \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

#### Using External Cron Services

Services like **cron-job.org** or **EasyCron**:
1. Create a new cron job
2. URL: `https://your-domain.com/api/cron/delete-clubs`
3. Schedule: Daily at 2 AM
4. Add header: `Authorization: Bearer {your-cron-secret}`

### Environment Variables

Add to your `.env` file:

```bash
# Cron Job Secret (generate with: openssl rand -base64 32)
CRON_SECRET="your-secure-random-secret-key"
```

## 📊 Database Schema Changes

### New Fields on `Club` Model

```prisma
model Club {
  // ... existing fields ...
  
  deletedAt            DateTime?
  deletionScheduledFor DateTime?
  deletedBy            String?
  
  @@index([deletedAt])
  @@index([deletionScheduledFor])
}
```

### New `ClubBackup` Model

```prisma
model ClubBackup {
  id             String   @id @default(cuid())
  clubId         String
  backupType     String   @default("MANUAL")
  status         String   @default("PENDING")
  fileUrl        String?
  fileSize       Int?
  recordCount    Int?
  includesImages Boolean  @default(true)
  createdBy      String?
  errorMessage   String?
  createdAt      DateTime @default(now())
  completedAt    DateTime?
  
  club Club @relation(fields: [clubId], references: [id], onDelete: Cascade)
  
  @@index([clubId])
  @@index([status])
  @@index([createdAt])
}
```

## 🚀 Deployment Checklist

Before deploying this feature to production:

- [ ] Run database migration: 
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Add `CRON_SECRET` to environment variables
- [ ] Set up cron job for daily club deletion processing
- [ ] Test backup creation in staging
- [ ] Test restore in staging
- [ ] Test deletion flow in staging
- [ ] Verify audit logging is working
- [ ] Backup production database before deployment
- [ ] Communicate feature to existing club admins

## 🔍 Monitoring and Maintenance

### Audit Logs

All club management actions are logged in the `AuditLog` table:
- `CLUB_BACKUP_CREATED` - Backup was created
- `CLUB_RESTORE_INITIATED` - Restore started
- `CLUB_RESTORE_COMPLETED` - Restore completed successfully
- `CLUB_RESTORE_FAILED` - Restore failed
- `CLUB_DELETION_REQUESTED` - Deletion scheduled
- `CLUB_DELETION_CANCELLED` - Deletion cancelled
- `CLUB_PERMANENTLY_DELETED` - Club permanently deleted

### Monitoring Queries

Check clubs pending deletion:
```sql
SELECT id, name, deletedAt, deletionScheduledFor, deletedBy
FROM "Club"
WHERE "deletedAt" IS NOT NULL
ORDER BY "deletionScheduledFor" ASC;
```

Check backup history:
```sql
SELECT * FROM "ClubBackup"
WHERE status = 'COMPLETED'
ORDER BY "createdAt" DESC
LIMIT 20;
```

## ⚠️ Troubleshooting

### Backup Fails

- Check that all database relationships are valid
- Verify sufficient disk space for backup creation
- Check CloudWatch logs for error details

### Restore Fails

- Verify backup file is valid ZIP format
- Check that backup is from the same club
- Ensure admin password is correct
- Check transaction timeout settings if club is large

### Cron Job Not Running

- Verify `CRON_SECRET` environment variable is set
- Check cron service is configured correctly
- Test endpoint manually:
  ```bash
  curl -X POST https://your-domain.com/api/cron/delete-clubs \
    -H "Authorization: Bearer your-cron-secret"
  ```

## 📱 User Interface

### Profile Settings Page Updates

The Profile Settings page now includes a new **Danger Zone** section at the bottom (Admin only):

1. **Warning Banner** - Shows if club is pending deletion
2. **Backup & Restore** - Buttons for backup/restore operations
3. **Delete Club** - Button to schedule deletion with warnings

### Password Verification Modal

A reusable modal component for secure operations:
- Password input field
- Optional confirmation text field
- Clear warnings and messaging
- Loading states

## 🎯 Best Practices

1. **Regular Backups**: Recommend clubs create monthly backups
2. **Pre-Deletion Backup**: Always create a backup before major changes
3. **Test Restores**: Periodically test restore process in staging
4. **Audit Review**: Regularly review audit logs for suspicious activity
5. **Data Retention**: Document backup retention policies for compliance

## 📚 Related Files

- `/src/app/api/clubs/backup/route.ts` - Backup API endpoint
- `/src/app/api/clubs/restore/route.ts` - Restore API endpoint
- `/src/app/api/clubs/delete/route.ts` - Delete/Cancel API endpoints
- `/src/app/api/cron/delete-clubs/route.ts` - Cron job for permanent deletion
- `/src/app/dashboard/profile/page.tsx` - Profile settings page with UI
- `/src/components/PasswordVerificationModal.tsx` - Reusable modal component
- `/prisma/migrations/20260323000000_add_club_soft_delete_and_backups/` - Database migration

## 📞 Support

For issues or questions:
1. Check audit logs for detailed error messages
2. Review CloudWatch logs for API errors
3. Verify environment variables are correctly set
4. Test in staging environment first

---

**Last Updated**: March 23, 2026  
**Feature Status**: Production Ready  
**Compliance**: Australian WHS Compliant
