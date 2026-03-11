# Equipment Management - Beta Feedback & Implementation Plan

**Feature Area:** Equipment Management, Safety Issues, Maintenance Tracking  
**Date Received:** March 11, 2026  
**Status:** Not Started  
**Priority:** HIGH  
**Risk Level:** Medium

---

## 📋 FEEDBACK ITEMS

### 1. ALL EQUIPMENT - Search/Filter Interface
**Issue:** Search and filter interface highlighted at top of page  
**Observed:** Red box around "All Equipment" search/filter area

**Risk:** 🟢 Low (UI/UX)  
**Complexity:** Simple  
**Investigation Needed:**
- [ ] Review search functionality
- [ ] Check filter options
- [ ] Verify sorting capabilities
- [ ] Test equipment list loading
- [ ] Ensure responsive design

---

### 2. ALL EQUIPMENT - Navigation Sections
**Issue:** Multiple yellow highlighted sections indicating important areas  
**Observed:** Various navigation or section areas need review

**Risk:** 🟢 Low (UI organization)  
**Complexity:** Simple  
**Investigation Needed:**
- [ ] Review section organization
- [ ] Check navigation flow
- [ ] Verify all sections are accessible
- [ ] Ensure consistent layout

---

### 3. SAFETY ISSUES MANAGEMENT - Logged Equipment Issues Display
**Issue:** Looking for the logged equipment issue / module - NEEDS WORK  
**Current:** "Looking for the logged equipment issue as report is currently visible but is greyed out and is locked. I can't unlock it and can't access any elements when linking an equipment"  
**Impact:** Cannot access or unlock equipment issues

**Risk:** 🔴 High (Blocking core functionality)  
**Complexity:** Medium  
**Priority:** URGENT  

**Problems Identified:**
- Equipment issues showing as greyed out
- Cannot unlock locked equipment issues
- Cannot access elements when linking equipment
- Report is visible but not interactive

**Implementation:**
- [ ] Fix greyed-out/locked state of equipment issues
- [ ] Add ability to unlock equipment issues
- [ ] Fix linking equipment to issues
- [ ] Review permissions on equipment issue access
- [ ] Test complete workflow for logging safety issues

---

### 4. SAFETY NOTES
**Issue:** Safety notes functionality needs review  
**Observed:** Section highlighted in equipment tracking

**Risk:** 🟡 Medium  
**Complexity:** Simple-Medium  
**Investigation Needed:**
- [ ] Review safety notes input/display
- [ ] Check if notes are saving properly
- [ ] Verify notes visibility
- [ ] Ensure proper formatting

---

### 5. COMPLIANCE INTEGRATION - Expiry Dates & Recurring Reminders
**Issue:** RECOMMEND ADDING EXPIRY DATE TO COMPLIANCE SYSTEM ALREADY  
**Requested:**
- Add expiry date tracking for equipment
- Integrate with compliance manager
- Recurring reminders is a GREAT FEATURE for compliance management
- Should be considered for equipment tracking

**Examples:**
- Equipment inspection due dates
- Safety certification expiry
- Maintenance schedule tracking
- Warranty expiration

**Risk:** 🟡 Medium (DB schema changes, compliance integration)  
**Complexity:** Medium-High  
**Implementation:**
- [ ] Add expiry date field to equipment records
- [ ] Create relationship with compliance manager
- [ ] Add automatic compliance item creation for equipment
- [ ] Set up recurring reminder system
- [ ] Create migration for new fields
- [ ] Design UI for expiry date management
- [ ] Add notifications for expiring equipment certifications

**Related To:** Compliance Manager integration, Injury Incidents expiry tracking  
**Database Changes:** Yes - new fields required

---

### 6. ONE ISSUE IDENTIFIED - Equipment Tracking
**Issue:** ONE ISSUE IDENTIFIED - specific equipment tracking problem  
**Observed:** Highlighted section indicating a specific logged issue

**Risk:** 🟡 Medium  
**Complexity:** TBD  
**Investigation Needed:**
- [ ] Identify the specific issue referenced
- [ ] Review issue tracking workflow
- [ ] Check issue resolution process
- [ ] Verify issue display in lists

