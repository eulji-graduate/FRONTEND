import { Skeleton } from "@/components/ui/skeleton";

/**
 * 뼈대는 **실제 배치와 같은 자리**에 둔다 — 다르면 채워질 때 화면이 튄다.
 * 기본 정보는 전폭 한 장, 조직 카드 둘은 **나란히**다 — 본문과 배치가 다르면 채워질 때 튄다.
 * ⚠️ 높이도 실제와 맞춘다. 기본 정보 카드는 지도(232) 때문에 560px 가까이 되는데 여기서
 *    392로 두면 로딩이 끝나는 순간 아래 두 카드가 통째로 아래로 튄다.
 */
export default function OwnerSettingLoading() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        <Skeleton className="h-[560px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          <Skeleton className="h-[420px] w-full rounded-2xl" />
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
