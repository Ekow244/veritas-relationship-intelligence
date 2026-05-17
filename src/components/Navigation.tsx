import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { navigation } from "@/lib/content";

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0f0d]/85 backdrop-blur-xl">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex items-center gap-3" aria-label="Veritas home">
          <span className="grid size-10 place-items-center rounded-lg border border-amber-300/30 bg-amber-200/10 text-amber-200">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.22em] text-stone-100">
              Veritas
            </span>
            <span className="block text-xs text-stone-400">
              Relationship Intelligence
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-stone-300 transition hover:text-amber-200"
            >
              {item.label}
            </a>
          ))}
        </div>

        <Link
          href="/intake"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-200 px-4 py-2.5 text-sm font-semibold text-stone-950 shadow-[0_18px_45px_rgba(245,184,91,0.16)] transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#0d0f0d]"
        >
          Intake
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </nav>
    </header>
  );
}
