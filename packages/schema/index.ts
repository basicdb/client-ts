// Basic Schema Library
// utils for validating and interacting with Basic schemas
import Ajv, { ErrorObject } from 'ajv'

const basicJsonSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "project_id": {
            "type": "string"
        },
        "namespace": {
            "type": "string",
        },
        "version": {
            "type": "integer",
            "minimum": 0
        },
        "tables": {
            "type": "object",
            "patternProperties": {
                "^[a-zA-Z0-9_]+$": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string"
                        },
                        "type": {
                            "type": "string",
                            "enum": ["collection"]
                        },
                        "fields": {
                            "type": "object",
                            "patternProperties": {
                                "^[a-zA-Z0-9_]+$": {
                                    "type": "object",
                                    "properties": {
                                        "type": {
                                            "type": "string",
                                            "enum": ["string", "boolean", "number", "json"]
                                        },
                                        "indexed": {
                                            "type": "boolean"
                                        }, 
                                        "required": {
                                            "type": "boolean"
                                        }
                                    },
                                    "required": ["type"]
                                }
                            },
                            "additionalProperties": true
                        }
                    },
                    "required": ["fields"]
                }
            },
            "additionalProperties": true
        }
    },
    "required": ["project_id", "version", "tables"]
  }

const ajv = new Ajv()
const validator = ajv.compile(basicJsonSchema)


function generateEmptySchema(project_id: string = "", version: number = 0)  {
    return {
        project_id: project_id,
        version: version,
        tables: {
            fields: {
                example: { 
                    type: "string",
                }
            }
        }
    }
}

type Schema = { 
    project_id : string,
    version : number,
    tables : any
}


/**
 * Validate a schema
 * only checks if the schema is formatted correctly, not if can be published
 * @param schema - The schema to validate
 * @returns {valid: boolean, errors: any[]} - The validation result
 */
function validateSchema(schema: any) : {valid: boolean, errors: ErrorObject[]} {
    const v = validator(schema)
    return { 
        valid: v,
        errors: validator.errors || []
    }
}

// type ErrorObject = {
//     keyword: string;
//     instancePath: string; 
//     schemaPath: string;
//     params: Record<string, any>;
//     propertyName?: string;
//     message?: string;
//     schema?: any;
//     parentSchema?: any;
//     data?: any;
// }


/**
 * Validate data against a schema's table definition. Only checks against provided schema.
 * @param schema - The schema to validate against
 * @param table - The table name in the schema to validate against
 * @param data - The data object to validate
 * @param checkRequired - Whether to check if required fields are present (default: true)
 * @returns {Object} Validation result containing:
 *   - valid: boolean indicating if validation passed
 *   - errors: Array of validation error objects
 *   - message: Error message if validation failed
 */

function validateData(schema: any, table: string, data: Record<string, any>, checkRequired: boolean = true) {
    const valid = validateSchema(schema)
    if (!valid.valid) {
        return { valid: false, errors: valid.errors, message: "Schema is invalid" }
    }

    const tableSchema = schema.tables[table]

    if (!tableSchema) {
        return { valid: false, errors: [{ message: `Table ${table} not found in schema` }], message: "Table not found" }
    }

    for (const [fieldName, fieldValue] of Object.entries(data)) {
        const fieldSchema = tableSchema.fields[fieldName]
        
        if (!fieldSchema) {
            return { 
                valid: false, 
                errors: [{ message: `Field ${fieldName} not found in schema` }],
                message: "Invalid field"
            }
        }

        const schemaType = fieldSchema.type
        const valueType = typeof fieldValue

        if (  
            (schemaType === 'string' && valueType !== 'string') ||
            (schemaType === 'number' && valueType !== 'number') ||
            (schemaType === 'boolean' && valueType !== 'boolean') ||
            (schemaType === 'json' && valueType !== 'object')
        ) {
            return {
                valid: false,
                errors: [{ 
                    message: `Field ${fieldName} should be type ${schemaType}, got ${valueType}` 
                }],
                message: "invalid type"
            }
        }
    }

    if (checkRequired) {
        for (const [fieldName, fieldSchema] of Object.entries(tableSchema.fields)) {
            if ((fieldSchema as { required?: boolean }).required && !data[fieldName]) {
                return { valid: false, errors: [{ message: `Field ${fieldName} is required` }], message: "Required field missing" }
            }
        }
    }

    return { valid: true, errors: [] }
}

type SchemaChangeType = "property_changed" | "property_removed" | "table_added" | "table_removed" | "field_added" | "field_removed" | "field_type_changed" | "field_required_changed" | "field_property_added" | "field_property_changed" | "field_property_removed"


type SchemaChange = {
    type: SchemaChangeType,
    property?: string,
    table?: string,
    field?: string,
    old?: any,
    new?: any
}

