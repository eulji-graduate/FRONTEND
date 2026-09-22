import { AuthShell } from "./auth-shell";

/**
 * 계정 화면을 불러오는 동안 — 카드 자리를 미리 잡아 화면이 들썩이지 않게 한다.
 *
 * ⚠️ 껍데기(`AuthShell`)는 그대로 그린다. 왼쪽 패널까지 껌뻑이면 로딩이 더 길어 보인다 —
 *    바뀌는 건 카드 안쪽뿐이다.
 */
interface AuthSkeletonProps {
  /** 입력칸 자리 몇 개를 잡아 둘지 — 화면마다 칸 수가 다르다 */
  rowCount?: number;
}

export function AuthSkeleton({ rowCount = 2 }: AuthSkeletonProps) {
  return (
    <AuthShell hasLegalNotice={false}>
      <div className="border-border bg-card rounded-2xl border p-12">
        <div className="bg-muted h-9 w-1/2 animate-pulse rounded-md" />
        <div className="bg-muted mt-3 h-5 w-3/4 animate-pulse rounded-md" />
        <div className="flex flex-col gap-4 pt-8">
          {Array.from({ length: rowCount }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <div className="bg-muted h-4 w-20 animate-pulse rounded" />
              <div className="bg-muted h-9 w-full animate-pulse rounded-lg" />
            </div>
          ))}
          <div className="bg-muted mt-2 h-12 w-full animate-pulse rounded-md" />
        </div>
      </div>
    </AuthShell>
  );
}
