import { AUTHORITY } from "@/constants/authority";

import {
  ATTENDEE_SCOPE_ERROR,
  attendeeScopeGuideOf,
  type AttendeeScopeViewer,
  filterAttendeeCandidates,
  findAttendeeScopeViolation,
  findAttendeesDroppedByScope,
} from "./attendee-scope";
import type { RoomMember } from "./types";

const OWNER: RoomMember = { id: 1, name: "박대표", teamName: null, authority: AUTHORITY.OWNER };
const DEV_LEADER: RoomMember = {
  id: 2,
  name: "김서준",
  teamName: "개발팀",
  authority: AUTHORITY.LEADER,
};
const DEV_MEMBER: RoomMember = {
  id: 3,
  name: "이하윤",
  teamName: "개발팀",
  authority: AUTHORITY.MEMBER,
};
const MARKETING_LEADER: RoomMember = {
  id: 5,
  name: "최유진",
  teamName: "마케팅팀",
  authority: AUTHORITY.LEADER,
};

const OWNER_VIEWER: AttendeeScopeViewer = { id: 1, role: AUTHORITY.OWNER, teamName: null };
const DEV_LEADER_VIEWER: AttendeeScopeViewer = {
  id: 2,
  role: AUTHORITY.LEADER,
  teamName: "개발팀",
};
const DEV_MEMBER_VIEWER: AttendeeScopeViewer = {
  id: 3,
  role: AUTHORITY.MEMBER,
  teamName: "개발팀",
};

describe("filterAttendeeCandidates", () => {
  const ALL = [OWNER, DEV_LEADER, DEV_MEMBER, MARKETING_LEADER];

  it("Owner는 팀장만 고를 수 있다 — 자기 자신도 후보가 아니다", () => {
    expect(filterAttendeeCandidates(ALL, OWNER_VIEWER)).toEqual([DEV_LEADER, MARKETING_LEADER]);
  });

  it("Leader는 자기 팀만 — 다른 팀 팀장은 빠진다", () => {
    expect(filterAttendeeCandidates(ALL, DEV_LEADER_VIEWER)).toEqual([DEV_MEMBER]);
  });

  it("Member도 Leader와 같은 범위다", () => {
    expect(filterAttendeeCandidates(ALL, DEV_MEMBER_VIEWER)).toEqual([DEV_LEADER]);
  });

  it("Leader·Member host도 자기 자신은 후보가 아니다(서버가 명단에 끼워 넣는다)", () => {
    /* 체크를 풀어도 저장된 명단엔 host가 남는다 — 토글로 내주면 화면이 거짓말을 한다. */
    expect(filterAttendeeCandidates(ALL, DEV_LEADER_VIEWER)).not.toContain(DEV_LEADER);
    expect(filterAttendeeCandidates(ALL, DEV_MEMBER_VIEWER)).not.toContain(DEV_MEMBER);
  });

  it("팀을 모르는 Leader·Member에게는 아무도 안 열린다(조용히 전원 허용 금지)", () => {
    expect(
      filterAttendeeCandidates(ALL, { id: 3, role: AUTHORITY.MEMBER, teamName: null }),
    ).toEqual([]);
  });
});

describe("findAttendeeScopeViolation (서버 재검증)", () => {
  it("Owner가 팀장만 냈으면 통과한다", () => {
    expect(findAttendeeScopeViolation([DEV_LEADER, MARKETING_LEADER], OWNER_VIEWER)).toBeNull();
  });

  it("Owner 명단에 사원이 하나라도 섞이면 막는다(AI 팀 액션 판단 근거가 깨진다)", () => {
    expect(findAttendeeScopeViolation([DEV_LEADER, DEV_MEMBER], OWNER_VIEWER)).toBe(
      ATTENDEE_SCOPE_ERROR.owner,
    );
  });

  it("host 자신은 규칙에서 빠진다 — 서버가 어차피 명단에 끼워 넣는다", () => {
    /* Owner 개설 회의를 참석자 교체 화면에서 열면 현재 명단에 host(id=1)가 들어 있다 —
       그걸 위반으로 세면 화면을 열기만 해도 저장이 막힌다. */
    expect(findAttendeeScopeViolation([OWNER, DEV_LEADER], OWNER_VIEWER)).toBeNull();
  });

  it("Leader가 자기 팀만 냈으면 통과한다", () => {
    expect(findAttendeeScopeViolation([DEV_LEADER, DEV_MEMBER], DEV_LEADER_VIEWER)).toBeNull();
  });

  it("Leader가 다른 팀 사람을 끼워 넣으면 막는다", () => {
    expect(findAttendeeScopeViolation([DEV_MEMBER, MARKETING_LEADER], DEV_LEADER_VIEWER)).toBe(
      ATTENDEE_SCOPE_ERROR.team,
    );
  });

  it("팀을 모르는 Leader·Member는 통과시키지 않는다", () => {
    expect(
      findAttendeeScopeViolation([DEV_MEMBER], { id: 3, role: AUTHORITY.MEMBER, teamName: null }),
    ).toBe(ATTENDEE_SCOPE_ERROR.unknownTeam);
  });
});

describe("findAttendeesDroppedByScope — 규칙 밖이 된 기존 참석자", () => {
  const MEMBERS = [OWNER, DEV_LEADER, DEV_MEMBER, MARKETING_LEADER];

  /*
    ⚠️ 이 함수는 참석자 교체(MEET-09) 화면 전용이다. 예약 화면(첫 개설)에는 "예전 명단"이 없다 —
       호출부가 값을 안 넘기면 이 케이스 자체가 안 생긴다.
  */
  it("Owner 회의에 남아 있는 사원은 골라낸다(규칙 강제 이전 회의)", () => {
    /* 초대 당시엔 규칙이 없어 팀원 이하윤이 참석자로 들어가 있었다. */
    expect(findAttendeesDroppedByScope(MEMBERS, OWNER_VIEWER, [2, 3])).toEqual([DEV_MEMBER]);
  });

  it("전부 범위 안이면 빈 목록이다 — 안내 문구가 매번 뜨지 않도록", () => {
    expect(findAttendeesDroppedByScope(MEMBERS, OWNER_VIEWER, [2])).toEqual([]);
  });

  it("host 본인은 빠지는 사람에 넣지 않는다 — 서버가 어차피 명단에 끼워 넣는다", () => {
    expect(findAttendeesDroppedByScope(MEMBERS, OWNER_VIEWER, [1, 2])).toEqual([]);
  });

  /* ⚠️ Leader가 팀을 옮긴 사람과 같은 화면에서 회의를 열 때 — 다른 팀 참석자를 이름으로 알린다 */
  it("Leader 회의에서 다른 팀 참석자도 골라낸다", () => {
    expect(findAttendeesDroppedByScope(MEMBERS, DEV_LEADER_VIEWER, [3, 5])).toEqual([
      MARKETING_LEADER,
    ]);
  });
});

describe("attendeeScopeGuideOf", () => {
  it("왜 목록이 짧은지 권한별로 다른 말을 한다", () => {
    expect(attendeeScopeGuideOf(OWNER_VIEWER)).toBe("팀장만 지정할 수 있습니다");
    expect(attendeeScopeGuideOf(DEV_LEADER_VIEWER)).toBe("같은 팀 소속만 지정할 수 있습니다");
  });
});
