# @repo/sync

> **DEPRECATED**: This package is deprecated and will be removed in a future version.

The sync functionality has been moved to `@basictech/react` package.

## Migration

Instead of importing from this package, use:

```typescript
// Old (deprecated)
import { BasicSync } from '@repo/sync'

// New
import { useBasic } from '@basictech/react'

// The db object from useBasic() provides the same sync functionality
const { db } = useBasic()
await db.collection('todos').add({ title: 'Buy milk' })
```

## Why deprecated?

- The sync code in `@basictech/react` is more up-to-date
- It includes data validation against schema
- It supports configurable WebSocket URLs
- It's properly integrated with the auth flow

