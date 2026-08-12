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

## 2026-07-17
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

## 2026-07-17
- **Frontend 2 (Week 4) — File Upload Stability Fix**:
  - Replaced buggy React Native `fetch` + `FormData` logic with `expo-file-system/legacy` (`FileSystem.uploadAsync`) in `schedule-upload.tsx`. This permanently resolves the "Unsupported FormData part" crashing errors when uploading images directly from the gallery or camera.
- **Backend (Week 4) — Gemini Rate Limit Cascade Fix**:
  - Updated the defensive fallback logic in `src/utils/gemini.ts` to explicitly catch `503 Service Unavailable` and `500 Internal Server Error`. The system now successfully cascades to the fallback models during API high-demand spikes, instead of failing prematurely.
- **Frontend 1 (Week 4) — Worklet Crash Fix**:
  - Fixed a Reanimated crash inside `schedule-confirm.tsx` (the "Create New Subject" inline modal). Wrapped the `reanimated-color-picker`'s `onComplete` prop with `runOnJS()` so it safely bridges from the UI thread back to the React JS thread when updating the color state.
- **Project Planning**:
  - Updated `DEVELOPMENT_PLAN (FE1).md` with a new "Week 4 Additional Tasks (Deep Editing Capabilities)" section to build full inline editing for parsed items on the Review screen, scheduled for the next session.

## 2026-07-18
- **Frontend 1 & 2 (Week 4) — Deep Editing Capabilities**:
  - Created `EditParsedSheets.tsx` with dedicated lightweight modals (`EditParsedClassSheet`, `EditParsedEventSheet`, `EditParsedExamSheet`) that mirror the main calendar edit UI but operate exclusively on in-memory parsed objects rather than making PowerSync SQLite database writes.
  - Modified `ParsedItemRow.tsx` to add `onEdit` handler props and make each parsed schedule row tapable.
  - Integrated the edit sheets into `schedule-confirm.tsx` to allow users to modify AI-parsed data before saving it to the database, ensuring that any corrected hallucination is stored in local temporary state prior to committing the batch.

## 2026-07-18
- **Frontend 1 & 2 (Week 4) — Deep Editing Capabilities**:
  - Created `EditParsedSheets.tsx` with dedicated lightweight modals (`EditParsedClassSheet`, `EditParsedEventSheet`, `EditParsedExamSheet`) that mirror the main calendar edit UI but operate exclusively on in-memory parsed objects.
  - Modified `ParsedItemRow.tsx` to add `onEdit` handler props and make each parsed schedule row tapable.
  - Integrated the edit sheets into `schedule-confirm.tsx` to allow users to modify AI-parsed data before saving.
- **Bug Fixes — TypeScript Errors & Logic**:
  - Resolved widespread `DateTimePickerEvent` vs `DateTimePickerChangeEvent` type mismatch errors across `EditParsedSheets.tsx`, `AddEventSheet.tsx`, `EditClassSheet.tsx`, `EditEventSheet.tsx`, `AddTaskSheet.tsx`, and `EditTaskSheet.tsx` by casting the event param to `any`.
  - Fixed `absoluteFillObject` typo (-> `absoluteFill`) in `EditParsedSheets.tsx`.
  - Fixed Set A/B alternation logic in `scheduleUtils.ts` so Set B correctly appears on odd weeks and Set A on even weeks, rather than both being treated identically.
  - Added a success modal (`Schedule Added!`) to `schedule-confirm.tsx` that shows after saving and routes to the Calendar via `router.replace`.
  - Configured `schedule-upload.tsx` to automatically clear the selected file after navigating to the review screen so Cancel returns to a clean state.
- **Frontend 1 & 2 - Scan Another File (Multi-file Sequential Upload)**:
  - **Backend**: Updated `schedule-parser.service.ts` to accept an optional `currentSchedule` context string. A `MERGE_PROMPT_SUFFIX` function injects it into the Gemini prompt, instructing the model to update fields on existing items (e.g. Set A/B) and add new ones without duplicates.
  - **Backend**: Migrated `uploadMiddleware` from `.single("file")` to `.any()` so the `currentSchedule` text field can be received alongside the file.
  - **Frontend**: Created `src/hooks/useScheduleScanner.ts` - a reusable hook encapsulating all file-picker logic, state, and the `FileSystem.uploadAsync` pipeline, with merge mode support.
  - **Frontend**: Refactored `schedule-upload.tsx` to use `useScheduleScanner`, significantly reducing its size.
  - **Frontend**: Created `src/components/schedule/ScanAnotherSheet.tsx` - a purple-accented bottom-sheet modal with three upload options, file preview, and a "Scan & Merge" CTA.
  - **Frontend**: Updated `schedule-confirm.tsx` to include the `ScanAnotherSheet` and a "Scan Another" pill button in the footer. On scan completion, Gemini's merged result fully replaces the existing parsed state arrays.

