import { useState } from "react";
import { useBasic, BasicProvider, BasicStorage, LocalStorageAdapter } from "./AuthContext";
import { useLiveQuery as useQuery } from "dexie-react-hooks";
// import { createVersionUpdater, VersionUpdater, Migration } from "./versionUpdater";


export {
    useBasic, BasicProvider, useQuery
}

// export type {
//     VersionUpdater, Migration
// }
