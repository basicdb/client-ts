# Unified Database API Specification

This document defines the unified API that works seamlessly with both local (sync) and remote (API) databases.

## Core Principles

1. **Zero Code Changes**: Switch between local and remote databases without changing application code
2. **Backward Compatibility**: Existing APIs continue to work as aliases
3. **Type Safety**: Full TypeScript support with schema validation
4. **Consistency**: Same methods behave identically across both database types

## Database Access

### Primary Method
```typescript
db.table(tableName: string)
```

### Deprecated (Backward Compatibility)
```typescript
db.collection(tableName: string)  // Deprecated - use table()
db.from(tableName: string)        // Deprecated - use table()
```

## Write Operations

### Create (POST)
```typescript
// Primary
table.create(data: Partial<T>): Promise<T>

// Alias
table.add(data: Partial<T>): Promise<T>
```

### Update (PATCH)
```typescript
// Primary - no aliases needed
table.update(id: string, data: Partial<T>): Promise<T>
```

### Replace (PUT)
```typescript
// Primary
table.replace(id: string, data: Partial<T>): Promise<T>

// Alias
table.put(id: string, data: Partial<T>): Promise<T>
```

### Delete
```typescript
// Primary - no aliases needed
table.delete(id: string): Promise<T>
```

## Read Operations

### Single Item
```typescript
// Primary - no aliases needed
table.get(id: string): Promise<T>
```

### Multiple Items (Query Builder)
```typescript
// Primary - returns QueryBuilder
table.getAll(): QueryBuilder<T>
```

## Query Builder API

The `getAll()` method returns a QueryBuilder that supports method chaining:

### Filtering
```typescript
// Primary - no aliases needed
.filter(conditions: Record<string, FilterCondition>): QueryBuilder<T>
```

### Ordering
```typescript
// Primary
.orderBy(field: string, direction?: 'asc' | 'desc'): QueryBuilder<T>


```

### Pagination
```typescript
// Primary
.limit(count: number): QueryBuilder<T>
.offset(count: number): QueryBuilder<T>

```

### Execution
```typescript
// Auto-awaitable (primary usage)
const results = await table.getAll().filter({...}).limit(10);

// Explicit execution
.execute(): Promise<T[]>
.toArray(): Promise<T[]>  // Alias for execute
```

### Utility Methods
To be added later (no api support yet)
<!-- ```typescript
.count(): Promise<number>     // Count matching results
.first(): Promise<T | null>   // Get first result
.exists(): Promise<boolean>   // Check if any results exist
``` -->

## Filter Conditions

### Simple Equality
```typescript
.filter({ completed: true })
.filter({ status: 'active' })
```

### Operators
```typescript
.filter({
  priority: { gt: 5 },           // Greater than
  priority: { gte: 5 },          // Greater than or equal
  priority: { lt: 10 },          // Less than
  priority: { lte: 10 },         // Less than or equal
  title: { like: '%urgent%' },   // Pattern matching
  title: { ilike: '%URGENT%' },  // Case-insensitive pattern
  status: { in: ['active', 'pending'] }, // In array
  completed: { neq: true },      // Not equal
  deleted_at: { is: null }       // Is null/boolean
})
```

### Complex Conditions
```typescript
.filter({
  priority: { gte: 5, lte: 10 }, // Multiple operators on same field
  title: { not: { like: '%test%' } } // Negation
})
```

## Batch Operations
Not yet supported in the API.

## Utility Operations
Not yet supported in the API.

## Usage Examples

### Basic CRUD
```typescript
// Create
const todo = await db.table('todos').create({
  title: 'Learn API',
  completed: false
});

// Read
const item = await db.table('todos').get(todo.id);

// Update
await db.table('todos').update(todo.id, { completed: true });

// Delete
await db.table('todos').delete(todo.id);
```

### Querying
```typescript
// Simple query
const activeTodos = await db.table('todos')
  .getAll()
  .filter({ completed: false })
  .orderBy('created_at', 'desc')
  .limit(10);

// Complex query
const urgentTodos = await db.table('todos')
  .getAll()
  .filter({
    completed: false,
    priority: { gte: 8 },
    status: { in: ['active', 'pending'] },
    title: { ilike: '%urgent%' }
  })
  .orderBy('priority', 'desc')
  .limit(5);

// Get all results
const allActive = await db.table('todos').getAll().filter({ completed: false });
```

### Batch Operations
Not yet supported in the API.

## Database Configuration

### Remote Database
```typescript
const db = await createDatabase({
  mode: 'remote',
  schema: mySchema,
  project_id: 'abc123',
  getToken: () => getAuthToken(),
  baseUrl: 'https://api.basic.tech'
});
```

### Local Database with Sync
```typescript
const db = await createDatabase({
  mode: 'local',
  schema: mySchema,
  project_id: 'abc123',
  getToken: () => getAuthToken(),
  syncEnabled: true,
  databaseName: 'myapp'
});
```

### Environment-based Selection
```typescript
const db = await createDatabase({
  mode: process.env.NODE_ENV === 'development' ? 'local' : 'remote',
  schema: mySchema,
  project_id: 'abc123',
  getToken: () => getAuthToken()
});
```

## Missing/Additional Considerations

### Transaction Support
Should we include transaction support for batch operations?
```typescript
await db.transaction(async (tx) => {
  const user = await tx.table('users').create({ name: 'John' });
  await tx.table('profiles').create({ userId: user.id, bio: 'Hello' });
});
```

### Relationships/Joins
How should we handle relationships between tables?
```typescript
// Option 1: Manual joins
const todosWithUsers = await db.table('todos')
  .getAll()
  .filter({ completed: false });
const userIds = todosWithUsers.map(t => t.userId);
const users = await db.table('users').getAll().filter({ id: { in: userIds } });

// Option 2: Include/populate (future enhancement)
const todosWithUsers = await db.table('todos')
  .getAll()
  .include(['user'])
  .filter({ completed: false });
```

### Subscriptions/Real-time Updates
Should we include real-time subscription support?
```typescript
// Subscribe to changes
const unsubscribe = db.table('todos')
  .getAll()
  .filter({ completed: false })
  .subscribe((todos) => {
    console.log('Todos updated:', todos);
  });
```

### Schema Migrations
How should schema migrations be handled?
```typescript
await db.migrate(); // Apply pending migrations
```

### Validation
Should validation be part of the API?
```typescript
table.create(data, { validate: true }); // Explicit validation
```
