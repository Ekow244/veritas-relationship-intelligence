import { ArrowRight, LockKeyhole } from "lucide-react";

const concernOptions = [
  "Online dating verification",
  "Long-distance relationship concern",
  "Catfish or romance scam concern",
  "Pre-commitment clarity",
  "Repeated inconsistencies",
  "Other confidential matter",
];

export function IntakeForm() {
  const intakeEmail =
    process.env.NEXT_PUBLIC_INTAKE_EMAIL?.trim() ||
    "intake@veritasri.example";

  return (
    <form
      action={`mailto:${intakeEmail}`}
      method="post"
      encType="text/plain"
      className="grid gap-5"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-200">First name</span>
          <input
            required
            name="firstName"
            autoComplete="given-name"
            className="field"
            placeholder="First name"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-200">Email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="field"
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-200">Which report?</span>
        <select required name="reportTier" defaultValue="Deep Clarity" className="field">
          <option value="Essential Check">Essential Check — $149</option>
          <option value="Deep Clarity">Deep Clarity — $399</option>
          <option value="Concierge Review">Concierge Review — $899+</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-200">
          What situation best describes your concern?
        </span>
        <select required name="concernType" className="field">
          <option value="">Select one</option>
          {concernOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-200">
            Person's known name
          </span>
          <input name="knownName" className="field" placeholder="Known name" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-stone-200">
            Phone number if known
          </span>
          <input
            name="knownPhone"
            inputMode="tel"
            className="field"
            placeholder="+1..."
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-200">
          Social media links / handles
        </span>
        <textarea
          name="socialLinks"
          rows={3}
          className="field resize-y"
          placeholder="Instagram, TikTok, Facebook, LinkedIn, dating profiles, or public links"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-200">
          Photos or links
        </span>
        <textarea
          name="photosOrLinks"
          rows={3}
          className="field resize-y"
          placeholder="Paste public image links, shared album links, profile URLs, or note what files you can provide later."
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-200">
          What feels inconsistent?
        </span>
        <textarea
          required
          name="inconsistencies"
          rows={5}
          className="field resize-y"
          placeholder="Share the facts, timeline, and concerns without exaggeration. We will help separate what is known from what is uncertain."
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-stone-200">
          What outcome are you hoping for?
        </span>
        <textarea
          required
          name="desiredOutcome"
          rows={4}
          className="field resize-y"
          placeholder="For example: confirm identity, understand risk indicators, prepare for a conversation, or decide whether to continue."
        />
      </label>

      <label className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-stone-300">
        <input
          required
          type="checkbox"
          name="clientConsent"
          value="I confirm lawful and non-harassing use"
          className="mt-1 size-4 rounded border-white/20 bg-stone-950 text-amber-300 focus:ring-amber-200"
        />
        <span>
          I confirm I will not use this service for harassment, stalking,
          revenge, threats, illegal surveillance, or any unlawful purpose.
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2 text-sm text-stone-400">
          <LockKeyhole aria-hidden="true" className="size-4 text-amber-200" />
          Your intake should focus on facts, dates, profiles, and specific
          inconsistencies.
        </p>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-200 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#11130f]"
        >
          Submit confidential intake
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  );
}
