"use client"

import { v7 as uuidv7 } from 'uuid';
import { Dexie } from 'dexie';

import { log } from '../config'
import { validateData } from '@basictech/schema'

// Track initialization state
let dexieExtensionsLoaded = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Dexie extensions (syncable and observable)
 * This must be called before creating a BasicSync instance
 * Safe to call multiple times - will only load once
 */
export async function initDexieExtensions(): Promise<void> {
  // Return early if already loaded or not in browser
  if (dexieExtensionsLoaded) return;
  if (typeof window === 'undefined') return;
  
  // If already initializing, wait for that promise
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      // Dynamic imports - only loaded in browser
      await import('dexie-syncable');
      await import('dexie-observable');
      
      // Import and register sync protocol
      const { syncProtocol } = await import('./syncProtocol');
      syncProtocol();
      
      dexieExtensionsLoaded = true;
      log('Dexie extensions loaded successfully');
    } catch (error) {
      console.error('Failed to load Dexie extensions:', error);
      throw error;
    }
  })();
  
  return initPromise;
}

/**
 * Check if Dexie extensions are loaded
 */
export function isDexieReady(): boolean {
  return dexieExtensionsLoaded;
}


export class BasicSync extends Dexie {
  basic_schema: any

  constructor(name: string, options: any) {
    super(name, options);

    // --- INIT SCHEMA --- //
    this.basic_schema = options.schema
    this.version(1).stores(this._convertSchemaToDxSchema(this.basic_schema))
    this.version(2).stores({})

    // @ts-ignore - alias for toArray
    this.Collection.prototype.get = this.Collection.prototype.toArray
  }

  async connect({ access_token, ws_url }: { access_token: string, ws_url?: string }) {
    const WS_URL = ws_url || 'wss://pds.basic.id/ws'

    log('Connecting to', WS_URL)

    await this.updateSyncNodes();
    
    log('Starting connection...')
    return this.syncable.connect("websocket", WS_URL, { authToken: access_token, schema: this.basic_schema });
  }

  async disconnect({ ws_url }: { ws_url?: string } = {}) {
    const WS_URL = ws_url || 'wss://pds.basic.id/ws'

    return this.syncable.disconnect(WS_URL) 
  }

  private async updateSyncNodes() {
    try {
      const syncNodes = await this.table('_syncNodes').toArray();
      const localSyncNodes = syncNodes.filter(node => node.type === 'local');
      log('Local sync nodes:', localSyncNodes);

      if (localSyncNodes.length > 1) {

        
        const largestNodeId = Math.max(...localSyncNodes.map(node => node.id));
        // Check if the largest node is already the master
        const largestNode = localSyncNodes.find(node => node.id === largestNodeId);
        if (largestNode && largestNode.isMaster === 1) {
          log('Largest node is already the master. No changes needed.');
          return; // Exit the function early as no changes are needed
        }


        log('Largest node id:', largestNodeId);
        log('HEISENBUG: More than one local sync node found.')

        for (const node of localSyncNodes) {
          log(`Local sync node keys:`, node.id, node.isMaster);
          await this.table('_syncNodes').update(node.id, { isMaster: node.id === largestNodeId ? 1 : 0 });

          log(`HEISENBUG: Setting ${node.id} to ${node.id === largestNodeId ? 'master' : '0'}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }

      log('Sync nodes updated');
    } catch (error) {
      console.error('Error updating _syncNodes table:', error);
    }
  }

  handleStatusChange(fn: any) {
    this.syncable.on("statusChanged", fn)
  }


  _convertSchemaToDxSchema(schema: any) {
    const stores = Object.entries(schema.tables).map(([key, table]: any) => {
      const indexedFields = Object.entries(table.fields)
        .filter(([, field]: any) => field.indexed)
        .map(([fieldKey]: any) => `,${fieldKey}`)
        .join('')
      return {
        [key]: 'id' + indexedFields
      }
    })

    return Object.assign({}, ...stores)
  }

  debugeroo() {
    return this.syncable
  }

  collection<T extends { id: string } = Record<string, any> & { id: string }>(name: string) {
    // Validate table exists in schema
    if (this.basic_schema?.tables && !this.basic_schema.tables[name]) {
      throw new Error(`Table "${name}" not found in schema`)
    }

    const table = this.table(name)

    return {
      /**
       * Returns the underlying Dexie table
       * @type {Dexie.Table}
       */
      ref: table,

      // --- WRITE ---- // 

      /**
       * Add a new record - returns the full object with generated id
       */
      add: async (data: Omit<T, 'id'>): Promise<T> => {
        const valid = validateData(this.basic_schema, name, data)
        if (!valid.valid) {
          log('Invalid data', valid)
          throw new Error(valid.message || 'Data validation failed')
        }

        const id = uuidv7()
        const fullData = { id, ...data } as T
        
        await table.add(fullData)
        return fullData
      },

      /**
       * Put (upsert) a record - returns the full object
       */
      put: async (data: T): Promise<T> => {
        if (!data.id) {
          throw new Error('put() requires an id field')
        }

        const valid = validateData(this.basic_schema, name, data)
        if (!valid.valid) {
          log('Invalid data', valid)
          throw new Error(valid.message || 'Data validation failed')
        }

        await table.put(data)
        return data
      },

      /**
       * Update an existing record - returns updated object or null
       */
      update: async (id: string, data: Partial<Omit<T, 'id'>>): Promise<T | null> => {
        if (!id) {
          throw new Error('update() requires an id')
        }

        const valid = validateData(this.basic_schema, name, data, false)
        if (!valid.valid) {
          log('Invalid data', valid)
          throw new Error(valid.message || 'Data validation failed')
        }

        const updated = await table.update(id, data)
        if (updated === 0) {
          return null
        }

        // Fetch and return the updated record
        const record = await table.get(id)
        return (record as T) || null
      },

      /**
       * Delete a record - returns true if deleted, false if not found
       */
      delete: async (id: string): Promise<boolean> => {
        if (!id) {
          throw new Error('delete() requires an id')
        }

        // Check if record exists first
        const exists = await table.get(id)
        if (!exists) {
          return false
        }

        await table.delete(id)
        return true
      },

      // --- READ ---- // 

      /**
       * Get a single record by id - returns null if not found
       */
      get: async (id: string): Promise<T | null> => {
        if (!id) {
          throw new Error('get() requires an id')
        }

        const record = await table.get(id)
        return (record as T) || null
      },

      /**
       * Get all records in the collection
       */
      getAll: async (): Promise<T[]> => {
        return table.toArray() as Promise<T[]>
      },

      // --- QUERY ---- // 

      /**
       * Filter records using a predicate function
       */
      filter: async (fn: (item: T) => boolean): Promise<T[]> => {
        return table.filter(fn).toArray() as Promise<T[]>
      },

      /**
       * Get the raw Dexie table for advanced queries
       * @deprecated Use ref instead
       */
      query: () => table,
    }
  }
}
