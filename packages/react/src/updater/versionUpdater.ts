import { BasicStorage } from '../AuthContext'

export interface VersionInfo {
  version: string
  lastUpdated: number
}

export interface Migration {
  fromVersion: string
  toVersion: string
  migrate: (storage: BasicStorage) => Promise<void>
}

export class VersionUpdater {
  private storage: BasicStorage
  private currentVersion: string
  private migrations: Migration[]
  private versionKey = 'basic_app_version'

  constructor(storage: BasicStorage, currentVersion: string, migrations: Migration[] = []) {
    this.storage = storage
    this.currentVersion = currentVersion
    this.migrations = migrations.sort((a, b) => this.compareVersions(a.fromVersion, b.fromVersion))
  }

  /**
   * Check current stored version and run migrations if needed
   * Only compares major.minor versions, ignoring beta/prerelease parts
   * Example: "0.7.0-beta.1" and "0.7.0" are treated as the same version
   */
  async checkAndUpdate(): Promise<{ updated: boolean; fromVersion?: string; toVersion: string }> {
    const storedVersion = await this.getStoredVersion()
    
    if (!storedVersion) {
      // First time setup
      await this.setStoredVersion(this.currentVersion)
      return { updated: false, toVersion: this.currentVersion }
    }

    if (storedVersion === this.currentVersion) {
      return { updated: false, toVersion: this.currentVersion }
    }

    // Need to run migrations
    const migrationsToRun = this.getMigrationsToRun(storedVersion, this.currentVersion)
    
    if (migrationsToRun.length === 0) {
      // No migrations needed, just update version
      await this.setStoredVersion(this.currentVersion)
      return { updated: true, fromVersion: storedVersion, toVersion: this.currentVersion }
    }

    // Run migrations
    for (const migration of migrationsToRun) {
      try {
        console.log(`Running migration from ${migration.fromVersion} to ${migration.toVersion}`)
        await migration.migrate(this.storage)
      } catch (error) {
        console.error(`Migration failed from ${migration.fromVersion} to ${migration.toVersion}:`, error)
        throw new Error(`Migration failed: ${error}`)
      }
    }

    // Update to current version
    await this.setStoredVersion(this.currentVersion)
    return { updated: true, fromVersion: storedVersion, toVersion: this.currentVersion }
  }

  private async getStoredVersion(): Promise<string | null> {
    try {
      const versionData = await this.storage.get(this.versionKey)
      if (!versionData) return null
      
      const versionInfo: VersionInfo = JSON.parse(versionData)
      return versionInfo.version
    } catch (error) {
      console.warn('Failed to get stored version:', error)
      return null
    }
  }

  private async setStoredVersion(version: string): Promise<void> {
    const versionInfo: VersionInfo = {
      version,
      lastUpdated: Date.now()
    }
    await this.storage.set(this.versionKey, JSON.stringify(versionInfo))
  }

  private getMigrationsToRun(fromVersion: string, toVersion: string): Migration[] {
    return this.migrations.filter(migration => {
      // Migration should run if we're crossing the version boundary
      // i.e., stored version is less than migration.toVersion AND current version is >= migration.toVersion
      const storedLessThanMigrationTo = this.compareVersions(fromVersion, migration.toVersion) < 0
      const currentGreaterThanOrEqualMigrationTo = this.compareVersions(toVersion, migration.toVersion) >= 0
      
      console.log(`Checking migration ${migration.fromVersion} → ${migration.toVersion}:`)
      console.log(`  stored ${fromVersion} < migration.to ${migration.toVersion}: ${storedLessThanMigrationTo}`)
      console.log(`  current ${toVersion} >= migration.to ${migration.toVersion}: ${currentGreaterThanOrEqualMigrationTo}`)
      
      const shouldRun = storedLessThanMigrationTo && currentGreaterThanOrEqualMigrationTo
      console.log(`  Should run: ${shouldRun}`)
      
      return shouldRun
    })
  }

  /**
   * Simple semantic version comparison (major.minor only, ignoring beta/prerelease)
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  private compareVersions(a: string, b: string): number {
    // Extract major.minor from version strings, ignoring beta/prerelease parts
    const aMajorMinor = this.extractMajorMinor(a)
    const bMajorMinor = this.extractMajorMinor(b)
    
    // Compare major version first
    if (aMajorMinor.major !== bMajorMinor.major) {
      return aMajorMinor.major - bMajorMinor.major
    }
    
    // Then compare minor version
    return aMajorMinor.minor - bMajorMinor.minor
  }

  /**
   * Extract major.minor from version string, ignoring beta/prerelease
   * Examples: "0.7.0-beta.1" -> {major: 0, minor: 7}
   *           "1.2.3" -> {major: 1, minor: 2}
   */
  private extractMajorMinor(version: string): { major: number, minor: number } {
    // Remove beta/prerelease parts and split by dots
    const cleanVersion = version.split('-')[0]?.split('+')[0] || version
    const parts = cleanVersion.split('.').map(Number)
    
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0
    }
  }

  /**
   * Add a migration to the updater
   */
  addMigration(migration: Migration): void {
    this.migrations.push(migration)
    this.migrations.sort((a, b) => this.compareVersions(a.fromVersion, b.fromVersion))
  }
}

/**
 * Create a simple version updater instance
 */
export function createVersionUpdater(
  storage: BasicStorage, 
  currentVersion: string, 
  migrations: Migration[] = []
): VersionUpdater {
  return new VersionUpdater(storage, currentVersion, migrations)
}
