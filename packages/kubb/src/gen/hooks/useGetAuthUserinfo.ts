import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetAuthUserinfoQueryResponse, GetAuthUserinfo401, GetAuthUserinfo422, GetAuthUserinfo500 } from "../models/GetAuthUserinfo";

 type GetAuthUserinfoClient = typeof client<GetAuthUserinfoQueryResponse, GetAuthUserinfo401 | GetAuthUserinfo422 | GetAuthUserinfo500, never>;
type GetAuthUserinfo = {
    data: GetAuthUserinfoQueryResponse;
    error: GetAuthUserinfo401 | GetAuthUserinfo422 | GetAuthUserinfo500;
    request: never;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: GetAuthUserinfoQueryResponse;
    client: {
        parameters: Partial<Parameters<GetAuthUserinfoClient>[0]>;
        return: Awaited<ReturnType<GetAuthUserinfoClient>>;
    };
};
export function getAuthUserinfoQueryOptions<TData = GetAuthUserinfo["response"]>(options: GetAuthUserinfo["client"]["parameters"] = {}): SWRConfiguration<TData, GetAuthUserinfo["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetAuthUserinfo["error"]>({
                method: "get",
                url: `/auth/userInfo`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @summary userInfo
 * @link /auth/userInfo
 */
export function useGetAuthUserinfo<TData = GetAuthUserinfo["response"]>(options?: {
    query?: SWRConfiguration<TData, GetAuthUserinfo["error"]>;
    client?: GetAuthUserinfo["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetAuthUserinfo["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/auth/userInfo`;
    const query = useSWR<TData, GetAuthUserinfo["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getAuthUserinfoQueryOptions<TData>(clientOptions),
        ...queryOptions
    });
    return query;
}