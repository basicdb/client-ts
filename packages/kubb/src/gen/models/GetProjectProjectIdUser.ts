export type GetProjectProjectIdUserPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
};
/**
 * @description successful
*/
export type GetProjectProjectIdUser200 = any;
/**
 * @description authorization failed
*/
export type GetProjectProjectIdUser401 = any;
/**
 * @description validation failed
*/
export type GetProjectProjectIdUser422 = any;
/**
 * @description unknown server error
*/
export type GetProjectProjectIdUser500 = any;
export type GetProjectProjectIdUserQueryResponse = any;
export type GetProjectProjectIdUserQuery = {
    Response: GetProjectProjectIdUserQueryResponse;
    PathParams: GetProjectProjectIdUserPathParams;
    Errors: GetProjectProjectIdUser401 | GetProjectProjectIdUser422 | GetProjectProjectIdUser500;
};