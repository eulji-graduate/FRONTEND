import { Skeleton } from "@/components/ui/skeleton";

/** 실제 화면과 같은 골격(브레드크럼 + 탭 + 카드 + 우측 세부 정보 카드). */
export default function Loading() {
  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-48 rounded-lg" />
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-60 w-full min-w-0 rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
