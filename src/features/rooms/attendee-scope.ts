/**
 * 회의 참석자 **범위 규칙** — 화면(피커)과 서버(Server Action)가 이 파일 하나를 같이 본다.
 *
 * | 개설자 | 지정 가능한 참석자 |
 * | --- | --- |
 * | Owner | **LEADER만** |
 * | Leader · Member | **자기 팀 소속만** |
 *
 * ⚠️ **2026-08-13 확정 — 2026-08-12의 "선택 가능한 토글"을 뒤집는다.** 전에는 "전체 · 팀장급만",
 *    "전체 · 내 부서만"을 사람이 골랐지만 이제 **고정**이다. 미래의 읽는 사람에게: 이건 되돌린
 *    게 아니라 **다음 결정**이다 — `ROOM_ATTENDEE_FILTER.ALL`이나 필터 토글을 "복원"하지 않는다.
 * ⚠️ **왜 강제인가**: Owner 개설 회의의 참석자가 전부 팀장이면, 회의록에서 이름이 불린 사람이
 *    곧 **그 팀의 대표**라는 게 확정된다 — BE가 AI로 뽑은 액션을 개인 액션이 아니라 **팀 액션**
 *    으로 만드는 근거가 이것이다. 팀장 아닌 사람이 한 명이라도 섞이면 그 추론이 깨진다.
 * ⚠️ **`server-only`를 끌어오지 않는다.** 이 규칙은 클라이언트 컴포넌트(`RoomAttendeePicker`)도
 *    써야 해서 `validate.ts`(→`lib/permission.ts` = `server-only`)에 둘 수 없다 — `constants.ts`가
 *    같은 이유로 분리돼 있는 것과 같다.
 * ⚠️ 그래도 **화면 필터는 UX일 뿐이다**(CLAUDE.md §권한: 화면 숨김은 보안이 아니다).
 *    Server Action은 주소만 알면 직접 부를 수 있어 `findAttendeeScopeViolation`으로 다시 본다.
 */

import { AUTHORITY, type Authority } from "@/constants/authority";

import type { RoomMember } from "./types";

/**
 * 참석자 범위를 정하는 **개설자 정보**.
 * ⚠️ 예전엔 `viewerTeamName === null`(= 팀이 없으니 Owner겠지)로 **간접 추론**했는데, 그건
 *    "팀 정보가 아직 안 내려온 Leader"와 Owner를 구분하지 못한다 — 그러면 팀장에게 전사
 *    팀장 명단이 열린다. CLAUDE.md §조직 계층대로 **권한은 직급(=`role`)에서 온다**:
 *    `Actor.role`을 그대로 받아 명시적으로 가른다.
 */
export interface AttendeeScopeViewer {
  /**
   * 개설자 본인의 id — **host는 이 규칙에서 빠진다.**
   * ⚠️ host는 고르는 사람이 아니라 **명단에 자동으로 들어가는 사람**이다(MEET-09 "host 자동
   *    포함·제거 불가", 목은 `updateMockMeetingAttendees`, BE는 `Meeting.create`가 앞에 끼운다.
   *    BE `validateInvitedAttendees`도 host를 뺀 수만 센다). 빼지 않으면 Owner가 연 회의를
   *    참석자 교체 화면에서 열기만 해도 **자기 자신 때문에** 규칙 위반이 된다.
   */
  id: number;
  role: Authority;
  /** 소속 팀 이름 — Owner는 팀이 없어 `null`(CLAUDE.md §조직 계층). */
  teamName: string | null;
}

/** Owner가 여는 회의인가 — 규칙이 갈리는 유일한 축이라 한 곳에서만 판정한다. */
function isOwnerHost(viewer: AttendeeScopeViewer): boolean {
  return viewer.role === AUTHORITY.OWNER;
}

/**
 * 이 사람을 참석자로 지정할 수 있는가.
 * ⚠️ **host 자신은 후보가 아니다**(`AttendeeScopeViewer.id` 주석). host는 고르는 사람이 아니라
 *    서버가 명단에 끼워 넣는 사람이라, 체크박스로 내주면 풀어도 저장된 명단엔 그대로 남아
 *    화면이 거짓말을 한다(§정직성). Owner는 `authority` 조건에 이미 걸려 안 나왔지만
 *    Leader·Member는 자기 팀 조건에 자기가 걸려 스스로를 토글할 수 있었다.
 * ⚠️ Leader·Member인데 팀 정보가 없으면 **아무도 못 고른다**(`false`). 조용히 전원 허용으로
 *    넘어가면 규칙이 있으나 마나가 된다 — 막고 화면에 알린다(§정직성).
 */
export function isAttendeeInScope(member: RoomMember, viewer: AttendeeScopeViewer): boolean {
  if (member.id === viewer.id) return false;
  if (isOwnerHost(viewer)) return member.authority === AUTHORITY.LEADER;
  return viewer.teamName !== null && member.teamName === viewer.teamName;
}

/** 피커에 보여줄 후보만 남긴다 — 검색 키워드는 호출부가 따로 건다. */
export function filterAttendeeCandidates(
  members: RoomMember[],
  viewer: AttendeeScopeViewer,
): RoomMember[] {
  return members.filter((member) => isAttendeeInScope(member, viewer));
}

