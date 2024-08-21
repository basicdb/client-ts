export type GetProjectProjectIdKeyPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
};
/**
 * @description successful
*/
export type GetProjectProjectIdKey200 = any;
/**
 * @description authorization failed
*/
export type GetProjectProjectIdKey401 = any;
/**
 * @description validation failed
*/
export type GetProjectProjectIdKey422 = any;
/**
 * @description unknown server error
*/
export type GetProjectProjectIdKey500 = any;
export type GetProjectProjectIdKeyQueryResponse = any;
export type GetProjectProjectIdKeyQuery = {
    Response: GetProjectProjectIdKeyQueryResponse;
    PathParams: GetProjectProjectIdKeyPathParams;
    Errors: GetProjectProjectIdKey401 | GetProjectProjectIdKey422 | GetProjectProjectIdKey500;
};