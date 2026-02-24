export type ResolvedDid = {
  did: string
  handle?: string
  didDocument: Record<string, unknown>
  pdsUrl: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
}

/**
 * Convert a did:web DID to the HTTPS URL where its DID document lives.
 *
 * did:web:pds.basic.id:did:abc123 -> https://pds.basic.id/did/abc123/did.json
 * did:web:example.com             -> https://example.com/.well-known/did.json
 */
export function resolveDidWebUrl(did: string): string | null {
  if (!did.startsWith('did:web:')) return null

  const rest = did.slice(8) // strip 'did:web:'
  if (!rest) return null
  const parts = rest.split(':')

  // Decode the hostname (first part, may contain %3A for port)
  const hostname = parts[0]!.replace(/%3A/gi, ':')

  if (parts.length === 1) {
    return `https://${hostname}/.well-known/did.json`
  }

  const pathParts = parts.slice(1).map(p => decodeURIComponent(p))
  return `https://${hostname}/${pathParts.join('/')}/did.json`
}

/**
 * Given a DID document, extract PDS URL and discover OAuth endpoints.
 */
async function resolveFromDocument(did: string, didDocument: Record<string, unknown>): Promise<ResolvedDid> {
  const services = didDocument.service as Array<{ id: string; type: string; serviceEndpoint: string }> | undefined
  const pdsService = services?.find(
    (s) => s.id === '#basic_pds' || s.id === `${did}#basic_pds`
  )
  if (!pdsService) {
    throw new Error(`DID document has no #basic_pds service entry`)
  }
  const pdsUrl = pdsService.serviceEndpoint.replace(/\/+$/, '')

  const oauthRes = await fetch(`${pdsUrl}/auth/.well-known/openid-configuration`)
  if (!oauthRes.ok) {
    throw new Error(`Failed to fetch OpenID configuration from ${pdsUrl}: ${oauthRes.status}`)
  }
  const oauth = await oauthRes.json()

  return {
    did,
    didDocument,
    pdsUrl,
    authorization_endpoint: oauth.authorization_endpoint,
    token_endpoint: oauth.token_endpoint,
    userinfo_endpoint: oauth.userinfo_endpoint,
  }
}

/**
 * Fetch a DID document by DID, extract the PDS URL, and discover OAuth endpoints.
 */
export async function resolveDid(did: string): Promise<ResolvedDid> {
  const url = resolveDidWebUrl(did)
  if (!url) {
    throw new Error(`Unsupported DID method: ${did}`)
  }

  const didRes = await fetch(url)
  if (!didRes.ok) {
    throw new Error(`Failed to fetch DID document at ${url}: ${didRes.status}`)
  }
  const didDocument = await didRes.json()

  return resolveFromDocument(did, didDocument)
}

/**
 * Resolve a handle (e.g. "alice.basic.id") to a DID and discover PDS + OAuth endpoints.
 *
 * Fetches https://{handle}/.well-known/did.json per the did:web spec.
 */
export async function resolveHandle(handle: string): Promise<ResolvedDid> {
  const res = await fetch(`https://${handle}/.well-known/did.json`)
  if (!res.ok) {
    throw new Error(`Handle resolution failed for ${handle}: ${res.status}`)
  }
  const didDocument = await res.json()
  const did = didDocument.id as string
  if (!did) {
    throw new Error(`Handle response has no 'id' field`)
  }

  const resolved = await resolveFromDocument(did, didDocument)
  resolved.handle = handle
  return resolved
}
