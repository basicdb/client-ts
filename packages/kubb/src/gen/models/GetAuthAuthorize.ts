export const getAuthAuthorizeQueryParamsResponseType = {
    "code": "code"
} as const;
export type GetAuthAuthorizeQueryParamsResponseType = (typeof getAuthAuthorizeQueryParamsResponseType)[keyof typeof getAuthAuthorizeQueryParamsResponseType];
export type GetAuthAuthorizeQueryParams = {
    /**
     * @description The response type. Must be \'code\' for the authorization code flow.
     * @type string
    */
    response_type: GetAuthAuthorizeQueryParamsResponseType;
    /**
     * @description The client identifier.
     * @type string
    */
    client_id: string;
    /**
     * @description The URI to redirect to after authorization.
     * @type string, uri
    */
    redirect_uri: string;
    /**
     * @description The scope of the access request.
     * @type string | undefined
    */
    scope?: string;
    /**
     * @description An opaque value used to maintain state between the request and callback.
     * @type string | undefined
    */
    state?: string;
};
/**
 * @description Redirect to authorization page
*/
export type GetAuthAuthorize302 = any;
/**
 * @description Bad request - invalid or missing parameters
*/
export type GetAuthAuthorize400 = any;
export type GetAuthAuthorizeQueryResponse = any;
export type GetAuthAuthorizeQuery = {
    Response: GetAuthAuthorizeQueryResponse;
    QueryParams: GetAuthAuthorizeQueryParams;
    Errors: GetAuthAuthorize400;
};