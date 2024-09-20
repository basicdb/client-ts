import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

import { v7 as uuidv7 } from 'uuid';

import { Dexie, PromiseExtended } from 'dexie';
import 'dexie-observable'; 
import 'dexie-syncable';

import { syncProtocol } from './syncProtocol'

syncProtocol()


const basic_schema = { 
  project_id: '123',
  namespace: 'todos',
  version: 0, 
  tables: { 
    todos: { 
      name: 'todos',
      type: 'collection',
      fields: { 
        id: { 
          type: 'string',
          primary: true,
        },
        title: { 
          type: 'string',
          indexed: true,
        },
        completed: { 
          type: 'boolean',
          indexed: true,
        }
      }
    }, 
  }
}


export class BasicSync extends Dexie { 
  basic_schema: any

  constructor(name: string, options: any) { 
    super(name, options);

    // --- INIT SCHEMA --- // 

    //todo: handle versions?
    // console.log(this._convertSchemaToDxSchema(this.basic_schema))
    this.basic_schema = options.schema
    this.version(1).stores(this._convertSchemaToDxSchema(this.basic_schema))


    // create an alias for toArray
    // @ts-ignore
    this.Collection.prototype.get = this.Collection.prototype.toArray

    
    // --- SYNC --- // 

    this.syncable.on("statusChanged", (status, url) => { 
      console.log("statusChanged", status, url)
    })

    console.log("connecting to", "ws://localhost:3003/ws")
    this.syncable.connect("websocket", "ws://localhost:3003/ws");

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
        console.log("Adding data to", name, data)
        return this.table(name).add({ 
          id: uuidv7(), 
          ...data
        })
      },

      put: (data: any) => { 
        return this.table(name).put({ 
          id: uuidv7(),
          ...data
        })
      },

      update: (id: string, data: any) => { 
        return this.table(name).update(id, data)
      },

      delete: (id: string) => { 
        return this.table(name).delete(id)
      },


      // --- READ ---- // 

      get: (id: string) => { 
        return this.table(name).get(id)
      },

      getAll: () => { 
        return this.table(name).toArray()
      },

      // --- QUERY ---- // 
      // TODO: lots to do here. simplifing creating querie,  filtering/ordering/limit, and execute

      query : () => this.table(name),

      filter: (fn: any) => this.table(name).filter(fn).toArray(),

    }
  }
}



export async function synce() {
  console.log("starting sync");
  
  
  const db = new BasicSync('basicdb', { schema: basic_schema });
  
  console.log(db.debugeroo())

  const todos = db.collection('todos')
  
    // await todos.update('0191b9c1-6790-7334-971c-ceba3d0d573a', { title: "alskjdl"})
    // await todos.delete("0191b9c1-678f-7334-971c-c5248d89d6a3").then(() => { 
    //   console.log("deleted")
    // })

  const all = await todos.getAll()


  // const some = await todos.filter( x => !x.completed && x.title == 'Todo 3')
  // const some = await todos.query().filter( x => x.completed)


  // query methods: 
  // .filter()
  // 


  console.log(all)
  // console.log(some)

  // console.log(db.collection('todos').ref)


}

async function createRxDB() {

  const mySchema = { 
    title: 'todos',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 100
      },
      title: {
        type: 'string',
      },
      completed: {
        type: 'boolean',
      }
    }
  }

  

  const basicdb = await createRxDatabase({
    name: 'basicdb',                   // <- name
    storage: getRxStorageDexie(),       // <- RxStorage

    /* Optional parameters: */
    multiInstance: true,                // <- multiInstance (optional, default: true)
    eventReduce: true,                  // <- eventReduce (optional, default: false)
    cleanupPolicy: {}                   // <- custom cleanup policy (optional) 
  });

  const db = await basicdb.addCollections({
    // key = collectionName
    todos: {
      schema: mySchema,
      statics: {},                          // (optional) ORM-functions for this collection
      methods: {},                          // (optional) ORM-functions for documents
      attachments: {},                      // (optional) ORM-functions for attachments
      options: {},                          // (optional) Custom parameters that might be used in plugins
      migrationStrategies: {},              // (optional)
      autoMigrate: true,                    // (optional) [default=true]
      // cacheReplacementPolicy: function(){}, // (optional) custom cache replacement policy
      // conflictHandler: function(){}         // (optional) a custom conflict handler can be used
    },
  });


  console.dir(db.todos)

  const randomId = () => Math.random().toString(36).substring(2, 15)

  db.todos.insert({
    id: randomId(),
    title: 'Todo 1',
    completed: false
  })

  const all = await db.todos.find().exec()


  console.log(all);


}