# UK Golf Club Knockout Network

A national matchplay knockout competition platform connecting golf clubs, players, and sponsors across the UK.

## Architecture

- **Frontend**: React + Vite + Tailwind CSS (deployed to Cloudflare Pages)
- **Backend**: Node.js + Express + Prisma ORM + PostgreSQL (deployed to Railway)
- **Real-time**: Socket.io for live draw updates
- **Payments**: Stripe
- **Email**: SendGrid
- **Storage**: Cloudflare R2 (scorecard uploads)

## Features

- **Flexible Tournament Formats**: Singles, pairs, teams with matchplay, strokeplay, stableford, best ball, foursomes, greensomes
- **Admin-Configurable Pricing**: All fees, revenue splits configurable per tournament
- **Regional/National Progression**: Club qualifier → Regional → National Final
- **Live Draws**: Scheduled, real-time bracket draws via Socket.io
- **Dual Sign-off**: Both players must confirm match results
- **Scorecard Upload**: Scan and upload scorecards as proof
- **WHS Integration**: Handicap reference ID and lookup API ready
- **Multiple Concurrent Tournaments**: Run unlimited tournaments simultaneously
- **Age Categories**: Open, Junior-only, and Senior-only events

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database URL and API keys
npm install
npx prisma migrate dev
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Revenue Model

| Revenue Source | Default Club % | Default Platform % |
|---------------|---------------|-------------------|
| Entry Fees | 50% | 50% |
| Local Sponsorship | 70% | 30% |
| Regional Sponsorship | 25% | 75% |
| National Sponsorship | 0% | 100% |
| Advertising | 50% | 50% |

All percentages are admin-configurable per tournament.
