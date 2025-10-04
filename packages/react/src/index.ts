import { useState } from "react";
import { useBasic, BasicProvider, BasicStorage, LocalStorageAdapter, AuthConfig, BasicProviderProps } from "./AuthContext";
import { useLiveQuery as useQuery } from "dexie-react-hooks";
// import { createVersionUpdater, VersionUpdater, Migration } from "./versionUpdater";


export {
    useBasic, BasicProvider, useQuery
}

export type {
    AuthConfig, BasicStorage, LocalStorageAdapter, BasicProviderProps
}