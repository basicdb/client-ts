# Basic TypeScript Client SDKs

Monorepo for [Basic](https://basic.tech) TypeScript client packages.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [@basictech/react](./packages/react/README.md) | React SDK | `npm install @basictech/react` |
| [@basictech/nextjs](./packages/nextjs/readme.md) | Next.js SDK | `npm install @basictech/nextjs` |

### Beta Versions

```bash
npm install @basictech/react@beta
npm install @basictech/nextjs@beta
```

---

## Quick Start

### React (Vite, CRA, etc.)

```tsx
import { BasicProvider, useBasic, useQuery } from '@basictech/react'

const schema = {
  project_id: "YOUR_PROJECT_ID",
  tables: {
    todos: {
      type: "collection",
      fields: {
        title: { type: "string" },
        completed: { type: "boolean" }
      }
    }
  }
}

function App() {
  return (
    <BasicProvider schema={schema}>
      <TodoList />
    </BasicProvider>
  )
}

function TodoList() {
  const { db, signIn, isSignedIn } = useBasic()
  const todos = useQuery(() => db.collection('todos').getAll())
  
  if (!isSignedIn) return <button onClick={signIn}>Sign In</button>
  
  return <ul>{todos?.map(t => <li key={t.id}>{t.title}</li>)}</ul>
}
```

### Next.js

```tsx
// app/providers.tsx
'use client'
import { BasicProvider } from '@basictech/react'
import { schema } from '../basic.config'

export function Providers({ children }) {
  return <BasicProvider schema={schema}>{children}</BasicProvider>
}

// app/layout.tsx
import { Providers } from './providers'

export default function Layout({ children }) {
  return <html><body><Providers>{children}</Providers></body></html>
}
```

> **Note:** In Next.js, client components import from `@basictech/react`. The `@basictech/nextjs` package provides middleware utilities.

---

## Development

### Setup

```bash
npm install
npm run dev
```

### Project Structure

```
packages/
├── react/      # @basictech/react
├── nextjs/     # @basictech/nextjs
├── schema/     # @basictech/schema (validation)
└── sync/       # Sync protocol (internal)

apps/
├── react-vite/ # React example app
├── nextjs/     # Next.js example app
└── debugger/   # Debug dashboard
```

### Commands

```bash
npm run dev       # Start all packages in watch mode
npm run build     # Build all packages
npm run lint      # Lint all packages
```

---

## Documentation

- [React SDK Documentation](./packages/react/README.md)
- [Next.js SDK Documentation](./packages/nextjs/readme.md)
- [Changelog](./CHANGELOG.md)

---

## License

ISC
