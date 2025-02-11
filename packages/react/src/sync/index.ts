"use client"

import { v7 as uuidv7 } from 'uuid';
import { Dexie, PromiseExtended } from 'dexie';
import 'dexie-syncable';
import 'dexie-observable';

import { syncProtocol } from './syncProtocol'
import { SERVER_URL, log } from '../config'

import { validateSchema, validateData } from '../schema'
syncProtocol()


// const DexieSyncStatus = {
//   "-1": "ERROR",
//   "0": "OFFLINE",
//   "1": "CONNECTING",
//   "2": "ONLINE",
//   "3": "SYNCING",
//   "4": "ERROR_WILL_RETRY"
// }





export class BasicSync extends Dexie {
  basic_schema: any

  constructor(name: string, options: any) {
    super(name, options);

    // --- INIT SCHEMA --- // 

    //todo: handle versions?

    // TODO: validate schema
    this.basic_schema = options.schema
    this.version(1).stores(this._convertSchemaToDxSchema(this.basic_schema))

    this.version(2).stores({})
    // this.verssion


    // create an alias for toArray
    // @ts-ignore
    this.Collection.prototype.get = this.Collection.prototype.toArray


    // --- SYNC --- // 

    // this.syncable.on("statusChanged", (status, url) => { 
    //   console.log("statusChanged", status, url)
    // })

  }

  async connect({ access_token }: { access_token: string }) {
    const WS_URL = `${SERVER_URL}/ws`

    await this.updateSyncNodes();
    
    log('Starting connection...')
    return this.syncable.connect("websocket", WS_URL, { authToken: access_token, schema: this.basic_schema });
  }

  async disconnect() {
    const WS_URL = `${SERVER_URL}/ws`

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

        // add delay to ensure sync nodes are updated // i dont think this helps?
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

      const indexedFields = Object.entries(table.fields).filter(([key, field]: any) => field.indexed).map(([key, field]: any) => `,${key}`).join('')
      return {
        [key]: 'id' + indexedFields
      }
    })

    return Object.assign({}, ...stores)
  }

  debugeroo() {
    // console.log("debugeroo", this.syncable)

    // this.syncable.list().then(x => console.log(x))

    // this.syncable
    return this.syncable
  }

  collection(name: string) {
    // TODO: check against schema

    return {

      /**
       * Returns the underlying Dexie table
       * @type {Dexie.Table}
       */
      ref: this.table(name),

      // --- WRITE ---- // 
      add: (data: any) => {
        // log("Adding data to", name, data)

        const valid = validateData(this.basic_schema, name, data)
        if (!valid.valid) {
          log('Invalid data', valid)
          return Promise.reject({ ... valid })
        }

        return this.table(name).add({
          id: uuidv7(),
          ...data
        })

      },

      put: (data: any) => {
        const valid = validateData(this.basic_schema, name, data)
        if (!valid.valid) {
          log('Invalid data', valid)
          return Promise.reject({ ... valid })
        }

        return this.table(name).put({
          id: uuidv7(),
          ...data
        })
      },

      update: (id: string, data: any) => {
        const valid = validateData(this.basic_schema, name, data, false)
        if (!valid.valid) {
          log('Invalid data', valid)
          return Promise.reject({ ... valid })
        }

        return this.table(name).update(id, data)
      },

      delete: (id: string) => {
        return this.table(name).delete(id)
      },


      // --- READ ---- // 

      get: async (id: string) => {
        return this.table(name).get(id) 
      },

      getAll: async () => {
        return this.table(name).toArray();
      },

      // --- QUERY ---- // 
      // TODO: lots to do here. simplifing creating querie,  filtering/ordering/limit, and execute

      query: () => this.table(name),

      filter: (fn: any) => this.table(name).filter(fn).toArray(),

    }
  }
}

class QueryMethod { 

}
