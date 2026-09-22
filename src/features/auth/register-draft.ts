import { z } from "zod";

/**
 * 기업 등록 신청서의 **스키마**와 검증.
 *
 * ⚠️ 타입을 손으로 적지 않고 **스키마에서 파생**한다(`z.infer`). 두 벌을 두면 칸을 하나 더할 때
 *    한쪽만 고쳐 놓고 지나간다.
 * ⚠️ 검증을 컴포넌트 안에 두지 않는다 — 나중에 Server Action에서 **같은 스키마로 다시** 돌려야
 *    한다. 화면 검증은 편의일 뿐이고 판정은 서버가 한다(§권한: 화면 숨김은 보안이 아니다).
 * ⚠️ 사업자등록번호는 **번호만 받는다**(팀 결정). 여기서는 모양만 보고, 살아 있는 회사인지는
 *    BE가 국세청 상태조회로 가린다(폐업·휴업 반려).
 * ⚠️ 그걸로 **신청자가 OWNER인지는 못 가린다.** 사업자등록증 값은 사실상 공개 정보라
 *    아는 사람이면 누구나 통과한다 — 실제 관문은 승인 단계의 사람이다.
 */

/**
 * 지도에서 고른 곳.
 * ⚠️ 지도를 못 쓰는 환경에서는 주소만 직접 적고 좌표가 `0`으로 남는다 — 그래도 통과시킨다.
 *    좌표는 나중에 서버가 다시 찍을 수 있지만, 주소가 없으면 아무것도 못 한다.
 */
export const placeSchema = z.object({
  /*
    ⚠️ 255자는 **BE 제한이다**(`@Size(max = 255)`) — 넘기면 400이다. 카카오맵 도로명 주소는
       이 길이를 안 넘지만, 상세주소를 이어 붙이게 되면 여기서 먼저 걸린다.
       서버가 400으로 답하기 전에 화면이 먼저 말해 주는 게 낫다.
  */
  address: z
    .string()
    .trim()
    .min(1, "회사 위치를 찾아 골라 주세요")
    .max(255, "주소가 너무 깁니다. 255자 이하로 줄여 주세요"),
  lat: z.number(),
  lng: z.number(),
});

export const registerSchema = z.object({
  companyName: z.string().trim().min(1, "기업명을 입력해 주세요"),
  businessNumber: z
    .string()
    .trim()
    .min(1, "사업자등록번호를 입력해 주세요")
    .regex(/^\d{3}-\d{2}-\d{5}$/, "10자리를 모두 입력해 주세요"),
  place: placeSchema.nullable().refine((place) => place !== null, "회사 위치를 찾아 골라 주세요"),
  managerName: z.string().trim().min(1, "담당자 이름을 입력해 주세요"),
  email: z.string().trim().min(1, "이메일을 입력해 주세요").includes("@", {
    message: "이메일 주소를 다시 확인해 주세요",
  }),
  /*
    ⚠️ 연락처는 **필수**다(팀 결정). 메일이 스팸함에 빠지거나 주소를 잘못 적었을 때
       승인 담당자가 연락할 길이 이것뿐이다 — 없으면 신청이 그대로 묻힌다.
    ⚠️ 자릿수만 본다 — 하이픈 유무·국번 길이는 회사마다 달라 조이면 멀쩡한 번호가 걸린다.
  */
  phone: z
    .string()
    .trim()
    .min(1, "연락처를 입력해 주세요")
    .regex(/^[\d-]{9,15}$/, "연락처를 다시 확인해 주세요")
    /*
      ⚠️ 모양만 보면 하이픈 아홉 개(`---------`)도 통과한다. 연락처는 메일이 안 닿을 때
         승인 담당자가 연락할 **유일한 길**이라 숫자가 몇 개인지도 같이 센다.
    */
    .refine((value) => value.replace(/\D/g, "").length >= 9, "연락처를 다시 확인해 주세요"),
});

/**
 * 작성 중인 신청서.
 * ⚠️ `z.infer`(=출력)가 아니라 **`z.input`** 이다. 위치는 검증을 통과해야 값이 있는 게 확정되는데,
 *    폼은 아직 안 고른 상태(`null`)를 들고 있어야 한다 — 출력 타입을 쓰면 빈 폼을 만들 수 없다.
 */
export type RegisterDraft = z.input<typeof registerSchema>;
export type PickedPlace = z.infer<typeof placeSchema>;
export type RegisterErrors = Partial<Record<keyof RegisterDraft, string>>;

/**
 * 지도에 꽂을 좌표가 실제로 있는지.
 *
 * ⚠️ **`0,0`은 좌표가 아니라 "지도를 못 썼다"는 표기다**(키 없음·SDK 차단 — 위 `placeSchema`
 *    주석). 기니만 앞바다라 그대로 믿으면 **맞는 주소 아래에 틀린 핀**이 꽂힌다.
 * ⚠️ **보내는 쪽과 그리는 쪽이 같은 판정을 쓴다.** 저장에서만 걸렀더니 좌표 없는 회사의
 *    기업 설정 화면이 0,0에 핀을 꽂았다 — 없는 걸 있는 것처럼 그리지 않는다(§정직성).
 */
export function hasPinnedCoords(place: PickedPlace | null): place is PickedPlace {
  return place !== null && (place.lat !== 0 || place.lng !== 0);
}

/**
 * 화면이 쓰는 모양(칸별 오류 한 줄)으로 옮긴다.
 *
 * ⚠️ `parse`가 아니라 `safeParse`다 — 검증 실패는 예외가 아니라 **정상적인 결과**다.
 * ⚠️ 한 칸에 오류가 여러 개 나와도 **첫 줄만** 쓴다. 빈 칸이면 "입력해 주세요"와 "형식이
 *    틀렸어요"가 같이 나오는데, 아직 아무것도 안 적은 사람에게 형식 얘기는 소음이다.
 */
export function validateRegister(draft: RegisterDraft): RegisterErrors {
  const result = registerSchema.safeParse(draft);
  if (result.success) return {};

  const errors: RegisterErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RegisterDraft | undefined;
    if (field && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}
