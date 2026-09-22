import { CalendarClock } from "lucide-react";
import { Users } from "lucide-react";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccessDenied } from "@/components/common/access-denied";
import { DashboardMeetingItem } from "@/components/common/dashboard-meeting-item";
import { EmptyState } from "@/components/common/empty-state";
import { SummaryCard } from "@/components/common/summary-card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEADER_NAME_WIDTH, LeaderStatusRow } from "@/features/owner/components/leader-status-row";
import { LEADER_BOX_MAX_HEIGHT } from "@/features/owner/lib";
import { getOwnerDashboardOverview } from "@/features/owner/server";
import { roleHome } from "@/features/shell/home";
import { getViewer } from "@/features/shell/viewer";
import { canAccessOwnerScope } from "@/lib/permission";

export const metadata: Metadata = {
  title: "대시보드",
};

/** 표 머리 셀 — 규격은 DESIGN §3·§4(라벨 12px, 이름 열만 왼쪽). */
const HEAD_CELL_CLASS = "text-muted-foreground h-9 text-[12px] leading-4 font-normal";

export default async function OwnerDashboardPage() {
  const viewer = await getViewer();
  if (!canAccessOwnerScope(viewer)) return <AccessDenied homeHref={roleHome(viewer.role)} />;

  const {
    totalProjectCount,
    dueSoonProjectCount,
    activeMemberCount,
    onLeaveMemberCount,
    leaderRows,
    projectMeetings,
  } = await getOwnerDashboardOverview();

  /*
    상단 요약 — **한 카드 안에서 세로선으로 가른다**(DESIGN §2). 전에는 미니 카드 넉 장이었는데
    §2가 "카드 안에 카드를 얹지 않는다"고 못 박은 형태였고, 값도 20px이라 운영자 화면의 같은
    자리(30px)와 달라 보였다.
    ⚠️ **색 강조를 걷어냈다.** `마감 D-7`이 빨강, `휴직자`가 주황이었는데 **0일 때도** 그 색이었다 —
       문제가 없는데 늘 빨간 화면은 곧 안 읽힌다(DESIGN §5: 색은 문제일 때만). 급한 것은
       `즉시 확인 필요` 문구가 말한다.
  */
  const summaryItems = [
    { label: "전체 프로젝트", value: String(totalProjectCount), meta: "진행 중" },
    { label: "마감 D-7", value: String(dueSoonProjectCount), meta: "즉시 확인 필요" },
    { label: "전체 사원", value: String(activeMemberCount), meta: "재직 중" },
    { label: "휴직자", value: String(onLeaveMemberCount), meta: "현재 휴직" },
  ];

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/*
          ⚠️ 대시보드는 **제목을 안 그린다** — 사이드바에서 방금 고른 자리라 화면에 한 번 더
             적으면 같은 말이 두 번이다. 그래도 문서에는 제목이 있어야 한다: `h1`이 없으면
             스크린 리더가 이 화면의 이름을 못 말하고 층이 `h2`부터 시작한다(§a11y).
        */}
        <h1 className="sr-only">대표 대시보드</h1>

        <SummaryCard items={summaryItems} />

        {/*
          ⚠️ 높이를 고정하지 않는다 — 내용만큼 자라고, 팀이 많아질 때만 위 한도에서 멈춘다
             (`LEADER_BOX_MAX_HEIGHT`). 고정 높이였을 때는 팀장이 넷이라 바닥이 90px 비었다.
        */}
        <section
          className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border"
          style={{ maxHeight: LEADER_BOX_MAX_HEIGHT }}
        >
          {/*
            ⚠️ 제목 줄에 **선을 긋지 않는다.** 바로 아래 표 머리 띠가 이미 "여기부터 내용"을
               긋고 있어서, 선까지 있으면 층을 나누는 것이 두 줄이 된다 — DESIGN §2는
               카드 안의 선을 **표가 시작하는 자리 하나**로 못 박는다. 두 줄이던 탓에 제목이
               아래 띠에 달라붙어 보였다.
            ⚠️ 대신 아래 여백을 12 → 20으로 벌린다. 선이 하던 일을 여백이 한다.
          */}
          <div className="border-border flex shrink-0 items-baseline justify-between gap-3 px-7 pt-6 pb-3">
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">팀장 현황</h2>
            {/* 카드 제목 줄 오른쪽 끝은 보조 정보 한 줄이다(DESIGN §2) */}
            <p className="text-muted-foreground text-[12px] leading-4 tabular-nums">
              전체 {leaderRows.length}팀
            </p>
          </div>
          {leaderRows.length === 0 ? (
            /*
              ⚠️ 빈 상태가 **자기 높이를 갖는다**(`py-10`). 카드 높이가 고정이던 때는 `flex-1`이
                 그 안에서 문구를 세로 가운데로 밀어 줬는데, 높이를 걷어내면서 남는 공간이
                 0이 됐다 — `flex-1`은 나눌 것이 없으면 아무 일도 안 해서 문구가 머리 줄
                 보더에 붙어 버린다(세 대시보드 다섯 자리가 같은 상태였다).
            */
            <EmptyState
              className="flex-1"
              icon={Users}
              title="아직 등록된 팀장이 없습니다."
              description="사원 관리에서 팀장을 지정하면 팀별 진척이 여기에 쌓입니다."
            />
          ) : (
            // 가로·세로 스크롤을 모두 이 컨테이너가 갖고(스크롤바 숨김), 좁은 화면에서 컬럼이
            // 과도하게 줄지 않게 테이블에 최소 폭을 준다. shadcn Table이 자체적으로 두는
            // table-container(overflow-x-auto)를 visible로 눌러 스크롤 소유권을 여기로 넘긴다.
            <div className="scrollbar-hidden flex-1 overflow-auto [&_[data-slot=table-container]]:overflow-visible">
              <Table className="min-w-[560px] table-fixed text-[13px]">
                {/*
                  ⚠️ 머리 줄에 **띠**를 깐다(DESIGN §3) — 보더만으로는 머리와 본문이 같은 면으로
                     읽힌다. `--secondary`는 흰 카드와 2%밖에 차이가 없어 안 보이므로 먹색을
                     옅게 깐다(행 hover가 4%라 그보다 진한 6%다).
                  ⚠️ 높이는 **셀에** 건다. `<tr>`에 걸면 `TableHead`의 기본 `h-10`이 이겨서
                     안 먹는다 — 행 높이를 정하는 건 셀이다.
                */}
                <TableHeader>
                  <TableRow className="bg-secondary/50 border-border hover:bg-secondary/50 border-b">
                    {/*
                      ⚠️ **머리글과 이름이 같은 세로선에서 가운데를 맞춘다.** 그냥 `pl-6`으로 두면
                         머리글이 아바타 위에 서고, 왼쪽만 맞추면 이름 길이가 달라질 때 다시
                         어긋난다(`김서준` 34px·`오현우` 34px이라도 두 글자 이름이 오면 갈린다).
                      ⚠️ 그래서 **아바타 자리(28px)를 비우고 이름 상자 가운데**에 세운다 —
                         아래 칸도 같은 상자(`LEADER_NAME_WIDTH`)를 쓰므로 이름이 몇 글자든
                         두 중심이 겹친다.
                      ⚠️ 남는 폭을 다 주지 않는다. 그러면 이름이 아바타에서 떨어져 따로 논다.
                      ⚠️ 숫자를 손으로 맞추지 않는다. 아래 칸과 **같은 값**(`w-7`·`gap-2`)을 쓴다 —
                         아바타 크기를 바꾸면 두 곳이 같이 움직여야 한다.
                      ⚠️ 나머지 열이 전부 가운데다 — 이 열만 왼쪽이면 표 안에서 혼자 논다.
                    */}
                    <TableHead className={`${HEAD_CELL_CLASS} pl-6`}>
                      <span className="flex items-center gap-2">
                        <span className="w-7 shrink-0" aria-hidden />
                        <span className="text-center" style={{ minWidth: LEADER_NAME_WIDTH }}>
                          이름
                        </span>
                      </span>
                    </TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} text-center`}>이메일</TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} text-center`}>팀</TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} text-center`}>상태</TableHead>
                    <TableHead className={`${HEAD_CELL_CLASS} pr-6 text-center`}>
                      휴직기간
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderRows.map((leader) => (
                    <LeaderStatusRow key={leader.id} leader={leader} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* ⚠️ 여기도 높이를 고정하지 않는다 — 다섯 건이 하드 캡이라 자라 봐야 다섯 줄이다.
            고정했을 때는 머리 줄 높이를 20px 적게 잡아 **마지막 줄이 잘려** 나갔다. */}
        <section className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
          {/*
            ⚠️ **제목 줄에 선을 안 긋는다**(2026-08-19, 위 "팀장 현황"과 통일). 이 카드만 보면
               `border-b`가 있어도 이상하지 않지만, 같은 화면 바로 위 카드는 표 머리띠가
               구분선 역할을 대신해서 `border-b`가 없다 — 한 화면 안에서 제목 줄 하나는 선이
               있고 하나는 없으면, 글자 크기·굵기가 완전히 같아도 "제목이 서로 다르게
               생겼다"로 읽힌다. 목록 쪽엔 띠가 없어 대신 여백(`pb-3`)만으로 가른다.
          */}
          <div className="flex shrink-0 items-baseline justify-between gap-3 px-7 pt-6 pb-3">
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">
              최근 프로젝트 회의
            </h2>
            {/*
              ⚠️ 화살표는 **아이콘**이다(`lucide-react`). `→` 글자로 두면 글꼴이 그 문자를 못 가진
                 환경에서 대체 글꼴로 떨어져 크기·기준선이 글자와 따로 논다(CLAUDE.md §아이콘).
              ⚠️ 아이콘 옆 한글을 따로 내리지 않는다 — `items-center`가 이미 맞춰 준다.
            */}
            <Link
              href="/app/meeting"
              className="text-muted-foreground hover:text-foreground group flex shrink-0 items-center gap-1 text-[12px] leading-4 transition-colors"
            >
              전체 보기
              <ArrowRight
                className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
          {projectMeetings.length === 0 ? (
            <EmptyState
              className="flex-1"
              icon={CalendarClock}
              title="예정된 프로젝트 회의가 없습니다."
              description="회의실을 예약하면 그 자리에서 회의가 열립니다."
            />
          ) : (
            <ul>
              {projectMeetings.map((meeting, index) => (
                <DashboardMeetingItem key={meeting.id} meeting={meeting} showDivider={index > 0} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
