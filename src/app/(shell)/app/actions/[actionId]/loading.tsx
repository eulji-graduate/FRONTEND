import { Skeleton } from "@/components/ui/skeleton";

/** 실제 화면과 같은 골격(브레드크럼 + 제목 + 카드 + 우측 세부 정보 카드). */
export default function Loading() {
  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-4 w-64 rounded-lg" />
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </main>
  );
}
