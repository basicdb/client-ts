export type GetProjectProjectIdPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
};
/**
 * @description successful
*/
export type GetProjectProjectId200 = any;
/**
 * @description authorization failed
*/
export type GetProjectProjectId401 = any;
/**
 * @description validation failed
*/
export type GetProjectProjectId422 = any;
/**
 * @description unknown server error
*/
export type GetProjectProjectId500 = any;
export type GetProjectProjectIdQueryResponse = any;
export type GetProjectProjectIdQuery = {
    Response: GetProjectProjectIdQueryResponse;
    PathParams: GetProjectProjectIdPathParams;
    Errors: GetProjectProjectId401 | GetProjectProjectId422 | GetProjectProjectId500;
};