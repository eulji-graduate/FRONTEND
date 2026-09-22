import { Skeleton } from "@/components/ui/skeleton";

/** 뼈대는 실제 배치와 같은 자리 — 추가 버튼 줄 + 목록 카드 하나(`manage/storage/loading.tsx`와 같은 이유). */
export default function ManageRoomsLoading() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
