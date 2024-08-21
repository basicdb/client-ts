import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetAccountQueryResponse, GetAccount401, GetAccount422, GetAccount500 } from "../models/GetAccount";

 type GetAccountClient = typeof client<GetAccountQueryResponse, GetAccount401 | GetAccount422 | GetAccount500, never>;
type GetAccount = {
    data: GetAccountQueryResponse;
    error: GetAccount401 | GetAccount422 | GetAccount500;
    request: never;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: GetAccountQueryResponse;
    client: {
        parameters: Partial<Parameters<GetAccountClient>[0]>;
        return: Awaited<ReturnType<GetAccountClient>>;
    };
};
export function getAccountQueryOptions<TData = GetAccount["response"]>(options: GetAccount["client"]["parameters"] = {}): SWRConfiguration<TData, GetAccount["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetAccount["error"]>({
                method: "get",
                url: `/account`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve the account information. Requires the auth token for the account holder.
 * @summary Account
 * @link /account
 */
export function useGetAccount<TData = GetAccount["response"]>(options?: {
    query?: SWRConfiguration<TData, GetAccount["error"]>;
    client?: GetAccount["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetAccount["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account`;
    const query = useSWR<TData, GetAccount["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getAccountQueryOptions<TData>(clientOptions),
        ...queryOptions
    });
    return query;
}