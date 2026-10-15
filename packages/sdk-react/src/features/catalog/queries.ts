import { queryOptions } from '@tanstack/react-query';
import { catalogKeys, getItem, listCategories, listItems, type ListItemsQuery } from '@web-boilerplate/sdk-core';
import type { ApiContextValue } from '../../queries';

// Query option factories: plain objects, no hooks. The same factory feeds `useQuery` in a client
// component and `prefetchQuery`/`fetchQuery` in a server component, so keys always match.
export const catalogQueries = {
  itemList: ({ client, scope }: ApiContextValue, query: ListItemsQuery = {}) =>
    queryOptions({
      queryKey: catalogKeys.itemList(scope, query),
      queryFn: ({ signal }) => listItems(client, query, { signal }),
    }),
  itemDetail: ({ client, scope }: ApiContextValue, itemId: string) =>
    queryOptions({
      queryKey: catalogKeys.itemDetail(scope, itemId),
      queryFn: ({ signal }) => getItem(client, itemId, { signal }),
    }),
  categories: ({ client, scope }: ApiContextValue) =>
    queryOptions({
      queryKey: catalogKeys.categories(scope),
      queryFn: ({ signal }) => listCategories(client, { signal }),
      staleTime: 5 * 60_000,
    }),
};