function _getSchemaChanges(oldSchema: any, newSchema: any) : SchemaChange[] {
    // Compare tables between schemas
    const changes : SchemaChange[] = []

    // Check for top level property changes
    for (const key in newSchema) {
        if (key !== 'tables' && newSchema[key] !== oldSchema[key]) {
            changes.push({
                type: 'property_changed',
                property: key,
                old: oldSchema[key],
                new: newSchema[key]
            })
        }
    }

    for (const key in oldSchema) {
        if (key !== 'tables' && !newSchema.hasOwnProperty(key)) {
            changes.push({
                type: 'property_removed',
                property: key,
                old: oldSchema[key]
            })
        }
    }

    // Check for removed tables
    for (const tableName in oldSchema.tables) {
        if (!newSchema.tables[tableName]) {
            changes.push({
                type: 'table_removed',
                table: tableName
            })
        }
    }

    // Check for added tables and field changes
    for (const tableName in newSchema.tables) {
        const newTable = newSchema.tables[tableName]
        const oldTable = oldSchema.tables[tableName]

        if (!oldTable) {
            changes.push({
                type: 'table_added', 
                table: tableName
            })
            continue
        }

        // Compare fields
        for (const fieldName in newTable.fields) {
            const newField = newTable.fields[fieldName]
            const oldField = oldTable.fields[fieldName]

            if (!oldField) {
                changes.push({
                    type: 'field_added',
                    table: tableName,
                    field: fieldName
                })
                continue
            }

            // Check for field type changes
            if (newField.type !== oldField.type) {
                changes.push({
                    type: 'field_type_changed',
                    table: tableName,
                    field: fieldName,
                    old: oldField.type,
                    new: newField.type
                })
            }

            // Check for required flag changes
            if (newField.required !== oldField.required) {
                changes.push({
                    type: 'field_required_changed',
                    table: tableName,
                    field: fieldName,
                    old: oldField.required,
                    new: newField.required
                })
            }
        }

        // Check for removed fields
        for (const fieldName in oldTable.fields) {
            if (!newTable.fields[fieldName]) {
                changes.push({
                    type: 'field_removed',
                    table: tableName,
                    field: fieldName
                })
            }
        }
    }

    // Check for field property changes (excluding type which is already checked)
    for (const tableName in newSchema.tables) {
        const newTable = newSchema.tables[tableName]
        const oldTable = oldSchema.tables[tableName]

        if (!oldTable) continue

        for (const fieldName in newTable.fields) {
            const newField = newTable.fields[fieldName]
            const oldField = oldTable.fields[fieldName]

            if (!oldField) continue

            // Compare all properties except type
            for (const prop in newField) {
                if (prop === 'type') continue
                
                if (!(prop in oldField)) {
                    changes.push({
                        type: 'field_property_added',
                        table: tableName,
                        field: fieldName,
                        property: prop,
                        new: newField[prop]
                    })
                } else if (JSON.stringify(newField[prop]) !== JSON.stringify(oldField[prop])) {
                    changes.push({
                        type: 'field_property_changed',
                        table: tableName,
                        field: fieldName,
                        property: prop,
                        old: oldField[prop],
                        new: newField[prop]
                    })
                }
            }

            // Check for removed properties
            for (const prop in oldField) {
                if (prop === 'type') continue
                if (!(prop in newField)) {
                    changes.push({
                        type: 'field_property_removed',
                        table: tableName,
                        field: fieldName,
                        property: prop,
                        old: oldField[prop]
                    })
                }
            }
        }
    }

    return changes
}


// function verifyScehma(schema : any ) { 
//     const valid = validateSchema(schema)
//     if (!valid.valid) {
//         return { valid: false, errors: valid.errors, message: "Schema is invalid" }
//     }




//     return { valid: true, errors: [] }
// }


function validateUpdateSchema(oldSchema: any, newSchema: any)  {
    const oldValid = validateSchema(oldSchema)
    const newValid = validateSchema(newSchema)

    if (!oldValid.valid || !newValid.valid) {
        return { valid: false, errors: oldValid.errors.concat(newValid.errors), message: "schemas are is invalid" }
    }

    
    const changes = _getSchemaChanges(oldSchema, newSchema)

    const changeErrors = []
    for (const change of changes) {
        if (change.type === 'property_changed' && change.property === 'project_id') {
            changeErrors.push({ 
                change: change,
                message: "Cannot modify project_id property"
            })
        }

        if (change.type === 'property_changed' && change.property === 'version') {
            if (change.new !== change.old + 1) {
                changeErrors.push({
                    change: change,
                    message: `Version must be incremented by 1. Expected version:${change.old + 1}, got version:${change.new}`
                })
            }
        }

        if (change.type === 'field_type_changed') {
            changeErrors.push({
                change: change,
                message: `Cannot change type of field "${change.field}" from "${change.old}" to "${change.new}"`
            })
        }
    }

    if (changeErrors.length > 0) {
        return {
            valid: false,
            errors: changeErrors,
            message: "Invalid schema changes detected"
        }
    }

    return { valid: true, changes: changes }
}

export {
    validateSchema,
    validateData,
    generateEmptySchema,
    validateUpdateSchema
}

const schema = {
    validateSchema,
    validateData,
    generateEmptySchema,
    validateUpdateSchema
}

export default schema