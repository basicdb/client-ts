import { BasicDB, Collection, RemoteDBConfig } from './types'
import { RemoteCollection } from './RemoteCollection'

/**
 * RemoteDB - REST API based implementation of BasicDB
 * Creates RemoteCollection instances for each table
 */
export class RemoteDB implements BasicDB {
  private config: RemoteDBConfig
  private collections: Map<string, RemoteCollection<any>> = new Map()

  constructor(config: RemoteDBConfig) {
    this.config = config
  }

  /**
   * Get a collection by name
   * Collections are cached for reuse
   */
  collection<T extends { id: string } = Record<string, any> & { id: string }>(
    name: string
  ): Collection<T> {
    // Return cached collection if exists
    if (this.collections.has(name)) {
      return this.collections.get(name) as RemoteCollection<T>
    }

    // Validate table exists in schema if schema is provided
    if (this.config.schema?.tables && !this.config.schema.tables[name]) {
      throw new Error(`Table "${name}" not found in schema`)
    }

    // Create and cache new collection
    const collection = new RemoteCollection<T>(name, this.config)
    this.collections.set(name, collection)

    return collection
  }
}

