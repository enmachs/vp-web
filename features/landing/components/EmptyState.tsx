/**
 * Placeholder a landing section renders when it has nothing published to
 * show — either the list is genuinely empty or the read failed (see
 * features/landing/lib/published.ts). Sits inside the section's grid slot so
 * the section head and spacing stay intact.
 */
export default function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-empty" role="status">
      <p>{children}</p>
    </div>
  );
}
