import { queryOptions } from '@tanstack/react-query';
import { getViewer, viewerKeys } from '@web-boilerplate/sdk-core';
import type { ApiContextValue } from '../../queries';

export const viewerQueries = {
  current: ({ client, scope }: ApiContextValue) =>
    queryOptions({
      queryKey: viewerKeys.current(scope),
      queryFn: ({ signal }) => getViewer(client, { signal }),
    }),
};
