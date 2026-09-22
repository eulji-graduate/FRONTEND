import type { Authority } from "@/constants/authority";

/**
 * 마이페이지 — 격리막의 UI 계약(CLAUDE.md §Mock 격리막).
 * ⚠️ 명세 미확정(CLAUDE.md §⚠️[팀확정]) — 지금은 "기본 정보(읽기 전용)"만 다룬다.
 *    편집·연차 등은 명세가 없어 만들지 않는다(§명세에 없는 화면·기능은 안 만든다).
 */
export interface MyProfile {
  /** 아바타 색을 정하는 키(`useProfileAvatar`) — 이름·부서와 달리 안 바뀐다. */
  id: number;
  name: string;
  email: string;
  role: Authority;
  companyName: string;
  teamName: string;
  /** 팀 안의 세부 역할 라벨(프론트엔드·백엔드 등) — 없는 팀도 있어 `null` 가능(§조직 계층). */
  roleLabel: string | null;
  /** 직급 라벨 — 영문 워딩 규칙(§카피)과 별개로, 직급은 팀에서 한글로 쓴다(예: "수석"). */
  position: string;
  /** "YYYY-MM-DD" */
  joinedAt: string;
}
