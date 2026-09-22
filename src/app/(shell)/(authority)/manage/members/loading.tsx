import { Skeleton } from "@/components/ui/skeleton";

/** 뼈대는 **실제 배치와 같은 자리**에 둔다 — 다르면 채워질 때 화면이 튄다(카드 한 장). */
export default function ManageMembersLoading() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto w-full max-w-[1440px]">
        <Skeleton className="h-[560px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
