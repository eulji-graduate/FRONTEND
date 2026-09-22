import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FlashToast } from "@/components/common/flash-toast";
import { buttonVariants } from "@/components/ui/button";
import { ProjectFilterTabs } from "@/features/project/components/project-filter-tabs";
import { ProjectListView } from "@/features/project/components/project-list-view";
import { ProjectToolbar } from "@/features/project/components/project-toolbar";
import { parseProjectSort, parseProjectStatus } from "@/features/project/lib";
import { getProjectsPage, getProjectStatusCounts } from "@/features/project/server";
import { getViewer } from "@/features/shell/viewer";
import { canCreateProject } from "@/lib/permission";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "프로젝트",
};

interface ProjectsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** 같은 키가 여러 번 오면(`?q=a&q=b`) 첫 값만 쓴다 — 파서·trim이 배열을 못 받는다. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const keyword = first(params.q);
  const activeStatus = parseProjectStatus(first(params.status));
  const activeSort = parseProjectSort(first(params.sort));

  /*
    ⚠️ **첫 페이지만 받는다**(2026-08-13, #443). 전에는 이 화면 한 번에 `size: 9999`로
       전체 목록을 **두 번**(목록 + 탭 배지) 받아 왔다 — 화면만 잘릴 뿐 10만 건이 다 왔고,
       탭 배지 하나 때문에 같은 응답을 한 벌 더 받았다(§목록·페이지네이션).
       지금 목록은 20건 한 페이지이고, 배지는 상태별 `size=1` 탐침 셋이 `totalElements`만
       읽는다(`getProjectStatusCounts`).
    ⚠️ 2페이지부터는 `ProjectListView`가 스크롤 끝에서 이어 붙인다(§핵심 4원칙 ①: 첫 화면은
       서버가 렌더한다).
  */
  const query = { status: activeStatus, keyword, sort: activeSort };
  const [firstPage, counts, viewer] = await Promise.all([
    getProjectsPage(query, 0),
    getProjectStatusCounts(keyword),
    getViewer(),
  ]);

  return (
    <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-8 py-7">
      {/* 생성 뒤 넘어온 화면에서 "만들었습니다"를 대신 말한다(§토스트 · `FlashToast`) */}
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7">
        {/*
          ⚠️ **툴바를 카드 안으로 들였다**(2026-08-10). 검색·정렬·상태 탭·건수·생성 버튼이
             카드 밖에 두 줄로 흩어져 있어서, 목록이 어디서 시작하는지가 화면에 안 그려졌다 —
             `사원 관리`·`저장소 관리`는 이미 한 카드 안에 툴바 한 줄 + 표로 서 있다.
             같은 성격의 화면이 다르게 생기면 옮겨 다닐 때마다 새 화면처럼 읽힌다.
          ⚠️ 상단바에는 버튼을 두지 않는다(팀 규칙) — 생성 버튼은 본문 안, Owner 전용이다.
        */}
        <section className="border-border bg-card overflow-hidden rounded-2xl border">
          <div className="flex flex-wrap items-center gap-3 px-7 pt-6 pb-5">
            <ProjectToolbar />
            <ProjectFilterTabs
              active={activeStatus}
              counts={counts}
              keyword={keyword}
              sort={activeSort}
            />

            {/* 남는 자리는 비워 둔다 — 건수와 버튼이 오른쪽 끝에 선다 */}
            <span className="flex-1" aria-hidden />

            {/*
              ⚠️ **`전체`라고 쓰지 않는다**(2026-08-11 고침). 이 숫자는 지금 거른 결과의 수인데
                 `전체 4개`라고 적으니, 탭이 `할 일 2 · 진행중 4 · 완료 2`(합 8)를 보여 주는
                 옆에서 **거짓말이 됐다.** 거른 결과임을 말하는 `결과 N개`로 적는다.
              ⚠️ **지금 그려진 줄 수가 아니라 서버가 센 전체다**(2026-08-13). 무한 스크롤로
                 바뀌면서 화면엔 20건만 있는데, 여기까지 20이라고 적으면 아직 안 내려온
                 나머지가 없는 것처럼 보인다(§목록·페이지네이션: 끝이 안 보이는 목록은
                 얼마나 남았는지 알 수 없다).
            */}
            <span className="text-muted-foreground shrink-0 text-[12px] leading-4 tabular-nums">
              결과 {firstPage.totalCount}개
            </span>
            {canCreateProject(viewer) && (
              /*
                ⚠️ 크기는 **사원 관리의 [계정 발급]과 같다**(`size="sm"` — 높이 28, 글자 12.8px).
                   기본 크기(32·14px)면 같은 줄의 거르개 알약(28)보다 커서 이 버튼만 한 단
                   위로 뜬다. 같은 성격의 화면에서 같은 자리의 버튼은 같은 크기여야 한다.
              */
              <Link
                href="/app/projects/new"
                className={cn(buttonVariants({ variant: "ink", size: "sm" }), "shrink-0")}
              >
                <Plus />새 프로젝트
              </Link>
            )}
          </div>

          {/*
            ⚠️ 빈 상태도 `ProjectListView` 안에 있다 — 이어 붙이다가 목록이 비는 일은 없지만,
               "표냐 빈 상태냐"를 두 곳에서 정하면 조건이 갈릴 때 둘 다 그려지거나 둘 다 안
               그려진다. 무엇을 그릴지는 목록을 들고 있는 쪽이 정한다.
            ⚠️ `key`로 조건을 묶는다 — 탭·검색어·정렬이 바뀌면 새 목록이라 이어 붙이던 상태를
               통째로 버려야 한다(안 버리면 옛 페이지 커서로 다음 장을 부른다).
          */}
          <ProjectListView
            key={`${activeStatus}|${activeSort}|${keyword ?? ""}`}
            initialItems={firstPage.items}
            initialPage={firstPage.page}
            initialTotalPages={firstPage.totalPages}
            initialTotalCount={firstPage.totalCount}
            query={query}
          />
        </section>
      </div>
    </main>
  );
}
