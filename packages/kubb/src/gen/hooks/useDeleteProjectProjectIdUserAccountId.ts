import useSWRMutation from "swr/mutation";
import client from "@kubb/swagger-client/client";
import type { SWRMutationConfiguration, SWRMutationResponse } from "swr/mutation";
import type { DeleteProjectProjectIdUserAccountIdMutationRequest, DeleteProjectProjectIdUserAccountIdMutationResponse, DeleteProjectProjectIdUserAccountIdPathParams, DeleteProjectProjectIdUserAccountId401, DeleteProjectProjectIdUserAccountId422, DeleteProjectProjectIdUserAccountId500 } from "../models/DeleteProjectProjectIdUserAccountId";

 type DeleteProjectProjectIdUserAccountIdClient = typeof client<DeleteProjectProjectIdUserAccountIdMutationResponse, DeleteProjectProjectIdUserAccountId401 | DeleteProjectProjectIdUserAccountId422 | DeleteProjectProjectIdUserAccountId500, DeleteProjectProjectIdUserAccountIdMutationRequest>;
type DeleteProjectProjectIdUserAccountId = {
    data: DeleteProjectProjectIdUserAccountIdMutationResponse;
    error: DeleteProjectProjectIdUserAccountId401 | DeleteProjectProjectIdUserAccountId422 | DeleteProjectProjectIdUserAccountId500;
    request: DeleteProjectProjectIdUserAccountIdMutationRequest;
    pathParams: DeleteProjectProjectIdUserAccountIdPathParams;
    queryParams: never;
    headerParams: never;
    response: DeleteProjectProjectIdUserAccountIdMutationResponse;
    client: {
        parameters: Partial<Parameters<DeleteProjectProjectIdUserAccountIdClient>[0]>;
        return: Awaited<ReturnType<DeleteProjectProjectIdUserAccountIdClient>>;
    };
};
/**
 * @description Delete a specific user item from a project.
 * @summary Delete User Item
 * @link /project/:project_id/user/:account_id
 */
export function useDeleteProjectProjectIdUserAccountId(projectId: DeleteProjectProjectIdUserAccountIdPathParams["project_id"], accountId: DeleteProjectProjectIdUserAccountIdPathParams["account_id"], options?: {
    mutation?: SWRMutationConfiguration<DeleteProjectProjectIdUserAccountId["response"], DeleteProjectProjectIdUserAccountId["error"]>;
    client?: DeleteProjectProjectIdUserAccountId["client"]["parameters"];
    shouldFetch?: boolean;
}): SWRMutationResponse<DeleteProjectProjectIdUserAccountId["response"], DeleteProjectProjectIdUserAccountId["error"]> {
    const { mutation: mutationOptions, client: clientOptions = {}, shouldFetch = true } = options ?? {};
    const url = `/project/${projectId}/user/${accountId}` as const;
    return useSWRMutation<DeleteProjectProjectIdUserAccountId["response"], DeleteProjectProjectIdUserAccountId["error"], typeof url | null>(shouldFetch ? url : null, async (_url, { arg: data }) => {
        const res = await client<DeleteProjectProjectIdUserAccountId["data"], DeleteProjectProjectIdUserAccountId["error"], DeleteProjectProjectIdUserAccountId["request"]>({
            method: "delete",
            url,
            data,
            ...clientOptions
        });
        return res.data;
    }, mutationOptions);
}