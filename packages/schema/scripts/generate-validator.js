#!/usr/bin/env node

const Ajv = require('ajv')
const standaloneCode = require('ajv/dist/standalone')
const { writeFileSync, mkdirSync } = require('fs')
const { dirname } = require('path')

// Define the same schema as in index.ts
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

console.log('Generating standalone AJV validator...')

// Create AJV instance with source code generation enabled
const ajv = new Ajv({
    code: { 
        source: true, 
        esm: true,
        optimize: false  // Disable optimizations that might require runtime deps
    },
    allErrors: true,
    strict: false,  // Be more lenient to avoid runtime dependencies
    validateFormats: false,  // Disable format validation to avoid dependencies
    addUsedSchema: false  // Don't add used schemas to avoid dependencies
})

// Compile the schema
const validate = ajv.compile(basicJsonSchema)

// Generate standalone code
let moduleCode = standaloneCode(ajv, validate)

// Post-process to remove runtime dependencies
// Replace the ucs2length require with a native implementation
const ucs2LengthFunc = `
// Modern JavaScript Unicode string length (replaces ajv/dist/runtime/ucs2length)
const ucs2length = (str) => [...str].length;
`

// Replace the require statement with our function
moduleCode = moduleCode.replace(
  /const func2 = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g,
  ucs2LengthFunc + 'const func2 = ucs2length;'
)

// Ensure the directory exists
const outputPath = 'generated-validator.js'
const typesPath = 'generated-validator.d.ts'

// Write the generated validator
writeFileSync(outputPath, moduleCode)

// Create TypeScript declaration file
const typeDeclaration = `export declare const validate: {
  (data: any, options?: any): boolean;
  errors?: any[] | null;
};
export default validate;
`
writeFileSync(typesPath, typeDeclaration)

console.log(`✅ Standalone validator generated at ${outputPath}`)