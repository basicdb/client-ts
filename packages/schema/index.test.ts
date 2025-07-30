import { describe, it, expect } from 'vitest'
import {
  validateSchema,
  validateData,
  generateEmptySchema,
  validateUpdateSchema,
  compareSchemas,
  getJsonSchema
} from './index'

// Test schema from basic.config.ts
const testSchema = {
  project_id: "edf4539a-e2e6-403c-8dec-7267565ce46d",
  version: 3,
  tables: {
    foo: {
      fields: {
        bar: {
          indexed: true,
          type: "string"
        }
      },
      origin: {
        project_id: "bd1e08c6-25d0-44eb-bf5a-53922874b5e8",
        table: "foo",
        type: "reference"
      },
      type: "collection"
    },
    hello: {
      fields: {
        hello: {
          indexed: true,
          type: "string"
        }
      },
      type: "collection"
    },
    test: {
      fields: {
        boolone: {
          indexed: true,
          type: "boolean"
        },
        booltwo: {
          indexed: true,
          type: "boolean"
        },
        js: {
          indexed: true,
          type: "json"
        },
        num: {
          indexed: true,
          type: "number"
        },
        strone: {
          indexed: true,
          type: "string"
        },
        test: {
          indexed: true,
          type: "string"
        }
      },
      type: "collection"
    }
  }
}

// Additional test schemas
const validMinimalSchema = {
  project_id: "test-project-id",
  version: 1,
  tables: {
    users: {
      fields: {
        name: {
          type: "string",
          required: true
        }
      }
    }
  }
}

const invalidSchema = {
  project_id: "test-project-id",
  // missing version
  tables: {
    users: {
      fields: {
        name: {
          type: "invalid-type" // invalid field type
        }
      }
    }
  }
}

const caseInsensitiveDuplicateSchema = {
  project_id: "test-project-id",
  version: 1,
  tables: {
    users: {
      fields: {
        name: { type: "string" },
        NAME: { type: "string" } // case-insensitive duplicate
      }
    },
    Users: { // case-insensitive duplicate table
      fields: {
        email: { type: "string" }
      }
    }
  }
}

