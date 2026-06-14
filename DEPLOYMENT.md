# Deployment Guide — Online E-Learning Website

> Last updated: **June 2026**. Everything runs on Render (database + backend)
> and Vercel (frontend). No credit card required. Total cost: **$0**.

---

## TL;DR — the stack

| Layer       | Service                | Free quota (2026)                                  | Card req'd? |
|-------------|------------------------|----------------------------------------------------|-------------|
| Database    | **Render** (PostgreSQL)| 1 GB storage, 256 MB RAM, expires after 90 days    | No          |
| Backend API | **Render** (Web Svc)   | 750 instance-hours/mo, 512 MB RAM, sleeps 15 min   | No          |
| Frontend    | **Vercel** (Hobby)     | 100 GB BW, 6 000 build-min, unlimited static sites | No          |
| LLM         | **Groq Cloud**         | Free tier, ~30 req/min on `llama-3.x`              | No          |
| Embeddings  | **Google Gemini**      | Free tier, `text-embedding-004` (768 dims)         | No          |
| Files       | **Cloudinary** (Free)  | 25 GB storage, 25 GB BW/mo                         | No          |

**Total monthly cost: $0.** Render's free Postgres expires after 90 days —
enough for a KLTN defence, a demo, or anything under two months.

---

## 0. Prerequisites — accounts to create

Sign up (all free, no card) before touching the repo:

1. **GitHub** — code host. Push this repo public or private; both work.
2. **Render** — <https://dashboard.render.com> — sign in with GitHub.
3. **Vercel** — <https://vercel.com/signup> — sign in with GitHub.
4. **Groq Cloud** — <https://console.groq.com/keys>.
5. **Google AI Studio** (for Gemini) — <https://aistudio.google.com/apikey>.
6. **Cloudinary** — <https://cloudinary.com/users/register/free>.

Stripe is optional. The course-purchase flow runs without it if you skip the
checkout endpoint. The dev-only `/api/enroll/confirm/:courseId` (auto-enabled
when `NODE_ENV !== 'production'`) lets you fake paid enrollments for testing.

---

## 1. Database — Render PostgreSQL

### 1.1 Create the Postgres instance

1. Render dashboard → **New +** → **PostgreSQL**.
2. Settings:
   - **Name**: `elearning-db`
   - **Region**: Oregon (same region as your backend — required for the
     internal URL to work)
   - **PostgreSQL version**: 16
   - **Instance Type**: **Free**
3. Click **Create Database**. Provisioning takes ~1 minute.
4. On the database detail page, scroll to **Connections**. Copy:
   - **Internal Database URL** — used by the backend (free, no egress charge)
     `postgresql://<user>:<password>@<host-internal>/<dbname>`
   - **External Database URL** — used from your laptop for migrations/seed
     `postgresql://<user>:<password>@<host>.singapore-postgres.render.com/<dbname>`

   > **Never paste these URLs into files you commit.** Store them only in
   > Render environment variables and your local `.env` (which is in `.gitignore`).

> **Internal vs External:** The internal URL only works from within Render's
> network (i.e. your backend web service). Use it for `DATABASE_URL` on the
> web service. Use the external URL from your local machine when running
> `prisma migrate deploy` or seeding.

### 1.2 Prisma schema — no `directUrl` needed

Unlike Neon (which uses PgBouncer), Render Postgres is a plain Postgres
connection. Open `packages/api/prisma/schema.prisma` and make sure the
`datasource` block is:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Remove `directUrl` if it's there. Commit and push.

### 1.3 Run migrations from your laptop

With the **External Database URL** in hand:

```bash
cd packages/api
DATABASE_URL='<render-external-url>' npx prisma migrate deploy
```

This applies all migrations to the Render Postgres instance. Idempotent — safe
to re-run.

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

### 4.1 One-time repo prep — already done

The repo now ships with these scripts in `packages/api/package.json`:

```jsonc
{
  "scripts": {
    "dev":         "ts-node src/index.ts",
    "build":       "tsc -p tsconfig.json",
    "start":       "node dist/src/index.js",
    "postinstall": "prisma generate"
  }
}
```

…and a `packageManager` pin in the root `package.json`:

```jsonc
{ "packageManager": "pnpm@10.2.0" }
```

