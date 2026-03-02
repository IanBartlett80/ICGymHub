-- Data migration: Populate templateName before schema migration
-- This ensures we don't lose template information when making templateId nullable

-- First, check current state
SELECT 'Current submissions without templateName:' as status;
SELECT id, templateId FROM InjurySubmission;

-- Get the list of templates
SELECT 'Available templates:' as status;
SELECT id, name FROM InjuryFormTemplate;

-- We cannot add the column here as it doesn't exist yet in the database
-- This will be done by the Prisma migration
-- However, we document the data that needs to be preserved

-- Expected data after migration:
-- cmks0se94000ihhlufxssg5az should have templateName = 'Test Form'
-- cmkubqj1b002g6a5rx3v8l0fj should have templateName = 'Injury Report'
-- cmkudbs2p00356a5rhe13k53a should have templateName = 'Injury Report'
-- cmkudlgaa003s6a5r35num35c should have templateName = 'Injury Report'
-- cmkudoln9004f6a5ru9gitpya should have templateName = 'Injury Report'
