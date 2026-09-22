/**
 * 기업 설정 화면의 말.
 *
 * ⚠️ 화면에 적는 말은 **여기 한 곳**에만 둔다(§도메인 상수: 라벨 하드코딩 금지).
 *    카드 제목과 칸 이름이 컴포넌트에 흩어지면 같은 것을 두 이름으로 부르게 된다.
 * ⚠️ 칸 이름은 **기업 등록 신청 화면과 같은 말**이다(`기업명`·`회사 위치`). 신청 때
 *    적은 값을 여기서 고치는 건데 이름이 다르면 다른 값처럼 읽힌다.
 */

export const COMPANY_SECTION_TITLE = {
  PROFILE: "기본 정보",
  TEAM: "팀 체계",
  POSITION: "직급·권한",
} as const;

export const COMPANY_FIELD_LABEL = {
  NAME: "기업명",
  BUSINESS_NUMBER: "사업자등록번호",
  PLACE: "회사 위치",
  CODE: "기업 코드",
} as const;
