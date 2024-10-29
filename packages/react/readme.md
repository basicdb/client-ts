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
  const { user, isSignedIn, signin, signout, db } = useBasic();

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
- `db`: Object for database operations



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