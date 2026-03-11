# Injury & Incident Management - Beta Feedback & Implementation Plan

**Feature Area:** Injury & Incident Management, Report Forms & Automations  
**Date Received:** March 11, 2026  
**Status:** Not Started  
**Priority:** HIGH  
**Risk Level:** Medium

---

## 📋 FEEDBACK ITEMS

### 1. AUTOMATIONS - Email Configuration
**Issue:** Email automation setup unclear  
**Current:** Automation configuration needs better guidance  
**Visible in Screenshot:** Automations section highlighted at top

**Risk:** 🟢 Low (UI/documentation)  
**Complexity:** Simple  
**Implementation:**
- [ ] Add clear instructions for email automation setup
- [ ] Provide examples of automation triggers
- [ ] Add help text explaining automation workflow
- [ ] Ensure email configuration is properly documented

---

### 2. AUTOMATIONS - Email Setup and Configuration Fields
**Issue:** Red boxes highlighting fields in automations section  
**Observed:** Multiple fields appear to need attention/clarification

**Risk:** 🟡 Medium (Depends on specific issues)  
**Complexity:** TBD  
**Investigation Needed:**
- [ ] Clarify which automation fields need improvement
- [ ] Determine if fields are functional or UI issues
- [ ] Review automation trigger setup
- [ ] Check email template configuration

**Questions:**
- What specific fields in automations need fixing?
- Are automations working properly?
- What email triggers should be available?

---

### 3. FORM TEMPLATES - UI/Functionality Issues
**Issue:** Red box highlighting Form Templates section  
**Observed:** Issues with form template management

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Identify specific form template issues
- [ ] Review template creation workflow
- [ ] Check template editing functionality
- [ ] Verify template deletion/archiving

**Questions:**
- What specific issues exist with form templates?
- Is template creation working properly?
- Are there missing fields or options?

---

### 4. INJURY REPORT FORMS - Multiple Issues Highlighted
**Issue:** Several areas highlighted in red boxes in Injury Report Forms section  
**Observed:** Multiple UI or functional issues

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Identify all highlighted issues in report forms
- [ ] Review form submission workflow
- [ ] Check form field validation
- [ ] Verify data saving properly

---

### 5. INJURY REPORTS - "Back to Report" Navigation
**Issue:** NEEDS TO HONOUR BACK TO REPORT  
**Current:** Navigation not working as expected  
**Impact:** Poor user experience, difficult navigation

**Risk:** 🟡 Medium (Navigation flow)  
**Complexity:** Simple-Medium  
**Implementation:**
- [ ] Fix "Back to Report" button functionality
- [ ] Ensure navigation returns to correct context
- [ ] Preserve any unsaved data or state
- [ ] Test navigation flow from report details

---

### 6. INJURY & INCIDENT MANAGEMENT - Compliance Integration
**Issue:** Recommend adding incident expiry date and building into compliance  
**Requested:**
- Add expiry date tracking for injury incidents
- Integrate with compliance manager system
- Track follow-up requirements
- Set reminders for incident reviews

**Risk:** 🟡 Medium (DB schema changes, compliance integration)  
**Complexity:** Medium-High  
**Implementation:**
- [ ] Add expiry date field to injury/incident records
- [ ] Create relationship with compliance manager
- [ ] Add automatic compliance item creation
- [ ] Set up notifications for expiring incidents
- [ ] Create migration for new fields
- [ ] Design UI for expiry date management

**Related To:** Compliance Manager integration  
**Database Changes:** Yes - new fields required

---

### 7. FORM BUILDER - Field Configuration
**Issue:** Areas highlighted in form builder/template section  
**Observed:** Possible issues with field types or configuration

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Review form builder field options
- [ ] Check field validation settings
- [ ] Verify required/optional field configuration
- [ ] Test conditional field logic (if applicable)

---

### 8. SUBMISSION DETAILS - Display/Layout Issues
**Issue:** Red boxes in submission details section  
**Observed:** Layout or data display issues

**Risk:** 🟢 Low (UI display)  
**Complexity:** Simple-Medium  
**Investigation Needed:**
- [ ] Review submission details layout
- [ ] Check data formatting
- [ ] Verify all submitted data displays correctly
- [ ] Ensure responsive design

---

### 9. ALL INJURY REPORTS - List View Issues
**Issue:** Bottom section showing "All Injury Reports" has highlighted areas  
**Observed:** Possible filtering, sorting, or display issues

**Risk:** 🟢 Low (UI/UX)  
**Complexity:** Simple-Medium  
**Investigation Needed:**
- [ ] Review reports list functionality
- [ ] Check filtering options
- [ ] Verify sorting capabilities
- [ ] Test search functionality
- [ ] Review column display and formatting

---

### 10. INJURY REPORT DETAILS - Information Display
**Issue:** Highlighted sections in injury report details view  
**Observed:** Data presentation or layout concerns

**Risk:** 🟢 Low (UI display)  
**Complexity:** Simple  
**Investigation Needed:**
- [ ] Review report details layout
- [ ] Check all fields display correctly
- [ ] Verify data formatting (dates, times, etc.)
- [ ] Ensure proper sectioning of information

---

### 11. FORM SUBMISSION WORKFLOW
**Issue:** Overall submission process needs review (based on highlighting)  
**Observed:** Multiple areas highlighted suggest workflow issues

