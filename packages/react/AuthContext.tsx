import React, { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode} from 'jwt-decode'

import { get, add, update, deleteRecord } from './db'


type User = { 
    name?: string,
    email?: string,
    id?: string,
    primaryEmailAddress?: {
        emailAddress: string
    }, 
    fullName?: string
}

export const AuthContext = createContext<{ 
    unicorn: string, 
    isLoaded: boolean,
    isSignedIn: boolean,
    user: User | null,
    signout: () => void,
    signin: () => void,
    getToken: () => Promise<string>,
    getSignInLink: () => string, 
    db: any
}>({
    unicorn: "🦄", 
    isLoaded: false,
    isSignedIn: false,
    user: null,
    signout: () => {},
    signin: () => {},
    getToken: () => new Promise(() => {}),
    getSignInLink: () => "",
    db: {}
});

type Token = { 
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh: string,
} 

export function AuthProvider({children, project_id}: {children: React.ReactNode, project_id: string}) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isSignedIn, setIsSignedIn] = useState(false) 
    const [token, setToken] = useState<Token | null>(null)
    const [authCode, setAuthCode] = useState<string | null>(null)
    const [user, setUser] = useState<User>({}) 

    //todo: 
    //add random state to signin link & verify random state

    const getSignInLink = () => {
        console.log('getting sign in link...')

        const randomState = Math.random().toString(36).substring(7);

        let baseUrl = "https://api.basic.tech/auth/authorize"
        baseUrl += `?client_id=${project_id}`
        baseUrl += `&redirect_uri=${encodeURIComponent(window.location.href)}`
        baseUrl += `&response_type=code`
        baseUrl += `&scope=openid`
        baseUrl += `&state=1234zyx`

        return baseUrl;
    }

    const signin = () => { 
        console.log('signing in: ', getSignInLink()) 
        const signInLink = getSignInLink()
        //todo: change to the other thing?
        window.location.href = signInLink;
    }

    const signout = () => {
        console.log('signing out!')
        setUser({})
        setIsSignedIn(false)
        setToken(null)
        setAuthCode(null)
        document.cookie = `basic_token=; Secure; SameSite=Strict`;
    }

    const getToken = async () : Promise<string> => {
        console.log('getting token...')
    
        if (!token) {
            console.log('no token found')
            return ''
        }
    
        const decoded = jwtDecode(token?.access_token)
        const isExpired = decoded.exp && decoded.exp < Date.now() / 1000
    
        if (isExpired) {
            console.log('token is expired - refreshing ...')
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
            body: JSON.stringify({code: code})
        })
        .then(response => response.json())
        .catch(error => console.error('Error:', error))

        if (token.error) {
            console.log('error fetching token', token.error)
            return
        } else { 
            // console.log('token', token)
            setToken(token)
        }
        return token
    }

    useEffect(() => {
        let cookie_token = getCookie('basic_token')
        if (cookie_token !== '') {
            setToken(JSON.parse(cookie_token))
        }
        
        if (window.location.search.includes('code')) {
            let code = window.location.search.split('code=')[1].split('&')[0]
            // console.log('code found', code)
            
            // todo: check state is valid
            setAuthCode(code) // remove this? dont need to store code?
            fetchToken(code)

            window.history.pushState({}, document.title, "/");

        } else { 
            setIsLoaded(true)
        }
    }, [])

    useEffect(() => {
        async function fetchUser (acc_token: string) {
            const user = await fetch('https://api.basic.tech/auth/userInfo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${acc_token}`
                }
            })
            .then(response => response.json())
            .catch(error => console.error('Error:', error))

            if (user.error) {
                console.log('error fetching user', user.error)
                // refreshToken()
                return
            } else { 
                // console.log('user', user)
                document.cookie = `basic_token=${JSON.stringify(token)}; Secure; SameSite=Strict`;
                setUser(user)
                setIsSignedIn(true)
                setIsLoaded(true)
            }
        }

        async function checkToken () { 
            if (!token) {
                console.log('error: no user token found')
                return
            }

            const decoded = jwtDecode(token?.access_token)
            const isExpired = decoded.exp && decoded.exp < Date.now() / 1000

            if (isExpired) {
                console.log('token is expired - refreshing ...')
                const newToken = await fetchToken(token?.refresh)
                fetchUser(newToken.access_token)
            } else { 
                fetchUser(token.access_token)
            }
        }

        if (token) { 
            checkToken()
            setIsLoaded(true)
        }
    }, [token])

    


    const db = (tableName : string) => {
        const checkSignIn = () => { 
            if (!isSignedIn) {
                throw new Error('cannot use db. user not logged in.')
            }
        }

        return { 
            get: async () => { 
                checkSignIn() 
                const tok = await getToken()
                return get({projectId: project_id, accountId: user.id, tableName: tableName, token: tok } )
            },
            add: async (value: any) => { 
                checkSignIn() 
                const tok = await getToken()
                return add({projectId: project_id, accountId: user.id, tableName: tableName, value: value, token: tok } )
            },
            update: async (id: string,value : any) => { 
                checkSignIn() 
                const tok = await getToken()
                return update({projectId: project_id, accountId: user.id, tableName: tableName, id: id, value: value, token: tok } )
            },
            delete: async (id: string) => { 
                checkSignIn() 
                const tok = await getToken()
                return deleteRecord({projectId: project_id, accountId: user.id, tableName: tableName, id: id, token: tok } )
            }
            
        }
    
    }

    return (
    <AuthContext.Provider value={{
        unicorn: "🦄",
        isLoaded,
        isSignedIn,
        user,
        signout,
        signin,
        getToken,
        getSignInLink, 
        db, 
        
    }}>
    {children}
    </AuthContext.Provider>
    )
  }

export function useAuth() {
    return useContext(AuthContext);
  }
