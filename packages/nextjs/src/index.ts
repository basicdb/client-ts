"use client"

import { useBasic, BasicProvider } from "./AuthContext";
import { useLiveQuery as useQuery } from "dexie-react-hooks"
import LoginButton from "./componets";

// import dynamic from 'next/dynamic'  

// const BasicSync = dynamic(() => import('./sync'), { ssr: false })
// import { BasicSync } from "./sync"

export {
    useBasic, BasicProvider, useQuery, LoginButton
}


