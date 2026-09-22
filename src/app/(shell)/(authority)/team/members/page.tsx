import { Users } from "lucide-react";
import type { Metadata } from "next";

import { AccessDenied } from "@/components/common/access-denied";
import { EmptyState } from "@/components/common/empty-state";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { TeamMemberAccordionCard } from "@/features/team/members/components/team-member-accordion-card";
import { TeamMemberControls } from "@/features/team/members/components/team-member-controls";
import { parseTeamMemberFilter, parseTeamMemberSort } from "@/features/team/members/lib";
import { getTeamMemberStatuses } from "@/features/team/members/server";
import { canAccessTeamScope } from "@/lib/permission";

export const metadata: Metadata = {
  title: "팀원 관리",
};

interface TeamMembersPageProps {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}

/**
 * 팀원 관리 — 카드 아코디언(WORKFLOW.md §팀원 관리).
 * ⚠️ 팀원 ~6명 규모 가정 — 페이지네이션 없이 전부 렌더링한다.
 */
export default async function TeamMembersPage({ searchParams }: TeamMembersPageProps) {
  const viewer = await getViewer();
  if (!canAccessTeamScope(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const params = await searchParams;
  const sort = parseTeamMemberSort(params.sort);
  const filter = parseTeamMemberFilter(params.filter);
  const members = await getTeamMemberStatuses(sort, filter, viewer);

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] leading-[30px] font-semibold tracking-[-0.4px]">
              팀원 현황
            </h2>
            {/* ⚠️ `~합니다체`다(CLAUDE.md 2026-08-04) — `확인해요`는 그 변경 전 문구다 */}
            <p className="text-muted-foreground pt-1 text-[13px] leading-5">
              누가 과부하인지, 누구에게 일을 더 줄 수 있는지 확인합니다.
            </p>
          </div>
          {/* ⚠️ **건수를 적는다**(CLAUDE.md §목록). 거르개가 있어 `전체`가 아니라 `결과`다 —
              거른 수를 `전체`라 부르면 탭 합계와 어긋난다. */}
          <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
            결과 {members.length}명
          </p>
        </div>

        <TeamMemberControls activeSort={sort} activeFilter={filter} />

        {members.length === 0 ? (
          <div className="border-border bg-card rounded-2xl border">
            <EmptyState
              icon={Users}
              title="조건에 맞는 팀원이 없습니다."
              description="위 정렬·필터를 바꾸면 다른 팀원을 볼 수 있습니다."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((member) => (
              <TeamMemberAccordionCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
