// Basic Schema Library
// utils for validating and interacting with Basic schemas
import { validate as standaloneValidator } from './generated-validator'
import type { ErrorObject as AjvErrorObject } from 'ajv'

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
            "propertyNames": {
                "pattern": "^(?!id$|ID$|Id$|iD$)[a-zA-Z0-9][a-zA-Z0-9_]*$",
                "minLength": 1,
                "maxLength": 50, 
                "type": "string"
            },
            "patternProperties": {
                "^(?!id$|ID$|Id$|iD$)[a-zA-Z0-9][a-zA-Z0-9_]*$": {
                    "type": "object",
                    "propertyNames": {
                        "pattern": "^(?!id$|ID$|Id$|iD$)[a-zA-Z0-9][a-zA-Z0-9_]*$",
                        "minLength": 1,
                        "maxLength": 50, 
                        "type": "string"
                    },
                    "properties": {
                        "name": {
                            "type": "string"
                        },
                        "type": {
                            "type": "string",
                            "enum": ["collection"]
                        },
                        "origin": {
                            "type": "object",
                            "properties": {
                                "type": {
                                    "type": "string",
                                    "enum": ["reference"]
                                },
                                "project_id": {
                                    "type": "string"
                                },
                                "table": {
                                    "type": "string"
                                },
                                "version": {
                                    "type": "integer"
                                }
                            },
                            "if": {
                                "properties": { "type": { "const": "reference" } }
                            },
                            "then": {
                                "required": ["project_id", "table"]
                            }
                        },
                        "fields": {
                            "type": "object",
                            "propertyNames": {
                                "pattern": "^(?!id$|ID$|Id$|iD$)[a-zA-Z0-9][a-zA-Z0-9_]*$",
                                "minLength": 1,
                                "maxLength": 50, 
                                "type": "string"
                            },
                            "patternProperties": {
                                "^(?!id$|ID$|Id$|iD$)[a-zA-Z0-9][a-zA-Z0-9_]*$": {
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

// Using standalone pre-compiled validator (no dynamic code generation)
const validator = standaloneValidator

function generateEmptySchema(project_id: string = "", version: number = 0) {
    return {
        project_id: project_id,
        version: version,
        tables: {
            foo: { 
                name: "foo",
                type: "collection",
                fields: {
                    bar: {
                        type: "string",
                        required: true,
                    }
                }
            }
        }
    }
}

type Schema = {
    project_id: string,
    version: number,
    tables: any
}


/**
 * Compare two schemas and detect any differences between them
 * @param oldSchema - The original schema to compare against
 * @param newSchema - The new schema to compare with the original
 * @returns {Object} Comparison result containing:
 *   - valid: boolean indicating if schemas are identical
 *   - changes: Array of detected changes between schemas
 */
function compareSchemas(oldSchema: any, newSchema: any) {
    const changes = _getSchemaChanges(oldSchema, newSchema)
    const valid = changes.length === 0 ? true : false
    return { valid, changes }
}

/**
 * Validate a schema
 * only checks if the schema is formatted correctly, not if can be published
 * @param schema - The schema to validate
 * @returns {valid: boolean, errors: any[]} - The validation result
 */
function validateSchema(schema: Schema): { valid: boolean, errors: AjvErrorObject[] } {
    const v = validator(schema)
    const ajvErrors = validator.errors || []
    
    // Add custom validation for case-insensitive duplicates
    const customErrors = validateCaseInsensitiveNames(schema)
    
    return {
        valid: v && customErrors.length === 0,
        errors: [...ajvErrors, ...customErrors]
    }
}

/**
 * Validate that table and field names are case-insensitive unique
 * @param schema - The schema to validate
 * @returns Array of validation errors
 */
function validateCaseInsensitiveNames(schema: Schema): ErrorObject[] {
    const errors: ErrorObject[] = []
    
    if (!schema.tables) return errors
    
    // Check for case-insensitive duplicate table names
    const tableNames = new Set<string>()
    for (const tableName in schema.tables) {
        const lowerTableName = tableName.toLowerCase()
        if (tableNames.has(lowerTableName)) {
            errors.push({
                keyword: 'caseInsensitiveDuplicate',
                instancePath: `/tables/${tableName}`,
                schemaPath: '#/properties/tables/propertyNames',
                params: { propertyName: tableName },
                message: `Table name "${tableName}" conflicts with another table name (case-insensitive)`
            })
        } else {
            tableNames.add(lowerTableName)
        }
    }
    
    // Check for case-insensitive duplicate field names within each table
    for (const tableName in schema.tables) {
        const table = schema.tables[tableName]
        if (!table.fields) continue
        
        const fieldNames = new Set<string>()
        for (const fieldName in table.fields) {
            const lowerFieldName = fieldName.toLowerCase()
            if (fieldNames.has(lowerFieldName)) {
                errors.push({
                    keyword: 'caseInsensitiveDuplicate',
                    instancePath: `/tables/${tableName}/fields/${fieldName}`,
                    schemaPath: '#/properties/tables/patternProperties/^%5E%28%3F%21id%24%7CID%24%7CId%24%7CiD%24%29%5Ba-zA-Z0-9%5D%5Ba-zA-Z0-9_%5D*%24/properties/fields/propertyNames',
                    params: { propertyName: fieldName },
                    message: `Field name "${fieldName}" conflicts with another field name in table "${tableName}" (case-insensitive)`
                })
            } else {
                fieldNames.add(lowerFieldName)
            }
        }
    }
    
    return errors
}

type ErrorObject = {
    keyword?: string;
    instancePath?: string; 
    schemaPath?: string;
    params?: Record<string, any>;
    propertyName?: string;
    message?: string;
    schema?: any;
    parentSchema?: any;
    data?: any;
}


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
function validateData(schema: Schema, table: string, data: Record<string, any>, checkRequired: boolean = true) : { valid: boolean, errors?: ErrorObject[], message?: string } {
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

function _getSchemaChanges(oldSchema: any, newSchema: any): SchemaChange[] {
    // Compare tables between schemas
    const changes: SchemaChange[] = []

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

        // Compare fields - only if both tables have fields
        if (newTable.fields && oldTable.fields) {
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
    }

    // Check for field property changes (excluding type which is already checked)
    for (const tableName in newSchema.tables) {
        const newTable = newSchema.tables[tableName]
        const oldTable = oldSchema.tables[tableName]

        if (!oldTable || !newTable.fields || !oldTable.fields) continue

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


function validateUpdateSchema(oldSchema: any, newSchema: any) {
    const oldValid = validateSchema(oldSchema)
    const newValid = validateSchema(newSchema)

    if (!oldValid.valid || !newValid.valid) {
        return { valid: false, errors: oldValid.errors.concat(newValid.errors), message: "schemas are invalid" }
    }

    // Always check that version is incremented by 1
    if (newSchema.version !== oldSchema.version + 1) {
        return {
            valid: false,
            errors: [{
                change: {
                    type: 'property_changed',
                    property: 'version',
                    old: oldSchema.version,
                    new: newSchema.version
                },
                message: `Version must be incremented by 1. Expected version:${oldSchema.version + 1}, got version:${newSchema.version}`
            }],
            message: "Version must be incremented by 1"
        }
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

    return { valid: true, changes: changes, errors: [] }
}


/**
 * Get the JSON schema definition for the Basic Schema
 * @returns {Object} The JSON schema
 */
function getJsonSchema() {
    return basicJsonSchema
}

export {
    validateSchema,
    validateData,
    generateEmptySchema,
    validateUpdateSchema,
    compareSchemas,
    getJsonSchema
}