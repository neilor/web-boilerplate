import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="state" role="status">
      <h1 className="state-title">Not found</h1>
      <p>This item does not exist or is not visible to you.</p>
      <Link href="/items">Back to items</Link>
    </div>
  );
}
