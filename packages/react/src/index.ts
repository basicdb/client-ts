import { useState } from "react";
import { useBasic, BasicProvider, BasicStorage, LocalStorageAdapter } from "./AuthContext";
import { useLiveQuery as useQuery } from "dexie-react-hooks";
import { BasicDBSDK } from "./db_ts";
// import { createVersionUpdater, VersionUpdater, Migration } from "./versionUpdater";


export {
    useBasic, BasicProvider, useQuery, BasicDBSDK
}

// export type {
//     VersionUpdater, Migration
// }
