import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <Skeleton className="mx-auto h-[220px] max-w-[720px] rounded-2xl" />
    </main>
  );
}