## 2026-07-18
- **Backend (Week 4 Additional — Admin System & Set A/B Scheduling Logic)**:
  - **Prisma Schema**: Added two new globally-shared models — `SemesterRule` (admin-defined Saturday Set A/B rules with `date`, `ruleType` enum, and optional `label`) and `ProgramMapping` (maps degree program names like "BSIT" to `StudentSet` enum A or B). Added `StudentSet` and `SemesterRuleType` enums. Ran and applied migration `20260718154237_add_semester_rules_and_program_mappings` to Neon Postgres.
  - **Prisma Client**: Regenerated Prisma Client (`prisma generate`) to expose the new `semesterRule` and `programMapping` accessors.
  - **Admin Middleware**: Created `src/middlewares/admin-middleware.ts` — stacks after `AuthMiddleware` and rejects requests with a 403 if the JWT payload's role is not `ADMIN`.
  - **Zod Schemas**: Created `src/schema/admin.ts` with validated Zod schemas for `createSemesterRuleSchema`, `updateSemesterRuleSchema`, `createProgramMappingSchema`, and `updateProgramMappingSchema`.
  - **Admin Controller**: Created `src/controllers/admin.controller.ts` with full CRUD for `SemesterRule` and `ProgramMapping`, plus a comprehensive `GET /api/admin/analytics` endpoint returning: total users (by role), task completion stats, content counts (subjects, schedules, events, exam weeks), admin config counts (semester rules, program mappings), program distribution, and the 5 most recently registered users.
  - **Admin Routes**: Created `src/routes/admin.routes.ts` mounting all admin endpoints under `AuthMiddleware + AdminMiddleware` protection.
  - **Router**: Registered `adminRoutes` at `/api/admin` in `src/routes/index.ts`.
  - **PowerSync Sync Rules**: Updated `powersync-rules.yaml` to include two new global streams (`global_semester_rules`, `global_program_mappings`) with no `userId` filter so they sync read-only to all authenticated student clients.
  - **AI Parsing Pipeline**: Refactored `src/services/schedule-parser.service.ts` — replaced the static `SYSTEM_PROMPT` constant with a `buildSystemPrompt(studentSet?)` factory function. When `studentSet` is "A" or "B", it appends a directive instructing Gemini to extract only the relevant Set's room from class schedule images (e.g. Set A columns only). Updated `parseScheduleFromFile` signature to accept an optional `studentSet` parameter. Updated `src/controllers/schedule-parser.controller.ts` to read `studentSet` from the multipart form body and pass it through.

## 2026-07-25
- **Frontend 1 (Week 4 Additional — Admin System UI & Onboarding)**:
  - **Admin Dashboard Screen** (`app/(app)/admin.tsx`): Built role-restricted Admin Dashboard featuring tab navigation (Analytics, Saturday Semester Rules, Program Mappings, Exam Weeks, Philippine Holidays) and clean access-denied fallback card for standard non-admin users (`user.role !== 'ADMIN'`).
  - **Admin Components**: Created modular React components in `src/components/admin/`: `AdminHeader.tsx`, `AdminAnalyticsSection.tsx`, `SemesterRulesSection.tsx`, `ProgramMappingsSection.tsx`, `ExamWeeksSection.tsx`, `HolidaysSection.tsx`, `AddSemesterRuleModal.tsx`, and `AddProgramMappingModal.tsx`.
  - **Onboarding Flow** (`app/onboarding.tsx`): Implemented mandatory Degree Program selection UI (BSIT, BSCS, BSHM, etc.) with automatic Set A/B assignment based on admin `ProgramMapping` entries, Set override selector, and local store persistence.
  - **Settings Screen** (`app/(app)/settings.tsx`): Added Academic Configuration section with degree program modal selector, Set A/B toggle, and an Admin Dashboard navigation button visible exclusively to users with `ADMIN` role.
- **Frontend 2 (Week 4 Additional — Schedule Resolver Utility & PowerSync Sync)**:
  - **PowerSync Local Schema & Hooks**: Registered `SemesterRule`, `ProgramMapping`, and `PhilippineHoliday` tables in `src/db/Schema.ts`. Created `useSemesterRules.ts` and `useProgramMappings.ts` hooks for live local SQLite subscription.
  - **Schedule Resolver Utility** (`src/utils/scheduleResolver.ts`): Implemented `resolveScheduleForDate()` to dynamically compute modality (`F2F`, `ONLINE`, `HYBRID`, `HOLIDAY`, `EXAM_WEEK`) and effective room assignments by combining student `ClassSchedule` records with global Saturday `SemesterRule` overrides, `PhilippineHoliday` markers, `ExamWeek` date ranges, and student `StudentSet` (Set A vs Set B).
