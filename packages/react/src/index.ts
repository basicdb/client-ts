import { useState } from "react";
import { useBasic, BasicProvider } from "./AuthContext";
import { useLiveQuery as useQuery } from "dexie-react-hooks";

// const useQuery = (queryable: any) => {
//     const [loading, setLoading] = useState(true)
//     const [error, setError] = useState<Error | null>(null)

//     const result = useLiveQuery(async () => {
//         try {
//             setLoading(true)
//             setError(null)
            
//             // if (typeof queryable === 'function') {
//             //     return await queryable()
//             // }
//             return queryable
            
//         } catch (err) {
//             setError(err instanceof Error ? err : new Error('Unknown error'))
//             return undefined
//         } finally {
//             setLoading(false)
//         }
//     }, [queryable])

//     return {
//         data: result,
//         loading,
//         error
//     }
// }



export {
    useBasic, BasicProvider, useQuery
}
