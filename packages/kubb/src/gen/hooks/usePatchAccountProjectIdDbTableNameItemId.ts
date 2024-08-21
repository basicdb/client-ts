import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PatchAccountProjectIdDbTableNameItemIdMutationRequest, PatchAccountProjectIdDbTableNameItemIdMutationResponse, PatchAccountProjectIdDbTableNameItemIdPathParams, PatchAccountProjectIdDbTableNameItemId401, PatchAccountProjectIdDbTableNameItemId422, PatchAccountProjectIdDbTableNameItemId500 } from "../models/PatchAccountProjectIdDbTableNameItemId";

 type PatchAccountProjectIdDbTableNameItemIdClient = typeof client<PatchAccountProjectIdDbTableNameItemIdMutationResponse, PatchAccountProjectIdDbTableNameItemId401 | PatchAccountProjectIdDbTableNameItemId422 | PatchAccountProjectIdDbTableNameItemId500, PatchAccountProjectIdDbTableNameItemIdMutationRequest>;
type PatchAccountProjectIdDbTableNameItemId = {
    data: PatchAccountProjectIdDbTableNameItemIdMutationResponse;
    error: PatchAccountProjectIdDbTableNameItemId401 | PatchAccountProjectIdDbTableNameItemId422 | PatchAccountProjectIdDbTableNameItemId500;
    request: PatchAccountProjectIdDbTableNameItemIdMutationRequest;
    pathParams: PatchAccountProjectIdDbTableNameItemIdPathParams;
    queryParams: never;
    headerParams: never;
    response: PatchAccountProjectIdDbTableNameItemIdMutationResponse;
    client: {
        parameters: Partial<Parameters<PatchAccountProjectIdDbTableNameItemIdClient>[0]>;
        return: Awaited<ReturnType<PatchAccountProjectIdDbTableNameItemIdClient>>;
    };
};
/**
 * @description Update a specific item in a table within a project.
 * @summary Update Item
 * @link /account/:project_id/db/:table_name/:item_id
 */
export function usePatchAccountProjectIdDbTableNameItemId(projectId: PatchAccountProjectIdDbTableNameItemIdPathParams["project_id"], tableName: PatchAccountProjectIdDbTableNameItemIdPathParams["table_name"], itemId: PatchAccountProjectIdDbTableNameItemIdPathParams["item_id"], options?: {
    mutation?: SWRMutationConfiguration<PatchAccountProjectIdDbTableNameItemId["response"], PatchAccountProjectIdDbTableNameItemId["error"]>;
    client?: PatchAccountProjectIdDbTableNameItemId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PatchAccountProjectIdDbTableNameItemId["response"], PatchAccountProjectIdDbTableNameItemId["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/${projectId}/db/${tableName}/${itemId}` as const;
    return useSWRMutation<PatchAccountProjectIdDbTableNameItemId["response"], PatchAccountProjectIdDbTableNameItemId["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PatchAccountProjectIdDbTableNameItemId["data"], PatchAccountProjectIdDbTableNameItemId["error"], PatchAccountProjectIdDbTableNameItemId["request"]>({
            method: "patch",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}