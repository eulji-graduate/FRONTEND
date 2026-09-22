import { Folder, GitBranch, User, Video } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  type ActionDetailInfoItem,
  ActionDetailInfoRows,
} from "@/components/common/action-detail-info-card";
import { formatMeetingDate } from "@/components/common/dashboard-meeting-item";
import { ProjectTag } from "@/components/common/project-tag";
import { getPersonalActionDetail } from "@/features/action/server";
import { getProjectDetail } from "@/features/project/server";
import { formatMonthDayWeekday } from "@/lib/date";

/**
 * 팀 이름 칩 — 프로젝트 태그와 **같은 몸집, 다른 옷**이다.
 *
 * ⚠️ 한 화면 안에서 생김새가 갈려 있었다(2026-08-11). 제목 옆은 `py-px leading-4 font-medium`,
 *    행 안쪽은 `py-0.5 leading-none font-semibold`라 같은 팀 이름이 두 모양으로 떴다.
 * ⚠️ **색을 안 쓴다.** 색은 프로젝트를 가르는 표식이라(§palette), 팀까지 물들이면 한 줄에
 *    색 칩이 둘이 되어 무엇이 프로젝트인지 알 수 없다.
 */
function TeamChip({ team }: { team: string }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex h-[18px] w-fit shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium tracking-[-0.1px] whitespace-nowrap">
      {team}
    </span>
  );
}

interface PersonalActionDetailPageProps {
  params: Promise<{ actionId: string }>;
}

export async function generateMetadata({
  params,
}: PersonalActionDetailPageProps): Promise<Metadata> {
  const { actionId } = await params;
  const action = await getPersonalActionDetail(actionId);
  return { title: action?.name ?? "액션" };
}

