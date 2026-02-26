// Schema utilities for Basic React package
import { validateSchema, compareSchemas } from '@basictech/schema'
import { log } from '../config'

export async function getSchemaStatus(schema: any): Promise<{
    valid: boolean,
    status: string,
    latest: any
}> {
    const projectId = schema.project_id
    const valid = validateSchema(schema)

    if (!valid.valid) {
        console.warn('BasicDB Error: your local schema is invalid. Please fix errors and try again - sync is disabled')
        return { 
            valid: false, 
            status: 'invalid',
            latest: null
        }
    }

    const latestSchema = await fetch(`https://api.basic.tech/project/${projectId}/schema`)
    .then(res => res.json())
    .then(data => data.data[0].schema)
    .catch(err => {
        return { 
            valid: false, 
            status: 'error',
            latest: null
        }
    })

    if (!latestSchema.version) {
        return { 
            valid: false, 
            status: 'error',
            latest: null
        }
    }

    if (latestSchema.version > schema.version) {
        // error_code: schema_behind
        console.warn('BasicDB Error: your local schema version is behind the latest. Found version:', schema.version, 'but expected', latestSchema.version, " - sync is disabled")
        return { 
            valid: false, 
            status: 'behind', 
            latest: latestSchema
        }
    } else if (latestSchema.version < schema.version) {
        // error_code: schema_ahead
        console.warn('BasicDB Error: your local schema version is ahead of the latest. Found version:', schema.version, 'but expected', latestSchema.version, " - sync is disabled")
        return { 
            valid: false, 
            status: 'ahead', 
            latest: latestSchema
        }
    } else if (latestSchema.version === schema.version) {
        const changes = compareSchemas(schema, latestSchema)
        if (changes.valid) {
            return { 
                valid: true,
                status: 'current',
                latest: latestSchema
            }
        } else {
            // error_code: schema_conflict
            console.warn('BasicDB Error: your local schema is conflicting with the latest. Your version:', schema.version, 'does not match origin version', latestSchema.version, " - sync is disabled")
            return { 
                valid: false, 
                status: 'conflict',
                latest: latestSchema
            }
        }
    } else { 
        return { 
            valid: false, 
            status: 'error',
            latest: null
        }
    }
}

export async function validateAndCheckSchema(schema: any): Promise<{
    isValid: boolean,
    schemaStatus: { valid: boolean, status?: string, latest?: any },
    errors?: any[]
}> {
    const valid = validateSchema(schema)
    if (!valid.valid) {
        log('Basic Schema is invalid!', valid.errors)
        console.group('Schema Errors')
        let errorMessage = ''
        valid.errors.forEach((error, index) => {
            log(`${index + 1}:`, error.message, ` - at ${error.instancePath}`)
            errorMessage += `${index + 1}: ${error.message} - at ${error.instancePath}\n`
        })
        console.groupEnd()
        
        return {
            isValid: false,
            schemaStatus: { valid: false },
            errors: valid.errors
        }
    }

    let schemaStatus = { valid: false }
    if (schema.version !== 0) {
        schemaStatus = await getSchemaStatus(schema)
        log('schemaStatus', schemaStatus)
    } else { 
        log("schema not published - at version 0")
    }

    return {
        isValid: true,
        schemaStatus
    }
}
