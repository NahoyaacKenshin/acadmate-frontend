```markdown
# AcadMate — Full Project Development Plan (Revised)

> **Timeline:** 5 Months (20 Weeks)
> **Team:** 3 Members (1 Backend, 2 Frontend)
> **Start Date:** Week of June 23, 2026

---

## Team Roles

| Role | Responsibility |
|---|---|
| **Backend Developer (You)** | Database architecture (Prisma/Neon Postgres), REST API development, AI pipelines (Gemini), file storage (Supabase), PowerSync configuration & JWT auth, Expo push notifications server-side. |
| **Frontend Developer 1 (UI/UX)** | Screen design & layout, navigation, UI components, animations, and visual polish, Using Uniwind and React Native Reusables. |
| **Frontend Developer 2 (State & Integration)** | Zustand state management, API service layer (Write-path), PowerSync/SQLite local queries (Read-path), Expo Notifications client-side, file upload logic. |

---

## Technology Decisions (Locked In)

| Decision | Choice | Reason |
|---|---|---|
| **AI Provider** | Google Gemini (Free tier models) | Free, generous rate limits. Can rotate between `gemini-2.0-flash` and `gemini-2.5-flash` when one exhausts. |
| **File Storage** | Supabase Storage (Free tier) | 1GB storage, 2GB bandwidth/month. No credit card. Dead-simple SDK. |
| **Vector Database** | pgvector on Neon Postgres | Already using Neon — just enable the extension. No extra service to manage. |
| **Push Notifications** | Expo Notifications (`expo-notifications`) | Handles FCM/APNs under the hood. Simple token-based API. No Firebase setup needed. |
| **Offline Sync** | PowerSync + SQLite | Installed in the frontend. Syncs local SQLite ↔ Neon Postgres automatically. |

---

## Phase 1: Foundation, PowerSync & To-Do List (Weeks 1–2, June 23, 2026 - July 6, 2026)

**Goal:** Establish the offline-first architecture day one, authenticate clients, and implement a fully synchronized task manager.

### Week 1: Project Setup, PowerSync Sync Rules & Core Architecture

#### Backend
- [x] Finalize Prisma schema for `User`, `Token`, `Subject`, `Task`.
- [x] Generate and apply database migrations.
- [x] Connect PowerSync Cloud to Neon Postgres and define initial **Sync Rules** for `tasks` and `subjects`.
- [x] Implement the PowerSync JWT authentication endpoint (`/api/auth/powersync-token`) to securely authorize clients.
- [x] Build **Write-Path** REST APIs for Subjects (`POST/PUT/DELETE /api/subjects`).
- [x] Build **Write-Path** REST APIs for Tasks (`POST/PUT/DELETE /api/tasks`).
- [x] Document strict JSON response contracts for all endpoints (including mocked AI schemas) in Postman/Thunder Client for the frontend team.

#### Frontend 1 (UI/UX)
- [x] Finalize the app's design system: color palette, typography, spacing, component library.
- [x] Build the bottom tab navigation layout (Home, Calendar, Tasks, Notebook, Settings).
- [x] Design the Login and Signup screens (polish existing ones).

#### Frontend 2 (State & Integration)
- [x] Initialize PowerSync client SDK with the local SQLite database matching the Postgres schema.
- [x] Set up a centralized API service layer (`src/services/api.ts`) dedicated exclusively to **Write operations**.
- [x] Implement Zustand stores for auth state and system statuses.
- [x] Connect the Login/Signup screens to the backend API.
- [x] Establish the local PowerSync stream reader context so UI components can subscribe to local data immediately.

---

### Week 2: Task Manager Feature (Native Offline-First)

#### Backend
- [x] Add backend validation for task edge cases (empty titles, invalid dates, duplicate subjects).
- [x] Add a `GET /api/tasks/stats` analytical endpoint (total tasks, completed count, overdue count).

#### Frontend 1 (UI/UX)
- [x] Build the main Task List screen (subscribing to the local PowerSync SQLite database, grouped by subject, color-coded).
- [x] Build the "Add Task" bottom sheet / modal (title, description, due date picker, subject selector).
- [x] Build the "Edit Task" screen.
- [x] Implement swipe-to-complete and swipe-to-delete gestures with animations.

#### Frontend 2 (State & Integration)
- [x] Bind the Task List UI directly to local PowerSync reactive queries (Reads require zero REST API calls).
- [x] Connect Add/Edit/Delete Task actions to the backend Write REST API.
- [x] Implement optimistic local UI updates if necessary, allowing PowerSync to reconcile downstream changes automatically.
- [x] Test offline scenarios: create tasks offline $\rightarrow$ verify local database updates instantly $\rightarrow$ go online $\rightarrow$ verify upstream sync to Neon.

---

## Phase 2: Calendar & Scheduler (Weeks 3–4, July 7, 2026 - July 20, 2026)

**Goal:** Build a calendar supporting automated local streams, Philippine holiday awareness, and AI-powered schedule parsing from uploaded documents.

### Week 3: Calendar Core & Holidays

#### Backend
- [x] Design and migrate Prisma schema for `ClassSchedule` (recurring classes with Set A/B, F2F/Online) and `CalendarEvent` (one-off non-academic events).
- [x] Update PowerSync Sync Rules to include `class_schedules` and `calendar_events`.
- [x] Build Write-path REST APIs for ClassSchedules (`POST/PUT/DELETE /api/class-schedules`) and CalendarEvents (`POST/PUT/DELETE /api/events`).
- [x] Seed a `philippine_holidays` table with official PH holidays (2026–2027) or integrate a public holidays API.
- [x] Create a `GET /api/holidays?year=2026` cacheable endpoint.

#### Frontend 1 (UI/UX)
- [x] Build the Calendar screen with Monthly view (dots indicating events on each day).
- [x] Build the Day view (list of events for a selected day).
- [x] Build the "Add Event" modal (title, start/end time pickers, optional subject link).
- [x] Build the "Add Class Schedule" manual entry modal (recurring day, time, modality, set type).
- [x] Render Philippine holidays as special markers on the calendar.

#### Week 3 Refinements (Data Model & UI Enhancements)
- [x] **Backend**: Update `ClassSchedule` in `schema.prisma` to include `startDate` and `endDate` (DateTime). Run Prisma migrations, update Zod validation schemas (`src/schema/class-schedule.ts`), and update PowerSync sync rules/schema definitions.
- [x] **Frontend 1**: Update `AddClassSheet` UI to include Start Date and End Date pickers (so classes don't recur infinitely).
- [x] **Backend**: Create an `ExamWeek` model in Prisma (with title, startDate, endDate) to represent global semester exams (Prelims, Midterms, etc.), run migrations, and update PowerSync Sync Rules to sync exam weeks to clients.
- [x] **Frontend 1**: Build an "Add Exam Week" UI/modal inside "Add Class" sheet to let users define global exam date ranges.
- [x] **Frontend 1**: Update `isScheduleActiveOnDate` in `scheduleUtils.ts` to query local `ExamWeek` records, return false if a class falls on an exam week, and subtract the number of past exam weeks from the `diffWeeks` calculation so Set A and Set B alternating classes resume correctly.


#### Frontend 2 (State & Integration)
- [x] Bind Calendar screen views directly to PowerSync local SQLite query streams, merging `class_schedules`, `calendar_events`, and `tasks` (by dueDate).
- [x] Fix PowerSync token auto-refresh logic to silently attempt a refresh on 401 instead of blocking sync.
- [x] Verify all calendar creations/modifications (including `ExamWeek`) are correctly writing locally to PowerSync (`powerSync.execute`).
- [x] Update backend `sync.controller.ts` to whitelist the `ExamWeek` table in `ALLOWED_TABLES` so that local writes can sync upstream.
- [x] Build an offline status banner that gracefully alerts the user if cloud features (like AI scheduling) are momentarily unreachable.
- [x] Fetch Philippine holidays via `GET /api/holidays?year=YYYY` and populate the `PLACEHOLDER_HOLIDAYS` array in `calendar.tsx`.

---

### Week 4: AI Schedule Parsing

#### Backend
- [ ] Set up **Gemini API** integration (`@google/generative-ai` SDK).
- [ ] Build defensive utility handler to catch `429` rate limit errors and automatically hot-swap execution from `gemini-2.5-flash` to `gemini-2.0-flash`.
- [ ] Build the AI schedule parsing pipeline:
  1. Accept an uploaded image/PDF of a class schedule.
  2. Convert image to base64 (for Gemini Vision) or extract text from PDF.
  3. Send to Gemini with a structured prompt that categorizes the document and enforces a JSON schema matching Week 3 models. (For recurring study loads: `Subject Name, dayOfWeek, startTime, endTime, Set A/B Rooms, Modality`. For one-off events: `title, startDate, endDate, location`).
werSync).

#### Frontend 1 (UI/UX)
- [ ] Build the "Upload Schedule" screen (camera capture + file picker).
- [ ] Build the "Confirm Parsed Schedule" screen — display AI-extracted events in an editable list.
- [ ] Add loading/progress animations while AI is processing.

#### Frontend 2 (State & Integration)
- [ ] Handle multipart file upload form data and basic image compression client-side.
- [ ] Connect the upload screen to the parse API and handle error boundaries gracefully (e.g., failed parsing, timeouts).

---

## Phase 3: AI Notebook & Study Tool (Weeks 5–8, July 21, 2026 - August 17, 2026)

**Goal:** Build an isolated knowledge base where users upload materials and safely chat with an AI that references their documents using a RAG pipeline.

### Week 5: File Upload & Automated Processing Pipeline

#### Backend
- [ ] Set up **Supabase Storage** bucket for user-uploaded files (PDFs, images, text files).
- [ ] Design and migrate Prisma schema for `Notebook` and `Source`. Enable `pgvector` on Neon Postgres.
- [ ] Build `POST /api/notebooks/:notebookId/sources` file upload endpoint.
- [ ] Implement combined, asynchronous background processing workflow:
  1. Extract text (PDF text parsing or Gemini Vision OCR for images).
  2. Normalize text (strip excessive whitespaces/duplicate symbols to save token limits).
  3. Chunk text into overlapping segments (~500 tokens).
  4. Generate vector embeddings via Gemini's `text-embedding-004` model.
  5. Store embeddings into the pgvector chunk table.
  6. Use a fast Gemini prompt to auto-categorize which subject context the material belongs to.

#### Frontend 1 (UI/UX)
- [ ] Build the Notebook/Subjects list screen (card-based layout showing material count).
- [ ] Build the "Inside a Notebook" screen (list of uploaded sources: PDFs, images, notes).
- [ ] Build file upload UI components with native progress bars.
- [ ] Build a simple plain-text editor for direct note generation.

#### Frontend 2 (State & Integration)
- [ ] Implement Zustand store for notebooks metadata.
- [ ] Handle file uploading streams, compression, and error states.
- [ ] Render processing/indexing status tags next to documents (e.g., "Processing" $\rightarrow$ "Ready").

---

### Week 6: RAG Pipeline & Streaming AI Chat

#### Backend
- [ ] Build the RAG query execution pipeline:
  1. Receive user question $\rightarrow$ generate embedding vector using `text-embedding-004`.
  2. Search pgvector for the top-k most relevant text chunks matching the notebook.
  3. Consolidate context chunks and format a unified system prompt for Gemini.
- [ ] Create `POST /api/notebooks/:notebookId/chat` endpoint (supporting server-sent events/streaming responses if possible, or fast JSON returns).
- [ ] Create `GET /api/notebooks/:notebookId/chat/history` endpoint.

#### Frontend 1 (UI/UX)
- [ ] Build the AI Chat interface (message bubbles, typing indicators, send buttons).
- [ ] Incorporate source citations inside the message bubble UI showing exactly which document the answer came from.
- [ ] Build chat history side-drawers or views.

#### Frontend 2 (State & Integration)
- [ ] Implement Zustand store for message states.
- [ ] Connect chat UI to the query API.
- [ ] Handle UI streaming text assemblies or loading blocks cleanly.
- [ ] Explicitly block/disable input when the device loses network connectivity, prompting an explicit offline notice.

---

### Week 7: Polish, Model Interceptors & Edge Cases

#### All Team Members
- [ ] Test AI prompt quality and tune system boundaries to prevent hallucination.
- [ ] Rigorously check file extraction pipelines against large or multi-page documents.
- [ ] Verify rate limit fallback middleware functions flawlessly under artificial heavy loads.
- [ ] Resolve visual alignment bugs across all newly built chat and notebook components.

---

## Phase 4: Notifications & Reminders (Weeks 15–16)

**Goal:** Ensure users never miss a milestone with background push notifications when online and reactive local scheduling when offline.

### Week 8: Notification Orchestration

#### Backend
- [ ] Create a `device_tokens` table to save platform-specific tokens.
- [ ] Create `POST /api/notifications/register` endpoint.
- [ ] Build a lightweight notification scheduler (Cron utility or worker script) that reads Postgres for upcoming events/tasks and posts requests to the Expo Push API (`https://exp.host/--/api/v2/push/send`).

