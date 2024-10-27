import Ajv from 'ajv'

export const SERVER_URL = "https://api.basic.tech"
// export const WS_URL = `${SERVER_URL}/ws`

export const log = (...args: any[]) => {
    try { 
        if (localStorage.getItem('basic_debug') === 'true') {
            console.log('[basic]', ...args)
        }
    } catch (e) {
        // console.log('error logging', e)
    }
}

// export const log = (message: string, ...args: any[]) => {
//     try {
//         if (process.env.NODE_ENV === 'development') {
//             const stack = new Error().stack;
//             const caller = stack?.split('\n')[2]?.trim();
//             console.log(`[basic] ${message}`, ...args);
//             // console.log(`[stack] ${caller}`);
//         }
//     } catch (e) {
//         console.error('Error in logWithStack:', e);
//     }
// }

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
                                          "type": "string"
                                      },
                                      "primary": {
                                          "type": "boolean"
                                      },
                                      "indexed": {
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
export const validator = ajv.compile(basicJsonSchema)