export default async function PersonalActionDetailPage({ params }: PersonalActionDetailPageProps) {
  const { actionId } = await params;
  const action = await getPersonalActionDetail(actionId);
  if (!action) notFound();

  const project = await getProjectDetail(String(action.projectId));
  if (!project) notFound();

  const infoItems: ActionDetailInfoItem[] = [
    {
      key: "assignee",
      icon: User,
      label: "담당자",
      // ⚠️ 역할 미지정이면 이름만, 담당자 자체가 없으면 "담당자 미정"(WORKFLOW.md §3-1-A) — 빈 칸으로 두지 않는다.
      content: action.assigneeName
        ? action.assigneeRoleLabel
          ? `${action.assigneeName}(${action.assigneeRoleLabel})`
          : action.assigneeName
        : "담당자 미정",
    },
    ...(action.sourceMeeting
      ? [
          {
            key: "source-meeting",
            icon: Video,
            label: "출처 회의",
            content: (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="truncate">{action.sourceMeeting.title}</p>
                  {action.projectTag ? <ProjectTag tag={action.projectTag} /> : null}
                </div>
                <p className="text-muted-foreground text-[11px] leading-4">
                  {formatMeetingDate(action.sourceMeeting.scheduledAt)}
                </p>
              </>
            ),
            href: `/app/meeting/${action.sourceMeeting.id}`,
          } satisfies ActionDetailInfoItem,
        ]
      : []),
    ...(action.parentTeamAction
      ? [
          {
            key: "parent-team-action",
            icon: GitBranch,
            label: "상위 팀 액션",
            content: (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="truncate">{action.parentTeamAction.name}</p>
                  {action.projectTag ? <ProjectTag tag={action.projectTag} /> : null}
                  <TeamChip team={action.parentTeamAction.team} />
                </div>
                <p className="text-muted-foreground text-[11px] leading-4">
                  {formatMonthDayWeekday(action.parentTeamAction.dueDate) ?? "-"}까지
                </p>
              </>
            ),
            href: `/app/projects/${action.projectId}/team/${action.parentTeamAction.id}`,
          } satisfies ActionDetailInfoItem,
        ]
      : []),
    {
      key: "project",
      icon: Folder,
      label: "관련 프로젝트",
      content: (
        <>
          <div className="flex items-center gap-1.5">
            <p className="truncate">{project.name}</p>
            <ProjectTag tag={project.tag} />
          </div>
          <p className="text-muted-foreground text-[11px] leading-4">
            {formatMonthDayWeekday(project.dueDate) ?? "-"}까지
          </p>
        </>
      ),
      href: `/app/projects/${project.id}`,
    },
  ];

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        {/*
          ⚠️ **제목 위에 경로를 한 줄 더 쓰지 않는다**(§page-header). 뒤로가기가 이제 왔던 길로
             돌아가고(§back-link), 어느 프로젝트·어느 팀 액션에 딸린 것인지는 오른쪽
             `세부 정보`가 이미 말한다 — 같은 값을 두 곳에 두면 하나가 바뀔 때 다른 하나가 남는다.
          ⚠️ 칩 규격은 목록·회의와 같다(11px, `font-mono` 아님).
        */}
        <div className="flex items-center gap-2">
          {/* ⚠️ 화면 제목은 22px이다 — 인수인계 상세·검토 화면과 같은 자리다(§DESIGN 4: 새 숫자를 만들지 않는다) */}
          <h2 className="text-foreground text-[22px] leading-[30px] font-semibold tracking-[-0.4px]">
            {action.name}
          </h2>
          {action.projectTag ? <ProjectTag tag={action.projectTag} /> : null}
          {/*
            ⚠️ **개인 액션은 팀이 없다**(BE `ActionTypeShapePolicy`) — 없으면 칩 자체를 안 그린다.
               전에는 빈 회색 칩이 매번 그려졌다.
          */}
          {action.team ? <TeamChip team={action.team} /> : null}
        </div>

        {/*
            ⚠️ **한 카드에 쌓는다**(2026-08-10). 전에는 왼쪽 설명 + 오른쪽 sticky 세부 정보로
               2컬럼이었는데, 이 화면이 담는 것은 문단 하나와 값 서너 개뿐이라 왼쪽 글이
               1000px까지 늘어나고(읽는 글은 좁게 둔다 — DESIGN §4) 화면 아래가 통째로 비었다.
               카드 하나로 모으면 **내용만큼만** 차지한다.
            ⚠️ 카드는 **본문 폭을 그대로 쓴다.** 720으로 좁혀 왼쪽에 붙여 뒀더니 오른쪽이
               통째로 비어 화면이 한쪽으로 밀린 것처럼 보였다 — 제목·탭은 왼쪽 끝에 있는데
               카드만 좁으니 축이 둘이 됐다.
            ⚠️ 대신 **글줄만 720에서 끊는다**(§4 읽는 글은 좁게 둔다). 한 줄이 1000px을 넘으면
               눈이 다음 줄을 못 찾는다 — 좁혀야 하는 건 카드가 아니라 글이다.
          */}
        <section className="border-border bg-card w-full overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-2 px-7 pt-6 pb-3">
            <h3 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">내용</h3>
          </div>
          {/*
            ⚠️ **선과 글줄 폭을 갈라 둔다.** 전에는 `max-w-[720px] border-t`가 같은 요소에
               걸려 있어서 구분선이 카드 왼쪽 720px에서 뚝 끊겼다 — 바로 아래 정보 행들의
               선은 카드 끝까지 이어지는데 이 선만 짧아 카드가 깨져 보였다.
               선·안쪽 여백은 전폭 래퍼가, 720은 **글에만** 건다(§4 읽는 글은 좁게 둔다).
          */}
          <div className="border-border border-t px-7 py-6">
            <p className="text-muted-foreground max-w-[720px] text-[13px] leading-[22px] whitespace-pre-wrap">
              {action.description}
            </p>
          </div>
          <ActionDetailInfoRows items={infoItems} />
        </section>
      </div>
    </main>
  );
}
