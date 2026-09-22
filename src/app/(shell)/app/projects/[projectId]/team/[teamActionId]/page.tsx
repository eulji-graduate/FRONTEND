import { Folder, User, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  type ActionDetailInfoItem,
  ActionDetailInfoRows,
} from "@/components/common/action-detail-info-card";
import { AttachmentList } from "@/components/common/attachment-list";
import { formatMeetingDate } from "@/components/common/dashboard-meeting-item";
import { StatusDot } from "@/components/common/status-dot";
import { ACTION_DELAYED_LABEL, ACTION_STATUS_LABEL, isDelayed } from "@/constants/domain";
import type { TimelineActionInput } from "@/features/member/action-timeline";
import { ActionTimeline, ActionTimelineLegend } from "@/features/member/components/action-timeline";
import { getTeamActionAttachmentDownloadUrlAction } from "@/features/project/actions";
import {
  parseTeamActionDetailTab,
  TEAM_ACTION_DETAIL_TABS,
  TEAM_ACTION_TIMELINE_BOX_MAX_HEIGHT,
} from "@/features/project/lib";
import {
  getProjectDetail,
  getTeamActionDetail,
  getTeamActionPersonalItems,
} from "@/features/project/server";
import { formatMonthDayWeekday } from "@/lib/date";
import { pickPaletteColor } from "@/lib/palette";
import { cn } from "@/lib/utils";

