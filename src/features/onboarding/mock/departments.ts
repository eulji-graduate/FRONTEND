import type { DepartmentNode } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. 온보딩 진입 시 보여줄 기본 예시 부서다.
 * 실제로는 기업 생성 시 서버가 내려주거나 빈 트리로 시작한다.
 */
export const INITIAL_DEPARTMENTS: DepartmentNode[] = [
  {
    id: "dev",
    name: "개발팀",
    children: [
      { id: "dev-fe", name: "프론트엔드", children: [] },
      { id: "dev-be", name: "백엔드", children: [] },
    ],
  },
  { id: "design", name: "디자인팀", children: [] },
  {
    id: "ops",
    name: "경영지원",
    children: [{ id: "ops-hr", name: "인사", children: [] }],
  },
];
