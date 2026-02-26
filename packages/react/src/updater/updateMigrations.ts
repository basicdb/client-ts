import { BasicStorage } from '../utils/storage'
import { Migration } from './versionUpdater'
import { log } from '../config'

export const addMigrationTimestamp: Migration = {
  fromVersion: '0.6.0',
  toVersion: '0.7.0',
  async migrate(storage: BasicStorage) {
    log('Running migration 0.6.0 → 0.7.0')
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
