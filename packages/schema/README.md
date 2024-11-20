# Basic Schema Library

A TypeScript library for validating and managing Basic schemas and their data.

## Installation

```bash
npm install @basictech/schema
```

## Usage

```typescript
import { validateSchema, validateData, generateEmptySchema, validateUpdateSchema } from '@basictech/schema'
```

## API Reference

### `validateSchema(schema: any)`

Validates if a schema follows the Basic schema format.

**Parameters:**
- `schema` (required): The schema object to validate

```typescript
const result = validateSchema(mySchema)
// Returns: { valid: boolean, errors: ErrorObject[] }
```

### `validateData(schema: any, table: string, data: Record<string, any>, checkRequired?: boolean)`

Validates data against a schema's table definition.

**Parameters:**
- `schema` (required): The schema to validate against
- `table` (required): The table name within the schema
- `data` (required): The data object to validate
- `checkRequired` (optional): Whether to validate required fields (defaults to true)

```typescript
const data = {
  name: "John",
  age: 30
}

const result = validateData(mySchema, "users", data)
// Returns: { valid: boolean, errors: any[], message?: string }
```

### `generateEmptySchema(project_id?: string, version?: number)`

Creates a new empty schema with basic structure.

**Parameters:**
- `project_id` (optional): The project identifier (defaults to "")
- `version` (optional): The schema version number (defaults to 0)

```typescript
const newSchema = generateEmptySchema("my-project", 1)
```

### `validateUpdateSchema(oldSchema: any, newSchema: any)`

Validates schema updates by comparing an old schema with a new one.

**Parameters:**
- `oldSchema` (required): The original schema
- `newSchema` (required): The updated schema to validate

```typescript
const result = validateUpdateSchema(oldSchema, newSchema)
// Returns: { valid: boolean, errors?: any[], changes?: SchemaChange[], message?: string }
```

### `compareSchemas(oldSchema: any, newSchema: any)`

Compares two schemas and returns the changes between them.

**Parameters:**
- `oldSchema` (required): The original schema
- `newSchema` (required): The updated schema to compare against

```typescript
const result = compareSchemas(oldSchema, newSchema)
// Returns: { valid: boolean, changes?: SchemaChange[] }
```

## Schema Structure

A valid Basic schema follows this structure:

```typescript
{
  project_id: string,
  namespace?: string,
  version: number,
  tables: {
    [tableName: string]: {
      name?: string,
      type?: "collection",
      fields: {
        [fieldName: string]: {
          type: "string" | "boolean" | "number" | "json",
          indexed?: boolean,
          required?: boolean
        }
      }
    }
  }
}
```

## Schema Change Types

When validating schema updates, the following change types are detected:

- `property_changed`: Changes to top-level properties
- `property_removed`: Removal of top-level properties
- `table_added`: New table added
- `table_removed`: Existing table removed
- `field_added`: New field added to a table
- `field_removed`: Field removed from a table
- `field_type_changed`: Field type modification (not allowed)
- `field_required_changed`: Required flag modification
- `field_property_added`: New field property added
- `field_property_changed`: Field property modified
- `field_property_removed`: Field property removed

## Example

```typescript
import { validateSchema, validateData, generateEmptySchema } from '@basictech/schema'

// Create a new schema
const mySchema = generateEmptySchema("my-project", 1)

// Add a table with fields
mySchema.tables.users = {
  fields: {
    name: { type: "string", required: true },
    age: { type: "number" },
    isActive: { type: "boolean" },
    metadata: { type: "json" }
  }
}

// Validate the schema
const validation = validateSchema(mySchema)
if (validation.valid) {
  console.log("Schema is valid!")
} else {
  console.error("Schema validation errors:", validation.errors)
}

// Validate some data
const userData = {
  name: "John Doe",
  age: 30,
  isActive: true,
  metadata: { joined: "2024-03-20" }
}

const dataValidation = validateData(mySchema, "users", userData)
if (dataValidation.valid) {
  console.log("Data is valid!")
} else {
  console.error("Data validation error:", dataValidation.message)
}
```

## License

MIT