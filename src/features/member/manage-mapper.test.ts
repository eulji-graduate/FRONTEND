import { ACTION_STATUS } from "@/constants/domain";
import { HANDOVER_TYPE } from "@/constants/handover";

import {
  type BeCompanyAction,
  type BeMemberListItem,
  toManagedMember,
  toManagedMemberAction,
} from "./manage-mapper";

/**
 * 사원 상세 담당 액션 매퍼 — `GET /api/company/actions` → 화면 계약.
 * ⚠️ 실서버 호출은 여기서 못 돈다(세션·BE 필요). 경로·권한·파라미터는 `manage-server.ts`의
 *    [확인] 주석이 BE `CompanyActionController`와 대조한다 — 여기서는 **옮겨 담는 규칙**만 본다.
 */

const beAction: BeCompanyAction = {
  id: 42,
  title: "굿즈 시안 2차 검토",
  status: ACTION_STATUS.IN_PROGRESS,
  dueDate: "2026-08-20",
};

describe("담당 액션 매퍼 (toManagedMemberAction)", () => {
  it("id를 문자열로 바꿔 화면 계약에 맞춘다", () => {
    expect(toManagedMemberAction(beAction)).toEqual({
      id: "42",
      title: "굿즈 시안 2차 검토",
      status: ACTION_STATUS.IN_PROGRESS,
      dueDate: "2026-08-20",
    });
  });

  /*
    ⚠️ **`isDelayed`를 옮겨 담지 않는다.** BE도 저장값이 아니라 조회 시점에 계산해 주는데,
       화면은 이미 마감일에서 계산한다(§도메인 상수: 파생값은 상태 필드에 안 넣는다).
       둘 다 들고 있으면 자정 무렵에 서버 시각과 브라우저 시각이 갈려 배지가 서로 다른
       말을 한다 — 계약에 아예 안 실어야 나중에 누가 그 값을 쓰지 않는다.
  */
  it("지연 여부는 계약에 싣지 않는다 — 화면이 마감일로 계산한다", () => {
    const mapped = toManagedMemberAction({ ...beAction, dueDate: "2020-01-01" });

    expect(Object.keys(mapped).sort()).toEqual(["dueDate", "id", "status", "title"]);
  });

  // 상태는 저장값 셋 그대로 흘린다 — 라벨로 바꾸는 일은 화면이 한다(라벨 하드코딩 금지).
  it("상태 상수를 그대로 넘긴다", () => {
    expect(toManagedMemberAction({ ...beAction, status: ACTION_STATUS.DONE }).status).toBe(
      ACTION_STATUS.DONE,
    );
  });
});

const BE_MEMBER: BeMemberListItem = {
  memberId: 4,
  name: "박도현",
  teamName: "개발팀",
  positionName: "사원",
  role: "MEMBER",
  isAdmin: false,
  roleLabel: null,
  workStatus: "ACTIVE",
  joinedOn: "2023-01-15",
};

/**
 * ⚠️ **BE의 시스템 값 `없음`도 `null`로 되돌인다**(2026-08-14 재발견) — 이 정규화 없이는
 *    "역할이 없다"는 두 가지 다른 모양(빈 문자열 · 문자열 `없음`)으로 온다.
 */
describe("toManagedMember — roleLabel 정규화", () => {
  it("BE의 시스템 값 `없음`은 `null`로 되돌린다", () => {
    expect(toManagedMember({ ...BE_MEMBER, roleLabel: "없음" }).roleLabel).toBeNull();
  });

  it("빈 문자열·공백뿐인 문자열도 `null`이다", () => {
    expect(toManagedMember({ ...BE_MEMBER, roleLabel: "" }).roleLabel).toBeNull();
    expect(toManagedMember({ ...BE_MEMBER, roleLabel: "   " }).roleLabel).toBeNull();
  });

  it("실제 역할 이름은 그대로 옮긴다", () => {
    expect(toManagedMember({ ...BE_MEMBER, roleLabel: "프론트엔드" }).roleLabel).toBe("프론트엔드");
  });
});

/**
 * ⚠️ **목록 응답이 대기 신청 종류를 준다**(BE PR #9, 값은 `WAITING`일 때만). `VACATION` ·
 *    `OFFBOARDING`이면 그 상수로, 그 밖이면 `null`로 옮긴다 — 라벨을 찾는 쪽이 모르는 값에
 *    `undefined`를 받지 않게 하고, 틀린 종류를 말하지 않으려는 것이다(§정직성).
 */
describe("toManagedMember — pendingHandoverType", () => {
  const waiting = { ...BE_MEMBER, workStatus: "WAITING" };

  it("휴직 대기는 `VACATION`으로 옮긴다", () => {
    expect(
      toManagedMember({ ...waiting, pendingHandoverType: "VACATION" }).pendingHandoverType,
    ).toBe(HANDOVER_TYPE.VACATION);
  });

  it("오프보딩 대기는 `OFFBOARDING`으로 옮긴다", () => {
    expect(
      toManagedMember({ ...waiting, pendingHandoverType: "OFFBOARDING" }).pendingHandoverType,
    ).toBe(HANDOVER_TYPE.OFFBOARDING);
  });

  it("대기 신청이 없으면(`null`) `null`이다", () => {
    expect(
      toManagedMember({ ...BE_MEMBER, pendingHandoverType: null }).pendingHandoverType,
    ).toBeNull();
  });

  it("필드 자체가 안 와도(BE 배포 전, `undefined`) 깨지지 않고 `null`이다", () => {
    expect(toManagedMember(BE_MEMBER).pendingHandoverType).toBeNull();
  });

  it("모르는 값은 `null`이다 — 틀린 종류를 말하지 않는다", () => {
    expect(
      toManagedMember({ ...waiting, pendingHandoverType: "RESIGN" }).pendingHandoverType,
    ).toBeNull();
    expect(toManagedMember({ ...waiting, pendingHandoverType: "" }).pendingHandoverType).toBeNull();
  });

  it("상태는 그대로 `WAITING`이다 — 종류를 읽어도 다른 값을 건드리지 않는다", () => {
    expect(toManagedMember({ ...waiting, pendingHandoverType: "VACATION" }).status).toBe("WAITING");
  });
});
