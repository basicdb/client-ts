import { useBasic, BasicProvider } from "./AuthContext";
import { useLiveQuery } from "dexie-react-hooks";


function useQuery(queryable: any) {
    return useLiveQuery(() => {
        if (typeof queryable === 'function') {
            return queryable();
        }
        return queryable;
    }, [queryable], []);
}



export {
    useBasic, BasicProvider, useQuery
}
