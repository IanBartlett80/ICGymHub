# Production Database Fix - Missing Migrations

**Issue:** InjurySubmission table is missing `zoneId` and `equipmentId` columns
**Status:** CRITICAL - Injury & Incident feature completely broken
**Date:** March 6, 2026

## Root Cause

The production database has NOT run migrations after `20260302091754_add_scheduled_maintenance_fields`. The application code expects columns that don't exist.

**Missing Migration:** `20260302094812_add_equipment_to_injury_submissions`

This migration adds:
- `InjurySubmission.zoneId` (TEXT, nullable, foreign key to Zone)
- `InjurySubmission.equipmentId` (TEXT, nullable, foreign key to Equipment)
- `InjurySubmission.equipmentMaintenanceSnapshot` (TEXT)
- `InjurySubmission.equipmentSafetySnapshot` (TEXT)
- Indexes and foreign key constraints

## Solution: Deploy Migrations to Production

### Step 1: Set Production DATABASE_URL

```bash
export DATABASE_URL="postgresql://doadmin:<PASSWORD>@icgymhub-db-do-user-25561005-0.m.db.ondigitalocean.com:25060/icgymhub_production?sslmode=require"
```

### Step 2: Check Current Migration Status

```bash
npx prisma migrate status
```

This will show which migrations are pending.

### Step 3: Deploy Pending Migrations

```bash
npx prisma migrate deploy
```

⚠️ **WARNING:** This will:
- Add new columns to InjurySubmission table
- Create indexes
- Add foreign key constraints
- This is a SAFE, additive operation (no data loss)

### Step 4: Verify the Fix

```bash
npx prisma migrate status
```

Should show: "No pending migrations"

### Step 5: Restart the Application

After migrations are applied, the DigitalOcean App Platform application should automatically restart. If not:

1. Go to DigitalOcean App Platform console
2. Manually trigger a redeployment or restart

## Expected Result

✅ `InjurySubmission` table now has `zoneId` and `equipmentId` columns
✅ API endpoints `/api/injury-submissions` work correctly
✅ Analytics endpoints work
✅ Injury & Incident feature fully functional

## Rollback Plan (if needed)

If something goes wrong, you can rollback by running:

```sql
-- Remove the columns (CAUTION: Only if you need to rollback)
ALTER TABLE "InjurySubmission" DROP COLUMN IF EXISTS "zoneId";
ALTER TABLE "InjurySubmission" DROP COLUMN IF EXISTS "equipmentId";
ALTER TABLE "InjurySubmission" DROP COLUMN IF EXISTS "equipmentMaintenanceSnapshot";
ALTER TABLE "InjurySubmission" DROP COLUMN IF EXISTS "equipmentSafetySnapshot";

-- Remove indexes
DROP INDEX IF EXISTS "InjurySubmission_zoneId_idx";
DROP INDEX IF EXISTS "InjurySubmission_equipmentId_idx";
```

## Verification Query

After deployment, verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'InjurySubmission'
  AND column_name IN ('zoneId', 'equipmentId', 'equipmentMaintenanceSnapshot', 'equipmentSafetySnapshot');
```

Expected result:
```
        column_name         | data_type | is_nullable
----------------------------+-----------+-------------
 zoneId                     | text      | YES
 equipmentId                | text      | YES
 equipmentMaintenanceSnapshot| text     | YES
 equipmentSafetySnapshot    | text      | YES
```

## Timeline

- **Downtime Required:** None (additive changes)
- **Estimated Duration:** < 1 minute
- **Risk Level:** LOW (safe migration)

---

✅ Schema.prisma has been fixed in the repository
⏳ Production database needs migration deployment
