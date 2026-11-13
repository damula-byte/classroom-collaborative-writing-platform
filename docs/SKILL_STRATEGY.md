# Antigravity Project Skill Strategy

## Overview
This document outlines the skill strategy for the **Classroom Collaborative Writing Platform** project in Antigravity. It identifies required technical capabilities, maps them to available Antigravity skills, Marketplace plugins, and native toolchains, and defines how each capability is executed across development phases.

## Skill Discovery & Evaluation Summary

1. **Marketplace Discovery**:
   - `antigravity-plugins-official/plugin/firebase`: Official Firebase plugin for Firebase project management.
   - `antigravity-plugins-official/plugin/modern-web-guidance-plugin`: Guidance for modern web development best practices.
   - `antigravity-plugins-partners/plugin/coderabbit`: AI code review (requires external service account).
   - `antigravity-plugins-official/plugin/chrome-devtools-plugin`: In-depth browser debugging (covered natively by Antigravity `browser` subagent).

2. **Native Toolchains & Workflows**:
   - Capabilities that do not have dedicated marketplace packages (or where external dependencies are unnecessary) are executed via **Antigravity native tools** (`run_command`, `read_file`, `write_file`, `edit_file`), specialized **subagents** (`browser`, `research`), and industry-standard testing/linting suites (`vitest`, `@firebase/rules-unit-testing`, `eslint`, `tsc`).

## Capability Mapping Matrix

| Capability | Skill / Toolchain | Installed / Mode | Purpose | Used in |
|------------|-------------------|------------------|---------|---------|
| **Architecture & Planning** | Antigravity Native Architect + `docs/ARCHITECTURE.md` + `senior-architect` | Native Tool + Installed Plugin (`claude-skills`) | System modeling, data schema, CRDT analysis, security boundary design | Phase 0, Phase 1 |
| **Web / React / TypeScript** | Vite + React 18/19 + TypeScript + Tailwind CSS + `senior-frontend` | Native Toolchain + Installed Plugin (`claude-skills`) | Fast frontend building, type-safe components, responsive UI | Phase 1 - 18 |
| **Firebase / Firestore** | Firebase Official Plugin (`antigravity-plugins-official/plugin/firebase`) + Web SDK v10/11 | Installed Plugin + Native CLI | Authentication (Email & Anonymous), Firestore persistence, RTDB signaling | Phase 2, 3, 4, 12 |
| **Realtime Collaboration (CRDT)** | Yjs + Tiptap v2 + Firebase RTDB Adapter | Native Toolchain | Multi-student concurrent writing, cursor presence, conflict-free sync | Phase 5, 6, 9, 10 |
| **Editor & Annotations** | Tiptap (ProseMirror) + Custom Annotation Marks | Native Toolchain | Rich text editing, inline text selection, teacher highlights & comments | Phase 5, 9, 10 |
| **Automated Testing** | Vitest + React Testing Library + `@firebase/rules-unit-testing` + `tdd-guide` | Native Toolchain + Installed Plugin (`claude-skills`) | Unit tests (Class code, state, annotations) & Integration security tests | Phase 13 |
| **Security Rules & Audit** | `firestore-rules-creation` & `firebase-security-rules-auditor` + `senior-security` | Installed Plugin Skills (`firebase` & `claude-skills`) | Enforce student group isolation, teacher authorization, locked state write-denials | Phase 7, 12, 15 |
| **Debugging** | Antigravity Native Debugger + `browser` Subagent | Native Toolchain | Reproduce bugs, inspect network/listeners, verify console errors | All Phases |
| **Code Review** | Antigravity Senior Reviewer + `code-reviewer` + ESLint + `docs/CODE_REVIEW.md` | Native Toolchain + Installed Plugin (`claude-skills`) | Clean code, type safety, listener leaks, free-tier quota optimization | Phase 14 & Phase Gates |
| **UI/UX Verification** | Antigravity `browser` Subagent + Responsive Design | Native Toolchain | Verify teacher live dashboard (1366x768 / 1920x1080) and student screen | Phase 8, 9, 18 |
| **CI/CD & Deployment** | GitHub Actions (`deploy.yml`) + GitHub Pages | Native Toolchain | Automated build, test, and zero-cost hosting | Phase 17 |

## Execution Guidelines
- **No Pseudo-Skills**: We do not create fictitious skill wrappers. Every capability is powered either by verified Antigravity extensions or well-defined native CLI/SDK workflows.
- **Phase Gate Enforcement**: Each phase must pass its automated verification and review checklist before proceeding to subsequent phases.
