import type { ReactNode } from "react";

import { ProjectsPageHeader } from "@/features/project/components/projects-page-header";

/**
 * 프로젝트 화면 공통 레이아웃 — 서버 컴포넌트로 둔다.
 * ⚠️ 상단바엔 어떤 버튼도 올리지 않는다(팀 규칙) — 생성 버튼은 페이지 본문 안에 둔다.
 * ⚠️ 목록·생성·상세를 각자 레이아웃으로 나누면 이동할 때 헤더가 통째로 다시 마운트돼
 *    뒤로가기 화살표가 튀어나오며 덜컥거린다(`NoticeLayout`과 같은 이유) — 헤더는 여기
 *    한 곳에서만 그리고, 경로만 보고 뒤로가기 유무를 바꾼다. `usePathname`이 필요한
 *    부분만 `ProjectsPageHeader`로 분리해 이 레이아웃 자체는 서버 컴포넌트로 남긴다.
 */
export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProjectsPageHeader />
      {children}
    </>
  );
}
