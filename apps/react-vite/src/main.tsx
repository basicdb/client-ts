import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { BasicProvider } from "@basictech/react"

import { schema } from '../basic.config'

export const basic_schema = {
  "project_id": "edf4539a-e2e6-403c-8dec-7267565ce46d",
  "tables": {
    "hello": {
      "fields": {
        "hello": {
          "indexed": true,
          "type": "string"
        }
      },
      "type": "collection"
    },
    "test": {
      "fields": {
        "test": {
          "indexed": true,
          "type": "string"
        }
      },
      "type": "collection"
    }, 
    "foo" : { 
      "origin" : { 
        "type": "reference", 
        "project_id": "bd1e08c6-25d0-44eb-bf5a-53922874b5e8",
        "table": "foo"
      },
      "fields": {
        "bar": {
          "indexed": true,
          "type": "string"
        }
      },
      "type": "collection"
    }
  },
  "version": 3
};

// x unique table names
// x unique names of fields within a table
// x non-empty field and table names
// - correct types for each field
// - type validations for each of the respective components of the schema (so table takes an object, fields takes an object, if either of them have elements it is limited to the types and the sub objects with their respective components)


// const valid = validateSchema(basic_schema)
// console.log("valid", valid)

// const valid2 = compareSchemas(basic_schema, new_schema)
// console.log("valid", valid2)

// const validData = validateData(basic_schema, "todos", { title: "hello", completed: true })
// console.log(validData)

// const verify = validateUpdateSchema(basic_schema, new_schema)
// console.table(verify.errors)


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <BasicProvider project_id="5a15ffd6-89fe-4921-a1a0-e411ecd6da97"  */}
    <BasicProvider project_id="edf4539a-e2e6-403c-8dec-7267565ce46d"  
    schema={schema}  
    debug
    >
      <App />
    </BasicProvider>
  </StrictMode>,
)
