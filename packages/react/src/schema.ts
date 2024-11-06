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

type Schema = typeof basicJsonSchema

function generateEmptySchema() {
   
}


/**
 * Validate a schema
 * only checks if the schema is formatted correctly, not if can be published
 * @param schema - The schema to validate
 * @returns {valid: boolean, errors: any[]} - The validation result
 */
function validateSchema(schema: Schema) : {valid: boolean, errors: ErrorObject[]} {
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


export {
    validateSchema,
    validateData,
    generateEmptySchema
}

