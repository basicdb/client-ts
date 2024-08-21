/**
 * @description successful
*/
export type GetAccountProjects200 = any;
/**
 * @description authorization failed
*/
export type GetAccountProjects401 = any;
/**
 * @description validation failed
*/
export type GetAccountProjects422 = any;
/**
 * @description unknown server error
*/
export type GetAccountProjects500 = any;
export type GetAccountProjectsQueryResponse = any;
export type GetAccountProjectsQuery = {
    Response: GetAccountProjectsQueryResponse;
    Errors: GetAccountProjects401 | GetAccountProjects422 | GetAccountProjects500;
};