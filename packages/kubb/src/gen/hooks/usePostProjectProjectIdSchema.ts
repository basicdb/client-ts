import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostProjectProjectIdSchemaMutationRequest, PostProjectProjectIdSchemaMutationResponse, PostProjectProjectIdSchemaPathParams, PostProjectProjectIdSchema401, PostProjectProjectIdSchema422, PostProjectProjectIdSchema500 } from "../models/PostProjectProjectIdSchema";

 type PostProjectProjectIdSchemaClient = typeof client<PostProjectProjectIdSchemaMutationResponse, PostProjectProjectIdSchema401 | PostProjectProjectIdSchema422 | PostProjectProjectIdSchema500, PostProjectProjectIdSchemaMutationRequest>;
type PostProjectProjectIdSchema = {
    data: PostProjectProjectIdSchemaMutationResponse;
    error: PostProjectProjectIdSchema401 | PostProjectProjectIdSchema422 | PostProjectProjectIdSchema500;
    request: PostProjectProjectIdSchemaMutationRequest;
    pathParams: PostProjectProjectIdSchemaPathParams;
    queryParams: never;
    headerParams: never;
    response: PostProjectProjectIdSchemaMutationResponse;
    client: {
        parameters: Partial<Parameters<PostProjectProjectIdSchemaClient>[0]>;
        return: Awaited<ReturnType<PostProjectProjectIdSchemaClient>>;
    };
};
/**
 * @description Update the database schema for a specific project.
 * @summary Update Schema
 * @link /project/:project_id/schema
 */
export function usePostProjectProjectIdSchema(projectId: PostProjectProjectIdSchemaPathParams["project_id"], options?: {
    mutation?: SWRMutationConfiguration<PostProjectProjectIdSchema["response"], PostProjectProjectIdSchema["error"]>;
    client?: PostProjectProjectIdSchema["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostProjectProjectIdSchema["response"], PostProjectProjectIdSchema["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/schema` as const;
    return useSWRMutation<PostProjectProjectIdSchema["response"], PostProjectProjectIdSchema["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PostProjectProjectIdSchema["data"], PostProjectProjectIdSchema["error"], PostProjectProjectIdSchema["request"]>({
            method: "post",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}