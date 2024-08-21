import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { DeleteAccountProjectIdDbTableNameItemIdMutationResponse, DeleteAccountProjectIdDbTableNameItemIdPathParams, DeleteAccountProjectIdDbTableNameItemId401, DeleteAccountProjectIdDbTableNameItemId422, DeleteAccountProjectIdDbTableNameItemId500 } from "../models/DeleteAccountProjectIdDbTableNameItemId";

 type DeleteAccountProjectIdDbTableNameItemIdClient = typeof client<DeleteAccountProjectIdDbTableNameItemIdMutationResponse, DeleteAccountProjectIdDbTableNameItemId401 | DeleteAccountProjectIdDbTableNameItemId422 | DeleteAccountProjectIdDbTableNameItemId500, never>;
type DeleteAccountProjectIdDbTableNameItemId = {
    data: DeleteAccountProjectIdDbTableNameItemIdMutationResponse;
    error: DeleteAccountProjectIdDbTableNameItemId401 | DeleteAccountProjectIdDbTableNameItemId422 | DeleteAccountProjectIdDbTableNameItemId500;
    request: never;
    pathParams: DeleteAccountProjectIdDbTableNameItemIdPathParams;
    queryParams: never;
    headerParams: never;
    response: DeleteAccountProjectIdDbTableNameItemIdMutationResponse;
    client: {
        parameters: Partial<Parameters<DeleteAccountProjectIdDbTableNameItemIdClient>[0]>;
        return: Awaited<ReturnType<DeleteAccountProjectIdDbTableNameItemIdClient>>;
    };
};
/**
 * @description Delete a specific item from a table within a project.
 * @summary Del Item
 * @link /account/:project_id/db/:table_name/:item_id
 */
export function useDeleteAccountProjectIdDbTableNameItemId(projectId: DeleteAccountProjectIdDbTableNameItemIdPathParams["project_id"], tableName: DeleteAccountProjectIdDbTableNameItemIdPathParams["table_name"], itemId: DeleteAccountProjectIdDbTableNameItemIdPathParams["item_id"], options?: {
    mutation?: SWRMutationConfiguration<DeleteAccountProjectIdDbTableNameItemId["response"], DeleteAccountProjectIdDbTableNameItemId["error"]>;
    client?: DeleteAccountProjectIdDbTableNameItemId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<DeleteAccountProjectIdDbTableNameItemId["response"], DeleteAccountProjectIdDbTableNameItemId["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/${projectId}/db/${tableName}/${itemId}` as const;
    return useSWRMutation<DeleteAccountProjectIdDbTableNameItemId["response"], DeleteAccountProjectIdDbTableNameItemId["error"], typeof url | null>(shouldFetch ? url : null, async (_url) => {
        const res = await client<DeleteAccountProjectIdDbTableNameItemId["data"], DeleteAccountProjectIdDbTableNameItemId["error"]>({
            method: "delete",
            url,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}