---

### 7. FOR EQUIPMENT - Out of Play Tracking
**Issue:** Tracking what equipment is out of play and visibility  
**Requested:**
- Clear indication when equipment is out of service
- Track reasons for equipment being out of play
- Visibility of out-of-service equipment
- Prevent scheduling equipment that's unavailable

**Risk:** 🟡 Medium (Business logic)  
**Complexity:** Medium  
**Implementation:**
- [ ] Add "Out of Service" status field
- [ ] Add reason/notes for out-of-service status
- [ ] Create visual indicators for unavailable equipment
- [ ] Filter equipment lists by availability
- [ ] Add date tracking (when taken out, expected return)
- [ ] Integrate with scheduling/booking system
- [ ] Add notifications when equipment goes out of service

---

### 8. WHEN CHOOSING WHERE TO REPORT - Reporting Mechanisms
**Issue:** WHERE IS THE "FILED AGAINST" FIELD?  
**Current:** Missing or unclear which equipment an issue is filed against  
**Impact:** Cannot properly associate issues with specific equipment

**Risk:** 🟡 Medium (Data integrity)  
**Complexity:** Medium  
**Implementation:**
- [ ] Add/fix "Filed Against" field to clearly show equipment
- [ ] Ensure equipment selection is obvious in issue forms
- [ ] Add equipment search/dropdown for issue reporting
- [ ] Display equipment context in issue details
- [ ] Validate equipment association is required

---

### 9. COMPLIANCE RENEWAL DATES - Equipment Certifications
**Issue:** Compliance renewal date tracking shown in screenshots  
**Observed:** Two compliance renewal entries visible:
- "Compliance Renewal Dates" - Overdue (Red)
- "Compliance Renewal Dates" - Current (Green)

**Current Functionality:** Basic renewal date tracking exists  
**Needs Improvement:**
- Better visibility of upcoming renewals
- Color-coded status indicators
- Integration with equipment records
- Automated reminders

**Risk:** 🟢 Low (Enhancement of existing feature)  
**Complexity:** Simple-Medium  
**Implementation:**
- [ ] Review current renewal date display
- [ ] Enhance status indicators (overdue, upcoming, current)
- [ ] Add filtering by renewal status
- [ ] Integrate renewal dates with equipment details
- [ ] Set up automated reminders before expiry

---

### 10. UNANSWERED LOG - Issue Resolution Tracking
**Issue:** UNANSWERED LOG section highlighted  
**Observed:** Need to track unresolved equipment issues

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Review unanswered/unresolved issue tracking
- [ ] Add status workflow (New, In Progress, Resolved)
- [ ] Create filters for issue status
- [ ] Add assignment capability
- [ ] Track resolution time/SLA

---

### 11. SAFETY ISSUES - Complete Workflow Review
**Issue:** Multiple areas in Safety Issues section highlighted  
**Observed:** Workflow or UI issues in safety issue management

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Map complete safety issue workflow
- [ ] Test issue creation end-to-end
- [ ] Review issue detail display
- [ ] Check issue editing/updating
- [ ] Verify issue resolution process
- [ ] Test notifications for new issues

---

### 12. MAINTENANCE LOG - Scheduled Maintenance
**Issue:** EQUIPMENT WITH SCHEDULED TASK fields shown  
**Observed:** Scheduled maintenance tracking exists but may need enhancement

**Current:** Forms showing scheduled task dates and details  
**Potential Issues:**
- Unclear maintenance scheduling
- Missing fields or options
- Poor visibility of upcoming maintenance

**Risk:** 🟢 Low (Enhancement)  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Review scheduled maintenance interface
- [ ] Check recurring maintenance setup
- [ ] Verify maintenance history tracking
- [ ] Add maintenance type/category options
- [ ] Improve maintenance calendar view

---

### 13. EQUIPMENT CATEGORIES - Organization
**Issue:** NEEDS WORK - equipment categories and tracking  
**Observed:** Equipment categorization needs improvement

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Implementation:**
- [ ] Review existing category system
- [ ] Add/refine equipment categories
- [ ] Allow filtering by category
- [ ] Add category-specific fields if needed
- [ ] Ensure consistent categorization

