import { ClipboardList } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccessDenied } from "@/components/common/access-denied";
import { EmptyState } from "@/components/common/empty-state";
import {
  LEADER_HANDOVER_CUSTODY_STATUS,
  LEADER_HANDOVER_CUSTODY_STATUS_LABEL,
} from "@/constants/domain";
import {
  LEADER_HANDOVER_FILTER_TABS,
  parseCustodyFilter,
  toCustodyStatus,
} from "@/features/leader-handover/lib";
import { listLeaderHandovers } from "@/features/leader-handover/server";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { formatMonthDayWeekday } from "@/lib/date";
import { canManageLeaderHandovers } from "@/lib/permission";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "인수인계서 관리",
};

interface LeaderHandoversPageProps {
  searchParams: Promise<{ status?: string }>;
}

/**
 * 인수인계서 관리 — 오프보딩 최종 승인이 끝난 뒤 담당자 없이 남는 개인 액션
 * 뭉치를 새 팀장에게 넘길 때까지 모아 보여준다(WORKFLOW.md §7).
 * ⚠️ **오프보딩만** 올라온다 — 팀장 휴직은 본인이 재할당을 마치고 올라가 여기 없다.
 * ⚠️ 사원 관리 최종 승인과의 실제 연동은 범위 밖이다(고정 mock, 2026-08-08 사용자 확인).
 */