- **Frontend 1 & 2 (Week 4 Additional — Dynamic Programs & Admin-Only Exam Weeks)**:
  - **Dynamic Program Mappings**: Wiped out hardcoded programs array from `app/onboarding.tsx` and `app/(app)/settings.tsx`. Program lists are now queried dynamically from the synced `ProgramMapping` table via `useProgramMappings()`. If no programs exist, a friendly fallback prompt is shown.
  - **Role-Restricted Exam Weeks**: Restricted `ExamWeek` creation and modification exclusively to users with `user.role === 'ADMIN'`. Hidden "Add Exam Week" option from non-admin action menus in `app/(app)/calendar.tsx`, hidden the "Exam Periods" review section, and bypassed local database insertion during schedule scan confirmation for student users in `app/(app)/schedule-confirm.tsx`.
- **Frontend 1 & 2 (Week 4 Additional — Auth Routing, Onboarding Gating & Dedicated Admin Layout)**:
  - **Auth Error State Clearing**: Added `clearError` action to `useAuthStore`. Updated `LoginForm.tsx` and `SignupForm.tsx` to automatically purge error state banners (e.g. "Invalid credentials") on form mount and when switching between Login and Signup screens.
  - **Student Onboarding Gate**: Updated `src/providers/AuthGate.tsx` and `app/(app)/index.tsx`. Fresh student accounts (`user.role !== 'ADMIN'`) who have not saved onboarding preferences (`hasCompletedOnboarding === false`) are automatically routed to `app/onboarding.tsx` immediately upon login/signup.
  - **Admin Navigation Layout**: Updated `src/providers/AuthGate.tsx` and `app/(app)/_layout.tsx`. Admin accounts (`user.role === 'ADMIN'`) bypass onboarding completely and are redirected to a dedicated Admin layout containing Admin Portal & Settings tabs while hiding student-only tabs (Calendar, Tasks, Notebook).
  - **Admin Item Editing & Direct API Fetch**: Added edit handlers (`Pencil` icon) to `ProgramMappingsSection` and `SemesterRulesSection` allowing admins to edit existing records via `updateProgramMapping` and `updateSemesterRule` API endpoints. Integrated direct API fetching into both sections so changes reflect on screen immediately.
  - **Admin Dual Option Exams & Special Periods**: Enhanced `AddExamWeekModal` and `ExamWeeksSection` to support dual options (Official Auto-Synced Holidays + Custom Admin Period creator with `🎓 Exam`, `🏖️ Custom Holiday`, and `⚠️ Class Suspension` category pills). Supports editing existing periods via `Pencil` icon and instant SQLite updates.
  - **Admin Generalized Schedule Rules**: Revamped `SemesterRule` from hardcoded Saturday Set A/B to a general schedule rule system. Supports specifying any Day of Week (Mon-Sun), Start Date, optional End Date, Set A or Set B F2F, and custom notes/labels. Updated backend Prisma model, Zod schema, PowerSync sync queries, frontend hook, schedule resolver, and Admin UI modals.
  - **Optimistic Local Reflection**: Added direct `powerSync.execute()` SQLite writes in `AddSemesterRuleModal.tsx` and `AddProgramMappingModal.tsx` (and SQLite deletions in `SemesterRulesSection` and `ProgramMappingsSection`) so admin additions and deletions reflect on screen instantaneously without waiting for network background sync loops.
  - **SMTP & Signup Resilience**: Fixed `SignupUserService` and `ResendEmailVerificationService` socket disconnect (`ECONNRESET`) errors. Added Nodemailer TLS fallback settings and wrapped email sending in a non-fatal `try/catch` so user account creation succeeds in DB even if SMTP socket drops. Added automatic console logging of `[DEV VERIFICATION LINK]` for instant developer testing.
  - Replaced deprecated `SafeAreaView` from `react-native` with `react-native-safe-area-context` in `app/(app)/admin.tsx`.
  - Replaced deprecated `onChange` prop with `onValueChange` for `<DateTimePicker>` in `src/components/admin/AddSemesterRuleModal.tsx`.
  - Fixed `GraduationCap` icon import in `app/onboarding.tsx`.
  - Fixed `AddExamWeekModal` prop interface mismatch in `ExamWeeksSection.tsx`.
  - Resolved missing type & utility imports (`ExamWeekRow`, `TaskRow`, `Holiday`, `isScheduleActiveOnDate`) in `DayView.tsx`.
  - Verified 100% clean TypeScript compilation with zero errors across the frontend project (`npx tsc --noEmit`).

