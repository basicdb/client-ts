import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetAccountProjectsQueryResponse, GetAccountProjects401, GetAccountProjects422, GetAccountProjects500 } from "../models/GetAccountProjects";

 type GetAccountProjectsClient = typeof client<GetAccountProjectsQueryResponse, GetAccountProjects401 | GetAccountProjects422 | GetAccountProjects500, never>;
type GetAccountProjects = {
    data: GetAccountProjectsQueryResponse;
    error: GetAccountProjects401 | GetAccountProjects422 | GetAccountProjects500;
    request: never;
    pathParams: never;
    queryParams: never;
    headerParams: never;
    response: GetAccountProjectsQueryResponse;
    client: {
        parameters: Partial<Parameters<GetAccountProjectsClient>[0]>;
        return: Awaited<ReturnType<GetAccountProjectsClient>>;
    };
};
export function getAccountProjectsQueryOptions<TData = GetAccountProjects["response"]>(options: GetAccountProjects["client"]["parameters"] = {}): SWRConfiguration<TData, GetAccountProjects["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetAccountProjects["error"]>({
                method: "get",
                url: `/account/projects`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve the account's projects. Requires the auth token for the account holder.
 * @summary Get Projects
 * @link /account/projects
 */
export function useGetAccountProjects<TData = GetAccountProjects["response"]>(options?: {
    query?: SWRConfiguration<TData, GetAccountProjects["error"]>;
    client?: GetAccountProjects["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetAccountProjects["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/projects`;
    const query = useSWR<TData, GetAccountProjects["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getAccountProjectsQueryOptions<TData>(clientOptions),
        ...queryOptions
    });
    return query;
}