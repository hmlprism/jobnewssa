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

---

## Batch: Auth/account features (2026-09-06)

### SQL to run first
Apply migration `0012_storage_avatars.sql` via Supabase dashboard or CLI before testing avatar upload.
The avatars bucket must exist for upload to succeed.

---

### 8. Profile — employer sees no Job preferences section

- [ ] Log in as employer → `/profile/edit` → "Job preferences" section (Preferred province, Preferred contract type, Minimum desired salary) is **not visible**
- [ ] Log in as job seeker → `/profile/edit` → "Job preferences" section **is visible**

---

### 9. Password visibility toggle — login page

- [ ] Visit `/auth/login` → password field has an eye icon button on the right
- [ ] Clicking the eye shows the password as plain text; icon switches to eye-off
- [ ] Clicking again hides the password; icon switches back to eye
- [ ] Email field has no toggle (text field, not needed)

---

### 10. Password visibility toggle — signup page

- [ ] Visit `/auth/signup` → both "Password" and "Confirm password" fields have independent eye toggles
- [ ] Toggling one does not affect the other

---

### 11. Confirm password — signup page

- [ ] Fill in matching passwords → form submits normally, no error
- [ ] Fill in mismatching passwords → submit blocked; "Passwords don't match." error shown inline below the Confirm password field
- [ ] Correcting the confirm password field → error clears before re-submit (clears on change)
- [ ] Empty confirm password → HTML5 required prevents submit

---

### 12. Forgot password flow

- [ ] Visit `/auth/login` → "Forgot password?" link is visible next to the Password label
- [ ] Clicking the link navigates to `/auth/forgot-password`
- [ ] Entering a valid email and submitting → "Check your email" confirmation screen shown (do NOT confirm whether the email exists — same message regardless)
- [ ] Entering an unregistered email → same "Check your email" screen (no enumeration)
- [ ] Check email inbox → reset email received with a link
- [ ] Clicking the reset link → arrives at `/auth/reset-password` (via `/auth/callback?code=...&next=/auth/reset-password`)
- [ ] `/auth/reset-password` shows two password fields, both with visibility toggles
- [ ] Entering mismatched passwords → "Passwords don't match." error, no Supabase call
- [ ] Entering matching passwords under 6 chars → "Password must be at least 6 characters." error
- [ ] Entering valid matching passwords → success message "Password updated" shown; redirected to `/auth/login` after ~2.5 seconds
- [ ] Trying to use the same reset link again → "This reset link has expired or already been used." error with "Request a new reset link" link shown
- [ ] "Back to sign in" link on forgot-password page works

---

### 13. Account settings page

**Access:**
- [ ] Logged-in user → header shows "Account settings" link next to "My Profile"
- [ ] Clicking "Account settings" → navigates to `/account/settings`
- [ ] Not logged in → `/account/settings` redirects to `/auth/login`

**Profile section:**
- [ ] Page shows current full name (pre-filled) and current email (read-only)
- [ ] Email field has note "Email cannot be changed here"
- [ ] Changing full name and saving → "Changes saved." confirmation; header name updates after the save (router.refresh flushes the cached server component)
- [ ] Saving with empty name → saves null (field is optional; no crash)

**Avatar upload:**
- [ ] No avatar set → placeholder initial letter shown
- [ ] Clicking "Upload picture" → file picker opens, accepts JPEG/PNG/WebP only
- [ ] Selecting a >2 MB image → "Image must be under 2 MB." error shown; file not staged
- [ ] Selecting a valid image → preview thumbnail shown immediately (before saving)
- [ ] Saving → image uploaded to avatars bucket at `{userId}/avatar.{ext}`; public URL stored in `profiles.avatar_url`
- [ ] Refreshing page → uploaded avatar shown in the 64×64 preview
- [ ] Uploading a replacement → upsert overwrites previous file at same path

**Password change section:**
- [ ] Entering wrong current password → "Current password is incorrect." error; no password change
- [ ] Entering correct current password + new password + mismatched confirm → "Passwords don't match." error
- [ ] New password < 6 chars → "New password must be at least 6 characters." error
- [ ] All fields correct → "Password updated." confirmation; old password no longer works for login
- [ ] All three password fields have visibility toggles that work independently

---

### Notes

- Avatar bucket (`avatars`) is **public** read; write is RLS-scoped to `{userId}/` folder. No signed URLs needed for display.
- Avatars are stored as public URLs in `profiles.avatar_url` (not paths), so they render as plain `<img src>` without a Supabase call.
- The password-change flow re-authenticates with `signInWithPassword` before calling `updateUser` — this is the current-password verification step. Supabase does not natively expose a verify-only endpoint; re-auth is the standard pattern.

