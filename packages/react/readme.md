# @basictech/react

A React package for integrating Basic authentication and database functionality into your React applications.

## Installation

```bash
npm install @basictech/react
```

## Usage

### 1. Wrap your application with BasicProvider

In your root component or App.tsx, wrap your application with the `BasicProvider`:

```typescript
import { BasicProvider } from '@basictech/react';

const schema = {
  tables: { 
    todos: { 
      fields: { 
        id: { 
          type: "string",
          primary: true
        },
        title: { 
          type: "string",
          indexed: true
        },
        completed: { 
          type: "boolean",
          indexed: true
        }
      }
    }
  } 
}


function App() {
  return (
    <BasicProvider project_id="YOUR_PROJECT_ID" schema={schema} debug>
      {/* Your app components */}
    </BasicProvider>
  );
}

export default App;
```

Replace `YOUR_PROJECT_ID` with your actual Basic project ID.

### 2. Use the useBasic hook

In your components, you can use the `useBasic` hook to access authentication and database functionality:

```typescript
import { useBasic } from '@basictech/react';

function MyComponent() {
  const { user, isSignedIn, signin, signout, signinWithCode, db } = useBasic();

  if (!isSignedIn) {
    return <button onClick={signin}>Sign In</button>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={signout}>Sign Out</button>
    </div>
  );
}
```

### 3. Manual OAuth Code Handling

For custom OAuth flows (mobile apps, server-side redirects, etc.), you can manually handle authorization codes:

```typescript
import { useBasic } from '@basictech/react';

function CustomAuthComponent() {
  const { signinWithCode } = useBasic();

  const handleOAuthCode = async (code: string, state?: string) => {
    const result = await signinWithCode(code, state);
    
    if (result.success) {
      console.log('Successfully authenticated!');
      // Redirect to authenticated area
    } else {
      console.error('Authentication failed:', result.error);
      // Handle error
    }
  };

  // Example: Handle OAuth code from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code) {
      handleOAuthCode(code, state || undefined);
    }
  }, []);

  return <div>Processing authentication...</div>;
}
```

#### Mobile App Integration Example:

```typescript
// React Native or mobile app deep link handling
const handleDeepLink = (url: string) => {
  const urlParams = new URLSearchParams(url.split('?')[1]);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  if (code) {
    signinWithCode(code, state || undefined);
  }
};
```

#### Server-Side OAuth Example:

```typescript
// When OAuth happens server-side and you receive the code
const handleServerOAuth = async (serverCode: string) => {
  const result = await signinWithCode(serverCode);
  
  if (result.success) {
    // Redirect to authenticated area
    window.location.href = '/dashboard';
  } else {
    // Show error message
    alert(`Authentication failed: ${result.error}`);
  }
};
```

### 4. Custom OAuth Redirect URIs

You can specify custom redirect URIs for OAuth flows:

```typescript
import { useBasic } from '@basictech/react';

function CustomAuthComponent() {
  const { getSignInLink } = useBasic();

  const handleCustomRedirect = () => {
    // Use a custom redirect URI
    const signInUrl = getSignInLink('https://yourapp.com/auth/callback');
    window.location.href = signInUrl;
  };

  const handleDefaultRedirect = () => {
    // Use default redirect (current page URL)
    const signInUrl = getSignInLink();
    window.location.href = signInUrl;
  };

  return (
    <div>
      <button onClick={handleCustomRedirect}>
        Sign In (Custom Redirect)
      </button>
      <button onClick={handleDefaultRedirect}>
        Sign In (Default Redirect)
      </button>
    </div>
  );
}
```

#### Use Cases for Custom Redirect URIs:

- **Mobile Apps**: Redirect to app-specific URLs
- **Multi-Domain**: Redirect to different domains based on context
- **Testing**: Use test-specific callback URLs
- **Subdomains**: Redirect to specific subdomains

## API Reference


### <BasicProvider>

The `BasicProvider` component accepts the following props:

- `project_id` (required): String - Your Basic project ID.
- `schema` (required): Object - The schema definition for your database.
- `debug` (optional): Boolean - Enable debug mode for additional logging. Default is `false`.
- `children` (required): React.ReactNode - The child components to be wrapped by the provider.




### useQuery

returns a react hook that will automatically update data based on your query 

usage: 

```typescript
import { useQuery } from '@basictech/react'

function MyComponent() {
  const data = useQuery(db.collection('data').getAll())

  return (
    <div>
      { 
        data.map((item: any) => {
          <> 
          // render your data here
          </>
        })
      }
    </div>
  );
}
```
Notes:
- must pass in a db function, ie `db.collection('todos').getAll()`
- default will be empty array (this might change in the future)


### useBasic()

Returns an object with the following properties and methods:

- `user`: The current user object
- `isSignedIn`: Boolean indicating if the user is signed in
- `signin()`: Function to initiate the sign-in process
- `signout()`: Function to sign out the user
- `signinWithCode(code: string, state?: string)`: Function to manually handle OAuth authorization codes
- `getSignInLink(redirectUri?: string)`: Function to generate OAuth sign-in URLs
- `db`: Object for database operations

#### signinWithCode Parameters:
- `code` (required): The OAuth authorization code received from the OAuth provider
- `state` (optional): The state parameter for CSRF protection validation

#### signinWithCode Returns:
- `Promise<{ success: boolean, error?: string }>`: Returns success status and optional error message

#### getSignInLink Parameters:
- `redirectUri` (optional): Custom redirect URI for OAuth flow. If not provided, defaults to current page URL

#### getSignInLink Returns:
- `string`: Complete OAuth authorization URL



db methods: 

- `collection(name: string)`: returns a collection object


db.collection(name) methods: 

- `getAll()`: returns all items in the collection
- `get(id: string)`: returns a single item from the collection
- `add(data: any)`: adds a new item to the collection
- `put(data: any)`: updates an item in the collection
- `update(id: string, data: any)`: updates an item in the collection
- `delete(id: string)`: deletes an item from the collection

all db.collection() methods return a promise 

example usage: 

```typescript
import { useBasic } from '@basictech/react';

function MyComponent() {
  const { db } = useBasic();

  async function addTodo() {
    await db.collection('todos').add({
      title: 'test',
      completed: false
    })
  }

  return (
    <div>
      <button onClick={addTodo}>Add Todo</button>
    </div>
  );
}

```

## License

ISC

---