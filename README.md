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
- **Backend**: Supabase (planned)

## Getting Started

### Prerequisites

- Node.js 18+
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
