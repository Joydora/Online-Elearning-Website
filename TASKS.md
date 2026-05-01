# 📋 Task List — Online E-Learning Platform

> Tổng hợp các task cần thực hiện để fulfill feedback về platform.
> Dùng file này để phân chia công việc cho team.

---

## 📘 Tổng quan hệ thống hiện tại

### Tech Stack
- **API**: Express 5 + TypeScript + Prisma (PostgreSQL) + JWT + Stripe + Cloudinary + Ollama/ChromaDB
- **Web**: React 19 + Vite + React Router 7 + TailwindCSS + shadcn/ui + Zustand + React Query + Zod

### Kiến trúc DB hiện tại
```
User (STUDENT / TEACHER / ADMIN)
 └─ Course ──┬─ Module ──┬─ Content (VIDEO | DOCUMENT | QUIZ)
             │           │    ├─ Question ── AnswerOption
             │           │    └─ QuizAttempt
             │           └─ Comment (nested)
             ├─ Enrollment (progress 0–100) ── Payment (Stripe)
             └─ Review
```

### File chính
| Khu vực | Đường dẫn |
|---|---|
| Schema DB | `packages/api/prisma/schema.prisma` |
| Auth | `packages/api/src/services/auth.service.ts` |
| Course CRUD | `packages/api/src/services/course.service.ts` |
| Quiz | `packages/api/src/services/quiz.service.ts` |
| Enroll + Stripe | `packages/api/src/services/enroll.service.ts` |
| Chatbot AI (RAG) | `packages/api/src/services/simpleChatbot.service.ts`, `rag.service.ts`, `vectorStore.service.ts` |
| Student player | `packages/web/src/pages/learning/CoursePlayer.tsx` |
| Teacher dashboard | `packages/web/src/pages/teacher/*` |
| Admin panel | `packages/web/src/pages/admin/*` |

### ❌ Gaps so với feedback
- Không có trial/preview miễn phí
- Không có time-limit cho enrollment → DB sẽ phình
- Không có bài thực hành (practice) song song lý thuyết
- Revenue tính ngầm ở FE, chưa có ledger cho admin
- Không có learning path / recommendation
- Không có project-based learning

---

## 🎯 Task List (7 Epics)

### EPIC 1 — Trial / Preview khoá học
**Mục tiêu**: Cho phép học thử miễn phí trước khi mua.

**Công việc**:
- [ ] Thêm `Content.isFreePreview: boolean` — teacher chọn vài bài mở cho guest
- [ ] Thêm `Course.trialDurationDays: int?` — số ngày học thử miễn phí sau khi đăng ký trial
- [ ] Model `Enrollment.type: TRIAL | PAID` + `Enrollment.expiresAt`
- [ ] Nút "Học thử" trên `CourseDetail.tsx`
- [ ] Middleware check: trial hết hạn → redirect vào trang mua
- [ ] Stream video: check quyền theo `isFreePreview` OR enrollment active

**File đụng**: `schema.prisma`, `enroll.service.ts`, `CourseDetail.tsx`, middleware mới

---

### EPIC 2 — Time-limit enrollment + auto-remove
**Mục tiêu**: Enrollment có hạn, tự động remove student khi hết hạn nhưng giữ lịch sử.

**Công việc**:
- [ ] Thêm `Course.accessDurationDays: int?` (null = vĩnh viễn)
- [ ] Thêm `Enrollment.expiresAt: DateTime?`, `Enrollment.isActive: boolean`
- [ ] Cron job `node-cron` chạy daily: set `isActive=false` cho enrollment quá hạn
- [ ] **KHÔNG xoá record** — giữ để audit/re-purchase, chỉ chặn access
- [ ] Middleware `/learning/:id`: reject nếu `isActive === false`
- [ ] Email nhắc trước khi hết hạn 7 ngày, 1 ngày
- [ ] UI học viên: hiển thị ngày còn lại trong course

**File mới**: `api/src/jobs/expireEnrollments.ts`
**File đụng**: `schema.prisma`, `enroll.service.ts`, `CoursePlayer.tsx`

---

### EPIC 3 — Tương tác thực tế / Practice song song lý thuyết
**Mục tiêu**: Có bài thực hành song song với video lý thuyết.

**Công việc**:
- [ ] Thêm `ContentType.PRACTICE` và `ContentType.ASSIGNMENT`
- [ ] Model `Practice { id, contentId, prompt, starterCode?, expectedOutput?, rubric }`
- [ ] Model `PracticeSubmission { studentId, practiceId, submittedCode, submittedAt, aiFeedback, score }`
- [ ] FE split-view trong `CoursePlayer.tsx`: video bên trái, Monaco editor + panel practice bên phải
- [ ] AI auto-grade bằng Ollama (so sánh output) hoặc chạy code sandbox (Docker)
- [ ] Hiển thị feedback realtime sau khi submit

**File đụng**: `schema.prisma`, `CoursePlayer.tsx` (cần refactor layout)

---

