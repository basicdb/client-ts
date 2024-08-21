export type PatchAccountProjectIdDbTableNameItemIdPathParams = {
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
     * @description The ID of the item to update
     * @type string
    */
    item_id: string;
};
/**
 * @description successful
*/
export type PatchAccountProjectIdDbTableNameItemId200 = any;
/**
 * @description authorization failed
*/
export type PatchAccountProjectIdDbTableNameItemId401 = any;
/**
 * @description validation failed
*/
export type PatchAccountProjectIdDbTableNameItemId422 = any;
/**
 * @description unknown server error
*/
export type PatchAccountProjectIdDbTableNameItemId500 = any;
export type PatchAccountProjectIdDbTableNameItemIdMutationRequest = {
    /**
     * @type object | undefined
    */
    value?: object;
};
export type PatchAccountProjectIdDbTableNameItemIdMutationResponse = any;
export type PatchAccountProjectIdDbTableNameItemIdMutation = {
    Response: PatchAccountProjectIdDbTableNameItemIdMutationResponse;
    Request: PatchAccountProjectIdDbTableNameItemIdMutationRequest;
    PathParams: PatchAccountProjectIdDbTableNameItemIdPathParams;
    Errors: PatchAccountProjectIdDbTableNameItemId401 | PatchAccountProjectIdDbTableNameItemId422 | PatchAccountProjectIdDbTableNameItemId500;
};