#### Frontend 1 (UI/UX)
- [ ] Build Notification Settings management layout.
- [ ] Design custom in-app notification pop-ups/toasts.

#### Frontend 2 (State & Integration)
- [ ] Set up `expo-notifications` and handle user permission configurations.
- [ ] Register device tokens securely on successful application authentication.
- [ ] Implement **Local Offline Reminders**:
  - Whenever local PowerSync database listeners detect a newly synced task/event, locally schedule a companion notification alert (e.g., 1 hour before a task is due) natively on the device.
- [ ] Configure notification response listeners to deep-link the user straight to the target screen upon tap (injecting type identifiers like `{"type": "task", "id": "xxx"}`).

---

## Phase 5: Final Polish, Testing & Deployment (Weeks 9–10, August 18, 2026 - August 31, 2026)

**Goal:** Complete comprehensive end-to-end multi-device testing, optimize synchronization workflows, and bundle production release APKs.

### Week 9–10: Final Sprint & Presentation Prep

#### All Team Members
- [ ] Conduct end-to-end user-acceptance testing on physical devices (Android/iOS).
- [ ] Run rigorous offline-to-online reconciliation testing to verify PowerSync handles complex multi-device edits gracefully.
- [ ] Run performance audits targeting screen loading performance, excessive local queries, and memory leaks.
- [ ] Generate a production release build utilizing EAS Build (`eas build --platform android`).
- [ ] Document project architecture diagrams and build the demonstration pipeline for presentation day.

```