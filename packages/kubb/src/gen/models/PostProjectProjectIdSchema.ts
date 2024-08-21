export type PostProjectProjectIdSchemaPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
};
/**
 * @description successful
*/
export type PostProjectProjectIdSchema200 = any;
/**
 * @description authorization failed
*/
export type PostProjectProjectIdSchema401 = any;
/**
 * @description validation failed
*/
export type PostProjectProjectIdSchema422 = any;
/**
 * @description unknown server error
*/
export type PostProjectProjectIdSchema500 = any;
export type PostProjectProjectIdSchemaMutationRequest = {
    /**
     * @type object | undefined
    */
    schema?: {
        /**
         * @type array | undefined
        */
        tables?: any[];
    };
};
export type PostProjectProjectIdSchemaMutationResponse = any;
export type PostProjectProjectIdSchemaMutation = {
    Response: PostProjectProjectIdSchemaMutationResponse;
    Request: PostProjectProjectIdSchemaMutationRequest;
    PathParams: PostProjectProjectIdSchemaPathParams;
    Errors: PostProjectProjectIdSchema401 | PostProjectProjectIdSchema422 | PostProjectProjectIdSchema500;
};