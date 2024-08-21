export type GetAccountProjectIdDbTableNamePathParams = {
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
export type GetAccountProjectIdDbTableNameQueryParams = {
    /**
     * @type string | undefined
    */
    id?: string;
};
/**
 * @description successful
*/
export type GetAccountProjectIdDbTableName200 = any;
/**
 * @description authorization failed
*/
export type GetAccountProjectIdDbTableName401 = any;
/**
 * @description validation failed
*/
export type GetAccountProjectIdDbTableName422 = any;
/**
 * @description unknown server error
*/
export type GetAccountProjectIdDbTableName500 = any;
export type GetAccountProjectIdDbTableNameQueryResponse = any;
export type GetAccountProjectIdDbTableNameQuery = {
    Response: GetAccountProjectIdDbTableNameQueryResponse;
    PathParams: GetAccountProjectIdDbTableNamePathParams;
    QueryParams: GetAccountProjectIdDbTableNameQueryParams;
    Errors: GetAccountProjectIdDbTableName401 | GetAccountProjectIdDbTableName422 | GetAccountProjectIdDbTableName500;
};