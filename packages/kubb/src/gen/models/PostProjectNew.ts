/**
 * @description successful
*/
export type PostProjectNew200 = any;
/**
 * @description authorization failed
*/
export type PostProjectNew401 = any;
/**
 * @description validation failed
*/
export type PostProjectNew422 = any;
/**
 * @description unknown server error
*/
export type PostProjectNew500 = any;
export type PostProjectNewMutationRequest = {
    /**
     * @type string | undefined
    */
    name?: string;
    /**
     * @type string | undefined
    */
    slug?: string;
};
export type PostProjectNewMutationResponse = any;
export type PostProjectNewMutation = {
    Response: PostProjectNewMutationResponse;
    Request: PostProjectNewMutationRequest;
    Errors: PostProjectNew401 | PostProjectNew422 | PostProjectNew500;
};