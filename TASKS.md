Here is the full English translation of your task list, maintaining the original markdown formatting and technical terminology:

```markdown
# 📋 Task List — Online E-Learning Platform

> Summary of tasks to be executed to fulfill feedback regarding the platform.
> Use this document for team task delegation.

---

## 📘 Current System Overview

### Tech Stack
- **API**: Express 5 + TypeScript + Prisma (PostgreSQL) + JWT + Stripe + Cloudinary + Ollama/ChromaDB
- **Web**: React 19 + Vite + React Router 7 + TailwindCSS + shadcn/ui + Zustand + React Query + Zod

### Current DB Architecture
```text
User (STUDENT / TEACHER / ADMIN)
 └─ Course ──┬─ Module ──┬─ Content (VIDEO | DOCUMENT | QUIZ)
             │           │    ├─ Question ── AnswerOption
             │           │    └─ QuizAttempt
             │           └─ Comment (nested)
             ├─ Enrollment (progress 0–100) ── Payment (Stripe)
             └─ Review
```

### Core Files
| Domain | Path |
|---|---|
| DB Schema | `packages/api/prisma/schema.prisma` |
| Auth | `packages/api/src/services/auth.service.ts` |
| Course CRUD | `packages/api/src/services/course.service.ts` |
| Quiz | `packages/api/src/services/quiz.service.ts` |
| Enroll + Stripe | `packages/api/src/services/enroll.service.ts` |
| AI Chatbot (RAG) | `packages/api/src/services/simpleChatbot.service.ts`, `rag.service.ts`, `vectorStore.service.ts` |
| Student player | `packages/web/src/pages/learning/CoursePlayer.tsx` |
| Teacher dashboard | `packages/web/src/pages/teacher/*` |
| Admin panel | `packages/web/src/pages/admin/*` |

### ❌ Gaps Compared to Feedback
- Quizzes are standalone content, not yet embedded into video timestamps.
- No moderation/approval workflow before publishing a course.
- No free trial/preview functionality.
- No time limit for enrollment → Database will bloat.
- No practical exercises (practice) alongside theoretical lessons.
- AI chatbot hasn't been fed structured syllabi to act as a Teaching Assistant (TA).
- Revenue is calculated implicitly on the FE; no ledger for admins.
- No syllabus import or auto-generation of chapters.
- No learning paths or course recommendations.
- No project-based learning.

---

## 🎯 Task List (11 Epics)

### EPIC 1 — In-Video Embedded Quizzes (Timestamp-based)
**Objective**: Quizzes appear in the video at specific timestamps, and also on the learning progress page.

**Tasks**:
- [ ] Add model `VideoQuizMarker { id, contentId, timestampSec, questionId, blockingMode: pause|non-blocking }` to `schema.prisma`
- [ ] Migration + update `quiz.service.ts` to return markers by content
- [ ] Endpoints: `GET /api/contents/:id/markers`, `POST/DELETE /api/markers`
- [ ] FE — `CoursePlayer.tsx`: listen to `timeupdate` event, upon reaching a marker → pause video + display quiz modal
- [ ] FE — Teacher UI: add markers directly on the video timeline (`ManageQuiz.tsx`)
- [ ] Save results to `QuizAttempt` and update progress

**Affected Files**: `schema.prisma`, `quiz.service.ts`, `CoursePlayer.tsx`, `ManageQuiz.tsx`

---

### EPIC 2 — Content Moderation / Approval Flow
**Objective**: Review materials, courses, and lessons before students can access them.

**Tasks**:
- [ ] Add enum `CourseStatus: DRAFT | PENDING_REVIEW | APPROVED | REJECTED | PUBLISHED`
- [ ] Add fields to `Course`: `status`, `rejectionReason`, `submittedAt`, `reviewedBy`
- [ ] Add similar fields for `Content` (reviewing individual lessons/materials)
- [ ] Endpoints:
  - `POST /api/courses/:id/submit` (teacher)
  - `POST /api/admin/courses/:id/approve` / `/reject` (admin)
- [ ] Page `/admin/courses/review` — pending review queue + content preview + reject reason form
- [ ] Block enrollment/access if `status !== PUBLISHED`
- [ ] Notification for teacher upon rejection (email or in-app)

**Affected Files**: `schema.prisma`, `admin.routes.ts`, `course.service.ts`, `web/src/pages/admin/ReviewCourses.tsx` (new)

---

### EPIC 3 — Course Trial / Free Preview
**Objective**: Allow free trials before purchasing.

**Tasks**:
- [ ] Add `Content.isFreePreview: boolean` — teachers select a few lessons to open for guests
- [ ] Add `Course.trialDurationDays: int?` — number of free trial days after registering for a trial
- [ ] Model `Enrollment.type: TRIAL | PAID` + `Enrollment.expiresAt`
- [ ] "Free Trial" button on `CourseDetail.tsx`
- [ ] Middleware check: if trial expires → redirect to the purchase page
- [ ] Stream video: check permissions based on `isFreePreview` OR active enrollment

**Affected Files**: `schema.prisma`, `enroll.service.ts`, `CourseDetail.tsx`, new middleware

---

### EPIC 4 — Time-limited Enrollment + Auto-removal
**Objective**: Enrollments have an expiration date; automatically remove students upon expiration but retain history.

**Tasks**:
- [ ] Add `Course.accessDurationDays: int?` (null = lifetime access)
- [ ] Add `Enrollment.expiresAt: DateTime?`, `Enrollment.isActive: boolean`
- [ ] Cron job `node-cron` running daily: set `isActive=false` for expired enrollments
- [ ] **DO NOT delete records** — keep for audit/re-purchasing, only block access
- [ ] Middleware `/learning/:id`: reject if `isActive === false`
- [ ] Email reminders 7 days and 1 day before expiration
- [ ] Student UI: display remaining days in the course

**New Files**: `api/src/jobs/expireEnrollments.ts`
**Affected Files**: `schema.prisma`, `enroll.service.ts`, `CoursePlayer.tsx`

---

### EPIC 5 — AI Teaching Assistant (Syllabus-aware)
**Objective**: AI acts as the specific course instructor, not a generic chatbot.

**Tasks**:
- [ ] Add `Course.syllabus: Json` (teacher inputs table of contents + descriptions)
- [ ] Upon syllabus update → re-ingest into ChromaDB with namespace = `course:${id}`
- [ ] Endpoint `POST /api/ta/:courseId/ask` — system prompt: "You are the instructor for course X, only answer within the scope of the following syllabus..."
- [ ] TA Panel in `CoursePlayer.tsx` — context-aware based on the currently viewed lesson
- [ ] AI can generate suggested quiz questions based on lesson content
- [ ] Leverage existing `embedding.service.ts` + `vectorStore.service.ts`

**Affected Files**: `simpleChatbot.service.ts`, `rag.service.ts`, `vectorStore.service.ts`, `CoursePlayer.tsx`

---

### EPIC 6 — Syllabus Import + Auto-generate Chapters
**Objective**: Import syllabus → AI parses → auto-generates chapters → teacher modifies.

**Tasks**:
- [ ] New page `/teacher/courses/:id/syllabus`
- [ ] Upload PDF/DOCX/MD files or paste text
- [ ] Service `syllabusParser.service.ts` calls Ollama to parse → JSON tree `{ chapters: [{ title, lessons: [{ title, type, description }] }] }`
- [ ] Tree-view preview, allowing teachers to drag/drop, rename, and delete nodes
- [ ] Commit: auto-create corresponding empty `Module` + `Content` structures
- [ ] Teacher only needs to upload media afterward

**New Files**: `api/src/services/syllabusParser.service.ts`, `web/src/pages/teacher/SyllabusImport.tsx`

---

### EPIC 7 — Practical Interaction / Practice Alongside Theory
**Objective**: Provide practical exercises running parallel to theoretical videos.

**Tasks**:
- [ ] Add `ContentType.PRACTICE` and `ContentType.ASSIGNMENT`
- [ ] Model `Practice { id, contentId, prompt, starterCode?, expectedOutput?, rubric }`
- [ ] Model `PracticeSubmission { studentId, practiceId, submittedCode, submittedAt, aiFeedback, score }`
- [ ] FE split-view in `CoursePlayer.tsx`: video on the left, Monaco editor + practice panel on the right
- [ ] AI auto-grading via Ollama (output comparison) or running a code sandbox (Docker)
- [ ] Display real-time feedback after submission

**Affected Files**: `schema.prisma`, `CoursePlayer.tsx` (requires layout refactor)

---

### EPIC 8 — Admin-Managed Revenue Ledger
**Objective**: Admin manages revenue; teachers only see class statistics.

**Tasks**:
- [ ] Remove revenue block from teacher `Dashboard.tsx` — only keep: number of active classes, students, and lessons
- [ ] Model `RevenueLedger { id, paymentId, courseId, teacherId, grossAmount, platformFee, teacherShare, payoutStatus: HELD|PAID, createdAt }`
- [ ] In Stripe webhook: upon completed payment → auto-create ledger entry (`platformFee` configured in `.env`)
- [ ] Page `/admin/revenue`: filter by teacher/course/period, export CSV, mark payouts
- [ ] Teachers have a read-only page to view funds currently HELD (cannot withdraw directly)

**Affected Files**: `schema.prisma`, `enroll.service.ts` (webhook), `admin.routes.ts`, `web/src/pages/admin/Revenue.tsx` (new), `web/src/pages/teacher/Dashboard.tsx` (edit)

---

### EPIC 9 — Course Recommendations Based on Learning Paths
**Objective**: Suggest learning paths from basic → advanced based on user needs.

**Tasks**:
- [ ] Add `Course.level: BEGINNER | INTERMEDIATE | ADVANCED`
- [ ] Self-relation many-to-many `Course.prerequisites: Course[]`
- [ ] Page `/learning-path` — form asking for goals (e.g., "fullstack web dev") + current level
- [ ] Endpoint `POST /api/recommend/path` — use embeddings to match needs ↔ course descriptions, sorted by level + prerequisites
- [ ] Display a course timeline with the study sequence

**Affected Files**: `schema.prisma`, `web/src/pages/LearningPath.tsx` (new), leverage `embedding.service.ts`

---

### EPIC 10 — Project-Based Learning (Push/Pull like GitHub)
**Objective**: Learn web programming via practical projects, managing commits like GitHub.

**Tasks**:
- [ ] Model `Project { id, courseId, title, description, requirements, deadline }`
- [ ] Model `ProjectSubmission { id, projectId, studentId, repoUrl, commitHistory: Json, feedback, grade }`
- [ ] GitHub OAuth: students link their repos
- [ ] Backend pulls commit history via GitHub API, displaying a timeline
- [ ] Teacher review: view commits, inline comments
- [ ] (Optional) Self-host a mini git server if not using GitHub

**New Files**: `api/src/services/github.service.ts`, `web/src/pages/learning/Projects.tsx`

---

### EPIC 11 — Comprehensive Learning Progress Dashboard
**Objective**: Progress is calculated based on video + quizzes + practice, not just a single 0–100 number.

**Tasks**:
- [ ] New progress formula: weighted (video watched % × 0.4) + (quiz score × 0.3) + (practice passed × 0.3)
- [ ] Endpoint `GET /api/enrollments/:id/progress` — returns detailed stats per module
- [ ] Page `/learning/:courseId/progress` — module checklist, quiz scores, practice status
- [ ] AI summary: student's strengths and weaknesses
- [ ] Trigger progress updates upon completing a unit (video finished, quiz passed, practice passed)

**Affected Files**: `enroll.service.ts`, `quiz.service.ts`, `CoursePlayer.tsx`

---

## 🗺️ Proposed Roadmap

| Sprint | Epic | Reason for Priority |
|---|---|---|
| **1** | #2 Moderation + #4 Time-limit | Prevent DB bloat + inappropriate content before scaling |
| **2** | #8 Revenue ledger | Separate financial permissions early; later migration is complex |
| **3** | #6 Syllabus import + #1 Quiz in-video | Increase core value |
| **4** | #5 AI TA | Leverage existing RAG/chatbot |
| **5** | #3 Trial + #9 Recommendation | Increase conversion rates |
| **6** | #7 Practice + #10 Project + #11 Progress | Aligns with the project-based thesis direction |

---

## 📌 Suggested Assignments (adjust per team)

| Role | Suitable Epics |
|---|---|
| Backend lead | #2, #4, #8 (heavy schema + migrations) |
| AI engineer | #5, #6, #9 (Ollama + RAG) |
| Frontend lead | #1, #7, #11 (complex player UX) |
| Fullstack | #3, #10 |

---

## ⚠️ Decisions to Finalize Before Coding

1. **Expired enrollments**: hard delete or disable? → proposed: **disable + keep records**
2. **GitHub integration**: Real GitHub OAuth, or self-build internal repos?
3. **AI practice grading**: Is Ollama accurate enough, or do we need a Docker sandbox?
4. **Revenue split**: What is the platform / teacher %? Configure in `.env` or DB?
5. **In-video quiz blocking**: Mandatory to answer before continuing, or optional?
6. **Trial duration**: Default to how many days? How many lessons allowed for free preview?

---

_Last updated: 2026-04-19_
```