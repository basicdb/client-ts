import { useBasic, BasicProvider } from "./AuthContext";
import { useLiveQuery as useQuery } from "dexie-react-hooks";

// Re-export from AuthContext
export { useBasic, BasicProvider, useQuery }

// Type exports
export type { 
    AuthConfig, 
    BasicStorage, 
    LocalStorageAdapter, 
    BasicProviderProps,
    BasicContextType,
    AuthResult
} from "./AuthContext"
export { DBStatus } from "./AuthContext"

// Core DB exports
export type { 
    DBMode, 
    BasicDB, 
    Collection, 
    RemoteDBConfig,
    GetTokenOptions,
    AuthError
} from "./core/db"

export { RemoteDB, RemoteCollection, RemoteDBError, NotAuthenticatedError } from "./core/db"

// Storage utilities
export { STORAGE_KEYS } from "./utils/storage"

// DID resolution
export { resolveDid, resolveHandle, resolveDidWebUrl } from "./utils/resolveDid"
export type { ResolvedDid } from "./utils/resolveDid"