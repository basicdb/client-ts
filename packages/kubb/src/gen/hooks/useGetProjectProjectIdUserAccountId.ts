import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetProjectProjectIdUserAccountIdQueryResponse, GetProjectProjectIdUserAccountIdPathParams, GetProjectProjectIdUserAccountId401, GetProjectProjectIdUserAccountId422, GetProjectProjectIdUserAccountId500 } from "../models/GetProjectProjectIdUserAccountId";

 type GetProjectProjectIdUserAccountIdClient = typeof client<GetProjectProjectIdUserAccountIdQueryResponse, GetProjectProjectIdUserAccountId401 | GetProjectProjectIdUserAccountId422 | GetProjectProjectIdUserAccountId500, never>;
type GetProjectProjectIdUserAccountId = {
    data: GetProjectProjectIdUserAccountIdQueryResponse;
    error: GetProjectProjectIdUserAccountId401 | GetProjectProjectIdUserAccountId422 | GetProjectProjectIdUserAccountId500;
    request: never;
    pathParams: GetProjectProjectIdUserAccountIdPathParams;
    queryParams: never;
    headerParams: never;
    response: GetProjectProjectIdUserAccountIdQueryResponse;
    client: {
        parameters: Partial<Parameters<GetProjectProjectIdUserAccountIdClient>[0]>;
        return: Awaited<ReturnType<GetProjectProjectIdUserAccountIdClient>>;
    };
};
export function getProjectProjectIdUserAccountIdQueryOptions<TData = GetProjectProjectIdUserAccountId["response"]>(projectId: GetProjectProjectIdUserAccountIdPathParams["project_id"], accountId: GetProjectProjectIdUserAccountIdPathParams["account_id"], options: GetProjectProjectIdUserAccountId["client"]["parameters"] = {}): SWRConfiguration<TData, GetProjectProjectIdUserAccountId["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetProjectProjectIdUserAccountId["error"]>({
                method: "get",
                url: `/project/${projectId}/user/${accountId}`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve information for a specific user within a project.
 * @summary Get User
 * @link /project/:project_id/user/:account_id
 */
export function useGetProjectProjectIdUserAccountId<TData = GetProjectProjectIdUserAccountId["response"]>(projectId: GetProjectProjectIdUserAccountIdPathParams["project_id"], accountId: GetProjectProjectIdUserAccountIdPathParams["account_id"], options?: {
    query?: SWRConfiguration<TData, GetProjectProjectIdUserAccountId["error"]>;
    client?: GetProjectProjectIdUserAccountId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetProjectProjectIdUserAccountId["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/user/${accountId}`;
    const query = useSWR<TData, GetProjectProjectIdUserAccountId["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getProjectProjectIdUserAccountIdQueryOptions<TData>(projectId, accountId, clientOptions),
        ...queryOptions
    });
    return query;
}