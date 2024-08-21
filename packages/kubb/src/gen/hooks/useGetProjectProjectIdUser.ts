import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetProjectProjectIdUserQueryResponse, GetProjectProjectIdUserPathParams, GetProjectProjectIdUser401, GetProjectProjectIdUser422, GetProjectProjectIdUser500 } from "../models/GetProjectProjectIdUser";

 type GetProjectProjectIdUserClient = typeof client<GetProjectProjectIdUserQueryResponse, GetProjectProjectIdUser401 | GetProjectProjectIdUser422 | GetProjectProjectIdUser500, never>;
type GetProjectProjectIdUser = {
    data: GetProjectProjectIdUserQueryResponse;
    error: GetProjectProjectIdUser401 | GetProjectProjectIdUser422 | GetProjectProjectIdUser500;
    request: never;
    pathParams: GetProjectProjectIdUserPathParams;
    queryParams: never;
    headerParams: never;
    response: GetProjectProjectIdUserQueryResponse;
    client: {
        parameters: Partial<Parameters<GetProjectProjectIdUserClient>[0]>;
        return: Awaited<ReturnType<GetProjectProjectIdUserClient>>;
    };
};
export function getProjectProjectIdUserQueryOptions<TData = GetProjectProjectIdUser["response"]>(projectId: GetProjectProjectIdUserPathParams["project_id"], options: GetProjectProjectIdUser["client"]["parameters"] = {}): SWRConfiguration<TData, GetProjectProjectIdUser["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetProjectProjectIdUser["error"]>({
                method: "get",
                url: `/project/${projectId}/user`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve all users for a specific project.
 * @summary All Users
 * @link /project/:project_id/user
 */
export function useGetProjectProjectIdUser<TData = GetProjectProjectIdUser["response"]>(projectId: GetProjectProjectIdUserPathParams["project_id"], options?: {
    query?: SWRConfiguration<TData, GetProjectProjectIdUser["error"]>;
    client?: GetProjectProjectIdUser["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetProjectProjectIdUser["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/user`;
    const query = useSWR<TData, GetProjectProjectIdUser["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getProjectProjectIdUserQueryOptions<TData>(projectId, clientOptions),
        ...queryOptions
    });
    return query;
}