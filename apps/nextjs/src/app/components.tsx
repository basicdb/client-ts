"use client"

import { useEffect } from "react"
import { useBasic, BasicSync, useQuery } from "@basictech/nextjs"




// const db = new BasicSync('basicdb', { schema: basic_schema });

export function ClientComponent() {
    const { user, isSignedIn, signout, signin, db, dbStatus } = useBasic()
    
    const todos = useQuery(() => db.collection('todos').ref.toArray())

    // const todosCount = useQuery(() => db.collection('todos').ref.count())

    const testWebSocket = async () => {
        // console.log(db)

        // console.log(todos)

        const tok = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IjMwZGNjNGNkLTUwNDAtNGQxMi05YmIwLTRiMTNiMzJlNGI5YyIsInVzZXJJZCI6ImJmOTE4ZjdiLWZlM2YtNGZkOC05ZTE0LTQ1NGZjZGNkMWUyMCIsInNjb3BlIjoib3BlbmlkIiwiaWF0IjoxNzI3ODE5MDAwLCJleHAiOjE3Mjc4MjI2MDB9.jjFmr7jAjLKioxidKvP7NzSaaqQ27vDq9qxmiM2sIR0"

        await db.connect({ access_token: tok }).then(() => {
            console.log("connected")
        })
    }

    const debugeroo = async () => {
        console.log("debugeroo")

        // console.log(db.)

        // const status = await db.debugeroo().getStatus("ws://localhost:3003/ws")
        // console.log("sync status", getSyncStatus(status))

        // const all = await db.debugeroo().list()
        // console.log("all", all)
    }

    return (
        <div>
            
            { isSignedIn && <span>hello {user?.email}</span>}

            <br />

            <button onClick={() => {
                console.log("user", user, isSignedIn)
            }}> auth </button>

            {isSignedIn ? <button onClick={() => {
                signout()
            }}> Sign out </button> : <button onClick={() => {
                signin()
            }}> Sign in </button>}

            <button onClick={debugeroo}> debugeroo </button>

            <button onClick={testWebSocket}> Connect </button>

            <div className="todo-list" style={{ padding: 10 }}>
                <p>status:{dbStatus} {dbStatus === 'ONLINE' ? '🟢' : '🔴'} </p>
                <h2>Todo List</h2>
               
                {todos?.map(todo => (
                    <div key={todo.id} className="todo-item">
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => db.collection('todos').update(todo.id, { completed: !todo.completed })}
                        />
                        <span>{todo.title}</span>
                        <button onClick={() => db.collection('todos').delete(todo.id)}>Delete</button>
                    </div>
                ))}
                <div className="add-todo">
                    <input
                        type="text"
                        placeholder="New todo"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                const title = e.target.value.trim();
                                if (title) {
                                    db.collection('todos').add({ title, completed: false });
                                    e.target.value = '';
                                }
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    )
}