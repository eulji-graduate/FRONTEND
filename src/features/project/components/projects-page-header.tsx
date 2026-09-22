"use client";

import { Folder } from "lucide-react";
import { usePathname } from "next/navigation";

import { PageHeader } from "@/features/shell/components/page-header";

/** 목록 경로 — 이 경로면 뒤로가기 없음, 더 깊으면(생성·상세) 뒤로가기를 붙인다. */
const PROJECTS_LIST_PATH = "/app/projects";

/**
 * 되돌아갈 곳 — **한 칸 위**다.
 *
 * ⚠️ 전에는 어디서든 목록으로 보냈다. 팀 액션 상세(`/app/projects/3/team/7`)에서 뒤로를
 *    누르면 방금 보던 프로젝트가 아니라 **목록으로 튀어**, 다시 그 프로젝트를 찾아
 *    들어가야 했다 — 깊이가 둘이면 되돌아가는 것도 두 번이어야 한다.
 * ⚠️ 브라우저 뒤로가기를 흉내 내지 않는다. 그건 "왔던 길"이고 이 화살표는 "화면의 위치"다 —
 *    검색 결과나 알림으로 바로 들어온 사람에게도 같은 자리를 가리켜야 한다.
 */
function parentOf(pathname: string): string {
  const cut = pathname.lastIndexOf("/");
  const parent = pathname.slice(0, cut);
  return parent.startsWith(PROJECTS_LIST_PATH) ? parent : PROJECTS_LIST_PATH;
}

/** `/app/projects/3/team/7` → `/app/projects/3` (마지막 두 조각이 `team/:id`다) */
export function backHrefOf(pathname: string): string {
  return pathname.includes("/team/") ? parentOf(parentOf(pathname)) : PROJECTS_LIST_PATH;
}

/**
 * 프로젝트 화면 공통 상단바 — `usePathname`이 필요한 부분만 잎사귀로 분리했다.
 * ⚠️ 이 컴포넌트만 클라이언트다 — `ProjectsLayout` 자체는 서버 컴포넌트로 남겨
 *    도메인 전체가 클라이언트 경계가 되는 걸 막는다(CLAUDE.md §핵심 4원칙 1).
 */
export function ProjectsPageHeader() {
  const pathname = usePathname();
  const isDetail = pathname !== PROJECTS_LIST_PATH;

  return (
    <PageHeader
      title="프로젝트"
      icon={Folder}
      backTo={
        isDetail
          ? {
              href: backHrefOf(pathname),
              label: pathname.includes("/team/") ? "프로젝트 상세" : "프로젝트",
            }
          : undefined
      }
    />
  );
}
