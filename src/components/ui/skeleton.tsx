export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`uiSkeleton ${className}`.trim()} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="pageSkeleton" aria-busy="true" aria-live="polite">
      <Skeleton className="skelTitle" />
      <Skeleton className="skelLine" />
      <div className="skelGrid">
        <Skeleton className="skelCard" />
        <Skeleton className="skelCard" />
        <Skeleton className="skelCard" />
        <Skeleton className="skelCard" />
      </div>
      <Skeleton className="skelPanel" />
    </div>
  );
}
