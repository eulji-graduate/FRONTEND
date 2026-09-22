import { ACTION_STATUS, type ActionStatus } from "@/constants/action";
import { AUTHORITY } from "@/constants/authority";
import { AI_SUMMARY_STATUS } from "@/constants/meeting";

import type { ScriptChunk } from "../view-types";
import {
  addMockMeeting,
  cancelMockMeeting,
  endMockMeeting,
  listMockMeetings,
  setMockSummaryStatus,
} from "./meetings";

/**
 * 회의 목 시드 — **화면을 만들 수 있게 회의 몇 건을 미리 깔아 둔다.**
 *
 * ⚠️ 스토어(`meetings.ts`)는 일부러 빈 채로 시작한다(예약이 채우는 구조). 그런데 목록·상세를
 *    만들려면 완료 회의가 있어야 한다 — 완료는 캡처의 [회의 종료 및 제출]로만 생기는데
 *    캡처 화면(#217)이 아직 없어서, 시드가 없으면 상세를 영영 확인할 수 없다.
 * ⚠️ **페르소나·프로젝트를 그대로 쓴다**(WORKFLOW §0). 이름·팀을 지어내면 화면을 오갈 때
 *    회사가 달라 보인다. 회의 제목·시각도 기존 목과 맞춘다 — 개인 액션 상세(`action` 도메인)가
 *    `앱 개발 착수 팀 액션 회의`를 출처로 적고 있어서, 여기 시드가 그 회의여야 추적이 이어진다.
 * ⚠️ 발화 기록은 **회의마다 개별**이다(§3-2: 공용 더미 스크립트 재사용 금지).
 */

/** 시드 회의에 붙는 상세 재료 — 스토어 밖에 둔다(`Meeting`은 목록용 레코드라 무겁게 안 만든다) */
interface SeedExtras {
  script: ScriptChunk[];
  /** 산출물 참조 — 실제 목 데이터의 id다(복사해 두면 두 벌이 어긋난다) */
  outputTeamActionIds?: number[];
  /**
   * 개인 액션 산출물 — 이름·담당자는 `action` 목에서 id로 찾고, **상태·마감일만 여기서** 든다.
   * ⚠️ 복사가 아니다 — `PersonalActionDetail`에는 그 두 값이 저장돼 있지 않아(어디에도 없다)
   *    산출물 표가 비게 된다. 없는 값을 정의하는 것이지 있는 값을 베끼는 게 아니다.
   */
  outputPersonalActions?: { id: number; status: ActionStatus; dueDate: string }[];
  /**
   * 요약 실패(`AI_SUMMARY_STATUS.FAILED`)가 서버 문제로 중단된 것인지 — 실제 분석 실패와
   * 문구·재분석 안내를 가른다(마이페이지 "요약이 중단된 회의"와 같은 판정, §server).
   */
  isStalled?: boolean;
}

const globalStore = globalThis as typeof globalThis & {
  __meetingSeedExtras?: Map<string, SeedExtras>;
  __meetingSeeded?: boolean;
};

const extras = (globalStore.__meetingSeedExtras ??= new Map<string, SeedExtras>());

export function findMockMeetingExtras(id: string): SeedExtras | null {
  return extras.get(id) ?? null;
}

/**
 * 서버 조회가 부르기 전에 한 번만 심는다.
 *
 * ⚠️ 갯수가 아니라 **플래그로** 지킨다 — 예약이 회의를 먼저 만들 수도 있어서, 길이로 보면
 *    "이미 있네"하고 시드를 건너뛴다.
 */
