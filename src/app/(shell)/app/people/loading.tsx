import { Skeleton } from "@/components/ui/skeleton";

/**
 * ⚠️ **본문과 같은 골격**으로 그린다 — 카드 한 장·폭(1440)·카드 여백(`px-7`)·검색줄·칸 폭이
 *    본문과 같아야 로딩이 끝날 때 화면이 안 튄다(§DESIGN 4).
 * ⚠️ 팀 수는 미리 알 수 없다. 목의 회사가 네 팀이라 네 가지로 두되, **연결선까지 그린다** —
 *    선이 로딩에만 없으면 본문으로 넘어갈 때 팀이 통째로 왼쪽으로 밀린다.
 */

/** 사람 한 명 상자의 높이 — 아바타(32) + 위아래 여백(24) + 보더(2) */
const NODE_HEIGHT_CLASS = "h-[62px]";

/** 척추가 서는 자리 · 가지가 갈라지는 높이 — 본문과 같은 값이다 */
const SPINE_OFFSET = "30px";
const BRANCH_OFFSET = "1.75rem";

const NODE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-2";

export default function Loading() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto w-full max-w-[1440px]">
        <section className="border-border bg-card rounded-2xl border">
          <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="px-7 pb-5">
            <Skeleton className="h-9 w-full max-w-[280px] rounded-md" />
          </div>

          <div className="px-7 pt-2 pb-7">
            <div className={NODE_GRID_CLASS}>
              <Skeleton className={`${NODE_HEIGHT_CLASS} rounded-xl`} />
            </div>

            <ul style={{ marginLeft: SPINE_OFFSET }}>
              {[0, 1, 2, 3].map((branch) => (
                <li key={branch} className="relative pt-4 pl-7">
                  <span
                    className="bg-border absolute top-0 left-0 w-px"
                    style={branch === 3 ? { height: BRANCH_OFFSET } : { height: "100%" }}
                    aria-hidden
                  />
                  <span
                    className="bg-border absolute left-0 h-px w-5"
                    style={{ top: BRANCH_OFFSET }}
                    aria-hidden
                  />

                  <div className="flex items-baseline gap-2 pb-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <div className={NODE_GRID_CLASS}>
                    <Skeleton className={`${NODE_HEIGHT_CLASS} rounded-xl`} />
                    <Skeleton className={`${NODE_HEIGHT_CLASS} rounded-xl`} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
