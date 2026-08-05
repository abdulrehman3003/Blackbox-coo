interface SkeletonProps {
  className?: string;
  count?: number;
}

export default function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  const base = "animate-pulse rounded-lg bg-surface";
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${base} ${className || "h-4 w-full"}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
}