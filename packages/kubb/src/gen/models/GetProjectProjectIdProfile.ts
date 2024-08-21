export type GetProjectProjectIdProfilePathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
};
/**
 * @description successful
*/
export type GetProjectProjectIdProfile200 = any;
/**
 * @description authorization failed
*/
export type GetProjectProjectIdProfile401 = any;
/**
 * @description validation failed
*/
export type GetProjectProjectIdProfile422 = any;
/**
 * @description unknown server error
*/
export type GetProjectProjectIdProfile500 = any;
export type GetProjectProjectIdProfileQueryResponse = any;
export type GetProjectProjectIdProfileQuery = {
    Response: GetProjectProjectIdProfileQueryResponse;
    PathParams: GetProjectProjectIdProfilePathParams;
    Errors: GetProjectProjectIdProfile401 | GetProjectProjectIdProfile422 | GetProjectProjectIdProfile500;
};