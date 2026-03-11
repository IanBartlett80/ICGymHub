# Class Rostering & Templates - Beta Feedback & Implementation Plan

**Feature Area:** Class Rostering, Templates & Schedules  
**Date Received:** March 11, 2026  
**Status:** Not Started  
**Priority:** HIGH (Critical bugs identified)  
**Risk Level:** Medium-High

---

## 🚨 CRITICAL ISSUES

### 🔴 Failed to Load Rosters
**Issue:** Rosters failing to load  
**Suspected Cause:** Access token expiring - admin not prompted to refresh token and re-sign in  
**Impact:** Blocking functionality  
**Priority:** URGENT  

**Investigation Needed:**
- [ ] Check token refresh logic in authentication flow
- [ ] Verify token expiration handling
- [ ] Test re-authentication prompt when token expires
- [ ] Review session management (NextAuth configuration)
- [ ] Check API route authentication middleware

**Files to Review:**
- NextAuth configuration
- API route middleware
- Token refresh logic
- Session handling

---

### 🔴 Failed to Load Venues (Dropdown)
**Issue:** Venue dropdown showing "Failed to load venues"  
**Impact:** Cannot add new class templates  
**Priority:** URGENT  

**Investigation Needed:**
- [ ] Check venue API endpoint
- [ ] Verify database query
- [ ] Check authentication on venue endpoint
- [ ] Review error logs

---

### 🔴 Session Token Expiring During Form Entry
**Issue:** When adding a class template, session token expires requiring re-login  
**Current Behavior:**
- User starts filling out form
- Token expires mid-session
- User forced to re-login
- Captured data on page NOT displayed on re-login
- User has to start over

**Impact:** Data loss, poor UX, user frustration  
**Priority:** URGENT  

**Requested:**
- Prevent token expiry during active form entry
- Save form data before forcing re-login
- Restore unsaved data after re-authentication
- Give warning before token expires

**Implementation Needed:**
- [ ] Implement auto token refresh during active sessions
- [ ] Add form data persistence (localStorage/sessionStorage)
- [ ] Restore form state after re-authentication
- [ ] Add token expiry warning countdown
- [ ] Consider extending session timeout for active users
- [ ] Implement draft/auto-save functionality

---

## 📋 FEEDBACK ITEMS

### 1. DASHBOARD - Label Inconsistency
**Issue:** Active tab says "Dashboard", header says "Class Rostering and 'Roster Management'"  
**Current:** Inconsistent labeling between tab and header  
**Requested:**
- Standardize naming throughout platform
- Consider "Coaches" tab vs "Coaching" tab consistency

**Risk:** 🟢 Low (UI text only)  
**Complexity:** Simple  
**Implementation:**
- [ ] Decide on standard terminology: "Dashboard" vs "Class Rostering"
- [ ] Update all references consistently
- [ ] Review other tabs for similar inconsistencies

---

### 2. DASHBOARD - Data Presentation
**Issue:** Data showing as historical, yet not displaying anything  
**Current:** No data being presented  
**Requested:**
- Clarify purpose: Is this information/reporting page?

**Risk:** 🟡 Medium (Functionality unclear)  
**Complexity:** Medium  
**Investigation:**
- [ ] Clarify intended purpose of dashboard
- [ ] Determine what data should be displayed
- [ ] Check if data retrieval is working
- [ ] Design dashboard layout based on requirements

---

### 3. MANAGE COACHES - Coaches Tab Information
**Issue:** Coaches tab information should be merged with setup  
**Requested:**
- Consider having coach accreditations as part of setup vs labeling
- Controlled accreditation list over free text
- Having coach accreditations become a compliance item
- This could potentially be a few hours feature

**Risk:** 🟡 Medium (Integration with compliance system)  
**Complexity:** Medium  
**Implementation:**
- [ ] Review current coach setup vs. coaches tab
- [ ] Plan accreditation integration with compliance
- [ ] Decide on controlled list vs. free text
- [ ] Create migration plan

---

