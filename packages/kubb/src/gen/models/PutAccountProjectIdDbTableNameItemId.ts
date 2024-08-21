export type PutAccountProjectIdDbTableNameItemIdPathParams = {
    /**
     * @description The ID of the project
     * @type string
    */
    project_id: string;
    /**
     * @description The name of the table
     * @type string
    */
    table_name: string;
    /**
     * @description The ID of the item to be replaced
     * @type string
    */
    item_id: string;
};
/**
 * @description successful
*/
export type PutAccountProjectIdDbTableNameItemId200 = any;
/**
 * @description authorization failed
*/
export type PutAccountProjectIdDbTableNameItemId401 = any;
/**
 * @description validation failed
*/
export type PutAccountProjectIdDbTableNameItemId422 = any;
/**
 * @description unknown server error
*/
export type PutAccountProjectIdDbTableNameItemId500 = any;
export type PutAccountProjectIdDbTableNameItemIdMutationRequest = {
    /**
     * @type object | undefined
    */
    value?: object;
};
export type PutAccountProjectIdDbTableNameItemIdMutationResponse = any;
export type PutAccountProjectIdDbTableNameItemIdMutation = {
    Response: PutAccountProjectIdDbTableNameItemIdMutationResponse;
    Request: PutAccountProjectIdDbTableNameItemIdMutationRequest;
    PathParams: PutAccountProjectIdDbTableNameItemIdPathParams;
    Errors: PutAccountProjectIdDbTableNameItemId401 | PutAccountProjectIdDbTableNameItemId422 | PutAccountProjectIdDbTableNameItemId500;
};