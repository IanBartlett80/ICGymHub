-- CreateTable
CREATE TABLE "EquipmentCategory" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentCategory_clubId_idx" ON "EquipmentCategory"("clubId");

-- CreateIndex
CREATE INDEX "EquipmentCategory_active_idx" ON "EquipmentCategory"("active");

-- CreateUnique
CREATE UNIQUE INDEX "EquipmentCategory_clubId_name_key" ON "EquipmentCategory"("clubId", "name");

-- AddForeignKey
ALTER TABLE "EquipmentCategory" ADD CONSTRAINT "EquipmentCategory_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default categories for all clubs
INSERT INTO "EquipmentCategory" ("id", "clubId", "name", "isDefault", "active", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "Club"."id",
    category_name,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Club"
CROSS JOIN (
    VALUES 
        ('Mats'),
        ('Bars (Uneven, Parallel, Horizontal)'),
        ('Beams'),
        ('Vault Equipment'),
        ('Rings'),
        ('Trampoline'),
        ('Floor Equipment'),
        ('Safety Equipment'),
        ('Training Aids'),
        ('Other')
) AS categories(category_name)
WHERE "Club"."id" IS NOT NULL;
