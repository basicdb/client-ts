// Network utilities for Basic React package
import { log } from '../config'
import { version as currentVersion } from '../../package.json'

export function isDevelopment(debug?: boolean): boolean {
    return (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('localhost') ||
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('.local') ||
        process.env.NODE_ENV === 'development' ||
        debug === true
    )
}

export async function checkForNewVersion(): Promise<{ 
    hasNewVersion: boolean, 
    latestVersion: string | null, 
    currentVersion: string | null 
}> {
    try {
        const isBeta = currentVersion.includes('beta')

        const response = await fetch(`https://registry.npmjs.org/@basictech/react/${isBeta ? 'beta' : 'latest'}`);
        if (!response.ok) {
            throw new Error('Failed to fetch version from npm');
        }

        const data = await response.json();
        const latestVersion = data.version;

        if (latestVersion !== currentVersion) {
            console.warn('[basic] New version available:', latestVersion, `\nrun "npm install @basictech/react@${latestVersion}" to update`);
        }
        if (isBeta) {
            log('thank you for being on basictech/react beta :)')
        }
     
        return {
            hasNewVersion: currentVersion !== latestVersion,
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
