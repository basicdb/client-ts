export type PostAccountProjectIdDbTableNamePathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
    /**
     * @description The name of the table
     * @type string
    */
    table_name: string;
};
/**
 * @description successful
*/
export type PostAccountProjectIdDbTableName200 = any;
/**
 * @description authorization failed
*/
export type PostAccountProjectIdDbTableName401 = any;
/**
 * @description validation failed
*/
export type PostAccountProjectIdDbTableName422 = any;
/**
 * @description unknown server error
*/
export type PostAccountProjectIdDbTableName500 = any;
export type PostAccountProjectIdDbTableNameMutationRequest = {
    /**
     * @type object | undefined
    */
    value?: object;
};
export type PostAccountProjectIdDbTableNameMutationResponse = any;
export type PostAccountProjectIdDbTableNameMutation = {
    Response: PostAccountProjectIdDbTableNameMutationResponse;
    Request: PostAccountProjectIdDbTableNameMutationRequest;
    PathParams: PostAccountProjectIdDbTableNamePathParams;
    Errors: PostAccountProjectIdDbTableName401 | PostAccountProjectIdDbTableName422 | PostAccountProjectIdDbTableName500;
};