## 2026-07-28
- **Calendar & Schedule Blockers Fix**:
  - **Frontend (`scheduleUtils.ts` & `scheduleResolver.ts`)**: Updated `isScheduleActiveOnDate` and `resolveScheduleForDate` to take `holidays` (Regular, Special, and Suspensions) alongside `examWeeks`. Blocked dates automatically hide class schedules and return appropriate status (`HOLIDAY`, `EXAM_WEEK`, `SUSPENSION`) with custom badge colors.
  - **Frontend (`DayView.tsx`, `MonthGrid.tsx`, `WeekStrip.tsx`)**: Updated calendar components to pass combined holidays to `isScheduleActiveOnDate`. Added Exam Week banner (`EXAM WEEK — title`) and Class Suspension banner (`CLASS SUSPENSION — name`) to `DayView` when active on the selected date.
- **Universal Date Setter for Review Parsed Schedule**:
  - **Frontend (`schedule-confirm.tsx`)**: Added optional Universal Start Date (`universalStartDate`) and End Date (`universalEndDate`) inputs to the schedule review screen. When specified, `handleConfirm` applies these dates to all parsed class schedules; when left blank, individual parsed schedule dates are retained.
- **Feature-Scoped Admin AI Scanners**:
  - **Backend (`schedule-parser.service.ts`, `schedule-parser.controller.ts`, `schedule-parser.routes.ts`)**: Created `parseAdminFeatureFromFile` and `POST /api/schedule-parser/parse-admin` endpoint supporting 5 strict feature scopes (`set-ab`, `program-mapping`, `exam-week`, `special-holidays`, `suspension`). Gemini prompts are strictly scoped per feature so the model does not extract out-of-scope data.
  - **Frontend (`admin.api.ts`, `AdminAIScannerModal.tsx`, Admin Sections)**: Added `parseAdminFeature` API helper and built reusable `AdminAIScannerModal.tsx`. Integrated "AI Scan" buttons in `SemesterRulesSection` (Set A/B), `ProgramMappingsSection`, `ExamWeeksSection`, and `HolidaysSection` (Special Holidays & Suspensions).
- **Student Calendar Exam Schedule Scanner Filter**:
  - **Backend & Frontend (`schedule-parser.service.ts` & `schedule-confirm.tsx`)**: Enhanced schedule parser and confirmation flow for student users (`user.role !== 'ADMIN'`). Multi-day exam weeks (spanning multiple days) are automatically rejected/filtered out, ensuring the scanner accepts only single-day / one-off exam schedules.

## 2026-08-03
- **Backend (Week 5) — AI Notebook: File Upload & Automated Processing Pipeline**:
  - **Supabase Client** (`src/lib/supabase.ts`): Initialized service-role Supabase client singleton using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `.env`. Bypasses Row Level Security for server-side storage operations.
  - **Environment Config** (`src/config/env.ts`): Added `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` to the `ENV` config object.
  - **Prisma Schema** (`prisma/schema.prisma`): Added three new models and two enums:
    - `SourceFileType` enum: `PDF | IMAGE | TEXT`
    - `SourceStatus` enum: `PENDING | PROCESSING | READY | FAILED`
    - `Notebook`: id, title, description, userId → User, sources → Source[]. Indexed on `userId`.
    - `Source`: id, fileName, fileType, storagePath (Supabase object path), status, rawText (up to 100k chars), errorMsg, notebookId → Notebook, userId → User, chunks → SourceChunk[].
    - `SourceChunk`: id, chunkIndex, content (~500 words), `embedding Unsupported("vector(768)")`, sourceId → Source, notebookId. Embeddings stored via pgvector raw SQL.
    - Added `notebooks` and `sources` back-relations to the `User` model.
    - Applied schema via `prisma db push` (resolves drift with existing Neon DB).
    - Regenerated Prisma Client (`prisma generate`).
  - **Gemini Embedding** (`src/utils/gemini.ts`): Added exported `generateEmbedding(text: string): Promise<number[]>` function using `text-embedding-004` model (returns 768-dimensional float array).
  - **Notebook Service** (`src/services/notebook.service.ts`): Full async processing pipeline:
    1. `uploadSourceFile()` — uploads file to Supabase Storage (`notebook-sources` bucket), creates `Source` (status: `PENDING`), fires background `processSource()` without awaiting.
    2. `processSource()` — sets status `PROCESSING` → extracts text (pdf-parse / mammoth / Gemini Vision OCR / raw buffer) → normalizes → chunks (~500 words, 50-word overlap) → embeds each chunk via `text-embedding-004` → inserts `SourceChunk` rows with pgvector via `prisma.$executeRaw` → sets status `READY`. On any failure sets status `FAILED` with error message.
    3. `deleteSource()` — removes file from Supabase Storage and deletes Source record (cascades SourceChunks).
  - **Notebook Controller** (`src/controllers/notebook.controller.ts`): Full REST handlers — `listNotebooks`, `createNotebook`, `getNotebook`, `deleteNotebook`, `uploadSource`, `deleteSourceHandler`. All routes require `AuthMiddleware`. Source listing includes `_count.chunks` for progress display.
  - **Notebook Routes** (`src/routes/notebook.routes.ts`): Registered all 6 endpoints. Upload route uses multer memory-storage (20MB limit). All routes protected by `AuthMiddleware`.
  - **Routes Index** (`src/routes/index.ts`): Registered `notebookRoutes` at `/api/notebooks`.
  - **Package**: Installed `@supabase/supabase-js` (9 packages added).
  - **TypeScript**: Clean `tsc --noEmit` — zero errors.

