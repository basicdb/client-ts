import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostAccountProjectIdDbTableNameMutationRequest, PostAccountProjectIdDbTableNameMutationResponse, PostAccountProjectIdDbTableNamePathParams, PostAccountProjectIdDbTableName401, PostAccountProjectIdDbTableName422, PostAccountProjectIdDbTableName500 } from "../models/PostAccountProjectIdDbTableName";

 type PostAccountProjectIdDbTableNameClient = typeof client<PostAccountProjectIdDbTableNameMutationResponse, PostAccountProjectIdDbTableName401 | PostAccountProjectIdDbTableName422 | PostAccountProjectIdDbTableName500, PostAccountProjectIdDbTableNameMutationRequest>;
type PostAccountProjectIdDbTableName = {
    data: PostAccountProjectIdDbTableNameMutationResponse;
    error: PostAccountProjectIdDbTableName401 | PostAccountProjectIdDbTableName422 | PostAccountProjectIdDbTableName500;
    request: PostAccountProjectIdDbTableNameMutationRequest;
    pathParams: PostAccountProjectIdDbTableNamePathParams;
    queryParams: never;
    headerParams: never;
    response: PostAccountProjectIdDbTableNameMutationResponse;
    client: {
        parameters: Partial<Parameters<PostAccountProjectIdDbTableNameClient>[0]>;
        return: Awaited<ReturnType<PostAccountProjectIdDbTableNameClient>>;
    };
};
/**
 * @description Add a new item to a specific table within a project.
 * @summary Add Item
 * @link /account/:project_id/db/:table_name
 */
export function usePostAccountProjectIdDbTableName(projectId: PostAccountProjectIdDbTableNamePathParams["project_id"], tableName: PostAccountProjectIdDbTableNamePathParams["table_name"], options?: {
    mutation?: SWRMutationConfiguration<PostAccountProjectIdDbTableName["response"], PostAccountProjectIdDbTableName["error"]>;
    client?: PostAccountProjectIdDbTableName["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostAccountProjectIdDbTableName["response"], PostAccountProjectIdDbTableName["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/${projectId}/db/${tableName}` as const;
    return useSWRMutation<PostAccountProjectIdDbTableName["response"], PostAccountProjectIdDbTableName["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PostAccountProjectIdDbTableName["data"], PostAccountProjectIdDbTableName["error"], PostAccountProjectIdDbTableName["request"]>({
            method: "post",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}