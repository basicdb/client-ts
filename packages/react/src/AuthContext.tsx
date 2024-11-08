// @ts-nocheck

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { jwtDecode } from 'jwt-decode'

import { BasicSync } from './sync'
import { get, add, update, deleteRecord } from './db'
import { validateSchema } from './schema'

import { log } from './config'

/*
schema todo:
    field types
    array types
    relations
*/


// const example = {
//     project_id: '123',
//     version: 0,
//     tables: {
//         example: {
//             name: 'example',
//             type: 'collection',
//             fields: {
//                 id: {
//                     type: 'uuid',
//                     primary: true,
//                 },
//                 value: {
//                     type: 'string',
//                     indexed: true,
//                 },
//             }
//         }
//     }
// }


type BasicSyncType = {
    basic_schema: any;
    connect: (options: { access_token: string }) => void;
    debugeroo: () => void;
    collection: (name: string) => {
        ref: {
            toArray: () => Promise<any[]>;
            count: () => Promise<number>;
        };
    };
    [key: string]: any; // For other potential methods and properties
};


enum DBStatus {
    LOADING = "LOADING",
    OFFLINE = "OFFLINE",
    CONNECTING = "CONNECTING",
    ONLINE = "ONLINE",
    SYNCING = "SYNCING",
    ERROR = "ERROR"
}

type User = {
    name?: string,
    email?: string,
    id?: string,
    primaryEmailAddress?: {
        emailAddress: string
    },
    fullName?: string
}
type Token = {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh: string,
}

export const BasicContext = createContext<{
    unicorn: string,
    isAuthReady: boolean,
    isSignedIn: boolean,
    user: User | null,
    signout: () => void,
    signin: () => void,
    getToken: () => Promise<string>,
    getSignInLink: () => string,
    db: any,
    dbStatus: DBStatus
}>({
    unicorn: "🦄",
    isAuthReady: false,
    isSignedIn: false,
    user: null,
    signout: () => { },
    signin: () => { },
    getToken: () => new Promise(() => { }),
    getSignInLink: () => "",
    db: {},
    dbStatus: DBStatus.LOADING
});

const EmptyDB: BasicSyncType = {
    isOpen: false,
    collection: () => {
        return {
            ref: {
                toArray: () => [],
                count: () => 0
            }
        }
    }
}


