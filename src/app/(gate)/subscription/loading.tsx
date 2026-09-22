import { Skeleton } from "@/components/ui/skeleton";

/**
 * 구독 상태를 불러오는 동안 — **결제할 수 있는 사람** 기준의 골격이다.
 *
 * ⚠️ 여기서는 보는 사람이 누구인지 알 수 없다. 권한은 서버 컴포넌트가 세션을 읽어야 나오는데
 *    뼈대는 그 전에 그려지기 때문이다 — 그래서 결제 권한이 없는 사람에게는 카드 자리가
 *    잠깐 비쳤다가 창으로 바뀐다. 뼈대를 지우면 그동안 화면이 통째로 비어서 더 나쁘다.
 */
export default function Loading() {
  return (
    <div className="bg-background bg-dot-grid min-h-screen-z flex flex-col">
      <div className="border-border h-[52px] shrink-0 border-b" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-[21px] px-[21px] py-6 lg:py-10">
        <div className="flex flex-col gap-[7px]">
          <Skeleton className="h-[30px] w-64" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-[460px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