**Suggested Categories:**
- Apparatus (vault, bars, beam, floor)
- Mats and Safety Equipment
- Training Aids
- Facility Equipment
- Office/Administrative Equipment

---

### 14. EQUIPMENT LINKING - Association with Issues/Incidents
**Issue:** Can't access elements when linking equipment (from #3)  
**Current:** Equipment linking mechanism not working properly  
**Impact:** Cannot associate equipment with safety issues or incidents

**Risk:** 🔴 High (Core functionality broken)  
**Complexity:** Medium  
**Priority:** URGENT  

**Implementation:**
- [ ] Fix equipment linking mechanism
- [ ] Test linking equipment to safety issues
- [ ] Test linking equipment to injury incidents
- [ ] Verify linked equipment displays correctly
- [ ] Add ability to unlink/change equipment association

---

### 15. EQUIPMENT PHOTOS/DOCUMENTATION
**Issue:** Photo/documentation tracking for equipment  
**Observed:** Equipment photo functionality exists (from migration files)

**Risk:** 🟢 Low (Enhancement)  
**Complexity:** Simple  
**Investigation Needed:**
- [ ] Review equipment photo upload
- [ ] Check photo display in equipment details
- [ ] Verify multiple photo support
- [ ] Add documentation attachments (manuals, certs)
- [ ] Ensure proper file storage and retrieval

---

## 🎯 IMPLEMENTATION PRIORITY

