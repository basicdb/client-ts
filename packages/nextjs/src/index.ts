'use client'

import dynamic from 'next/dynamic'

import { useBasic, useQuery } from "@basictech/react"
import LoginButton from "./componets";


const BasicProvider = dynamic(() => import('@basictech/react').then(mod => mod.BasicProvider), { ssr: false });


export {
    useBasic, BasicProvider, useQuery, LoginButton
}