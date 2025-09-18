// --- Type Definitions ---
type FieldType = "string" | "boolean" | "number" | "json";

interface SchemaField {
  type: FieldType;
  indexed?: boolean;
}

interface TableSchema {
  fields: Record<string, SchemaField>;
  [key: string]: any; // Allow additional properties
}

export interface DBSchema {
  project_id: string;
  version: number;
  tables: Record<string, TableSchema>;
}

// Direction for ordering results
type OrderDirection = "asc" | "desc";

// Filter operators
type FilterOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "is";

// Filter value type
type FilterValue = string | number | boolean | null | string[];

// Single operator filter condition
interface OperatorFilter {
  eq?: FilterValue;
  neq?: FilterValue;
  gt?: number | string;
  gte?: number | string;
  lt?: number | string;
  lte?: number | string;
  like?: string;
  ilike?: string;
  in?: string[] | number[];
  is?: boolean | null;
  not?: OperatorFilter; // For negation
}

// Combined type for possible filter inputs
type FilterCondition = 
  | FilterValue           // Simple value = equality filter
  | OperatorFilter;       // Complex operator-based filter

// Query options for table operations
interface QueryOptions {
  id?: string;
  order?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, FilterCondition>;
}

type FieldTypeToTS<T extends FieldType> =
  T extends "string" ? string :
  T extends "boolean" ? boolean :
  T extends "number" ? number :
  T extends "json" ? Record<string, any> : never;

export type TableData<T extends TableSchema> = {
  id: string;
  created_at: string;
} & {
  [K in keyof T["fields"]]: T["fields"][K] extends { type: FieldType } ? FieldTypeToTS<T["fields"][K]["type"]> : never;
};

// --- Schema Helper ---
// Constraint for the input schema to ensure it has the basic shape.
// T_SpecificSchema itself will be more specific due to 'as const'.
type ValidSchemaInput = {
  project_id: string;
  version: number;
  tables: Record<string, TableSchema>; // This means T_SpecificSchema.tables must be assignable to this
};

export function createSchema<T_SpecificSchema extends ValidSchemaInput>(
  schema: T_SpecificSchema
): T_SpecificSchema {
  // Detailed runtime validation
  if (typeof schema.project_id !== 'string' || schema.project_id.trim() === '') {
    throw new Error('Invalid schema: project_id must be a non-empty string.');
  }
  if (typeof schema.version !== 'number') {
    throw new Error('Invalid schema: version must be a number.');
  }
  if (typeof schema.tables !== 'object' || schema.tables === null || Object.keys(schema.tables).length === 0) {
    throw new Error('Invalid schema: tables must be a non-empty object.');
  }

  for (const tableName in schema.tables) {
    const table = schema.tables[tableName];
    if (typeof table !== 'object' || table === null) {
        throw new Error(`Invalid schema: table '${tableName}' is not an object.`);
    }
    if (typeof table.fields !== 'object' || table.fields === null || Object.keys(table.fields).length === 0) {
      throw new Error(`Invalid schema for table '${tableName}': fields must be a non-empty object.`);
    }
    for (const fieldName in table.fields) {
      const field = table.fields[fieldName];
      if (typeof field !== 'object' || field === null) {
        throw new Error(`Invalid schema for table '${tableName}', field '${fieldName}': is not an object.`);
      }
      const validTypes: FieldType[] = ["string", "boolean", "number", "json"];
      if (typeof field.type !== 'string' || !validTypes.includes(field.type as FieldType)) {
        throw new Error(`Invalid schema for table '${tableName}', field '${fieldName}': type must be one of "string", "boolean", "number", "json".`);
      }
      if (field.indexed !== undefined && typeof field.indexed !== 'boolean') {
         throw new Error(`Invalid schema for table '${tableName}', field '${fieldName}': optional 'indexed' property must be a boolean.`);
      }
    }
  }
  return schema;
}

interface SDKConfig<S extends DBSchema> {
  project_id: string;
  token?: string;
  getToken?: () => Promise<string>;
  baseUrl?: string;
  schema: S;
}

// Add custom error class at the top of the file
class DBError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DBError';
  }
}

