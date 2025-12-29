/**
 * Core DB types for Basic SDK
 * These interfaces are implemented by both SyncDB (Dexie-based) and RemoteDB (REST-based)
 */

/**
 * Collection interface for CRUD operations on a table
 * All write operations return the full object (not just the id)
 */
export interface Collection<T extends { id: string } = Record<string, any> & { id: string }> {
  /**
   * Add a new record to the collection
   * @param data - The data to add (without id, which will be generated)
   * @returns The created object with its generated id
   */
  add(data: Omit<T, 'id'>): Promise<T>

  /**
   * Put (upsert) a record - requires id
   * @param data - The full object including id
   * @returns The upserted object
   */
  put(data: T): Promise<T>

  /**
   * Update an existing record by id
   * @param id - The record id to update
   * @param data - Partial data to merge
   * @returns The updated object, or null if not found
   */
  update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T | null>

  /**
   * Delete a record by id
   * @param id - The record id to delete
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>

  /**
   * Get a single record by id
   * @param id - The record id to fetch
   * @returns The object or null if not found
   */
  get(id: string): Promise<T | null>

  /**
   * Get all records in the collection
   * @returns Array of all objects
   */
  getAll(): Promise<T[]>

  /**
   * Filter records using a predicate function
   * @param fn - Filter function that returns true for matches
   * @returns Array of matching objects
   */
  filter(fn: (item: T) => boolean): Promise<T[]>

  /**
   * Direct access to underlying storage (optional)
   * For sync mode: Dexie table reference
   * For remote mode: undefined
   */
  ref?: any
}

/**
 * BasicDB interface - factory for creating collections
 */
export interface BasicDB {
  /**
   * Get a collection by name
   * @param name - The table/collection name (must match schema)
   * @returns A Collection instance for CRUD operations
   */
  collection<T extends { id: string } = Record<string, any> & { id: string }>(name: string): Collection<T>
}

/**
 * Database mode - determines which implementation is used
 * - 'sync': Uses Dexie + WebSocket for local-first sync (default)
 * - 'remote': Uses REST API calls directly to server
 */
export type DBMode = 'sync' | 'remote'

/**
 * Auth error information passed to onAuthError callback
 */
export interface AuthError {
  status: number
  message: string
  response?: any
}

/**
 * Custom error class for Remote DB API errors
 * Includes HTTP status code for reliable error handling
 */
export class RemoteDBError extends Error {
  status: number
  response?: any

  constructor(message: string, status: number, response?: any) {
    super(message)
    this.name = 'RemoteDBError'
    this.status = status
    this.response = response
  }
}

/**
 * Configuration for RemoteDB
 */
export interface RemoteDBConfig {
  serverUrl: string
  projectId: string
  getToken: () => Promise<string>
  schema?: any
  /** Enable debug logging (default: false) */
  debug?: boolean
  /**
   * Optional callback when authentication fails (401 error after retry)
   * Use this to show login UI or redirect to sign-in
   */
  onAuthError?: (error: AuthError) => void
}

