import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetAccountProjectIdDbTableNameQueryResponse, GetAccountProjectIdDbTableNamePathParams, GetAccountProjectIdDbTableNameQueryParams, GetAccountProjectIdDbTableName401, GetAccountProjectIdDbTableName422, GetAccountProjectIdDbTableName500 } from "../models/GetAccountProjectIdDbTableName";

 type GetAccountProjectIdDbTableNameClient = typeof client<GetAccountProjectIdDbTableNameQueryResponse, GetAccountProjectIdDbTableName401 | GetAccountProjectIdDbTableName422 | GetAccountProjectIdDbTableName500, never>;
type GetAccountProjectIdDbTableName = {
    data: GetAccountProjectIdDbTableNameQueryResponse;
    error: GetAccountProjectIdDbTableName401 | GetAccountProjectIdDbTableName422 | GetAccountProjectIdDbTableName500;
    request: never;
    pathParams: GetAccountProjectIdDbTableNamePathParams;
    queryParams: GetAccountProjectIdDbTableNameQueryParams;
    headerParams: never;
    response: GetAccountProjectIdDbTableNameQueryResponse;
    client: {
        parameters: Partial<Parameters<GetAccountProjectIdDbTableNameClient>[0]>;
        return: Awaited<ReturnType<GetAccountProjectIdDbTableNameClient>>;
    };
};
export function getAccountProjectIdDbTableNameQueryOptions<TData = GetAccountProjectIdDbTableName["response"]>(projectId: GetAccountProjectIdDbTableNamePathParams["project_id"], tableName: GetAccountProjectIdDbTableNamePathParams["table_name"], params?: GetAccountProjectIdDbTableName["queryParams"], options: GetAccountProjectIdDbTableName["client"]["parameters"] = {}): SWRConfiguration<TData, GetAccountProjectIdDbTableName["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetAccountProjectIdDbTableName["error"]>({
                method: "get",
                url: `/account/${projectId}/db/${tableName}`,
                params,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve items from a specific table within a project.
 * @summary Get Items
 * @link /account/:project_id/db/:table_name
 */
export function useGetAccountProjectIdDbTableName<TData = GetAccountProjectIdDbTableName["response"]>(projectId: GetAccountProjectIdDbTableNamePathParams["project_id"], tableName: GetAccountProjectIdDbTableNamePathParams["table_name"], params?: GetAccountProjectIdDbTableName["queryParams"], options?: {
    query?: SWRConfiguration<TData, GetAccountProjectIdDbTableName["error"]>;
    client?: GetAccountProjectIdDbTableName["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetAccountProjectIdDbTableName["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/account/${projectId}/db/${tableName}`;
    const query = useSWR<TData, GetAccountProjectIdDbTableName["error"], [
        typeof url,
        typeof params
    ] | null>(shouldFetch ? [url, params] : null, {
        ...getAccountProjectIdDbTableNameQueryOptions<TData>(projectId, tableName, params, clientOptions),
        ...queryOptions
    });
    return query;
}