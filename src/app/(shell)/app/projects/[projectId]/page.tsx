import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TimelineActionInput } from "@/features/member/action-timeline";
import { ActionTimeline, ActionTimelineLegend } from "@/features/member/components/action-timeline";
import { ProjectAttachmentManager } from "@/features/project/components/project-attachment-manager";
import {
  parseProjectDetailTab,
  PROJECT_DETAIL_TABS,
  PROJECT_TIMELINE_BOX_MAX_HEIGHT,
  splitDepartments,
} from "@/features/project/lib";
import { getProjectDetail, getProjectTeamActions } from "@/features/project/server";
import { getViewer } from "@/features/shell/viewer";
import { formatMonthDayWeekday } from "@/lib/date";
import { paletteColorByName } from "@/lib/palette";
import { canEditProjectPlan } from "@/lib/permission";
import { cn } from "@/lib/utils";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectDetail(projectId);
  return { title: project?.name ?? "프로젝트" };
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const [project, viewer] = await Promise.all([getProjectDetail(projectId), getViewer()]);
  if (!project) notFound();

  const activeTab = parseProjectDetailTab((await searchParams).tab);
  /* ⚠️ 사용자가 저장한 색을 그대로 쓴다 — 태그 이름 해시가 아니다(§palette). */
  const tagColor = paletteColorByName(project.tagColor);
  const due = formatMonthDayWeekday(project.dueDate);
  const { visible: visibleTeamNames, overflow: teamOverflow } = splitDepartments(project.teamNames);
  const visibleTeamBadges = visibleTeamNames.map((team) => (
    <Badge key={team} variant="outline" className="shrink-0">
      {team}
    </Badge>
  ));

  const teamActions =
    activeTab === "timeline" ? await getProjectTeamActions(String(project.id)) : [];
  const timelineItems: TimelineActionInput[] = teamActions.map((action) => {
    // ⚠️ 이 화면은 이미 프로젝트 하나로 좁혀져 있어 태그 칩은 노이즈다 — 대신 팀명을 단다.
    // ⚠️ 팀명은 무색이다(다른 대시보드의 팀명 라벨과 같은 결) — 팔레트는 프로젝트 태그 전용.
    return {
      id: String(action.id),
      title: action.name,
      tag: action.team,
      tagBgColor: "var(--muted)",
      tagTextColor: "var(--muted-foreground)",
      startDate: action.startDate,
      dueDate: action.dueDate,
      /*
        ⚠️ **BE 판정을 쓴다** — 프로젝트 타임라인만 BE가 이미 `isDelayed`를 계산해 보낸다
           (`ProjectTimelineItemResponse`). 다른 화면(내 액션·팀 액션 목록 등)은 목 경로에도
           같은 배지가 필요해 로컬 계산(`isDelayed`)을 그대로 쓴다 — 여기만 두 벌이 되는 것을
           피한다(자정 경계 어긋남 방지).
      */
      tone: action.isDelayed ? "DELAYED" : action.status,
      // ⚠️ 식별자는 action.id(팀 액션 ID)를 쓴다 — action.team(팀명)으로 경로를 만들면
      //    같은 팀에 팀 액션이 여러 개일 때 서로 구분이 안 된다.
      href: `/app/projects/${project.id}/team/${action.id}`,
    };
  });

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        {/*
          ⚠️ **제목 위에 경로를 한 줄 더 쓰지 않는다**(§page-header). 상단바에 이미 뒤로가기
             화살표와 `프로젝트`가 있어서 `프로젝트 > 이름`은 같은 말을 두 번 하는 줄이었다.
          ⚠️ 태그 칩 규격은 목록·회의 카드와 같다(11px, `font-mono` 아님).
        */}
        <div className="flex items-center gap-2">
          {/* ⚠️ 화면 제목은 22px이다 — 인수인계 상세·검토 화면과 같은 자리다(§DESIGN 4: 새 숫자를 만들지 않는다) */}
          <h2 className="text-foreground text-[22px] leading-[30px] font-semibold tracking-[-0.4px]">
            {project.name}
          </h2>
          <span
            className="shrink-0 rounded px-1.5 py-px text-[11px] leading-4 font-medium"
            style={{ backgroundColor: tagColor.bgColor, color: tagColor.textColor }}
          >
            {project.tag}
          </span>
        </div>

        <nav aria-label="프로젝트 상세 탭" className="border-border flex gap-4 border-b">
          {PROJECT_DETAIL_TABS.map((t) => (
            <Link
              key={t.tab}
              href={
                t.tab === "plan"
                  ? `/app/projects/${project.id}`
                  : `/app/projects/${project.id}?tab=${t.tab}`
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

        {activeTab === "plan" ? (
          // ⚠️ 헤더에 제목을 또 안 둔다 — 위 페이지 헤더가 이미 제목+태그를 보여준다(팀 액션
          //    상세와 같은 결). 그래서 머리 표식(dot)도 없다 — 단일 카드라 §4 "단일 카드 p-7".
          <section className="border-border bg-card flex flex-col gap-5 rounded-2xl border p-7">
            {/*
              ⚠️ **값에 라벨을 붙인다**(DESIGN §2 라벨·값 한 쌍). 전에는 마감일과 팀 배지만
                 오른쪽 끝에 떠 있어서, 무슨 값인지 화면에 안 적혀 있었고 카드 왼쪽 절반이
                 통째로 비었다.
              ⚠️ 왼쪽부터 채운다 — 읽는 순서가 왼쪽에서 오른쪽이라, 카드에서 처음 만나는 값이
                 오른쪽 끝에 있으면 눈이 되돌아온다.
            */}
            <dl className="flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <dt className="text-muted-foreground text-[12px] leading-4">마감</dt>
                <dd className="pt-1.5 text-[13px] leading-5 tabular-nums">
                  {due ? `${due}까지` : "-"}
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground text-[12px] leading-4">참여 팀</dt>
                <dd
                  className="flex flex-wrap items-center gap-1 pt-1.5"
                  aria-label={`참여 팀: ${project.teamNames.join(", ")}`}
                >
                  {teamOverflow > 0 ? (
                    <Tooltip>
                      <TooltipTrigger
                        tabIndex={0}
                        render={<span className="flex flex-wrap items-center gap-1" />}
                      >
                        {visibleTeamBadges}
                        <Badge variant="secondary" className="shrink-0">
                          +{teamOverflow}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-none">
                        <span className="whitespace-nowrap">{project.teamNames.join(" · ")}</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    visibleTeamBadges
                  )}
                </dd>
              </div>
            </dl>

            <p className="text-muted-foreground border-border border-t pt-5 text-[13px] leading-[22px] whitespace-pre-wrap">
              {project.description}
            </p>
            <ProjectAttachmentManager
              projectId={project.id}
              attachments={project.attachments}
              canEdit={canEditProjectPlan(viewer)}
            />
          </section>
        ) : (
          <section
            className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border"
            style={{ maxHeight: PROJECT_TIMELINE_BOX_MAX_HEIGHT }}
          >
            {/*
            ⚠️ 제목 줄에 **선을 긋지 않는다.** 바로 아래 표 머리 띠가 이미 "여기부터 내용"을
               긋고 있어서, 선까지 있으면 층을 나누는 것이 두 줄이 된다 — DESIGN §2는
               카드 안의 선을 **표가 시작하는 자리 하나**로 못 박는다. 두 줄이던 탓에 제목이
               아래 띠에 달라붙어 보였다.
            ⚠️ 대신 아래 여백을 12 → 20으로 벌린다. 선이 하던 일을 여백이 한다.
          */}
            <div className="border-border flex shrink-0 items-baseline justify-between gap-3 px-7 pt-6 pb-3">
              <h3 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">
                팀 액션 타임라인
              </h3>
              <ActionTimelineLegend />
            </div>
            <ActionTimeline
              items={timelineItems}
              today={new Date()}
              emptyLabel="아직 하달된 팀 액션이 없습니다."
            />
          </section>
        )}
      </div>
    </main>
  );
}
