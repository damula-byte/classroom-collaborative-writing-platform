# AGENTS.md — Classroom Collaborative Writing Platform

> This file provides project-level instructions for all AI coding agents and developers working on this project.
> Read this file completely before making any changes to the codebase.

---

## Project Overview

**Project:** Classroom Collaborative Writing Platform
**Purpose:** A real-time collaborative writing platform for English classrooms. Teachers create classes and writing groups; students join with class codes, write collaboratively, and receive teacher feedback.

**UI/UX Reference:** The visual design, user flow, and interaction patterns are modeled after the "Collaborative English Writing Platform" (WriteSpace) project. When implementing any UI, use WriteSpace as the visual reference — but implement using this project's Firebase infrastructure.

**Tech Stack:**
| Layer | Technology |
|---|---|
| Frontend framework | React 18 |
| Build tool | Vite 6 |
| Language | TypeScript |
| Routing | React Router v6 (HashRouter) |
| Styling | Tailwind CSS v3 |
| Backend | Firebase (Auth + Firestore + Realtime Database) |
| Collaboration | Yjs + Tiptap (editor) |
| Package manager | npm |
| Deployment | GitHub Pages via GitHub Actions |

## Protected Infrastructure vs Application-Level Extensions

### 🛡️ Protected Infrastructure (STRICTLY FORBIDDEN TO MODIFY)
AI agents MUST NOT change, replace, or bypass the following files and systems:
- `src/config/firebase.ts` (Firebase initialization, Auth, Firestore, RTDB)
- Existing Firebase Authentication architecture and session persistence
- Existing Firestore & RTDB infrastructure (`firestore.rules`, `firebase.json`)
- Existing service functions in `src/services/index.ts`
- Existing hooks in `src/hooks/*`
- Collaboration core: Yjs/Tiptap engine architecture
- Routing infrastructure: React Router `HashRouter` (hash-based routing required for GitHub Pages)
- Deployment configuration: `vite.config.ts` (`base: './'`), `.github/workflows/deploy.yml`, `.env`

### ⚙️ Allowed Application-Level Extensions (Gated by Approval)
The following may be added ONLY when a specific phase explicitly calls for it and is APPROVED:
- **Additive optional Firestore fields** (e.g. `timerStartedAt?: number | null`)
- **New service functions** in `src/services/index.ts` (never changing existing signatures)
- **New custom UI state or components**

> 🔴 **MANDATORY RULE:** AI agents MUST NOT make architectural decisions or implement HIGH-RISK Firebase schema/service changes, Yjs sync activation, or timer auto-submit logic without explicit user approval.

---

## Decision Gates & Safety Classifications

The following features MUST NOT be implemented automatically:

1. **Timer Firebase Integration (Phase 6B - 🔴 HIGH RISK):**
   - Phase 6A implements the Timer UI using local state only.
   - Do NOT add timer fields to Firestore or services until explicit approval for Phase 6B is granted.
2. **Timer Auto-Submit on Expiry (🔴 HIGH RISK):**
   - When the timer expires, the UI must only show an expired state.
   - Do NOT automatically trigger document submission on timer expiration.
3. **Yjs Realtime Sync Wire-up (Phase 9 - 🔴 HIGH RISK):**
   - `StudentWorkspace.tsx` and `ReviewMode.tsx` currently pass `ydoc={null}`.
   - Do NOT wire `useCollaboration` or RTDB delta sync automatically during UI reskinning.
   - Maintain the current document save/editor behavior until an explicit Yjs activation audit is approved.
4. **Product Branding (🟢 SAFE):**
   - Do NOT hardcode "WriteSpace" as the application title.
   - Use configurable branding (e.g., `<Logo productName="..." />`).
5. **Vote / Heart Feature (⚪ OPTIONAL):**
   - Do NOT implement Firestore-backed voting in the core UI migration. Kept as optional/deferred.


### 🔴 NEVER DO THESE

```
❌ Replace Firebase with any other backend
❌ Remove or modify src/config/firebase.ts
❌ Duplicate Firebase initialization (always import from src/config/firebase.ts)
❌ Modify .github/workflows/deploy.yml
❌ Modify firebase.json or firestore.rules without explicit approval
❌ Modify .env or .env.example
❌ Change HashRouter to BrowserRouter
❌ Change vite.config.ts base path from './'
❌ Replace the Yjs/Tiptap collaboration engine
❌ Copy backend logic from the WriteSpace/PayloadCMS project
❌ Install PayloadCMS, Next.js, or any server-side CMS
❌ Add hardcoded Firebase credentials to any source file
❌ Expose VITE_FIREBASE_* values in comments or console.log
```

### 🟢 ALWAYS DO THESE

