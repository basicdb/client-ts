import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetProjectProjectIdQueryResponse, GetProjectProjectIdPathParams, GetProjectProjectId401, GetProjectProjectId422, GetProjectProjectId500 } from "../models/GetProjectProjectId";

 type GetProjectProjectIdClient = typeof client<GetProjectProjectIdQueryResponse, GetProjectProjectId401 | GetProjectProjectId422 | GetProjectProjectId500, never>;
type GetProjectProjectId = {
    data: GetProjectProjectIdQueryResponse;
    error: GetProjectProjectId401 | GetProjectProjectId422 | GetProjectProjectId500;
    request: never;
    pathParams: GetProjectProjectIdPathParams;
    queryParams: never;
    headerParams: never;
    response: GetProjectProjectIdQueryResponse;
    client: {
        parameters: Partial<Parameters<GetProjectProjectIdClient>[0]>;
        return: Awaited<ReturnType<GetProjectProjectIdClient>>;
    };
};
export function getProjectProjectIdQueryOptions<TData = GetProjectProjectId["response"]>(projectId: GetProjectProjectIdPathParams["project_id"], options: GetProjectProjectId["client"]["parameters"] = {}): SWRConfiguration<TData, GetProjectProjectId["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetProjectProjectId["error"]>({
                method: "get",
                url: `/project/${projectId}`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve details for a specific project.
 * @summary Get Project
 * @link /project/:project_id
 */
export function useGetProjectProjectId<TData = GetProjectProjectId["response"]>(projectId: GetProjectProjectIdPathParams["project_id"], options?: {
    query?: SWRConfiguration<TData, GetProjectProjectId["error"]>;
    client?: GetProjectProjectId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetProjectProjectId["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}`;
    const query = useSWR<TData, GetProjectProjectId["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getProjectProjectIdQueryOptions<TData>(projectId, clientOptions),
        ...queryOptions
    });
    return query;
}