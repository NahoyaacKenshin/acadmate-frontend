# AcadMate Progress Tracker

## 2026-06-23
- **Backend (Week 1)**:
  - Validated Prisma schemas for `User`, `Token`, `Subject`, and `Task`.
  - Validated REST API endpoints for Subjects and Tasks (`POST/PUT/DELETE/GET`).
  - Generated RS256 Key pair and added to `.env` for PowerSync token generation.
  - Implemented `/api/auth/powersync-token` endpoint.
  - Implemented PowerSync Sync Rules (`powersync-rules.yaml`).
  - Created Postman API documentation.

## 2026-06-24
- **Frontend 1 (Week 1) — Design System, Navigation & Auth Screens**:
  - **Design System:** Updated `global.css` with finalized dark theme color palette (Primary: `#6C8EFF`, Background: `#10131C`, Foreground: `#ffffff`). Derived muted (`#1A1F2E`), border (`#2A3143`), and accent tokens.
  - **Typography:** Installed `@expo-google-fonts/inter` and loaded `Inter` as the app's primary font via `app/_layout.tsx`.
  - **Navigation:** Replaced `Stack` navigator in `app/(app)/_layout.tsx` with `Tabs` bottom navigation (Home, Calendar, Notebook, Settings) using `lucide-react-native` icons. Themed tab bar colors to match design system.
  - **Screen Scaffolding:** Created placeholder screens for `calendar.tsx`, `notebook.tsx`. Created a functional `settings.tsx` with profile card and sign-out button. Removed deprecated `profile.tsx`.
  - **Home Screen:** Redesigned `app/(app)/index.tsx` as a dashboard with greeting, four quick-stats cards (Tasks Due, Events Today, Notebooks, Subjects), and a recent activity placeholder.
  - **Auth Screens:** Polished `LoginForm`, `SignupForm`, and `VerifyEmailPrompt` components — centered layout, `Inter` font, `placeholderTextColor`, `Button` component from React Native Reusables, rounded-2xl inputs, consistent spacing and typography.
- **Frontend 2 (Week 1) — State & Integration**:
  - **Database Schema**: Updated `src/db/Schema.ts` with `subjects` and `tasks` tables mimicking Postgres structure.
  - **State Management**: Created `src/store/systemStore.ts` for tracking `isOnline` and `isSyncing` statuses. Leveraged existing Zustand `authStore` for credentials.
  - **API Service Layer**: Created `src/services/api.ts` dedicated exclusively to the Write-path (`POST/PUT/DELETE`) for subjects and tasks, dynamically fetching JWT auth token.
  - **PowerSync Integration**: Updated `src/db/PowerSyncConnector.ts` and `src/providers/PowerSyncProvider.tsx` to establish the backend connection dynamically when the user successfully authenticates.
  - **Auth Integration**: Verified `login.tsx` and `signup.tsx` communicate successfully with existing APIs using `auth.store.ts` via `expo-secure-store`.

## 2026-06-29
- **Backend (Week 2)**:
  - Added backend validation for task edge cases (empty titles, invalid dates, duplicate tasks for same subject).
  - Added a `GET /api/tasks/stats` analytical endpoint (total tasks, completed count, overdue count).

## 2026-07-02
- **Frontend 1 (Week 2) — Task Manager UI**:
  - **Dependencies**: Installed and configured `react-native-gesture-handler` for swipe interactions.
  - **Task List Screen**: Built `app/(app)/tasks.tsx` displaying a list of tasks.
  - **Task Component**: Built `TaskListItem.tsx` implementing swipe-to-complete (left swipe) and swipe-to-delete (right swipe) using Gesture Handler and Reanimated. Includes colored subject tags.
  - **Modals**: Created `AddTaskSheet.tsx` and `EditTaskSheet.tsx` as responsive modals with KeyboardAvoidingView for adding and editing tasks.

- **Frontend 2 (Week 2) — Task Manager State & Integration**:
  - **Backend Sync Endpoint**: Verified `POST /api/sync/:table` is registered, whitelisted for `tasks` and `subjects`, and protected by `AuthMiddleware`.
  - **Reactive Query Hooks**: Created `src/hooks/useTasks.ts` (tasks + subject JOIN) and `src/hooks/useSubjects.ts` — both use `useQuery` from `@powersync/react` for live, reactive reads from local SQLite.
  - **PowerSync Write-Path**: Replaced all dummy `useState` mutations in `tasks.tsx` with `powerSync.execute()` SQL statements for CREATE, UPDATE (completion toggle), and DELETE. PowerSync's `uploadData` queues and uploads all local changes to `POST /api/sync/:table` automatically when online.
  - **Optimistic Offline**: All mutations write to local SQLite instantly. If the device is offline, changes appear immediately in the UI and sync upstream once internet is restored.
  - **AddTaskSheet / EditTaskSheet**: Both modals now use `usePowerSync()` to write to local SQLite directly, with subject dropdown populated from `useSubjects()`, error handling, and loading states.
  - **EditTaskSheet wired up**: Tapping any task row opens the `EditTaskSheet` pre-filled with the selected task's data.

