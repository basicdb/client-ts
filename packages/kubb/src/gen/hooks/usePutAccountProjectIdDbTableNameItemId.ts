import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PutAccountProjectIdDbTableNameItemIdMutationRequest, PutAccountProjectIdDbTableNameItemIdMutationResponse, PutAccountProjectIdDbTableNameItemIdPathParams, PutAccountProjectIdDbTableNameItemId401, PutAccountProjectIdDbTableNameItemId422, PutAccountProjectIdDbTableNameItemId500 } from "../models/PutAccountProjectIdDbTableNameItemId";

 type PutAccountProjectIdDbTableNameItemIdClient = typeof client<PutAccountProjectIdDbTableNameItemIdMutationResponse, PutAccountProjectIdDbTableNameItemId401 | PutAccountProjectIdDbTableNameItemId422 | PutAccountProjectIdDbTableNameItemId500, PutAccountProjectIdDbTableNameItemIdMutationRequest>;
type PutAccountProjectIdDbTableNameItemId = {
    data: PutAccountProjectIdDbTableNameItemIdMutationResponse;
    error: PutAccountProjectIdDbTableNameItemId401 | PutAccountProjectIdDbTableNameItemId422 | PutAccountProjectIdDbTableNameItemId500;
    request: PutAccountProjectIdDbTableNameItemIdMutationRequest;
    pathParams: PutAccountProjectIdDbTableNameItemIdPathParams;
    queryParams: never;
    headerParams: never;
    response: PutAccountProjectIdDbTableNameItemIdMutationResponse;
    client: {
        parameters: Partial<Parameters<PutAccountProjectIdDbTableNameItemIdClient>[0]>;
        return: Awaited<ReturnType<PutAccountProjectIdDbTableNameItemIdClient>>;
    };
};
/**
 * @description Replace a specific item in a table within a project.
 * @summary Set Item
 * @link /account/:project_id/db/:table_name/:item_id
 */
export function usePutAccountProjectIdDbTableNameItemId(projectId: PutAccountProjectIdDbTableNameItemIdPathParams["project_id"], tableName: PutAccountProjectIdDbTableNameItemIdPathParams["table_name"], itemId: PutAccountProjectIdDbTableNameItemIdPathParams["item_id"], options?: {
    mutation?: SWRMutationConfiguration<PutAccountProjectIdDbTableNameItemId["response"], PutAccountProjectIdDbTableNameItemId["error"]>;
    client?: PutAccountProjectIdDbTableNameItemId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PutAccountProjectIdDbTableNameItemId["response"], PutAccountProjectIdDbTableNameItemId["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/${projectId}/db/${tableName}/${itemId}` as const;
    return useSWRMutation<PutAccountProjectIdDbTableNameItemId["response"], PutAccountProjectIdDbTableNameItemId["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PutAccountProjectIdDbTableNameItemId["data"], PutAccountProjectIdDbTableNameItemId["error"], PutAccountProjectIdDbTableNameItemId["request"]>({
            method: "put",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}