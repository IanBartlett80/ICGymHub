# Club Management Setup - Beta Feedback & Implementation Plan

**Feature Area:** Club Management & Setup  
**Date Received:** March 11, 2026  
**Status:** Not Started  
**Priority:** Medium  
**Risk Level:** Low-Medium

---

## 📋 FEEDBACK ITEMS

### 1. INDIVIDUAL CARDS - Navigation & Labeling
**Issue:** Settings page redirect shows duplicate "Club Management" text  
**Current:** "Club Management" appears twice on the page  
**Requested:**
- Change settings link language to include 'settings' in page header label
- Change heading "Club Management" to "Currently set up"
- Remove redundant text that says information is currently set up

**Risk:** 🟢 Low (UI text only)  
**Complexity:** Simple  
**Implementation:**
- [ ] Update page header text in Club Management settings
- [ ] Change main heading from "Club Management" to "Currently set up"
- [ ] Review and remove redundant help text

---

### 2. INDIVIDUAL CARDS - Setup Order Indicators
**Issue:** No clear indication of setup order  
**Requested:**
- Add subtle number (1-6) in top right of each card to guide setup order

**Setup Order:**
1. Venues
2. GymSports  
3. Gym Zones
4. Coaches
5. System Notifications
6. Roles and Permissions

**Risk:** 🟢 Low (UI only)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add numbered badges to setup cards (1-6)
- [ ] Style badges appropriately (subtle, top-right corner)
- [ ] Ensure responsive design

---

### 3. VENUES
**Issue:** Generic title; unclear data usage  
**Requested:**
- Change "Venues" to "Manage physical locations and facilities"
- Add details about club physical location management

**Questions to Clarify:**
- Where is venue information used throughout platform (reports)?
- Do we have breakdown of areas each venue offers?
- When/how is address information used?
- Why is this valuable for troubleshooting?

**Risk:** 🟢 Low (UI text only)  
**Complexity:** Simple  
**Implementation:**
- [ ] Update card title text
- [ ] Add descriptive help text about venue usage
- [ ] Document venue data usage in platform

---

### 4. GYMSPORTS - Terminology & Icon
**Issue:** "GymSports icon is a person running"; unclear terminology  
**Current:** Manage gymnastics sports available  
**Requested:**
- Change icon from "person running" to more relevant icon (MAG, WAG, REC, KG, ACRO, T&D, XCEL)
- Consider predetermined list vs. generic terminology
- Could be predetermined list: MAG, WAG, REC, KG, ACRO, T&D, XCEL, etc.

**After clarification on Class Schedules:** May need terminology update. Gymsport might be right but could be predetermined list.

**Risk:** 🟡 Medium (if changing to predetermined list - DB changes needed)  
**Complexity:** Medium  
**Implementation:**
- [ ] Discuss: Keep generic "GymSports" or switch to predetermined list?
- [ ] Change icon to more appropriate option
- [ ] If predetermined: Create migration for sport types
- [ ] Update UI to reflect chosen approach

---

### 5. GYMSPORTS - Page Guidance
**Issue:** No page text to provide guidance  
**Requested:**
- Add page text/guidance explaining what GymSports are and how to use

**Risk:** 🟢 Low (UI text only)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add help text explaining GymSports concept
- [ ] Explain relationship to class schedules
- [ ] Add examples of common gymnastics sports

---

### 6. GYMSPORTS - Active Toggle Issue
**Issue:** Deactivate switch seems the same as delete with no way to reactivate  
**Current:** Active toggle switch causes content to disappear  
**Requested:**
- Differentiate deactivate from delete
- Add ability to reactivate deactivated items
- Make deactivated items visible with reactivation option

**Risk:** 🟡 Medium (Functional change, DB query updates)  
**Complexity:** Medium  
**Implementation:**
- [ ] Review current active/inactive toggle logic
- [ ] Add filter to show active/inactive/all items
- [ ] Implement reactivation functionality
- [ ] Add visual distinction for deactivated items
- [ ] Update database queries to handle inactive state properly

---

### 7. GYM ZONES - Page Guidance
**Issue:** No page text to provide guidance  
**Requested:**
- Add guidance about defining and managing gym zones/areas

**Risk:** 🟢 Low (UI text only)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add help text explaining zones concept
- [ ] Provide examples: Rec Beams, Competitive Beams, Ballet Bars, etc.

---

### 8. GYM ZONES - Venue Filter Context
**Issue:** "Add New Zone" card doesn't highlight which venue is being added to  
**Requested:**
- Consider adding text to highlight what venue the zone is being added to

**Risk:** 🟢 Low (UI enhancement)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add venue context text to "Add New Zone" card
- [ ] Display selected venue name prominently

---