// --- Query Builder ---
class QueryBuilder<T> {
  private params: QueryOptions = {};
  
  constructor(
    private tableClient: TableClient<T>,
    private tableSchema?: TableSchema
  ) {}
  
  // Reserved fields that are always allowed
  private reservedFields = ["created_at", "updated_at", "id"];
  
  // Validate field existence in schema
  private validateField(field: string): void {
    if (this.tableSchema && !this.reservedFields.includes(field)) {
      if (!this.tableSchema.fields || !(field in this.tableSchema.fields)) {
        throw new Error(`Invalid field: "${field}". Field does not exist in table schema.`);
      }
    }
  }
  
  // Validate operator based on field type
  private validateOperator(field: string, operator: FilterOperator, value: FilterValue): void {
    if (!this.tableSchema || this.reservedFields.includes(field)) {
      return; // Skip validation for reserved fields
    }
    
    const fieldInfo = this.tableSchema.fields[field];
    if (!fieldInfo) return; // Already validated by validateField
    
    // Type checking based on operator and field type
    switch (operator) {
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
        if (fieldInfo.type !== 'number' && fieldInfo.type !== 'string') {
          throw new Error(`Operator "${operator}" can only be used with number or string fields. Field "${field}" is type "${fieldInfo.type}".`);
        }
        break;
      case 'like':
      case 'ilike':
        if (fieldInfo.type !== 'string') {
          throw new Error(`Operator "${operator}" can only be used with string fields. Field "${field}" is type "${fieldInfo.type}".`);
        }
        if (typeof value !== 'string') {
          throw new Error(`Operator "${operator}" requires a string value. Received: ${typeof value}`);
        }
        break;
      case 'in':
        if (!Array.isArray(value)) {
          throw new Error(`Operator "in" requires an array value. Received: ${typeof value}`);
        }
        break;
      case 'is':
        if (value !== null && typeof value !== 'boolean') {
          throw new Error(`Operator "is" requires null or boolean. Received: ${typeof value}`);
        }
        break;
    }
  }
  
  // Add ordering to query with schema validation
  order(field: string, direction: OrderDirection = "asc"): QueryBuilder<T> {
    // Validate field
    this.validateField(field);
    
    this.params.order = `${field}.${direction}`;
    return this;
  }
  
  // Add filtering to query
  filter(conditions: Record<string, FilterCondition>): QueryBuilder<T> {
    if (!this.params.filters) {
      this.params.filters = {};
    }
    
    // Process each filter condition
    for (const [field, condition] of Object.entries(conditions)) {
      // Validate field
      this.validateField(field);
      
      // Process based on condition type
      if (condition === null || typeof condition !== 'object') {
        // Simple equality filter (or is.null/is.true/is.false for special values)
        this.params.filters[field] = condition;
      } else {
        // Complex filter with operators
        this.params.filters[field] = condition;
      }
    }
    
    return this;
  }
  
  // Add limit to query
  limit(count: number): QueryBuilder<T> {
    this.params.limit = count;
    return this;
  }
  
  // Add offset to query for pagination
  offset(count: number): QueryBuilder<T> {
    this.params.offset = count;
    return this;
  }
  
  // Auto-execute when awaited
  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null, 
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.tableClient.executeQuery(this.params).then(onfulfilled, onrejected);
  }
  
  // Auto-execute when awaited with catch
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T[] | TResult> {
    return this.tableClient.executeQuery(this.params).catch(onrejected);
  }
  
  // Auto-execute when awaited with finally
  finally(
    onfinally?: (() => void) | null
  ): Promise<T[]> {
    return this.tableClient.executeQuery(this.params).finally(onfinally);
  }
}

// --- Table Client ---
class TableClient<T> {
  private tableSchema?: TableSchema;
  
  constructor(
    private baseUrl: string,
    private projectId: string,
    private token: string,
    private table: string,
    private getToken: () => Promise<string>,
    private schema?: DBSchema
  ) {
    // Store the table schema for validation
    if (schema && schema.tables && schema.tables[table]) {
      this.tableSchema = schema.tables[table];
    }
  }

