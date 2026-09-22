import {
  DELETED_MEMBER_STATUS,
  isVisibleMemberStatus,
  MEMBER_STATUS,
  MEMBER_STATUS_LABEL,
} from "./member";

/**
 * 상태 목록이 지키는 것 — **`DELETED`는 상태가 아니다.**
 * 목록에 끼어들면 필터에 칸이 하나 늘고, 안 걸러지면 빈 뱃지가 뜬다.
 */
describe("회원 상태", () => {
  it("화면에 보이는 넷이 전부다", () => {
    expect(Object.keys(MEMBER_STATUS)).toEqual(["ACTIVE", "VACATION", "WAITING", "RESIGNED"]);
  });

  /* ⚠️ 라벨을 **값까지** 못 박는다. 비어 있지 않은지만 보면 잘못 옮긴 한글도 통과한다 */
  it("네 상태의 한글 라벨이 정해져 있다", () => {
    expect(MEMBER_STATUS_LABEL).toEqual({
      ACTIVE: "재직",
      VACATION: "휴직",
      WAITING: "대기",
      RESIGNED: "퇴사",
    });
  });

  it("네 상태 모두 목록에 남는다 — 퇴사도 그 사람이 남긴 기록의 출처다", () => {
    for (const status of Object.values(MEMBER_STATUS)) {
      expect(isVisibleMemberStatus(status)).toBe(true);
    }
  });

  it("소프트 딜리트는 거른다 — 상태가 아니라 목록에서 빠지는 일이다", () => {
    expect(isVisibleMemberStatus(DELETED_MEMBER_STATUS)).toBe(false);
    expect(Object.values(MEMBER_STATUS)).not.toContain(DELETED_MEMBER_STATUS);
  });

  it.each(["ON_LEAVE", "UNKNOWN", "", "active"])(
    "모르는 값 `%s`는 거른다 — 이름 없는 뱃지보다 빠진 줄이 낫다",
    (value) => {
      expect(isVisibleMemberStatus(value)).toBe(false);
    },
  );
});
