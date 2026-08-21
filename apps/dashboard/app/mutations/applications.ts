import type {
  ApiKey,
  Application,
  CreateApiKeyResponse,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '@lattice/api-contract';
import { defineMutation, useMutation, useQueryCache } from '@pinia/colada';
import { APPLICATION_QUERY_KEYS } from '~/queries/applications.ts';

export type UpdateApplicationVars = {
  id: string;
  input: UpdateApplicationRequest;
};

export type RevokeApiKeyVars = {
  applicationId: string;
  keyId: string;
};

export const useCreateApplication = defineMutation(() => {
  const queryCache = useQueryCache();

  return useMutation({
    mutation: (input: CreateApplicationRequest) => {
      return $fetch<Application>('/api/applications', {
        method: 'POST',
        body: input,
      });
    },
    onSettled: () => {
      return queryCache.invalidateQueries({
        key: APPLICATION_QUERY_KEYS.root,
        exact: true,
      });
    },
  });
});

export const useUpdateApplication = defineMutation(() => {
  const queryCache = useQueryCache();

  return useMutation({
    mutation: ({ id, input }: UpdateApplicationVars) => {
      return $fetch<Application>(`/api/applications/${id}`, {
        method: 'PATCH',
        body: input,
      });
    },
    onSettled: (_data, _error, { id }) => {
      return Promise.all([
        queryCache.invalidateQueries({ key: APPLICATION_QUERY_KEYS.root, exact: true }),
        queryCache.invalidateQueries({ key: APPLICATION_QUERY_KEYS.detail(id), exact: true }),
      ]);
    },
  });
});

export const useCreateApiKey = defineMutation(() => {
  const queryCache = useQueryCache();

  return useMutation({
    mutation: (applicationId: string) => {
      return $fetch<CreateApiKeyResponse>(`/api/applications/${applicationId}/api-keys`, {
        method: 'POST',
      });
    },
    onSettled: (_data, _error, applicationId) => {
      return queryCache.invalidateQueries({
        key: APPLICATION_QUERY_KEYS.apiKeys(applicationId),
        exact: true,
      });
    },
  });
});

export const useRevokeApiKey = defineMutation(() => {
  const queryCache = useQueryCache();

  return useMutation({
    mutation: ({ applicationId, keyId }: RevokeApiKeyVars) => {
      return $fetch<ApiKey>(`/api/applications/${applicationId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });
    },
    onSettled: (_data, _error, { applicationId }) => {
      return queryCache.invalidateQueries({
        key: APPLICATION_QUERY_KEYS.apiKeys(applicationId),
        exact: true,
      });
    },
  });
});
