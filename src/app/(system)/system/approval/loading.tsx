import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-[454px] rounded-2xl" />
      </div>
    </main>
  );
}