### 🔴 Phase 0: CRITICAL BUGS (MUST FIX FIRST)
1. **Safety Issues - Greyed Out/Locked** (#3) - Blocking core functionality
2. **Equipment Linking Broken** (#14) - Cannot associate equipment with issues
3. **"Filed Against" Field Missing** (#8) - Data integrity issue

### Phase 1: Quick Wins (High Impact, Low Risk)
- Compliance renewal date enhancements (#9)
- Safety notes improvements (#4)
- Search/filter improvements (#1)
- Equipment categories (#13)

### Phase 2: Functional Improvements
- Out of Play tracking (#7)
- Unanswered log/issue status (#10)
- Scheduled maintenance enhancements (#12)
- Equipment photo/documentation (#15)

### Phase 3: Feature Enhancements
- Expiry date & compliance integration (#5)
- Recurring reminder system (#5)
- Complete safety issues workflow (#11)
- Advanced reporting mechanisms (#8)

---

## ✅ PROGRESS TRACKER

**Total Items:** 15  
**Critical Bugs:** 3  
**Completed:** 0  
**In Progress:** 0  
**Blocked:** 0  

---

## 🚨 QUESTIONS NEEDING ANSWERS

1. **Safety Issues Locked State** (#3) - What causes equipment issues to be locked? Is this a permission issue or bug?
2. **Equipment Linking** (#14) - Where should equipment linking work? Issues, incidents, maintenance?
3. **Out of Play Status** (#7) - Should out-of-service equipment be hidden from certain views or just marked?
4. **Compliance Integration** (#5) - Which equipment types need compliance tracking? All or specific categories?
5. **Maintenance Scheduling** (#12) - Should maintenance schedule based on calendar dates, usage hours, or both?
6. **Issue Resolution** (#10) - Who can mark issues as resolved? Is approval needed?
7. **Equipment Categories** (#13) - Should categories be predefined or user-configurable?

---

## 🔍 TECHNICAL INVESTIGATION REQUIRED

### Safety Issues System
- Debug locked/greyed-out state
- Review permissions model
- Check equipment association logic
- Test complete issue workflow
- Review database constraints

### Equipment Linking
- Investigate linking mechanism failure
- Check relationship models (Equipment → SafetyIssues, Equipment → InjurySubmissions)
- Verify foreign key constraints
- Test cascading behaviors

### Compliance Integration
- Design expiry date schema
- Plan compliance item auto-creation
- Design recurring reminder system
- Integration with existing compliance manager

### Status Tracking
- Out of service status workflow
- Issue resolution workflow
- Maintenance status tracking
- Equipment availability logic

---

## 📝 NOTES

**Critical Observation:** Equipment module has **blocking bugs** that prevent users from logging and managing safety issues properly. These must be fixed before adding enhancements.

**Key Pain Points:**
1. Cannot access/unlock safety issues (greyed out/locked)
2. Equipment linking broken
3. Missing "Filed Against" field clarity
4. Need better status tracking (out of service, issue resolution)

**Strong Feature Request:** Compliance integration with expiry dates and recurring reminders - described as "GREAT FEATURE" by user.

**Related Modules:**
- Compliance Manager (integration needed)
- Injury & Incident Management (equipment linking)
- Maintenance Scheduling (recurring tasks)

---

## 🔧 PROPOSED SCHEMA ENHANCEMENTS

### Equipment Table
```prisma
model Equipment {
  // ... existing fields
  
  // New fields for tracking
  status: EquipmentStatus @default(IN_SERVICE)
  outOfServiceReason: String?
  outOfServiceDate: DateTime?
  expectedReturnDate: DateTime?
  
  // Compliance tracking
  expiryDate: DateTime?
  complianceItemId: String? // FK to ComplianceItem
  
  // Enhanced tracking
  lastInspectionDate: DateTime?
  nextInspectionDue: DateTime?
  
  // Relations
  safetyIssues: SafetyIssue[]
  maintenanceTasks: MaintenanceTask[]
  complianceItem: ComplianceItem? @relation(fields: [complianceItemId], references: [id])
}

enum EquipmentStatus {
  IN_SERVICE
  OUT_OF_SERVICE
  UNDER_MAINTENANCE
  RETIRED
  PENDING_INSPECTION
}
```

### SafetyIssue Enhancement
```prisma
model SafetyIssue {
  // ... existing fields
  
  // Fix for "Filed Against" clarity
  equipmentId: String @required
  equipment: Equipment @relation(fields: [equipmentId], references: [id])
  
  // Status tracking
  status: IssueStatus @default(OPEN)
  resolvedDate: DateTime?
  resolvedBy: String?
  
  // Locking mechanism
  isLocked: Boolean @default(false)
  lockedBy: String?
  lockedAt: DateTime?
}

enum IssueStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}
```

---

## 🔄 NEXT STEPS

**Immediate Actions:**
1. **Debug safety issues locked state** - Highest priority
2. **Fix equipment linking** - Critical for functionality
3. **Clarify "Filed Against" field** - Quick win for UX
4. **Review permissions model** - May be causing locking issues

**After Bug Fixes:**
1. Implement out-of-service tracking
2. Add issue status workflow
3. Enhance compliance integration
4. Build recurring reminder system

---

**Last Updated:** March 11, 2026

---

## 📊 COMPLIANCE INTEGRATION PLAN

### Feature: Equipment Expiry & Compliance Tracking

**User Request:** "RECOMMEND ADDING EXPIRY DATE TO COMPLIANCE SYSTEM ALREADY, REOCCURRING REMINDERS IS A GREAT FEATURE"

**Implementation Phases:**

#### Phase 1: Basic Expiry Tracking
- [ ] Add expiry date field to equipment
- [ ] Display expiry status in equipment list
- [ ] Add filter for expiring/expired equipment
- [ ] Color-code status indicators

#### Phase 2: Compliance Integration
- [ ] Create compliance items for equipment certifications
- [ ] Link equipment to compliance manager
- [ ] Auto-create compliance tasks for inspections
- [ ] Sync expiry dates between systems

#### Phase 3: Recurring Reminders
- [ ] Build recurring reminder system
- [ ] Email notifications for upcoming expiries
- [ ] Dashboard alerts for overdue items
- [ ] Customizable reminder schedules

#### Phase 4: Advanced Features
- [ ] Equipment maintenance history tracking
- [ ] Certificate upload and storage
- [ ] Inspection checklists
- [ ] Automated compliance reporting

**Database Impact:** Medium - new fields and relationships  
**Estimated Effort:** 10-12 hours  
**Dependencies:** Compliance Manager must be functional  

**Risk:** 🟡 Medium  
**Value:** ⭐⭐⭐⭐⭐ High - User specifically requested as "GREAT FEATURE"
