import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-60 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </main>
  );
}