## 2026-07-03
- **Bug Fixes (PowerSync & UI)**:
  - **Backend Sync Controller**: Fixed a bug where PowerSync uploads failed because the Prisma `update()` method threw a `500` error for brand new tasks (which use the `"PUT"` action). Changed to `upsert()` to correctly handle both new and existing records. Added boolean sanitization.
  - **Backend Sync Whitelist**: Updated the `ALLOWED_TABLES` mapping to use the correct case-sensitive SQLite table names (`"Task"` and `"Subject"`) sent by PowerSync.
  - **PowerSync Sync Rules (v3)**: Updated `powersync-rules.yaml` to Edition 3 syntax, explicitly using `auth.user_id()` as supported for the `sub` claim and fixing table name casing so PowerSync correctly syncs Postgres rows.
  - **Frontend PowerSync Error Handling**: Fixed a critical bug in `PowerSyncConnector.ts` where the `fetch()` upload skipped checking `response.ok`. A failing backend upload previously triggered a `batch.complete()`, permanently deleting local un-synced mutations. It now safely throws an error and retains the optimistic updates when offline or failing.
  - **UI (Keyboard Bouncing)**: Fixed a bug where Android's `KeyboardAvoidingView` caused the Add/Edit Task sheets to jump rapidly. Switched Android to `softwareKeyboardLayoutMode: "pan"` in `app.json`, removed KeyboardAvoidingView, and wrapped the sheet contents in a scroll view that safely dismisses the subject picker on focus.
  - **UI (Due Date Picker)**: Replaced the plain text input for Due Date with the native `@react-native-community/datetimepicker` component. The system now stores and displays a full ISO Date-Time instead of just a date.

## 2026-07-04
- **Bug Fixes (PowerSync & Auth Race Conditions)**:
  - **Backend Sync Controller (PATCH & Types)**: Fixed an issue where updating a task caused PowerSync to queue a `PATCH` operation, which the backend did not support (throwing a 400 error and blocking the sync queue). Added `PATCH` handling to `sync.controller.ts` via Prisma `update()`. Improved type parsing for the `completed` field so string values like `"0"` or `"1"` correctly map to boolean.
  - **Prisma P2025 Error Handling**: Updated the backend sync controller to catch `P2025` (Record not found) errors during `DELETE` or `PATCH` operations, returning a 200 success rather than a 500 error, ensuring PowerSync queues do not get permanently stuck.
  - **Frontend PowerSync Race Condition**: Fixed a startup race condition in `PowerSyncProvider.tsx` where it attempted to connect to PowerSync using a cached, expired `accessToken` while the app was concurrently attempting to refresh the session. Added a guard to wait for `isRestoring` to be `false` before establishing the connection.

- **Backend (Week 3) — Calendar Core & Holidays**:
  - **Prisma Schema**: Added `ClassSchedule`, `CalendarEvent`, and `PhilippineHoliday` models. Added enums for `Modality` (F2F/Online) and `SetType` (A/B/Both).
  - **Holiday Data Seed**: Created an idempotent seed script (`prisma/seed.ts`) populating the database with 39 official Philippine holidays for 2026–2027.
  - **REST APIs**: Implemented Zod validation schemas, repositories, and controllers for `/api/class-schedules`, `/api/events`, and `/api/holidays`.
  - **Holiday Endpoint Cache**: The `GET /api/holidays` endpoint accepts a `?year=` parameter and serves a 24-hour `Cache-Control` header.
  - **PowerSync Integration**: Updated `powersync-rules.yaml` with rules for `user_class_schedules` and `user_calendar_events`. Whitelisted both tables in `sync.controller.ts` and added boolean sanitization for `allDay`.
  - **Backend (Week 3 Refinements)**: Added `startDate` and `endDate` to the `ClassSchedule` schema. Ran Prisma migrations, updated Zod validations in `src/schema/class-schedule.ts`, and updated `powersync-rules.yaml` and frontend `AppSchema.ts` definitions.
  - **Backend (Week 3 Refinements)**: Added `ExamWeek` model to Prisma schema, ran Prisma migrations, and updated PowerSync rules (`powersync-rules.yaml`) to sync `exam_weeks` to clients.