interface TeamActionDetailPageProps {
  params: Promise<{ projectId: string; teamActionId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: TeamActionDetailPageProps): Promise<Metadata> {
  const { teamActionId } = await params;
  const teamAction = await getTeamActionDetail(teamActionId);
  return { title: teamAction?.name ?? "팀 액션" };
}

export default async function TeamActionDetailPage({
  params,
  searchParams,
}: TeamActionDetailPageProps) {
  const { projectId, teamActionId } = await params;
  const [teamAction, project] = await Promise.all([
    getTeamActionDetail(teamActionId),
    getProjectDetail(projectId),
  ]);
  // ⚠️ 팀 액션이 이 프로젝트에 속하지 않으면(다른 프로젝트의 id를 끼워 넣은 경우) 404 —
  //    팀 액션 id만으로도 찾아지지만 URL의 projectId와 어긋나면 잘못된 경로다.
  if (!teamAction || !project || teamAction.projectId !== project.id) notFound();

  const activeTab = parseTeamActionDetailTab((await searchParams).tab);
  const tagColor = pickPaletteColor(teamAction.projectTag);

  const personalItems =
    activeTab === "timeline" ? await getTeamActionPersonalItems(teamActionId) : [];
  const timelineItems: TimelineActionInput[] = personalItems.map((item) => {
    // ⚠️ 이 화면은 담당자별 행이라(WORKFLOW.md §4) 칩에 액션명이 아니라 담당자 이름(역할)을 단다.
    const assignee = item.assigneeRoleLabel
      ? `${item.assigneeName}(${item.assigneeRoleLabel})`
      : item.assigneeName;
    return {
      id: String(item.id),
      title: item.title,
      tag: assignee,
      tagBgColor: "var(--muted)",
      tagTextColor: "var(--muted-foreground)",
      startDate: item.startDate,
      dueDate: item.dueDate,
      tone: isDelayed(item) ? "DELAYED" : item.status,
      href: `/app/actions/${item.id}`,
    };
  });

  const infoItems: ActionDetailInfoItem[] = [
    // ⚠️ 팀장 공석이면 담당자 행 자체를 안 보여준다 — 없는 사람을 지어내지 않는다(§정직성).
    ...(teamAction.assigneeName
      ? [
          {
            key: "assignee",
            icon: User,
            label: "담당자",
            content: teamAction.assigneeRoleLabel
              ? `${teamAction.assigneeName}(${teamAction.assigneeRoleLabel})`
              : teamAction.assigneeName,
          } satisfies ActionDetailInfoItem,
        ]
      : []),
    ...(teamAction.sourceMeeting
      ? [
          {
            key: "source-meeting",
            icon: Video,
            label: "출처 회의",
            content: (
              <>
                <div className="flex items-center gap-1.5">
                  <p className="truncate">{teamAction.sourceMeeting.title}</p>
                  <span
                    className="shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium"
                    style={{ backgroundColor: tagColor.bgColor, color: tagColor.textColor }}
                  >
                    {teamAction.projectTag}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-4">
                  {formatMeetingDate(teamAction.sourceMeeting.scheduledAt)}
                </p>
              </>
            ),
            href: `/app/meeting/${teamAction.sourceMeeting.id}`,
          } satisfies ActionDetailInfoItem,
        ]
      : []),
    // ⚠️ 상위 팀 액션 — 팀 액션 상세엔 없음(개인 액션 상세에서만 씀).
    {
      key: "project",
      icon: Folder,
      label: "관련 프로젝트",
      content: (
        <>
          <div className="flex items-center gap-1.5">
            <p className="truncate">{project.name}</p>
            <span
              className="shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium"
              style={{ backgroundColor: tagColor.bgColor, color: tagColor.textColor }}
            >
              {project.tag}
            </span>
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
          ⚠️ **제목 위에 경로를 한 줄 더 쓰지 않는다**(§page-header, 프로젝트 상세와 같은 정리).
             어느 프로젝트인지는 오른쪽 `세부 정보`의 **관련 프로젝트**가 이미 말한다 —
             같은 값을 두 곳에 두면 하나가 바뀔 때 다른 하나가 남는다.
          ⚠️ 칩 규격은 목록·회의와 같다(11px, `font-mono` 아님).
        */}
        <div className="flex items-center gap-2">
          {/* ⚠️ 화면 제목은 22px이다 — 인수인계 상세·검토 화면과 같은 자리다(§DESIGN 4: 새 숫자를 만들지 않는다) */}
          <h2 className="text-foreground text-[22px] leading-[30px] font-semibold tracking-[-0.4px]">
            {teamAction.name}
          </h2>
          <span
            className="shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium"
            style={{ backgroundColor: tagColor.bgColor, color: tagColor.textColor }}
          >
            {teamAction.projectTag}
          </span>
          <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium">
            {teamAction.team}
          </span>
          {/* ⚠️ 상태·마감(WORKFLOW.md §4) — BE가 이미 내려주는 값인데 매퍼가 빠뜨렸었다(2026-08-16 고침). */}
          <StatusDot
            tone={isDelayed(teamAction) ? "DELAYED" : teamAction.status}
            label={
              isDelayed(teamAction) ? ACTION_DELAYED_LABEL : ACTION_STATUS_LABEL[teamAction.status]
            }
          />
          <span className="text-muted-foreground text-[12px] leading-4">
            {formatMonthDayWeekday(teamAction.dueDate) ?? "-"}까지
          </span>
        </div>

        <nav aria-label="팀 액션 상세 탭" className="border-border flex gap-4 border-b">
          {TEAM_ACTION_DETAIL_TABS.map((t) => (
            <Link
              key={t.tab}
              href={
                t.tab === "detail"
                  ? `/app/projects/${project.id}/team/${teamAction.id}`
                  : `/app/projects/${project.id}/team/${teamAction.id}?tab=${t.tab}`
              }
              aria-current={activeTab === t.tab ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-1 pb-2 text-[13px] leading-5 font-medium transition-colors",
                activeTab === t.tab
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {activeTab === "detail" ? (
          /*
            ⚠️ **한 카드에 쌓는다**(2026-08-10). 전에는 왼쪽 설명 + 오른쪽 sticky 세부 정보로
               2컬럼이었는데, 이 화면이 담는 것은 문단 하나와 값 서너 개뿐이라 왼쪽 글이
               1000px까지 늘어나고(읽는 글은 좁게 둔다 — DESIGN §4) 화면 아래가 통째로 비었다.
               카드 하나로 모으면 **내용만큼만** 차지한다.
            ⚠️ 카드는 **본문 폭을 그대로 쓴다.** 720으로 좁혀 왼쪽에 붙여 뒀더니 오른쪽이
               통째로 비어 화면이 한쪽으로 밀린 것처럼 보였다 — 제목·탭은 왼쪽 끝에 있는데
               카드만 좁으니 축이 둘이 됐다.
            ⚠️ 대신 **글줄만 720에서 끊는다**(§4 읽는 글은 좁게 둔다). 한 줄이 1000px을 넘으면
               눈이 다음 줄을 못 찾는다 — 좁혀야 하는 건 카드가 아니라 글이다.
          */
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
            <div className="border-border flex flex-col gap-4 border-t px-7 py-6">
              <p className="text-muted-foreground max-w-[720px] text-[13px] leading-[22px] whitespace-pre-wrap">
                {teamAction.description}
              </p>
              <AttachmentList
                attachments={teamAction.attachments}
                fetchDownloadUrl={getTeamActionAttachmentDownloadUrlAction.bind(
                  null,
                  teamAction.id,
                )}
              />
            </div>
            <ActionDetailInfoRows items={infoItems} />
          </section>
        ) : (
          <section
            className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border"
            style={{ maxHeight: TEAM_ACTION_TIMELINE_BOX_MAX_HEIGHT }}
          >
            <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-7 pt-6 pb-3">
              <h3 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">
                팀원별 액션 타임라인
              </h3>
              <ActionTimelineLegend />
            </div>
            <ActionTimeline
              items={timelineItems}
              today={new Date()}
              emptyLabel="아직 하달된 개인 액션이 없습니다."
            />
          </section>
        )}
      </div>
    </main>
  );
}
