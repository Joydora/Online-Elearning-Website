# Free Deployment Guide — Online E-Learning Website

> Last updated: **June 2026**. Stack picks reflect the post-Koyeb-acquisition,
> post-Railway-free-tier-removal landscape. Every service below is verified to
> still offer a real (no credit-card-required) free tier as of June 2026.

---

## TL;DR — the stack

| Layer       | Service                | Free quota (2026)                                  | Card req'd? |
|-------------|------------------------|----------------------------------------------------|-------------|
| Database    | **Neon**               | 0.5 GB storage, 100 CU-hours/mo, scale-to-zero     | No          |
| Backend API | **Render** (Web Svc)   | 750 instance-hours/mo, 512 MB RAM, sleeps 15 min   | No          |
| Frontend    | **Vercel** (Hobby)     | 100 GB BW, 6 000 build-min, unlimited static sites | No          |
| LLM         | **Groq Cloud**         | Free tier, ~30 req/min on `llama-3.x`              | No          |
| Embeddings  | **Google Gemini**      | Free tier, `text-embedding-004` (768 dims)         | No          |
| Files       | **Cloudinary** (Free)  | 25 GB storage, 25 GB BW/mo                         | No          |

**Total monthly cost: $0.** This is enough for a school KLTN/demo, a personal
portfolio, or 10–50 daily active users. Past that, swap Render for a paid plan
(see §10 below).

### Why these picks and not the popular ones?

- **Railway** killed its real free tier in 2023 — new accounts now get only a
  one-time $5 trial credit. Not free in any meaningful sense.
- **Fly.io** now requires a credit card on signup and has no real free tier for
  new users.
- **Koyeb** was acquired by Mistral AI on 17 Feb 2026 and stopped accepting new
  free-tier signups.
- **Heroku** killed its free tier in late 2022. Still dead.
- **Vercel** is the cleanest free Vite host but it cannot run our Node API
  (long-lived processes, file uploads, cron jobs).
- **Supabase** is a fine Neon alternative (500 MB vs 0.5 GB DB) — pick it if you
  ever want their bundled auth / storage / realtime. Otherwise Neon's
  scale-to-zero is friendlier for an idle KLTN demo.

