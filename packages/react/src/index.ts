import { useBasic, BasicProvider } from "./AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { validateSchema, validateData, generateEmptySchema } from "./schema";


function useQuery(queryable: any) {
    return useLiveQuery(() => {
        if (typeof queryable === 'function') {
            return queryable();
        }
        return queryable;
    }, [queryable], []);
}


const sc = { 
    validateSchema: validateSchema,
    validateData: validateData,
    generateEmptySchema: generateEmptySchema
}

export {
    useBasic, BasicProvider, useQuery, sc
}