---

## Batch: Messaging UX — optimistic fix, Enter key, /messages inbox (2026-09-06)

### Root-cause notes (for reference)
The "message still disappearing" bug was in the optimistic state model. The previous fix used a single `messages` state that a `useEffect` overwrote with `initialMessages` on every router.refresh() — if the refresh beat the DB write, the stale initialMessages (length N) compared against local state (N+1) and the guard `N >= N+1` held, BUT a subsequent re-render could still trigger the effect with a new array reference and overwrite. The new approach uses two separate arrays: `initialMessages` (server truth, prop) and `optimisticMessages` (locally-sent, state). The display list is their union; the effect only prunes confirmed entries from `optimisticMessages`. A stale refresh cannot erase an optimistic message regardless of timing.

---

### 14. Messaging — optimistic update (re-test)

- [ ] On the thread page, send a message → message appears immediately **without** any visible flash, disappearance, or skeleton
- [ ] After ~1s (router.refresh() completes), the message remains visible with no disruption
- [ ] Send two messages quickly in succession → both appear immediately; neither disappears
- [ ] Scroll position is not disrupted when the optimistic→server transition happens
- [ ] Reload the page → both messages are in the server-rendered list

### 15. Messaging — Enter key sends

- [ ] Typing in the message textarea and pressing **Enter** sends the message (same as clicking Send)
- [ ] **Shift+Enter** inserts a newline and does NOT send
- [ ] Sending an empty message via Enter does nothing (no request fired, no error shown)
- [ ] While a send is in progress (sending state), pressing Enter again has no effect

### 16. Messages nav link + unread badge

- [ ] Logged-in user sees "Messages" in the main header nav (between "Post a job" and the user menu area)
- [ ] Logged-out user does NOT see the Messages link in nav
- [ ] When there are no unread messages: no badge shown, just the word "Messages"
- [ ] When there are unread messages (sent by other party, read_at IS NULL): a rust-coloured badge appears to the right of "Messages" with the count
- [ ] After opening the thread (which marks messages as read): badge disappears on next page load
- [ ] Badge count caps at "99+" for counts above 99
- [ ] The badge has no border-radius (square/rectangular, per design system)

### 17. /messages inbox page

**Access and routing:**
- [ ] Logged-out → `/messages` redirects to `/auth/login`
- [ ] Logged-in → page loads and shows inbox

**Empty state:**
- [ ] User with no applications sees the empty state panel with "No conversations yet"
- [ ] Empty state has links to "Find jobs to apply for" and "My applications"

**Conversation list — general:**
- [ ] Each conversation shows: other party name · job title on one line; message preview below; timestamp top-right; unread count badge if applicable
- [ ] Conversations are sorted newest-first by last message timestamp
- [ ] Threads with no messages appear below threaded conversations (sorted last)
- [ ] Clicking a conversation row navigates to `/applications/[applicationId]/thread`

**Unread indicator:**
- [ ] Conversation with unread messages has a rust left border stripe (2px)
- [ ] Unread message count badge shown in top-right of the row
- [ ] After opening the thread: row no longer shows unread indicator on next visit to /messages

**Conversation preview:**
- [ ] Message preview shows first line of the body, truncated at 80 chars with "…"
- [ ] Multi-line messages show only the first line in the preview
- [ ] Thread with no messages shows "No messages yet" as preview (no timestamp)

**Role grouping:**
- [ ] User who only has job-seeker conversations: single flat list, no role labels
- [ ] User who only has employer conversations: single flat list, no role labels
- [ ] User with BOTH seeker and employer conversations: two labelled sections — "AS JOB SEEKER" and "AS EMPLOYER"

**Timestamp format:**
- [ ] Message from today → shows time only (e.g. "14:23")
- [ ] Message from yesterday → shows "Yesterday"
- [ ] Message from earlier this week → shows weekday (e.g. "Mon")
- [ ] Older → shows "3 Sep" or "3 Sep 2025" for cross-year

---

### Notes
- No SQL migration needed for this batch — all queries use existing schema and RLS.
- The unread count in the header runs in parallel with `getAuthProfile()` using `Promise.all` — no added serial latency.
- The `/messages` page fetches all messages for the user's threads in two queries (applications, then messages). This is adequate for a job board where conversation volume is low. If message volume grows significantly, replace with a server-side aggregate (RPC or view).