export function ensureMockMeetingsSeeded(): void {
  if (globalStore.__meetingSeeded) return;
  globalStore.__meetingSeeded = true;

  /*
    m1 — Owner의 프로젝트 회의(§2), 완료. 산출물 = GOODS의 팀 액션들.
  */
  const kickoff = addMockMeeting({
    title: "연예인 굿즈 쇼핑몰 앱 구축 킥오프",
    start: new Date("2026-07-14T10:00:00+09:00"),
    end: new Date("2026-07-14T10:30:00+09:00"),
    roomId: "room-large",
    roomName: "대회의실",
    projectId: 1,
    projectTag: "GOODS",
    topics: [
      { main: "프로젝트", sub: "킥오프" },
      { main: "일정", sub: "팀별 분담" },
    ],
    /*
      ⚠️ **개설자도 참석자다**(WORKFLOW §10 "개설자 Host도 참석자이므로 포함").
         빼 두면 회의 화면 참가자 레일에 정작 진행하는 사람이 안 보이고, 개설 알림도
         본인에게 안 간다. 프로젝트 참여 각 팀의 팀장들(§2) + 개설자 박대표.
    */
    attendeeIds: [1, 2, 5, 7],
    hostId: 1,
    hostAuthority: AUTHORITY.OWNER,
    roomReservationId: "seed-reservation-1",
    isOnline: false,
    recordingFileName: null,
  });
  endMockMeeting(kickoff.id, "2026-07-14T10:31:00.000Z");
  /*
    ⚠️ 시드의 옛 완료 회의는 **분배까지 끝났다.** 종료가 대기로 넣기 때문에 그대로 두면
       회의록·산출물이 다 있는 회의가 "요약 중"으로 떠서 못 열린다.
  */
  setMockSummaryStatus(kickoff.id, AI_SUMMARY_STATUS.DISTRIBUTED);
  extras.set(kickoff.id, {
    script: [
      { at: "10:00", text: "안녕하세요, 굿즈 쇼핑몰 앱 구축 킥오프를 시작하겠습니다." },
      { at: "10:04", text: "개발팀은 앱 개발 착수와 결제 시스템 연동을 맡아 주세요." },
      { at: "10:12", text: "마케팅팀은 TV 광고 계약과 모델 섭외를 진행합니다." },
      { at: "10:19", text: "디자인팀은 굿즈 디자인 시안을 먼저 잡아 주세요." },
      { at: "10:27", text: "팀별 마감은 액션에 적힌 날짜 기준으로 하고, 다음 주에 다시 모입니다." },
    ],
    outputTeamActionIds: [1, 3, 4],
  });

  /*
    m2 — 김서준(개발팀장)의 팀 액션 회의(§5), 완료. 산출물 = 개인 액션들.
    ⚠️ 제목·시각이 개인 액션 상세의 `sourceMeeting`과 같아야 한다 — 추적 체인의 반대쪽 끝이다.
  */
  const teamKickoff = addMockMeeting({
    title: "앱 개발 착수 팀 액션 회의",
    start: new Date("2026-07-21T10:00:00+09:00"),
    end: new Date("2026-07-21T10:30:00+09:00"),
    roomId: "room-small",
    roomName: "소회의실",
    projectId: 1,
    projectTag: "GOODS",
    topics: [{ main: "앱 개발 착수", sub: "개인 분담" }],
    // 그 팀 액션을 받은 팀의 팀원 전체(§5) — 개발팀
    attendeeIds: [2, 3, 4],
    hostId: 2,
    hostAuthority: AUTHORITY.LEADER,
    hostTeamId: 1,
    parentTeamActionId: 1,
    roomReservationId: "seed-reservation-2",
    isOnline: false,
    recordingFileName: null,
  });
  endMockMeeting(teamKickoff.id, "2026-07-21T10:32:00.000Z");
  setMockSummaryStatus(teamKickoff.id, AI_SUMMARY_STATUS.DISTRIBUTED);
  extras.set(teamKickoff.id, {
    script: [
      { at: "10:00", text: "앱 개발 착수 건으로 모였습니다. 화면 흐름부터 나누겠습니다." },
      { at: "10:07", text: "온보딩 플로우 와이어프레임은 하윤님이 검토해 주세요." },
      { at: "10:15", text: "인증 API는 도현님이 맡고, 개발 환경 정리는 제가 하겠습니다." },
      { at: "10:26", text: "마감은 팀 액션 마감에 맞추고, 막히면 바로 공유해 주세요." },
    ],
    outputPersonalActions: [
      { id: 1, status: ACTION_STATUS.IN_PROGRESS, dueDate: "2026-08-05" },
      { id: 2, status: ACTION_STATUS.TODO, dueDate: "2026-08-07" },
      { id: 3, status: ACTION_STATUS.DONE, dueDate: "2026-07-25" },
    ],
  });

  /*
    m3 — Owner의 예정 회의. 완료가 아니라 상세가 없다 — 목록에서 [녹음하기]만 보이는 경우를
    확인하는 자리다(캡처 화면은 #217).
  */
  addMockMeeting({
    title: "굿즈 앱 주간 운영 점검",
    start: new Date("2026-08-14T10:00:00+09:00"),
    end: new Date("2026-08-14T10:30:00+09:00"),
    roomId: "room-large",
    roomName: "대회의실",
    projectId: 1,
    projectTag: "GOODS",
    topics: [{ main: "운영", sub: "주간 점검" }],
    attendeeIds: [1, 2, 5, 7],
    hostId: 1,
    hostAuthority: AUTHORITY.OWNER,
    roomReservationId: "seed-reservation-3",
    isOnline: false,
    recordingFileName: null,
  });

  /*
    m5 — Owner의 **진행중** 회의. 시드에 하나도 없어서 세 상태 중 하나를 화면에서 확인할
         길이 없었다(§정직한 목업).
    ⚠️ **끝난 시각을 안 적는다.** 진행중은 저장되는 값이 아니라 "시작 시각은 지났는데
       [회의 종료 및 제출]을 안 눌렀다"로 계산되는 상태다(§status) — `endMockMeeting`을
       부르지 않는 것이 곧 진행중이다.
    ⚠️ 지난 날짜로 잡는다. 미래로 잡으면 그날이 오기 전까지는 예정으로 뜬다.
  */
  addMockMeeting({
    title: "굿즈 앱 8월 스프린트 점검",
    start: new Date("2026-08-10T09:00:00+09:00"),
    end: new Date("2026-08-10T09:30:00+09:00"),
    roomId: "room-small",
    roomName: "소회의실",
    projectId: 1,
    projectTag: "GOODS",
    topics: [{ main: "운영", sub: "스프린트 점검" }],
    attendeeIds: [1, 2, 5],
    hostId: 1,
    hostAuthority: AUTHORITY.OWNER,
    roomReservationId: "seed-reservation-5",
    isOnline: false,
    recordingFileName: null,
  });

  /*
    m4 — Owner의 BRAND 회의, 완료. 프로젝트가 하나뿐이면 태그 색·필터가 늘 같은 값이라
    화면이 맞는지 알 수 없다.
  */
  const brand = addMockMeeting({
    title: "3분기 브랜드 리뉴얼 킥오프",
    start: new Date("2026-07-28T14:00:00+09:00"),
    end: new Date("2026-07-28T14:30:00+09:00"),
    roomId: "room-small",
    roomName: "소회의실",
    projectId: 2,
    projectTag: "BRAND",
    topics: [{ main: "브랜드", sub: "리뉴얼 방향" }],
    attendeeIds: [1, 5, 7],
    hostId: 1,
    hostAuthority: AUTHORITY.OWNER,
    roomReservationId: "seed-reservation-4",
    isOnline: false,
    recordingFileName: null,
  });
  endMockMeeting(brand.id, "2026-07-28T14:29:00.000Z");
  /*
    ⚠️ 이 한 건만 **요약 중**으로 둔다. 종료 직후 몇 분 동안만 보이는 상태라 목에 하나
       세워 두지 않으면 그 카드를 만들었는지조차 화면에서 확인할 수 없다(§정직한 목업).
  */
  setMockSummaryStatus(brand.id, AI_SUMMARY_STATUS.SUMMARIZING);
  extras.set(brand.id, {
    script: [
      { at: "14:00", text: "3분기 브랜드 리뉴얼 방향을 정리하겠습니다." },
      { at: "14:09", text: "로고와 가이드라인 개편은 디자인팀이 맡아 주세요." },
      { at: "14:18", text: "캠페인 자산은 마케팅팀이 리뉴얼 일정에 맞춰 제작합니다." },
    ],
    outputTeamActionIds: [5, 6],
  });

  /*
    m6 — Owner의 완료 회의. 요약은 끝났지만(REVIEWED) Host가 검토 화면에서 [액션 분배 확정]을
    아직 안 눌렀다 — 산출물 칸이 "확정 대기"를 말하는 경우를 확인하는 자리다.
  */
  const pendingReview = addMockMeeting({
    title: "굿즈 앱 배송 정책 협의",
    start: new Date("2026-08-04T11:00:00+09:00"),
    end: new Date("2026-08-04T11:30:00+09:00"),
    roomId: "room-small",
    roomName: "소회의실",
    projectId: 1,
    projectTag: "GOODS",
    topics: [{ main: "운영", sub: "배송 정책" }],
    attendeeIds: [1, 2, 3, 4],
    hostId: 1,
    hostAuthority: AUTHORITY.OWNER,
    roomReservationId: "seed-reservation-6",
    isOnline: false,
    recordingFileName: null,
  });
  endMockMeeting(pendingReview.id, "2026-08-04T11:31:00.000Z");
  setMockSummaryStatus(pendingReview.id, AI_SUMMARY_STATUS.REVIEWED);
  extras.set(pendingReview.id, {
    script: [
      { at: "11:00", text: "배송 정책 협의를 시작하겠습니다." },
      { at: "11:12", text: "무료 배송 기준과 반품 정책을 다음 주까지 정리해 주세요." },
    ],
  });

  /*
    m7 — Owner의 완료 회의. AI 요약이 서버 문제로 중단됐다(FAILED + isStalled) — 산출물 칸이
    "요약 실패"와는 다른 문구·재분석 안내를 말하는 경우를 확인하는 자리다.
  */
  const stalled = addMockMeeting({
    title: "굿즈 앱 결제 오류 대응 회의",
    start: new Date("2026-08-06T15:00:00+09:00"),
    end: new Date("2026-08-06T15:30:00+09:00"),
    roomId: "room-small",
    roomName: "소회의실",
    projectId: 1,
    projectTag: "GOODS",
    topics: [{ main: "운영", sub: "결제 오류" }],
    attendeeIds: [1, 2, 5],
    hostId: 1,
    hostAuthority: AUTHORITY.OWNER,
    roomReservationId: "seed-reservation-7",
    isOnline: false,
    recordingFileName: null,
  });
  endMockMeeting(stalled.id, "2026-08-06T15:31:00.000Z");
  setMockSummaryStatus(stalled.id, AI_SUMMARY_STATUS.FAILED);
  extras.set(stalled.id, { script: [], isStalled: true });

  /*
    m8 — Owner의 취소된 회의(MEET-06). 목록 카드에 `취소` 배지만 뜨고 [녹음하기]·[회의록]
    모두 안 뜨는 경우, 상세에서 산출물·발화 기록 칸이 "취소된 회의입니다"로 갈리는 경우를
    확인하는 자리다(§정직한 목업 — 취소도 회의 상태 하나라 시드 없이는 화면을 못 본다).
  */
  const canceled = addMockMeeting({
    title: "굿즈 앱 프로모션 협의",
    start: new Date("2026-08-20T13:00:00+09:00"),
    end: new Date("2026-08-20T13:30:00+09:00"),
    roomId: "room-small",
    roomName: "소회의실",
    projectId: 1,
    projectTag: "GOODS",
    topics: [{ main: "운영", sub: "프로모션" }],
    attendeeIds: [1, 2, 5],
    hostId: 1,
    hostAuthority: AUTHORITY.OWNER,
    roomReservationId: "seed-reservation-8",
    isOnline: false,
    recordingFileName: null,
  });
  cancelMockMeeting(canceled.id, "2026-08-11T09:00:00.000Z");
}

/** 테스트 전용 — 시드를 되돌린다(스토어는 `meetings.ts`가 들고 있어 함께 비운다) */
export function resetMockMeetingSeed(): void {
  globalStore.__meetingSeeded = false;
  extras.clear();
  const meetings = listMockMeetings();
  meetings.splice(0, meetings.length);
}
