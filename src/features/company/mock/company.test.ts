import { AUTHORITY } from "@/constants/domain";

import {
  getMockCompanySetting,
  resetMockCompanySetting,
  updateMockCompanyProfile,
  updateMockPositions,
} from "./company";

/**
 * 목 저장소 — **모듈 수준 상태**라 테스트끼리 값을 물려받는다.
 * ⚠️ 여기서 지키는 건 두 가지다: 기업 코드가 저장에 살아남는가, 그리고 밖으로 나간 값을
 *    누가 주물러도 저장소가 안 흔들리는가.
 */

beforeEach(resetMockCompanySetting);

describe("getMockCompanySetting", () => {
  /*
    ⚠️ **복제본을 준다.** 그대로 내주면 화면이 받은 객체를 고치는 순간 저장소가 같이 바뀌어,
       [저장]을 안 눌러도 값이 남는다 — 목이 실제보다 관대해져서 버그를 가린다.
  */
  it("돌려준 값을 바깥에서 고쳐도 저장소는 그대로다", () => {
    const first = getMockCompanySetting();
    first.profile.name = "훔친이름";
    first.departments.push({ id: "x", name: "몰래", children: [] });

    const second = getMockCompanySetting();

    expect(second.profile.name).not.toBe("훔친이름");
    expect(second.departments.some((team) => team.id === "x")).toBe(false);
  });
});

describe("updateMockCompanyProfile", () => {
  /* ⚠️ 폼에 없는 값이다 — 저장이 지워 버리면 사원이 전부 로그인 못 한다 */
  it("기업 코드는 폼에 없어도 그대로 남는다", () => {
    const before = getMockCompanySetting().profile.code;

    updateMockCompanyProfile({
      name: "새이름",
      businessNumber: "999-88-77777",
      place: { address: "서울", lat: 37.5, lng: 127 },
    });

    const after = getMockCompanySetting().profile;
    expect(after.code).toBe(before);
    expect(after.name).toBe("새이름");
  });
});

describe("resetMockCompanySetting", () => {
  it("저장한 것을 처음 값으로 되돌린다", () => {
    updateMockPositions([{ id: "p9", name: "인턴", role: AUTHORITY.MEMBER }]);
    expect(getMockCompanySetting().positions).toHaveLength(1);

    resetMockCompanySetting();

    expect(getMockCompanySetting().positions.length).toBeGreaterThan(1);
  });
});
