import { Collection, RemoteDBConfig, RemoteDBError } from './types'
import { validateData } from '@basictech/schema'

/**
 * Error thrown when user is not authenticated
 */
export class NotAuthenticatedError extends Error {
  constructor(message: string = 'Not authenticated') {
    super(message)
    this.name = 'NotAuthenticatedError'
  }
}

/**
 * RemoteCollection - REST API based implementation of the Collection interface
 * All operations make HTTP calls to the Basic API server
 */
export class RemoteCollection<T extends { id: string } = Record<string, any> & { id: string }> implements Collection<T> {
  private tableName: string
  private config: RemoteDBConfig

  constructor(tableName: string, config: RemoteDBConfig) {
    this.tableName = tableName
    this.config = config
  }

  private log(...args: any[]) {
    if (this.config.debug) {
      console.log('[RemoteDB]', ...args)
    }
  }

  /**
   * Check if an error is a "not authenticated" error
   */
  private isNotAuthenticatedError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return message.includes('no token') || 
             message.includes('not authenticated') ||
             message.includes('please sign in')
    }
    return false
  }

  /**
   * Helper to make authenticated API requests
   * Automatically retries once on 401 (token expired) by refreshing the token
   */
  private async request<R>(
    method: string,
    path: string,
    body?: any,
    isRetry: boolean = false
  ): Promise<R> {
    // Try to get token - may throw if not authenticated
    const token = await this.config.getToken()
    const url = `${this.config.serverUrl}${path}`

    this.log(`${method} ${url}`, body ? JSON.stringify(body) : '')

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })

    const responseData = await response.json().catch(() => ({}))

    if (!response.ok) {
      // Handle 401 Unauthorized - force refresh then retry once
      if (response.status === 401 && !isRetry) {
        this.log('Got 401, forcing token refresh and retrying...')
        await this.config.getToken({ forceRefresh: true })
        return this.request<R>(method, path, body, true)
      }

      if (this.config.debug) {
        console.error(`[RemoteDB] Error ${response.status}:`, responseData)
      }
      
      // Call onAuthError callback if provided and this is an auth error
      if (response.status === 401 && this.config.onAuthError) {
        this.config.onAuthError({
          status: response.status,
          message: 'Authentication failed',
          response: responseData
        })
      }

      // Try different error message fields that APIs commonly use
      const errorMessage = responseData.message || responseData.error || responseData.detail || 
        (typeof responseData === 'string' ? responseData : `API request failed: ${response.status}`)
      throw new RemoteDBError(errorMessage, response.status, responseData)
    }

    this.log('Response:', responseData)
    return responseData
  }

  /**
   * Validate data against schema if available
   */
  private validateData(data: any, checkRequired: boolean = true): void {
    if (this.config.schema) {
      const result = validateData(this.config.schema, this.tableName, data, checkRequired)
      if (!result.valid) {
        throw new Error(result.message || 'Data validation failed')
      }
    }
  }

  /**
   * Get the base path for this collection
   */
  private get basePath(): string {
    return `/account/${this.config.projectId}/db/${this.tableName}`
  }

  /**
   * Add a new record to the collection
   * The server generates the ID
   * Requires authentication - throws NotAuthenticatedError if not signed in
   */
  async add(data: Omit<T, 'id'>): Promise<T> {
    this.validateData(data, true)

    try {
      const result = await this.request<{ data: T }>(
        'POST',
        this.basePath,
        { value: data }
      )
      // Server returns the created record with the generated ID
      return result.data
    } catch (error) {
      if (this.isNotAuthenticatedError(error)) {
        throw new NotAuthenticatedError('Sign in required to add items')
      }
      throw error
    }
  }

  /**
   * Put (upsert) a record - requires id
   * Requires authentication - throws NotAuthenticatedError if not signed in
   */
  async put(data: T): Promise<T> {
    if (!data.id) {
      throw new Error('put() requires an id field')
    }

    // Extract id from data, send the rest in the body
    const { id, ...rest } = data
    this.validateData(rest, true)

    try {
      const result = await this.request<{ data: T }>(
        'PUT',
        `${this.basePath}/${id}`,
        { value: rest }
      )
      return result.data || data
    } catch (error) {
      if (this.isNotAuthenticatedError(error)) {
        throw new NotAuthenticatedError('Sign in required to update items')
      }
      throw error
    }
  }

  /**
   * Update an existing record by id
   * Requires authentication - throws NotAuthenticatedError if not signed in
   */
  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T | null> {
    if (!id) {
      throw new Error('update() requires an id')
    }

    this.validateData(data, false)

    try {
      const result = await this.request<{ data: T }>(
        'PATCH',
        `${this.basePath}/${id}`,
        { value: data }
      )

      return result.data || null
    } catch (error) {
      // If record not found, return null instead of throwing
      if (error instanceof RemoteDBError && error.status === 404) {
        return null
      }
      if (this.isNotAuthenticatedError(error)) {
        throw new NotAuthenticatedError('Sign in required to update items')
      }
      throw error
    }
  }

  /**
   * Delete a record by id
   * Requires authentication - throws NotAuthenticatedError if not signed in
   */
  async delete(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('delete() requires an id')
    }

    try {
      await this.request<any>(
        'DELETE',
        `${this.basePath}/${id}`
      )
      return true
    } catch (error) {
      // If record not found, return false instead of throwing
      if (error instanceof RemoteDBError && error.status === 404) {
        return false
      }
      if (this.isNotAuthenticatedError(error)) {
        throw new NotAuthenticatedError('Sign in required to delete items')
      }
      throw error
    }
  }

  /**
   * Get a single record by id
   * Returns null if not authenticated (graceful degradation for read operations)
   */
  async get(id: string): Promise<T | null> {
    if (!id) {
      throw new Error('get() requires an id')
    }

    try {
      // Use the API's id query parameter for efficient single-record fetch
      const result = await this.request<{ data: T[] }>(
        'GET',
        `${this.basePath}?id=${id}`
      )
      return result.data?.[0] || null
    } catch (error) {
      // For get(), return null on any error (not found, not authenticated, etc.)
      if (this.isNotAuthenticatedError(error)) {
        this.log('Not authenticated - returning null for get()')
      }
      return null
    }
  }

  /**
   * Get all records in the collection
   * Returns empty array if not authenticated (graceful degradation for read operations)
   */
  async getAll(): Promise<T[]> {
    try {
      const result = await this.request<{ data: T[] }>(
        'GET',
        this.basePath
      )
      return result.data || []
    } catch (error) {
      // If not authenticated, return empty array gracefully
      if (this.isNotAuthenticatedError(error)) {
        this.log('Not authenticated - returning empty array for getAll()')
        return []
      }
      throw error
    }
  }

  /**
   * Filter records using a predicate function
   * Note: This fetches all records and filters client-side
   * Returns empty array if not authenticated (graceful degradation for read operations)
   */
  async filter(fn: (item: T) => boolean): Promise<T[]> {
    const all = await this.getAll()
    return all.filter(fn)
  }

  /**
   * ref is not available for remote collections
   */
  ref = undefined
}
