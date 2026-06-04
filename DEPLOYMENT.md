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

### 4.1 One-time repo prep — already done

The repo now ships with these scripts in `packages/api/package.json`
(committed in the same change as this doc):

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
> available, so `tsc` resolves. But if you ever flip Render to a "production
> install" or set `NODE_ENV=production` so early that it skips dev deps, the
> build will fail with `tsc: not found`. The bulletproof fix is to add
> `NPM_CONFIG_PRODUCTION=false` as a build-time env var on Render, or
> override the install command to `pnpm install --frozen-lockfile --prod=false`.

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
   activates the pnpm version pinned in the root `package.json`'s
   `packageManager` field (`pnpm@10.2.0`, already set).

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
2. Skip "Activate payments" for now (that's the business-verification step
   required only for Live mode). You'll land in **Test mode** automatically —
   the orange "TEST" banner at the top of the dashboard is your friend.
3. Top-right toggle should read **Test mode**. Leave it there.

### 6.5.3 Grab the test secret key

1. Dashboard → **Developers → API keys** ([direct link](https://dashboard.stripe.com/test/apikeys)).
2. Reveal the **Secret key** (`sk_test_…`). Copy it.

### 6.5.4 Add the four env vars to Render

In the Render dashboard for `elearning-api` → **Environment**:

```env
STRIPE_SECRET_KEY=sk_test_…
STRIPE_SUCCESS_URL=https://<your-vercel-app>.vercel.app/payment/success
STRIPE_CANCEL_URL=https://<your-vercel-app>.vercel.app/payment/cancel
# STRIPE_WEBHOOK_SECRET — leave blank for now, you'll fill it in 6.5.5
```

Save. Render redeploys. Checkout-session creation now works; the webhook will
keep failing signature verification until §6.5.5.

### 6.5.5 Register the webhook endpoint

This is the step everyone gets wrong on their first deploy.

1. Stripe dashboard → **Developers → Webhooks** → **Add an endpoint**
   ([direct link](https://dashboard.stripe.com/test/webhooks/create)).
2. **Endpoint URL**:
   ```
   https://<your-render-app>.onrender.com/api/stripe-webhook
   ```
   No trailing slash. Note the path is `/api/stripe-webhook`, not
   `/webhooks/stripe` or any of the other names you'll see in tutorials.
3. **Listen to**: `Events on your account`.
4. **Select events** → pick **`checkout.session.completed`** only. That's the
   single event our handler reacts to. (Adding more events doesn't break
   anything — they'll be received and ignored — but it wastes Stripe's
   retry budget on payloads we don't care about.)
5. **API version**: leave on "Latest".
6. **Add endpoint**.
7. On the next screen, **Signing secret → Reveal**. Copy the `whsec_…` value.
8. Back to Render → Environment → set:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_…
   ```
   Save. Render redeploys.

### 6.5.6 Test the full flow end-to-end

1. Log into your Vercel frontend as a student.
2. Find a paid course (price > 0 — `course 1: Học React JS từ Zero đến Hero`
   is paid in the default seed). Click **Buy**.
3. You'll be redirected to Stripe Checkout. Use this magic test card:
   ```
   Card number   : 4242 4242 4242 4242
   Expiry        : any future date (e.g. 12/30)
   CVC           : any 3 digits (e.g. 123)
   ZIP / postcode: any (e.g. 90210)
   ```
   ([Full list of Stripe test cards](https://docs.stripe.com/testing#cards) —
   `4000 0000 0000 0002` simulates a decline, `4000 0027 6000 3184` triggers
   3-D Secure, etc.)
4. Complete payment. You'll be redirected to `STRIPE_SUCCESS_URL`.
5. **Verify the webhook arrived**: Stripe dashboard → Developers → Webhooks →
   your endpoint → **Events** tab. You should see one
   `checkout.session.completed` row with a green **200**. If it's red, see
   §11 of this doc.
6. **Verify the enrollment was created**: log into the student's account on
   your frontend; the course should now appear under "My courses" with a PAID
   badge.

### 6.5.7 Local development — forward webhooks with the Stripe CLI

In production, Stripe POSTs straight to your Render URL. Locally, Stripe can't
reach `localhost:3001`, so you need the CLI to tunnel events into your
machine.

```bash
# Install (one-time)
#   macOS:    brew install stripe/stripe-cli/stripe
#   Windows:  scoop install stripe
#   Linux:    https://github.com/stripe/stripe-cli/releases

stripe login                                        # opens browser, OAuth
stripe listen --forward-to localhost:3001/api/stripe-webhook
```

The CLI prints a *different* `whsec_…` signing secret on startup — that's the
**local** webhook secret, used only when forwarding through the CLI. Put it
in `packages/api/.env` as `STRIPE_WEBHOOK_SECRET` for local testing. The
production secret on Render stays untouched.

While `stripe listen` is running, every Stripe event gets mirrored to your
laptop and to the Render endpoint, so you can debug locally without breaking
the deployed flow.

### 6.5.8 Free-tier cold-start interaction

Render's 15-min sleep is a real concern here. When Stripe POSTs to your
webhook and the service is asleep:

1. The first POST gets a 502 / timeout while Render spins up (~30–60 s).
2. Stripe sees the failure and retries — [the schedule is exponential, ~3
   days total](https://docs.stripe.com/webhooks#retries), so you do not lose
   the event.
3. The second attempt usually hits a warm server and succeeds.

In practice the enrollment is granted within a minute of payment, but if a
student reports "I paid but don't have the course", check the Webhook **Events**
tab in Stripe — you'll usually see a red row followed by a green one a few
seconds later. The uptime-monitor keep-alive in §9 eliminates this entirely.

### 6.5.9 Going to Live mode (real payments)

Only do this when the project is past KLTN. The flow:

1. Stripe dashboard → **Activate payments** → fill in business details + bank
   account. Vietnam is supported via Stripe Atlas or a local payment-card
   reseller; for a school project, keep it in Test mode.
2. Switch the dashboard toggle from **Test** → **Live**.
3. Regenerate the Secret key in Live mode (`sk_live_…`) and re-create the
   webhook endpoint in Live mode (Live and Test have separate webhook
   registrations and separate signing secrets — this is the most common cause
   of "it works locally but breaks in prod after going live").
4. Update Render env vars `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to
   the Live values.

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
| Stripe webhook returns 400 "No signatures found matching the expected signature for payload" | `STRIPE_WEBHOOK_SECRET` doesn't match this endpoint's signing secret. Each endpoint in Stripe has its own `whsec_…`; the Live and Test endpoints have **different** secrets. Copy the one shown under your specific endpoint, not from anywhere else. |
| Stripe webhook returns 400 "Missing raw request body" | Some middleware ran before `express.json` and consumed the body. Check `packages/api/src/index.ts` — the `express.json({ verify })` block at line 46 must run **before** any route handler and the webhook route must be `/api/stripe-webhook` (matched by `originalUrl` on line 48). |
| Payment succeeds but enrollment never appears  | Open Stripe → Developers → Webhooks → your endpoint → Events. If the row is red, copy the response body — it's the actual error from your API. If the row is missing entirely, the URL on the endpoint is wrong. |
| Stripe Checkout shows "Something went wrong" before the card form | `STRIPE_SECRET_KEY` not set on Render, or it's a Live key while the dashboard is in Test mode (or vice versa). |
| Local `stripe listen` works but Render webhook fails | You copied the CLI's local `whsec_…` into Render. Use the dashboard endpoint's signing secret, not the CLI's. |

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
- [Stripe — Testing & test cards](https://docs.stripe.com/testing)
- [Stripe — Webhook retry behaviour](https://docs.stripe.com/webhooks#retries)
- [Stripe CLI — listen & forward](https://docs.stripe.com/stripe-cli/overview)
- [Groq Cloud — API keys & rate limits](https://console.groq.com/docs/rate-limits)
- [Google AI Studio — Gemini API pricing](https://ai.google.dev/pricing)
- [Cloudinary — Free plan](https://cloudinary.com/pricing)
