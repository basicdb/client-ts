# @basictech/nextjs

Next.js SDK for [Basic](https://basic.tech) - add authentication and real-time database to your Next.js app.

## Installation

```bash
npm install @basictech/nextjs
```

> **Note:** `@basictech/react` is included as a dependency - no need to install separately.

---

## Quick Start

### 1. Create a Schema

Create a `basic.config.ts` file:

```typescript
export const schema = {
  project_id: "YOUR_PROJECT_ID",
  version: 1,
  tables: {
    todos: {
      type: "collection",
      fields: {
        title: { type: "string", indexed: true },
        completed: { type: "boolean", indexed: true }
      }
    }
  }
}
```

### 2. Create a Client Provider

Create `app/providers.tsx`:

```tsx
'use client'

import { BasicProvider } from '@basictech/react'
import { schema } from '../basic.config'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BasicProvider schema={schema}>
      {children}
    </BasicProvider>
  )
}
```

### 3. Add to Layout

Update `app/layout.tsx`:

```tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 4. Use in Client Components

```tsx
'use client'

import { useBasic, useQuery } from '@basictech/react'

export function TodoList() {
  const { db, isSignedIn, signIn, signOut } = useBasic()
  const todos = useQuery(() => db.collection('todos').getAll())

  if (!isSignedIn) {
    return <button onClick={signIn}>Sign In</button>
  }

  return (
    <ul>
      {todos?.map(todo => <li key={todo.id}>{todo.title}</li>)}
    </ul>
  )
}
```

---

## Important: Import Pattern

Due to Next.js SSR, **client components must import from `@basictech/react`**:

```tsx
// ✅ Correct - in client components
'use client'
import { useBasic, BasicProvider } from '@basictech/react'

// ✅ Correct - in middleware/server
import { createBasicMiddleware } from '@basictech/nextjs'

// ❌ Wrong - will cause SSR errors
import { useBasic } from '@basictech/nextjs'
```

| Import From | Use In |
|-------------|--------|
| `@basictech/react` | Client components (`'use client'`) |
| `@basictech/nextjs` | Middleware, server utilities |

---

## API Reference

### `<BasicProvider>`

Root provider component. Must wrap your entire app in a client component.

```tsx
<BasicProvider
  schema={schema}           // Required: Your Basic schema
  debug={false}             // Optional: Enable console logging
  dbMode="sync"             // Optional: "sync" (default) or "remote"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | `object` | required | Schema with `project_id` and `tables` |
| `debug` | `boolean` | `false` | Enable debug logging |
| `dbMode` | `"sync" \| "remote"` | `"sync"` | Database mode |

---

### `useBasic()`

Main hook for accessing auth and database. **Must be used in client components.**

```tsx
'use client'

import { useBasic } from '@basictech/react'

function MyComponent() {
  const {
    // Auth state
    isReady,        // boolean - SDK initialized
    isSignedIn,     // boolean - User authenticated
    user,           // { id, email, ... } | null
    
    // Auth methods
    signIn,         // () => void - Redirect to login
    signOut,        // () => void - Clear session
    signInWithCode, // (code, state?) => Promise - Manual OAuth
    getSignInUrl,   // (redirectUri?) => string - Get OAuth URL
    getToken,       // () => Promise<string> - Get access token
    
    // Database
    db,             // Database instance
    dbStatus,       // "OFFLINE" | "CONNECTING" | "ONLINE" | "SYNCING"
    dbMode,         // "sync" | "remote"
  } = useBasic()
  
  // ... use these values
}
```

#### Auth State

| Property | Type | Description |
|----------|------|-------------|
| `isReady` | `boolean` | `true` when SDK is fully initialized |
| `isSignedIn` | `boolean` | `true` when user is authenticated |
| `user` | `object \| null` | User object with `id`, `email`, etc. |

#### Auth Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `signIn()` | none | `void` | Redirects to Basic login page |
| `signOut()` | none | `void` | Clears session and signs out |
| `signInWithCode()` | `code: string, state?: string` | `Promise<{success, error?}>` | Exchange OAuth code for session |
| `getSignInUrl()` | `redirectUri?: string` | `string` | Get OAuth URL for custom flows |
| `getToken()` | none | `Promise<string>` | Get current access token |

#### Database

| Property | Type | Description |
|----------|------|-------------|
| `db` | `object` | Database instance for CRUD operations |
| `dbStatus` | `string` | Connection status |
| `dbMode` | `"sync" \| "remote"` | Current database mode |

---

### `useQuery()`

Live query hook - automatically re-renders when data changes. **Only works in sync mode.**

```tsx
'use client'

import { useBasic, useQuery } from '@basictech/react'

function TodoList() {
  const { db } = useBasic()
  
  // Get all items - auto-updates when data changes
  const todos = useQuery(() => db.collection('todos').getAll())
  
  // With type safety
  interface Todo { id: string; title: string; completed: boolean }
  const typedTodos = useQuery(() => db.collection<Todo>('todos').getAll())
  
  return (
    <ul>
      {todos?.map(todo => <li key={todo.id}>{todo.title}</li>)}
    </ul>
  )
}
```

> **Note:** In `remote` mode, `useQuery` won't auto-update. Fetch data manually instead.

---

### Database Methods

#### `db.collection(name)`

Access a collection by name.

```tsx
const { db } = useBasic()
const todosCollection = db.collection('todos')

// With TypeScript generics
interface Todo { id: string; title: string; completed: boolean }
const typedCollection = db.collection<Todo>('todos')
```

#### Collection Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getAll()` | `Promise<T[]>` | Get all records |
| `get(id)` | `Promise<T \| null>` | Get one record by ID |
| `add(data)` | `Promise<T>` | Create new record (returns with generated ID) |
| `put(data)` | `Promise<T>` | Upsert record (requires ID in data) |
| `update(id, data)` | `Promise<T \| null>` | Partial update by ID |
| `delete(id)` | `Promise<boolean>` | Delete record by ID |
| `filter(fn)` | `Promise<T[]>` | Filter with predicate function |

#### Examples

```tsx
'use client'

import { useBasic } from '@basictech/react'

function TodoActions() {
  const { db } = useBasic()

  // CREATE - add new record
  const addTodo = async () => {
    const todo = await db.collection('todos').add({
      title: 'Buy milk',
      completed: false
    })
    console.log('Created:', todo.id) // Auto-generated ID
  }

  // READ - get all records
  const getAllTodos = async () => {
    const todos = await db.collection('todos').getAll()
    console.log('All todos:', todos)
  }

  // READ - get single record
  const getTodo = async (id: string) => {
    const todo = await db.collection('todos').get(id)
    if (todo) {
      console.log('Found:', todo)
    } else {
      console.log('Not found')
    }
  }

  // UPDATE - partial update
  const completeTodo = async (id: string) => {
    const updated = await db.collection('todos').update(id, { 
      completed: true 
    })
    console.log('Updated:', updated)
  }

  // DELETE - remove record
  const deleteTodo = async (id: string) => {
    const deleted = await db.collection('todos').delete(id)
    console.log('Deleted:', deleted) // true or false
  }

  // FILTER - query with predicate
  const getIncompleteTodos = async () => {
    const incomplete = await db.collection('todos').filter(
      todo => !todo.completed
    )
    console.log('Incomplete:', incomplete)
  }

  return (
    <div>
      <button onClick={addTodo}>Add Todo</button>
      <button onClick={getAllTodos}>Get All</button>
      {/* ... */}
    </div>
  )
}
```

---

## Middleware (Optional)

Protect routes with authentication middleware.

### Setup

Create `middleware.ts` in your project root:

```typescript
import { createBasicMiddleware } from '@basictech/nextjs'

export const middleware = createBasicMiddleware({
  publicRoutes: ['/', '/about', '/login'],
  loginRoute: '/login',
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Configuration Options

```typescript
createBasicMiddleware({
  // Routes that don't require auth
  publicRoutes: ['/'],
  
  // Where to redirect unauthenticated users
  loginRoute: '/login',
  
  // Custom auth check (optional)
  isAuthenticated: (request) => {
    return !!request.cookies.get('basic_refresh_token')
  }
})
```

### Utility Functions

```typescript
import { 
  getAuthFromRequest,
  getReturnUrl,
  withBasicAuth 
} from '@basictech/nextjs'

// Get auth state from request
const auth = getAuthFromRequest(request)
if (auth.isAuthenticated) {
  console.log('User is logged in')
}

// Get URL to return to after login
const returnUrl = getReturnUrl(request)
```

---

## Database Modes

### Sync Mode (Default)

Local-first with IndexedDB + real-time sync:

```tsx
<BasicProvider schema={schema} dbMode="sync">
```

- ✅ Works offline
- ✅ Real-time updates via WebSocket
- ✅ `useQuery` auto-refreshes
- ✅ Fast reads from local DB

### Remote Mode

Direct API calls (no local storage):

```tsx
<BasicProvider schema={schema} dbMode="remote">
```

- ✅ No IndexedDB dependencies
- ✅ Better for SSR-heavy apps
- ❌ Requires authentication for all operations
- ❌ No offline support
- ❌ `useQuery` won't auto-update

---

## Error Handling

### NotAuthenticatedError

Thrown when attempting write operations without being signed in (remote mode):

```tsx
import { NotAuthenticatedError } from '@basictech/react'

const addTodo = async () => {
  try {
    await db.collection('todos').add({ title: 'Test' })
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      // User needs to sign in
      signIn()
    }
  }
}
```

### Graceful Degradation

In remote mode, read operations gracefully handle unauthenticated state:

| Operation | Behavior When Not Signed In |
|-----------|----------------------------|
| `getAll()` | Returns `[]` |
| `get(id)` | Returns `null` |
| `filter()` | Returns `[]` |
| `add()` | Throws `NotAuthenticatedError` |
| `update()` | Throws `NotAuthenticatedError` |
| `delete()` | Throws `NotAuthenticatedError` |

---

## TypeScript

Full TypeScript support with generics:

```tsx
interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: number
}

