export type PostProjectProjectIdUserAccountIdPathParams = {
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
export type PostProjectProjectIdUserAccountId200 = any;
/**
 * @description authorization failed
*/
export type PostProjectProjectIdUserAccountId401 = any;
/**
 * @description validation failed
*/
export type PostProjectProjectIdUserAccountId422 = any;
/**
 * @description unknown server error
*/
export type PostProjectProjectIdUserAccountId500 = any;
export type PostProjectProjectIdUserAccountIdMutationRequest = object;
export type PostProjectProjectIdUserAccountIdMutationResponse = any;
export type PostProjectProjectIdUserAccountIdMutation = {
    Response: PostProjectProjectIdUserAccountIdMutationResponse;
    Request: PostProjectProjectIdUserAccountIdMutationRequest;
    PathParams: PostProjectProjectIdUserAccountIdPathParams;
    Errors: PostProjectProjectIdUserAccountId401 | PostProjectProjectIdUserAccountId422 | PostProjectProjectIdUserAccountId500;
};