---
"@basictech/react": patch
---

Fix PWA/mobile logout issues: harden auth for offline resilience, prevent spurious logouts on transient server errors, proactive token refresh on app resume, and fix potential deadlock in token refresh flow
