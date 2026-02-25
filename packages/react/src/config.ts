export const log = (...args: any[]) => {
    try { 
        if (localStorage.getItem('basic_debug') === 'true') {
            console.log('[basic]', ...args)
        }
    } catch (e) {
        // silently fail if localStorage is unavailable (SSR)
    }
}