### 4. MANAGE COACHES - Accreditation Field
**Issue:** Accreditation field needs to be list of recognized labeling over free text  
**Related to:** Club Management #12  
**Risk:** 🟡 Medium  
**Implementation:** See Club Management feedback file

---

### 5. MANAGE COACHES - Import Functions
**Issue:** Import functions need improvement  
**Note:** Import CSV by individual added (duplication of records easily created)  
**Requested:**
- Better handling of duplicate prevention
- Better import process

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Implementation:**
- [ ] Add duplicate detection on import
- [ ] Provide preview before import commit
- [ ] Add update vs. create logic for existing coaches
- [ ] Better error handling and reporting

---

### 6. LIST OF COACHES - Active/Inactive Functionality
**Issue:** Cannot toggle between active and inactive coaches  
**Requested:**
- Add Archive/Inactive function
- Coach may go on maternity leave but still in placement
- Can't work but may return

**Risk:** 🟡 Medium (Related to other active/inactive issues)  
**Implementation:** Combined with Club Management active/inactive fixes

---

### 7. MANAGE CLASS TEMPLATES - Guidance Text
**Issue:** Section should have text guiding user  
**Requested:**
- Add guidance about immediate reference vs. starting new roster when using templates
- Explain that everything has been saved

**Risk:** 🟢 Low (UI text)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add help text explaining template usage
- [ ] Clarify saved vs. unsaved state
- [ ] Explain template vs. roster relationship

---

### 8. MANAGE CLASS TEMPLATES - Copy/Clone Feature
**Issue:** No way to duplicate existing templates  
**Requested:**
- Add copy or clone option that prefills a new class with same information
- Same options in copied class would appear in class creation
- Useful for clubs with classes across multiple days & times (e.g., Kindergym 9am and Kindergym 10am)

**Risk:** 🟡 Medium (New feature)  
**Complexity:** Medium  
**Implementation:**
- [ ] Add "Clone Template" button/option
- [ ] Copy all template configuration
- [ ] Allow user to modify cloned data before saving
- [ ] Update UI to support clone workflow

**Example Use Case:** Same class at different times (Kindergym 9am, Kindergym 10am)

---

### 9. MANAGE CLASS TEMPLATES - Table Format
**Issue:** Class Templates table format needs improvement  
**Current:** Format of all fields columns needs to be reviewed  
**Screenshot shows:** Table with Date, Venue, Class information  
**Note in image:** "No venue" appearing in some rows

**Risk:** 🟢 Low (UI formatting)  
**Complexity:** Simple  
**Implementation:**
- [ ] Review and improve table column formatting
- [ ] Fix "No venue" display issue
- [ ] Ensure consistent date formatting
- [ ] Make table responsive

---

### 10. MANAGE CLASS TEMPLATES - Button Visual State
**Issue:** "Manage Class Templates" button not showing as active/selected  
**Current:** Button doesn't show active state when section is selected  
**Impact:** Poor UX, unclear navigation state

**Risk:** 🟢 Low (UI styling)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add active state styling to button
- [ ] Ensure consistent active states across navigation
- [ ] Review CSS for button states

---

### 11. ROSTER TEMPLATES & SCHEDULES - Data Capture Issues
**Issue:** After selecting coaches, display showing but stopping  
**Current Problems:**
- Coaches that have been set up don't show in dropdown/list when selecting
- After clicking out and back in, selections are persistent

**Requested:**
- Capture all staff essential information
- Allow copy/paste from WWCC/Bike Card for:
  - External/contract staff
  - Date - Link to anniversary notice
  - Time of day
- Level of participation

**Could this version include:**
- Staff base requests
- Auto highlight when class is not covered for setup session taken down

**Risk:** 🟡 Medium (Data persistence & UI issues)  
**Complexity:** Medium  
**Implementation:**
- [ ] Fix coach dropdown population
- [ ] Fix data persistence on navigation
- [ ] Add WWCC/Bike Card paste functionality
- [ ] Add date fields for compliance tracking
- [ ] Add participation level field
- [ ] Investigate auto-highlight for uncovered classes

