# Harmoniq Safety

A comprehensive workplace safety and incident management platform for industrial organizations.

## Features

- **Incident Reporting**: Easy-to-use forms for reporting workplace injuries, near misses, and hazards
- **Safety Checklists**: Custom checklists for daily inspections and compliance audits
- **Risk Evaluations**: Country-specific risk assessment forms (OSHA, RI&E, SAM)
- **Asset Management**: Track equipment inspections and certifications
- **Real-time Analytics**: Visual dashboards with incident trends and safety metrics
- **Multi-language Support**: Available in English, Dutch, and Swedish

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components based on shadcn/ui patterns
- **State**: React Context + Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **i18n**: next-intl
- **Backend/Auth/Data**: Supabase

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Demo Accounts

Use these demo accounts to explore the app:

- **Company Dashboard**: `admin@nexusmfg.com` → `/nexus/dashboard`
- **Employee App**: `worker@nexusmfg.com` → `/nexus/app`  
- **Super Admin**: `admin@harmoniq.io` → `/admin`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Super Admin portal
│   ├── [company]/          # Company-scoped routes
│   │   ├── app/            # Employee mobile app
│   │   └── dashboard/      # Company dashboard
│   └── login/              # Authentication
├── components/
│   ├── layouts/            # Page layouts
│   ├── navigation/         # Navigation components
│   ├── shared/             # Shared components (ThemeProvider, etc.)
│   └── ui/                 # Base UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── mocks/                  # Mock data for development
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

## Development

### Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Environment Variables

Required for app auth and server features:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL` for production deploys and auth/invite links

Optional but recommended:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_PLATFORM_SLUGS` (defaults to `platform,admin,superadmin,harmoniq`)
- `SUPER_ADMIN_EMAILS` (mainly needed for first-time super-admin bootstrap flows)

Use `.env.example` as the reference when entering secrets into Sevalla or another hosting provider.

### Deploying to Sevalla / Self-Hosted Platforms

1. Create a Sevalla **Application Hosting** service from this repository.
2. Use the repository root (`.`) as the build path.
3. Prefer explicit process commands:
   - Build: `npm ci && npm run build`
   - Start: `npm start`
4. Configure the web process health check path as `/api/health`.
5. Enter the required environment variables in the Sevalla dashboard rather than relying on `.env` files.
6. Redeploy whenever `NEXT_PUBLIC_*` variables change, because Next.js bundles them into the client build.

Recommended Sevalla environment values:

| Variable | Value / notes |
| --- | --- |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preferred browser key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` also works) |
| `SUPABASE_SECRET_KEY` | Preferred server/admin key (`SUPABASE_SERVICE_ROLE_KEY` also works) |
| `NEXT_PUBLIC_SITE_URL` | **First deploy:** use the generated `https://<app>.sevalla.app` URL. **After custom-domain cutover:** change to `https://app.sevalla.com` and redeploy. |
| `NEXT_PUBLIC_PLATFORM_SLUGS` | Optional override; defaults to `platform,admin,superadmin,harmoniq` |
| `SUPER_ADMIN_EMAILS` | Optional unless you need first-time super-admin bootstrap behavior |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Optional; the contact form has a honeypot + timing fallback if Turnstile is not configured |

Recommended rollout order:

1. Deploy first to the generated `*.sevalla.app` domain.
2. Add that preview URL to Supabase Auth while validating the first deploy:
   - Site URL: `https://<app>.sevalla.app`
   - Redirect URLs:
     - `https://<app>.sevalla.app/auth/callback`
     - `https://<app>.sevalla.app/auth/signup-callback`
     - `https://<app>.sevalla.app/reset-password`
3. Run `npm run smoke:test -- https://<app>.sevalla.app`.
4. Apply `supabase/migrations/008_extend_site_analytics.sql` if production analytics has not been upgraded yet.
5. Add `app.sevalla.com` in Sevalla Domains, complete the DNS verification records Sevalla shows you, then change `NEXT_PUBLIC_SITE_URL` to `https://app.sevalla.com` and redeploy.
6. Update Supabase Auth again for the final production domain:
   - Site URL: `https://app.sevalla.com`
   - Redirect URLs:
     - `https://app.sevalla.com/auth/callback`
     - `https://app.sevalla.com/auth/signup-callback`
     - `https://app.sevalla.com/reset-password`
7. Run `npm run smoke:test -- https://app.sevalla.com`.

Notes:

- The app is configured with Next.js `output: "standalone"` for application hosting.
- The repo now includes a production `Dockerfile`, so an existing Dockerfile-based Sevalla app can be repointed to this repository without changing hosting mode.
- Node.js is pinned to `20.9+` in `package.json` and `.nvmrc`.
- If Turnstile is unavailable, the contact form still has fallback protection via rate limiting, honeypot, and form-timing validation.

### Design System

- **Font**: Geist Sans
- **Icons**: Lucide React (no emojis)
- **Colors**: Neutral palette with semantic colors for status/severity
- **Accessibility**: WCAG AA compliant (4.5:1 text contrast, 3:1 UI contrast)
- **Touch targets**: Minimum 44x44px for mobile

### URL Structure

- `/` - Marketing landing page
- `/login` - Authentication
- `/admin/*` - Super Admin portal
- `/{company}/dashboard/*` - Company dashboard
- `/{company}/app/*` - Employee mobile app

## License

Proprietary - All rights reserved.
