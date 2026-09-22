import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