### EPIC 4 — Revenue ledger do Admin quản lý
**Mục tiêu**: Admin quản lý doanh thu, teacher chỉ thấy số lớp.

**Công việc**:
- [ ] Bỏ block revenue khỏi teacher `Dashboard.tsx` — chỉ giữ: số lớp đang dạy, số học viên, số bài học
- [ ] Model `RevenueLedger { id, paymentId, courseId, teacherId, grossAmount, platformFee, teacherShare, payoutStatus: HELD|PAID, createdAt }`
- [ ] Trong Stripe webhook: khi payment completed → tự tạo ledger entry (platformFee config ở .env)
- [ ] Trang `/admin/revenue`: filter theo teacher/course/period, export CSV, mark payout
- [ ] Teacher có trang read-only xem tiền đang HELD (không tự rút)

**File đụng**: `schema.prisma`, `enroll.service.ts` (webhook), `admin.routes.ts`, `web/src/pages/admin/Revenue.tsx` (mới), `web/src/pages/teacher/Dashboard.tsx` (sửa)

---

### EPIC 5 — Course Recommendation theo learning path
**Mục tiêu**: Gợi ý lộ trình từ cơ bản → nâng cao theo nhu cầu.

**Công việc**:
- [ ] Thêm `Course.level: BEGINNER | INTERMEDIATE | ADVANCED`
- [ ] Self-relation many-to-many `Course.prerequisites: Course[]`
- [ ] Trang `/learning-path` — form hỏi mục tiêu (VD: "web dev fullstack") + level hiện tại
- [ ] Endpoint `POST /api/recommend/path` — dùng embedding match nhu cầu ↔ course description, sắp xếp theo level + prerequisite
- [ ] Hiển thị timeline courses với thứ tự học

**File đụng**: `schema.prisma`, `web/src/pages/LearningPath.tsx` (mới), tận dụng `embedding.service.ts`

---

### EPIC 6 — Project-based learning (push/pull như GitHub)
**Mục tiêu**: Học web programming qua project thực tế, quản lý commit như GitHub.

**Công việc**:
- [ ] Model `Project { id, courseId, title, description, requirements, deadline }`
- [ ] Model `ProjectSubmission { id, projectId, studentId, repoUrl, commitHistory: Json, feedback, grade }`
- [ ] GitHub OAuth: học viên link repo
- [ ] Backend pull commit history qua GitHub API, hiển thị timeline
- [ ] Teacher review: xem commit, comment inline
- [ ] (Optional) Tự build mini git server nếu không dùng GitHub

**File mới**: `api/src/services/github.service.ts`, `web/src/pages/learning/Projects.tsx`

---

### EPIC 7 — Learning Progress Dashboard tổng hợp
**Mục tiêu**: Progress tính theo video + quiz + practice, không chỉ một con số 0–100.

**Công việc**:
- [ ] Công thức progress mới: weighted (video watched % × 0.4) + (quiz score × 0.3) + (practice passed × 0.3)
- [ ] Endpoint `GET /api/enrollments/:id/progress` — trả chi tiết từng module
- [ ] Trang `/learning/:courseId/progress` — checklist module, quiz scores, practice status
- [ ] AI summary: điểm mạnh, điểm yếu của học viên
- [ ] Trigger update progress mỗi khi hoàn thành 1 đơn vị (video xong, quiz pass, practice pass)

**File đụng**: `enroll.service.ts`, `quiz.service.ts`, `CoursePlayer.tsx`

---

## 🗺️ Roadmap đề xuất

| Sprint | Epic | Lý do ưu tiên |
|---|---|---|
| **1** | #2 Time-limit enrollment | Chặn DB phình trước khi scale |
| **2** | #4 Revenue ledger | Tách quyền tài chính sớm, migration sau phức tạp |
| **3** | #1 Trial + #5 Recommendation | Tăng conversion, leverage RAG có sẵn |
| **4** | #3 Practice + #7 Progress | Core UX học tập |
| **5** | #6 Project-based | Đúng hướng khoá luận project-based |

---

## 📌 Phân công gợi ý (điều chỉnh theo team)

| Người | Epic phù hợp |
|---|---|
| Backend lead | #2, #4 (schema + migration + cron + webhook) |
| AI engineer | #5, #3 (embedding + Ollama grading) |
| Frontend lead | #3, #7 (UX player phức tạp, dashboard) |
| Fullstack | #1, #6 |

---

## ⚠️ Quyết định cần chốt trước khi code

1. **Enrollment hết hạn**: xoá hẳn hay disable? → đề xuất **disable + giữ record**
2. **GitHub integration**: OAuth GitHub thật, hay tự build repo nội bộ?
3. **AI grading practice**: Ollama đủ chính xác không, hay cần Docker sandbox?
4. **Revenue split**: % platform / teacher = bao nhiêu? Config ở `.env` hay DB?
5. **Trial duration**: mặc định bao nhiêu ngày? Cho bao nhiêu bài free preview?

---

_Last updated: 2026-04-19_
