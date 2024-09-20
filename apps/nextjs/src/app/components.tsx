"use client"

import { useEffect } from "react"
import { useBasic, BasicSync, useQuery } from "@basictech/nextjs"

const basic_schema = {
    project_id: '123',
    namespace: 'todos',
    version: 0,
    tables: {
        todos: {
            name: 'todos',
            type: 'collection',
            fields: {
                id: {
                    type: 'string',
                    primary: true,
                },
                title: {
                    type: 'string',
                    indexed: true,
                },
                completed: {
                    type: 'boolean',
                    indexed: true,
                }
            }
        },
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

const db = new BasicSync('basicdb', { schema: basic_schema });

export function ClientComponent() {
    const { user, isSignedIn, signin } = useBasic()
    const todos = useQuery(() => db.collection('todos').ref.toArray())

    const todosCount = useQuery(() => db.collection('todos').ref.count())


    // db.collection('todos').add({ title: 'test', completed: false })
    
    // db.collection('todos').update('id', { completed: true })

 


    // useEffect(() => {
    //     db.collection('todos').getAll().then(x => {
    //         console.log(x)
    //     })
    // }, [])

    const testWebSocket = async () => {
        console.log(todosCount)
    }

    const debugeroo = async () => {
        console.log("debugeroo")

        const status = await db.debugeroo().getStatus("ws://localhost:3003/ws")
        console.log("sync status", getSyncStatus(status))


        const all = await db.debugeroo().list()
        console.log("all", all)

        // db.debugeroo().connect('websocket', 'ws://localhost:3003/ws', {}).then(x => console.log(x))


        // const unsynced = await db.debugeroo().unsyncedChanges('https://localhost:3003/ws')

        // console.log("unsynced", unsynced)
    }

    return (
        <div>
            <button onClick={() => {
                console.log("clicked")
                console.log("user", user, isSignedIn)
            }}> auth </button>

            <button onClick={() => {
                signin()
            }}> Sign in </button>

            <button onClick={debugeroo}> debugeroo </button>

            <button onClick={testWebSocket}> testwe </button>



            <div className="todo-list" style={{ padding: 10 }}>
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