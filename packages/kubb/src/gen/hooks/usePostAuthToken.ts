import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { PostAuthTokenMutationRequest, PostAuthTokenMutationResponse, PostAuthToken401, PostAuthToken422, PostAuthToken500 } from "../models/PostAuthToken";

 type PostAuthTokenClient = typeof client<PostAuthTokenMutationResponse, PostAuthToken401 | PostAuthToken422 | PostAuthToken500, PostAuthTokenMutationRequest>;
type PostAuthToken = {
    data: PostAuthTokenMutationResponse;
    error: PostAuthToken401 | PostAuthToken422 | PostAuthToken500;
    request: PostAuthTokenMutationRequest;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: PostAuthTokenMutationResponse;
    client: {
        parameters: Partial<Parameters<PostAuthTokenClient>[0]>;
        return: Awaited<ReturnType<PostAuthTokenClient>>;
    };
};
/**
 * @description Use the authorization code to get an access token.
 * @summary token
 * @link /auth/token
 */
export function usePostAuthToken(options?: {
    mutation?: SWRMutationConfiguration<PostAuthToken["response"], PostAuthToken["error"]>;
    client?: PostAuthToken["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<PostAuthToken["response"], PostAuthToken["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/auth/token` as const;
    return useSWRMutation<PostAuthToken["response"], PostAuthToken["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<PostAuthToken["data"], PostAuthToken["error"], PostAuthToken["request"]>({
            method: "post",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}