'use client';

import type { Category, ListItemsQuery } from '@web-boilerplate/sdk-core';

/** Filter form. Owns no state: it reports a new query and the URL becomes the source of truth. */
export function ItemFilters({
  value,
  categories,
  showStatus,
  onChange,
}: {
  value: ListItemsQuery;
  categories: readonly Category[];
  showStatus: boolean;
  onChange: (query: ListItemsQuery) => void;
}) {
  return (
    <form
      className="filters"
      role="search"
      aria-label="Filter items"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onChange({
          q: String(data.get('q') ?? ''),
          category: String(data.get('category') ?? ''),
          status: (String(data.get('status') ?? '') || undefined) as ListItemsQuery['status'],
        });
      }}
    >
      <div className="field">
        <label htmlFor="filter-q">Search</label>
        <input id="filter-q" name="q" type="search" maxLength={100} defaultValue={value.q ?? ''} />
      </div>
      <div className="field">
        <label htmlFor="filter-category">Category</label>
        <select id="filter-category" name="category" defaultValue={value.category ?? ''}>
          <option value="">All</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      {showStatus ? (
        <div className="field">
          <label htmlFor="filter-status">Status</label>
          <select id="filter-status" name="status" defaultValue={value.status ?? ''}>
            <option value="">Any</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      ) : null}
      <button type="submit" className="button">
        Apply
      </button>
    </form>
  );
}
