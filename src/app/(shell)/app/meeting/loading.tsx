import { Skeleton } from "@/components/ui/skeleton";

/**
 * 본문과 **같은 골격**이다(DESIGN §4: 로딩은 본문과 같은 폭·같은 개수).
 *
 * ⚠️ 한때 `auto-fill`(340px)에 `gap-4`였다. 본문을 2열·`gap-7`로 바꾸면서 여기를 안 고쳤더니
 *    1440에서 로딩은 4열·16px로 뜨다가 본문이 2열·28px로 바뀌어, 카드 크기와 줄 수가
 *    동시에 튀었다 — **본문을 고치면 이 파일도 같이 고친다.**
 */
export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/* 탭 줄 */}
        <Skeleton className="h-9 w-[220px] rounded-lg" />
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          <Skeleton className="h-[200px] rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