> **Heads-up on dev-deps.** `typescript` and `@types/*` are still in
> `devDependencies`. Render runs the install at build time with dev deps
> available, so `tsc` resolves. If you ever hit `tsc: not found`, add
> `NPM_CONFIG_PRODUCTION=false` as a build-time env var on Render, or use
> `pnpm install --frozen-lockfile --prod=false` as the install command.

### 4.2 Create the Render web service

1. Dashboard → **New +** → **Web Service** → connect this GitHub repo.
2. Settings:
   - **Name**: `elearning-api`
   - **Region**: Oregon (must match the DB region)
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
   activates the pnpm version pinned in `packageManager` in root
   `package.json`.

3. **Environment** tab → paste this block (replace `…` with real values):

   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<render-internal-database-url>
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

   > **DATABASE_URL** must be the **Internal** URL from §1.1 — the one that
   > starts with `postgres://...@dpg-...internal/...`. The external URL works
   > too but wastes Render's egress budget.

4. **Create Web Service.** First build takes 3–5 minutes. Watch the log for
   `[server]: Server is running at http://localhost:3001`.

5. Note the public URL — `https://elearning-api-xxxx.onrender.com`. You'll
   need it for the Vercel `VITE_API_URL` in §5.

### 4.3 Apply migrations on the live DB

In the Render dashboard, open the **Shell** tab of your web service and run:

```bash
npx prisma migrate deploy
```

This applies all migrations to the Render Postgres. Idempotent — safe to
re-run. (Alternatively, run it from your laptop using the External URL as
shown in §1.3.)

### 4.4 Free-tier sleep behaviour — what to expect

