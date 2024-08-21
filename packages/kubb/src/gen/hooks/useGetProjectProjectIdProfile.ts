import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetProjectProjectIdProfileQueryResponse, GetProjectProjectIdProfilePathParams, GetProjectProjectIdProfile401, GetProjectProjectIdProfile422, GetProjectProjectIdProfile500 } from "../models/GetProjectProjectIdProfile";

 type GetProjectProjectIdProfileClient = typeof client<GetProjectProjectIdProfileQueryResponse, GetProjectProjectIdProfile401 | GetProjectProjectIdProfile422 | GetProjectProjectIdProfile500, never>;
type GetProjectProjectIdProfile = {
    data: GetProjectProjectIdProfileQueryResponse;
    error: GetProjectProjectIdProfile401 | GetProjectProjectIdProfile422 | GetProjectProjectIdProfile500;
    request: never;
    pathParams: GetProjectProjectIdProfilePathParams;
    queryParams: never;
    headerParams: never;
    response: GetProjectProjectIdProfileQueryResponse;
    client: {
        parameters: Partial<Parameters<GetProjectProjectIdProfileClient>[0]>;
        return: Awaited<ReturnType<GetProjectProjectIdProfileClient>>;
    };
};
export function getProjectProjectIdProfileQueryOptions<TData = GetProjectProjectIdProfile["response"]>(projectId: GetProjectProjectIdProfilePathParams["project_id"], options: GetProjectProjectIdProfile["client"]["parameters"] = {}): SWRConfiguration<TData, GetProjectProjectIdProfile["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetProjectProjectIdProfile["error"]>({
                method: "get",
                url: `/project/${projectId}/profile`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve the public profile of a specific project.
 * @summary Get Profile
 * @link /project/:project_id/profile
 */
export function useGetProjectProjectIdProfile<TData = GetProjectProjectIdProfile["response"]>(projectId: GetProjectProjectIdProfilePathParams["project_id"], options?: {
    query?: SWRConfiguration<TData, GetProjectProjectIdProfile["error"]>;
    client?: GetProjectProjectIdProfile["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetProjectProjectIdProfile["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/profile`;
    const query = useSWR<TData, GetProjectProjectIdProfile["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getProjectProjectIdProfileQueryOptions<TData>(projectId, clientOptions),
        ...queryOptions
    });
    return query;
}