import { Skeleton } from "@/components/ui/skeleton";

/** 본문과 같은 골격 — 자막(주) + 녹음·참가자(곁 360)(§DESIGN 4: 로딩은 본문과 같은 폭·개수) */
export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[420px] rounded-2xl" />
        <div className="flex flex-col gap-7">
          <Skeleton className="h-[300px] rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