```
✅ Import Firebase from src/config/firebase.ts only
✅ Reuse existing hooks in src/hooks/ before writing new ones
✅ Reuse existing service functions in src/services/index.ts
✅ Keep HashRouter and all existing route paths
✅ Maintain base: './' in vite.config.ts (GitHub Pages requirement)
✅ Run npm run build before claiming a task is complete
✅ Run npx tsc --noEmit to check TypeScript
✅ Inspect existing code before modifying or adding similar code
✅ Use src/utils/cn() for conditional class names
```

---

## Firebase Architecture

### Project Structure
```
Firebase Project
├── Firestore Database
│   ├── classes/{classId}              ← Class documents
│   │   ├── groups/{groupId}           ← Group subcollection
│   │   └── students/{uid}             ← Student subcollection
│   ├── documents/{groupId}            ← Writing documents
│   └── annotations/{annotationId}    ← Teacher annotations/comments
└── Realtime Database
    └── classes/{classId}
        ├── live/{groupId}/updates     ← Yjs delta sync
        ├── live/{groupId}/awareness   ← Cursor awareness
        └── presence/{groupId}/{uid}   ← Online presence
```

### Firebase Services (src/services/index.ts)
All Firestore and service operations are centralized here. **Do not write Firestore queries directly in components or pages.** Add new service functions to this file.

| Function | Purpose |
|---|---|
| `createClass` | Create a new class |
| `getClassById`, `subscribeToClass` | Get/subscribe to a class |
| `updateClass`, `deleteClass` | Modify/delete class |
| `subscribeToClasses` | List teacher's classes |
| `getClassByCode` | Student join by code |
| `createGroup`, `updateGroup` | Manage writing groups |
| `subscribeToGroups` | Real-time group list |
| `registerStudent`, `updateStudentGroup` | Student operations |
| `getDocument`, `updateDocument` | Writing document CRUD |
| `subscribeToDocument`, `subscribeToDocuments` | Real-time docs |
| `createAnnotation`, `updateAnnotation`, `deleteAnnotation`, `resolveAnnotation` | Teacher feedback |
| `transitionDocumentStatus`, `submitDocument`, `startReview`, `completeReview` | Document lifecycle |
| `lockDocumentState`, `unlockDocumentState` | Document locking |

### Firebase Hooks (src/hooks/)
| Hook | File | Purpose |
|---|---|---|
| `useAuth` | useAuth.ts | Firebase Auth state + login/logout methods |
| `useClass` | useClass.ts | Subscribe to single class |
| `useGroups`, `useClassGroups` | useGroup.ts | Subscribe to class groups |
| `useDocument`, `useAnnotations` | useDocument.ts | Subscribe to document + annotations |
| `useDocuments` | useDocuments.ts | Subscribe to multiple documents |
| `usePresence`, `useGroupPresence` | usePresence.ts | RTDB presence tracking |
| `useCollaboration`, `useYDoc` | useCollaboration.ts | Yjs/RTDB delta sync |
| `useQuotaMonitor` | useQuotaMonitor.tsx | Firebase quota display |

**Rule:** If a hook for the data you need already exists, USE IT. Do not write a new subscription from scratch.

### Authentication Model

| Role | Firebase Auth type | useAuth property |
|---|---|---|
| Teacher (email) | Email/Password | `isTeacher === true` |
| Teacher (Google) | Google popup | `isTeacher === true` |
| Teacher (guest) | Anonymous | `isGuestTeacher === true` |
| Student | Anonymous | `isStudent === true` |

> **Note:** Both guest teachers and students use `signInAnonymously()`. Teachers are distinguished by having `displayName` set via `updateProfile`. Students set their name in Firestore student records.

### Schema — Class Document
```typescript
interface Class {
  id: string;
  code: string;          // 6-char class code
  title: string;
  topic: string;
  teacherId: string;     // Firebase Auth UID
  teacherName: string;
  status: 'ACTIVE' | 'ARCHIVED';
  allowStudentGroupSelection: boolean;
  studentCount: number;
  createdAt: number;     // Unix ms timestamp
  updatedAt: number;
  // Timer fields (optional, additive — added in Phase 6):
  timerDurationSeconds?: number;
  timerStartedAt?: number | null;
  timerEndsAt?: number | null;
  timerPausedAt?: number | null;
  timerRemainingSeconds?: number | null;
  timerFinalizedAt?: number | null;
}
```

### Schema — Document Lifecycle
```
WRITING → SUBMITTED → REVIEWING → REVIEWED
       ↘            ↗          ↗
         LOCKED ←──────────────
```
State transitions are enforced by `canTransition()` in services/index.ts. Never call `updateDocument` directly to change status — always use the lifecycle functions.

---

## UI Rules

### Visual Reference
The WriteSpace project (`Collaborative English Writing Platform`) is the **UI/UX reference only**. Never copy its backend code, PayloadCMS schemas, REST API calls, or Next.js-specific logic.

