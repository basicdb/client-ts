/**
 * @description successful
*/
export type GetAuthUserinfo200 = any;
/**
 * @description authorization failed
*/
export type GetAuthUserinfo401 = any;
/**
 * @description validation failed
*/
export type GetAuthUserinfo422 = any;
/**
 * @description unknown server error
*/
export type GetAuthUserinfo500 = any;
export type GetAuthUserinfoQueryResponse = any;
export type GetAuthUserinfoQuery = {
    Response: GetAuthUserinfoQueryResponse;
    Errors: GetAuthUserinfo401 | GetAuthUserinfo422 | GetAuthUserinfo500;
};