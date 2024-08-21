import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetAccountAppsQueryResponse, GetAccountApps401, GetAccountApps422, GetAccountApps500 } from "../models/GetAccountApps";

 type GetAccountAppsClient = typeof client<GetAccountAppsQueryResponse, GetAccountApps401 | GetAccountApps422 | GetAccountApps500, never>;
type GetAccountApps = {
    data: GetAccountAppsQueryResponse;
    error: GetAccountApps401 | GetAccountApps422 | GetAccountApps500;
    request: never;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: GetAccountAppsQueryResponse;
    client: {
        parameters: Partial<Parameters<GetAccountAppsClient>[0]>;
        return: Awaited<ReturnType<GetAccountAppsClient>>;
    };
};
export function getAccountAppsQueryOptions<TData = GetAccountApps["response"]>(options: GetAccountApps["client"]["parameters"] = {}): SWRConfiguration<TData, GetAccountApps["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetAccountApps["error"]>({
                method: "get",
                url: `/account/apps`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve the account's apps. Requires the auth token for the account holder.
 * @summary Get Apps
 * @link /account/apps
 */
export function useGetAccountApps<TData = GetAccountApps["response"]>(options?: {
    query?: SWRConfiguration<TData, GetAccountApps["error"]>;
    client?: GetAccountApps["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetAccountApps["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/apps`;
    const query = useSWR<TData, GetAccountApps["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getAccountAppsQueryOptions<TData>(clientOptions),
        ...queryOptions
    });
    return query;
}