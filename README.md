# Sticky Notes TS

A deliberately minimal React + TypeScript scaffold for the sticky-notes coding task.
No sticky-note features have been implemented yet.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

## Install

```bash
npm install
```

The first install will generate `package-lock.json`.

## Development

```bash
npm run dev
```

## Type checking

```bash
npm run typecheck
```

## Linting

```bash
npm run lint
```

## Tests

```bash
npm run test
```

No tests are included in this initial scaffold. The first real test will be added with the geometry work.

## Production build

```bash
npm run build
npm run preview
```

## Full verification

```bash
npm run check
```

`npm run check` is intentionally expected to fail at the test step until the first real test is added. The project does not use `passWithNoTests` or a placeholder test.

## Initial structure

```text
src/
├── domain/
│   ├── geometry.ts
│   ├── notesReducer.ts
│   └── types.ts
├── infrastructure/
│   └── notesStorage.ts
├── features/
│   └── board/
│       ├── Board.tsx
│       ├── Board.css
│       ├── NoteCard.tsx
│       └── useBoardGestures.ts
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

The placeholder files reserve the agreed module boundaries without introducing domain behavior or interaction features.
