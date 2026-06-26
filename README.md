# Veritas Relationship Intelligence

A modern single-page marketing website for a discreet relationship intelligence and ethical OSINT service. The MVP includes a premium landing page, a confidential intake route, reusable TypeScript content structures, Tailwind styling, and a static form flow that can be deployed to Vercel without a backend.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

The static export is written to `out/`.

## Deploy to Vercel

1. Push this project to a Git repository.
2. Import the repository in Vercel.
3. Keep the framework preset as `Next.js`.
4. Use the default build command: `npm run build`.
5. Deploy.

No server, database, or environment variables are required for the MVP.

## Deploy to GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

1. Push the repository to GitHub.
2. In GitHub, open **Settings > Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`; the workflow will build and deploy the static `out/` folder.

The workflow sets `GITHUB_PAGES=true`, which applies the correct base path for the project site:

```text
https://<github-username>.github.io/veritas-relationship-intelligence/
```

It also sets `NEXT_PUBLIC_SITE_URL` for social preview metadata.

For local development, leave `NEXT_PUBLIC_BASE_PATH` empty. The GitHub Pages workflow sets it to `/veritas-relationship-intelligence`.

## Intake Form

The intake form currently uses a `mailto:` action as a placeholder. By default, it targets `intake@veritasri.example`, which is not a real inbox. To change the recipient at build time, set:

```bash
NEXT_PUBLIC_INTAKE_EMAIL=you@example.com
```

For GitHub Pages, add a repository variable named `NEXT_PUBLIC_INTAKE_EMAIL` in **Settings > Secrets and variables > Actions > Variables**.

Each field has a stable `name` attribute so it can later be connected to:

- Tally or Typeform for hosted intake workflows
- Airtable for lightweight case tracking
- Supabase for authenticated case records
- A Next.js API route or server action
- Secure file upload storage for client-provided photos or documents

## Future Integrations

- Stripe checkout for the three review tiers
- Tally or Typeform embedded intake forms
- Supabase for client records, case status, and analyst notes
- PDF report generation for evidence summaries
- Secure document upload and retention controls
- Transactional email for intake confirmations and report delivery

## WhatsApp Bot MVP

This repo now includes a separate WhatsApp bot service under `bot/`. GitHub Pages can host the static marketing site, but the bot must be deployed to a live backend host because WhatsApp needs webhook endpoints.

Useful commands:

```bash
npm run bot:build
npm run bot:test
npm run bot:start
```

See `bot/README.md` for Meta WhatsApp Cloud API, Twilio sandbox, deployment, and MVP wiring instructions.

## Project Structure

```text
src/app/page.tsx          Landing page
src/app/intake/page.tsx   Confidential intake page
src/components/           Shared navigation, headings, and form
src/lib/content.ts        Typed services, pricing, FAQ, and process content
public/images/            Project image assets
```

## Positioning Notes

The copy is intentionally careful: Veritas is positioned around relationship intelligence, ethical verification, and clarity before commitment. It explicitly excludes hacking, stalking, impersonation, device tracking, spyware, private account access, harassment, and unlawful surveillance.