function getSyncStatus(statusCode: number): string {
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

type ErrorObject = {
    code: string;
    title: string;
    message: string;
}

export function BasicProvider({ children, project_id, schema, debug = false }: { children: React.ReactNode, project_id: string, schema: any, debug?: boolean }) {
    const [isAuthReady, setIsAuthReady] = useState(false)
    const [isSignedIn, setIsSignedIn] = useState<boolean>(false)
    const [token, setToken] = useState<Token | null>(null)
    const [user, setUser] = useState<User>({})

    const [dbStatus, setDbStatus] = useState<DBStatus>(DBStatus.LOADING)
    const [error, setError] = useState<ErrorObject | null>(null)

    const syncRef = useRef<BasicSync | null>(null);


    useEffect(() => {
        function initDb() {
            const valid = validateSchema(schema)
            if (!valid.valid) {
                log('Basic Schema is invalid!', valid.errors)
                console.group('Schema Errors')
                let errorMessage = ''
                valid.errors.forEach((error, index) => {
                    log(`${index + 1}:`, error.message, ` - at ${error.instancePath}`)
                    errorMessage += `${index + 1}: ${error.message} - at ${error.instancePath}\n`
                })
                console.groupEnd('Schema Errors')
                setError({
                    code: 'schema_invalid',
                    title: 'Basic Schema is invalid!',
                    message: errorMessage
                })
                return null
            }

            if (!syncRef.current) {
                log('Initializing BasicDB')
                syncRef.current = new BasicSync('basicdb', { schema: schema });

                // log('db is open', syncRef.current.isOpen())
                // syncRef.current.open()
                // .then(() => {
                //     log("is open now:", syncRef.current.isOpen())
                // })
            }
        }

        initDb()
    }, []);

    useEffect(() => {
        if (!syncRef.current) {
            return
        }

        // syncRef.current.handleStatusChange((status: number, url: string) => {
        //     setDbStatus(getSyncStatus(status))
        // })

        syncRef.current.syncable.on('statusChanged', (status: number, url: string) => {
            setDbStatus(getSyncStatus(status))
        })

        syncRef.current.syncable.getStatus().then((status) => {
            setDbStatus(getSyncStatus(status))
        })
    }, [syncRef.current])


    const connectToDb = async () => {
        const tok = await getToken()
        if (!tok) {
            log('no token found')
            return
        }

        log('connecting to db...')

        // TODO: handle if signed out after connect() is already called

        syncRef.current.connect({ access_token: tok })
            .catch((e) => {
                log('error connecting to db', e)
            })
    }

    useEffect(() => {
        if (token && syncRef.current && isSignedIn && isSignedIn) {
            connectToDb()
        }
    }, [isSignedIn])

    const getSignInLink = () => {
        log('getting sign in link...')

        const randomState = Math.random().toString(36).substring(6);
        localStorage.setItem('basic_auth_state', randomState)

        let baseUrl = "https://api.basic.tech/auth/authorize"
        baseUrl += `?client_id=${project_id}`
        baseUrl += `&redirect_uri=${encodeURIComponent(window.location.href)}`
        baseUrl += `&response_type=code`
        baseUrl += `&scope=openid`
        baseUrl += `&state=${randomState}`

        return baseUrl;
    }

    const signin = () => {
        log('signing in: ', getSignInLink())
        const signInLink = getSignInLink()
        //todo: change to the other thing?
        window.location.href = signInLink;
    }

    const signout = () => {
        log('signing out!')
        setUser({})
        setIsSignedIn(false)
        setToken(null)
        document.cookie = `basic_token=; Secure; SameSite=Strict`;
        localStorage.removeItem('basic_auth_state')

        if (syncRef.current) {
            // WIP - BUG - sometimes connects even after signout
            syncRef.current.disconnect()
        }
    }

    const getToken = async (): Promise<string> => {
        log('getting token...')

        if (!token) {
            log('no token found')
            throw new Error('no token found')
        }

        const decoded = jwtDecode(token?.access_token)
        const isExpired = decoded.exp && decoded.exp < Date.now() / 1000

        if (isExpired) {
            log('token is expired - refreshing ...')
            const newToken = await fetchToken(token?.refresh)
            return newToken?.access_token || ''
        }

        return token?.access_token || ''
    }

    function getCookie(name: string) {
        let cookieValue = '';
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    const fetchToken = async (code: string) => {
        const token = await fetch('https://api.basic.tech/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        })
            .then(response => response.json())
            .catch(error => log('Error:', error))

        if (token.error) {
            log('error fetching token', token.error)
            return
        } else {
            // log('token', token)
            setToken(token)
        }
        return token
    }

    useEffect(() => {
        localStorage.setItem('basic_debug', debug ? 'true' : 'false')

        try {
            if (window.location.search.includes('code')) {
                let code = window.location?.search?.split('code=')[1].split('&')[0]

                const state = localStorage.getItem('basic_auth_state')
                if (!state || state !== window.location.search.split('state=')[1].split('&')[0]) {
                    log('error: auth state does not match')
                    setIsAuthReady(true)

                    localStorage.removeItem('basic_auth_state')
                    window.history.pushState({}, document.title, "/");
                    return
                }

                localStorage.removeItem('basic_auth_state')

                fetchToken(code)                
            } else { 
                let cookie_token = getCookie('basic_token')
                if (cookie_token !== '') {
                    setToken(JSON.parse(cookie_token))
                } else { 
                    setIsAuthReady(true)
                }
            }


        } catch (e) {
            log('error getting cookie', e)
        }
    }, [])

    useEffect(() => {
        async function fetchUser(acc_token: string) {
            console.info('fetching user')
            const user = await fetch('https://api.basic.tech/auth/userInfo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${acc_token}`
                }
            })
                .then(response => response.json())
                .catch(error => log('Error:', error))

            if (user.error) {
                log('error fetching user', user.error)
                // refreshToken()
                return
            } else {
                // log('user', user)
                document.cookie = `basic_token=${JSON.stringify(token)}; Secure; SameSite=Strict`;
                
                if (window.location.search.includes('code')) {
                    window.history.pushState({}, document.title, "/");
                }
                
                setUser(user)
                setIsSignedIn(true)

                setIsAuthReady(true)
            }
        }

        async function checkToken() {
            if (!token) {
                log('error: no user token found')

                setIsAuthReady(true)
                return
            }

            const decoded = jwtDecode(token?.access_token)
            const isExpired = decoded.exp && decoded.exp < Date.now() / 1000

            if (isExpired) {
                log('token is expired - refreshing ...')
                const newToken = await fetchToken(token?.refresh)
                fetchUser(newToken.access_token)
            } else {
                fetchUser(token.access_token)
            }
        }

        if (token) {
            checkToken()
        } 
    }, [token])


    const db_ = (tableName: string) => {
        const checkSignIn = () => {
            if (!isSignedIn) {
                throw new Error('cannot use db. user not logged in.')
            }
        }

        return {
            get: async () => {
                checkSignIn()
                const tok = await getToken()
                return get({ projectId: project_id, accountId: user.id, tableName: tableName, token: tok })
            },
            add: async (value: any) => {
                checkSignIn()
                const tok = await getToken()
                return add({ projectId: project_id, accountId: user.id, tableName: tableName, value: value, token: tok })
            },
            update: async (id: string, value: any) => {
                checkSignIn()
                const tok = await getToken()
                return update({ projectId: project_id, accountId: user.id, tableName: tableName, id: id, value: value, token: tok })
            },
            delete: async (id: string) => {
                checkSignIn()
                const tok = await getToken()
                return deleteRecord({ projectId: project_id, accountId: user.id, tableName: tableName, id: id, token: tok })
            }

        }

    }

    return (
        <BasicContext.Provider value={{
            unicorn: "🦄",
            isAuthReady,
            isSignedIn,
            user,
            signout,
            signin,
            getToken,
            getSignInLink,
            db: syncRef.current,
            dbStatus
        }}>
            {error && <ErrorDisplay error={error} />}
            {syncRef.current ? children : null}
        </BasicContext.Provider>
    )
}

function ErrorDisplay({ error }: { error: ErrorObject }) {
    return <div style={{ 
        position: 'absolute',
        top: 20, 
        left: 20,
        color: 'black',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        padding: '20px',
        maxWidth: '400px',
        margin: '20px auto',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        fontFamily: 'monospace', 
     }}>
        <h3 style={{fontSize: '0.8rem', opacity: 0.8}}>code: {error.code}</h3>
        <h1 style={{fontSize: '1.2rem', lineHeight: '1.5'}}>{error.title}</h1>
        <p>{error.message}</p>
    </div>
}

/*
possible errors: 
- projectid missing / invalid
- schema missing / invalid
*/

export function useBasic() {
    return useContext(BasicContext);
}
