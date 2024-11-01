"use client"

import { useBasic } from "@basictech/nextjs"



export function ClientComponent() {

    const { user, isSignedIn, signin } = useBasic()
 

    console.log("ClientComponent", process.env.TEST_VAR)

    return ( 
        <div>
            <button onClick={() => {
                console.log("clicked")
                console.log("user", user, isSignedIn)
            }}> Click me </button>

            <button onClick={() => {
                signin()
            }}> Sign in </button>
        </div>
    )
}