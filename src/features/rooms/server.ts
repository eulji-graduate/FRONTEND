import "server-only";

import { addDays, format, startOfWeek } from "date-fns";

import { ACTION_STATUS } from "@/constants/action";
import { AUTHORITY } from "@/constants/authority";
import { PROJECT_STATUS } from "@/constants/domain";
import type { BeActionSummary } from "@/features/action/mapper";
import { requireAccessToken } from "@/features/auth/session";
import { findMockMeetingByReservationId } from "@/features/meeting/mock/meetings";
import { getTeamLeaders } from "@/features/member/manage-server";
import type { BePageResponse } from "@/features/project/mapper";
import { TOP_LEVEL_PROJECTS } from "@/features/project/mock/projects";
import { PROJECT_TEAM_ACTIONS_MOCK } from "@/features/project/mock/team-actions";
import { getProjectsPage } from "@/features/project/server";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { type Actor, requiresParentTeamAction } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { RESERVATION_DURATION_MINUTES } from "./constants";
import { GRID_END_HOUR, GRID_START_HOUR } from "./grid-slot";
import {
  type BeMeetingRoom,
  type BeRoomWeekAvailability,
  toMeetingRoom,
  toRoomWeekAvailability,
} from "./mapper";
import { listMockMembers } from "./mock/members";
import { listMockReservationsByRoom } from "./mock/reservations";
import { findMockRoom, listMockRooms } from "./mock/rooms";
import type {
  MeetingRoom,
  RoomAvailabilitySlot,
  RoomDayAvailability,
  RoomMember,
  RoomProjectOption,
  RoomTeamActionOption,
  RoomWeekAvailability,
} from "./types";

const WEEKDAYS_PER_WEEK = 5;

