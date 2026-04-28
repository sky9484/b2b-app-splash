# Splash – Product Requirements Document

## Original Problem Statement
Build a B2B cross-border payment dashboard called "Splash" for Malaysian SMEs sending money to recipients in the Philippines. SMEs pay MYR via FPX, recipients receive PHP in their local bank. All-in fee 1.5%, settlement under 5 minutes. Behind the scenes: MYR → USDC (Luno) → Sui blockchain → USDC → PHP (Coins.ph) → recipient bank. User never sees crypto.

## User Personas
- **Primary**: Malaysian SME operations/finance lead paying overseas vendors, freelancers, suppliers in PHP.
- **Secondary**: Splash compliance team (admin) monitoring transfers.

## Architecture (as of 2026-04-28)
- **Backend**: FastAPI + MongoDB. JWT auth via httpOnly cookie + Bearer fallback.
- **Frontend**: React 19 + Tailwind + Shadcn UI. Inter font. Strict design tokens (#0A1E3F navy, #22A7F0 cyan, #00D2A0 green, #FFB800 amber).
- **Live FX**: open.er-api.com (free, cached 10 min). Falls back to 12.9822 MYR→PHP if API unreachable.
- **Mocked**: Luno / Sui / Coins.ph / FPX integrations are simulated client-side via 5-stage advance polling.

## What's Implemented (2026-04-28 — MVP)
- ✅ Auth: register / login / logout / me with JWT in httpOnly cookie + token in body.
- ✅ Auto-seeded admin (`admin@splash.com / Splash@2026`) with 12 PH recipients + 20 transfers (15 completed, 3 pending, 2 failed).
- ✅ Dashboard: 4 stat cards (Total sent month, Active recipients, Pending, Avg settlement) + recent transfers + quick actions sidebar with tip card.
- ✅ Send Payout 4-step wizard: Recipient form (10 PH banks/e-wallets) → Amount with live FX quote + fee breakdown → Review with 30s countdown timer → Track with 5-stage timeline + react-confetti on completion.
- ✅ Transfers page: search, status filter chips, pagination (20/page), CSV export, row actions dropdown.
- ✅ Recipients page: grid of cards with avatar (initials + auto color), last sent / total sent stats, search, sort, hover send-payment overlay.
- ✅ Batch Payouts: react-dropzone CSV uploader, template download, preview table with valid/invalid rows, total debit summary, mock submit.
- ✅ Sidebar layout with Splash logo, user menu (Shadcn dropdown), responsive mobile toggle.

## Backend Endpoints (under /api)
- `POST /auth/register | /auth/login | /auth/logout` · `GET /auth/me`
- `GET /fx-rate` · `POST /quote`
- `GET|POST|DELETE /recipients[/:id]`
- `GET|POST /transfers` · `GET /transfers/stats` · `GET|POST /transfers/:id[/advance]`
- `POST /batch/preview`

## Prioritized Backlog
- **P1**: Real FPX initiation (Curlec/MOLPay) and webhook handlers
- **P1**: Real Luno / Coins.ph / Sui integrations behind same UI contract
- **P1**: Recipient edit modal + duplicate-account detection
- **P2**: Email/SMS notifications on stage transitions (Twilio + Resend)
- **P2**: Multi-user team accounts with role-based approval flows for amounts > RM 50k
- **P2**: Receipt PDF generation + Sui Explorer deep-link
- **P3**: Live charts on dashboard (volume by day, fees saved vs banks)

## Test Credentials
See `/app/memory/test_credentials.md`. Admin: `admin@splash.com / Splash@2026`.
