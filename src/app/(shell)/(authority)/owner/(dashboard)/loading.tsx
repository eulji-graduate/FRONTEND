import { Skeleton } from "@/components/ui/skeleton";
import { LEADER_BOX_SKELETON_HEIGHT, MEETING_BOX_SKELETON_HEIGHT } from "@/features/owner/lib";

/**
 * 대시보드를 불러오는 동안.
 * ⚠️ 카드는 이제 내용만큼 자라므로 뼈대는 **예상 높이**로 선다(`*_SKELETON_HEIGHT`) —
 *    본문과 같은 골격이라야 로딩이 끝날 때 화면이 안 튄다(DESIGN §4).
 */
export default function Loading() {
  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/* 요약은 카드 한 장이다 — 본문과 같은 골격으로 그린다(DESIGN §4) */}
        {/*
          ⚠️ 높이는 **실측값이다**(2026-08-10). 요약 카드 한 칸은 76px(라벨 16 + 4 + 값 36 +
             4 + 보조 16), 카드는 위아래 24 + 보더 2 = 50px을 더한다.
             넓을 때는 네 칸이 가로로 서서 **126**, `lg` 아래에서는 세로로 쌓여
             (76×4 + 24×3 + 50) **426**이다. 118px 하나로 두었더니 좁은 화면에서
             300px 넘게 밀렸다 — 스켈레톤이 본문과 다른 크기면 그만큼 화면이 튄다(CLS).
        */}
        <Skeleton className="h-[426px] rounded-2xl lg:h-[126px]" />

        <Skeleton className="rounded-2xl" style={{ height: LEADER_BOX_SKELETON_HEIGHT }} />
        <Skeleton className="rounded-2xl" style={{ height: MEETING_BOX_SKELETON_HEIGHT }} />
      </div>
    </main>
  );
}