### 9. GYM ZONES - Active Toggle Issue  
**Issue:** Same as GymSports - deactivate behavior unclear  
**Risk:** 🟡 Medium (Same fix as GymSports #6)  
**Implementation:** Combined with GymSports active toggle fix

---

### 10. GYM ZONES - Options Tooltips
**Issue:** "Allow overlay", "Active", "Priority First Zone" unclear  
**Requested:**
- Add tooltips explaining each option
- Example: "Allow Overlap" - allow multiple gymspots allocated to zone at same time
- "Priority First Zone" - ?

**Questions:**
- What does "Priority First Zone" do?

**Risk:** 🟢 Low (UI tooltips)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add tooltip for "Allow overlay" option
- [ ] Add tooltip for "Active" toggle
- [ ] Clarify and add tooltip for "Priority First Zone"

---

### 11. COACHES - Page Guidance & Import
**Issue:** No page guidance; coach import needs examples  
**Requested:**
- Add page text/guidance for Coaches section
- Add example for CSV import (template with populated individual coach info)

**Risk:** 🟢 Low (UI/documentation)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add help text for Coaches page
- [ ] Create CSV import template example
- [ ] Add download link for template

---

### 12. COACHES - Accreditations Section
**Issue:** Accreditation field needs improvements  
**Requested:**
- Make accreditation a list of recognized labeling (like GymSports discussion)
- Add expiry date tracking
- Build into compliance system

**CSV Import Issue:** Accreditation uploaded with error relating to accreditation

**Risk:** 🟡 Medium (DB schema changes, compliance integration)  
**Complexity:** Medium-High  
**Implementation:**
- [ ] Fix CSV import accreditation error
- [ ] Consider predetermined accreditation list
- [ ] Add expiry date field to coach accreditations
- [ ] Build integration with compliance manager
- [ ] Create migration for new fields

**Question:** Where are coach accreditations set up in the platform?

---

### 13. COACHES - Active/Inactive View
**Issue:** Cannot see inactive coaches; active/inactive toggle issues  
**Requested:**
- Add Archive/Inactive function
- Coach may go on maternity leave but not on placement
- Can't work for period of time but may still return

**Risk:** 🟡 Medium (Same as GymSports/Zones toggle issue)  
**Complexity:** Medium  
**Implementation:** Combined with other active/inactive toggle fixes

---

### 14. SYSTEM NOTIFICATIONS
**Issue:** None identified  
**Status:** No changes recommended

---

### 15. ROLES AND PERMISSIONS
**Issue:** None identified  
**Status:** No changes recommended

---

### 16. GENERAL - Setup Completion Guidance
**Issue:** After completing setup, no direction on next steps  
**Requested:**
- Add subtle numbered guide in top right (1-6)
- Suggested order: Venues → GymSports → Gym Zones → Coaches → System Notifications → Roles and Permissions

**Risk:** 🟢 Low (UI guidance)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add "What's Next?" guidance after setup completion
- [ ] Guide users toward next logical step
- [ ] Possibly add progress tracker

---

### 17. INDIVIDUAL CARD PAGES - Back Navigation
**Issue:** Navigation within card page back to main Club Management not intuitive  
**Requested:**
- Add obvious navigation back to "Club Settings and Management" page

**Risk:** 🟢 Low (UI navigation)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add clear breadcrumb navigation
- [ ] Add "Back to Club Management" button/link
- [ ] Review navigation patterns across all card pages

---

### 18. EQUIPMENT - Should it be in Setup?
**Question:** Should Equipment be added to the setup flow?  
**Status:** Needs decision  
**Implementation:** Pending user decision

---

## 🎯 IMPLEMENTATION PRIORITY

### Phase 1: Quick Wins (Low Risk, High Impact)
- Setup order indicators (#2)
- Text and label updates (#1, #3, #5, #7, #11)
- Tooltips (#10)
- Back navigation (#17)
- Setup completion guidance (#16)

### Phase 2: Functional Improvements
- Active/Inactive toggle fixes (#6, #9, #13)
- Icon changes (#4)
- Venue filter context (#8)

### Phase 3: Feature Enhancements
- GymSports terminology decision (#4)
- Coach accreditations system (#12)
- CSV import fixes (#12)

---

## ✅ PROGRESS TRACKER

**Total Items:** 18  
**Completed:** 0  
**In Progress:** 0  
**Blocked:** 0  
**Pending Decision:** 2 (#4 terminology, #18 equipment)

---

## 🚨 QUESTIONS NEEDING ANSWERS

1. **Priority First Zone** - What does this option do?
2. **Venue Information Usage** - Where is venue data used throughout platform?
3. **GymSport Accreditations** - Where are these configured?
4. **Equipment in Setup** - Should this be added to initial setup cards?
5. **GymSports Terminology** - Keep generic or switch to predetermined list (MAG, WAG, etc.)?

---

**Last Updated:** March 11, 2026
