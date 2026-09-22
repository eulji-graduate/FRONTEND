/**
 * 역할별 축소판에 채울 값 — **전부 목이다.**
 *
 * ⚠️ 그리는 코드(`role-screens.tsx`)에서 떼어냈다. 넷을 한 뼈대로 묶고 나니 파일의 절반이
 *    데이터였다 — 문구를 고치러 들어가서 마크업을 건드리는 일이 없게 나눈다
 *    (CLAUDE.md §폴더·네이밍: 200줄↑ 분리).
 * ⚠️ 담당자는 **이름 대신 자리**(부서·직무)로 적는다. 목이라도 사람 이름을 넣으면
 *    실제 계정처럼 읽힌다.
 */
import { AUTHORITY_BADGE_CLASS } from "@/constants/authority";

import type { RoleName } from "./role-views";

interface Metric {
  label: string;
  value: string;
}

interface Row {
  title: string;
  detail: string;
  /** 오른쪽 배지 — 끝난 일이면 흐리게 */
  state: string;
  isDone?: boolean;
}

/**
 * 진행률 한 줄 — **실제 사용량 카드(`usage-panel`)와 같은 문법**이다.
 *
 * ⚠️ 숫자만 늘어놓으면 화면이 표처럼 읽힌다. 우리 화면에는 막대가 있고, 그게 이 서비스에서
 *    "얼마나 찼나"를 말하는 방식이다 — 축소판에도 그대로 둔다.
 */
interface Progress {
  label: string;
  value: string;
  /** 0~1 */
  ratio: number;
}

interface RoleMock {
  /** 위 카드 제목 — 역할마다 이 화면에서 먼저 보는 것 */
  summaryLabel: string;
  progress: Progress;
  metrics: readonly [Metric, Metric, Metric];
  /** 목록 제목 — 무엇을 늘어놓은 것인지 한 마디로 */
  listLabel: string;
  rows: readonly [Row, Row];
  banner: { title: string; detail: string };
  /** 띠·상태 배지에 쓸 역할 색 */
  surface: string;
}

export const ROLE_MOCKS: Record<RoleName, RoleMock> = {
  Owner: {
    progress: { label: "완료 액션", value: "87%", ratio: 0.87 },
    summaryLabel: "이번 달",
    metrics: [
      { label: "이번 달 회의", value: "24건" },
      { label: "대기 승인", value: "2건" },
      { label: "팀 수", value: "6개" },
    ],
    listLabel: "결재 대기",
    rows: [
      { title: "인수인계 최종 승인", detail: "제품팀 · 전임 → 후임", state: "대기" },
      { title: "휴직 신청", detail: "디자인팀 · 9월 1일부터", state: "승인됨", isDone: true },
    ],
    banner: { title: "승인 대기 인수인계", detail: "전임 → 후임 · 제품팀" },
    surface: AUTHORITY_BADGE_CLASS.OWNER,
  },
  Leader: {
    progress: { label: "이번 스프린트 완료", value: "9 / 16", ratio: 0.56 },
    summaryLabel: "팀 현황",
    metrics: [
      { label: "할 일", value: "3" },
      { label: "진행중", value: "4" },
      { label: "완료", value: "9" },
    ],
    listLabel: "팀 액션",
    rows: [
      { title: "API 문서 최신화", detail: "개발 담당 · 8월 7일", state: "진행중" },
      { title: "디자인 기준 작성", detail: "디자인 담당 · 8월 5일", state: "완료", isDone: true },
    ],
    banner: { title: "재배정 필요", detail: "API 문서 최신화 · 담당자 휴직 예정" },
    surface: AUTHORITY_BADGE_CLASS.LEADER,
  },
  Member: {
    progress: { label: "이번 주 완료", value: "3 / 5", ratio: 0.6 },
    summaryLabel: "내 일감",
    metrics: [
      { label: "오늘 할 일", value: "2건" },
      { label: "이번 주", value: "5건" },
      { label: "참여 회의", value: "3건" },
    ],
    listLabel: "내 액션",
    rows: [
      { title: "KPI 문서 업데이트", detail: "8월 2일(일) 마감", state: "진행중" },
      { title: "회의록 확인", detail: "오늘 마감", state: "완료", isDone: true },
    ],
    banner: { title: "오늘 회의", detail: "스프린트 킥오프 · 14:00" },
    surface: AUTHORITY_BADGE_CLASS.MEMBER,
  },
  "+Admin": {
    progress: { label: "저장 공간", value: "41.7GB / 50GB", ratio: 0.83 },
    summaryLabel: "운영 현황",
    metrics: [
      { label: "계정 발급 대기", value: "1건" },
      { label: "등록된 회의실", value: "6개" },
      { label: "이번 달 발급", value: "4명" },
    ],
    listLabel: "계정 발급",
    rows: [
      { title: "제품팀 팀장", detail: "계정 발급 완료", state: "발급됨", isDone: true },
      { title: "디자인팀 사원", detail: "초대 메일 발송됨", state: "대기" },
    ],
    banner: { title: "다음 결제일", detail: "9월 1일 · Team 플랜" },
    surface: "bg-role-admin-surface text-role-admin",
  },
};
