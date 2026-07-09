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
