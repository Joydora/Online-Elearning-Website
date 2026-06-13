# Online E-Learning Platform

A full-stack, highly interactive Online E-Learning Platform built as a graduation project (TLCN). The system supports a multi-role ecosystem (Students, Teachers, and Admins) with advanced features including video-embedded quizzes, coding practice (Monaco Editor), automated GitHub project submissions, peer-to-peer reviews, gamified learning paths, an AI teaching assistant (RAG), and a complete revenue dashboard.

The project is structured as a monorepo featuring a **React** SPA frontend and an **Express** API backend connected to a **PostgreSQL** database using Prisma ORM.

---

## Features

### 🎓 Student Features
- **Course Catalog**: Browse, search, and filter courses by categories, level of difficulty, and title keywords. Includes free preview lessons for guests.
- **Flexible Enrollments**: Join via **free** access, a **trial** duration limit, or **paid** enrollments integrated with Stripe Checkout.
- **Interactive Course Player**:
  - **Video Lessons**: Track progress and watch completion percentage (`watchedSeconds`).
  - **Video-Embedded Quizzes**: Pause video playback at specific timestamps to display pop-up quizzes (configurable blocking or non-blocking modes).
  - **Documents**: View course materials directly within the player.
  - **Quizzes**: Attempt time-limited, multiple-choice quizzes with history tracking.
  - **Coding Practice**: Solve coding exercises using an in-browser Monaco Editor that executes code and displays output/feedback.
- **Project-Based Learning**:
  - Submit projects by linking a GitHub repository.
  - Automatic collection of GitHub commit history.
  - Self-assessment tools and rubric-based feedback.
  - **Peer Review System**: Double-blind peer evaluations where students grade assignments using predefined rubrics.
- **Gamification & Engagement**:
  - **XP & Levels**: Earn experience points (XP) dynamically by completing lessons, coding practices, scoring perfect quizzes, and finishing courses.
  - **Streaks**: Maintain daily learning streaks to earn multiplier XP bonuses (up to 2.0x XP).
  - **Badges**: Unlock global achievements (e.g., "Rising Star", "On Fire") and course-specific certificates.
  - **Leaderboards**: Compete with other learners on weekly, monthly, and all-time leaderboards.
  - **Heatmap Grid**: Track 90-day learning activity in a GitHub-style grid.
- **Certificates**: Automatically generate verifiable, uniquely coded shareable certificates of completion once course progress reaches 100%.
- **Discussion Board**: Engage in module-wise, nested threaded discussions on course lessons.
- **Referral Program**: Share personal referral links to invite friends and track successful signups.
- **AI Teaching Assistant**: Consult a chatbot powered by local LLMs (Ollama with RAG) indexing course documents for context-specific explanations.

### 👨‍🏫 Teacher Features
- **Teacher Application**: Students can submit applications (bio, qualifications, resume upload) to be promoted to the teacher role.
- **Course Builder**: Create, edit, and organize modules and contents (video, document, quiz, practice, project assignment).
- **AI Syllabus Import**: Automatically generate module/lesson structure by pasting raw syllabus text or uploading syllabus documents via LLM parsing.
- **AI Quiz Generation**: Automatically draft multiple-choice quiz questions or full JSON schemas directly from indexed course materials using local AI.
- **Interactive Evaluation**:
  - Grade student projects using custom-defined rubrics.
  - Setup Monaco practice exercises with expected outputs and templates.
- **Student Analytics**: Track student enrollment metrics, individual lessons progress, and course metrics.
- **Earnings & Revenue Ledger**: View gross income, Stripe fees, platform commission rates, net payout share, and track payout statuses (`HELD`/`PAID`).

### 👑 Admin Features
- **Admin Dashboard**: System-wide statistics showing registrations, general revenue, active courses, and teacher applications.
- **Course Moderation**: Review submitted course drafts and manage their lifecycle (Draft → Pending Review → Approved/Rejected → Published).
- **Teacher Onboarding**: Evaluate pending teacher applications and approve/reject candidates.
- **Coupon & Promotion Engine**: Create customized discount codes (flat or percentage off) with specific start/end dates, usage limits, and course or user exclusions.
- **User Management**: Modify user roles, edit profiles, and execute user soft-deletion (with cleanup timers) or permanent bans.
- **Platform Auditing**: Access comprehensive admin audit logs showing system state diffs (before/after data tracking).

### 🤖 Platform Core & Automation
- **Scheduled Jobs (Cron)**: Background tasks managing:
  - Checking and expiring time-limited course enrollments.
  - Re-engagement alerts and deadline reminders sent to inactive students.
  - Automated deletion cleanup for users pending permanent removal.
- **Security**: JWT-based authentication stored in HTTP-only cookies, password hashing (bcrypt), and secure Google OAuth 2.0.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, React Router 7, TanStack Query v5, Zustand, Tailwind CSS, Monaco Editor |
| **Backend** | Node.js, Express 5, TypeScript, Prisma ORM, Node-Cron, Passport.js (Google OAuth 2.0) |
| **Database** | PostgreSQL |
| **Payments** | Stripe API & Webhooks |
| **Media Uploads** | Cloudinary API |
| **AI Integrations** | Ollama (Gemma 3, Nomic Embeddings), ChromaDB (Vector Store dependency) |
| **Email Delivery** | Nodemailer (SMTP) |
| **E2E Testing** | Puppeteer |

---

## Project Structure