// Type-safe collection
const todos = db.collection<Todo>('todos')

// All methods are typed
const todo = await todos.add({
  title: 'Test',
  completed: false,
  createdAt: Date.now()
})
// todo is typed as Todo

// Type-safe queries
const incomplete = await todos.filter(t => !t.completed)
// incomplete is typed as Todo[]
```

---

## Full Example

### File Structure

```
app/
├── layout.tsx        # Root layout with Providers
├── providers.tsx     # Client-side BasicProvider
├── page.tsx          # Home page (server component)
├── dashboard/
│   └── page.tsx      # Protected page
└── components/
    └── TodoList.tsx  # Client component
middleware.ts         # Route protection
basic.config.ts       # Schema
```

### `basic.config.ts`

```typescript
export const schema = {
  project_id: "YOUR_PROJECT_ID",
  version: 1,
  tables: {
    todos: {
      type: "collection",
      fields: {
        title: { type: "string", indexed: true },
        completed: { type: "boolean", indexed: true }
      }
    }
  }
}
```

### `app/providers.tsx`

```tsx
'use client'

import { BasicProvider } from '@basictech/react'
import { schema } from '../basic.config'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BasicProvider schema={schema} debug>
      {children}
    </BasicProvider>
  )
}
```

### `app/layout.tsx`

```tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### `app/components/TodoList.tsx`

