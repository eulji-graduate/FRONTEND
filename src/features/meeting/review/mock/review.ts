import { AI_CONFIDENCE } from "@/constants/meeting";

import type { AiActionDraft, AssigneeOption, MeetingReviewInfo, TeamOption } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전(CLAUDE.md §정직한 목업). AI 요약·액션 추출은 실 모델 미선정이라
 *    화면 확인용 고정 시나리오 하나만 둔다. `globalThis`에 매달아 dev HMR로 사라지지 않게 한다
 *    (`board/mock`·`rooms/mock`와 같은 트릭).
 */
interface ReviewStore {
  reviews: Record<string, MeetingReviewInfo>;
}

const globalStore = globalThis as typeof globalThis & {
  __meetingReviewStore?: ReviewStore;
};

/**
 * ⚠️ 회사 전체 인원이 아니라 **이 데모 회의의 참석자만**이다(사용자 확정) — 회의에 없던
 *    사람에게 액션이 갈 수는 없다. 연동 시 `Meeting.attendeeIds`로 걸러서 채운다.
 */
const ASSIGNEE_OPTIONS: AssigneeOption[] = [
  { id: 1, name: "박대표", roleLabel: "" },
  { id: 2, name: "김서준", roleLabel: "개발팀장" },
  { id: 3, name: "박도현", roleLabel: "개발팀원" },
  { id: 4, name: "이하윤", roleLabel: "개발팀원" },
];

/**
 * 부서 옵션 — 이 데모 회의가 Owner 개설이라 붙는다(2026-08-13, 오너 회의 → 팀 액션 배분).
 * ⚠️ 실 연동에서는 참석자에서 만들지만(타입 주석 참고), 목은 데모 시나리오 고정이라 직접 둔다.
 */
const TEAM_OPTIONS: TeamOption[] = [
  { teamId: 10, teamName: "개발팀" },
  { teamId: 11, teamName: "디자인팀" },
];

function seedReview(meetingId: string): MeetingReviewInfo {
  const drafts: AiActionDraft[] = [
    {
      id: `${meetingId}-draft-1`,
      title: "온보딩 플로우 와이어프레임 검토",
      description:
        "신규 가입 플로우를 세 단계 이내로 단순화한 와이어프레임을 그려 팀 리뷰를 받는다. 기존 5단계 플로우의 이탈 구간을 참고해 단계를 합친다.",
      assigneeId: 1,
      teamId: null,
      confidence: AI_CONFIDENCE.HIGH,
      startDate: "2026-08-07",
      dueDate: "2026-08-17",
      evidence: {
        speaker: "박대표",
        quote: "온보딩 플로우는 세 단계 안으로 단순화한 와이어프레임을 먼저 검토합시다.",
        timestamp: "18:42",
      },
      isManual: false,
    },
    {
      id: `${meetingId}-draft-2`,
      title: "신규 온보딩 UI 사용자 테스트",
      description:
        "와이어프레임이 나오는 대로 신규 사용자 다섯 명을 모집해 온보딩 UI 사용성 테스트를 진행하고 이탈 지점을 기록한다.",
      assigneeId: 2,
      teamId: null,
      confidence: AI_CONFIDENCE.HIGH,
      startDate: "2026-08-10",
      dueDate: "2026-08-17",
      evidence: {
        speaker: "김서준",
        quote: "와이어프레임이 나오면 신규 사용자 다섯 명으로 바로 테스트를 진행해주세요.",
        timestamp: "20:08",
      },
      isManual: false,
    },
    {
      id: `${meetingId}-draft-3`,
      title: "API 문서 최신화",
      description:
        "이번 주 변경된 인증 흐름(리프레시 토큰 재발급 방식)을 API 문서 인증 섹션에 반영한다.",
      assigneeId: 1,
      teamId: null,
      confidence: AI_CONFIDENCE.HIGH,
      startDate: "2026-08-07",
      dueDate: "2026-08-17",
      evidence: {
        speaker: "박도현",
        quote: "변경된 인증 흐름은 API 문서에도 같은 주 안에 반영이 필요합니다.",
        timestamp: "24:16",
      },
      isManual: false,
    },
    {
      id: `${meetingId}-draft-4`,
      title: "A/B 테스트 도구 비교 문서 작성",
      description:
        "Optimizely·VWO·자체 구축 세 가지 후보를 비용·연동 난이도·리포팅 기능 기준으로 비교해 정리한다.",
      assigneeId: 2,
      teamId: null,
      confidence: AI_CONFIDENCE.NEEDS_REVIEW,
      startDate: "2026-08-07",
      dueDate: "2026-08-17",
      evidence: {
        speaker: "박대표",
        quote: "A/B 테스트 도구는 서준님이 비교해서 정리해주세요.",
        timestamp: "21:24",
      },
      isManual: false,
    },
    {
      id: `${meetingId}-draft-5`,
      title: "모바일 반응형 재작업 착수 보고",
      description: "반응형 재작업이 필요한 화면 범위와 예상 일정을 정리해 착수 전 공유한다.",
      assigneeId: 4,
      teamId: null,
      confidence: AI_CONFIDENCE.NEEDS_REVIEW,
      startDate: "2026-08-07",
      dueDate: "2026-08-17",
      evidence: {
        speaker: "이하윤",
        quote: "반응형 재작업이 필요한 범위와 일정은 먼저 착수 보고로 공유해 주세요.",
        timestamp: "16:37",
      },
      isManual: false,
    },
  ];

  return {
    meetingId,
    meetingTitle: "굿즈 앱 주간 운영 점검",
    // ⚠️ getViewer() mock의 OWNER(id 1, "대표 계정")와 맞춘다 — 회의 발화도 박대표가 진행자.
    hostId: 1,
    projectTag: "GOODS",
    scheduleLabel: "8월 14일(목)",
    assigneeOptions: ASSIGNEE_OPTIONS,
    isOwnerMeeting: true,
    teamOptions: TEAM_OPTIONS,
    drafts,
    actionsConfirmed: false,
  };
}

/**
 * ⚠️ 지금은 데모 시나리오가 이 회의 하나뿐이라 고정 목록이다 — 실제로는 BE가
 *    "Host가 나이고 아직 확정 안 한 회의" 목록을 내려줘야 한다(마이페이지 §미확정 액션).
 */
const DEMO_MEETING_IDS = ["meeting-1"];

export function listMockPendingReviewMeetingIds(): string[] {
  return DEMO_MEETING_IDS;
}

function getStore(): ReviewStore {
  if (!globalStore.__meetingReviewStore) {
    globalStore.__meetingReviewStore = { reviews: {} };
  }
  return globalStore.__meetingReviewStore;
}

export function findMockMeetingReview(meetingId: string): MeetingReviewInfo | null {
  const store = getStore();
  if (!store.reviews[meetingId]) {
    // ⚠️ 지금은 데모 시나리오 하나뿐이라 어떤 id로 들어와도 같은 회의를 채워 보여준다.
    store.reviews[meetingId] = seedReview(meetingId);
  }
  return store.reviews[meetingId];
}

export function markMockReviewConfirmed(meetingId: string): void {
  const review = findMockMeetingReview(meetingId);
  if (review) review.actionsConfirmed = true;
}