**Risk:** 🟡 Medium  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Map complete submission workflow
- [ ] Test end-to-end form submission
- [ ] Verify data persistence
- [ ] Check confirmation/success messages
- [ ] Review error handling

---

### 12. EMAIL NOTIFICATIONS - Automation Configuration
**Issue:** Email automation setup appears problematic (highlighted at top)  
**Observed:** Configuration fields or workflow unclear

**Risk:** 🟡 Medium (Core notification feature)  
**Complexity:** Medium  
**Investigation Needed:**
- [ ] Review email notification triggers
- [ ] Check email template configuration
- [ ] Verify automation rules
- [ ] Test email sending functionality
- [ ] Review recipient configuration

---

## 🎯 IMPLEMENTATION PRIORITY

### 🔴 Phase 0: INVESTIGATION REQUIRED (Need Specific Details)
Most items need clarification on specific issues:
- Automations configuration (#1, #2, #12)
- Form templates (#3)
- Report forms (#4)
- Form builder (#7)

### Phase 1: Quick Wins (Clear Requirements)
- Back to Report navigation (#5)
- Report details display (#10)
- All reports list view (#9)

### Phase 2: Feature Enhancements
- Expiry date & compliance integration (#6)
- Submission workflow improvements (#11)

### Phase 3: Deep Investigation
- Complete automation system review
- Form builder enhancements
- Email notification system

---

## ✅ PROGRESS TRACKER

**Total Items:** 12  
**Completed:** 0  
**In Progress:** 0  
**Needs Clarification:** 8  
**Clear Requirements:** 4  

---

## 🚨 QUESTIONS NEEDING ANSWERS

### CRITICAL - Need Details on These Items:
1. **Automations Section** - What specific fields/issues in the highlighted areas?
2. **Form Templates** - What is the red box highlighting? What's broken?
3. **Injury Report Forms** - What are the specific issues in the highlighted areas?
4. **Form Builder** - What field configuration issues exist?
5. **Email Notifications** - What's not working with automation setup?

### Feature Requirements:
6. **Expiry Date Integration** - What should trigger expiry? What happens when expired?
7. **Compliance Integration** - Should ALL incidents create compliance items? Or only certain types?
8. **Follow-up Workflow** - What's the expected follow-up process for incidents?

### Workflow Questions:
9. **Submission Process** - Is the complete workflow working? Where does it break?
10. **Report Access** - Who can view/edit injury reports? Any permission issues?

---

## 🔍 TECHNICAL AREAS TO INVESTIGATE

### Email & Automations System
- Review automation configuration interface
- Check email template system
- Verify trigger logic
- Test email sending (Azure/Entra integration)
- Review automation rules storage

### Form Builder & Templates
- Review form field types available
- Check validation rules
- Test conditional logic
- Verify form persistence
- Check template management

### Report Submission & Display
- Test complete submission workflow
- Review data storage
- Check report detail views
- Verify list filtering/sorting
- Test navigation flows

### Compliance Integration
- Design expiry date tracking
- Plan compliance item creation
- Design notification system
- Create schema for new fields

---

## 📝 NOTES

**Key Observation:** Many items highlighted in screenshot but specific issues unclear. Need detailed clarification from user on:
- What exactly is broken in each highlighted section?
- What is the expected behavior vs. current behavior?
- Are these bugs, missing features, or UX improvements?

**Priority Request:** Injury & Incident Management appears to be a critical feature. Getting specific details on issues will help prioritize fixes effectively.

**Compliance Integration:** This is the clearest requirement - adding expiry dates and compliance manager integration for incidents. This is a valuable feature that should be prioritized once technical issues are resolved.

---

## 🔄 NEXT STEPS

Before implementing, need user to provide:
1. **Specific descriptions** of what each red box/highlight represents
2. **Expected behavior** vs. current behavior for each issue
3. **Priority ranking** of which issues are most critical
4. **Use cases** for expiry date and compliance integration

**Recommendation:** Schedule detailed walkthrough of Injury & Incident Management module to identify exact pain points and issues.

---

**Last Updated:** March 11, 2026

---

## 🎯 CONFIRMED REQUIREMENTS

### Clear Item: Expiry Date & Compliance Integration
**Feature Request:** Add incident expiry date and build into compliance

**Proposed Implementation:**
1. **Database Schema:**
   ```
   InjurySubmission:
     + expiryDate: DateTime?
     + complianceItemId: String? (FK to ComplianceItem)
     + followUpRequired: Boolean
     + followUpNotes: String?
   ```

2. **Compliance Integration:**
   - Auto-create compliance item when incident marked for follow-up
   - Link incident to compliance tracker
   - Set due dates based on incident severity
   - Automatic notifications when approaching expiry

3. **UI Changes:**
   - Add expiry date field to incident form
   - Show expiry status in incident list
   - Highlight expiring/expired incidents
   - Link to related compliance items

**Risk:** 🟡 Medium (DB changes, new integration)  
**Complexity:** Medium-High  
**Estimated Effort:** 6-8 hours  

**Prerequisites:**
- Compliance Manager must be functional
- Define expiry rules based on incident type
- Design notification workflow

---

**Status:** Ready for implementation once current bugs are resolved and requirements confirmed.
