import { Skeleton } from "@/components/ui/skeleton";

/** 뼈대는 **실제 배치와 같은 자리**에 둔다 — 왼쪽 360px + 오른쪽 나머지. */
export default function ManageMemberDetailLoading() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-7 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-[196px] w-full rounded-2xl" />
          <Skeleton className="h-[232px] w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[260px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