## 2026-08-03 (continued)
- **Frontend 1 (Week 5) — AI Notebook: File Upload & Processing Pipeline**:
  - *Requirement*: All tasks strictly adhere to established UI/UX design standards and componentization.
  - **`NotebookCard.tsx`** (`src/components/notebook/NotebookCard.tsx`): Card component for a single notebook entry. Shows title, description, source count badge, a "Ready to fill" amber badge when empty, last-updated date, and a left accent stripe. Long-press triggers a destructive delete Alert.
  - **`CreateNotebookSheet.tsx`** (`src/components/notebook/CreateNotebookSheet.tsx`): Bottom-sheet modal for creating a new notebook. Fields: Title (required, 80-char limit) and Description (optional, 300-char limit with live counter). Validation, loading state, error banner, and glowing CTA button.
  - **`SourceListItem.tsx`** (`src/components/notebook/SourceListItem.tsx`): Row component for an uploaded source. Shows file type icon (PDF=red, Image=purple, Text=gray), filename, status badge (`PENDING`→amber, `PROCESSING`→blue, `READY`→green, `FAILED`→red), chunk count when `READY`, and trash delete button with confirmation Alert.
  - **`UploadSourceSheet.tsx`** (`src/components/notebook/UploadSourceSheet.tsx`): Bottom-sheet modal for adding sources. Three picker cards (PDF/DOCX, Gallery, Camera). Selected file preview with size label. Animated native progress bar during upload. Calls backend `POST /api/notebooks/:id/sources` via `FileSystem.uploadAsync` (multipart, `expo-file-system/legacy`). Handles `413`/`415`/network errors with granular messages. Auto-closes on success and triggers list refresh.
  - **`NoteEditor.tsx`** (`src/components/notebook/NoteEditor.tsx`): Full-screen slide-up plain-text editor modal. Title field + multi-line content textarea with live word count and character count. Clear button. Save CTA writes note as a `.txt` temp file and uploads it as a source via `FileSystem.uploadAsync`. Keyboard-avoiding view for iOS/Android.
  - **Notebook List Screen** (`app/(app)/notebook.tsx`): Replaced placeholder. Premium hero banner with `Sparkles` icon and subtitle. Pulls notebooks from `GET /api/notebooks` via `ApiService.notebooks.list()`. `NotebookCard` list with pull-to-refresh, count badge, loading spinner, error banner with retry, and empty state. `+` opens `CreateNotebookSheet`. Long-press delete calls `ApiService.notebooks.delete()` optimistically.
  - **Notebook Detail Screen** (`app/(app)/notebook/[id].tsx`): "Inside a Notebook" screen. Stats bar (Total / Ready / Processing). Processing-in-progress banner with spinner. Auto-polls every 5s while any source is still `PENDING`/`PROCESSING`. `SourceListItem` list with delete. Contextual `+` action menu (Upload File / Write a Note). `UploadSourceSheet` and `NoteEditor` integrated.
  - **Route Registration** (`app/(app)/_layout.tsx`): Added `notebook/[id]` as a hidden tab screen (`href: null`, `headerShown: false`).
  - **API Service** (`src/services/api.ts`): Added `notebooks` namespace (list, create, get, delete) and `sources.delete` namespace.
  - **TypeScript**: All new notebook files compile with zero new errors. Remaining pre-existing errors (`expo-document-picker`/`expo-image-picker` missing type declarations in `AdminAIScannerModal.tsx`, `useScheduleScanner.ts`; router path literal errors in `calendar.tsx`/`schedule-upload.tsx`) are unchanged from before this session.

## 2026-08-03 (continued)
- **Frontend 2 (Week 5) — Notebook State Management & Upload Streams**:
  - **Zustand Store** (src/store/notebookStore.ts): Implemented centralized state management for notebooks and sources using Zustand. It manages isLoadingNotebooks, 
otebooksError, and stores sourcesByNotebook efficiently. Automatically sorts notebooks and sources by createdAt descending.
  - **UI Integration**: Refactored pp/(app)/notebook.tsx and pp/(app)/notebook/[id].tsx to consume data, loading states, and error handling entirely from useNotebookStore. Retained the auto-polling logic to fetch updates from the backend whenever any source status is PENDING or PROCESSING.
  - **File Upload Streams & Progress** (UploadSourceSheet.tsx): Replaced the mocked setInterval progress bar with FileSystem.createUploadTask from expo-file-system. The UI now updates its progress bar using true, byte-level tracking during multipart uploads (	otalBytesSent / totalBytesExpectedToSend). Retained image compression and error boundaries for large files (413) or invalid formats (415).