### Design Tokens (WriteSpace palette)
```
Primary action: orange-500 (#f97316) — teacher actions, CTAs
Secondary action: green-600 (#16a34a) — student actions, success
Neutral: slate scale — text, borders, backgrounds
Background: #fbfaf7 (warm white) or white
Font: DM Sans (from Google Fonts CDN)
Border radius: rounded-xl (inputs), rounded-3xl (cards/modals)
```

### CSS Utility Classes (from src/index.css)
```
.ws-field       — text input style
.ws-btn-primary — orange primary button
.ws-btn-green   — green button
.ws-btn-secondary — outlined secondary button
.ws-modal-backdrop — fixed overlay
.ws-modal-card  — modal card
```

### Component Conventions
```
src/components/
├── common/      ← Existing shared components (Button, Input, Modal, Toast, StatusBadge)
├── ui/          ← NEW WriteSpace-specific UI (Logo, Avatar, AppHeader, ClassTimer, EmptyState)
├── editor/      ← Tiptap/Yjs editor components (DO NOT modify without approval)
└── teacher/     ← Teacher-specific form components (ClassForm)
```

**Rule:** Before creating a new component, check if one already exists in `src/components/common/` or `src/components/ui/`. Prefer refactoring over duplication.

### Responsive Breakpoints
```
Mobile: < 640px   (sm)
Tablet: 640–1024px (md/lg)
Desktop: > 1024px  (xl)

Required responsive behavior:
- Home page: single column on mobile, 2-col on sm
- Auth pages: single column on mobile, 2-col on lg
- Dashboard: 1→2→3 column class grid
- Class detail: timer controls wrap on mobile
- Student workspace: editor full height on mobile
- Review mode: annotation sidebar collapses to bottom on mobile
```

### Loading / Error / Empty States
- Use `EmptyState` component for empty lists
- Use `Toast` for success/error notifications (no `window.alert`)
- Use `Modal` for confirmations (no `window.confirm`)
- Show loading spinner or skeleton during data fetches

---

## Collaboration Rules

### Yjs + RTDB Architecture
```
useYDoc(groupId) → creates/manages Y.Doc instance
useCollaboration(groupId, classId, ydoc) → syncs to RTDB
CollaborativeEditor receives ydoc prop → Tiptap renders
```

> [!WARNING]
> **DO NOT replace the Yjs/RTDB collaboration engine.** The sync is specifically designed for Firebase RTDB free tier (delta-based, not WebSocket provider). Do not add `y-websocket`, `y-webrtc`, or any other Yjs provider.

### When working on StudentWorkspace or ReviewMode:
- The `ydoc` prop to `CollaborativeEditor` is currently `null` (Yjs sync not yet wired)
- Wiring `useYDoc + useCollaboration` is a Phase 9 task
- Document it explicitly before changing
- Never remove `ydoc` prop from `CollaborativeEditor` — the component handles `null` gracefully

---

## Routing Rules

### HashRouter (Required for GitHub Pages)
```typescript
// App.tsx — ALWAYS use HashRouter, never BrowserRouter
import { HashRouter as Router } from 'react-router-dom';
```

### Route Map (do not add or remove routes without approval)
```
#/                                            → HomePage
#/teacher/login                               → TeacherLogin
#/teacher/register                            → TeacherRegister
#/teacher/dashboard                           → TeacherDashboard
#/teacher/classes/:classId                    → ClassDetail
#/teacher/classes/:classId/monitor            → LiveMonitoring
#/teacher/classes/:classId/groups/:groupId/review → ReviewMode
#/join                                        → StudentJoin
#/student/workspace/:groupId                  → StudentWorkspace
```

### GitHub Pages Compatibility
- `vite.config.ts` must keep `base: './'`
- All asset paths must be relative
- Never use absolute paths like `/assets/...` in production code
- The `dist/` folder is what gets deployed

---

## Deployment Rules

### Preserve These Files Exactly
```
.github/workflows/deploy.yml   ← GitHub Actions workflow
firebase.json                  ← Firebase hosting/RTDB config
firestore.rules                ← Firestore security rules
```

### Build Process
```bash
npm run build    # Produces dist/ for GitHub Pages
```
The GitHub Actions workflow runs:
1. `npm ci` — install dependencies
2. `npx tsc --noEmit` — TypeScript check
3. `npm test` — Vitest tests
4. Build `.env` from GitHub Secrets
5. `npm run build` — Vite build
6. Deploy to GitHub Pages

**Never break this pipeline.**

---

## Development Workflow

### Before Making Any Change
1. Read the relevant source file(s)
2. Check if an existing hook/service/component covers the need
3. Understand the Firebase data flow
4. Plan the minimal change

