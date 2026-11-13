# Classroom Collaborative Writing Platform

A real-time collaborative writing platform for classrooms, built with React, TypeScript, Firebase, Yjs, and Tiptap.

## Features

- **Real-time collaborative editing** using Yjs CRDT and Firebase RTDB
- **Teacher review mode** with annotations, highlights, and comments
- **Document lifecycle state machine**: Writing → Submitted → Reviewing → Reviewed
- **Student group isolation** with Firestore security rules
- **Quota monitoring** for Firebase free tier limits
- **Live teacher dashboard** with class and student monitoring

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Editor**: Tiptap (ProseMirror) with Yjs collaboration
- **Backend**: Firebase (Firestore, RTDB, Auth)
- **State Management**: React hooks + custom service layer
- **Testing**: Vitest, React Testing Library, Firebase Rules Unit Testing

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Firestore and RTDB enabled
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in your Firebase configuration:

```bash
cp .env.example .env
# Edit .env with your Firebase project values
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── config/          # Firebase initialization
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── services/        # Firestore/RTDB service layer
├── hooks/           # Custom React hooks
├── components/      # Reusable UI components
│   ├── common/      # Button, Input, Modal, Toast, StatusBadge
│   ├── editor/      # CollaborativeEditor, AnnotationHighlighter, etc.
│   └── teacher/     # ClassForm
└── pages/           # Route components
    ├── auth/        # TeacherLogin, TeacherRegister
    ├── teacher/     # TeacherDashboard, ClassDetail, LiveMonitoring, ReviewMode
    └── student/     # StudentJoin, StudentWorkspace
```

## Security

Firestore security rules enforce:
- Student group isolation (students can only access their own group's documents)
- Teacher authorization (only the class teacher can modify class data)
- Locked document write-denial (students cannot modify locked documents)
- Annotation teacher-only writes (students cannot create annotations)

See `docs/SECURITY_AUDIT.md` for the full security audit.

## Deployment

### Firebase Hosting

```bash
firebase init hosting
firebase deploy --only hosting
```

### CI/CD

GitHub Actions workflow is configured in `.github/workflows/deploy.yml`. It runs typecheck, tests, and build on every push, then deploys to Firebase Hosting on merge to main.

## License

MIT