describe('validateSchema', () => {
  it('should validate a correct schema', () => {
    const result = validateSchema(testSchema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate a minimal correct schema', () => {
    const result = validateSchema(validMinimalSchema)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject invalid schema with missing required fields', () => {
    const result = validateSchema(invalidSchema)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should reject schema with invalid field types', () => {
    const schema = {
      project_id: "test-project-id",
      version: 1,
      tables: {
        users: {
          fields: {
            name: {
              type: "invalid-type"
            }
          }
        }
      }
    }
    const result = validateSchema(schema)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should reject schema with case-insensitive duplicate names', () => {
    const result = validateSchema(caseInsensitiveDuplicateSchema)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    
    // Check for case-insensitive duplicate errors
    const duplicateErrors = result.errors.filter(err => 
      err.keyword === 'caseInsensitiveDuplicate'
    )
    expect(duplicateErrors.length).toBeGreaterThan(0)
  })

  it('should reject schema with reserved field names (id variations)', () => {
    const schema = {
      project_id: "test-project-id",
      version: 1,
      tables: {
        users: {
          fields: {
            id: { type: "string" }, // reserved name
            name: { type: "string" }
          }
        }
      }
    }
    const result = validateSchema(schema)
    expect(result.valid).toBe(false)
  })

  it('should reject schema with empty table names', () => {
    const schema = {
      project_id: "test-project-id",
      version: 1,
      tables: {
        "": { // empty table name
          fields: {
            name: { type: "string" }
          }
        }
      }
    }
    const result = validateSchema(schema)
    expect(result.valid).toBe(false)
  })
})

describe('validateData', () => {
  it('should validate correct data against schema', () => {
    const data = {
      boolone: true,
      booltwo: false,
      js: { key: "value" },
      num: 42,
      strone: "test string",
      test: "another string"
    }
    const result = validateData(testSchema, 'test', data)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject data with wrong types', () => {
    const data = {
      boolone: "not a boolean", // wrong type
      num: 42,
      strone: "test string"
    }
    const result = validateData(testSchema, 'test', data)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("invalid type")
  })

  it('should reject data with fields not in schema', () => {
    const data = {
      boolone: true,
      unknownField: "value" // field not in schema
    }
    const result = validateData(testSchema, 'test', data)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("Invalid field")
  })

  it('should check required fields when checkRequired is true', () => {
    const schema = {
      project_id: "test-project-id",
      version: 1,
      tables: {
        users: {
          fields: {
            name: {
              type: "string",
              required: true
            },
            email: {
              type: "string",
              required: false
            }
          }
        }
      }
    }
    
    const dataWithoutRequired = { email: "test@example.com" }
    const result = validateData(schema, 'users', dataWithoutRequired, true)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("Required field missing")
  })

  it('should skip required field check when checkRequired is false', () => {
    const schema = {
      project_id: "test-project-id",
      version: 1,
      tables: {
        users: {
          fields: {
            name: {
              type: "string",
              required: true
            }
          }
        }
      }
    }
    
    const dataWithoutRequired = {}
    const result = validateData(schema, 'users', dataWithoutRequired, false)
    expect(result.valid).toBe(true)
  })

  it('should reject data for non-existent table', () => {
    const data = { name: "test" }
    const result = validateData(testSchema, 'nonexistent', data)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("Table not found")
  })

  it('should reject data when schema is invalid', () => {
    const data = { name: "test" }
    const result = validateData(invalidSchema, 'users', data)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("Schema is invalid")
  })

  it('should validate different data types correctly', () => {
    // String type
    let result = validateData(testSchema, 'test', { strone: "valid string" })
    expect(result.valid).toBe(true)

    // Number type
    result = validateData(testSchema, 'test', { num: 123.45 })
    expect(result.valid).toBe(true)

    // Boolean type
    result = validateData(testSchema, 'test', { boolone: false })
    expect(result.valid).toBe(true)

    // JSON type
    result = validateData(testSchema, 'test', { js: { nested: { object: true } } })
    expect(result.valid).toBe(true)
  })
})

describe('generateEmptySchema', () => {
  it('should generate schema with default parameters', () => {
    const schema = generateEmptySchema()
    expect(schema.project_id).toBe("")
    expect(schema.version).toBe(0)
    expect(schema.tables).toBeDefined()
    expect(schema.tables.foo).toBeDefined()
    expect(schema.tables.foo.fields.bar.type).toBe("string")
  })

  it('should generate schema with custom project_id and version', () => {
    const schema = generateEmptySchema("custom-project", 5)
    expect(schema.project_id).toBe("custom-project")
    expect(schema.version).toBe(5)
    expect(schema.tables).toBeDefined()
  })

  it('should always include the foo table template', () => {
    const schema = generateEmptySchema("test", 1)
    expect(schema.tables.foo).toBeDefined()
    expect(schema.tables.foo.name).toBe("foo")
    expect(schema.tables.foo.type).toBe("collection")
    expect(schema.tables.foo.fields.bar).toBeDefined()
    expect(schema.tables.foo.fields.bar.type).toBe("string")
    expect(schema.tables.foo.fields.bar.required).toBe(true)
  })
})

describe('compareSchemas', () => {
  it('should return valid for identical schemas', () => {
    const result = compareSchemas(testSchema, testSchema)
    expect(result.valid).toBe(true)
    expect(result.changes).toHaveLength(0)
  })

  it('should detect property changes', () => {
    const oldSchema = { ...testSchema, version: 3 }
    const newSchema = { ...testSchema, version: 4 }
    
    const result = compareSchemas(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0].type).toBe('property_changed')
    expect(result.changes[0].property).toBe('version')
  })

  it('should detect added tables', () => {
    const oldSchema = { ...validMinimalSchema }
    const newSchema = {
      ...validMinimalSchema,
      tables: {
        ...validMinimalSchema.tables,
        newTable: {
          fields: {
            newField: { type: "string" }
          }
        }
      }
    }
    
    const result = compareSchemas(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.changes.some(c => c.type === 'table_added')).toBe(true)
  })

  it('should detect removed tables', () => {
    const oldSchema = { ...testSchema }
    const newSchema = {
      ...testSchema,
      tables: {
        foo: testSchema.tables.foo,
        hello: testSchema.tables.hello
        // test table removed
      }
    }
    
    const result = compareSchemas(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.changes.some(c => c.type === 'table_removed')).toBe(true)
  })

  it('should detect field changes', () => {
    const oldSchema = { ...validMinimalSchema }
    const newSchema = {
      ...validMinimalSchema,
      tables: {
        users: {
          fields: {
            name: { type: "string", required: true },
            email: { type: "string" } // added field
          }
        }
      }
    }
    
    const result = compareSchemas(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.changes.some(c => c.type === 'field_added')).toBe(true)
  })

  it('should detect field type changes', () => {
    const oldSchema = {
      project_id: "test",
      version: 1,
      tables: {
        users: {
          fields: {
            age: { type: "string" }
          }
        }
      }
    }
    const newSchema = {
      project_id: "test",
      version: 1,
      tables: {
        users: {
          fields: {
            age: { type: "number" } // type changed
          }
        }
      }
    }
    
    const result = compareSchemas(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.changes.some(c => c.type === 'field_type_changed')).toBe(true)
  })

  it('should detect field property changes', () => {
    const oldSchema = {
      project_id: "test",
      version: 1,
      tables: {
        users: {
          fields: {
            name: { type: "string", required: false }
          }
        }
      }
    }
    const newSchema = {
      project_id: "test",
      version: 1,
      tables: {
        users: {
          fields: {
            name: { type: "string", required: true } // required changed
          }
        }
      }
    }
    
    const result = compareSchemas(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.changes.some(c => c.type === 'field_required_changed')).toBe(true)
  })
})

