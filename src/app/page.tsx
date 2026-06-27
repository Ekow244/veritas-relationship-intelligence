import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { SectionHeading } from "@/components/SectionHeading";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  botSteps,
  ethicsCards,
  faqs,
  pricingTiers,
  processSteps,
  services,
  whatsappHref,
} from "@/lib/content";

const assetBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#0d0f0d]">
      <Navigation />

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
              {["Free instant check", "Private — chats aren't stored", "No hacking, no stalking"].map(
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
                  "Private — your chats and photos aren't stored",
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

      <section id="problem" className="border-b border-white/10 bg-[#11130f]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
              Clarity before commitment
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">
              When the story does not quite hold together, uncertainty becomes
              exhausting.
            </h2>
          </div>
          <div className="grid gap-6 text-lg leading-8 text-stone-300">
            <p>
              Veritas helps clients replace speculation with verified,
              source-backed facts. The work is calm, documented, and bounded:
              identity consistency, public footprint review, romance scam
              signals, and evidence-based next steps.
            </p>
            <p>
              This is not surveillance theater. It is ethical verification for
              people making emotionally significant decisions.
            </p>
          </div>
        </div>
      </section>

      <section id="services" className="bg-[#0d0f0d]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading
            eyebrow="Services"
            title="Discreet research for complex relationship questions."
            description="Each review is scoped to lawful, public-source information and client-provided context, then translated into a clear private report."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <article
                  key={service.title}
                  className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-amber-200/25 hover:bg-white/[0.065]"
                >
                  <div className="grid size-11 place-items-center rounded-lg border border-amber-200/20 bg-amber-100/10 text-amber-200">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-stone-50">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-300">
                    {service.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="process"
        className="border-y border-white/10 bg-[linear-gradient(135deg,#12150f,#171916_52%,#111814)]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading
            eyebrow="How it works"
            title="A private path from concern to documented clarity."
            align="center"
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {processSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="relative rounded-lg border border-white/10 bg-[#0d0f0d]/72 p-7"
                >
                  <span className="text-sm font-semibold text-amber-200">
                    0{index + 1}
                  </span>
                  <div className="mt-5 grid size-12 place-items-center rounded-lg bg-white/[0.06] text-amber-200">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="mt-7 text-xl font-semibold text-stone-50">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-stone-300">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="ethics" className="bg-[#0d0f0d]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <SectionHeading
                eyebrow="Ethics and legal boundaries"
                title="Built for clarity, not paranoia."
                description="The strongest findings are the ones gathered lawfully and explained carefully."
              />
              <div className="mt-8 rounded-lg border border-amber-200/25 bg-amber-100/[0.08] p-6">
                <p className="text-lg leading-8 text-stone-100">
                  We are built for clarity, not paranoia. We do not hack
                  accounts, access private messages, track devices, impersonate
                  people, install spyware, or encourage harassment. Our work is
                  limited to lawful public-source research and client-provided
                  information.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {ethicsCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="rounded-lg border border-white/10 bg-white/[0.045] p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-amber-200/20 bg-amber-100/10 text-amber-200">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-stone-50">
                          {card.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-stone-300">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
              <p className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-stone-400">
                Availability of certain services may depend on your
                jurisdiction. This service is not legal advice and is not a
                substitute for a licensed private investigator where licensing
                is required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-y border-white/10 bg-[linear-gradient(180deg,#12130f,#0d0f0d)]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading
            eyebrow="Pricing"
            title="Focused review scopes for different levels of concern."
            description="Start with a narrow question, or choose a deeper review when the decision is more consequential."
            align="center"
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <article
                key={tier.name}
                className={`rounded-lg border p-7 ${
                  tier.highlighted
                    ? "border-amber-200/45 bg-amber-100/[0.09] shadow-[0_28px_90px_rgba(245,184,91,0.13)]"
                    : "border-white/10 bg-white/[0.045]"
                }`}
              >
                {tier.highlighted ? (
                  <p className="mb-4 inline-flex rounded-lg bg-amber-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-950">
                    Most selected
                  </p>
                ) : null}
                <h3 className="text-2xl font-semibold text-stone-50">
                  {tier.name}
                </h3>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-amber-100">
                  {tier.price}
                </p>
                <p className="mt-4 min-h-16 text-sm leading-7 text-stone-300">
                  {tier.description}
                </p>
                <ul className="mt-7 grid gap-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-stone-300"
                    >
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-amber-200"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
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
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#0d0f0d]">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
          <SectionHeading
            eyebrow="FAQ"
            title="Direct answers for sensitive decisions."
            align="center"
          />
          <div className="mt-10 divide-y divide-white/10 rounded-lg border border-white/10 bg-white/[0.035]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-lg font-semibold text-stone-50">
                  {faq.question}
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 text-amber-200 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        id="confidential-intake"
        className="border-t border-white/10 bg-[linear-gradient(135deg,#151712,#10130f_45%,#17150f)]"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
              Confidential intake
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-50 sm:text-5xl">
              Bring the facts you have. We will handle the question carefully.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-300">
              Start with a private intake. You do not need to know exactly what
              to ask yet; the first step is organizing the concern into a lawful,
              ethical review scope.
            </p>
            <Link
              href="/intake"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-200 px-5 py-3.5 text-sm font-semibold text-stone-950 shadow-[0_24px_70px_rgba(245,184,91,0.18)] transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#11130f]"
            >
              Start Confidential Review
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#0d0f0d]/70 p-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-5">
              <span className="grid size-11 place-items-center rounded-lg border border-amber-200/25 bg-amber-100/10 text-amber-200">
                <FileText aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-stone-50">
                  Private clarity report
                </h3>
                <p className="text-sm text-stone-400">
                  Findings, evidence, limits, and next steps.
                </p>
              </div>
            </div>
            <dl className="mt-6 grid gap-4">
              {[
                ["Evidence", "Source links and screenshots where appropriate"],
                ["Confidence", "Clear distinction between fact and uncertainty"],
                ["Boundaries", "No hacking, stalking, tracking, or impersonation"],
                ["Guidance", "Practical options for what to do next"],
              ].map(([term, description]) => (
                <div key={term} className="grid gap-1">
                  <dt className="text-sm font-semibold text-amber-100">
                    {term}
                  </dt>
                  <dd className="text-sm leading-6 text-stone-300">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="bg-[#0b0d0b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-stone-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-semibold uppercase tracking-[0.22em] text-stone-200">
              Veritas Relationship Intelligence
            </p>
            <p className="mt-2">
              Ethical verification for relationship clarity.
            </p>
          </div>
          <div className="flex flex-wrap gap-5">
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9ff3bd] hover:text-[#25D366]"
            >
              WhatsApp
            </a>
            <a href="#services" className="hover:text-amber-200">
              Services
            </a>
            <a href="#ethics" className="hover:text-amber-200">
              Ethics
            </a>
            <Link href="/intake" className="hover:text-amber-200">
              Intake
            </Link>
          </div>
          <p className="flex items-center gap-2">
            <LockKeyhole aria-hidden="true" className="size-4 text-amber-200" />
            Confidential by design.
          </p>
        </div>
      </footer>
    </main>
  );
}
