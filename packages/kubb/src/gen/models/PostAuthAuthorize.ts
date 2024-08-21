export type PostAuthAuthorizeQueryParams = {
    /**
     * @type string | undefined
    */
    ""?: string;
};
/**
 * @description successful
*/
export type PostAuthAuthorize200 = any;
/**
 * @description authorization failed
*/
export type PostAuthAuthorize401 = any;
/**
 * @description validation failed
*/
export type PostAuthAuthorize422 = any;
/**
 * @description unknown server error
*/
export type PostAuthAuthorize500 = any;
export type PostAuthAuthorizeMutationRequest = object;
export type PostAuthAuthorizeMutationResponse = any;
export type PostAuthAuthorizeMutation = {
    Response: PostAuthAuthorizeMutationResponse;
    Request: PostAuthAuthorizeMutationRequest;
    QueryParams: PostAuthAuthorizeQueryParams;
    Errors: PostAuthAuthorize401 | PostAuthAuthorize422 | PostAuthAuthorize500;
};