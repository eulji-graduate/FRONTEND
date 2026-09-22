import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/*
          ⚠️ **본문과 같은 구조로 그린다**(§DESIGN 4: 로딩은 본문과 같은 폭·같은 개수).
             전에는 전폭 스켈레톤 둘을 세로로 쌓아, 데이터가 오는 순간 한 칸이 두 칸으로
             바뀌며 화면이 튀었다 — 상세는 왼쪽 목록 + 오른쪽 360 곁 칸이다.
        */}
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
          <Skeleton className="h-64 min-w-0 flex-1 rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl lg:w-[360px] lg:shrink-0" />
        </div>
      </div>
    </main>
  );
}
