// Storage utilities for Basic React package
export interface BasicStorage {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    remove(key: string): Promise<void>
}

export class LocalStorageAdapter implements BasicStorage {
    async get(key: string): Promise<string | null> {
        return localStorage.getItem(key)
    }
    
    async set(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value)
    }
    
    async remove(key: string): Promise<void> {
        localStorage.removeItem(key)
    }
}

export const STORAGE_KEYS = {
    REFRESH_TOKEN: 'basic_refresh_token',
    USER_INFO: 'basic_user_info',
    AUTH_STATE: 'basic_auth_state',
    REDIRECT_URI: 'basic_redirect_uri',
    SERVER_URL: 'basic_server_url',
    DEBUG: 'basic_debug'
} as const

export function getCookie(name: string): string {
    let cookieValue = '';
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i]?.trim();
            if (cookie && cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export function setCookie(name: string, value: string, options?: { secure?: boolean, sameSite?: string, httpOnly?: boolean }): void {
    const opts = {
        secure: true,
        sameSite: 'Strict',
        httpOnly: false,
        ...options
    };
    
    let cookieString = `${name}=${value}`;
    if (opts.secure) cookieString += '; Secure';
    if (opts.sameSite) cookieString += `; SameSite=${opts.sameSite}`;
    if (opts.httpOnly) cookieString += '; HttpOnly';
    
    document.cookie = cookieString;
}

export function clearCookie(name: string): void {
    document.cookie = `${name}=; Secure; SameSite=Strict`;
}
