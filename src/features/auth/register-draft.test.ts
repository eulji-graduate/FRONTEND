import { hasPinnedCoords, type RegisterDraft, validateRegister } from "./register-draft";

/**
 * 기업 등록 신청서 검증.
 *
 * ⚠️ 이 함수는 나중에 **Server Action에서도 같은 것을 돌린다**(화면 검증은 편의일 뿐이다).
 *    그래서 컴포넌트가 아니라 여기서 직접 검사한다.
 */
const FILLED: RegisterDraft = {
  companyName: "노바랩스",
  businessNumber: "123-45-67890",
  managerName: "홍길동",
  email: "owner@nova.com",
  phone: "010-1234-5678",
  place: { address: "경기 성남시 수정구 산성대로 553", lat: 37.44, lng: 127.14 },
};

describe("validateRegister", () => {
  it("다 채우면 오류가 없다", () => {
    expect(validateRegister(FILLED)).toEqual({});
  });

  it("빈 신청서는 필수 항목을 전부 잡아낸다", () => {
    const errors = validateRegister({
      companyName: "",
      businessNumber: "",
      managerName: "",
      email: "",
      phone: "",
      place: null,
    });

    expect(Object.keys(errors).sort()).toEqual(
      ["businessNumber", "companyName", "email", "managerName", "phone", "place"].sort(),
    );
  });

  it("공백만 넣은 것은 빈 것으로 본다", () => {
    expect(validateRegister({ ...FILLED, companyName: "   " }).companyName).toBeDefined();
  });

  it("사업자등록번호는 10자리를 다 채워야 한다", () => {
    expect(validateRegister({ ...FILLED, businessNumber: "123-45" }).businessNumber).toBeDefined();
    expect(
      validateRegister({ ...FILLED, businessNumber: "1234567890" }).businessNumber,
    ).toBeDefined();
  });

  it("이메일은 @가 있어야 한다", () => {
    expect(validateRegister({ ...FILLED, email: "owner" }).email).toBeDefined();
  });

  // 연락처는 **필수**다 — 메일이 안 닿을 때 승인 담당자가 연락할 유일한 길이라 팀에서 그렇게 정했다
  it("연락처를 비우면 잡아낸다", () => {
    expect(validateRegister({ ...FILLED, phone: "" }).phone).toBeDefined();
  });

  it("연락처는 숫자·하이픈만 받는다", () => {
    expect(validateRegister({ ...FILLED, phone: "010-1234-오공육칠" }).phone).toBeDefined();
    expect(validateRegister({ ...FILLED, phone: "01012345678" }).phone).toBeUndefined();
  });

  // 지도를 못 써서 직접 입력한 경우 좌표가 0이지만 주소는 있다 — 이건 통과해야 한다
  it("좌표가 없어도 주소만 있으면 통과한다", () => {
    const typed = { ...FILLED, place: { address: "서울 어딘가", lat: 0, lng: 0 } };
    expect(validateRegister(typed).place).toBeUndefined();
  });
});

/*
 * ⚠️ 저장(`company/mapper.ts`)과 그리는 쪽(`AddressPicker`)이 **같은 판정**을 써야 한다
 *    (`hasPinnedCoords` 주석) — 저장에서만 0,0을 걸렀더니 화면은 기니만 앞바다에 핀을
 *    그렸다. 판정 자체는 여기서 한 번만 검증하고, 두 호출부는 이 함수를 그대로 쓴다.
 */
describe("hasPinnedCoords — 0,0은 좌표가 아니라 '못 썼다'는 표기다", () => {
  it("0,0이면 못 꽂은 것으로 본다", () => {
    expect(hasPinnedCoords({ address: "서울 어딘가", lat: 0, lng: 0 })).toBe(false);
  });

  it("null이면 애초에 고른 적이 없다", () => {
    expect(hasPinnedCoords(null)).toBe(false);
  });

  it("둘 중 하나만 0이어도 실제 좌표로 본다 — 기니만이 아닌 이상 우연히 0이 될 수 있다", () => {
    expect(hasPinnedCoords({ address: "적도 어딘가", lat: 0, lng: 127 })).toBe(true);
  });

  it("실제 좌표는 꽂힌 것으로 본다", () => {
    expect(hasPinnedCoords({ address: "서울 강남구", lat: 37.5, lng: 127 })).toBe(true);
  });
});