Sources: [Render — Platforms with a real free tier (2026)](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026),
[Render — Deploy for Free](https://render.com/docs/free),
[Neon — Connection pooling](https://neon.com/docs/connect/connection-pooling),
[Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

---

## 0. Prerequisites — accounts to create

Sign up (all free, no card) before touching the repo:

1. **GitHub** — code host. Push this repo public or private; both work.
2. **Neon** — <https://console.neon.tech> — sign in with GitHub.
3. **Render** — <https://dashboard.render.com> — sign in with GitHub.
4. **Vercel** — <https://vercel.com/signup> — sign in with GitHub.
5. **Groq Cloud** — <https://console.groq.com/keys>.
6. **Google AI Studio** (for Gemini) — <https://aistudio.google.com/apikey>.
7. **Cloudinary** — <https://cloudinary.com/users/register/free>.

Stripe is optional. The course-purchase flow runs without it if you skip the
checkout endpoint. The dev-only `/api/enroll/confirm/:courseId` (auto-enabled
when `NODE_ENV !== 'production'`) lets you fake paid enrollments for testing.

---

## 1. Database — Neon (free Postgres)

**Why Neon, not Supabase.** Neon's free plan suspends after 5 min idle and wakes
in ~300 ms, so a sleeping demo costs zero CU-hours. Supabase keeps the DB warm
24/7 and counts toward the 500 MB cap. For a school project that sits idle most
of the time, Neon stretches the free quota further. Either works.

### 1.1 Create the project

1. Log into Neon → **New Project**.
2. Postgres version: **16** (matches local Docker).
3. Region: pick the one closest to where Render hosts your backend
   (Render's free region is **Oregon/US-West**; choose Neon **AWS us-west-2**).
4. After creation, Neon shows two connection strings. **Copy both.**
   - **Pooled** (has `-pooler` in the hostname) — use as `DATABASE_URL`
   - **Direct** (no `-pooler`) — use as `DIRECT_URL`

   Modern Prisma 6 only *requires* the pooled URL for runtime, but the direct
   URL is still recommended for `prisma migrate deploy` to avoid PgBouncer
   prepared-statement quirks ([Neon docs](https://neon.com/docs/guides/prisma)).

### 1.2 Add `directUrl` to the Prisma schema

Open `packages/api/prisma/schema.prisma` and update the `datasource` block:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Commit and push. Locally you can leave `DIRECT_URL` blank — Prisma falls back to
`DATABASE_URL`.

### 1.3 Run migrations against Neon

From your laptop, with `DATABASE_URL` + `DIRECT_URL` set to the Neon strings:

```bash
cd packages/api
npx prisma migrate deploy   # applies the 13 migrations in prisma/migrations
npx prisma db seed          # if you have a seed script; otherwise skip
```

If you do not have a seed script, see §7 below for how to import the local
`elearning-pg` Docker dump into Neon.

---

## 2. Cloudinary — file uploads (videos, images)

The API stores user uploads via Cloudinary (Render's filesystem is ephemeral —
files vanish on every redeploy, so a managed CDN is mandatory on a free host).

1. Dashboard → **Account Details**. Copy `Cloud name`, `API Key`, `API Secret`.
2. You'll paste these into Render env vars in §4.

Free tier: 25 GB storage + 25 GB monthly bandwidth + image/video transforms.
That is way more than a KLTN demo will ever use.

---

## 3. AI keys — Groq + Gemini

Both already wired into the codebase (`packages/api/src/services/llm.service.ts`
and `vectorStore.service.ts`). You just need keys.

### Groq

1. <https://console.groq.com/keys> → **Create API Key**. Copy `gsk_…`.
2. Free quota (June 2026): ~30 requests/min on `llama-3.1-8b-instant` (fast
   tier) and ~6 RPM on `llama-3.3-70b-versatile` (smart tier). No hard token
   cap on the free plan; rate-limited only.

### Gemini

1. <https://aistudio.google.com/apikey> → **Create API key**. Copy.
2. `text-embedding-004` is in the free pool — 1 500 requests/minute, generous
   daily cap.

---

## 4. Backend — Render Web Service

### 4.1 One-time repo prep

Add production build scripts to `packages/api/package.json` so Render compiles
TypeScript at build time and runs plain Node at runtime (much faster cold
starts than `ts-node`).

```jsonc
{
  "scripts": {
    "dev":   "ts-node src/index.ts",
    "build": "prisma generate && tsc -p tsconfig.json",
    "start": "node dist/src/index.js",
    "postinstall": "prisma generate"
  }
}
```

> Don't forget to move `typescript` and `@types/*` to `dependencies` (not
> `devDependencies`) **or** set `NPM_CONFIG_PRODUCTION=false` on Render so dev
> deps survive the install — Render prunes dev deps by default in production
> mode and the build will fail without `tsc`.

Commit and push to your `deploy` branch.

### 4.2 Delete the old Railway configs

`packages/api/railpack.toml` and `packages/api/nixpacks.toml` both call
`pnpm dev` as the start command (ts-node, slow). They're harmless on Render
but they leak intent — delete them or leave them, your call.

### 4.3 Create the Render service

1. Dashboard → **New +** → **Web Service** → connect this GitHub repo.
2. Settings:
   - **Name**: `elearning-api`
   - **Region**: Oregon (matches Neon `us-west-2`)
   - **Branch**: `deploy`
   - **Root Directory**: `packages/api`
   - **Runtime**: Node
   - **Build Command**:
     ```
     corepack enable && pnpm install --frozen-lockfile && pnpm build
     ```
   - **Start Command**: `pnpm start`
   - **Instance Type**: **Free**

   Why `corepack enable`? Render's Node image ships npm by default; corepack
   activates the pnpm version pinned in your root `package.json`'s
   `packageManager` field. If you don't have that field, add it now:
   ```jsonc
   { "packageManager": "pnpm@9.0.0" }
   ```

3. **Environment** tab → paste this block (replace `…` with real values):

   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://USER:PASS@HOST-pooler.us-west-2.aws.neon.tech/DBNAME?sslmode=require
   DIRECT_URL=postgresql://USER:PASS@HOST.us-west-2.aws.neon.tech/DBNAME?sslmode=require
   JWT_SECRET=<generate a 32-char random string>
   BCRYPT_SALT_ROUNDS=10

   GROQ_API_KEY=gsk_…
   GROQ_MODEL_FAST=llama-3.1-8b-instant
   GROQ_MODEL_SMART=llama-3.3-70b-versatile

   GEMINI_API_KEY=…
   GEMINI_EMBEDDING_MODEL=text-embedding-004

   CLOUDINARY_CLOUD_NAME=…
   CLOUDINARY_API_KEY=…
   CLOUDINARY_API_SECRET=…

   FRONTEND_URL=https://<your-vercel-app>.vercel.app

   # Optional — only if you wire Stripe
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   STRIPE_SUCCESS_URL=https://<your-vercel-app>.vercel.app/payment/success
   STRIPE_CANCEL_URL=https://<your-vercel-app>.vercel.app/payment/cancel

   # Optional — Google OAuth
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_CALLBACK_URL=https://<your-render-app>.onrender.com/api/auth/google/callback

   # Optional — SMTP for verification emails
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASS=
   FROM_EMAIL=noreply@elearning.vn
   FROM_NAME=E-Learning Platform
   ```

4. **Create Web Service.** First build takes 3–5 minutes. Watch the log for the
   `[server]: Server is running at http://localhost:3001` line.

5. Note the public URL — `https://elearning-api-xxxx.onrender.com`. You'll need
   it for the Vercel `VITE_API_URL` in §5.

### 4.4 Apply migrations on the live DB

In the Render dashboard, open the **Shell** tab of your service (or run it
locally with the Neon credentials) and execute:

```bash
npx prisma migrate deploy
```

This applies all 13 migrations to Neon. Idempotent — safe to re-run.

### 4.5 Free-tier sleep behaviour — what to expect

Render free web services [spin down after 15 min of inactivity and take ~30–60 s
to cold-start](https://render.com/docs/free) on the next request. The first
visitor after a quiet night will see a loading spinner for up to a minute.

If that's a deal-breaker (e.g. demo day), use one of these workarounds:

- **UptimeRobot** (free) → ping `https://<your-api>.onrender.com/api/categories`
  every 5 min. Trivial but technically violates Render's spirit-of-the-rules.
- **GitHub Actions cron** → same idea, free, official-ish.
- Upgrade to Render Starter ($7/mo) → no spin-down.

The 750 instance-hours/mo budget covers one service running 24/7 (744 h in a
month), so the only cost of keep-alive is honesty.

---

## 5. Frontend — Vercel

### 5.1 Repo prep

The repo already has `packages/web/server.js` for Railway-style static serving
— Vercel doesn't need it (it serves `dist/` from its CDN). Leave it; it's
harmless.

Verify `packages/web/vite.config.ts` exists and works locally with `pnpm build`.

### 5.2 Create the Vercel project

1. Vercel dashboard → **Add New… → Project** → import the GitHub repo.
2. Vercel will ask which directory to deploy:
   - **Root Directory**: `packages/web`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: leave as `pnpm build` (auto)
   - **Output Directory**: `dist` (auto)
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`

   That `cd ../..` is the trick for pnpm monorepos — Vercel's installer must
   run at the repo root so it sees `pnpm-workspace.yaml`. See
   [Vercel — monorepos](https://vercel.com/docs/monorepos).

3. **Environment Variables**:
   ```
   VITE_API_URL=https://<your-render-app>.onrender.com/api
   ```
   Add it for all three environments (Production, Preview, Development).

4. **Deploy.** First build ~2 min.

5. Note the public URL — `https://<project>.vercel.app`. Go back to Render's
   env tab and update `FRONTEND_URL` to this. Render will redeploy.

### 5.3 CORS

The API's CORS middleware should already accept `FRONTEND_URL`. Verify in
`packages/api/src/index.ts`:

```ts
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
```

If it doesn't read `FRONTEND_URL`, patch it now or your browser will block every
fetch with `CORS policy: No 'Access-Control-Allow-Origin' header`.

---

## 6. Wire it all together

Sanity-check by hitting these URLs in the browser:

| URL                                          | Expected                |
|----------------------------------------------|-------------------------|
| `https://<api>.onrender.com/api/categories`  | JSON array of 9 items   |
| `https://<api>.onrender.com/api/courses`     | JSON array of courses   |
| `https://<web>.vercel.app/`                  | Homepage renders, lists courses |
| Login flow on the Vercel URL                 | Sets JWT in localStorage, redirects |

If the API returns categories but the frontend page shows "Network Error",
99 % of the time it's either:
- `VITE_API_URL` missing the trailing `/api`, **or**
- CORS blocking the origin (check Render logs).

---

## 7. Seed the database

You have two seed options:

### Option A — Re-run your local seed script against Neon

If `packages/api/prisma/seed.ts` (or `seed.js`) exists, point `DATABASE_URL` at
Neon locally and run:

```bash
cd packages/api
DATABASE_URL='<neon-pooled-url>' DIRECT_URL='<neon-direct-url>' npx prisma db seed
```

### Option B — Dump local Docker → restore to Neon

If you only have data in the local `elearning-pg` container and no seed script:

```bash
# Dump from local container (Bash on Windows)
docker exec elearning-pg pg_dump -U postgres -d elearning \
  --no-owner --no-acl --clean --if-exists \
  > elearning_dump.sql

# Restore to Neon (use the DIRECT URL, not pooled)
psql '<neon-direct-url>' -f elearning_dump.sql
```

Verify in the Neon SQL editor: `SELECT count(*) FROM "User";` should return 12.

### Test accounts after seeding

| Role    | Email                    | Password       |
|---------|--------------------------|----------------|
| Admin   | `admin@gmail.com`        | `Password123!` |
| Teacher | `nguyenvana@gmail.com`   | `Password123!` |
| Student | `student1@gmail.com`     | `Password123!` |

---

## 8. Smoke test on the deployed stack

Re-run the focused Puppeteer test, pointed at the live URLs:

```bash
BASE='https://<web>.vercel.app' API_BASE='https://<api>.onrender.com/api' \
  node tests/focused.test.js
```

(`tests/focused.test.js` reads `BASE` / `API_BASE` from env if you tweak the
top of the file — it currently hardcodes localhost. A 30-second edit.)

If all 20 steps pass on the live URLs, you are deployed.

---

## 9. Operating on free tier — gotchas to plan for

- **Cold start**: 30–60 s first request after 15 min idle. Document this for
  graders. Or wire UptimeRobot.
- **Render filesystem is ephemeral**. Anything written to disk (the `uploads/`
  dir, in-memory FAISS) is wiped on every redeploy and every cold start. The
  vector store re-ingests from the DB on first request — that's by design.
- **Neon CU-hours**. Idle Postgres doesn't burn CU. A query against a sleeping
  branch wakes it (one-time ~300 ms penalty) then runs normally. 100 CU-hours
  covers ~hundreds of thousands of light queries — enough.
- **Cloudinary 25 GB bandwidth**. Video streaming will eat this fast. Either
  cap upload size, or move video to a free-tier video host (Bunny.net,
  Cloudflare Stream beta) when you outgrow it.
- **Vercel Hobby is non-commercial only.** Per
  [Vercel's plan terms](https://vercel.com/docs/plans/hobby), you cannot run
  ads or charge money on a Hobby site. For a KLTN/portfolio, fine. For a real
  product, $20/mo Pro.

---

## 10. Costs & realistic upgrade paths

| Trigger                                    | Cheapest next step                                   |
|--------------------------------------------|------------------------------------------------------|
| Cold start hurts demo                      | Render Starter — $7/mo, no sleep                     |
| DB > 0.5 GB                                | Neon Launch — $19/mo, 10 GB                          |
| Cloudinary BW > 25 GB                      | Cloudinary Plus — $89/mo, or move video to Bunny.net |
| Groq rate-limited                          | Groq Developer — pay-per-token, ~$0.05/M tokens      |
| Need commercial use on frontend            | Vercel Pro — $20/mo                                  |

A reasonable "I have paying users" budget: **Render Starter $7 + Neon Launch
$19 + Vercel Pro $20 = $46/mo**. Stripe/Cloudinary still free at that scale.

---

## 11. Troubleshooting cheatsheet

| Symptom                                        | Likely cause                                          |
|------------------------------------------------|-------------------------------------------------------|
| Render build fails `tsc: not found`            | TypeScript got pruned. Add `NPM_CONFIG_PRODUCTION=false` env var, or move `typescript` to `dependencies`. |
| Render build fails `Cannot find module 'pnpm'` | Missing `corepack enable` in build command, or no `packageManager` field in root `package.json`. |
| `P1001: Can't reach database server`           | Wrong Neon URL, or missing `?sslmode=require`.        |
| `prepared statement "s0" already exists`       | You're using the pooled URL for `prisma migrate`. Use `DIRECT_URL` for migrations, pooled for runtime. |
| `CORS error` in browser                        | `FRONTEND_URL` on Render doesn't match the Vercel URL exactly (https vs http, trailing slash). |
| Cold-start 502 on Render                       | Normal for free tier. Wait ~60 s and retry.           |
| Files uploaded but 404 on next deploy          | Render disk is ephemeral. Confirm Cloudinary is wired and `CLOUDINARY_*` env vars are set. |
| 500 on `/api/rag/...`                          | Vector store re-ingest in progress on first request. Wait 10 s and retry. |
| Stripe webhook returns 400                     | `STRIPE_WEBHOOK_SECRET` must match the secret Stripe shows in the dashboard *for this endpoint*, not the global one. |

---

## Sources

- [Render — Deploy for Free](https://render.com/docs/free)
- [Render — Platforms with a real free tier for developers in 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)
- [Neon — Connect from Prisma](https://neon.com/docs/guides/prisma)
- [Neon — Connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Prisma — Neon integration](https://www.prisma.io/docs/orm/v6/overview/databases/neon)
- [Vercel — Hobby plan limits](https://vercel.com/docs/plans/hobby)
- [Vercel — Limits reference](https://vercel.com/docs/limits)
- [Vercel — Using Monorepos](https://vercel.com/docs/monorepos)
- [Northflank — Best PostgreSQL hosting providers in 2026](https://northflank.com/blog/best-postgresql-hosting-providers)
- [The Software Scout — Railway vs Render 2026](https://thesoftwarescout.com/railway-vs-render-2026-best-platform-for-deploying-apps/)
- [Koyeb acquisition by Mistral (Feb 2026)](https://northflank.com/blog/koyeb-alternatives)
- [Groq Cloud — API keys & rate limits](https://console.groq.com/docs/rate-limits)
- [Google AI Studio — Gemini API pricing](https://ai.google.dev/pricing)
- [Cloudinary — Free plan](https://cloudinary.com/pricing)