## 2026-07-06
- **Frontend 1 (Week 3) — Calendar Screen (Combined Month + Week View)**:
  - **PowerSync Schema**: Updated `src/db/Schema.ts` to register `ClassSchedule` and `CalendarEvent` table definitions. Without these, PowerSync would silently discard incoming rows for the new Week 3 tables.
  - **Reactive Hooks**: Created `src/hooks/useCalendarEvents.ts` and `src/hooks/useClassSchedules.ts` — both mirror the existing `useTasks` pattern (PowerSync `useQuery`, LEFT JOIN Subject for color/name, zero REST reads).
  - **MonthGrid Component** (`src/components/calendar/MonthGrid.tsx`): Full 6×7 day-cell grid (week starting Monday). Each cell shows the day number with: a primary-blue fill for the selected day, a primary-blue ring for today, and up to 3 colored event dots (holiday = red/amber, class = subject color, one-off event = subject/event color). Month navigation (prev/next) built-in. Exported the `Holiday` interface for shared use.
  - **WeekStrip Component** (`src/components/calendar/WeekStrip.tsx`): Shows Mon–Sun for the selected week with per-day event dots, prev/next week navigation, and a primary-blue chevron toggle button to expand/collapse the month grid above it.
  - **DayView Component** (`src/components/calendar/DayView.tsx`): Scrollable event list for the selected date, split into three labeled sections — "Classes" (recurring, with F2F/ONLINE/HYBRID modality badge, room, time range), "Events" (one-off CalendarEvents), and "Tasks Due" (tasks with matching dueDate). Includes a holiday banner (red for REGULAR, amber for SPECIAL) and a clean empty state.
  - **AddEventSheet** (`src/components/calendar/AddEventSheet.tsx`): Bottom-sheet modal matching the AddTaskSheet style. Fields: title, description, all-day toggle, start/end datetime pickers (same Android date→time chain / iOS inline spinner pattern), location, 6-swatch color picker, subject dropdown. Writes to `CalendarEvent` via `powerSync.execute()` (offline-first, syncs upstream when online).
  - **Calendar Screen** (`app/(app)/calendar.tsx`): Replaced the placeholder. Assembles MonthGrid (collapsible), WeekStrip (always visible), DayView (scrollable), and AddEventSheet. `PLACEHOLDER_HOLIDAYS` array left empty for FE2 to populate via `GET /api/holidays`. Passes `initialDate` (currently selected day) to AddEventSheet for convenient pre-fill.
  - **AddClassSheet** (`src/components/calendar/AddClassSheet.tsx`): Manual class schedule entry modal. Fields: Subject (required, dropdown), Days of Week (Mon–Sun multi-select pills), Start/End Date (new DatePickers), Start/End Time (time-only DateTimePicker), Modality (F2F / Online / Hybrid), Schedule Set (Every Week / Set A / Set B), and Room. Writes to `ClassSchedule` via `powerSync.execute()` offline-first. Supports concurrent insert of multiple rows when multiple days are selected.
  - **Inline Subject Creation** (`src/components/calendar/AddClassSheet.tsx`): Added a "+ New Subject" button inside the Subject dropdown exclusively for class creation. Opens an inline form (Name input + custom `reanimated-color-picker` wheel) that writes directly to the local `Subject` table via PowerSync and auto-selects the newly created subject.
  - **AddEventSheet** (`src/components/calendar/AddEventSheet.tsx`): Replaced the 6 preset color swatches with the `reanimated-color-picker` wheel for custom event colors.
  - **Calendar `+` Action Menu** (`app/(app)/calendar.tsx`): Replaced the single `+` button with a contextual dropdown that appears on tap, offering two options — "Add Event" (blue CalendarDays icon) and "Add Class" (green BookOpen icon) — each with a subtitle. Tapping outside the menu or selecting an option dismisses it cleanly.