/**
 * 화면에 왜 목록이 짧은지 알려 주는 한 줄 — 토글이 사라진 자리를 이 문구가 대신한다.
 * ⚠️ 조용히 좁히면 사용자는 "사람이 안 나온다"고만 느낀다(§정직성). 라벨 하드코딩 금지
 *    원칙대로 컴포넌트가 아니라 여기 둔다(§도메인 상수).
 */
export const ATTENDEE_SCOPE_GUIDE = {
  owner: "팀장만 지정할 수 있습니다",
  team: "같은 팀 소속만 지정할 수 있습니다",
} as const;

export function attendeeScopeGuideOf(viewer: AttendeeScopeViewer): string {
  return isOwnerHost(viewer) ? ATTENDEE_SCOPE_GUIDE.owner : ATTENDEE_SCOPE_GUIDE.team;
}

/** 후보가 한 명도 없을 때의 안내 — "검색 결과가 없습니다"와 원인이 다르다(§정직성). */
export const ATTENDEE_SCOPE_EMPTY = "지정할 수 있는 참석자가 없습니다";

/**
 * **이미 명단에 있는데 지금 규칙으로는 못 고르는 사람**을 골라낸다(참석자 교체 화면 전용).
 *
 * ⚠️ 이런 사람이 생긴다: 규칙이 없던 때 만든 회의, 초대 뒤에 팀을 옮긴 사람, 팀장에서 내려온 사람.
 * ⚠️ **살려 보낼 수도 없고 몰래 뺄 수도 없다.** 살려 보내면 서버 재검증
 *    (`findAttendeeScopeViolation`)이 통째로 거부해 저장 자체가 막히고, 몰래 빼면 아무것도
 *    안 건드린 host가 [저장]만 눌러도 그 사람들이 명단에서 사라진 채 성공 토스트가 뜬다
 *    (2026-08-13 적대적 검증에서 잡혔다 — 이 PR이 만든 회귀다).
 * ⚠️ 그래서 **이름으로 보여주고 저장하게 한다**(§정직성). 화면이 "이 사람들은 빠집니다"라고
 *    먼저 말하면, 명단이 바뀌는 건 사고가 아니라 host가 내린 결정이 된다.
 * ⚠️ host 자신은 여기 안 낀다 — 규칙 대상이 아니고 서버가 다시 끼워 넣는다.
 */
export function findAttendeesDroppedByScope(
  members: RoomMember[],
  viewer: AttendeeScopeViewer,
  currentAttendeeIds: number[],
): RoomMember[] {
  const current = new Set(currentAttendeeIds);
  return members.filter(
    (member) =>
      current.has(member.id) && member.id !== viewer.id && !isAttendeeInScope(member, viewer),
  );
}

/** 빠질 사람을 알리는 머리말 — 명단은 화면이 이름으로 잇는다(라벨 하드코딩 금지). */
export const ATTENDEE_SCOPE_DROPPED = "지금 규칙으로는 지정할 수 없어, 저장하면 명단에서 빠집니다";

/** 서버 재검증 실패 문구 — 폼 오류 칸(`attendeeIds`)에 그대로 붙는다. */
export const ATTENDEE_SCOPE_ERROR = {
  owner: "Owner가 개설하는 회의에는 팀장만 참석자로 지정할 수 있습니다",
  team: "자기 팀 소속만 참석자로 지정할 수 있습니다",
  /** Leader·Member인데 세션에 팀이 없는 경우 — 범위를 계산할 수 없으니 통과시키지 않는다. */
  unknownTeam: "소속 팀을 확인할 수 없어 참석자를 지정할 수 없습니다",
} as const;

/**
 * **서버 재검증** — 제출된 참석자가 규칙을 지키는지 본다. 어기면 화면에 띄울 문구, 지키면 `null`.
 *
 * ⚠️ 인자로 **이미 명부에서 찾아낸 사원 객체**를 받는다(id가 아니다) — 명부를 어디서 구하는지는
 *    호출부(목/실서버)마다 달라서다. **명부를 못 구하면 이 함수를 부를 수 없고, 그때는 검증한
 *    척하지 않는다**(§정직성) — 호출부 주석을 본다.
 */
export function findAttendeeScopeViolation(
  attendees: RoomMember[],
  viewer: AttendeeScopeViewer,
): string | null {
  /* host는 명단에 자동으로 들어가는 사람이라 규칙 대상이 아니다(`AttendeeScopeViewer.id` 주석). */
  const invited = attendees.filter((member) => member.id !== viewer.id);

  if (isOwnerHost(viewer)) {
    return invited.every((member) => member.authority === AUTHORITY.LEADER)
      ? null
      : ATTENDEE_SCOPE_ERROR.owner;
  }
  if (viewer.teamName === null) return ATTENDEE_SCOPE_ERROR.unknownTeam;
  return invited.every((member) => member.teamName === viewer.teamName)
    ? null
    : ATTENDEE_SCOPE_ERROR.team;
}