```tsx
'use client'

import { useBasic, useQuery } from '@basictech/react'

interface Todo {
  id: string
  title: string
  completed: boolean
}

export function TodoList() {
  const { db, isSignedIn, signIn } = useBasic()
  const todos = useQuery(() => db.collection<Todo>('todos').getAll())

  const addTodo = async () => {
    await db.collection<Todo>('todos').add({
      title: 'New todo',
      completed: false
    })
  }

  const toggleTodo = async (id: string, completed: boolean) => {
    await db.collection('todos').update(id, { completed: !completed })
  }

  const deleteTodo = async (id: string) => {
    await db.collection('todos').delete(id)
  }

  if (!isSignedIn) {
    return <button onClick={signIn}>Sign In to view todos</button>
  }

  return (
    <div>
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {todos?.map(todo => (
          <li key={todo.id}>
            <span 
              style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
              onClick={() => toggleTodo(todo.id, todo.completed)}
            >
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### `middleware.ts`

```typescript
import { createBasicMiddleware } from '@basictech/nextjs'

export const middleware = createBasicMiddleware({
  publicRoutes: ['/', '/login'],
  loginRoute: '/login',
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Troubleshooting

### "self is not defined" Error

This happens when importing client code on the server. Make sure:

1. Client components have `'use client'` directive at the top
2. Import from `@basictech/react`, not `@basictech/nextjs`
3. `BasicProvider` is wrapped in a client component

### Hydration Mismatch

Wrap provider initialization in a `mounted` check:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { BasicProvider } from '@basictech/react'

export function Providers({ children }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => setMounted(true), [])
  
  if (!mounted) return null
  
  return <BasicProvider schema={schema}>{children}</BasicProvider>
}
```

### Remote Mode Returns Empty Data

In remote mode, you must be signed in to fetch data. Check:

1. `isSignedIn` is `true` before fetching
2. User has access to the project
3. Network requests aren't being blocked

---

## License

ISC
