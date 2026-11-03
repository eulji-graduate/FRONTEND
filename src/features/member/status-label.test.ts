import { HANDOVER_TYPE } from "@/constants/handover";
import { MEMBER_STATUS } from "@/constants/member";

import { memberStatusLabel } from "./status-label";

describe("memberStatusLabel", () => {
  it("휴직 신청 대기는 '휴직 대기'다", () => {
    expect(memberStatusLabel(MEMBER_STATUS.WAITING, HANDOVER_TYPE.VACATION)).toBe("휴직 대기");
  });

  it("오프보딩 신청 대기는 '오프보딩 대기'다", () => {
    expect(memberStatusLabel(MEMBER_STATUS.WAITING, HANDOVER_TYPE.OFFBOARDING)).toBe(
      "오프보딩 대기",
    );
  });

  it("종류를 모르면 예전처럼 '대기'만 쓴다", () => {
    expect(memberStatusLabel(MEMBER_STATUS.WAITING, null)).toBe("대기");
    expect(memberStatusLabel(MEMBER_STATUS.WAITING, undefined)).toBe("대기");
  });

  it("대기가 아니면 종류가 있어도 상태 라벨 그대로다", () => {
    expect(memberStatusLabel(MEMBER_STATUS.ACTIVE, HANDOVER_TYPE.VACATION)).toBe("재직");
  });
});
