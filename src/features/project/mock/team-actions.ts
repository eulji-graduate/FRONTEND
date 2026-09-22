import { ACTION_STATUS } from "@/constants/domain";

import type { ProjectTeamAction } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(ERD·API 스펙 미확정). 프로젝트 상세(`/app/projects/:projectId`)의
 * 타임라인 탭에 쓴다. 프로젝트 태그별로 참여 팀들이 받은 팀 액션 목록이다.
 * ⚠️ **할 일(TODO) 상태는 시작일이 오늘보다 뒤여야 한다**(오늘선을 가로지르면 안 됨,
 *    `member/mock/dashboard.ts`와 같은 규칙). 진행중은 오늘을 가로질러도 된다.
 * ⚠️ 날짜는 **2026-08-11 기준**으로 잡았다. 목이라 값이 고정이므로 시간이 지나면 이 규칙이
 *    저절로 깨진다 — 화면에서 할 일 막대가 오늘선 왼쪽에 걸리면 여기 날짜를 뒤로 민다.
 * ⚠️ **`isDelayed`는 확정 규칙대로 고정한다**(`IN_PROGRESS && dueDate < 오늘`) — 실서버
 *    타임라인이 BE 판정을 그대로 옮기므로(§`toProjectTeamAction`) 목도 같은 판정 규칙을
 *    따라야 목만 보고 만든 화면이 연동 후 다른 배지를 내지 않는다(§정직한 목업).
 *    지금 값은 전부 `false`다 — 목 시점(2026-08-11)·BE-13 후 확정 규칙 기준으로 마감이
 *    지난 진행중 항목이 없다. 시간이 지나 이 규칙이 저절로 참이 되면 값을 손으로 켠다.
 */
export const PROJECT_TEAM_ACTIONS_MOCK: Record<string, ProjectTeamAction[]> = {
  GOODS: [
    {
      id: 1,
      name: "앱 개발 착수",
      team: "개발팀",
      startDate: "2026-07-21",
      dueDate: "2026-08-29",
      status: ACTION_STATUS.IN_PROGRESS,
      isDelayed: false,
    },
    {
      id: 2,
      name: "결제 시스템 연동",
      team: "개발팀",
      startDate: "2026-08-18",
      dueDate: "2026-09-12",
      status: ACTION_STATUS.TODO,
      isDelayed: false,
    },
    {
      id: 3,
      name: "TV 광고 계약 및 모델 섭외",
      team: "마케팅팀",
      startDate: "2026-08-14",
      dueDate: "2026-08-22",
      status: ACTION_STATUS.TODO,
      isDelayed: false,
    },
    {
      id: 4,
      name: "굿즈 디자인 시안 제작",
      team: "디자인팀",
      startDate: "2026-07-21",
      dueDate: "2026-08-22",
      status: ACTION_STATUS.IN_PROGRESS,
      isDelayed: false,
    },
  ],
  BRAND: [
    {
      id: 5,
      name: "로고·가이드라인 개편",
      team: "디자인팀",
      startDate: "2026-08-01",
      dueDate: "2026-08-20",
      status: ACTION_STATUS.IN_PROGRESS,
      isDelayed: false,
    },
    {
      id: 6,
      name: "캠페인 자산 제작",
      team: "마케팅팀",
      startDate: "2026-08-15",
      dueDate: "2026-09-12",
      status: ACTION_STATUS.TODO,
      isDelayed: false,
    },
  ],
  COLLAB: [
    {
      id: 7,
      name: "협업툴 리뉴얼 착수",
      team: "개발팀",
      startDate: "2026-07-25",
      dueDate: "2026-08-25",
      status: ACTION_STATUS.IN_PROGRESS,
      isDelayed: false,
    },
    {
      id: 8,
      name: "회의·문서·일정 흐름 통합 설계",
      team: "전략기획팀",
      startDate: "2026-08-17",
      dueDate: "2026-09-19",
      status: ACTION_STATUS.TODO,
      isDelayed: false,
    },
  ],
};

/** ⚠️ 목 데이터 — 프로젝트 기획서 등 첨부파일명. 실제 업로드·다운로드는 API 스펙 확정 후. */
export const PROJECT_ATTACHMENT_MOCK: Record<string, string> = {
  GOODS: "기획서.pdf",
  BRAND: "리뉴얼_가이드라인.pdf",
  COLLAB: "협업툴_요구사항.pdf",
};
