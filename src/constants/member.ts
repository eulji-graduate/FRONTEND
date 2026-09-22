/**
 * 회원 상태 — **화면에 보이는 셋이 전부**다(2026-08-14 정정 — 퇴사자 목록 잔존 정책 폐기).
 *
 * ⚠️ `WAITING`은 "계정 발급 후 미로그인"이 아니라 **휴직·오프보딩을 신청하고 승인을 기다리는**
 *    상태다. 이름만 보고 온보딩 대기로 읽으면 화면 분기가 틀린다.
 * ⚠️ BE enum과 **이름·값이 같다**(2026-08-05 확정). 휴직은 `VACATION` 하나다 —
 *    한때 `ON_LEAVE`라는 다른 표기가 돌았는데 같은 뜻이었고, `VACATION`으로 정리됐다.
 * ⚠️ **`RESIGNED`는 이제 화면에 안 보인다**(2026-08-14 정정 — BE `MemberJpaEntity.offboard`
 *    확인). 오프보딩 최종 승인 시 BE가 그 자리에서 `deleted_at`을 찍어 그 사람은 이후 모든
 *    조회 응답에서 완전히 빠진다 — `RESIGNED`는 BE 내부 감사 흔적용 상태값일 뿐이다. **목도
 *    같은 규칙을 따른다**(`approveMockHandover`가 오프보딩 승인 즉시 `DELETED_MEMBER_STATUS`로
 *    보낸다) — 목에서 `RESIGNED`를 실제로 만들어 남겨 두면 화면이 절대 안 오는 상태를 계속
 *    그리게 된다.
 *    (예전엔 "나간 사람은 목록에 남는다"였다 — 기록 추적을 이유로 그렇게 정했었는데, BE가
 *    최종 승인 시점에 즉시 소프트 삭제하는 걸로 재확인되며 뒤집혔다. `RESIGNED` 상수 자체는
 *    BE와 이름을 맞추기 위해 남겨 두지만, 이 값을 향한 FE 분기는 전부 죽은 코드다.)
 *
 * 역할·겸직 권한 상수는 `role.ts`에 있다.
 */
export const MEMBER_STATUS = {
  ACTIVE: "ACTIVE",
  VACATION: "VACATION",
  /** 휴직·오프보딩 신청 후 승인 대기 */
  WAITING: "WAITING",
  /**
   * BE 내부 감사 흔적용 — **FE 조회 응답엔 안 실린다**(2026-08-14 정정). 오프보딩 최종
   * 승인 즉시 BE가 소프트 삭제해 이후 모든 조회에서 빠진다 — 목도 `DELETED_MEMBER_STATUS`로
   * 보내 같은 동작을 흉내낸다.
   */
  RESIGNED: "RESIGNED",
} as const;
export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS];

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "재직",
  VACATION: "휴직",
  WAITING: "대기",
  RESIGNED: "퇴사",
};

/**
 * 상태 배지의 생김새 — **색이 아니라 명도로 가른다.**
 *
 * ⚠️ 넷이 전부 같은 테두리 알약이라 `재직`과 `대기`가 글자 말고는 구분이 안 됐다.
 *    목록을 훑을 때 눈에 잡혀야 하는 건 **손이 필요한 줄**(`대기`)인데 가장 조용했다.
 * ⚠️ 그렇다고 색을 쓰지 않는다 — 색으로 알리는 건 에러(빨강)뿐이고, 상태마다 색을 칠하면
 *    목록이 신호등이 된다(§디자인 토큰). 대신 **채움과 진하기**로 층을 만든다:
 *    대기(가장 진함) > 휴직 > 재직 > 퇴사(가장 흐림).
 * ⚠️ `퇴사`는 일부러 가장 흐리다. 나간 사람은 기록의 출처라 목록에 남지만, 지금 다룰
 *    대상은 아니다.
 * ⚠️ 라벨과 **같은 파일에 둔다.** 상태가 하나 늘 때 라벨만 추가하고 생김새를 빠뜨리면
 *    타입이 잡아 준다(`Record<MemberStatus, string>`).
 */
export const MEMBER_STATUS_BADGE_CLASS: Record<MemberStatus, string> = {
  ACTIVE: "border-border text-muted-foreground",
  VACATION: "border-border bg-secondary text-foreground/80",
  WAITING: "border-foreground/35 bg-foreground/[0.06] text-foreground font-medium",
  RESIGNED: "border-border/50 text-muted-foreground/60",
};

/**
 * 소프트 딜리트된 사람이 BE 응답에 실려 오는 값.
 *
 * ⚠️ `MEMBER_STATUS`에 **넣지 않는다.** 상태가 아니라 목록에서 빠지는 일이라,
 *    넣는 순간 상태 필터에 다섯째 칸이 생기고 라벨맵도 한 줄 늘어난다.
 */
export const DELETED_MEMBER_STATUS = "DELETED";

/**
 * 화면에 내보낼 사람인지 — **회원 매퍼가 목록을 만들 때 여기를 지나게 한다.**
 *
 * ⚠️ 거르지 않으면 `MEMBER_STATUS_LABEL[status]`가 `undefined`라 상태 뱃지가 빈칸으로 뜨고,
 *    지운 사람이 사원 목록에 그대로 남는다. "매퍼가 거른다"를 주석으로만 두면 매퍼를 짜는
 *    사람이 그 문장을 못 보고 지나간다 — 부를 수 있는 함수로 둔다.
 * ⚠️ 아는 값이 아니어도 **거른다.** BE에 상태가 하나 늘었을 때 이름 없는 뱃지가 뜨는 것보다
 *    한 줄이 빠지는 편이 낫다 — 빈 뱃지는 아무도 못 알아채지만 빠진 줄은 건수와 안 맞는다.
 */
export function isVisibleMemberStatus(status: string): status is MemberStatus {
  return (Object.values(MEMBER_STATUS) as string[]).includes(status);
}

/**
 * 역할을 안 붙인 사람에게 쓰는 라벨.
 *
 * ⚠️ **빈 값과 같은 뜻이다.** 저장은 `null`, 화면은 이 글자다 — 역할은 안 붙여도 되는
 *    값이라(WORKFLOW §9) 셀렉트에도 이 항목이 있어야 "아직 안 골랐다"와 구분된다.
 * ⚠️ 문자열을 화면에 손으로 적지 않는다 — 표·프로필·발급 창이 같은 값을 쓴다.
 */
export const ROLE_NONE_LABEL = "없음";
