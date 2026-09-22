import { AUTHORITY } from "@/constants/domain";

import {
  type Actor,
  canAccessManageScope,
  canAccessOwnerScope,
  canAccessPersonalScope,
  canAccessTeamScope,
  canApproveFinal,
  canApproveMid,
  canGrantAdmin,
  canIssueAccount,
  canManageBilling,
  canManageCompany,
  canManageMembers,
  canManageNotice,
  canManageRooms,
  canViewMeetingDetail,
  isWithinTeamScope,
} from "./permission";

/**
 * 권한 개편(Admin = 겸직) 회귀 테스트.
 *
 * ⚠️ 여기서 지키려는 건 하나다 — **Admin은 권한 위에 얹히고, Owner에게는 얹히지 않는다.**
 *    BE가 실수로 Owner에게 `isAdmin: true`를 내려도 권한이 새면 안 된다.
 */
const leader: Actor = { id: 1, role: AUTHORITY.LEADER };
const member: Actor = { id: 2, role: AUTHORITY.MEMBER };
const owner: Actor = { id: 3, role: AUTHORITY.OWNER };

describe("Admin 겸직", () => {
  it("Leader가 Admin을 겸하면 운영 권한이 열린다", () => {
    const concurrent: Actor = { ...leader, isAdmin: true };

    expect(canIssueAccount(concurrent)).toBe(true);
    expect(canManageRooms(concurrent)).toBe(true);
    expect(canManageMembers(concurrent)).toBe(true);
  });

  it("겸직하지 않은 Leader는 운영 권한이 없다", () => {
    expect(canIssueAccount(leader)).toBe(false);
    expect(canManageRooms(leader)).toBe(false);
    expect(canManageMembers(leader)).toBe(false);
  });

  it("겸직 대상은 Leader·Member뿐이다", () => {
    expect(canGrantAdmin(leader)).toBe(true);
    expect(canGrantAdmin(member)).toBe(true);
    expect(canGrantAdmin(owner)).toBe(false);
  });
});

describe("Owner와 Admin이 갈리는 지점", () => {
  it("계정 발급은 Owner와 Admin 겸직자가 함께 한다(2026-08-06: 사원 관리 화면 통합)", () => {
    const concurrent: Actor = { ...member, isAdmin: true };

    expect(canIssueAccount(owner)).toBe(true);
    expect(canIssueAccount(concurrent)).toBe(true);
    expect(canIssueAccount(member)).toBe(false);
  });

  it("구독 결제는 Owner와 Admin 겸직자가 함께 맡는다", () => {
    const concurrent: Actor = { ...member, isAdmin: true };

    expect(canManageBilling(owner)).toBe(true);
    expect(canManageBilling(concurrent)).toBe(true);
    expect(canManageBilling(member)).toBe(false);
  });

  it("인수인계 최종 승인은 Owner 전용이다(2026-08-06: Admin 제외)", () => {
    expect(canApproveFinal(owner)).toBe(true);
    expect(canApproveFinal({ ...member, isAdmin: true })).toBe(false);
    expect(canApproveFinal(member)).toBe(false);
  });

  /*
    ⚠️ 이 함수의 **유일한 존재 이유가 Admin 배제**다. `canManageMembers`·`canManageBilling`과
       판정이 갈리는 지점이라, 여기가 없으면 `|| isAdmin(actor)`를 슬쩍 붙여도 아무도 못 잡는다 —
       기업 설정에서는 직급의 권한을 고칠 수 있어서, 열리면 Admin이 자기 위를 스스로 만든다.
  */
  it("기업 설정은 Owner 전용이다 — Admin 겸직도 못 연다", () => {
    expect(canManageCompany(owner)).toBe(true);
    expect(canManageCompany({ ...member, isAdmin: true })).toBe(false);
    expect(canManageCompany({ ...leader, isAdmin: true })).toBe(false);
    expect(canManageCompany(leader)).toBe(false);
    expect(canManageCompany(member)).toBe(false);
  });

  it("공지 작성·수정은 Owner 전용이다(2026-08-06: Admin 제외)", () => {
    expect(canManageNotice(owner)).toBe(true);
    expect(canManageNotice({ ...member, isAdmin: true })).toBe(false);
    expect(canManageNotice(member)).toBe(false);
  });
});

