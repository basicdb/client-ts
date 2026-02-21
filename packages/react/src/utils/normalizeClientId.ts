const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Normalize a project_id / client_id to the canonical did:web format
 * before sending it to the PDS.
 *
 * - did:web:... -> passthrough (already canonical)
 * - bare UUID   -> did:web:api.basic.tech:projects:{hex}
 * - "self"      -> passthrough
 */
export function normalizeClientId(projectId: string): string {
  if (!projectId) return projectId
  if (projectId === 'self') return projectId
  if (projectId.startsWith('did:')) return projectId

  if (UUID_RE.test(projectId)) {
    const hex = projectId.replace(/-/g, '').toLowerCase()
    return `did:web:api.basic.tech:projects:${hex}`
  }

  return projectId
}
