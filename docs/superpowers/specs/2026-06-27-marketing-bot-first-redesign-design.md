# Marketing Site: Bot-First Redesign — Design

**Date:** 2026-06-27
**Status:** Approved (pending spec review)

## Goal

Redesign the Veritas marketing landing page to drive visitors to the free WhatsApp bot first,
then capture leads for the paid in-depth human report. Keep the existing dark/amber visual
language and static (GitHub Pages) architecture.

## Context

- Next.js static export (`output: "export"`), deployed to GitHub Pages with a `basePath` of
  `/veritas-relationship-intelligence` when `GITHUB_PAGES=true` (`next.config.ts`).
- Existing components: `Navigation`, `SectionHeading`, `IntakeForm`. Content lives in
  `src/lib/content.ts`. Landing page is `src/app/page.tsx`; intake at `src/app/intake/page.tsx`.
- `IntakeForm` submits via `action="mailto:..."` (no backend). This stays.
- Pricing tiers already exist: Essential Check $149, Deep Clarity $399 (highlighted),
  Concierge Review $899+.
- Asset base path is read via `process.env.NEXT_PUBLIC_BASE_PATH` in `page.tsx`.

## Decisions (from brainstorming)

- **Approach A — bot-first funnel.** One primary path: free WhatsApp bot → paid in-depth report.
- **WhatsApp button:** opens `wa.me` pre-filled with the Twilio sandbox **join code** (works
  today). Built from a single config value so it can be swapped to a production number +
  friendly greeting later.
- **Hero:** refined static **image** hero (no video), minimalist, subtle motion. Video may be
  added later but is out of scope here.
- **Form:** reuse `IntakeForm` + `mailto:`, reframed as the paid in-depth report request; add a
  "Which report?" tier dropdown. No payment processor (lead capture only).

## Information architecture (new page order)

1. **Navigation** — nav links updated; nav CTA becomes a green "Chat on WhatsApp" button.
2. **Hero** — minimalist, WhatsApp-first (see below).
3. **How it works (bot)** — 3 steps: message Veritas on WhatsApp → send the chat/screenshot/
   profile → get an instant risk read with reasons. Emphasize free, private, instant.
4. **Two ways to get clarity** — free→paid bridge: free bot card vs. in-depth report card.
5. **Pricing** — existing 3 tiers, reframed as the in-depth report; tier CTAs scroll to the form.
6. **Request your in-depth report** — reframed `IntakeForm` (paid path) with a tier dropdown.
7. **Ethics** — unchanged (trust/legal).
8. **FAQ** — existing items + 2 new bot Q&As.
9. **Footer** — unchanged + a WhatsApp link.

## Components and changes

### New: `WhatsAppButton` (`src/components/WhatsAppButton.tsx`)
- Renders an `<a href={whatsappHref()}>` styled as a WhatsApp-green button with a WhatsApp glyph
  (inline SVG; no new dependency) and a label.
- Props: `label?: string` (default "Chat on WhatsApp"), `variant?: "solid" | "outline"`,
  `className?: string`.
- Used in: Navigation, Hero (primary CTA), How-it-works, Footer.

### New config + helper (`src/lib/content.ts`)
```ts
export const whatsapp = {
  // Twilio sandbox: keep the join code as the pre-filled text so new testers auto-join.
  // To go to production: set number to your production WhatsApp number and change
  // prefillText to a friendly greeting (e.g. "Hi, I'd like to check someone").
  number: "14155238886",
  prefillText: "join behind-across",
};

export function whatsappHref(): string {
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.prefillText)}`;
}
```
- Add `botSteps: IconContent[]` (3 steps) and `clarityPaths` data (the two bridge cards) and the
  2 new FAQ items to `content.ts`.

### Hero (`src/app/page.tsx`)
- Keep dark `#0d0f0d`, amber accents, `veritas-hero.png` background with refined gradients and a
  subtle slow scale (CSS) plus the existing `animate-rise-in`.
- Headline: "Is the person you met online really who they say they are?"
- Sub: "Send the chat to Veritas on WhatsApp for an instant, private read on romance-scam risk —
  free."
- Primary CTA: `WhatsAppButton` (green) labeled "Check them on WhatsApp".
- Secondary CTA: anchor "Get an in-depth report →" → `#report`.
- Trust badges: "Free instant check", "Private — chats aren't stored", "No hacking, no stalking".

### Two-ways section (new section in `page.tsx`)
- Two cards. Free card → `WhatsAppButton`. In-depth card (highlighted) → "Request a report"
  anchor to `#report`.

### Pricing (existing section)
- Unchanged tiers; each tier's CTA changes from `Link href="/intake"` to an anchor `#report`
  (the form now lives on the landing page). Keep `/intake` page working as-is for direct links.

### Form section (`#report`, reframed)
- Move/embed the `IntakeForm` on the landing page under a "Request your in-depth report"
  heading, OR keep the dedicated `/intake` page and have the landing "report" section be a
  strong CTA block linking to it. **Decision:** embed the form on the landing page at `#report`
  for a single-page funnel; `/intake` remains as a standalone fallback page that reuses the same
  `IntakeForm`.
- Add a "Which report?" `<select name="reportTier">` with options Essential / Deep Clarity /
  Concierge to `IntakeForm`.

### Theme
- Add one new accent: WhatsApp green (`#25D366`) used **only** for bot CTAs. Everything else
  stays amber/stone/dark.

## Visual / UX constraints

- Mobile-first responsive; the WhatsApp CTA must be prominent above the fold on mobile.
- Respect `prefers-reduced-motion` for the hero motion.
- All internal asset URLs continue to respect the GitHub Pages `basePath`/`assetPrefix`.
- `wa.me` links open in a new tab (`target="_blank" rel="noopener"`).

## Out of scope

- Background video (image hero only this round).
- Payment processing (form is lead capture via mailto, as today).
- Moving the bot off the Twilio sandbox to a production number (separate effort; the config
  value makes the later swap a one-line change).
- Backend form handling / CRM.

## Testing / verification

- `npm run build` (and `GITHUB_PAGES=true npm run build`) succeed and export to `out/`.
- Manual: WhatsApp button href resolves to the correct `wa.me` URL with encoded join text;
  in-page anchors (`#report`, `#pricing`) scroll correctly; layout holds on mobile widths.
- Screenshot the result for review.
