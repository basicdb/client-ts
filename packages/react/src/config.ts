
export const SERVER_URL = "https://api.basic.tech"
//  export const SERVER_URL = "http://localhost:3003"


export const log = (...args: any[]) => {
    try { 
        if (localStorage.getItem('basic_debug') === 'true') {
            console.log('[basic]', ...args)
        }
    } catch (e) {
        // console.log('error logging', e)
    }
}

// export const log = (message: string, ...args: any[]) => {
//     try {
//         if (process.env.NODE_ENV === 'development') {
//             const stack = new Error().stack;
//             const caller = stack?.split('\n')[2]?.trim();
//             console.log(`[basic] ${message}`, ...args);
//             // console.log(`[stack] ${caller}`);
//         }
//     } catch (e) {
//         console.error('Error in logWithStack:', e);
//     }
// }