**Note:** Seems to be some bugs with this module

---

### 12. ROSTER TEMPLATES - Error Display After Creating
**Issue:** After creating a roster, error display shows  
**Current:** "Error display after creating a roster" shown in screenshot  
**Priority:** High (User-facing error)

**Investigation Needed:**
- [ ] Review error logs
- [ ] Check roster creation success/failure flow
- [ ] Fix error handling
- [ ] Provide better user feedback

---

### 13. ROSTER TEMPLATES - Session Token Expiry (CRITICAL)
**Covered in Critical Issues section above**

---

### 14. ROSTER TEMPLATES - Version Control Request
**Issue:** Would like to version control for session rosters  
**Requested:**
- Track changes to rosters over time
- Understand different ways to implement this

**Questions:**
- What should be tracked? (All changes, coach assignments, time changes?)
- How far back should history go?
- What should users see? (Audit log, comparison view?)
- Who can see version history?

**Risk:** 🟡 Medium-High (New feature, DB schema changes)  
**Complexity:** High  
**Implementation Planning:**
- [ ] Define version control requirements
- [ ] Design audit log schema
- [ ] Consider soft deletes vs. version snapshots
- [ ] Plan UI for viewing version history
- [ ] Consider using temporal tables or change tracking

**Possible Approaches:**
1. **Full Version Snapshots** - Save complete roster state on each change
2. **Change Log Approach** - Track individual field changes with timestamps
3. **Temporal Tables** - Database-level version tracking
4. **Hybrid** - Snapshots + change log for critical fields

---

## 🎯 IMPLEMENTATION PRIORITY

### 🔴 Phase 0: CRITICAL BUGS (MUST FIX FIRST)
1. Token refresh/expiry handling (#Critical 1, #13)
2. Failed to load venues (#Critical 2)
3. Failed to load rosters (#Critical 1)
4. Form data persistence on re-auth (#Critical 1)
5. Error display after roster creation (#12)

### Phase 1: Quick Wins (Low Risk, High Impact)
- Label consistency (#1)
- Guidance text (#7)
- Button active state (#10)
- Table formatting (#9)

### Phase 2: Functional Improvements
- Coach dropdown/data issues (#11)
- Active/inactive toggle (#6)
- Import duplicate prevention (#5)
- Dashboard clarification (#2)

### Phase 3: Feature Enhancements
- Copy/clone templates (#8)
- Accreditation integration (#3, #4)
- Version control planning (#14)

---

## ✅ PROGRESS TRACKER

**Total Items:** 14 feedback items + 3 critical bugs = 17 total  
**Critical Bugs:** 3  
**Completed:** 0  
**In Progress:** 0  
**Blocked:** 0  

---

## 🚨 QUESTIONS NEEDING ANSWERS

1. **Dashboard Purpose** - Is this an information/reporting page? What should display?
2. **Version Control Requirements** - What should be tracked? How far back? Who can see?
3. **Coach Accreditation Integration** - Should this merge with compliance system?
4. **Import Process** - CSV import by individual or bulk? How to handle duplicates?
5. **Staff Coverage** - Auto-highlight uncovered classes - exact requirements?

---

## 🔍 TECHNICAL INVESTIGATION REQUIRED

### Token/Session Management
- Review NextAuth configuration
- Check token expiration settings
- Implement token refresh strategy
- Add session persistence

### Data Loading Issues
- Debug venue loading failure
- Debug roster loading failure
- Review API error handling
- Check database connections

### Form State Management
- Implement form autosave
- Add localStorage backup
- Session recovery on re-auth
- Warning system for unsaved changes

---

## 📝 NOTES

**User Comment:** "Failed to Load Rosters errors was due to access token expiring, so need to also check why admin was not prompted to refresh token and re-sign in"

This suggests:
- Session timeout is too short for normal usage
- Token refresh mechanism not working
- Re-authentication prompt not triggering
- Need to review entire auth flow

---

**Last Updated:** March 11, 2026
