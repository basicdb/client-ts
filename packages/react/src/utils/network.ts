// Network utilities for Basic React package
import semver from 'semver'
import { log } from '../config'
import { version as pkgVersion } from '../../package.json'

export function isDevelopment(debug?: boolean): boolean {
    if (debug === true) return true
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') return true
    if (typeof window === 'undefined' || !window.location) return false
    const host = window.location.hostname
    return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.includes('localhost') ||
        host.includes('127.0.0.1') ||
        host.includes('.local')
    )
}

function normalizeVersion(v: string | null | undefined): string | null {
    if (v == null) return null
    const t = String(v).trim()
    return t.length ? t : null
}

function versionsMatch(a: string, b: string): boolean {
    const na = a.trim()
    const nb = b.trim()
    if (na === nb) return true
    const va = semver.valid(na)
    const vb = semver.valid(nb)
    if (va && vb) return semver.eq(va, vb)
    return false
}

/** Use npm `beta` dist-tag when the installed version is a semver prerelease whose first id is `beta`. */
function usesBetaDistTag(version: string): boolean {
    const pre = semver.prerelease(version)
    const id = pre?.[0]
    return typeof id === 'string' && id.toLowerCase() === 'beta'
}

type NpmInstallMeta = {
    'dist-tags'?: { latest?: string; beta?: string }
}

export async function checkForNewVersion(): Promise<{ 
    hasNewVersion: boolean, 
    latestVersion: string | null, 
    currentVersion: string | null 
}> {
    try {
        const currentVersion = normalizeVersion(pkgVersion)
        if (!currentVersion) {
            return { hasNewVersion: false, latestVersion: null, currentVersion: null }
        }

        const response = await fetch('https://registry.npmjs.org/@basictech/react', {
            headers: { Accept: 'application/vnd.npm.install-v1+json' },
        })
        if (!response.ok) {
            throw new Error('Failed to fetch version from npm');
        }

        const data = (await response.json()) as NpmInstallMeta
        const distTags = data['dist-tags'] ?? {}
        const rawRegistry =
            usesBetaDistTag(currentVersion)
                ? distTags.beta ?? distTags.latest
                : distTags.latest
        const latestVersion = normalizeVersion(rawRegistry ?? null)
        if (!latestVersion) {
            throw new Error('Missing dist-tags from npm registry')
        }

        const same = versionsMatch(currentVersion, latestVersion)

        if (!same && isDevelopment()) {
            log('[basic] version check mismatch:', {
                currentVersion,
                registryVersion: latestVersion,
                channel: usesBetaDistTag(currentVersion) ? 'beta' : 'latest',
            })
        }

        if (!same) {
            console.warn('[basic] New version available:', latestVersion, `\nrun "npm install @basictech/react@${latestVersion}" to update`);
        }
        if (usesBetaDistTag(currentVersion)) {
            log('thank you for being on basictech/react beta :)')
        }
     
        return {
            hasNewVersion: !same,
            latestVersion,
            currentVersion
        };
    } catch (error) {
        log('Error checking for new version:', error);
        return {
            hasNewVersion: false,
            latestVersion: null, 
            currentVersion: null
        };
    }
}

export function cleanOAuthParamsFromUrl(): void {
    if (window.location.search.includes('code') || window.location.search.includes('state')) {
        const url = new URL(window.location.href)
        url.searchParams.delete('code')
        url.searchParams.delete('state')
        window.history.pushState({}, document.title, url.pathname + url.search)
        log('Cleaned OAuth parameters from URL')
    }
}

export function getSyncStatus(statusCode: number): string {
    switch (statusCode) {
        case -1:
            return "ERROR";
        case 0:
            return "OFFLINE";
        case 1:
            return "CONNECTING";
        case 2:
            return "ONLINE";
        case 3:
            return "SYNCING";
        case 4:
            return "ERROR_WILL_RETRY";
        default:
            return "UNKNOWN";
    }
}