### Standard Change Checklist
```bash
npx tsc --noEmit    # Must pass
npm run lint        # Must pass (max 100 warnings)
npm test            # Must pass
npm run build       # Must pass — dist/ must be generated
```

### After Making Changes
Verify:
- [ ] Firebase Auth still works (teacher + student)
- [ ] Firestore real-time subscriptions still fire
- [ ] HashRouter navigation still works
- [ ] `npm run build` succeeds without errors

---

## Change Safety Classification

### 🟢 SAFE (UI-only, no Firebase/routing risk)
- CSS/style changes
- New shared UI components that have no Firebase calls
- Tailwind class changes
- Font/color changes
- Text/copy changes

### 🟡 CAUTION (touches existing logic)
- Modifying existing page components
- Adding new props to existing components
- Modifying auth page flows
- Adding new Firestore fields (additive only)
- Adding new service functions to services/index.ts

### 🔴 HIGH RISK (Firebase / realtime / deployment / routing)
- Any change to src/config/firebase.ts
- Any change to src/services/index.ts existing functions
- Any change to src/hooks/*.ts
- Any change to src/types/index.ts existing interfaces
- Any routing architecture change
- Any deployment config change
- Any Yjs/RTDB collaboration change
- Enabling Yjs sync (wiring useCollaboration in workspaces)

> **Rule:** High risk changes require explicit approval and must be isolated to their own implementation phase.

---

## Prohibited Patterns

```typescript
// ❌ Never initialize Firebase again
import { initializeApp } from 'firebase/app';
const app = initializeApp({...}); // WRONG

// ✅ Always use the existing instance
import { db, auth, rtdb } from '@/config/firebase';

// ❌ Never hardcode secrets
const apiKey = "AIzaSy..."; // WRONG

// ❌ Never bypass the service layer
import { doc, setDoc } from 'firebase/firestore';
await setDoc(doc(db, 'classes', id), data); // Write directly — WRONG for most cases

// ✅ Use the service layer
import { createClass } from '@/services';
await createClass(data); // CORRECT

// ❌ Never use window.confirm
if (window.confirm('Delete?')) { ... } // WRONG

// ✅ Use Modal component
<Modal open={showConfirm} ...> // CORRECT

// ❌ Never hardcode absolute paths
<img src="/assets/logo.png" /> // Breaks on GitHub Pages sub-path

// ✅ Use relative imports or inline SVG
import logoSrc from './assets/logo.png'; // or inline SVG
```

---

## Implementation Phase Reference

| Phase | Description | Risk | Approval Needed? |
|---|---|---|---|
| 0 | AGENTS.md + Setup | 🟢 SAFE | Done |
| 1 | Design System (CSS tokens, DM Sans font) | 🟢 SAFE | Ready |
| 2 | Shared UI Components (Logo, AppHeader, EmptyState, etc.) | 🟢 SAFE | Ready |
| 3 | App Shell & Home Page (WriteSpace layout, keep all routes) | 🟢 SAFE | Ready |
| 4 | Auth Pages Reskinning (AuthShell, Google/Guest first, keep Email/Register) | 🟡 CAUTION | Ready |
| 5 | Teacher Dashboard (Modern cards, stats, AppHeader) | 🟡 CAUTION | Ready |
| 6A | Class Detail & Timer UI (Local/visual timer, group grid) | 🟢 SAFE | Ready |
| 6B | Firestore Timer Integration (Additive fields & services) | 🔴 HIGH RISK | **YES (Decision Gate 1)** |
| 7 | Live Monitoring View (WriteSpace live oversight) | 🟡 CAUTION | Ready |
| 8 | Review Mode View (Two-column layout, feedback stream) | 🟡 CAUTION | Ready |
| 9A | Student Workspace UI (Clean header, prompt box, word counter) | 🟡 CAUTION | Ready |
| 9B | Yjs Collaboration Sync Activation (RTDB delta sync) | 🔴 HIGH RISK | **YES (Decision Gate 3)** |
| 10 | Responsive & Visual Polish | 🟢 SAFE | Ready |
| 11 | Build & GitHub Pages Verification | 🟡 CAUTION | Ready |

**Implement phases in order. Do not skip phases. Verify build after each phase.**

---

## Source Project — What NOT to Copy

The WriteSpace project (`Collaborative English Writing Platform`) uses:
- Next.js App Router — **do not add**
- PayloadCMS — **do not add**
- `/writespace-data` route handler — **do not add**
- `payload-types.ts` — **do not add**
- `getPayloadClient()` — **do not add**
- `pnpm` workspace — **do not add**

You may reference WriteSpace **only** for:
- UI layout and visual design
- Component structure and interaction patterns
- CSS utility class names (adapt, don't copy verbatim)
- Color values and typography
- Animation and transition patterns

---

*Last updated: Phase 0 — Planning complete. Implementation not yet started.*
