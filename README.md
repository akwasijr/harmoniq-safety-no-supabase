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
