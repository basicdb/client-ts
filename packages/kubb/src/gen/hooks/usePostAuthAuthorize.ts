import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostAuthAuthorizeMutationRequest, PostAuthAuthorizeMutationResponse, PostAuthAuthorizeQueryParams, PostAuthAuthorize401, PostAuthAuthorize422, PostAuthAuthorize500 } from "../models/PostAuthAuthorize";

 type PostAuthAuthorizeClient = typeof client<PostAuthAuthorizeMutationResponse, PostAuthAuthorize401 | PostAuthAuthorize422 | PostAuthAuthorize500, PostAuthAuthorizeMutationRequest>;
type PostAuthAuthorize = {
    data: PostAuthAuthorizeMutationResponse;
    error: PostAuthAuthorize401 | PostAuthAuthorize422 | PostAuthAuthorize500;
    request: PostAuthAuthorizeMutationRequest;
    pathParams: never;
    queryParams: PostAuthAuthorizeQueryParams;
    headerParams: never;
    response: PostAuthAuthorizeMutationResponse;
    client: {
        parameters: Partial<Parameters<PostAuthAuthorizeClient>[0]>;
        return: Awaited<ReturnType<PostAuthAuthorizeClient>>;
    };
};
/**
 * @summary authorize
 * @link /auth/authorize
 */
export function usePostAuthAuthorize(params?: PostAuthAuthorize["queryParams"], options?: {
    mutation?: SWRMutationConfiguration<PostAuthAuthorize["response"], PostAuthAuthorize["error"]>;
    client?: PostAuthAuthorize["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostAuthAuthorize["response"], PostAuthAuthorize["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/auth/authorize` as const;
    return useSWRMutation<PostAuthAuthorize["response"], PostAuthAuthorize["error"], [
        typeof url,
        typeof params
    ] | null>(shouldFetch ? [url, params] : null, async (_url, { arg: data }) => {
        const res = await client<PostAuthAuthorize["data"], PostAuthAuthorize["error"], PostAuthAuthorize["request"]>({
            method: "post",
            url,
            params,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}