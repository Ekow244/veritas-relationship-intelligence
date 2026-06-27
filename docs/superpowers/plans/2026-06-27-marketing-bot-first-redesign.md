# Marketing Bot-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the Veritas landing page to drive visitors to the free WhatsApp bot first, with the paid in-depth report as the natural next step.

**Architecture:** Static Next.js (export) site. Add a reusable WhatsApp CTA driven by one config value, rewrite the hero to be bot-first, insert "How it works (bot)" and "Two ways to get clarity" sections above the existing content, repoint CTAs to an embedded report form, and add bot FAQs. Existing services/process/ethics/pricing sections are retained (reordered below the bot funnel), not deleted.

**Tech Stack:** Next.js (App Router, `output: "export"`), React, Tailwind v4, lucide-react.

## Global Constraints

- Static export only (`output: "export"`); no server code, no new dependencies.
- Keep the dark theme `#0d0f0d` + amber accents. WhatsApp green `#25D366` is used ONLY for bot CTAs.
- WhatsApp config is one place in `src/lib/content.ts`: `number: "14155238886"`, `prefillText: "join behind-across"`.
- `wa.me` links open in a new tab: `target="_blank" rel="noopener noreferrer"`.
- Internal asset URLs must keep using the existing `assetBasePath` pattern (GitHub Pages basePath).
- `prefers-reduced-motion` is already globally honored in `globals.css`; don't fight it.
- Verification for every task: `npm run build` succeeds and the exported `out/index.html` contains the expected strings (no frontend test runner exists; this is the check).

---

### Task 1: WhatsApp config, helper, button, and nav CTA

**Files:**
- Modify: `src/lib/content.ts` (add `whatsapp` + `whatsappHref`)
- Create: `src/components/WhatsAppButton.tsx`
- Modify: `src/components/Navigation.tsx` (replace the Intake CTA)

**Interfaces produced:**
- `whatsapp: { number: string; prefillText: string }` and `whatsappHref(): string` in `content.ts`.
- `WhatsAppButton({ label?, variant?, className? })` React component.

- [ ] **Step 1: Add config + helper to `src/lib/content.ts`**

Append to the end of `src/lib/content.ts`:

```ts
// WhatsApp click-to-chat. Twilio sandbox: prefillText is the join phrase so new
// testers auto-join when they hit send. To go production: set `number` to your
// production WhatsApp number and change `prefillText` to a greeting like
// "Hi, I'd like to check someone".
export const whatsapp = {
  number: "14155238886",
  prefillText: "join behind-across",
};

export function whatsappHref(): string {
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(whatsapp.prefillText)}`;
}
```

- [ ] **Step 2: Create `src/components/WhatsAppButton.tsx`**

```tsx
import { whatsappHref } from "@/lib/content";