Render free web services [spin down after 15 min of inactivity and take ~30–60 s
to cold-start](https://render.com/docs/free) on the next request. The first
visitor after a quiet night will see a loading spinner for up to a minute.

If that's a deal-breaker (e.g. demo day), use one of these workarounds:

- **UptimeRobot** (free) → ping `https://<your-api>.onrender.com/api/categories`
  every 5 min. Keeps the service warm.
- **GitHub Actions cron** → same idea, no third-party account needed.
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

If it doesn't read `FRONTEND_URL`, patch it now or your browser will block
every fetch with `CORS policy: No 'Access-Control-Allow-Origin' header`.

---

## 6. Wire it all together

Sanity-check by hitting these URLs in the browser:

| URL                                          | Expected                        |
|----------------------------------------------|---------------------------------|
| `https://<api>.onrender.com/api/categories`  | JSON array of 9 items           |
| `https://<api>.onrender.com/api/courses`     | JSON array of courses           |
| `https://<web>.vercel.app/`                  | Homepage renders, lists courses |
| Login flow on the Vercel URL                 | Sets JWT in localStorage, redirects |

If the API returns categories but the frontend page shows "Network Error",
99 % of the time it's either:
- `VITE_API_URL` missing the trailing `/api`, **or**
- CORS blocking the origin (check Render logs).

---

## 6.5 Stripe — paid course checkout (optional)

Skip this section if you only want free/trial enrollments. The dev-only
`/api/enroll/confirm/:courseId` endpoint (active whenever
`NODE_ENV !== 'production'`) fakes a paid enrollment without Stripe — handy for
smoke tests but you can't ship a real "buy this course" button without the
section below.

> Stripe **Test mode** is free forever, requires no business verification, and
> needs no real card. You can leave the project in test mode for a school
> demo / KLTN defence. Going to Live mode is a separate step (business
> details + bank account); the docs in this section work for both modes.

### 6.5.1 How the wiring already works in this repo

You don't need to touch any code — the integration is already in place:

| Path                            | What it does                                                  |
|---------------------------------|---------------------------------------------------------------|
| `POST /api/enroll/checkout/:id` | Creates a Stripe Checkout Session, returns the redirect URL   |
| `POST /api/stripe-webhook`      | Receives `checkout.session.completed`, grants the enrollment  |
| `packages/api/src/index.ts:46`  | Express middleware that preserves the **raw body** on the webhook route — required for signature verification |
| `packages/api/src/services/enroll.service.ts` | Reads `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` at request time |

Currency is hard-coded to **USD** (`enroll.service.ts:136`). If you want VND,
that's a code change, not a deployment change. Stripe supports VND but only as
a zero-decimal currency — `unit_amount` would need to drop the `* 100`.

### 6.5.2 Create the Stripe account

1. <https://dashboard.stripe.com/register> — email + password, that's it.
2. Skip "Activate payments" for now. You'll land in **Test mode** automatically.
3. Top-right toggle should read **Test mode**. Leave it there.

### 6.5.3 Grab the test secret key

1. Dashboard → **Developers → API keys**.
2. Reveal the **Secret key** (`sk_test_…`). Copy it.

### 6.5.4 Add the four env vars to Render

In the Render dashboard for `elearning-api` → **Environment**:

```env
STRIPE_SECRET_KEY=sk_test_…
STRIPE_SUCCESS_URL=https://<your-vercel-app>.vercel.app/payment/success
STRIPE_CANCEL_URL=https://<your-vercel-app>.vercel.app/payment/cancel
# STRIPE_WEBHOOK_SECRET — leave blank for now, fill in after 6.5.5
```

### 6.5.5 Register the webhook endpoint

1. Stripe dashboard → **Developers → Webhooks** → **Add an endpoint**.
2. **Endpoint URL**:
   ```
   https://<your-render-app>.onrender.com/api/stripe-webhook
   ```
3. **Select events** → pick **`checkout.session.completed`** only.
4. **Add endpoint** → **Signing secret → Reveal**. Copy the `whsec_…` value.
5. Back to Render → Environment:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_…
   ```
   Save. Render redeploys.

### 6.5.6 Test the full flow end-to-end

1. Log into your Vercel frontend as a student.
2. Find a paid course (price > 0). Click **Buy**.
3. Stripe Checkout — use this test card:
   ```
   Card number   : 4242 4242 4242 4242
   Expiry        : any future date (e.g. 12/30)
   CVC           : any 3 digits
   ZIP / postcode: any
   ```
4. Complete payment → redirected to `STRIPE_SUCCESS_URL`.
5. Stripe dashboard → Developers → Webhooks → your endpoint → **Events** tab.
   You should see a `checkout.session.completed` row with a green **200**.
6. The course should now appear under "My courses" with a PAID badge.

### 6.5.7 Local development — forward webhooks with the Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:3001/api/stripe-webhook
```

The CLI prints a local `whsec_…` — put it in `packages/api/.env` as
`STRIPE_WEBHOOK_SECRET` for local testing only.

### 6.5.8 Free-tier cold-start interaction

When Stripe POSTs to your webhook and the Render service is asleep:

1. First POST gets a 502 while Render spins up (~30–60 s).
2. Stripe retries on an exponential schedule (~3 days total) — you do not lose
   the event.
3. The second attempt usually hits a warm server and succeeds.

The UptimeRobot keep-alive in §4.4 eliminates this entirely.

---

## 7. Seed the database

### Option A — Re-run your local seed script against Render

```bash
cd packages/api
DATABASE_URL='<render-external-url>' npx prisma db seed
```

### Option B — Dump local Docker → restore to Render

If you only have data in the local `elearning-pg` container and no seed script:

```bash
# Dump from local container
docker exec elearning-pg pg_dump -U postgres -d elearning \
  --no-owner --no-acl --clean --if-exists \
  > elearning_dump.sql

# Restore to Render (use the External Database URL)
psql '<render-external-url>' -f elearning_dump.sql
```

Verify: `SELECT count(*) FROM "User";` should return 12.

### Test accounts after seeding

| Role    | Email                    | Password       |
|---------|--------------------------|----------------|
| Admin   | `admin@gmail.com`        | `Password123!` |
| Teacher | `nguyenvana@gmail.com`   | `Password123!` |
| Student | `student1@gmail.com`     | `Password123!` |

---

## 8. Smoke test on the deployed stack

```bash
BASE='https://<web>.vercel.app' API_BASE='https://<api>.onrender.com/api' \
  node tests/focused.test.js
```

If all 20 steps pass on the live URLs, you are deployed.

---

## 9. Operating on free tier — gotchas to plan for

- **Cold start**: 30–60 s first request after 15 min idle. Document this for
  graders. Or wire UptimeRobot / a GitHub Actions cron ping.
- **Render filesystem is ephemeral**. Anything written to disk (the `uploads/`
  dir, in-memory FAISS) is wiped on every redeploy and every cold start. The
  vector store re-ingests from the DB on first request — that's by design.
- **Render Postgres expires after 90 days.** For a KLTN demo or a 2-week
  presentation window this is irrelevant. If you need to extend, migrate the
  data to a fresh Render Postgres instance before day 90.
- **Cloudinary 25 GB bandwidth**. Video streaming will eat this fast. Cap
  upload sizes or move video to a free-tier video host (Bunny.net, Cloudflare
  Stream beta) when you outgrow it.
- **Vercel Hobby is non-commercial only.** Per Vercel's plan terms, you cannot
  run ads or charge money on a Hobby site. For a KLTN/portfolio, fine. For a
  real product, $20/mo Pro.

---

## 10. Costs & realistic upgrade paths

| Trigger                                    | Cheapest next step                                   |
|--------------------------------------------|------------------------------------------------------|
| Cold start hurts demo                      | Render Starter — $7/mo, no sleep                     |
| DB > 1 GB or need > 90 days                | Render Postgres paid — $7/mo, 1 GB                   |
| Cloudinary BW > 25 GB                      | Cloudinary Plus — $89/mo, or move video to Bunny.net |
| Groq rate-limited                          | Groq Developer — pay-per-token, ~$0.05/M tokens      |
| Need commercial use on frontend            | Vercel Pro — $20/mo                                  |

A reasonable "I have paying users" budget: **Render Starter $7 + Render Postgres
$7 + Vercel Pro $20 = $34/mo**. Stripe/Cloudinary/Groq/Gemini still free at
that scale.

---

## 11. Troubleshooting cheatsheet

| Symptom                                        | Likely cause                                          |
|------------------------------------------------|-------------------------------------------------------|
| Render build fails `tsc: not found`            | TypeScript got pruned. Add `NPM_CONFIG_PRODUCTION=false` env var. |
| Render build fails `Cannot find module 'pnpm'` | Missing `corepack enable` in build command, or no `packageManager` field in root `package.json`. |
| `P1001: Can't reach database server`           | Using External URL from inside Render (use Internal URL), or missing `?sslmode=require`. |
| `CORS error` in browser                        | `FRONTEND_URL` on Render doesn't match the Vercel URL exactly (https vs http, trailing slash). |
| Cold-start 502 on Render                       | Normal for free tier. Wait ~60 s and retry.           |
| Files uploaded but 404 on next deploy          | Render disk is ephemeral. Confirm Cloudinary is wired and `CLOUDINARY_*` env vars are set. |
| 500 on `/api/rag/...`                          | Vector store re-ingest in progress on first request. Wait 10 s and retry. |
| Stripe webhook 400 "No signatures found"       | `STRIPE_WEBHOOK_SECRET` doesn't match this endpoint's signing secret. Copy it from the specific endpoint page in Stripe, not from anywhere else. |
| Stripe webhook 400 "Missing raw request body"  | Some middleware ran before `express.json` and consumed the body. The `express.json({ verify })` block in `packages/api/src/index.ts` must run before any route handler. |
| Payment succeeds but enrollment never appears  | Stripe → Developers → Webhooks → endpoint → Events. Red row = error from your API; missing row = wrong endpoint URL. |
| DB connection works locally but fails on Render | You set the External URL in Render env vars. Replace with the Internal URL. |

---

## Sources

- [Render — Deploy for Free](https://render.com/docs/free)
- [Render — PostgreSQL free tier](https://render.com/docs/databases)
- [Vercel — Hobby plan limits](https://vercel.com/docs/plans/hobby)
- [Vercel — Using Monorepos](https://vercel.com/docs/monorepos)
- [Stripe — Testing & test cards](https://docs.stripe.com/testing)
- [Stripe — Webhook retry behaviour](https://docs.stripe.com/webhooks#retries)
- [Groq Cloud — API keys & rate limits](https://console.groq.com/docs/rate-limits)
- [Google AI Studio — Gemini API pricing](https://ai.google.dev/pricing)
- [Cloudinary — Free plan](https://cloudinary.com/pricing)
