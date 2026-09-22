import { Skeleton } from "@/components/ui/skeleton";
import { MEETING_BOX_SKELETON_HEIGHT } from "@/features/member/lib";

/** 대시보드를 불러오는 동안. 실제 화면과 같은 골격(위 D-7 채움 + 아래 회의 고정)이라 흔들리지 않는다. */
export default function Loading() {
  return (
    <main className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-7">
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-7">
        <Skeleton className="min-h-0 flex-1 rounded-2xl" />
        <Skeleton
          className="shrink-0 rounded-2xl"
          style={{ height: MEETING_BOX_SKELETON_HEIGHT }}
        />
      </div>
    </main>
  );
}
