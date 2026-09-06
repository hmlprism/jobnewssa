# Pending Tests

Manual verification steps for shipped features. Ask for this file when ready to test.

---

## Batch: Messaging real-time + profile section fixes (2026-09-06)

### 1. Messaging — sent message appears immediately

**Setup:** Two browser sessions open, one employer, one job seeker, on the same application thread page.

- [ ] Job seeker sends a message → message appears in their browser **without** any manual refresh
- [ ] Sent message is right-aligned with dark background (ink colour)
- [ ] Timestamp shows "Today at HH:MM"
- [ ] After sending, the textarea clears and the Send button is re-enabled
- [ ] Employer refreshes their page → sees the job seeker's message (confirms DB write succeeded)
- [ ] Employer sends a reply → appears immediately in employer's browser
- [ ] Job seeker refreshes → sees employer's reply

**Failure mode to watch for:** Message appearing for a moment then disappearing — would indicate the `router.refresh()` returned stale data that overwrote the optimistic update. If this happens, note the delay between send and disappearance.

- [ ] Simulate send failure: temporarily break network → error message "Failed to send. Please try again." appears; no ghost message in list

### 2. Messaging — skeleton and layout

- [ ] Initial page load shows the skeleton (two grey rectangles) then resolves to real content
- [ ] "← Back to applicants" link present when navigating from employer dashboard (with `?from=<jobId>`)
- [ ] "← Back to my applications" link present when navigating from job seeker side (no `?from` param)

---

### 3. Profile — employer sees no resume section

- [ ] Log in as an employer account → go to `/profile/edit`
- [ ] "Resume" section (heading, file picker, "Resume on file" / "A resume is required…" text) is **not visible**
- [ ] All other sections (Basic information, Qualifications, Work authorisation, Job preferences, Employment equity) remain visible

- [ ] Log in as a job seeker → go to `/profile/edit`
- [ ] "Resume" section **is visible** in the correct position (top, before Basic information)

---

### 4. Profile — phone number validation

- [ ] `082 123 4567` → accepted (no error shown)
- [ ] `0821234567` → accepted (no error)
- [ ] `+27 82 123 4567` → accepted (no error)
- [ ] `+27821234567` → accepted (no error)
- [ ] Empty phone field → accepted (field is optional)
- [ ] `12345` → error: too short / not a valid SA number
- [ ] `abc1234` → error: "must contain digits only"
- [ ] `123456789012` → error: format not recognised (too many digits, doesn't start with 0 or +27)
- [ ] Error appears inline below the phone field (not in the global error area)
- [ ] Attempting to save with a phone error → save is blocked; error "Please fix the errors above before saving." shown
- [ ] Correcting the phone number → error clears; save proceeds

---

### 5. Profile — city/town datalist autocomplete

- [ ] Clicking into the City / Town field and typing "Jo" → dropdown suggestions include "Johannesburg"
- [ ] Typing "Ca" → "Cape Town" appears as a suggestion
- [ ] Typing "Pol" → "Polokwane" appears
- [ ] Selecting a suggestion from the list populates the field
- [ ] Typing a city NOT in the list (e.g. "Mitchells Plain") → still accepted; no validation error
- [ ] Saving with a custom city → saves correctly to the database

---

### 6. Profile — professional registration format validation

- [ ] Empty field → accepted (no error)
- [ ] `HPCSA: PR123456` → accepted (no error; HPCSA format is too varied to validate strictly)
- [ ] `HPCSA:` (prefix only, no number) → error: "Please include your HPCSA registration number after the prefix."
- [ ] `SAICA: 12345678` → accepted (8 digits, correct)
- [ ] `SAICA: 1234567` → error: "SAICA membership numbers are 8 digits"
- [ ] `SAICA: 123456789` → error: "SAICA membership numbers are 8 digits"
- [ ] `ECSA: 123456` → accepted (numeric, correct)
- [ ] `ECSA: ABC123` → error: "ECSA registration numbers are numeric"
- [ ] `SACAP: 12345` → accepted
- [ ] `SACAP: ABC!@#` → error: "Check your SACAP number format"
- [ ] `Some random text` → accepted (unrecognised prefix, no format check applied)
- [ ] "Self-reported — not independently verified." disclaimer is visible below the field in all cases
- [ ] Attempting to save with a prof reg error → save is blocked

---

### 7. Profile — save with all validations passing

- [ ] Fill in a valid phone, city from datalist, valid prof reg (or empty) → Save profile → "Profile saved." confirmation shown
- [ ] Refresh the page → saved values persist (confirming DB write)

---

## Notes

- No SQL migrations needed for this batch — all changes are client-side validation and UI conditionals.
- The `send-message-form.tsx` component is now superseded by `message-thread.tsx` but left in place. It can be deleted in a future cleanup pass.
