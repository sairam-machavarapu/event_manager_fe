# Gather Frontend

Gather is an event discovery and management platform. This repository contains
its Next.js frontend, including attendee pages and organiser tools. The FastAPI
backend runs separately.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS and TanStack Query.
Use Node.js 24 and npm. Dependencies are pinned in `package-lock.json`.

## Features

- Event discovery, filters and public event details.
- Account registration, verification, sign-in and recovery.
- Organiser workspaces and a guided event builder.
- Ticket selection, checkout and payment status.
- My tickets, entry QR codes and organiser admission tools.
- Saved events, organiser follows, sold-out waitlists and calendar downloads.
- Administration and workspace approval for authorised accounts.

## Run locally

Start the backend and its dependencies first. From this repository's root:

```powershell
Copy-Item .env.example .env.local
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000. On macOS/Linux use `cp .env.example .env.local`
and `npm` instead of `npm.cmd`.

| Variable | Purpose |
| --- | --- |
| API_INTERNAL_URL | Backend destination; local default is `http://127.0.0.1:8000` |
| NEXT_TELEMETRY_DISABLED | Set to `1` to disable Next.js telemetry |

Requests to `/api/v1/*` are proxied by Next.js to the backend. Keep
`API_INTERNAL_URL` server-side. Restart the development server after changing it;
production changes require a rebuild. The backend `AUTH_ORIGIN` must match the
frontend origin exactly, without a trailing slash.

## Checks and production build

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run start
```

The last command serves the production build locally. Stop the development
server first if it is using port 3000.

## Project layout

- `src/app/`: pages, layouts and application styles.
- `src/components/`: shared interface components and feature controls.
- `src/lib/`: application helpers.
- `public/`: static assets.
- `next.config.ts`: backend proxy and build configuration.

## Deploy to Vercel

Import the frontend repository with the Next.js preset and repository root as
the Root Directory. Use Node.js 24, `npm ci` to install and `npm run build` to
build. Set `API_INTERNAL_URL` to the public HTTPS Render API URL before deploying.
Keep Next.js default output settings.

Set the backend `AUTH_ORIGIN` to the resulting Vercel production origin and
`AUTH_COOKIE_SECURE=true`. Preview domains are not automatically authorised.
The frontend deployment requires the separately deployed backend services.

## Environment files

`.env.example` contains shareable defaults. `.env.local` contains local settings
and is ignored by Git. Never commit credentials or expose backend secrets using
`NEXT_PUBLIC_` variables.
