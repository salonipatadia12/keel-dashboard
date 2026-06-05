// Dashboard-wide feature flags. Each flag is a single source of truth that
// every consumer reads directly — no prop drilling, no per-section toggles.

// Show the middle "Optimized IVR" tier across the entire dashboard.
//
// Background: the original 3-column design pitched (today → optimized IVR
// → voice agent) implies we'd help clients re-engineer their digit menu.
// We don't actually offer that service — the deliverable is "keep what you
// have or move to a voice agent". With this flag off, every surface
// collapses to a clean two-column today-vs-voice-agent comparison.
//
// Compute for the optimized IVR tier still runs (buildRecommendedTree,
// brandRecommended) so flipping this flag back to true restores the column
// everywhere with zero data work.
export const SHOW_OPTIMIZED_IVR = false;

// Outreach config — destinations the "Book a meeting" CTA points at.
// Both default to empty so a fresh deploy doesn't ship dead links to
// real callers. Fill these in when the Calendly URL is provisioned
// and the campaign phone line is live; the CTA renders a clearly-
// placeholder state until both are set.
//
// BOOKING_URL: any Calendly / SavvyCal / Cal.com URL. The CTA opens it
// in a new tab.
// CONTACT_PHONE: caller-facing number used by the "or call us" link.
// Format any way (the tel: link strips non-digits at render time).
export const BOOKING_URL = '';
export const CONTACT_PHONE = '';
