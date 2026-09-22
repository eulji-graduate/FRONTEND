import { Users } from "lucide-react";
import type { Metadata } from "next";

import { AccessDenied } from "@/components/common/access-denied";
import { EmptyState } from "@/components/common/empty-state";
import { SummaryCard } from "@/components/common/summary-card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { MemberStatusRow } from "@/features/team/components/member-status-row";
import { RecentTeamMeetings } from "@/features/team/components/recent-team-meetings";
import { MEMBER_BOX_MAX_HEIGHT } from "@/features/team/lib";
import { getTeamDashboardOverview } from "@/features/team/server";
import { canAccessTeamScope } from "@/lib/permission";

export const metadata: Metadata = {
  title: "대시보드",
};

/** 표 머리 셀 — 규격은 DESIGN §3·§4(라벨 12px, 이름 열만 왼쪽). */
const HEAD_CELL_CLASS = "text-muted-foreground h-9 text-[12px] leading-4 font-normal";

export default async function TeamDashboardPage() {
  const viewer = await getViewer();
  if (!canAccessTeamScope(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const {
    teamName,
    teamActionCount,
    memberActionCount,
    myActionCount,
    doneActionCount,
    members,
    meetings,
  } = await getTeamDashboardOverview(viewer);

  /* 상단 요약 — 오너 대시보드와 같은 공용 카드다(DESIGN §2). 색 강조는 두지 않는다(§5). */
  const summaryItems = [
    { label: "팀 액션", value: String(teamActionCount), meta: "진행 중" },
    { label: "팀원 액션", value: String(memberActionCount), meta: "팀 액션 기준" },
    { label: "내 액션", value: String(myActionCount), meta: "처리 예정" },
    { label: "완료 액션", value: String(doneActionCount), meta: "내 누적" },
  ];

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/* ⚠️ 화면엔 제목을 안 그리지만 문서에는 있어야 한다 — `h1`이 없으면 층이 `h2`부터다(§a11y) */}
        <h1 className="sr-only">팀장 대시보드</h1>

        <SummaryCard items={summaryItems} />

        <section
          className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border"
          style={{ maxHeight: MEMBER_BOX_MAX_HEIGHT }}
        >
          {/*
            ⚠️ 제목 줄에 **선을 긋지 않는다.** 바로 아래 표 머리 띠가 이미 "여기부터 내용"을
               긋고 있어서, 선까지 있으면 층을 나누는 것이 두 줄이 된다 — DESIGN §2는
               카드 안의 선을 **표가 시작하는 자리 하나**로 못 박는다. 두 줄이던 탓에 제목이
               아래 띠에 달라붙어 보였다.
            ⚠️ 대신 아래 여백을 12 → 20으로 벌린다. 선이 하던 일을 여백이 한다.
          */}
          <div className="border-border flex shrink-0 items-baseline justify-between gap-3 px-7 pt-6 pb-3">
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">팀원 현황</h2>
            <span className="text-muted-foreground text-[12px] leading-4">
              {teamName} · {members.length}명
            </span>
          </div>
          {members.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon={Users}
              title="아직 등록된 팀원이 없습니다."
              description="사원 관리에서 이 팀에 사원을 배치하면 여기에 나타납니다."
            />
          ) : (
            <div className="scrollbar-hidden flex-1 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
              <Table className="min-w-[560px] table-fixed text-[13px]">
                {/* 머리 띠·셀 규격은 오너 대시보드와 같다(DESIGN §3) — 두 화면이 같은 표다 */}
                <TableHeader>
                  <TableRow className="bg-secondary/50 border-border hover:bg-secondary/50 border-b">
                    <TableHead className={`${HEAD_CELL_CLASS} pl-6`}>이름</TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} text-center`}>직급</TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} text-center`}>역할</TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} text-center`}>담당 액션 수</TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} pr-6 text-center`}>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <MemberStatusRow key={member.id} member={member} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <RecentTeamMeetings meetings={meetings} />
      </div>
    </main>
  );
}
