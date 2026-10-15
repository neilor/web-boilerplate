import type { ItemStatus } from '@web-boilerplate/sdk-core';

const LABELS: Record<ItemStatus, string> = { draft: 'Draft', published: 'Published', archived: 'Archived' };

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
