'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  catalogKeys,
  createItem,
  updateItem,
  type ItemInput,
  type ItemPatch,
  type ListItemsQuery,
} from '@web-boilerplate/sdk-core';
import { useApi } from '../../provider';
import { catalogQueries } from './queries';

export function useItems(query: ListItemsQuery = {}) {
  // Keep showing the previous page while a new filter loads, instead of flashing a spinner.
  return useQuery({ ...catalogQueries.itemList(useApi(), query), placeholderData: keepPreviousData });
}

export function useItem(itemId: string) {
  return useQuery(catalogQueries.itemDetail(useApi(), itemId));
}

export function useCategories() {
  return useQuery(catalogQueries.categories(useApi()));
}

// Mutations write first and then update the cache from the server's answer. No optimistic
// updates: the screen only shows what the API confirmed.

export function useCreateItem() {
  const { client, scope } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemInput) => createItem(client, input),
    onSuccess: async (item) => {
      queryClient.setQueryData(catalogKeys.itemDetail(scope, item.id), item);
      await queryClient.invalidateQueries({ queryKey: catalogKeys.itemLists(scope) });
    },
  });
}

export function useUpdateItem(itemId: string) {
  const { client, scope } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ItemPatch) => updateItem(client, itemId, patch),
    onSuccess: async (item) => {
      queryClient.setQueryData(catalogKeys.itemDetail(scope, item.id), item);
      await queryClient.invalidateQueries({ queryKey: catalogKeys.itemLists(scope) });
    },
  });
}