const waGlyph = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.555-5.338 11.89-11.893 11.89a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.052zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export function WhatsAppButton({
  label = "Chat on WhatsApp",
  variant = "solid",
  className = "",
}: {
  label?: string;
  variant?: "solid" | "outline";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:ring-offset-[#0d0f0d]";
  const styles =
    variant === "solid"
      ? "bg-[#25D366] text-stone-950 shadow-[0_24px_70px_rgba(37,211,102,0.22)] hover:bg-[#22c35e]"
      : "border border-[#25D366]/40 bg-[#25D366]/10 text-[#9ff3bd] hover:bg-[#25D366]/20";

  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${styles} ${className}`}
    >
      {waGlyph}
      {label}
    </a>
  );
}
```

- [ ] **Step 3: Use it in `src/components/Navigation.tsx`**

Replace the import line:
```tsx
import { ArrowRight, ShieldCheck } from "lucide-react";
```
with:
```tsx
import { ShieldCheck } from "lucide-react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
```
Remove the now-unused `Link`-based Intake CTA block (the `<Link href="/intake" ...>Intake ...</Link>`) and replace it with:
```tsx
        <WhatsAppButton label="Chat on WhatsApp" className="px-4 py-2.5" />
```
(Keep the `Link` import — it is still used for the logo link at the top.)

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: build completes, "Exporting (… )" succeeds, no type errors.
Then run: `grep -o "wa.me/14155238886?text=join%20behind-across" out/index.html | head -1`
Expected: prints `wa.me/14155238886?text=join%20behind-across` (the nav button rendered the encoded link).

- [ ] **Step 5: Commit**

```bash
git add src/lib/content.ts src/components/WhatsAppButton.tsx src/components/Navigation.tsx
git commit -m "Add WhatsApp config, button, and nav CTA"
```

---

### Task 2: Bot-first hero, How-it-works, Two-ways sections, FAQ + footer

**Files:**
- Modify: `src/lib/content.ts` (add `botSteps`, 2 FAQ items, icon imports)
- Modify: `src/app/page.tsx` (replace hero; insert two sections after hero; footer WhatsApp link; import `WhatsAppButton`, `botSteps`)

**Interfaces:**
- Consumes: `WhatsAppButton` (Task 1), `botSteps`, `faqs` (extended).
- Produces: `botSteps: IconContent[]`.

- [ ] **Step 1: Add `botSteps` + FAQ items + icons to `src/lib/content.ts`**

In the lucide import block at the top of `content.ts`, add `MessageCircle`, `Camera`, `Gauge` to the existing import list (keep all existing icons).

Append `botSteps`:
```ts
export const botSteps: IconContent[] = [
  {
    title: "Message Veritas on WhatsApp",
    description:
      "Tap the button and say hello. No app to install and no account to create.",
    icon: MessageCircle,
  },
  {
    title: "Send the chat, a screenshot, or their photo",
    description:
      "Paste the messages they sent you, share a screenshot, or send their profile picture.",
    icon: Camera,
  },
  {
    title: "Get an instant risk read",
    description:
      "Veritas replies in seconds with a 🟢 / 🟠 / 🔴 rating and the warning signs it found — privately.",
    icon: Gauge,
  },
];
```

Add these two items to the END of the `faqs` array (before the closing `];`):
```ts
  {
    question: "Is the WhatsApp check really free?",
    answer:
      "Yes. The instant WhatsApp check is free and private — we do not store your chats or photos. The in-depth human report is the paid option for when you want deeper verification.",
  },
  {
    question: "What is the difference between the WhatsApp bot and the report?",
    answer:
      "The WhatsApp bot gives an instant, automated read of romance-scam warning signs in the messages or photos you send. The in-depth report is a human OSINT review — identity checks, reverse-image and footprint research, and a documented PDF with sources and recommended next steps.",
  },
```

- [ ] **Step 2: Update imports in `src/app/page.tsx`**

In the lucide import block, ensure `ArrowRight`, `Check`, `ShieldCheck` remain (keep `FileText`, `LockKeyhole` for now — `FileText` is removed in Task 3). Add a component import:
```tsx
import { WhatsAppButton } from "@/components/WhatsAppButton";
```
In the `@/lib/content` import list, **remove `trustBadges`** (the new hero no longer uses it) and **add `botSteps`**. So the import becomes:
```tsx
import {
  botSteps,
  ethicsCards,
  faqs,
  pricingTiers,
  processSteps,
  services,
} from "@/lib/content";
```

- [ ] **Step 3: Replace the hero `<section id="hero">…</section>`**

Replace the entire existing hero section (from `<section id="hero"` through its closing `</section>`) with:

```tsx
      <section
        id="hero"
        className="relative isolate min-h-[82svh] overflow-hidden border-b border-white/10"
      >
        <Image
          src={`${assetBasePath}/images/veritas-hero.png`}
          alt=""
          fill
          priority
          sizes="100vw"
          className="animate-hero-pan object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,15,13,0.97)_0%,rgba(13,15,13,0.86)_44%,rgba(13,15,13,0.45)_78%,rgba(13,15,13,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,15,13,0.25),rgba(13,15,13,0.82))]" />

        <div className="relative mx-auto flex min-h-[82svh] max-w-7xl items-center px-5 py-24 sm:px-6 lg:px-8">
          <div className="animate-rise-in max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#9ff3bd]">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Free instant check on WhatsApp
            </p>
            <h1 className="mt-8 max-w-3xl text-5xl font-semibold tracking-tight text-stone-50 sm:text-6xl lg:text-7xl">
              Is the person you met online{" "}
              <span className="font-display italic text-amber-100">
                really who they say they are?
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-200 sm:text-xl">
              Send the chat to Veritas on WhatsApp for an instant, private read
              on romance-scam risk — free.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <WhatsAppButton label="Check them on WhatsApp" />
              <a
                href="#report"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/8 px-5 py-3.5 text-sm font-semibold text-stone-50 transition hover:border-amber-200/40 hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#0d0f0d]"
              >
                Get an in-depth report
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </div>
            <ul className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {["Free instant check", "Private — chats aren’t stored", "No hacking, no stalking"].map(
                (badge) => (
                  <li key={badge} className="flex items-center gap-2 text-sm text-stone-300">
                    <Check aria-hidden="true" className="size-4 text-[#25D366]" />
                    {badge}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>
```

- [ ] **Step 4: Insert two new sections immediately after the hero `</section>`** (before `<section id="problem"`):

```tsx
      <section id="how-it-works" className="border-b border-white/10 bg-[#11130f]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="The free check"
            title="Clarity in three messages."
            description="No app, no account. Just message Veritas on WhatsApp."
            align="center"
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {botSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="relative rounded-lg border border-white/10 bg-white/[0.045] p-7"
                >
                  <span className="text-sm font-semibold text-[#25D366]">0{index + 1}</span>
                  <div className="mt-5 grid size-12 place-items-center rounded-lg border border-[#25D366]/20 bg-[#25D366]/10 text-[#9ff3bd]">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-7 text-xl font-semibold text-stone-50">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-stone-300">{step.description}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center">
            <WhatsAppButton label="Start the free check" />
          </div>
        </div>
      </section>

      <section id="two-ways" className="bg-[#0d0f0d]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <SectionHeading
            eyebrow="Two ways to get clarity"
            title="Start free. Go deeper when it matters."
            align="center"
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <article className="flex flex-col rounded-lg border border-[#25D366]/30 bg-[#25D366]/[0.06] p-7">
              <h3 className="text-xl font-semibold text-stone-50">Instant WhatsApp check</h3>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#9ff3bd]">Free</p>
              <ul className="mt-6 grid flex-1 gap-3">
                {[
                  "Paste a chat, screenshot, or profile photo",
                  "Instant romance-scam risk rating with reasons",
                  "Private — your chats and photos aren’t stored",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-300">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#25D366]" />
                    {f}
                  </li>
                ))}
              </ul>
              <WhatsAppButton label="Check them on WhatsApp" className="mt-8 w-full" />
            </article>

            <article className="flex flex-col rounded-lg border border-amber-200/45 bg-amber-100/[0.09] p-7 shadow-[0_28px_90px_rgba(245,184,91,0.13)]">
              <h3 className="text-xl font-semibold text-stone-50">In-depth human report</h3>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-100">From $149</p>
              <ul className="mt-6 grid flex-1 gap-3">
                {[
                  "Human OSINT review of identity and footprint",
                  "Reverse-image and timeline-inconsistency checks",
                  "Documented PDF report with sources and next steps",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-stone-300">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-200" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#report"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-200 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#0d0f0d]"
              >
                Request a report
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </article>
          </div>
        </div>
      </section>
```

- [ ] **Step 5: Add the footer WhatsApp link**

In the footer's link row (the `<div className="flex flex-wrap gap-5">` inside `<footer>`), add as the first child:
```tsx
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9ff3bd] hover:text-[#25D366]"
            >
              WhatsApp
            </a>
```
Add `whatsappHref` to the `@/lib/content` import in `page.tsx` (alongside `botSteps`, `ethicsCards`, etc.).

- [ ] **Step 6: Add the hero motion keyframe to `src/app/globals.css`**

Append before the `@media (prefers-reduced-motion: reduce)` block:
```css
@keyframes hero-pan {
  from {
    transform: scale(1.06);
  }
  to {
    transform: scale(1.12);
  }
}

.animate-hero-pan {
  animation: hero-pan 18s ease-in-out infinite alternate;
}
```

- [ ] **Step 7: Build and verify**

Run: `npm run build`
Expected: build + export succeed, no type errors.
Then:
```bash
grep -c "Is the person you met online" out/index.html
grep -c "Clarity in three messages" out/index.html
grep -c "Two ways to get clarity" out/index.html
grep -c "Is the WhatsApp check really free" out/index.html
```
Expected: each prints `1` or more.

- [ ] **Step 8: Commit**

```bash
git add src/lib/content.ts src/app/page.tsx src/app/globals.css
git commit -m "Bot-first hero, how-it-works and two-ways sections, bot FAQs"
```

---

### Task 3: Embed the report form, add tier select, repoint pricing CTAs

**Files:**
- Modify: `src/components/IntakeForm.tsx` (add a "Which report?" select)
- Modify: `src/app/page.tsx` (repoint pricing CTAs to `#report`; replace the `#confidential-intake` CTA block with an embedded form section `id="report"`)

**Interfaces:**
- Consumes: `IntakeForm` (now with the tier select).

- [ ] **Step 1: Add the tier select to `src/components/IntakeForm.tsx`**

Immediately after the opening `<div className="grid gap-5 md:grid-cols-2">` … first `</div>` (the firstName/email row), and before the existing "What situation best describes your concern?" label, insert:

```tsx
      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-200">Which report?</span>
        <select required name="reportTier" defaultValue="Deep Clarity" className="field">
          <option value="Essential Check">Essential Check — $149</option>
          <option value="Deep Clarity">Deep Clarity — $399</option>
          <option value="Concierge Review">Concierge Review — $899+</option>
        </select>
      </label>
```

- [ ] **Step 2: Repoint pricing CTAs in `src/app/page.tsx`**

In the pricing section, the tier CTA is a `<Link href="/intake" …>Start review …</Link>`. Change it to an anchor to the on-page form. Replace:
```tsx
                <Link
                  href="/intake"
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#0d0f0d] ${
                    tier.highlighted
                      ? "bg-amber-200 text-stone-950 hover:bg-amber-100"
                      : "border border-white/15 bg-white/8 text-stone-50 hover:border-amber-200/40"
                  }`}
                >
                  Start review
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
```
with:
```tsx
                <a
                  href="#report"
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#0d0f0d] ${
                    tier.highlighted
                      ? "bg-amber-200 text-stone-950 hover:bg-amber-100"
                      : "border border-white/15 bg-white/8 text-stone-50 hover:border-amber-200/40"
                  }`}
                >
                  Start review
                  <ArrowRight aria-hidden="true" className="size-4" />
                </a>
```

- [ ] **Step 3: Replace the `#confidential-intake` section with an embedded report form**

Add `import { IntakeForm } from "@/components/IntakeForm";` to `page.tsx` imports. Also **remove `FileText`** from the lucide import in `page.tsx` — the section being replaced was its only use, so it is now unused and will fail the lint step otherwise.

Replace the entire `<section id="confidential-intake">…</section>` block with:

```tsx
      <section
        id="report"
        className="border-t border-white/10 bg-[linear-gradient(135deg,#151712,#10130f_45%,#17150f)]"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
              In-depth report
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-50 sm:text-5xl">
              Want a deeper, human investigation?
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-300">
              The WhatsApp check is instant and free. When the decision is bigger,
              request a paid in-depth report: a human OSINT review with sources,
              confidence levels, and recommended next steps. Share what you have
              below and we will follow up to confirm scope and payment.
            </p>
            <div className="mt-8">
              <WhatsAppButton
                variant="outline"
                label="Or try the free WhatsApp check first"
              />
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0d0f0d]/70 p-6 sm:p-8">
            <IntakeForm />
          </div>
        </div>
      </section>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: build + export succeed, no type errors.
Then:
```bash
grep -c 'id="report"' out/index.html
grep -c "Want a deeper, human investigation" out/index.html
grep -c 'name="reportTier"' out/index.html
grep -c 'href="#report"' out/index.html
```
Expected: each prints `1` or more (the last prints several — hero, two-ways, and pricing CTAs).

- [ ] **Step 5: Commit**

```bash
git add src/components/IntakeForm.tsx src/app/page.tsx
git commit -m "Embed in-depth report form, add tier select, repoint pricing CTAs"
```

---

## Final verification (after all tasks)

- `npm run build` and `GITHUB_PAGES=true npm run build` both succeed.
- The `/intake` standalone page still builds (it reuses `IntakeForm`, now with the tier select).
- Manual: open `out/index.html`, confirm the WhatsApp buttons link to `https://wa.me/14155238886?text=join%20behind-across` and `#report` anchors scroll to the form. Screenshot for review.
