/**
 * @description successful
*/
export type GetAccountVerify200 = any;
/**
 * @description authorization failed
*/
export type GetAccountVerify401 = any;
/**
 * @description validation failed
*/
export type GetAccountVerify422 = any;
/**
 * @description unknown server error
*/
export type GetAccountVerify500 = any;
export type GetAccountVerifyQueryResponse = any;
export type GetAccountVerifyQuery = {
    Response: GetAccountVerifyQueryResponse;
    Errors: GetAccountVerify401 | GetAccountVerify422 | GetAccountVerify500;
};