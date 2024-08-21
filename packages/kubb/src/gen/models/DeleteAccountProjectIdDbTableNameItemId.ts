export type DeleteAccountProjectIdDbTableNameItemIdPathParams = {
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
     * @description The ID of the item to be deleted
     * @type string
    */
    item_id: string;
};
/**
 * @description successful
*/
export type DeleteAccountProjectIdDbTableNameItemId200 = any;
/**
 * @description authorization failed
*/
export type DeleteAccountProjectIdDbTableNameItemId401 = any;
/**
 * @description validation failed
*/
export type DeleteAccountProjectIdDbTableNameItemId422 = any;
/**
 * @description unknown server error
*/
export type DeleteAccountProjectIdDbTableNameItemId500 = any;
export type DeleteAccountProjectIdDbTableNameItemIdMutationResponse = any;
export type DeleteAccountProjectIdDbTableNameItemIdMutation = {
    Response: DeleteAccountProjectIdDbTableNameItemIdMutationResponse;
    PathParams: DeleteAccountProjectIdDbTableNameItemIdPathParams;
    Errors: DeleteAccountProjectIdDbTableNameItemId401 | DeleteAccountProjectIdDbTableNameItemId422 | DeleteAccountProjectIdDbTableNameItemId500;
};