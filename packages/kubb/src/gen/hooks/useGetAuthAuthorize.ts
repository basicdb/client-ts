import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetAuthAuthorizeQueryResponse, GetAuthAuthorizeQueryParams, GetAuthAuthorize400 } from "../models/GetAuthAuthorize";

 type GetAuthAuthorizeClient = typeof client<GetAuthAuthorizeQueryResponse, GetAuthAuthorize400, never>;
type GetAuthAuthorize = {
    data: GetAuthAuthorizeQueryResponse;
    error: GetAuthAuthorize400;
    request: never;
    pathParams: never;
    queryParams: GetAuthAuthorizeQueryParams;
    headerParams: never;
    response: GetAuthAuthorizeQueryResponse;
    client: {
        parameters: Partial<Parameters<GetAuthAuthorizeClient>[0]>;
        return: Awaited<ReturnType<GetAuthAuthorizeClient>>;
    };
};
export function getAuthAuthorizeQueryOptions<TData = GetAuthAuthorize["response"]>(params?: GetAuthAuthorize["queryParams"], options: GetAuthAuthorize["client"]["parameters"] = {}): SWRConfiguration<TData, GetAuthAuthorize["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetAuthAuthorize["error"]>({
                method: "get",
                url: `/auth/authorize`,
                params,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Begin the OAuth flow. This endpoint is used to redirect the user to the authorization URL, and will return an authorization code.
 * @summary Authorize
 * @link /auth/authorize
 */
export function useGetAuthAuthorize<TData = GetAuthAuthorize["response"]>(params?: GetAuthAuthorize["queryParams"], options?: {
    query?: SWRConfiguration<TData, GetAuthAuthorize["error"]>;
    client?: GetAuthAuthorize["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetAuthAuthorize["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/auth/authorize`;
    const query = useSWR<TData, GetAuthAuthorize["error"], [
        typeof url,
        typeof params
    ] | null>(shouldFetch ? [url, params] : null, {
        ...getAuthAuthorizeQueryOptions<TData>(params, clientOptions),
        ...queryOptions
    });
    return query;
}