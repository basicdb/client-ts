# @basictech/react

React SDK for [Basic](https://basic.tech) - add authentication and real-time database to your React app in minutes.

## Installation

```bash
npm install @basictech/react
```

## Quick Start

### 1. Create a Schema

Create a `basic.config.ts` file with your project configuration:

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

### 2. Add the Provider

Wrap your app with `BasicProvider`:

```tsx
import { BasicProvider } from '@basictech/react'
import { schema } from './basic.config'

function App() {
  return (
    <BasicProvider schema={schema}>
      <YourApp />
    </BasicProvider>
  )
}
```

### 3. Use the Hook

Access auth and database in any component:

```tsx
import { useBasic, useQuery } from '@basictech/react'

function TodoList() {
  const { db, isSignedIn, signIn, signOut, user } = useBasic()
  
  // Live query - automatically updates when data changes
  const todos = useQuery(() => db.collection('todos').getAll())

  const addTodo = async () => {
    await db.collection('todos').add({
      title: 'New todo',
      completed: false
    })
  }

  if (!isSignedIn) {
    return <button onClick={signIn}>Sign In</button>
  }

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <button onClick={addTodo}>Add Todo</button>
      <ul>
        {todos?.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

---

## API Reference

### `<BasicProvider>`

Root provider component. Must wrap your entire app.

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

#### Database Modes

- **`sync`** - Local-first with IndexedDB + real-time sync via WebSocket
- **`remote`** - Direct REST API calls (no local storage)

---

### `useBasic()`

Main hook for accessing auth and database.

```tsx
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
  dbStatus,       // DBStatus - see below
  dbMode,         // "sync" | "remote"
} = useBasic()
```

#### `DBStatus` (sync connection state)

When `dbMode === "sync"`, `dbStatus` is one of:

| Value | Description |
|-------|-------------|
| `LOADING` | SDK initializing |
| `OFFLINE` | Not connected |
| `CONNECTING` | Connecting to sync server |
| `ONLINE` | Connected and idle |
| `SYNCING` | Syncing data |
| `ERROR` | Sync error |
| `ERROR_WILL_RETRY` | Sync error but client will retry (e.g. expired token). Use this to show "Reconnecting…" or trigger token refresh. |

Import the enum for comparisons: `import { useBasic, DBStatus } from '@basictech/react'`.

---

### `useQuery()`

Live query hook - automatically re-renders when data changes.

```tsx
import { useQuery } from '@basictech/react'

// Get all items
const todos = useQuery(() => db.collection('todos').getAll())

// With type safety
interface Todo {
  id: string
  title: string
  completed: boolean
}
const todos = useQuery(() => db.collection<Todo>('todos').getAll())
```

> **Note:** Only works in `sync` mode. In `remote` mode, use manual fetching.

---

### Database Methods

#### `db.collection(name)`

Access a collection by name.

```tsx
const { db } = useBasic()
const todos = db.collection('todos')
```

#### Collection Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getAll()` | `Promise<T[]>` | Get all records |
| `get(id)` | `Promise<T \| null>` | Get one record by ID |
| `add(data)` | `Promise<T>` | Create new record (returns with ID) |
| `put(data)` | `Promise<T>` | Upsert record (requires ID) |
| `update(id, data)` | `Promise<T \| null>` | Partial update |
| `delete(id)` | `Promise<boolean>` | Delete record |
| `filter(fn)` | `Promise<T[]>` | Filter with predicate |

#### Examples

```tsx
// Create
const todo = await db.collection('todos').add({
  title: 'Buy milk',
  completed: false
})
console.log(todo.id) // Auto-generated ID

// Read
const allTodos = await db.collection('todos').getAll()
const oneTodo = await db.collection('todos').get('some-id')

// Update
await db.collection('todos').update('some-id', { completed: true })

// Delete
await db.collection('todos').delete('some-id')

// Filter
const incomplete = await db.collection('todos').filter(t => !t.completed)
```

---

## Advanced Usage

### Manual OAuth Flow

For custom OAuth handling (mobile apps, popups, etc.):

```tsx
const { signInWithCode, getSignInUrl } = useBasic()

// Get OAuth URL with custom redirect
const url = getSignInUrl('myapp://callback')

// Exchange code for session
const result = await signInWithCode(code, state)
if (result.success) {
  console.log('Signed in!')
}
```

### Remote Mode

For server-rendered apps or when you don't need offline support:

```tsx
<BasicProvider schema={schema} dbMode="remote">
  <App />
</BasicProvider>
```

In remote mode:
- Data is fetched via REST API
- No IndexedDB storage
- `useQuery` won't auto-update (use manual refresh)
- Requires authentication for all operations

### Error Handling

```tsx
import { NotAuthenticatedError } from '@basictech/react'

try {
  await db.collection('todos').add({ title: 'Test' })
} catch (error) {
  if (error instanceof NotAuthenticatedError) {
    // User needs to sign in
    signIn()
  }
}
```

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
```

---

## License

ISC
