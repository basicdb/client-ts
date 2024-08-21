import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostAccountNewMutationRequest, PostAccountNewMutationResponse, PostAccountNew401, PostAccountNew422, PostAccountNew500 } from "../models/PostAccountNew";

 type PostAccountNewClient = typeof client<PostAccountNewMutationResponse, PostAccountNew401 | PostAccountNew422 | PostAccountNew500, PostAccountNewMutationRequest>;
type PostAccountNew = {
    data: PostAccountNewMutationResponse;
    error: PostAccountNew401 | PostAccountNew422 | PostAccountNew500;
    request: PostAccountNewMutationRequest;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: PostAccountNewMutationResponse;
    client: {
        parameters: Partial<Parameters<PostAccountNewClient>[0]>;
        return: Awaited<ReturnType<PostAccountNewClient>>;
    };
};
/**
 * @summary Create Account
 * @link /account/new
 */
export function usePostAccountNew(options?: {
    mutation?: SWRMutationConfiguration<PostAccountNew["response"], PostAccountNew["error"]>;
    client?: PostAccountNew["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostAccountNew["response"], PostAccountNew["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/new` as const;
    return useSWRMutation<PostAccountNew["response"], PostAccountNew["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PostAccountNew["data"], PostAccountNew["error"], PostAccountNew["request"]>({
            method: "post",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}