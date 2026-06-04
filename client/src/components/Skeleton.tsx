/** Loading placeholders so each section animates in independently. */
export function Skeleton({ height = 20, width = "100%" }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card">
      <Skeleton height={24} width="40%" />
      <div style={{ height: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <Skeleton height={14} width={`${90 - i * 12}%`} />
        </div>
      ))}
    </div>
  );
}
