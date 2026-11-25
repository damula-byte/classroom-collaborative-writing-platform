# WriteSpace Functional Parity Matrix

| Feature | Original Behavior | Target Behavior | Data Persistence & Real-time | Authorization | Status |
|---|---|---|---|---|---|
| WriteSpace Design Tokens | `#fbfaf7` bg, DM Sans, `#f97316` orange, `#16a34a` green | Applied in `src/index.css`, `tailwind.config.js`, `src/config/branding.ts` | Static CSS/tokens | N/A | VERIFIED PARITY |
| 404 Route | Friendly Not Found page | `NotFound.tsx` wired to `/*` in `HashRouter` | N/A | Public | VERIFIED PARITY |
| Create Group (Prompt & Capacity 1–20) | Group with `prompt` and `maxMembers` (default 4) | `createWriteSpaceGroup` + `GroupForm` modal | Firestore `classes/{classId}/groups` + `documents/{groupId}` | Teacher only (`firestore.rules`) | IMPLEMENTED BUT UNVERIFIED |
| Atomic Group Join & Capacity | Prevents over-capacity & duplicate names | `joinGroupAtomic` + `updateGroupCapacity` + `removeGroupMember` | Firestore `runTransaction` | Authenticated student / Teacher | IMPLEMENTED BUT UNVERIFIED |
| Collaborative Writing Editor | `#f1f3f4` workspace, `850px` paper, ~450ms autosave | `StudentWorkspace.tsx` + `CollaborativeEditor.tsx` (450ms debounce, `sanitizeRichHtml`) | Firestore `documents/{groupId}` | Group member while `WRITING` & `!locked` | IMPLEMENTED BUT UNVERIFIED |
| Return to Students | Teacher returns `submitted -> draft` preserving content | `returnToStudents` in `ClassDetail.tsx` & `ReviewMode.tsx` | Firestore `runTransaction` | Teacher only | IMPLEMENTED BUT UNVERIFIED |
| Peer Review Unlock | Locked until student's own group is submitted | `hasSubmittedOwnGroup` + Firestore `documents` read rule | Firestore `onSnapshot` | Student in submitted group | IMPLEMENTED BUT UNVERIFIED |
| Comments, Replies & 6-Color Highlights | 360px sidebar, 6 colors, 500-char quote limit, immutable | `CommentsSidebar.tsx`, `HighlightColorPicker.tsx`, `createWritingComment` | Firestore `comments` (`onSnapshot`) | Immutable (`update, delete: if false`) | IMPLEMENTED BUT UNVERIFIED |
| Atomic Voting & Winner | `1–20` votes/student, no self/duplicate vote, tied winners | `castVoteAtomic`, `VoteButton`, `WinnerBadge`, `calculateWinners` | Firestore `votes` + `voterQuotas` | Rules enforce `voterUid == auth.uid` & quota | VERIFIED PARITY (unit tested) |
| Synchronized Timer | Start, Pause, Resume, Reset, Expiration lock | `startClassTimer`, `pauseClassTimer`, `resumeClassTimer`, `resetClassTimer`, `finalizeExpiredTimerIdempotent` | Firestore `classes/{classId}` | Teacher controls; read-only for students | IMPLEMENTED BUT UNVERIFIED |

## Known Limitations
1. **All-Clients-Offline Timer Expiration:** Because the architecture uses Firebase client SDK + GitHub Pages (no Cloud Functions/billing), if all teacher and student browser tabs close before the timer expires, `SUBMITTED` finalization runs idempotently as soon as any authorized client next opens the classroom.
2. **Visual & Emulator Verification:** Production build (`vite build`), TypeScript (`tsc --noEmit`), ESLint (`npm run lint`), and Vitest (`32/32` unit tests) all pass. Live Firebase Emulator Rules tests and side-by-side browser visual diff against WriteSpace are marked `NOT RUN` in this environment.
