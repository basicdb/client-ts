import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetProjectProjectIdKeyQueryResponse, GetProjectProjectIdKeyPathParams, GetProjectProjectIdKey401, GetProjectProjectIdKey422, GetProjectProjectIdKey500 } from "../models/GetProjectProjectIdKey";

 type GetProjectProjectIdKeyClient = typeof client<GetProjectProjectIdKeyQueryResponse, GetProjectProjectIdKey401 | GetProjectProjectIdKey422 | GetProjectProjectIdKey500, never>;
type GetProjectProjectIdKey = {
    data: GetProjectProjectIdKeyQueryResponse;
    error: GetProjectProjectIdKey401 | GetProjectProjectIdKey422 | GetProjectProjectIdKey500;
    request: never;
    pathParams: GetProjectProjectIdKeyPathParams;
    queryParams: never;
    headerParams: never;
    response: GetProjectProjectIdKeyQueryResponse;
    client: {
        parameters: Partial<Parameters<GetProjectProjectIdKeyClient>[0]>;
        return: Awaited<ReturnType<GetProjectProjectIdKeyClient>>;
    };
};
export function getProjectProjectIdKeyQueryOptions<TData = GetProjectProjectIdKey["response"]>(projectId: GetProjectProjectIdKeyPathParams["project_id"], options: GetProjectProjectIdKey["client"]["parameters"] = {}): SWRConfiguration<TData, GetProjectProjectIdKey["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetProjectProjectIdKey["error"]>({
                method: "get",
                url: `/project/${projectId}/key`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve the API key for a specific project.
 * @summary Get Key
 * @link /project/:project_id/key
 */
export function useGetProjectProjectIdKey<TData = GetProjectProjectIdKey["response"]>(projectId: GetProjectProjectIdKeyPathParams["project_id"], options?: {
    query?: SWRConfiguration<TData, GetProjectProjectIdKey["error"]>;
    client?: GetProjectProjectIdKey["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetProjectProjectIdKey["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/key`;
    const query = useSWR<TData, GetProjectProjectIdKey["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getProjectProjectIdKeyQueryOptions<TData>(projectId, clientOptions),
        ...queryOptions
    });
    return query;
}