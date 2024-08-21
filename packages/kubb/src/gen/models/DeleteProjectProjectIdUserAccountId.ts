export type DeleteProjectProjectIdUserAccountIdPathParams = {
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
export type DeleteProjectProjectIdUserAccountId200 = any;
/**
 * @description authorization failed
*/
export type DeleteProjectProjectIdUserAccountId401 = any;
/**
 * @description validation failed
*/
export type DeleteProjectProjectIdUserAccountId422 = any;
/**
 * @description unknown server error
*/
export type DeleteProjectProjectIdUserAccountId500 = any;
export type DeleteProjectProjectIdUserAccountIdMutationRequest = object;
export type DeleteProjectProjectIdUserAccountIdMutationResponse = any;
export type DeleteProjectProjectIdUserAccountIdMutation = {
    Response: DeleteProjectProjectIdUserAccountIdMutationResponse;
    Request: DeleteProjectProjectIdUserAccountIdMutationRequest;
    PathParams: DeleteProjectProjectIdUserAccountIdPathParams;
    Errors: DeleteProjectProjectIdUserAccountId401 | DeleteProjectProjectIdUserAccountId422 | DeleteProjectProjectIdUserAccountId500;
};