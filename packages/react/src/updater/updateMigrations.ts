import { BasicStorage } from '../utils/storage'
import { Migration } from './versionUpdater'


export const addMigrationTimestamp: Migration = {
  fromVersion: '0.6.0', 
  toVersion: '0.7.0',
  async migrate(storage: BasicStorage) {
    console.log('Running test migration')
    storage.set('test_migration', 'true')
  }
}


/**
 * Get all available migrations
 */
export function getMigrations(): Migration[] {
  return [
    addMigrationTimestamp
  ]
}
