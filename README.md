# Basic TypeScript SDK Monorepo

Monorepo for [Basic](https://basic.tech) client SDKs and demo apps.

## Publishable Packages

| Package | Description | Install |
|---------|-------------|---------|
| [@basictech/react](./packages/react/readme.md) | React SDK | `npm install @basictech/react` |
| [@basictech/nextjs](./packages/nextjs/readme.md) | Next.js middleware + integration utilities | `npm install @basictech/nextjs` |
| [@basictech/schema](./packages/schema/README.md) | Schema validation and diff utilities | `npm install @basictech/schema` |

## Internal Packages

- `packages/sync`: deprecated internal sync implementation kept for compatibility/testing.
- `packages/ui`: internal component workspace retained for upcoming updates.

## Demo Apps

- `apps/react-vite`: React demo for `@basictech/react`.
- `apps/nextjs`: Next.js demo for `@basictech/nextjs` and `@basictech/react`.
- `apps/debugger`: schema/debug tooling app.

## Setup

```bash
npm install
```

## Common Commands

```bash
npm run dev
npm run build
npm run lint
```

## Notes

- Next.js client components should import hooks/components from `@basictech/react`.
- `@basictech/nextjs` focuses on middleware/server integration.
- Modernization follow-ups are tracked in `docs/modernization-roadmap.md`.
