import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostProjectProjectIdMutationRequest, PostProjectProjectIdMutationResponse, PostProjectProjectIdPathParams, PostProjectProjectId401, PostProjectProjectId422, PostProjectProjectId500 } from "../models/PostProjectProjectId";

 type PostProjectProjectIdClient = typeof client<PostProjectProjectIdMutationResponse, PostProjectProjectId401 | PostProjectProjectId422 | PostProjectProjectId500, PostProjectProjectIdMutationRequest>;
type PostProjectProjectId = {
    data: PostProjectProjectIdMutationResponse;
    error: PostProjectProjectId401 | PostProjectProjectId422 | PostProjectProjectId500;
    request: PostProjectProjectIdMutationRequest;
    pathParams: PostProjectProjectIdPathParams;
    queryParams: never;
    headerParams: never;
    response: PostProjectProjectIdMutationResponse;
    client: {
        parameters: Partial<Parameters<PostProjectProjectIdClient>[0]>;
        return: Awaited<ReturnType<PostProjectProjectIdClient>>;
    };
};
/**
 * @description Update information for a specific project.
 * @summary Update Project
 * @link /project/:project_id
 */
export function usePostProjectProjectId(projectId: PostProjectProjectIdPathParams["project_id"], options?: {
    mutation?: SWRMutationConfiguration<PostProjectProjectId["response"], PostProjectProjectId["error"]>;
    client?: PostProjectProjectId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostProjectProjectId["response"], PostProjectProjectId["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}` as const;
    return useSWRMutation<PostProjectProjectId["response"], PostProjectProjectId["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PostProjectProjectId["data"], PostProjectProjectId["error"], PostProjectProjectId["request"]>({
            method: "post",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}