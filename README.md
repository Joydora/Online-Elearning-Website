# Online E-Learning Platform

A full-stack online learning platform built as a graduation project (TLCN). Students can browse courses, watch lessons, take quizzes, submit code exercises, and earn certificates. Teachers create and manage courses; admins moderate content, manage users, and oversee revenue.

Monorepo layout: **React** frontend + **Express** API + **PostgreSQL** (Prisma ORM).

---

## Features

### Students
- Browse and search courses; free preview lessons
- Enroll via **trial**, **free**, or **paid** (Stripe checkout)
- Course player: video, documents, quizzes, coding practice (Monaco editor), assignments
- Track progress, learning path with prerequisites, certificates
- Course discussions, notifications, AI chatbot (RAG over course content)
- Quiz history and project submissions (GitHub integration)

### Teachers
- Create and edit courses; upload media (Cloudinary)
- Manage modules and content (video, document, quiz, practice, assignment)
- **AI syllabus import** — paste or upload syllabus text, parse into modules/lessons
- Manage quizzes, grade projects, view enrolled students and performance
- Revenue dashboard and payout tracking

### Admins
- Course approval workflow (draft → pending → published / rejected)
- User and category management, promotions, platform revenue
- Audit logs

### Platform
- JWT auth (HTTP-only cookie) + **Google OAuth**
- Email verification and password reset
- Scheduled jobs: enrollment expiry, notification reminders
- Optional **Ollama** for AI: syllabus parsing, practice feedback, RAG chatbot
- Optional **ChromaDB** for vector search

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, Tailwind CSS, Radix UI, Monaco Editor |
| Backend | Node.js, Express 5, TypeScript, Prisma |
| Database | PostgreSQL |
| Payments | Stripe |
| Media | Cloudinary |
| AI (optional) | Ollama, ChromaDB |
| Email | Nodemailer (SMTP) |
| Testing | Puppeteer E2E (`tests/epics.test.js`) |

---

## Project Structure

```
Online-Elearning-Website/
├── packages/
│   ├── api/                 # Express REST API
│   │   ├── prisma/          # Schema, migrations, seed
│   │   └── src/
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── routes/
│   │       └── jobs/
│   └── web/                 # React SPA (Vite)
│       └── src/
│           ├── pages/       # student / teacher / admin / learning
│           ├── components/
│           └── stores/
├── tests/                   # Puppeteer E2E tests
├── 03-modern-javascript.md  # Sample course content (import guides)
├── 05-cs50-intro-to-cs.md
└── ...
```

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+
- **PostgreSQL** 14+
- Optional for full AI features:
  - [Ollama](https://ollama.com/) with models such as `gemma3:4b`, `nomic-embed-text`
  - ChromaDB (used by the RAG chatbot)
- Optional for production-like setup:
  - Stripe account (payments)
  - Cloudinary account (file uploads)
  - SMTP credentials (email)
  - Google OAuth credentials

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Online-Elearning-Website
pnpm install
```

### 2. Configure the API

```bash
cd packages/api
cp .env.example .env
```

Edit `.env` — at minimum set:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/elearning?schema=public"
JWT_SECRET="change-me-to-a-long-random-string"
FRONTEND_URL="http://localhost:5173"
```

See [Environment variables](#environment-variables) for the full list.

### 3. Database setup

```bash
cd packages/api
pnpm prisma migrate deploy
pnpm prisma db seed
```

Seed creates demo accounts (password for all: `Password123!`):

| Role | Email |
|------|-------|
| Admin | `admin@gmail.com` |
| Teacher | `nguyenvana@gmail.com` |
| Student | `student1@gmail.com` |

### 4. Run development servers

**Terminal 1 — API** (default port `3001`):

```bash
cd packages/api
pnpm dev
```

**Terminal 2 — Web** (default port `5173`):

```bash
cd packages/web
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

API health check: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### 5. Frontend API URL (optional)

If the API is not on `localhost:3001`, create `packages/web/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Environment Variables

### API (`packages/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `FRONTEND_URL` | Frontend origin (CORS + redirects) |
| `PORT` | API port (default `3001`) |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds (default `10`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | Payment redirect URLs |
| `PLATFORM_FEE_PCT` | Platform fee on paid enrollments (default `0.3`) |
| `CLOUDINARY_*` | Cloudinary upload credentials |
| `SMTP_*`, `FROM_EMAIL`, `FROM_NAME` | Email delivery |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth |
| `OLLAMA_HOST`, `OLLAMA_MODEL`, `OLLAMA_EMBEDDING_MODEL` | Local LLM for AI features |
| `GITHUB_TOKEN` | GitHub API for project submission checks |

### Web (`packages/web/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default `http://localhost:3001/api`) |

---

## Course Content

Markdown files in the repo root document sample courses (CS50, calculus, JavaScript, SQL, HTML/CSS, React) with:

- Course metadata and lesson descriptions
- **Syllabus** text/JSON for Import Syllabus
- **Practice exercises** with prompts and starter code

Use them as templates when adding courses manually or via the teacher/admin UI.

---

## Testing

E2E tests use Puppeteer. Start both dev servers and the seeded database first:

```bash
node tests/epics.test.js
```

Tests cover major flows across EPICs 1–7 (enrollment, progress, practice, admin, etc.).

---

## Build for Production

```bash
# Frontend
cd packages/web
pnpm build
pnpm preview   # or serve dist/ with your static host

# API — run with ts-node or compile TypeScript first
cd packages/api
pnpm dev       # development
# Set NODE_ENV=production and configure all env vars on your host
```

The web package includes a small Express `server.js` for serving the built SPA in production.

---

## User Roles

| Role | Access |
|------|--------|
| `STUDENT` | Enroll, learn, quiz, practice, discussions, certificates |
| `TEACHER` | Own courses, content, syllabus import, student analytics |
| `ADMIN` | Full platform management, course review, audit logs |

---

## License

ISC — see individual package `package.json` files.

---

## Acknowledgments

Sample course videos and curricula reference openly licensed content (e.g. freeCodeCamp, Harvard CS50, 3Blue1Brown). Course markdown files in this repo are import guides only; verify URLs and licensing before publishing publicly.
