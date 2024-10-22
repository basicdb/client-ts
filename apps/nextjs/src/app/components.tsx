"use client"

import { useBasic, useQuery, LoginButton } from "@basictech/nextjs"


export function ClientComponent() {
    const { user, isSignedIn, signout, signin, db, dbStatus } = useBasic()
    
    const todos = useQuery(() => db.collection('todos').ref.toArray())


    const testWebSocket = async () => {
        console.log(dbStatus)
    }

    const debugeroo = async () => {
            console.log("debugeroo")
    }

    /**  ideaas: 
    //     db.table('tablename')
        
    //     const ageFilter = 3

    //     const getXYZQyery = { 
    //         color: "> blue",
    //         askd: ['>', ageFilter]
    //     }

    //     const { data, error , loading} = db.table('todos').select(
    //         `age,
    //          color { 
    //             name,
    //             hex
    //         } 
    //         `
    //     )

    //     const { data, error , loading} = db.table('todos').select(
    //         [ 'age', { color: ['name', 'hex']} ]
    //     )


    //     const { data, error , loading} = db.table('todos').select({ 
    //         age: true, 
    //         color: {
    //             name: true, 
    //             hex: true
    //         }
    //     })

    //     const data = db.todo.select()

    //     db.table('todos').get([ 
    //         [ 'age', '>', 3], 
    //         [ 'color', '==', 'blue'], 

    //     ])

    //     db.table('todos').where('age', '>', ageFilter)
    // }
    */

    return (
        <div>
            {/* <LoginButton /> */}
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