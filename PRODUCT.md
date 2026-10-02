# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- **Collegiate Students in the Philippines (Primary User)**: Students navigating hybrid schedules (alternating Set A / Set B weeks, Face-to-Face vs. Online classes), assignment deadlines, Philippine holiday suspensions, and exam period adjustments. Frequently subject to intermittent campus Wi-Fi or limited mobile data; requires immediate, offline-ready mobile responsiveness.
- **Academic Administrators / Department Coordinators (Secondary User)**: Manage institutional schedules, degree program mappings, campus-wide exam periods, and baseline Saturday Set parity rules via dedicated administrative workflows.

## Product Purpose

AcadMate is an offline-first intelligent academic assistant mobile application designed to eliminate scheduling friction, fragmented task management, and connectivity hurdles for collegiate students. Success means zero-latency schedule tracking and task management that works unconditionally offline, accurately anticipates alternating class modalities, and intelligently processes academic materials with AI assistance.

## Positioning

Unlike conventional generic calendar or to-do apps, AcadMate integrates a specialized bi-weekly Set A / Set B schedule resolver paired with bidirectional local SQLite replication (PowerSync) and multimodal Gemini OCR. It natively understands university scheduling nuances (such as alternating laboratory weeks, Philippine holiday class suppression, and semester exam periods) with deterministic zero-latency local execution.

## Operating Context

- **Environment**: Mobile smartphones (Android 8.0+ / iOS 15.0+) in lecture halls, transit, study areas, and offline campus spots.
- **Data & Sync**: Local-first SQLite database via PowerSync replicating to a Neon Serverless PostgreSQL backend. Reads and common actions run entirely client-side without network-blocking loaders.
- **Inputs**: Camera captures of paper timetables/syllabi, uploaded PDF/DOCX schedules, course notes, and manual task/schedule entries.
- **Outputs**: Push/local notifications via native AlarmManager / iOS notifications, dynamic week strips, month grids, day timelines, and grounded RAG study citations.

## Capabilities and Constraints

- **Platform Architecture**: Expo / React Native (Uniwind + Tailwind v4 + Reusables).
- **Strict UI Constraints**:
  - Strictly output React Native elements (`View`, `Text`, `Pressable`, `ScrollView`, etc.).
  - Never inject web-only elements (`div`, `span`, etc.), web-only CSS properties, or absolute desktop positioning.
  - Align all layout spacing, paddings, margins, gaps, and sizing to an **8-point grid scale** (8, 16, 24, 32, 40, 48, etc.).
  - Follow mobile platform boundaries mapped out in iOS HIG (44x44pt minimum touch targets, safe area insets, navigation stack/sheet patterns) and Android Material 3 (48x48dp touch targets, back gesture preservation, tonal elevation, Material roles).
- **Core Feature Capabilities**:
  - Offline-first task management with swipe actions and subject color categorization.
  - Academic calendar with 6x7 MonthGrid, WeekStrip, DayView, and automated `resolveScheduleForDate()` calculation.
  - Automated suppression of classes during designated Exam Weeks and official Philippine holidays.
  - Multimodal AI Schedule OCR (Gemini Vision) extracting structured course events from PDFs, DOCXs, and photos.
  - Isolated RAG Study Notebooks with pgvector semantic similarity search and inline verification.
  - Deterministic offline notification triggers using exact hardware alarms.

## Brand Commitments

- **Visual Theme**: Refined Dark Theme with primary accent `#6C8EFF`, background `#10131C`, card surface `#161A26`, muted background `#1A1F2E`, and border `#2A3143`.
- **Typography**: Inter font family applied uniformly via `@expo-google-fonts/inter`.
- **Voice & Tone**: Focused, reliable, academic, direct, and unbloated.

## Evidence on Hand

- IEEE-compliant Software Requirements Specification ([SRS.md](file:///c:/Acadmate/docs/SRS.md)).
- Software Design Description ([SDD.md](file:///c:/Acadmate/docs/SDD.md)) and Software Project Management Plan ([SPMP.md](file:///c:/Acadmate/docs/SPMP.md)).
- Complete frontend codebase with active screens, components, and schema under `c:/Acadmate/acadmate-frontend`.
- Established design tokens defined in `c:/Acadmate/acadmate-frontend/global.css`.

## Product Principles

1. **Local-First, Zero-Latency**: All primary student interactions (viewing calendar, checking off tasks, editing classes) execute against local SQLite instantly; the network is an asynchronous synchronization channel, not a gatekeeper.
2. **Context-Aware Accuracy**: Schedules are not static repeating blocks; they must accurately reflect student sets (Set A / Set B), holiday class cancellations, and exam block overrides automatically.
3. **Respect Mobile Native Boundaries**: The interface must feel unmistakably native to mobile devices, honoring platform navigation conventions, touch ergonomics (44pt/48dp minimums), safe areas, and an 8-point rhythm.
4. **Focused Utility, Zero AI Slop**: AI features (OCR schedule ingestion and study notebook RAG) serve concrete student needs with strict structured schemas and grounded citations, avoiding decorative or gimmicky chatbot clutter.

## Accessibility & Inclusion

- Compliance with WCAG 2.1 AA contrast ratios on dark backgrounds.
- Minimum interactive touch targets of 44×44 pt (iOS) / 48×48 dp (Android) with at least 8 dp separation.
- Support for system font scaling / Dynamic Type without label clipping or layout breakage.
- Explicit accessibility labels (`accessibilityLabel`, `accessibilityRole`, `accessibilityHint`) on custom interactive elements.
