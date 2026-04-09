# The Shed — Outstanding Work

## Deferred from UI overhaul (2026-04-08)

### Email integration
- [ ] Email verification on registration (dj-rest-auth supports this but not wired up)
- [ ] Password reset via email flow
- [ ] Session summary email (weekly digest of practice stats)

### Features removed or not yet implemented
- [ ] The "N" icon in bottom-left corner — this is the next-themes toggle from the Header component. Needs proper placement or removal if dark/light toggle isn't needed
- [ ] Logout button was removed from the profile page (exists in header nav) — verify it's accessible on all viewport sizes via the mobile nav

### Visual identity (parked ideas)
See `docs/product-ideas-visual-identity.md` for the full list. Top candidates:
- [ ] Waveform visualization — ambient line that responds to BPM/audio during practice
- [ ] Instrument-specific visual identity — each instrument page has its own character
- [ ] Physical practice timer — feels like a studio tool, not a digital counter

### Design review findings (deferred)
- [ ] Register page marketing panel is hidden on mobile (`hidden xl:flex`) — consider showing a condensed version or at least the headline on tablet
- [ ] Calendar heatmap looks empty with few sessions — add an encouraging empty state message when < 5 sessions
- [ ] Chart y-axis shows "0.45m" which reads as meters, not minutes — format as "0:27" or "27s"
- [ ] InstrumentBreakdown shows "0.0h practice time" for very short sessions — show minutes instead when < 0.1h

### Performance
- [ ] Lazy load chart components (Chart.js is heavy, only needed on profile page)
- [ ] Image optimization — add next/image where applicable
- [ ] Consider code-splitting the practice-timer page (largest component at ~990 lines)

### Testing
- [ ] Add tests for profile page
- [ ] Add tests for recommendations page
- [ ] Add tests for login/register flows
- [ ] E2E tests with Playwright (framework installed but no tests written)
- [ ] Backend tests need Docker — document the `docker compose up db` requirement

### Accessibility
- [ ] Full keyboard navigation audit
- [ ] Screen reader testing on practice timer (complex widget interactions)
- [ ] Verify all chart components have table alternatives
- [ ] Add skip-to-content link in layout

### Dark mode polish
- [ ] Verify all pages render correctly in both light and dark mode
- [ ] Some components may still have hardcoded colors from the overhaul — do a grep for any remaining hex values in component files
