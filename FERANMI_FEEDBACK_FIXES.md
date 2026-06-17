# Feranmi Oguns WhatsApp feedback — app fixes

Source: WhatsApp chat `Feranmi Oguns`, screenshots downloaded to:
`/Users/dandiggas/Desktop/feranmi-app-feedback-whatsapp/`

Images:
- `feranmi_feedback_01_1781333863.jpg` — registration duplicate email failure
- `feranmi_feedback_02_1781333970.jpg` — add YouTube track failure
- `feranmi_feedback_03_1781334094.jpg` — licks/loop UI praise: “Love this”

## 1. Register screen: duplicate email UX is too blunt

Observed screenshot:
- Screen: `Join The Shed` registration.
- User entered username `soundslikefez` and email `hi@soundslikefez.com`.
- UI shows a global error: `We couldn't create your account. Please check the form and try again.`
- Then inline under email: `User is already registered with this e-mail address.`

Problem:
- The generic global error makes it feel like the app is broken, even though the actual issue is clear: the account already exists.
- The next action is missing. A tester should immediately be offered `Sign in` / `Reset password` / `Resend verification`.

Fix:
- If backend returns field errors, do not show the generic global error as well.
- For duplicate email, show a friendlier inline message:
  `Looks like this email already has an account. Sign in instead or reset your password.`
- Add inline CTAs under the email field:
  - `Sign in`
  - `Reset password`
  - optionally `Resend verification email` if unverified users are common.

Relevant file:
- `frontend/next-app/src/components/auth/RegisterPage.tsx`

Likely code direction:
- In failed registration response handling, only set `detail` fallback when there are no field-specific errors.
- Detect duplicate email text and render the sign-in/reset CTA near the email error.

Priority: P1 — easy polish, makes onboarding feel less broken.

## 2. Add Track screen: YouTube save fails with raw `Failed to fetch`

Observed screenshot:
- Screen: `Add track`
- Track name: `wicked`
- Source type: `YouTube`
- YouTube URL: `https://youtu.be/fQOXsG8YxvM?si=...`
- BPM: `120`
- Error shown: `Failed to fetch`

Problem:
- `Failed to fetch` is a raw browser/network error. It gives the user no useful next action.
- The entered YouTube short URL is valid enough that the app should either save it or return a clear backend/proxy error.
- Live GET checks show the proxy endpoint is reachable unauthenticated, so this likely happens during POST/proxy/backend failure, not a totally dead frontend.

Fixes:
1. Backend/proxy resilience:
   - Wrap the Next `/api/django/[...path]` proxy fetch in try/catch.
   - If Django is unreachable or fetch throws, return a JSON `502` response instead of letting the route crash:
     `{"detail":"The app server could not be reached. Please try again."}`
   - This prevents the browser from surfacing raw `Failed to fetch`.

2. Frontend error copy:
   - In `createTrack` / `AddTrackForm`, map fetch/network errors to:
     `We couldn't save this track because the app server didn't respond. Please try again.`
   - If the backend returns field errors, show the relevant field message near the field.

3. YouTube URL validation:
   - Accept and normalize `youtu.be/...`, `youtube.com/watch?v=...`, and `youtube.com/shorts/...`.
   - Show a local validation message before POST if the URL is not recognised:
     `Paste a normal YouTube link, e.g. https://youtu.be/...`
   - Store the original URL or normalized watch URL consistently.

Relevant files:
- `frontend/next-app/src/app/api/django/[...path]/route.ts`
- `frontend/next-app/src/lib/api.ts`
- `frontend/next-app/src/components/sessions/AddTrackForm.tsx`
- possibly backend `session/serializers.py` if YouTube URL validation is rejecting short URLs unexpectedly.

Priority: P0/P1 — this blocks testers adding tracks.

## 3. Licks/loop UI: strong positive signal; preserve and polish

Observed screenshot:
- YouTube practice page is open.
- Playback at `0:32 / 5:28`.
- Speed at `0.25x`.
- Licks panel shows a saved loop named `run`, active, range `0:32 - 0:59`.
- Feranmi captioned this image: `Love this`, then said `this is so dope bro!!`

What this means:
- The core loop/lick idea lands. This is the part to protect and make smoother.

Fixes/polish:
- Rename or clarify `Licks` if non-guitar users might not get it. Possible copy:
  - `Loops / Licks`
  - helper: `Save named practice sections and jump straight back to them.`
- Make the active loop state extra obvious:
  - active chip already helps; keep it.
  - consider a stronger `Looping 0:32–0:59` banner near the player while loop is active.
- Add one-click actions:
  - `Play loop`
  - `Stop loop`
  - `Duplicate loop`
- Preserve speed + active loop per track so users do not lose the setup between visits.

Relevant files likely:
- `frontend/next-app/src/components/youtube/ABLoopControl.tsx`
- `frontend/next-app/src/components/sessions/TrackPane.tsx`
- any track persistence API around `last_speed`, `licks`, active state.

Priority: P2 — not broken; this is where the product is working.

## Suggested implementation order

1. Fix Add Track network/proxy error handling and YouTube short-link handling.
2. Clean registration duplicate-email UX and add sign-in/reset CTA.
3. Polish the loop/lick success path after the blockers are stable.

## Quick acceptance checks

- Duplicate registration with an existing email shows only the helpful email-specific message plus sign-in/reset links; no generic global failure banner.
- Saving a valid `youtu.be/...` URL creates a track or returns a specific backend validation message; never raw `Failed to fetch`.
- If Django is unreachable, the Next proxy returns JSON 502 and the frontend shows a human message.
- Existing saved licks still show `name`, `start`, `end`, active state, edit/delete controls, and playback speed works at `0.25x`.
