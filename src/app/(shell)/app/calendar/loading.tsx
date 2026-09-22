import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <Skeleton className="h-[calc(100vh-216px)] w-full rounded-lg" />
      </div>
    </main>
  );
}
