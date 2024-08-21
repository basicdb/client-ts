import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostProjectNewMutationRequest, PostProjectNewMutationResponse, PostProjectNew401, PostProjectNew422, PostProjectNew500 } from "../models/PostProjectNew";

 type PostProjectNewClient = typeof client<PostProjectNewMutationResponse, PostProjectNew401 | PostProjectNew422 | PostProjectNew500, PostProjectNewMutationRequest>;
type PostProjectNew = {
    data: PostProjectNewMutationResponse;
    error: PostProjectNew401 | PostProjectNew422 | PostProjectNew500;
    request: PostProjectNewMutationRequest;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: PostProjectNewMutationResponse;
    client: {
        parameters: Partial<Parameters<PostProjectNewClient>[0]>;
        return: Awaited<ReturnType<PostProjectNewClient>>;
    };
};
/**
 * @summary New Project
 * @link /project/new
 */
export function usePostProjectNew(options?: {
    mutation?: SWRMutationConfiguration<PostProjectNew["response"], PostProjectNew["error"]>;
    client?: PostProjectNew["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostProjectNew["response"], PostProjectNew["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/new` as const;
    return useSWRMutation<PostProjectNew["response"], PostProjectNew["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PostProjectNew["data"], PostProjectNew["error"], PostProjectNew["request"]>({
            method: "post",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}