```
Online-Elearning-Website/
├── packages/
│   ├── api/                 # Express REST API (Backend)
│   │   ├── prisma/          # Database Schema, migrations, and seed script
│   │   └── src/
│   │       ├── config/      # Auth strategy configurations (Passport)
│   │       ├── controllers/ # Request controllers
│   │       ├── jobs/        # Background cron jobs (expiry, cleanups)
│   │       ├── middleware/  # Auth & input validation middlewares
│   │       ├── routes/      # REST endpoint routes
│   │       └── services/    # Business logic (AI RAG, Stripe, Gamification)
│   └── web/                 # React Single Page App (Frontend)
│       └── src/
│           ├── components/  # Reusable UI components
│           ├── pages/       # Layouts (Admin, Student, Teacher, Learning player)
│           └── stores/      # Zustand global state stores
├── tests/                   # End-to-End integration test suites
│   ├── epics.test.js        # Puppeteer E2E covering major user journeys
│   └── manual.test.js       # Core flows test script
├── pnpm-workspace.yaml      # Monorepo workspace settings
└── package.json             # Root monorepo dev scripts
```

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+
- **PostgreSQL** 14+
- Optional for AI functionalities:
  - [Ollama](https://ollama.com/) running locally with `gemma3:4b` and `nomic-embed-text` models.
- Optional for third-party integrations:
  - Stripe Account (payment flows)
  - Cloudinary Account (images and video uploads)
  - SMTP Credentials (email dispatching)
  - Google Developer Console credentials (OAuth 2.0)
  - GitHub Access Token (GitHub project stats)

---

## Getting Started

### 1. Clone the Repository and Install Dependencies

```bash
git clone <your-repo-url>
cd Online-Elearning-Website
pnpm install
```

### 2. Configure the API Environment

```bash
cd packages/api
cp .env.example .env
```

At a minimum, configure the following variables in `packages/api/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/elearning?schema=public"
JWT_SECRET="generate-a-long-random-string-for-security"
FRONTEND_URL="http://localhost:5173"
```

Refer to [Environment Variables](#environment-variables) below for details on other optional configurations.

### 3. Initialize the Database

Run migrations to apply the database schema and populate it with sample courses, users, and quizzes:

```bash
cd packages/api
pnpm prisma migrate dev
pnpm prisma db seed
```

The seed script creates the following demo accounts (all using the password `Password123!`):

| Role | Email | Username |
|------|-------|----------|
| **Admin** | `admin@gmail.com` | `admin` |
| **Teacher** | `nguyenvana@gmail.com` | `nguyenvana` |
| **Student** | `student1@gmail.com` | `student01` |

### 4. Run Development Servers

You can launch both packages from the monorepo root:

- **Launch API (Port `3001`):**
  ```bash
  pnpm --filter api dev
  ```
- **Launch Web Client (Port `5173`):**
  ```bash
  pnpm --filter web dev
  ```

Open [http://localhost:5173](http://localhost:5173) in your browser.  
Check backend health status at [http://localhost:3001/api/health](http://localhost:3001/api/health).

---

## Environment Variables

### Backend API (`packages/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing authorization tokens |
| `FRONTEND_URL` | Client application domain (for CORS configurations) |
| `PORT` | API server port (defaults to `3001`) |
| `BCRYPT_SALT_ROUNDS` | Rounds of hashing for password encryption (defaults to `10`) |
| `STRIPE_SECRET_KEY` | Stripe Account Private API Key |
| `STRIPE_WEBHOOK_SECRET` | Signature token verifying webhook notifications |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | Stripe redirection pages |
| `PLATFORM_FEE_PCT` | Commission rate percentage deducted from paid courses (defaults to `0.3`) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Media management credentials |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Nodemailer SMTP server configuration |
| `FROM_EMAIL` / `FROM_NAME` | Mail sender details |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth 2.0 authentication keys |
| `OLLAMA_HOST` | Host address of local Ollama instance (defaults to `http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` / `OLLAMA_EMBEDDING_MODEL` | AI models used (defaults to `gemma3:4b` / `nomic-embed-text`) |
| `GITHUB_TOKEN` | Token used to verify submitted student projects |

### Frontend Web (`packages/web/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base API target URL (defaults to `http://localhost:3001/api`) |

---

## Testing

The project includes an E2E testing framework powered by Puppeteer. Before running the tests, ensure your local servers are running (`pnpm dev` on both API and Web) and that the database has been seeded.

Run the tests using:
```bash
node tests/epics.test.js
```
The test suite covers key user flows (epic 1 to 7) including student course purchasing, video player checkpoints, quizzes, gamified XP rewards, and admin checks.

---

## Build for Production

### Compile and Build Frontend
```bash
cd packages/web
pnpm build
```
This builds static assets into the `dist/` directory. You can host this using a static provider or run the built app using the included server utility:
```bash
pnpm start
```

### Run API in Production
Set `NODE_ENV=production` and run the start scripts after compiling the TypeScript code:
```bash
cd packages/api
# Ensure environment variables are fully configured on your server
pnpm dev
```

---

## User Roles

| Role | Authorizations |
|------|----------------|
| `STUDENT` | Search and preview courses, complete lessons, take quizzes, run practice code, submit projects, write reviews, post in discussions, earn badges/certificates, manage referrals. |
| `TEACHER` | Manage courses, build syllabus structures, import syllabus via AI, generate quizzes, review student analytics, review earnings. |
| `ADMIN` | Manage all system resources, review course publication drafts, approve teacher requests, manage promotions, review admin audit logs, delete/ban users. |

---

## License

This project is licensed under the **ISC License** — see individual packages' `package.json` files for more details.
