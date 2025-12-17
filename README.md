# horizon
Horizon is a client-facing intake and execution hub that turns questionnaire answers into structured workflows, timelines, and assets.

## Requirements
- Node 20+
- pnpm 10+ (project uses the root `packageManager` field)

## Getting started
- Install deps: `pnpm install`
- Start dev (Turbo): `pnpm dev`
- Build all packages/apps: `pnpm build`
- Lint: `pnpm lint`
- Type check: `pnpm type-check`
- Format check: `pnpm format:check`

## Workspace layout
- `apps/web-client` – client portal (Next.js App Router)
- `apps/web-admin` – admin portal (Next.js App Router)
- `apps/api` – API surface (placeholder)
- `packages/config` – shared env helpers
- `packages/db` – shared data layer (placeholder)
- `packages/types` – shared TypeScript types
- `packages/ui` – shared UI kit (shadcn + Tailwind)

## Environment
- Copy or reference `packages/config/src/env.example.ts` when creating `.env` files. Keep secrets in local `.env` files (see `.gitignore`).

## Notes
- This repo is managed as a Turborepo; prefer running scripts from the root so tasks fan out to the right apps/packages.