  private async headers() {
    const token = await this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  private async handleRequest<T>(request: Promise<Response>): Promise<T> {
    try {
      // console.log('Making request to:', this.baseUrl);
      // console.log('Headers:', await this.headers());
      // console.log('Project ID:', this.projectId);
      // console.log('Table:', this.table);
      
      const res = await request;
      
      // console.log("Response status:", res.status);
      // console.log("Response headers:", res.headers);
      
      // First check if the response is OK
      if (!res.ok) {
        let errorMessage = `Request failed with status ${res.status}`;
        let errorData;
        
        try {
          const json = await res.json();
          errorData = json;
          // Format the error message more clearly
          if (json.error || json.message) {
            const errorDetails = typeof json.error === 'object' ? JSON.stringify(json.error) : json.error;
            const messageDetails = typeof json.message === 'object' ? JSON.stringify(json.message) : json.message;
            errorMessage = `${res.status} ${res.statusText}: ${messageDetails || errorDetails || 'Unknown error'}`;
          }
        } catch (e) {
          console.log("Failed to parse error response:", e);
          // If we can't parse JSON, use the status text
          errorMessage = `${res.status} ${res.statusText}`;
        }

        throw new DBError(
          errorMessage,
          res.status,
          errorData
        );
      }

      // If response is OK, parse and return the data
      const json = await res.json();
      return json.data;
    } catch (error) {
      console.log("Caught error:", error);
      if (error instanceof Error) {
        console.log("Error type:", error.constructor.name);
        console.log("Error stack:", error.stack);
      }
      
      if (error instanceof DBError) {
        throw error;
      }
      
      if (error instanceof TypeError && error.message === 'Network request failed') {
        throw new DBError(
          'Network request failed. Please check your internet connection and try again.',
          undefined,
          undefined,
          error
        );
      }

      throw new DBError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Build query string from query options
  private buildQueryParams(query?: QueryOptions): string {
    if (!query) return "";
    
    const params: string[] = [];
    
    // Add id filter if provided
    if (query.id) {
      params.push(`id=${query.id}`);
    }
    
    // Add filter conditions
    if (query.filters) {
      for (const [field, condition] of Object.entries(query.filters)) {
        this.addFilterParam(params, field, condition);
      }
    }
    
    // Add ordering if provided
    if (query.order) {
      params.push(`order=${query.order}`);
    }
    
    // Add limit if provided
    if (query.limit !== undefined && query.limit >= 0) {
      params.push(`limit=${query.limit}`);
    }
    
    // Add offset if provided
    if (query.offset !== undefined && query.offset >= 0) {
      params.push(`offset=${query.offset}`);
    }
    
    return params.length > 0 ? `?${params.join('&')}` : "";
  }
  
  // Helper method to build filter parameters
  private addFilterParam(params: string[], field: string, condition: FilterCondition, negate: boolean = false): void {
    // Handle simple values (direct equality)
    if (condition === null || typeof condition !== 'object') {
      if (condition === null) {
        params.push(`${field}=${negate ? 'not.' : ''}is.null`);
      } else if (typeof condition === 'boolean') {
        params.push(`${field}=${negate ? 'not.' : ''}is.${condition}`);
      } else if (typeof condition === 'number') {
        params.push(`${field}=${negate ? 'not.' : ''}eq.${condition}`);
      } else {
        // String values
        params.push(`${field}=${negate ? 'not.' : ''}eq.${encodeURIComponent(String(condition))}`);
      }
      return;
    }
    
    // Handle OperatorFilter object
    const operatorObj = condition as OperatorFilter;
    
    // Handle negation wrapper
    if (operatorObj.not) {
      this.addFilterParam(params, field, operatorObj.not, true);
      return;
    }
    
    // Process each operator
    for (const [op, value] of Object.entries(operatorObj)) {
      // Skip 'not' since we handled it above
      if (op === 'not') continue;
      
      const operator = op as FilterOperator;
      
      if (value === null) {
        params.push(`${field}=${negate ? 'not.' : ''}is.null`);
      } else if (operator === 'in' && Array.isArray(value)) {
        params.push(`${field}=${negate ? 'not.' : ''}in.${value.join(',')}`);
      } else if (operator === 'is') {
        if (typeof value === 'boolean') {
          params.push(`${field}=${negate ? 'not.' : ''}is.${value}`);
        } else {
          params.push(`${field}=${negate ? 'not.' : ''}is.null`);
        }
      } else {
        // All other operators
        const paramValue = typeof value === 'string' 
          ? encodeURIComponent(value) 
          : String(value);
        params.push(`${field}=${negate ? 'not.' : ''}${operator}.${paramValue}`);
      }
    }
  }

  // Internal method to execute a query with options
  async executeQuery(options?: QueryOptions): Promise<T[]> {
    const params = this.buildQueryParams(options);
    const headers = await this.headers();
    // console.log(headers);
    return this.handleRequest(
      fetch(`${this.baseUrl}/account/${this.projectId}/db/${this.table}${params}`, {
        headers
      })
    );
  }

  // Public method to start building a query
  getAll(): QueryBuilder<T> {
    return new QueryBuilder<T>(this, this.tableSchema);
  }

  // Get a specific item by ID
  async get(id: string): Promise<T> {
    const headers = await this.headers();
    return this.handleRequest(
      fetch(`${this.baseUrl}/account/${this.projectId}/db/${this.table}/${id}`, {
        headers
      })
    );
  }

  async create(value: Partial<T>): Promise<T> {
    const headers = await this.headers();
    return this.handleRequest(
      fetch(`${this.baseUrl}/account/${this.projectId}/db/${this.table}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ value })
      })
    );
  }

  async update(id: string, value: Partial<T>): Promise<T> {
    const headers = await this.headers();
    return this.handleRequest(
      fetch(`${this.baseUrl}/account/${this.projectId}/db/${this.table}/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ value })
      })
    );
  }

