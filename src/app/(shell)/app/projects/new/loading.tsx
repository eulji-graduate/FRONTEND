import { Skeleton } from "@/components/ui/skeleton";

/** 실제 화면과 같은 골격(브레드크럼 + 제목 + 폼 카드). 목록용 loading.tsx는 폭이 달라 물려받으면 튄다. */
export default function Loading() {
  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </main>
  );
}
