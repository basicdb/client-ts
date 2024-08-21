/**
 * @description successful
*/
export type GetAccountApps200 = any;
/**
 * @description authorization failed
*/
export type GetAccountApps401 = any;
/**
 * @description validation failed
*/
export type GetAccountApps422 = any;
/**
 * @description unknown server error
*/
export type GetAccountApps500 = any;
export type GetAccountAppsQueryResponse = any;
export type GetAccountAppsQuery = {
    Response: GetAccountAppsQueryResponse;
    Errors: GetAccountApps401 | GetAccountApps422 | GetAccountApps500;
};