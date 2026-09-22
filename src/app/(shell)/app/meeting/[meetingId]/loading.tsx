import { Skeleton } from "@/components/ui/skeleton";

/**
 * 본문과 **같은 골격**이다(DESIGN §4: 로딩은 본문과 같은 폭·같은 개수).
 *
 * ⚠️ 한때 곁 컬럼(360)이 있는 두 칸이었다. 본문을 한 컬럼으로 바꾸면서 여기를 안 고쳤더니
 *    로딩이 끝나는 순간 오른쪽 칸이 사라지고 주 컬럼이 1440까지 벌어져 화면이 통째로 튀었다 —
 *    **본문을 고치면 이 파일도 같이 고친다.**
 */
export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/* 머리(제목·안건·참석자) · 산출물 · 발화 기록 — 본문과 같은 세 장 */}
        <Skeleton className="h-[280px] rounded-2xl" />
        <Skeleton className="h-[240px] rounded-2xl" />
        <Skeleton className="h-[260px] rounded-2xl" />
      </div>
    </main>
  );
}
