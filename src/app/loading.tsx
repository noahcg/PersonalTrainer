import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main suppressHydrationWarning className="min-h-screen p-5">
      <div className="mx-auto max-w-7xl space-y-5">
        <Skeleton className="h-40 rounded-[2.25rem]" />
        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-44 rounded-[2rem]" />
          <Skeleton className="h-44 rounded-[2rem]" />
          <Skeleton className="h-44 rounded-[2rem]" />
        </div>
      </div>
    </main>
  );
}