## 2026-08-06
- **Bug Fixes (Week 5) � Notebook Persistence & Navigation**:
  - **Notebook Vanishing on Refresh**: Fixed `notebookStore.ts` to correctly parse `data?.data` from `{ status: 'success', data: [...] }` backend response envelopes. Previously `fetchNotebooks` fell back to `[]` on every refresh, erasing all notebooks from the UI despite them existing in PostgreSQL.
  - **Notebook Card Tap Navigation**: Fixed `notebook.tsx` route path from `/(app)/notebook` to `/(app)/notebook/[id]`. Tapping a card now correctly navigates to the detail screen.
  - **Explicit Trash Button**: Added a red Trash2 icon button to `NotebookCard.tsx` alongside the chevron so users can delete notebooks with a single tap without long-pressing.
  - **PDF Processing Failure**: Fixed `notebook.service.ts` and `schedule-parser.service.ts` to use the `PDFParse` class from `pdf-parse` v2.4.5 instead of the legacy CommonJS `require()` that returned the module object. Added Gemini Vision OCR fallback for scanned/image-based PDFs.
  - **Embedding Model 404**: Migrated `generateEmbedding()` in `gemini.ts` from deprecated `text-embedding-004` to `gemini-embedding-001` (with fallback to `gemini-embedding-2`). Explicitly set `outputDimensionality: 768` to match the PostgreSQL `vector(768)` column schema.

- **Backend (Week 6) � RAG Pipeline & Notebook Chat Endpoints**:
  - **RAG Service** (`src/services/rag.service.ts`): Full Retrieval-Augmented Generation pipeline. `searchSimilarChunks()` executes raw SQL with pgvector cosine distance operator (`<=>`) to retrieve the top-5 most semantically relevant `SourceChunk` rows (filtered to READY sources only). `executeNotebookChat()` orchestrates: notebook ownership validation ? 768-dim question embedding via `gemini-embedding-001` ? pgvector similarity search ? context-grounded system prompt construction ? Gemini generation with model-cascade fallback ? structured citation metadata extraction (`sourceId`, `fileName`, `chunkIndex`, `snippet`, `similarity`).
  - **Notebook Chat Controller** (`src/controllers/notebook-chat.controller.ts`): Handles `POST /api/notebooks/:notebookId/chat` with message validation (non-empty, max 2000 chars), ownership-aware error routing (404 vs 500), and structured JSON response. Implements `GET /api/notebooks/:notebookId/chat/history` stub returning empty array with a Week 7 note.
  - **Routes** (`src/routes/notebook.routes.ts`): Registered both `POST /:notebookId/chat` and `GET /:notebookId/chat/history` under `/api/notebooks`, protected by `AuthMiddleware`.
  - **TypeScript**: `npm run typecheck` passes with zero errors.

## 2026-08-06 (continued)
- **Frontend 1 (Week 6) - RAG AI Notebook Chat Interface**:
  - *Requirement*: All tasks strictly adhere to established UI/UX design standards and componentization.
  - **ChatTypingIndicator.tsx** (src/components/notebook/chat/ChatTypingIndicator.tsx): Animated three-dot bounce indicator displayed as a left-aligned AI bubble while the RAG pipeline generates a response. Uses Animated.loop with staggered 	ranslateY and opacity for a smooth pulse effect.
  - **ChatMessageCitations.tsx** (src/components/notebook/chat/ChatMessageCitations.tsx): Renders a horizontal row of tappable citation chip badges under each AI response bubble. Chips are color-coded by file type (PDF=red, Image=purple, Text/DOCX=green), show the filename and similarity percentage, and accept an onPress callback to open the detail modal.
  - **CitationDetailModal.tsx** (src/components/notebook/chat/CitationDetailModal.tsx): Bottom-sheet modal triggered by tapping a citation chip. Displays: source filename, inferred file type label, chunk index, an animated gradient similarity progress bar (amber < 60%, blue 60-80%, green 80%+), and the raw extracted text snippet from the SourceChunk. Includes a Done button to dismiss.
  - **ChatMessageBubble.tsx** (src/components/notebook/chat/ChatMessageBubble.tsx): Core message bubble component. User messages: right-aligned, solid #6C8EFF background, white text, rounded bottom-right trimmed. AI messages: left-aligned, #161A26 dark surface, #E2E8F0 text, rounded bottom-left trimmed, Sparkles avatar, ChatMessageCitations embedded below content. Both show HH:MM timestamp.
  - **ChatInputBar.tsx** (src/components/notebook/chat/ChatInputBar.tsx): Sticky bottom input bar with a multi-line TextInput (max 2000 chars, live countdown warning at 1800+), animated send button (activates with glow shadow only when text is present, online, and not loading), and an offline amber banner strip that disables the input when isOnline === false.
  - **ChatHistoryDrawer.tsx** (src/components/notebook/chat/ChatHistoryDrawer.tsx): Slide-up bottom sheet showing current session summary (first user message, message count, "Active" tag), a "New Conversation" CTA button that triggers a clear-confirmation Alert, and a list of past sessions (stubbed for Week 7 persistence) with relative timestamps.
  - **