export default async function LeaderHandoversPage({ searchParams }: LeaderHandoversPageProps) {
  const viewer = await getViewer();
  if (!canManageLeaderHandovers(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const params = await searchParams;
  const activeFilter = parseCustodyFilter(params.status);
  const items = await listLeaderHandovers(toCustodyStatus(activeFilter));

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/*
          ⚠️ **거르개를 카드 안으로 들인다**(2026-08-11). 카드 밖에 검은 알약으로 떠 있어서
             ① 목록이 어디서 시작하는지 화면에 안 그려졌고 ② 이 화면에서 제일 무거운 것이
             거르개가 됐다 — **고르는 자리는 버튼이 아니다.** 프로젝트·사원 관리는 이미
             한 카드 안에 툴바 한 줄 + 표로 서 있다.
          ⚠️ 그래서 모양도 그 둘과 같다: 틀(트랙) 안에서 **고른 것만 떠오른다.** 배경으로
             알리지 않고 층으로 알린다(§DESIGN 5 — 색을 하나 더 쓰지 않는다).
        */}
        <section className="border-border bg-card overflow-hidden rounded-2xl border">
          <div className="flex flex-wrap items-center gap-3 px-7 pt-6 pb-5">
            <nav
              aria-label="귀속 상태 필터"
              className="border-border bg-secondary/60 flex items-center gap-0.5 rounded-lg border p-0.5"
            >
              {LEADER_HANDOVER_FILTER_TABS.map((tab) => {
                const selected = activeFilter === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={
                      tab.value === "all"
                        ? "/owner/leader-handovers"
                        : `/owner/leader-handovers?status=${tab.value}`
                    }
                    aria-current={selected ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-ring flex h-7 items-center rounded-md px-3 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
                      selected
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            {/* 남는 자리는 비워 둔다 — 건수가 오른쪽 끝에 선다 */}
            <span className="flex-1" aria-hidden />

            {/* ⚠️ **건수를 머리에 적는다**(CLAUDE.md §목록). 거르개가 있는 목록이라 `전체`가 아니라
                 `결과`다 — 거른 수를 `전체`라 부르면 탭 합계와 어긋나 거짓말이 된다. */}
            <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
              결과 {items.length}건
            </p>
          </div>

          {/*
            표 머리 — 값이 어느 열인지 알린다(DESIGN §3).
            ⚠️ **머리와 값이 열마다 같은 축을 쓴다.** 폭만 맞추고 정렬을 안 정해 두면 글자
               길이에 따라 축이 흔들려 오와 열이 어긋난다 — 날짜는 오른쪽, 상태는 가운데,
               나머지는 왼쪽이다(§DESIGN 3: 사람이 훑는 건 끝에 오는 값이다).
          */}
          {/*
            ⚠️ **머리와 줄을 한 통에 넣고 가로로 굴린다**(2026-08-11, 코드래빗 지적).
               고정폭 열이 다섯인데 제목만 `flex-1`이라, 좁은 화면에서는 제목이 0에 가깝게
               쭈그러들거나 줄이 화면 밖으로 나갔다 — 표는 `overflow-x-auto`로 감싼다(§CLAUDE 디자인 토큰).
            ⚠️ 머리와 줄이 **같은 통** 안에 있어야 한다. 따로 감싸면 가로로 굴릴 때 둘이 어긋난다.
          */}
          <div className="overflow-x-auto">
            <div className="border-border text-muted-foreground bg-secondary/50 flex min-w-[860px] items-center gap-4 border-y px-7 py-3 text-[12px] leading-4">
              <span className="min-w-0 flex-1">인수인계서명</span>
              <span className="w-24 shrink-0 text-center">퇴사 팀장</span>
              <span className="w-24 shrink-0 text-center">팀</span>
              <span className="w-32 shrink-0 text-center">오프보딩 승인일</span>
              <span className="w-24 shrink-0 text-center">상태</span>
              {/* chevron 자리 — 머리에는 라벨을 안 붙인다 */}
              <span className="w-4 shrink-0" aria-hidden />
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="해당하는 인수인계서가 없습니다."
                description="팀장 오프보딩을 오너가 최종 승인하면 이 자리에 올라옵니다."
              />
            ) : (
              <ul>
                {items.map((item) => {
                  const isAssigned = item.custodyStatus === LEADER_HANDOVER_CUSTODY_STATUS.ASSIGNED;
                  return (
                    <li key={item.id} className="border-border not-first:border-t">
                      <Link
                        href={`/owner/leader-handovers/${item.id}`}
                        className="hover:bg-foreground/[0.04] focus-visible:ring-ring group flex min-w-[860px] items-center gap-4 px-7 py-4 text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                        <span className="text-muted-foreground w-24 shrink-0 truncate text-center">
                          {item.formerLeaderName}
                        </span>
                        <span className="text-muted-foreground w-24 shrink-0 truncate text-center">
                          {item.teamName}
                        </span>
                        <span className="text-muted-foreground w-32 shrink-0 text-center tabular-nums">
                          {formatMonthDayWeekday(item.offboardingApprovedAt)}
                        </span>
                        {/*
                        ⚠️ 상태는 **명도로 가른다**(§DESIGN 5 — 색은 에러뿐). 아직 안 넘긴 것이
                           진하고, 넘긴 것은 흐리다 — 지금 다뤄야 할 것이 먼저 읽혀야 한다.
                        ⚠️ 배지를 열 폭(`w-24`) 안에서 가운데 놓는다. 배지 자체를 열로 쓰면
                           글자 길이에 따라 축이 흔들려 머리와 어긋난다.
                      */}
                        <span className="w-24 shrink-0">
                          <span
                            className={cn(
                              "mx-auto flex h-6 w-20 items-center justify-center rounded-md border text-[11px] leading-4",
                              isAssigned
                                ? "border-border text-muted-foreground/70"
                                : "border-foreground/30 bg-foreground/[0.06] text-foreground font-medium",
                            )}
                          >
                            {LEADER_HANDOVER_CUSTODY_STATUS_LABEL[item.custodyStatus]}
                          </span>
                        </span>
                        {/* ⚠️ 줄이 눌린다는 걸 적어 둔다 — 손가락 커서는 얹어야 보인다 */}
                        <ChevronRight
                          className="text-muted-foreground/50 group-hover:text-muted-foreground size-4 shrink-0 transition-colors"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
