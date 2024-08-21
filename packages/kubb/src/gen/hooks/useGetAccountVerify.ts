import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetAccountVerifyQueryResponse, GetAccountVerify401, GetAccountVerify422, GetAccountVerify500 } from "../models/GetAccountVerify";

 type GetAccountVerifyClient = typeof client<GetAccountVerifyQueryResponse, GetAccountVerify401 | GetAccountVerify422 | GetAccountVerify500, never>;
type GetAccountVerify = {
    data: GetAccountVerifyQueryResponse;
    error: GetAccountVerify401 | GetAccountVerify422 | GetAccountVerify500;
    request: never;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: GetAccountVerifyQueryResponse;
    client: {
        parameters: Partial<Parameters<GetAccountVerifyClient>[0]>;
        return: Awaited<ReturnType<GetAccountVerifyClient>>;
    };
};
export function getAccountVerifyQueryOptions<TData = GetAccountVerify["response"]>(options: GetAccountVerify["client"]["parameters"] = {}): SWRConfiguration<TData, GetAccountVerify["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetAccountVerify["error"]>({
                method: "get",
                url: `/account/verify`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @summary Verify
 * @link /account/verify
 */
export function useGetAccountVerify<TData = GetAccountVerify["response"]>(options?: {
    query?: SWRConfiguration<TData, GetAccountVerify["error"]>;
    client?: GetAccountVerify["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetAccountVerify["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/verify`;
    const query = useSWR<TData, GetAccountVerify["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getAccountVerifyQueryOptions<TData>(clientOptions),
        ...queryOptions
    });
    return query;
}