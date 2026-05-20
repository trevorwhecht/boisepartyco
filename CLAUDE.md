---
description: boisepartyco — party rentals & event supplies quoting and order management
---

# boisepartyco

Party rentals & event supplies — client quoting and order management site.
See parent rules in `../nextjs/.claude/rules/` (auto-loaded).

**Stack:** Next.js 16.2.6 · React 19.2.4 · Tailwind 4 · Prisma · NextAuth · shadcn/ui · npm · Vercel

**CRITICAL — Next.js 16:** Breaking changes from training data. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code. APIs, conventions, and file structure may differ.

**Commands:**
```bash
npm run dev          # port 3000, local DB
npm run dev:prod     # port 3001, prod DB
npm run build        # prisma generate + next build
npx prisma db seed  # seeds admin user, 7 OrderStates, UniversalSettings
```

**Auth (next-auth v4, not v5):** Use `NextAuthOptions` + `getServerSession(authOptions)` in route handlers. Do NOT use `auth()`, `{ handlers }`, or named `signIn/signOut` exports — those are v5 syntax.

**Roles:** Single `User` table with `role: 'admin' | 'employee' | 'user'`. Seed requires `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` in `.env.local`. Cost/profit fields stripped at API layer (not just UI) for employee role.

**Prisma config:** `prisma.config.ts` at root (Prisma 6) handles datasource. Schema still needs `generator client` + `datasource db` blocks.

**Forked from:** `quoting-template` at commit f4561c4

**Template rules:**
- All code stays under `src/` — non-negotiable
- CSS variables in `globals.css` — no raw Tailwind palette classes in components
- Tailwind 4 CSS variable syntax: `text-(--color-danger)` not `text-[var(--color-danger)]`
- Z-index scale: z-20 dropdowns · z-40 modals · z-50 nav overlays · z-[100] toasts
- No domain logic in `components/ui/` or `components/layout/`
- Never modify `schema.prisma` without explicit instruction
