# Next.js Demo App

Demo application for testing `@basictech/nextjs` and `@basictech/react` integration.

## Commands

```bash
npm run dev
npm run build
npm run lint
```

## Key Files

- `src/app/providers.tsx`: wires `BasicProvider`.
- `src/app/components.tsx`: SDK dashboard/test UI.
- `src/middleware.ts`: sample app-level middleware.
- `basic.config.ts`: local schema and project config.

## Notes

- Client-side hooks/components import from `@basictech/react`.
- `@basictech/nextjs` provides middleware/server helpers.
