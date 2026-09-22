import { Skeleton } from "@/components/ui/skeleton";

/** 대시보드를 불러오는 동안. 실제 화면과 같은 골격이라 레이아웃이 흔들리지 않는다. */
export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <Skeleton className="h-[132px] rounded-2xl" />

        <div className="flex flex-col gap-4 lg:flex-row">
          <Skeleton className="h-[360px] rounded-2xl lg:flex-1" />
          <Skeleton className="h-[360px] w-full rounded-2xl lg:w-64 lg:shrink-0" />
        </div>

        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    </main>
  );
}