describe("canViewMeetingDetail — 목록이 아니라 상세(내용) 열람", () => {
  const ownerHosted = { isOwnerHosted: true, attendeeIds: [] as number[] };
  const teamMeeting = { isOwnerHosted: false, attendeeIds: [] as number[], hostTeamId: 10 };

  it("Owner는 전체 열람 가능", () => {
    expect(canViewMeetingDetail(owner, teamMeeting)).toBe(true);
    expect(canViewMeetingDetail(owner, ownerHosted)).toBe(true);
  });

  it("Member는 참석자인 회의만 — 참석자 아니면 Owner 개설 회의도 못 본다", () => {
    const attendee: Actor = { id: 99, role: AUTHORITY.MEMBER };
    expect(canViewMeetingDetail(attendee, { ...teamMeeting, attendeeIds: [99] })).toBe(true);
    expect(canViewMeetingDetail(member, teamMeeting)).toBe(false);
    expect(canViewMeetingDetail(member, ownerHosted)).toBe(false);
  });

  it("Leader는 참석자가 아니어도 Owner 개설 회의는 본다", () => {
    expect(canViewMeetingDetail(leader, ownerHosted)).toBe(true);
  });

  it("Leader는 자기 팀이 연 회의는 보고, 타 팀 회의는 못 본다", () => {
    const withTeam: Actor = { ...leader, teamId: 10 };
    expect(canViewMeetingDetail(withTeam, teamMeeting)).toBe(true);
    expect(canViewMeetingDetail(withTeam, { ...teamMeeting, hostTeamId: 20 })).toBe(false);
  });
});

describe("isWithinTeamScope — teamId 단순 비교(2026-08-06 확정 스키마)", () => {
  it("같은 teamId면 범위 안, 다르면 밖", () => {
    const withTeam: Actor = { ...leader, teamId: 1 };
    expect(isWithinTeamScope(withTeam, { teamId: 1 })).toBe(true);
    expect(isWithinTeamScope(withTeam, { teamId: 2 })).toBe(false);
  });

  it("teamId가 없는 actor(OWNER 등)는 항상 범위 밖", () => {
    expect(isWithinTeamScope(owner, { teamId: 1 })).toBe(false);
  });
});

describe("canApproveMid", () => {
  it("LEADER만 가능하고, 대상 팀을 넘기면 teamId로 검증한다", () => {
    const withTeam: Actor = { ...leader, teamId: 1 };
    expect(canApproveMid(member)).toBe(false);
    expect(canApproveMid(withTeam)).toBe(true); // 대상 안 넘기면 화면 노출 판단용으로 통과
    expect(canApproveMid(withTeam, { teamId: 1 })).toBe(true);
    expect(canApproveMid(withTeam, { teamId: 2 })).toBe(false);
  });
});

/**
 * 화면 문 — **주소를 직접 쳐도 열리면 안 되는 곳.**
 *
 * ⚠️ 사이드바에서 안 보이는 건 UX일 뿐 보안이 아니다(§권한). 대시보드에는 판정이 아예
 *    없어서 로그인이 붙는 순간 사원이 대표 대시보드를 열 수 있는 상태였다 — 그 회귀를 막는다.
 */
describe("화면 접근 범위", () => {
  it("대표 화면은 대표만", () => {
    expect(canAccessOwnerScope(owner)).toBe(true);
    expect(canAccessOwnerScope(leader)).toBe(false);
    expect(canAccessOwnerScope(member)).toBe(false);
    // Admin 겸직은 회사 운영을 열 뿐 대표 화면을 열지는 않는다
    expect(canAccessOwnerScope({ ...leader, isAdmin: true })).toBe(false);
  });

  it("팀 화면은 팀장만 — 대표도 못 들어간다", () => {
    expect(canAccessTeamScope(leader)).toBe(true);
    expect(canAccessTeamScope(owner)).toBe(false);
    expect(canAccessTeamScope(member)).toBe(false);
  });

  it("개인 화면은 대표만 못 들어간다 — 대표에겐 개인 액션이 없다", () => {
    expect(canAccessPersonalScope(member)).toBe(true);
    expect(canAccessPersonalScope(leader)).toBe(true);
    expect(canAccessPersonalScope(owner)).toBe(false);
  });

  it("회사 운영 구역은 사이드바가 여는 문과 같다 — 대표이거나 Admin 겸직", () => {
    expect(canAccessManageScope(owner)).toBe(true);
    expect(canAccessManageScope({ ...member, isAdmin: true })).toBe(true);
    expect(canAccessManageScope(member)).toBe(false);
    expect(canAccessManageScope(leader)).toBe(false);
  });
});
