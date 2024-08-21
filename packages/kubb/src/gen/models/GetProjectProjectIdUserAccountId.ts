export type GetProjectProjectIdUserAccountIdPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
    /**
     * @description The ID of the account
     * @type string
    */
    account_id: string;
};
/**
 * @description successful
*/
export type GetProjectProjectIdUserAccountId200 = any;
/**
 * @description authorization failed
*/
export type GetProjectProjectIdUserAccountId401 = any;
/**
 * @description validation failed
*/
export type GetProjectProjectIdUserAccountId422 = any;
/**
 * @description unknown server error
*/
export type GetProjectProjectIdUserAccountId500 = any;
export type GetProjectProjectIdUserAccountIdQueryResponse = any;
export type GetProjectProjectIdUserAccountIdQuery = {
    Response: GetProjectProjectIdUserAccountIdQueryResponse;
    PathParams: GetProjectProjectIdUserAccountIdPathParams;
    Errors: GetProjectProjectIdUserAccountId401 | GetProjectProjectIdUserAccountId422 | GetProjectProjectIdUserAccountId500;
};