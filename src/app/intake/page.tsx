import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { IntakeForm } from "@/components/IntakeForm";

export const metadata: Metadata = {
  title: "Confidential Intake | Veritas Relationship Intelligence",
  description:
    "Start a private ethical OSINT review for identity verification, catfish detection, romance scam review, or relationship clarity.",
};

export default function IntakePage() {
  return (
    <main className="min-h-screen bg-[#0d0f0d]">
      <section className="border-b border-white/10 bg-[linear-gradient(135deg,#11130f,#171916_55%,#10130f)]">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-300 transition hover:text-amber-200"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to site
          </Link>

          <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border border-amber-200/20 bg-amber-100/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                <LockKeyhole aria-hidden="true" className="size-4" />
                Confidential intake
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-50 sm:text-5xl">
                Start with what feels inconsistent.
              </h1>
              <p className="mt-5 text-lg leading-8 text-stone-300">
                Share the known facts, public links, timeline, and the outcome
                you are hoping for. Veritas will use this to scope a lawful,
                ethical review.
              </p>
            </div>

            <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-amber-200/25 bg-amber-100/10 text-amber-200">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-stone-50">
                    Ethical use confirmation
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-stone-300">
                    Veritas does not accept requests involving harassment,
                    stalking, revenge, account access, device tracking,
                    impersonation, or unlawful surveillance.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.2)] sm:p-7 lg:p-9">
          <IntakeForm />
        </div>
      </section>
    </main>
  );
}
