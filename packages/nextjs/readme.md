# @basictech/nextjs

A Next.js package for integrating Basic authentication and database functionality into your Next.js applications.

## Installation

```bash
npm install @basictech/nextjs
```

## Usage

### 1. Wrap your application with BasicProvider

In your `_app.tsx` or `layout.tsx` file, wrap your application with the `BasicProvider`:

```typescript
import { BasicProvider } from '@basictech/nextjs';

function MyApp({ Component, pageProps }) {
  return (
    <BasicProvider project_id="YOUR_PROJECT_ID">
      <Component {...pageProps} />
    </BasicProvider>
  );
}

export default MyApp;
```

Replace `YOUR_PROJECT_ID` with your actual Basic project ID.

### 2. Use the useBasic hook

In your components, you can use the `useBasic` hook to access authentication and database functionality:

```typescript
import { useBasic } from '@basictech/nextjs';

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

### 3. Database Operations

You can perform database operations using the `db` object:

```typescript
const { db } = useBasic();

// Get data
const getData = async () => {
  const data = await db.table('myTable').get();
  console.log(data);
};

// Add data
const addData = async () => {
  const result = await db.table('myTable').add({ key: 'value' });
  console.log(result);
};

// Update data
const updateData = async () => {
  const result = await db.table('myTable').update('itemId', { key: 'newValue' });
  console.log(result);
};
```

## API Reference

### useBasic()

Returns an object with the following properties and methods:

- `user`: The current user object
- `isSignedIn`: Boolean indicating if the user is signed in
- `signin()`: Function to initiate the sign-in process
- `signout()`: Function to sign out the user
- `db`: Object for database operations

### db

The `db` object provides the following methods:

- `table(tableName)`: Selects a table for operations
  - `get()`: Retrieves all items from the table
  - `add(value)`: Adds a new item to the table
  - `update(id, value)`: Updates an item in the table

## License

ISC
