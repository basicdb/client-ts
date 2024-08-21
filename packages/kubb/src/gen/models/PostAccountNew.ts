/**
 * @description successful
*/
export type PostAccountNew200 = any;
/**
 * @description authorization failed
*/
export type PostAccountNew401 = any;
/**
 * @description validation failed
*/
export type PostAccountNew422 = any;
/**
 * @description unknown server error
*/
export type PostAccountNew500 = any;
export type PostAccountNewMutationRequest = object;
export type PostAccountNewMutationResponse = any;
export type PostAccountNewMutation = {
    Response: PostAccountNewMutationResponse;
    Request: PostAccountNewMutationRequest;
    Errors: PostAccountNew401 | PostAccountNew422 | PostAccountNew500;
};