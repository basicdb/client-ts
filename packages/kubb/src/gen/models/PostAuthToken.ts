/**
 * @description successful
*/
export type PostAuthToken200 = any;
/**
 * @description authorization failed
*/
export type PostAuthToken401 = any;
/**
 * @description validation failed
*/
export type PostAuthToken422 = any;
/**
 * @description unknown server error
*/
export type PostAuthToken500 = any;
export type PostAuthTokenMutationRequest = {
    /**
     * @type string | undefined
    */
    code?: string;
};
export type PostAuthTokenMutationResponse = any;
export type PostAuthTokenMutation = {
    Response: PostAuthTokenMutationResponse;
    Request: PostAuthTokenMutationRequest;
    Errors: PostAuthToken401 | PostAuthToken422 | PostAuthToken500;
};