function toHHMM(minutesOfDay: number): string {
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/*
  ⚠️ **회의실 운영시간이 아니라 하루 전체 범위다**(2026-08-15, BE PR #523 — 운영시간 개념 자체를
     없앴다. 회의실은 이제 항상 이용 가능). 캘린더 그리드(`grid-slot.ts`)와 같은 00:00~24:00
     범위를 그대로 쓴다 — 목 슬롯이 실제 그리드보다 좁으면 그리드 하단이 빈 칸처럼 보인다.
*/
const DAY_START_MINUTES = GRID_START_HOUR * 60;
const DAY_END_MINUTES = GRID_END_HOUR * 60;

/** 목 데이터로 하루치 슬롯을 만든다 — 하루 전체를 30분 단위로 나누고 겹치는 예약이 있으면 RESERVED로 채운다. */
function buildMockDaySlots(date: Date, room: MeetingRoom): RoomDayAvailability {
  const reservations = listMockReservationsByRoom(room.id);
  const slots: RoomAvailabilitySlot[] = [];

  for (
    let minutesOfDay = DAY_START_MINUTES;
    minutesOfDay < DAY_END_MINUTES;
    minutesOfDay += RESERVATION_DURATION_MINUTES
  ) {
    const startTime = toHHMM(minutesOfDay);
    const slotStart = new Date(`${format(date, "yyyy-MM-dd")}T${startTime}:00`);
    const slotEnd = new Date(slotStart.getTime() + RESERVATION_DURATION_MINUTES * 60_000);
    const overlapping = reservations.find(
      (reservation) => reservation.start < slotEnd && reservation.end > slotStart,
    );

    // ⚠️ **회의의 `id`는 예약의 `id`와 다른 시퀀스다**(스토어가 따로 증가한다) — 캘린더
    //    막대가 클릭돼 상세를 열 때 쓰는 건 회의 쪽 id라, `roomReservationId`로 역참조한다.
    //    예약 id를 그대로 넘기면 상세 모달이 항상 "회의를 찾을 수 없습니다"로 뜬다.
    //    시드 예약처럼 짝지어진 회의 자체가 없을 때만 예약 id로 되돌아간다(기존 동작 유지).
    const meeting = overlapping ? findMockMeetingByReservationId(overlapping.id) : null;
    slots.push({
      startTime,
      status: overlapping ? "RESERVED" : "AVAILABLE",
      meetingId: meeting?.id ?? overlapping?.id ?? null,
      title: overlapping?.title ?? null,
    });
  }

  return { date: format(date, "yyyy-MM-dd"), slots };
}

/**
 * 회의실 하나의 주간(월~금) 슬롯 현황(`GET /api/meeting-rooms/availability`, ROOM-02).
 * 회의실이 없으면 `null`(호출부가 "존재하지 않는 회의실" 처리).
 * ⚠️ **축이 "회의실 1개 × 5일"이다**(기존 "하루 × 전체 회의실" 그리드는 폐기, 2026-08-10 전환).
 */
export async function getRoomWeekAvailability(
  roomId: string,
  weekOf: Date,
): Promise<RoomWeekAvailability | null> {
  if (isMock) {
    const room = findMockRoom(roomId);
    if (!room) return null;

    const weekStart = startOfWeek(weekOf, { weekStartsOn: 1 });
    const days = Array.from({ length: WEEKDAYS_PER_WEEK }, (_, index) =>
      buildMockDaySlots(addDays(weekStart, index), room),
    );

    return {
      weekStart: format(weekStart, "yyyy-MM-dd"),
      slotMinutes: RESERVATION_DURATION_MINUTES,
      meetingRoom: room,
      days,
    };
  }

  const accessToken = await requireAccessToken();
  try {
    const be = await serverApi<BeRoomWeekAvailability>(
      ep.meetingRoomAvailability({
        meetingRoomId: Number(roomId),
        /*
          ⚠️ **월요일로 맞춰 보낸다**(2026-08-13 고침). 그냥 넘기면 **주말에 열었을 때 화면과
             서버가 다른 주를 본다** — BE `resolveWeekStart`는 토·일이면 **다음 주 월요일**로
             넘기는데(`with(next(MONDAY))`), 캘린더는 같은 날짜를 `startOfWeek(…, {weekStartsOn: 1})`
             = **지난 월요일**로 읽어 격자를 그린다. 그러면 예약이 꽉 찬 주가 통째로 비어 보이고,
             지난 주 칸을 눌러 예약 창이 열린다.
          ⚠️ 목 분기도 같은 정규화를 한다(위 `weekStart`) — 두 경로가 갈리면 목에서만 맞는다.
        */
        date: format(startOfWeek(weekOf, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      }),
      { accessToken },
    );
    return toRoomWeekAvailability(be);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * 회의실 목록(`GET /api/meeting-rooms`, ROOM-01) — 비활성화되지 않은 회의실을 이름 오름차순으로.
 * 예약 폼의 회의실 select와 `/manage/rooms` 관리 목록이 이 응답을 함께 쓴다.
 */
export async function getMeetingRooms(): Promise<MeetingRoom[]> {
  if (isMock) return listMockRooms();

  const accessToken = await requireAccessToken();
  const { meetingRooms } = await serverApi<{ meetingRooms: BeMeetingRoom[] }>(ep.meetingRooms(), {
    accessToken,
  });
  return meetingRooms.map(toMeetingRoom);
}

/**
 * 참석자 후보 명부 — **범위가 회사 전체가 아니라 개설자 권한별로 갈린다**(`attendee-scope.ts`).
 * 화면(피커)이 `filterAttendeeCandidates`로 다시 거르므로 여기서는 "그 축을 채울 수 있는
 * 명부"만 구하면 된다.
 *
 * ⚠️ **Owner와 Leader·Member는 API가 다르다.**
 *    - Leader·Member: `GET /api/members/my-team`(자기 팀 로스터, ACTIVE만) — 토큰의
 *      `teamId`로 범위가 자동으로 잡힌다.
 *    - Owner: 이 엔드포인트는 팀이 없는 Owner에게 **빈 배열**을 돌려준다(BE 확인) — 대신
 *      팀마다 리더 한 명을 세는 `getTeamLeaders()`(`ep.teams()`)를 그대로 쓴다. Owner가
 *      고를 수 있는 후보가 정확히 "팀별 리더"라, 이미 있는 함수와 목적이 같다.
 * ⚠️ **`authority` 필드는 두 갈래 다 정확하지 않을 수 있다.** `isAttendeeInScope`가 Leader·
 *    Member 분기에서는 `teamName`만 보고 `authority`를 안 읽으므로(코드 참고) 문제가 안 된다 —
 *    Owner 분기에서만 `authority===LEADER`가 실제로 걸리는데, `getTeamLeaders()`가 주는
 *    사람은 정의상 전부 리더라 항상 참이다.
 */
export async function getReservableMembers(actor: Actor): Promise<RoomMember[]> {
  if (isMock) return listMockMembers();

  if (actor.role === AUTHORITY.OWNER) {
    const leaders = await getTeamLeaders();
    return Array.from(leaders.entries()).map(([teamName, leader]) => ({
      id: leader.id,
      name: leader.name,
      teamName,
      authority: AUTHORITY.LEADER,
    }));
  }

  const accessToken = await requireAccessToken();
  const roster = await serverApi<{ memberId: number; name: string }[]>(ep.membersMyTeam(), {
    accessToken,
  });
  return roster.map((row) => ({
    id: row.memberId,
    name: row.name,
    teamName: actor.teamName ?? null,
    /*
      ⚠️ 실제 값이 아니다 — 이 분기(Leader·Member)의 범위 판정은 `teamName`만 보고 이 필드는
         읽지 않는다(`attendee-scope.ts`). 타입을 채우기 위한 자리표시자다.
    */
    authority: AUTHORITY.MEMBER,
  }));
}

/** select 한 번에 받을 상한 — 이 회사 진행중 프로젝트가 이보다 많아지면 BE 전용 응답을 요청한다. */
const RESERVABLE_PROJECTS_PAGE_SIZE = 200;

/**
 * 예약 폼의 "프로젝트" select용 — 프로젝트 도메인의 전체 목록에서 경량 필드만 골라 낸다.
 *
 * ⚠️ **`getProjectsPage`를 재사용한다.** 프로젝트 목록 API가 이미 실서버에 연동돼 있으므로
 *    (`features/project/server.ts`) 여기서 새 경로를 만들지 않는다(§환각 API 방지) — 같은
 *    회사의 프로젝트가 두 곳에서 다르게 보이면 안 된다.
 * ⚠️ select는 **한 화면에 다 보여줄 목록**이라 페이지네이션이 안 맞는다. 아직 안 끝난
 *    프로젝트(`TODO`·`IN_PROGRESS`)만 대상으로 좁히고(완료된 프로젝트에 새 회의를 묶을
 *    일이 없다) 큰 페이지 하나로 받는다 — 회사 프로젝트가 이 상한을 넘으면 그때 BE에
 *    전용 select 응답을 요청한다.
 * ⚠️ **`status`는 BE가 한 번에 하나만 받는다**(`ListPageParams.status`, `lib/endpoints.ts`)
 *    — `TODO`·`IN_PROGRESS` 둘 다 보여주려면 상태별로 따로 불러 합친다.
 */
export async function getReservableProjects(): Promise<RoomProjectOption[]> {
  if (isMock) {
    return TOP_LEVEL_PROJECTS.map((project) => ({
      id: String(project.id),
      name: project.name,
      tag: project.tag,
    }));
  }

  const statuses = [PROJECT_STATUS.IN_PROGRESS, PROJECT_STATUS.TODO] as const;
  const projects = [];
  for (const status of statuses) {
    const { items, totalPages } = await getProjectsPage(
      { status, keyword: "" },
      0,
      RESERVABLE_PROJECTS_PAGE_SIZE,
    );
    /*
      ⚠️ **200개를 조용히 자르지 않는다**(코드래빗이 팀 액션 select에서 잡은 것과 같은
         결함을 여기서도 먼저 막는다). 이 상태의 프로젝트가 상한을 넘으면 BE 전용 select
         응답이 필요한 신호로 던진다(조직도 `manage-server.ts`와 같은 정책).
    */
    if (totalPages > 1) {
      throw new Error(
        `이 회사의 ${status} 프로젝트가 ${RESERVABLE_PROJECTS_PAGE_SIZE}건 상한을 넘어 select를 전부 채우지 못했습니다 — BE 전용 응답이 필요합니다.`,
      );
    }
    projects.push(...items);
  }
  return projects.map((project) => ({
    id: String(project.id),
    name: project.name,
    tag: project.tag,
  }));
}

/** select 한 번에 받을 상한 — 한 팀의 진행중 팀 액션이 이보다 많아지면 BE 전용 응답을 요청한다. */
const RESERVABLE_TEAM_ACTIONS_PAGE_SIZE = 200;

/**
 * 예약 폼의 "상위 팀 액션" select용 — Host가 Owner면 빈 배열(그 필드가 아예 안 뜬다,
 * WORKFLOW.md §3-1). Leader/Member면 **자기 팀**에 하달된 팀 액션만, 어느 프로젝트 것인지
 * `projectTag`로 같이 내려줘 화면이 지금 고른 프로젝트로 다시 거른다.
 *
 * ⚠️ **`GET /api/team/actions`를 그대로 쓴다.** `teamId`는 BE가 토큰에서만 꺼내므로
 *    (BE `TeamActionController` 주석) 우리가 팀을 골라 보낼 길이 없다 — 그래서 실서버
 *    분기에는 `actor.teamName` 필터가 필요 없다(항상 자기 팀만 온다). BE 주석에도 이
 *    API를 "회의 개설 모달의 상위 팀 액션 드롭다운"용으로 이미 열어 뒀다고 적혀 있다
 *    (이슈 #389, MEMBER도 호출 가능하게 완화).
 * ⚠️ 완료된 팀 액션은 상위로 고를 이유가 없어 `TODO`·`IN_PROGRESS`만 받는다(아직 안 끝난
 *    항목이 새 회의를 낳을 수 있다는 게 이 필드의 뜻이다).
 * ⚠️ **`status`는 BE가 한 번에 하나만 받는다**(`ep.teamActions`) — 두 상태를 다 보여주려면
 *    상태별로 따로 불러 합친다.
 */
export async function getReservableTeamActions(actor: Actor): Promise<RoomTeamActionOption[]> {
  if (!requiresParentTeamAction(actor)) return [];

  if (isMock) {
    /*
      ⚠️ **`teamName` 검사는 목 분기 안에만 둔다**(코드래빗 지적, 2026-08-14). 목은 이
         이름으로 `PROJECT_TEAM_ACTIONS_MOCK`을 직접 걸러야 해서 필요하지만, 실서버는
         토큰에서 팀을 결정해서 그 값이 없어도(예: teamName을 안 채운 세션) API가
         정상 동작한다 — 위에서 같이 걸러내면 그 조합에서 항상 빈 배열만 받는다.
    */
    if (!actor.teamName) return [];
    const options: RoomTeamActionOption[] = [];
    for (const [projectTag, teamActions] of Object.entries(PROJECT_TEAM_ACTIONS_MOCK)) {
      for (const teamAction of teamActions) {
        if (teamAction.team === actor.teamName) {
          options.push({ id: teamAction.id, name: teamAction.name, projectTag });
        }
      }
    }
    return options;
  }

  const accessToken = await requireAccessToken();
  const statuses = [ACTION_STATUS.IN_PROGRESS, ACTION_STATUS.TODO] as const;
  const teamActions = [];
  for (const status of statuses) {
    const response = await serverApi<BePageResponse<BeActionSummary>>(
      ep.teamActions({ status, page: 0, size: RESERVABLE_TEAM_ACTIONS_PAGE_SIZE }),
      { accessToken },
    );
    /*
      ⚠️ **200개를 조용히 자르지 않는다**(코드래빗 지적, 2026-08-14). `hasNext`가 참인데
         첫 페이지만 돌려주면 뒤 페이지 항목은 select에서 영원히 안 보인다 — 회사 안 한
         팀에 이 상태 팀 액션이 그렇게 많을 일은 드물지만, 조용히 자르는 건 §정직성 위반이다.
         BE 전용 select 응답이 필요한 신호로 던진다(조직도 `manage-server.ts`와 같은 정책).
    */
    if (response.hasNext) {
      throw new Error(
        `이 팀의 ${status} 팀 액션이 ${RESERVABLE_TEAM_ACTIONS_PAGE_SIZE}건 상한을 넘어 select를 전부 채우지 못했습니다 — BE 전용 응답이 필요합니다.`,
      );
    }
    teamActions.push(...response.content);
  }
  return teamActions
    .filter((item) => item.projectTag !== null)
    .map((item) => ({ id: item.id, name: item.title, projectTag: item.projectTag! }));
}
