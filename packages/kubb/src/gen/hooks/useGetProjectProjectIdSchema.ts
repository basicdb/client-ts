import useSWR from "swr";
import client from "@kubb/swagger-client/client";
import type { SWRConfiguration, SWRResponse } from "swr";
import type { GetProjectProjectIdSchemaQueryResponse, GetProjectProjectIdSchemaPathParams, GetProjectProjectIdSchema401, GetProjectProjectIdSchema422, GetProjectProjectIdSchema500 } from "../models/GetProjectProjectIdSchema";

 type GetProjectProjectIdSchemaClient = typeof client<GetProjectProjectIdSchemaQueryResponse, GetProjectProjectIdSchema401 | GetProjectProjectIdSchema422 | GetProjectProjectIdSchema500, never>;
type GetProjectProjectIdSchema = {
    data: GetProjectProjectIdSchemaQueryResponse;
    error: GetProjectProjectIdSchema401 | GetProjectProjectIdSchema422 | GetProjectProjectIdSchema500;
    request: never;
    pathParams: GetProjectProjectIdSchemaPathParams;
    queryParams: never;
    headerParams: never;
    response: GetProjectProjectIdSchemaQueryResponse;
    client: {
        parameters: Partial<Parameters<GetProjectProjectIdSchemaClient>[0]>;
        return: Awaited<ReturnType<GetProjectProjectIdSchemaClient>>;
    };
};
export function getProjectProjectIdSchemaQueryOptions<TData = GetProjectProjectIdSchema["response"]>(projectId: GetProjectProjectIdSchemaPathParams["project_id"], options: GetProjectProjectIdSchema["client"]["parameters"] = {}): SWRConfiguration<TData, GetProjectProjectIdSchema["error"]> {
    return {
        fetcher: async () => {
            const res = await client<TData, GetProjectProjectIdSchema["error"]>({
                method: "get",
                url: `/project/${projectId}/schema`,
                ...options
            });
            return res.data;
        },
    };
}
/**
 * @description Retrieve the database schema for a specific project.
 * @summary Get Schema
 * @link /project/:project_id/schema
 */
export function useGetProjectProjectIdSchema<TData = GetProjectProjectIdSchema["response"]>(projectId: GetProjectProjectIdSchemaPathParams["project_id"], options?: {
    query?: SWRConfiguration<TData, GetProjectProjectIdSchema["error"]>;
    client?: GetProjectProjectIdSchema["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRResponse<TData, GetProjectProjectIdSchema["error"]> {
    const { query: queryOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/schema`;
    const query = useSWR<TData, GetProjectProjectIdSchema["error"], typeof url | null>(shouldFetch ? url : null, {
        ...getProjectProjectIdSchemaQueryOptions<TData>(projectId, clientOptions),
        ...queryOptions
    });
    return query;
}