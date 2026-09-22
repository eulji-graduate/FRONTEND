import { AUTHORITY } from "@/constants/authority";
import { HANDOVER_TYPE } from "@/constants/handover";
import { MEMBER_STATUS } from "@/constants/member";

import { filterMembers, searchMembers } from "./manage-filter";
import { type ManagedMember, MEMBER_FILTER } from "./manage-types";

/** 목록을 추리는 순수 함수 — 화면 밖에서 지킨다. */

function member(over: Partial<ManagedMember> & Pick<ManagedMember, "id" | "name">): ManagedMember {
  return {
    email: `${over.id}@zgroup.co.kr`,
    teamName: "개발팀",
    position: "사원",
    authority: AUTHORITY.MEMBER,
    isAdmin: false,
    roleLabel: null,
    status: MEMBER_STATUS.ACTIVE,
    joinedAt: "2024-01-01",
    pendingHandoverType: null,
    ...over,
  };
}

const MEMBERS = [
  member({ id: 1, name: "박대표", teamName: null, email: "ceo@zgroup.co.kr" }),
  member({ id: 2, name: "김서준", authority: AUTHORITY.LEADER }),
  member({
    id: 3,
    name: "이하윤",
    status: MEMBER_STATUS.WAITING,
    pendingHandoverType: HANDOVER_TYPE.VACATION,
  }),
  member({
    id: 4,
    name: "임지안",
    teamName: "마케팅팀",
    status: MEMBER_STATUS.WAITING,
    pendingHandoverType: HANDOVER_TYPE.OFFBOARDING,
  }),
];

describe("searchMembers", () => {
  it("이름으로 찾는다", () => {
    expect(searchMembers(MEMBERS, "김서준").map((m) => m.id)).toEqual([2]);
  });

  it("팀으로 찾는다", () => {
    expect(searchMembers(MEMBERS, "마케팅").map((m) => m.id)).toEqual([4]);
  });

  it("이메일로 찾는다 — 대소문자를 가리지 않는다", () => {
    expect(searchMembers(MEMBERS, "CEO@").map((m) => m.id)).toEqual([1]);
  });

  /*
    ⚠️ **직급·역할은 안 본다.** 넣으면 "사원"으로 검색했을 때 직급이 사원인 사람이 다 걸려
       검색이 소용없어진다(칸 안내문도 이름·팀·이메일이라고 적혀 있다).
  */
  it("직급으로는 안 찾는다", () => {
    expect(searchMembers(MEMBERS, "사원")).toHaveLength(0);
  });

  /* ⚠️ Owner는 `teamName`이 `null`이다 — 걸러 내는 코드가 없으면 여기서 터진다 */
  it("팀이 없는 사람(Owner) 때문에 터지지 않는다", () => {
    expect(searchMembers(MEMBERS, "개발").map((m) => m.id)).toEqual([2, 3]);
  });

  it("빈 검색어는 전부 돌려준다 — 공백만 적어도 같다", () => {
    expect(searchMembers(MEMBERS, "   ")).toHaveLength(4);
  });
});

describe("filterMembers", () => {
  it("전체는 그대로 둔다", () => {
    expect(filterMembers(MEMBERS, MEMBER_FILTER.ALL)).toHaveLength(4);
  });

  /*
    ⚠️ **상태만 보면 안 된다.** 휴직 대기와 오프보딩 대기는 사람 상태가 둘 다 `WAITING`이라,
       신청 종류를 함께 봐야 갈린다.
  */
  it("휴직 대기와 오프보딩 대기를 가른다", () => {
    expect(filterMembers(MEMBERS, MEMBER_FILTER.VACATION_PENDING).map((m) => m.id)).toEqual([3]);
    expect(filterMembers(MEMBERS, MEMBER_FILTER.OFFBOARDING_PENDING).map((m) => m.id)).toEqual([4]);
  });

  /* ⚠️ 종류만 보면 이미 처리된 옛 신청까지 걸린다 — 상태도 함께 본다 */
  it("대기 상태가 아니면 신청 종류가 남아 있어도 안 걸린다", () => {
    const stale = [member({ id: 9, name: "옛신청", pendingHandoverType: HANDOVER_TYPE.VACATION })];

    expect(filterMembers(stale, MEMBER_FILTER.VACATION_PENDING)).toHaveLength(0);
  });
});