describe('validateUpdateSchema', () => {
  it('should validate correct schema update', () => {
    const oldSchema = { ...testSchema, version: 3 }
    const newSchema = {
      ...testSchema,
      version: 4,
      tables: {
        ...testSchema.tables,
        newTable: {
          fields: {
            newField: { type: "string" }
          }
        }
      }
    }
    
    const result = validateUpdateSchema(oldSchema, newSchema)
    expect(result.valid).toBe(true)
    expect(result.changes).toBeDefined()
  })

  it('should reject update with incorrect version increment', () => {
    const oldSchema = { ...testSchema, version: 3 }
    const newSchema = { ...testSchema, version: 5 } // skipped version 4
    
    const result = validateUpdateSchema(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("Version must be incremented by 1")
  })

  it('should reject project_id changes', () => {
    const oldSchema = { ...testSchema, version: 3 }
    const newSchema = { 
      ...testSchema, 
      version: 4,
      project_id: "different-project-id"
    }
    
    const result = validateUpdateSchema(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("Invalid schema changes detected")
  })

  it('should reject field type changes', () => {
    const oldSchema = {
      project_id: "test",
      version: 1,
      tables: {
        users: {
          fields: {
            age: { type: "string" }
          }
        }
      }
    }
    const newSchema = {
      project_id: "test",
      version: 2,
      tables: {
        users: {
          fields: {
            age: { type: "number" } // type changed - not allowed
          }
        }
      }
    }
    
    const result = validateUpdateSchema(oldSchema, newSchema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes("Cannot change type of field"))).toBe(true)
  })

  it('should allow adding new fields', () => {
    const oldSchema = { ...validMinimalSchema, version: 1 }
    const newSchema = {
      ...validMinimalSchema,
      version: 2,
      tables: {
        users: {
          fields: {
            name: { type: "string", required: true },
            email: { type: "string" } // new field
          }
        }
      }
    }
    
    const result = validateUpdateSchema(oldSchema, newSchema)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid schemas', () => {
    const result = validateUpdateSchema(invalidSchema, testSchema)
    expect(result.valid).toBe(false)
    expect(result.message).toBe("schemas are invalid")
  })
})

describe('getJsonSchema', () => {
  it('should return the JSON schema object', () => {
    const jsonSchema = getJsonSchema()
    expect(jsonSchema).toBeDefined()
    expect(jsonSchema.$schema).toBe("http://json-schema.org/draft-07/schema#")
    expect(jsonSchema.type).toBe("object")
    expect(jsonSchema.properties).toBeDefined()
    expect(jsonSchema.properties.project_id).toBeDefined()
    expect(jsonSchema.properties.version).toBeDefined()
    expect(jsonSchema.properties.tables).toBeDefined()
    expect(jsonSchema.required).toContain("project_id")
    expect(jsonSchema.required).toContain("version")
    expect(jsonSchema.required).toContain("tables")
  })

  it('should be a valid JSON schema format', () => {
    const jsonSchema = getJsonSchema()
    expect(typeof jsonSchema).toBe('object')
    expect(jsonSchema.$schema).toMatch(/json-schema\.org/)
  })
})

describe('Edge Cases', () => {
  it('should handle empty tables object', () => {
    const schema = {
      project_id: "test",
      version: 1,
      tables: {}
    }
    const result = validateSchema(schema)
    expect(result.valid).toBe(true)
  })

  it('should handle table with no fields', () => {
    const schema = {
      project_id: "test",
      version: 1,
      tables: {
        empty: {
          fields: {}
        }
      }
    }
    const result = validateSchema(schema)
    expect(result.valid).toBe(true)
  })

  it('should handle malformed schema objects', () => {
    // Test with object that's missing required properties
    const malformedSchema = { project_id: "test" } // missing version and tables
    const result = validateSchema(malformedSchema as any)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should handle very long table and field names', () => {
    const longName = 'a'.repeat(60) // exceeds 50 char limit
    const schema = {
      project_id: "test",
      version: 1,
      tables: {
        [longName]: {
          fields: {
            [longName]: { type: "string" }
          }
        }
      }
    }
    const result = validateSchema(schema)
    expect(result.valid).toBe(false)
  })

  it('should validate origin reference properties', () => {
    const schemaWithOrigin = {
      project_id: "test",
      version: 1,
      tables: {
        referenced: {
          type: "collection",
          fields: {
            name: { type: "string" }
          },
          origin: {
            type: "reference",
            project_id: "other-project",
            table: "source-table",
            version: 1
          }
        }
      }
    }
    const result = validateSchema(schemaWithOrigin)
    expect(result.valid).toBe(true)
  })
})