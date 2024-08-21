import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostProjectProjectIdUserAccountIdMutationRequest, PostProjectProjectIdUserAccountIdMutationResponse, PostProjectProjectIdUserAccountIdPathParams, PostProjectProjectIdUserAccountId401, PostProjectProjectIdUserAccountId422, PostProjectProjectIdUserAccountId500 } from "../models/PostProjectProjectIdUserAccountId";

 type PostProjectProjectIdUserAccountIdClient = typeof client<PostProjectProjectIdUserAccountIdMutationResponse, PostProjectProjectIdUserAccountId401 | PostProjectProjectIdUserAccountId422 | PostProjectProjectIdUserAccountId500, PostProjectProjectIdUserAccountIdMutationRequest>;
type PostProjectProjectIdUserAccountId = {
    data: PostProjectProjectIdUserAccountIdMutationResponse;
    error: PostProjectProjectIdUserAccountId401 | PostProjectProjectIdUserAccountId422 | PostProjectProjectIdUserAccountId500;
    request: PostProjectProjectIdUserAccountIdMutationRequest;
    pathParams: PostProjectProjectIdUserAccountIdPathParams;
    queryParams: never;
    headerParams: never;
    response: PostProjectProjectIdUserAccountIdMutationResponse;
    client: {
        parameters: Partial<Parameters<PostProjectProjectIdUserAccountIdClient>[0]>;
        return: Awaited<ReturnType<PostProjectProjectIdUserAccountIdClient>>;
    };
};
/**
 * @description Update a specific user's information within a project.
 * @summary Update User
 * @link /project/:project_id/user/:account_id
 */
export function usePostProjectProjectIdUserAccountId(projectId: PostProjectProjectIdUserAccountIdPathParams["project_id"], accountId: PostProjectProjectIdUserAccountIdPathParams["account_id"], options?: {
    mutation?: SWRMutationConfiguration<PostProjectProjectIdUserAccountId["response"], PostProjectProjectIdUserAccountId["error"]>;
    client?: PostProjectProjectIdUserAccountId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostProjectProjectIdUserAccountId["response"], PostProjectProjectIdUserAccountId["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/user/${accountId}` as const;
    return useSWRMutation<PostProjectProjectIdUserAccountId["response"], PostProjectProjectIdUserAccountId["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PostProjectProjectIdUserAccountId["data"], PostProjectProjectIdUserAccountId["error"], PostProjectProjectIdUserAccountId["request"]>({
            method: "post",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}