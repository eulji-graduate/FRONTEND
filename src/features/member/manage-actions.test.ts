jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/mocks/config", () => ({ isMock: true }));
jest.mock("@/features/shell/viewer", () => ({ getViewer: jest.fn() }));

import { revalidatePath } from "next/cache";

import { AUTHORITY } from "@/constants/authority";
import { DELETED_MEMBER_STATUS, MEMBER_STATUS } from "@/constants/member";
import { getViewer } from "@/features/shell/viewer";

import {
  approveHandoverAction,
  changeMemberGradeAction,
  fetchMembersPageAction,
  issueAccountAction,
  rejectHandoverAction,
} from "./manage-actions";
import { type AccountDraft, MEMBER_FILTER } from "./manage-types";
import {
  completeMockHandoverMidApproval,
  findMockManagedMember,
  listMockManagedMembers,
  resetMockManagedMembers,
} from "./mock/managed";

/**
 * 사원 관리의 변경 작업.
 *
 * ⚠️ 여기서 보는 건 **권한이 두 겹으로 갈리는 지점**이다(WORKFLOW §11) —
 *    화면·직급 변경은 Admin도, 승인·반려는 Owner만. 한 함수로 뭉뚱그리면 아무도 못 잡는다.
 */

const revalidatePathMock = revalidatePath as unknown as jest.Mock;
const getViewerMock = getViewer as unknown as jest.Mock;

const OWNER = { id: 1, name: "박대표", role: AUTHORITY.OWNER, isAdmin: false };
const ADMIN = { id: 3, name: "이하윤", role: AUTHORITY.MEMBER, isAdmin: true };
const MEMBER = { id: 4, name: "박도현", role: AUTHORITY.MEMBER, isAdmin: false };

/** 휴직 승인을 기다리는 사람 */
const WAITING_ID = 3;

const DRAFT: AccountDraft = {
  name: "신입",
  email: "newbie@zgroup.co.kr",
  teamName: "개발팀",
  position: "사원",
  authority: AUTHORITY.MEMBER,
  isAdmin: false,
  roleId: null,
};

beforeEach(() => {
  revalidatePathMock.mockClear();
  resetMockManagedMembers();
  getViewerMock.mockResolvedValue(OWNER);
});