otebook-chat.tsx** (pp/(app)/notebook-chat.tsx): Full AI Chat screen. Header shows notebook title, RAG badge, live online/offline dot, and History button. Empty state shows Sparkles icon, descriptive subtitle, and four contextual suggestion chips (e.g., "Summarize this notebook"). On send: appends user bubble instantly, shows ChatTypingIndicator, calls POST /api/notebooks/:id/chat, then appends AI bubble with citations. Error handling appends an error-message bubble. New Chat clears messages with an Alert confirmation.
  - **Navigation** (pp/(app)/_layout.tsx): Registered 
otebook-chat as a hidden tab screen (href: null, headerShown: false).
  - **
otebook/[id].tsx**: Added "Ask AI" pill button (MessageSquare icon + label) in the Notebook Detail header. Tapping navigates to /(app)/notebook-chat with id and 	itle params.
  - **src/services/api.ts**: Added ApiService.chat.send(notebookId, message) and ApiService.chat.history(notebookId) methods targeting the Week 6 backend RAG endpoints.
  - **TypeScript**: 
px tsc --noEmit passes with zero errors across all new files.

- **Frontend 2 (Week 6) - Chat State Management**:
  - **Zustand Store** (src/store/chatStore.ts): Implemented a centralized store for managing chat state. Includes messages array, isLoading flag, and error handling.
  - **API Integration**: Connected sendMessage action to ApiService.chat.send(notebookId, text). Handled success and failure states, dynamically appending assistant response and citations.
  - **Offline Resilience**: Integrated with systemStore's isOnline flag. Chat operations gracefully block and error out when the device loses network connectivity, preserving the user experience.
  - **UI Refactoring** (
otebook-chat.tsx): Replaced local state arrays with useChatStore. Simplified message flow and explicitly handled the loading/typing states natively through the store.

## 2026-08-10
- **Backend (Week 7) - AI Chat History Persistence, RAG Prompt Tuning, Resiliency**:
  - **Prisma Schema** (prisma/schema.prisma): Added ChatRole enum (USER, ASSISTANT), ChatSession model (scoped per notebook + user, title derived from first user message, cascade delete), and ChatMessageHistory model (role, content, JSON citations field). Added chatSessions relation on Notebook and User models. Applied via 
px prisma db push against Neon Postgres. Regenerated Prisma client with 
pm run db:generate.
  - **NotebookChatHistoryService** (src/services/notebook-chat-history.service.ts): New service class managing createSession, ppendMessage, listSessions, getSessionMessages, and deleteSession. Handles ownership validation on all read/delete operations. JSON citation field cast safely via s unknown as ChatCitation[].
  - **Notebook Chat Controller** (src/controllers/notebook-chat.controller.ts): Full rewrite. POST /api/notebooks/:notebookId/chat now accepts optional sessionId in request body, auto-creates or reuses a validated ChatSession, persists the user message before RAG execution, and persists the AI reply + citations after. Returns sessionId in response. New handlers: listHistory (GET .../chat/history), getSession (GET .../chat/history/:sessionId), deleteSession (DELETE .../chat/history/:sessionId). Legacy history alias preserved for backward compatibility.
  - **RAG System Prompt Tuning** (src/services/rag.service.ts): Rewrote uildSystemPrompt() with 5 numbered strict rules � context-only grounding, exact refusal phrasing when information is absent, explicit prohibition of fabricated facts, file citation guidance, and educational tone. Calls generateWithFallback(..., 0.2) to set temperature 0.2 for more deterministic, hallucination-resistant responses.
  - **Gemini Utility** (src/utils/gemini.ts): Added optional 	emperature parameter (default 1.0) to generateWithFallback. Passed via generationConfig: { temperature } to each model in the cascade chain. Logs selected temperature per attempt.
  - **Routes** (src/routes/notebook.routes.ts): Registered GET /:notebookId/chat/history, GET /:notebookId/chat/history/:sessionId, and DELETE /:notebookId/chat/history/:sessionId above POST /:notebookId/chat to avoid Express route shadowing. All four routes protected by AuthMiddleware.
  - **TypeScript**: 
pm run typecheck passes with zero errors.

