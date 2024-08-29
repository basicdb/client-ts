import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export function sync() {
    console.log("sync");

    async function storeFileToOPFS(fileName: string, fileContent: string | ArrayBuffer) {
        if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
            console.error('OPFS is not supported in this browser');
            return;
        }

        try {
            const root = await navigator.storage.getDirectory();

            // Create or open a file
            const fileHandle = await root.getFileHandle(fileName, { create: true });

            const writable = await fileHandle.createWritable();

            await writable.write(fileContent);

            await writable.close();

            console.log(`File "${fileName}" has been stored in OPFS`);
        } catch (error) {
            console.error('Error storing file to OPFS:', error);
        }
    }

    
    // storeFileToOPFS(fileName, fileContent);

    const log = console.log;
    const error = console.error;

    // const start = (sqlite3 : any) => {
    //     log('Running SQLite3 version', sqlite3.version.libVersion);
    //     const db = new sqlite3.oo1.DB('/mydb.sqlite3', 'ct');

    //     const result = db.exec('SELECT * FROM sqlite_master');
    //     // Your SQLite code here.
    //   };

      const initializeSQLite = async () => {
        try {
          log('Loading and initializing SQLite3 module...');
          const sqlite3 = await sqlite3InitModule({
            print: log,
            printErr: error,
          });
          log('Done initializing. Running demo...');
          log(sqlite3.version.libVersion);

          const db = new sqlite3.oo1.DB('/mydb.sqlite3', 'ct');
          const result = db.exec('SELECT * FROM sqlite_master');

          
          
          log(result);


        //   start(sqlite3);
        } catch (err: any) {

          error('Initialization error:', err.name, err.message);
        }
      };

    initializeSQLite();

    



}