describe("권한 — 화면과 승인이 갈린다", () => {
  /*
    ⚠️ **Admin 겸직자는 승인·반려를 못 한다**(2026-08-06 확정). 화면에는 들어오지만
       그 안의 버튼만 Owner 것이다 — 이 구분이 무너지면 팀장급이 다른 팀장의 오프보딩을
       승인하게 된다.
  */
  it("Admin 겸직자는 직급은 바꾸지만 승인·반려는 못 한다", async () => {
    getViewerMock.mockResolvedValue(ADMIN);

    expect(
      await changeMemberGradeAction(4, {
        position: "선임",
        authority: AUTHORITY.MEMBER,
        isAdmin: false,
      }),
    ).toEqual({ isSuccess: true });

    expect(await approveHandoverAction(WAITING_ID)).toMatchObject({ isSuccess: false });
    expect(await rejectHandoverAction(WAITING_ID, "사유")).toMatchObject({ isSuccess: false });
  });

  it("일반 사원은 아무것도 못 한다", async () => {
    getViewerMock.mockResolvedValue(MEMBER);

    expect(
      await changeMemberGradeAction(4, {
        position: "선임",
        authority: AUTHORITY.MEMBER,
        isAdmin: false,
      }),
    ).toMatchObject({ isSuccess: false });
    expect(await issueAccountAction(DRAFT)).toMatchObject({ message: expect.any(String) });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("세션을 못 읽으면 거부하되 권한 없음과 다른 말을 한다", async () => {
    getViewerMock.mockRejectedValue(new Error("no session"));

    const result = await approveHandoverAction(WAITING_ID);

    expect(result.message).toMatch(/로그인/);
    expect(result.message).not.toMatch(/권한|대표만/);
  });
});

describe("changeMemberGradeAction", () => {
  /*
    ⚠️ 화면 셀렉트는 Leader·Member만 주지만 액션은 직접 부를 수 있다 — 없으면 아무나
       자기 계정을 OWNER로 올린다(§권한: 화면 숨김은 보안이 아니다).
  */
  it("OWNER 권한을 심으려 하면 막는다", async () => {
    const result = await changeMemberGradeAction(4, {
      position: "사원",
      authority: AUTHORITY.OWNER,
      isAdmin: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(findMockManagedMember(4)?.member.authority).toBe(AUTHORITY.MEMBER);
  });

  it("직급이 비면 막는다", async () => {
    const result = await changeMemberGradeAction(4, {
      position: "  ",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("저장하면 목에 남는다", async () => {
    await changeMemberGradeAction(4, {
      position: "선임",
      authority: AUTHORITY.MEMBER,
      isAdmin: true,
    });

    const after = findMockManagedMember(4)?.member;
    expect(after?.position).toBe("선임");
    expect(after?.isAdmin).toBe(true);
  });

  /*
    ⚠️ **자기 계정은 못 바꾼다.** 권한은 위에서 아래로만 흐른다 — Admin 겸직자가 자기를
       Leader로 올리면 대표가 준 적 없는 화면이 열리고, 기록상 "관리자가 승인했다"와
       구분되지 않는다.
  */
  it("자기 계정의 권한은 못 바꾼다", async () => {
    getViewerMock.mockResolvedValue(ADMIN);

    const result = await changeMemberGradeAction(ADMIN.id, {
      position: "팀장",
      authority: AUTHORITY.LEADER,
      isAdmin: true,
    });

    expect(result.isSuccess).toBe(false);
    expect(findMockManagedMember(ADMIN.id)?.member.authority).toBe(AUTHORITY.MEMBER);
  });

  /*
    ⚠️ 화면은 Owner면 폼을 안 그리지만 액션은 직접 부를 수 있다 — 막지 않으면 회사에
       하나뿐인 대표를 Member로 끌어내릴 수 있고, `OWNER`는 화이트리스트에 없어
       **되돌릴 수도 없다**(일방통행 파괴).
  */
  it("대표 계정은 못 끌어내린다", async () => {
    const result = await changeMemberGradeAction(1, {
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(findMockManagedMember(1)?.member.authority).toBe(AUTHORITY.OWNER);
  });
});

describe("팀당 리더 한 명", () => {
  /*
    ⚠️ 리더가 둘이면 같은 팀원의 인수인계를 두 사람이 중간 승인할 수 있고, 하나뿐인 리더를
       내리면 그 팀의 중간 승인 라인이 조용히 사라진다(WORKFLOW §7).
  */
  it("이미 팀장이 있는 팀에 또 승격시키지 못한다", async () => {
    // 개발팀에는 김서준(id 2)이 이미 LEADER다
    const result = await changeMemberGradeAction(4, {
      position: "팀장",
      authority: AUTHORITY.LEADER,
      isAdmin: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.message).toMatch(/이미 팀장/);
  });

  it("유일한 팀장을 내리지 못한다", async () => {
    const result = await changeMemberGradeAction(2, {
      position: "선임",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.message).toMatch(/후임/);
  });

  it("팀장이 없는 팀에는 승격시킬 수 있다", async () => {
    // 임지안(id 8)은 마케팅팀인데 최유진(id 5)이 팀장이다 — 먼저 팀장을 비우는 대신
    // 팀장이 없는 상황을 만들려면 다른 팀이 필요하다. 여기서는 발급으로 확인한다.
    const result = await issueAccountAction({
      ...DRAFT,
      email: "newlead@zgroup.co.kr",
      teamName: "새로운팀",
      authority: AUTHORITY.LEADER,
    });

    expect(result.issued).toBeTruthy();
  });

  it("이미 팀장이 있는 팀으로는 Leader 계정을 발급하지 못한다", async () => {
    const result = await issueAccountAction({
      ...DRAFT,
      email: "another@zgroup.co.kr",
      teamName: "개발팀",
      authority: AUTHORITY.LEADER,
    });

    expect(result.errors.authority).toBeTruthy();
    expect(result.issued).toBeUndefined();
  });
});

describe("승인 · 반려", () => {
  /*
    ⚠️ 흐름 이름과 끝난 뒤 상태가 다르다 — 휴직은 `VACATION`, 오프보딩은 `RESIGNED`다
       (§도메인 상수: 오프보딩 ↔ 퇴사).
  */
  /*
    ⚠️ **일반 팀원 신청은 팀장 중간 승인이 끝나야 최종 승인할 수 있다** — `WAITING_ID`(이하윤)는
       `/team/handover`가 처리해야 하는 데모 대상이라 `midApproval`이 `null`로 시작한다.
       그래서 여기서 먼저 중간 승인을 흉내 낸다(`completeMockHandoverMidApproval`).
  */
  it("중간 승인 전에는 최종 승인을 막는다", async () => {
    const result = await approveHandoverAction(WAITING_ID);
    expect(result.isSuccess).toBe(false);
    expect(findMockManagedMember(WAITING_ID)?.pendingHandover).not.toBeNull();
  });

  it("휴직을 승인하면 휴직 상태가 되고 신청이 사라진다", async () => {
    completeMockHandoverMidApproval(WAITING_ID, "김서준", "2026-08-08");

    expect(await approveHandoverAction(WAITING_ID)).toEqual({ isSuccess: true });

    const after = findMockManagedMember(WAITING_ID);
    expect(after?.member.status).toBe(MEMBER_STATUS.VACATION);
    expect(after?.pendingHandover).toBeNull();
  });

  /*
    ⚠️ **`RESIGNED`가 아니라 즉시 소프트 삭제된다**(2026-08-14 정정). BE가 최종 승인
       시점에 그 자리에서 `deleted_at`을 찍어 이후 모든 조회에서 빠지는 걸로 재확인됐다 —
       목도 같은 동작을 흉내내야 `getManagedMember`(§isVisibleMemberStatus)가 실제로
       이 사람을 숨긴다. `RESIGNED`로만 바꾸고 남겨 두면 절대 안 오는 상태가 화면에
       계속 보이고, 직급·권한 폼의 잠금(`gradeLockOf`)도 더는 걸리지 않아 지워진 계정을
       권한만으로 다시 만질 수 있는 구멍이 생긴다.
  */
  it("오프보딩을 승인하면 즉시 소프트 삭제된다", async () => {
    await approveHandoverAction(8);

    expect(findMockManagedMember(8)?.member.status).toBe(DELETED_MEMBER_STATUS);
    /*
      ⚠️ **내부 저장값만 보면 안 된다**(CodeRabbit 지적, 2026-08-14). `findMockManagedMember`는
         소프트 삭제된 레코드도 그대로 돌려주는 raw lookup이라, 실제로 목록에서 빠지는지는
         `listMockManagedMembers()`(=`isVisibleMemberStatus`가 거르는 자리)로 따로 확인해야 한다.
    */
    expect(listMockManagedMembers().some((member) => member.id === 8)).toBe(false);
  });

  /*
    ⚠️ **지워진 계정에 권한을 다시 얹을 수 있던 구멍**(2026-08-14 재발견 — `gradeLockOf`가
       퇴사자 분기를 지운 근거는 "그 사람이 이 화면에 다시 올 길이 없다"였는데, 즉시 소프트
       삭제로 정정하기 전까지는 목이 `RESIGNED`로만 바꾸고 그대로 남겨 둬서 실제로 다시 올
       수 있었다). `getManagedMember`가 `isVisibleMemberStatus`로 걸러 `null`을 돌려주는
       지금은 이 자리에서 먼저 막혀야 한다 — `gradeLockOf`까지 갈 필요조차 없다.
  */
  it("최종 승인 직후 그 계정은 직급·권한을 더 못 바꾼다", async () => {
    await approveHandoverAction(8);

    const result = await changeMemberGradeAction(8, {
      position: "사원",
      authority: AUTHORITY.LEADER,
      isAdmin: true,
    });

    expect(result).toEqual({ isSuccess: false, message: "없는 사원입니다" });
  });

  it("반려하면 재직으로 돌아가고 신청이 사라진다", async () => {
    expect(await rejectHandoverAction(WAITING_ID, "인계가 빠졌습니다")).toEqual({
      isSuccess: true,
    });

    const after = findMockManagedMember(WAITING_ID);
    expect(after?.member.status).toBe(MEMBER_STATUS.ACTIVE);
    expect(after?.pendingHandover).toBeNull();
  });

  /* ⚠️ 사유 없이 되돌리면 신청한 사람은 무엇을 고쳐 다시 낼지 알 수 없다 */
  it("사유 없는 반려는 막는다", async () => {
    expect(await rejectHandoverAction(WAITING_ID, "   ")).toMatchObject({ isSuccess: false });
    expect(findMockManagedMember(WAITING_ID)?.pendingHandover).not.toBeNull();
  });

  /* ⚠️ 화면이 보낸 id만 믿으면 이미 처리된 건을 두 번 승인한다 */
  it("기다리는 신청이 없으면 막는다", async () => {
    expect(await approveHandoverAction(4)).toMatchObject({ isSuccess: false });
    expect(await rejectHandoverAction(4, "사유")).toMatchObject({ isSuccess: false });
  });
});

describe("issueAccountAction", () => {
  it("발급하면 목록에 붙고 목록 경로를 다시 읽는다", async () => {
    const result = await issueAccountAction(DRAFT);

    expect(result.issued).toBeTruthy();
    expect(result.issued?.name).toBe("신입");
    expect(findMockManagedMember(result.issued!.id)?.member.email).toBe(DRAFT.email);
    expect(revalidatePathMock).toHaveBeenCalledWith("/manage/members");
  });

  /* ⚠️ 같은 메일에 두 계정이 붙으면 첫 비밀번호가 어디로 갈지 알 수 없다 */
  it("이미 쓰는 메일은 칸 오류로 돌려준다", async () => {
    const result = await issueAccountAction({ ...DRAFT, email: "hayun@zgroup.co.kr" });

    expect(result.errors.email).toBeTruthy();
    expect(result.issued).toBeUndefined();
  });

  it("검증에 걸리면 발급도 재검증도 없다", async () => {
    const result = await issueAccountAction({ ...DRAFT, name: "" });

    expect(result.errors.name).toBeTruthy();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  /* ⚠️ 역할은 발급 때 안 정한다 — 팀에 들어간 뒤 팀장이 붙이는 라벨이다(WORKFLOW §9) */
  it("새 계정은 역할 없이 재직으로 들어간다", async () => {
    const result = await issueAccountAction(DRAFT);

    // ⚠️ 먼저 발급됐는지 본다 — 아니면 아래에서 `!`가 터져 진짜 원인이 가려진다
    expect(result.issued).toBeTruthy();

    const created = findMockManagedMember(result.issued!.id)?.member;

    expect(created?.roleLabel).toBeNull();
    expect(created?.status).toBe(MEMBER_STATUS.ACTIVE);
    expect(created?.isAdmin).toBe(false);
  });
});

/*
  ⚠️ 발급 창에 관리자 겸직 토글을 붙였다(온보딩 초대 줄과 같은 자리). 켜서 내면 그 값이
     실제로 계정에 붙어야 한다 — 화면만 켜지고 발급이 무시하면 아무도 모르게 어긋난다.
*/
describe("계정 발급 — 관리자 겸직", () => {
  it("겸직을 켜서 내면 그 계정이 겸직으로 만들어진다", async () => {
    const result = await issueAccountAction({
      ...DRAFT,
      name: "겸직",
      email: "admin-new@company.com",
      isAdmin: true,
    });

    expect(result.issued).toBeDefined();
    expect(findMockManagedMember(result.issued!.id)?.member.isAdmin).toBe(true);
  });

  it("안 켜면 겸직이 아니다 — 기본은 꺼짐이다", async () => {
    const result = await issueAccountAction({
      ...DRAFT,
      name: "일반",
      email: "plain-new@company.com",
      isAdmin: false,
    });

    // ⚠️ 먼저 발급됐는지 본다 — 아니면 아래에서 `!`가 터져 진짜 원인이 가려진다
    expect(result.issued).toBeTruthy();
    expect(findMockManagedMember(result.issued!.id)?.member.isAdmin).toBe(false);
  });
});

describe("fetchMembersPageAction — 목록 페이지", () => {
  /*
    ⚠️ **서버가 거르고 자른다.** 전부 받아 화면에서 `slice`하면 사원이 수백 명일 때 그
       수백을 다 받아 온다(CLAUDE.md §목록·페이지네이션).
  */
  it("조건에 맞는 전체 수를 함께 준다 — 화면에 그린 줄 수가 아니다", async () => {
    const all = await fetchMembersPageAction({ keyword: "", filter: MEMBER_FILTER.ALL }, 0);

    expect(all.totalCount).toBeGreaterThan(0);
    expect(all.items.length).toBeLessThanOrEqual(all.totalCount);
  });

  it("검색어를 서버가 건다", async () => {
    const found = await fetchMembersPageAction({ keyword: "김서준", filter: MEMBER_FILTER.ALL }, 0);

    expect(found.items).toHaveLength(1);
    expect(found.totalCount).toBe(1);
  });

  it("승인 대기 필터가 휴직과 오프보딩을 가른다", async () => {
    const vacation = await fetchMembersPageAction(
      { keyword: "", filter: MEMBER_FILTER.VACATION_PENDING },
      0,
    );
    const offboarding = await fetchMembersPageAction(
      { keyword: "", filter: MEMBER_FILTER.OFFBOARDING_PENDING },
      0,
    );

    expect(vacation.items.every((member) => member.pendingHandoverType === "VACATION")).toBe(true);
    expect(offboarding.items.every((member) => member.pendingHandoverType === "OFFBOARDING")).toBe(
      true,
    );
    expect(vacation.items).not.toHaveLength(0);
    expect(offboarding.items).not.toHaveLength(0);
  });

  /*
    ⚠️ 권한 없는 사람이 주소만 알고 불러도 목록이 새지 않는다.
    ⚠️ **빈 페이지가 아니라 실패다.** 빈 결과를 성공으로 돌려주면 화면은 "전체 0명"으로
       바뀌고 조용히 멈춘다 — 던져야 [다시 시도]가 뜬다(§목록 3상태).
  */
  it("권한이 없으면 실패로 알린다", async () => {
    getViewerMock.mockResolvedValue(MEMBER);

    await expect(
      fetchMembersPageAction({ keyword: "", filter: MEMBER_FILTER.ALL }, 0),
    ).rejects.toThrow("사원 목록을 볼 권한이 없습니다");
  });

  it("범위를 벗어난 페이지는 안으로 당긴다", async () => {
    const page = await fetchMembersPageAction({ keyword: "", filter: MEMBER_FILTER.ALL }, 999);

    expect(page.page).toBe(page.totalPages - 1);
  });
});
