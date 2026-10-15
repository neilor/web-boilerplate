import type { Category, Item } from '@web-boilerplate/sdk-core';
import { StatusBadge } from '@/components/status-badge';

export function ItemDetail({ item, categories }: { item: Item; categories: readonly Category[] }) {
  const category = categories.find((candidate) => candidate.id === item.category)?.name ?? item.category;
  return (
    <article className="detail" aria-labelledby="item-heading">
      <h1 id="item-heading">{item.name}</h1>
      <div className="card-meta">
        <span>{category}</span>
        <StatusBadge status={item.status} />
      </div>
      <p>{item.description || <span className="muted">No description.</span>}</p>
      {item.tags.length > 0 ? (
        <ul className="tags" aria-label="Tags">
          {item.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}
      <dl className="facts">
        <dt>Created</dt>
        <dd>
          <time dateTime={item.createdAt}>{item.createdAt.slice(0, 10)}</time>
        </dd>
        <dt>Updated</dt>
        <dd>
          <time dateTime={item.updatedAt}>{item.updatedAt.slice(0, 10)}</time>
        </dd>
      </dl>
    </article>
  );
}
