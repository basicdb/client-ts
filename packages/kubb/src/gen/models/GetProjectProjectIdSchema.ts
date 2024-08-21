export type GetProjectProjectIdSchemaPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
};
/**
 * @description successful
*/
export type GetProjectProjectIdSchema200 = any;
/**
 * @description authorization failed
*/
export type GetProjectProjectIdSchema401 = any;
/**
 * @description validation failed
*/
export type GetProjectProjectIdSchema422 = any;
/**
 * @description unknown server error
*/
export type GetProjectProjectIdSchema500 = any;
export type GetProjectProjectIdSchemaQueryResponse = any;
export type GetProjectProjectIdSchemaQuery = {
    Response: GetProjectProjectIdSchemaQueryResponse;
    PathParams: GetProjectProjectIdSchemaPathParams;
    Errors: GetProjectProjectIdSchema401 | GetProjectProjectIdSchema422 | GetProjectProjectIdSchema500;
};