## 2026-07-09
- **Frontend 1 (Week 3) — Exam Week Support**:
  - **PowerSync Schema**: Updated `src/db/Schema.ts` to register the `ExamWeek` table.
  - **Hooks & UI**: Created `useExamWeeks.ts` hook. Built `AddExamWeekModal.tsx` for creating global exam date ranges with title, start date, and end date pickers.
  - **Schedule Utilities**: Updated `isScheduleActiveOnDate` in `src/utils/scheduleUtils.ts` to consume `examWeeks`. Classes now return `false` (do not appear) during exam weeks, and Set A/B alternating logic correctly subtracts past exam weeks from its week difference calculation so alternating resumes correctly.
  - **Calendar Integration**: Passed `examWeeks` down through `calendar.tsx` to `MonthGrid.tsx`, `WeekStrip.tsx`, and `DayView.tsx` so calendar dots and daily class lists correctly hide classes during user-defined exam weeks.
  - **UX Refactor**: Moved "Add Exam Week" out of the `AddClassSheet` bottom-sheet and into the calendar `+` action menu as a standalone 3rd option (amber `GraduationCap` icon, subtitle "Block off exam / holiday periods"), so it is always independently accessible.
- **Bug Fix — PowerSync Token Auto-Refresh** (`src/db/PowerSyncConnector.ts`):
  - **Root cause**: `fetchCredentials` was sending the stale `accessToken` to `/powersync-token`. On a 401 it would log an error and return `null` without ever calling `refreshSession()`, causing persistent sync failures after the first token expiry.
  - **Fix**: Extracted a private `_fetchPowerSyncToken()` helper that returns a typed sentinel `'UNAUTHORIZED'` on 401/403. `fetchCredentials` now silently calls `refreshSession()` on a 401, retries once with the new token, and only returns `null` if the refresh itself fails. Same retry pattern applied to `uploadData`.
- **Frontend 2 (Week 3) — State & Integration (Calendar & Offline Sync)**:
  - **ExamWeek Sync**: Updated backend `sync.controller.ts` to whitelist the `ExamWeek` table in `ALLOWED_TABLES` so that local writes can sync upstream. Verified `ExamWeek` is successfully writing locally via PowerSync in the frontend.
  - **Offline Banner**: Built an offline status banner in `_layout.tsx` using `useSystemStore` to gracefully alert users when they are disconnected and AI/cloud features are unavailable.
  - **Holidays Integration**: Implemented holiday fetching in `calendar.tsx` via `ApiService.holidays.get` and removed the placeholder constant, dynamically rendering official holidays on the month and week views.

## 2026-07-16
- **Backend (Week 3) — Prisma & Sync Bug Fixes**:
  - **Date Parsing**: Fixed a `PrismaClientValidationError` in `sync.controller.ts` where string dates (e.g., `YYYY-MM-DD`) from PowerSync uploads were causing sync failures (`500`). Implemented an `ensureIsoDate` helper to strictly parse and append ISO-8601 timestamps (`T00:00:00.000Z`) for `Task`, `CalendarEvent`, `ClassSchedule`, and `ExamWeek` date fields before Prisma insertion.
  - **ExamWeek Sync**: Added `ExamWeek` to the `ALLOWED_TABLES` whitelist in `sync.controller.ts` to allow PowerSync to successfully sync local `ExamWeek` creations upstream to Postgres.
  - **Prisma Client Regeneration**: Ran `npx prisma generate` on the backend to rebuild the Prisma client, resolving a `TypeError` (Cannot read properties of undefined reading 'upsert') that occurred when attempting to sync `ExamWeek` operations on the un-updated client.
- **Frontend (Week 3) — React Native Deprecation Fixes**:
  - **SafeAreaView**: Swapped deprecated `SafeAreaView` imports from `react-native` to `react-native-safe-area-context` across `calendar.tsx` and `tasks.tsx` to fix console warnings.
  - **DateTimePicker**: Mass-replaced the deprecated `onChange` prop with `onValueChange` for `<DateTimePicker>` components across all date/time picker modals and bottom sheets (`AddEventSheet`, `AddClassSheet`, `AddTaskSheet`, `AddExamWeekModal`, and their edit variants).