  async replace(id: string, value: Partial<T>): Promise<T> {
    const headers = await this.headers();
    return this.handleRequest(
      fetch(`${this.baseUrl}/account/${this.projectId}/db/${this.table}/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ value })
      })
    );
  }

  async delete(id: string): Promise<T> {
    const token = await this.getToken();
    const headers = {
      Authorization: `Bearer ${token}`
    };
    return this.handleRequest(
      fetch(`${this.baseUrl}/account/${this.projectId}/db/${this.table}/${id}`, {
        method: "DELETE",
        headers
      })
    );
  }
}

// --- Main SDK ---
export class BasicDBSDK<S extends DBSchema> {
  private projectId: string;
  private getToken: () => Promise<string>;
  private baseUrl: string;
  private schema: S;
  private tableNames: (keyof S["tables"] & string)[];

  constructor(config: SDKConfig<S>) {
    this.projectId = config.project_id;
    
    // Handle either static token or token getter function
    if (config.getToken) {
      this.getToken = config.getToken;
    } else if (config.token) {
      this.getToken = async () => config.token!;
    } else {
      throw new Error('Either token or getToken must be provided');
    }
    
    this.baseUrl = config.baseUrl || "https://api.basic.tech";
    this.schema = config.schema;
    this.tableNames = Object.keys(this.schema.tables) as (keyof S["tables"] & string)[];
  }

  // Primary method - table access
  table<K extends keyof S["tables"] & string>(
    name: K
  ): TableClient<TableData<S["tables"][K]>> {
    // Validate table name at runtime
    if (!this.tableNames.includes(name)) {
      throw new Error(`Table '${name}' not found in schema. Available tables: ${this.tableNames.join(', ')}`);
    }
    
    // Create a wrapped client that will get a fresh token for each request
    return new TableClient(
      this.baseUrl,
      this.projectId,
      "",  // Empty placeholder, will be replaced in headers() method
      name,
      this.getToken,
      this.schema  // Pass the entire schema to the TableClient
    );
  }


  get tables(): {
    [K in keyof S["tables"]]: TableData<S["tables"][K]>;
  } {
    return {} as any;
  }

  fields<K extends keyof S["tables"] & string>(
    table: K
  ): (keyof S["tables"][K]["fields"] & string)[] {
    const tableSchema = this.schema.tables[table];
    if (!tableSchema) {
      throw new Error(`Table '${table}' not found in schema`);
    }
    return Object.keys(tableSchema.fields) as (keyof S["tables"][K]["fields"] & string)[];
  }
}
