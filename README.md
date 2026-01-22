# Next.js Dashboard

A full-stack dashboard application built with Next.js 16, React 19, and Drizzle ORM.

**Demo:** https://nextjs-dashboard-eosin-nine.vercel.app

## Tech Stack

- **Framework:** Next.js 16.1.4 (App Router, Turbopack)
- **UI:** React 19.2.3, Tailwind CSS 4.1.18
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** NextAuth 5.0.0-beta.30
- **Validation:** Zod 4.3.5
- **Language:** TypeScript 5.9.3

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for local PostgreSQL)

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Seed database
pnpm db:seed

# Start dev server
pnpm dev
```

Open http://localhost:3000

### Test Account

| Field    | Value               |
| -------- | ------------------- |
| Email    | `user@nextmail.com` |
| Password | `123456`            |

## Scripts

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start dev server with Turbopack |
| `pnpm build`     | Create production build         |
| `pnpm start`     | Start production server         |
| `pnpm typecheck` | Run TypeScript check            |
| `pnpm lint`      | Run ESLint                      |
| `pnpm db:seed`   | Seed the database               |
| `pnpm db:push`   | Push schema changes to DB       |
| `pnpm db:studio` | Open Drizzle Studio             |

## Project Structure

```
app/
├── dashboard/        # Protected dashboard routes
│   ├── (overview)/   # Dashboard home
│   ├── customers/    # Customer list
│   └── invoices/     # Invoice CRUD
├── lib/
│   ├── actions.ts    # Server Actions
│   └── data.ts       # Data fetching
└── ui/               # Reusable components

db/
├── index.ts          # Database client
├── schema.ts         # Drizzle schema
└── seed.ts           # Seed script
```

## Environment Variables

Create `.env.local`:

```env
POSTGRES_URL=postgres://dashboard:dashboard123@localhost:54320/dashboard
AUTH_SECRET=your-secret-key
```

## License

Based on the [Next.js Learn Course](https://nextjs.org/learn).