- **Backend (Week 4) — AI Schedule Parsing Pipeline**:
  - **Gemini Utility** (`src/utils/gemini.ts`): Set up `GoogleGenerativeAI` client. Built `generateWithFallback()` — a defensive cascade handler that tries `gemini-pro-latest` first, then `gemini-flash-latest`, then `gemini-flash-lite-latest` on successive `429` rate limit errors. All three models use a single `GEMINI_API_KEY`.
  - **Schedule Parser Service** (`src/services/schedule-parser.service.ts`): Full pipeline that accepts PDF (via `pdf-parse`), DOCX (via `mammoth`), or image (base64 for Gemini Vision). Sends structured prompt to Gemini enforcing a JSON schema for `ClassSchedule`, `CalendarEvent`, and `ExamWeek`. Strips markdown fences from Gemini output and enforces strict ISO-8601 date formatting on all returned dates.
  - **Schedule Parser Controller** (`src/controllers/schedule-parser.controller.ts`): Multer-powered file upload handler (max 10MB, allows PDF/DOCX/JPEG/PNG/WEBP/GIF). Returns structured parsed schedule JSON with granular error status codes (400, 413, 415, 503).
  - **Schedule Parser Route** (`src/routes/schedule-parser.routes.ts`): Registered `POST /api/schedule-parser/parse`, protected by `AuthMiddleware`.
  - **Packages installed**: `multer`, `@types/multer`, `@types/pdf-parse`.

## 2026-07-16 (continued)
- **Frontend 1 (Week 4) — AI Schedule Scan UI**:
  - **Packages**: Installed `expo-document-picker` and `expo-image-picker` (Expo SDK 56 compatible) for file and camera access.
  - **`AILoadingOverlay.tsx`** (`src/components/schedule/AILoadingOverlay.tsx`): Full-screen modal overlay shown while AI is reading a document. Features a pulsing glow ring, a slow-rotating arc spinner, a `Sparkles` icon, and a dot loader. Status text cycles through friendly messages: "Reading your document…" → "Detecting your schedule…" → "Organising the results…" → "Almost done…". All animations use the React Native `Animated` API.
  - **`UploadPickerCard.tsx`** (`src/components/schedule/UploadPickerCard.tsx`): Reusable styled tappable card for each upload option (PDF/DOCX, Gallery, Camera). Supports accent colour, a loading state (shows `ActivityIndicator`), and press feedback.
  - **`ParsedItemRow.tsx`** (`src/components/schedule/ParsedItemRow.tsx`): Three row components (`ClassScheduleRow`, `CalendarEventRow`, `ExamWeekRow`) for the Review screen. Each row shows an icon, formatted details, and a dismiss (`×`) button. `ClassScheduleRow` includes a yellow **"+ New Subject"** badge for subjects not yet in the local database.
  - **`schedule-upload.tsx`** (`app/(app)/schedule-upload.tsx`): Full upload screen. Three picker cards (PDF/DOCX, gallery, camera) with permission handling. Selected file shows a live preview card. The **"Read My Schedule →"** CTA calls `POST /api/schedule-parser/parse` with `multipart/form-data`, shows the `AILoadingOverlay`, then navigates to the review screen on success. Friendly error banners for network, file-size, and unsupported-type errors.
  - **`schedule-confirm.tsx`** (`app/(app)/schedule-confirm.tsx`): Review screen showing AI-detected items in three collapsible sections (Classes, Events & Holidays, Exam Periods). Each item can be individually removed with an `×` button. Unrecognised subjects trigger an inline **"Create New Subject"** bottom-sheet (name pre-filled from the AI result, colour picker included) that writes directly to the local `Subject` table via `powerSync.execute()`. **"Add to My Calendar"** CTA is stubbed with `resolvedClasses`/`events`/`exams` ready for FE2 to hook in.
  - **`_layout.tsx`**: Registered `schedule-upload` and `schedule-confirm` as hidden routes (`href: null`, `headerShown: false`) inside the Tabs navigator.
  - **`calendar.tsx`**: Added a 4th action-menu item — **"Scan Schedule"** (purple `ScanLine` icon, subtitle "Upload PDF, photo or Word doc") — that navigates to `/(app)/schedule-upload`.

- **Frontend 2 (Week 4) — State & Integration (AI Schedule Parsing)**:
  - **Upload Screen Integration**: Verified FE1's integration in `schedule-upload.tsx`, ensuring multipart/form-data handles files seamlessly. Image picker's 0.85 quality serves as basic client-side compression. Graceful error boundary handling (413 Payload Too Large, 415 Unsupported Media Type, 503 Service Unavailable) is correctly implemented.
  - **Offline-First Persistence**: Updated `schedule-confirm.tsx` to handle the final confirmation stage. Mapped the confirmed and subject-resolved `ClassSchedule`, `CalendarEvent`, and `ExamWeek` arrays into multiple `powerSync.execute()` SQL `INSERT` commands.
  - **Batch Write**: Grouped all inserts into a `Promise.all` array to execute concurrently, ensuring local offline-first writes that will automatically sync upstream to Neon via PowerSync's upload queue when online. Included loading states to disable the confirmation button while saving.
