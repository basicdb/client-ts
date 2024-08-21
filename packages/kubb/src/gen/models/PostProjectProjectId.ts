export type PostProjectProjectIdPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
};
/**
 * @description successful
*/
export type PostProjectProjectId200 = any;
/**
 * @description authorization failed
*/
export type PostProjectProjectId401 = any;
/**
 * @description validation failed
*/
export type PostProjectProjectId422 = any;
/**
 * @description unknown server error
*/
export type PostProjectProjectId500 = any;
export type PostProjectProjectIdMutationRequest = {
    /**
     * @type object | undefined
    */
    data?: object;
};
export type PostProjectProjectIdMutationResponse = any;
export type PostProjectProjectIdMutation = {
    Response: PostProjectProjectIdMutationResponse;
    Request: PostProjectProjectIdMutationRequest;
    PathParams: PostProjectProjectIdPathParams;
    Errors: PostProjectProjectId401 | PostProjectProjectId422 | PostProjectProjectId500;
};