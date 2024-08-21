/**
 * @description successful
*/
export type GetAccount200 = any;
/**
 * @description authorization failed
*/
export type GetAccount401 = any;
/**
 * @description validation failed
*/
export type GetAccount422 = any;
/**
 * @description unknown server error
*/
export type GetAccount500 = any;
export type GetAccountQueryResponse = any;
export type GetAccountQuery = {
    Response: GetAccountQueryResponse;
    Errors: GetAccount401 | GetAccount422 | GetAccount500;
};