## 2026-08-11
- **Frontend 1 & 2 (Week 7) � AI Chat History Integration**:
  - **API Service** (src/services/api.ts): Updated ApiService.chat.send to accept optional sessionId. Added getSession (GET /api/notebooks/:notebookId/chat/history/:sessionId) and deleteSession (DELETE /api/notebooks/:notebookId/chat/history/:sessionId) methods targeting backend Week 7 persistence endpoints.
  - **Chat Store** (src/store/chatStore.ts): Added sessionId, sessions[], etchSessions, loadSession, and deleteSession actions. Handled automatic sessionId assignment on new message sending and session switching.
  - **ChatHistoryDrawer** (src/components/notebook/chat/ChatHistoryDrawer.tsx): Updated to map real sessions data (title, preview message, relative timestamp, message count). Added interactive session row press handler and inline deleteBtn to delete chat sessions.
  - **Notebook Chat Screen** (pp/(app)/notebook-chat.tsx): Connected ChatHistoryDrawer directly to chatStore. Fetches session history dynamically, loads past conversation threads into the view on selection, and supports prompt clearing for new conversations.


- **Frontend 1 (Week 7) - Polish, Redesign, Branding & UI/UX Audit**:
  - **Homepage Redesign** (pp/(app)/index.tsx): Rebuilt main student dashboard with a greeting hero header, offline/online live dot indicator, quick stats bar (Pending Tasks, Classes Today, Events Today), an Urgent Tasks strip (top 3 overdue/due-today tasks from PowerSync with subject color accents & status badges), a horizontally scrolling Today Timeline (merging classes & events sorted by start time), and an AI Study Hub 2x2 action card grid (Ask AI, Upload Material, Scan Schedule, Notebooks). Runs 100% offline from local PowerSync streams with zero REST API calls.
  - **Reusable Confirmation Modal** (src/components/common/ConfirmModal.tsx): Created a sleek bottom-sheet confirmation modal supporting danger, warning, and info variants with Reanimated ZoomIn/ZoomOut transitions. Integrated into 	asks.tsx for task deletions.
  - **Splash Screen Polish & Animated Transition** (pp.json, pp/_layout.tsx): Configured static dark background splash (#10131C) with official logo in pp.json. Built a smooth custom animated splash overlay in RootLayout featuring a logo pulse scale followed by a gentle fade-zoom transition into the main dashboard.
  - **Main Logo Integration** (src/features/auth/components/LoginForm.tsx, src/features/auth/components/SignupForm.tsx): Integrated the official AcadMate logo (ssets/images/logo.png) prominently on login and signup screens.
  - **Intro / Onboarding Carousel** (pp/intro.tsx): Built a multi-slide feature highlight onboarding screen for fresh users showcasing Smart Academic Scheduling, AI Study Notebook, and 100% Offline Sync with animated slide transitions and skip/continue controls.
  - **Page Title Cleanup & Header Alignment** (pp/(app)/_layout.tsx): Disabled duplicate native headers (headerShown: false) across main tab screens to establish the in-screen custom headers as the single source of truth.
  - **Retroactive UI/UX Audit & Refactoring**: Audited all screen padding, card borders, badge typography, and visual alignments across tasks, calendar, settings, and auth forms.


## $date
- **Frontend 2 (Week 7 Carry-Over) - Homepage Schedule Resolvers**:
  - Bound the new homepage index.tsx schedule filtering logic to the robust isScheduleActiveOnDate() calendar utilities. Now, the homepage accurately reflects Set A/B, Exam Weeks, and Holidays for the today-timeline using in-memory filters over PowerSync streams.

- **Frontend 1 & 2 (Week 8) - Local Offline-First Notifications Engine**:
  - **Dependencies**: Installed and integrated expo-notifications module.
  - **NotificationService** (src/services/notificationService.ts): Orchestrates local permissions, Android notification channels, and custom deterministic schedulers for Class schedules (weekly recurring, parameterized lead time), Tasks (1 day before, 1 hour before), and notebook Study sessions.
  - **Zustand Preferences Store** (src/store/notificationStore.ts): Manages user notification settings, persisting preferences locally using expo-secure-store.
  - **Deep Linking Hooks** (src/hooks/useNotificationDeepLink.ts): Adds global response handlers routing taps on Class, Task, and Study reminders to their target routes.
  - **Settings UI Integrations** (pp/(app)/settings.tsx): Built customized settings panel toggles for Class reminders (with 5/10/15/30m options), Task alerts, and Notebook study reminders.
  - **Study Scheduler Dialog** (src/components/notebook/StudySchedulerModal.tsx): Built and wired a custom dialog allowing users to pick times, dates, and focus notes to schedule study reminders directly from the Notebook details header button.
  - **Type Checking**: Validated compilation passes cleanly with zero errors.
