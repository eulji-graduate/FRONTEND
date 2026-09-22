/**
 * 날짜 공용 도구.
 *
 * ⚠️ **오늘이 언제인지는 서버가 정한다.** 클라이언트 컴포넌트에서 `new Date()`를 부르면
 *    서버 렌더와 브라우저 렌더가 날짜 경계에서 갈려 하이드레이션이 어긋난다 —
 *    서버 컴포넌트가 이 함수로 구한 값을 props로 내려보낸다(CLAUDE.md §서버우선).
 */

/** 화면 표기의 기준 시간대. 사내 도구라 사용자도 서버도 한국 시간으로 읽는다 */
const TIME_ZONE = "Asia/Seoul";

/**
 * 한국 시간 기준 오늘 `YYYY-MM-DD`.
 *
 * ⚠️ `new Date().toISOString().slice(0, 10)`을 쓰지 않는다 — 그건 **UTC 날짜**라
 *    한국 시간 오전 0~9시 사이에는 **하루 전 날짜**가 나온다. `오늘`·`어제` 같은 표기가
 *    걸린 자리에서는 그대로 틀린 말이 된다.
 * ⚠️ `en-CA` 로케일이 `YYYY-MM-DD`를 준다 — 조각을 손으로 이어 붙이는 것보다 안전하다.
 */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/**
 * `YYYY-MM-DD`를 연·월·일로 가른다. 읽을 수 없으면 `null`.
 *
 * ⚠️ **형식만 보지 않는다.** `2026-02-30`은 정규식을 통과하지만 없는 날이고, `Date`에 넣으면
 *    조용히 3월 2일로 굴러간다. `Date.UTC`로 만들어 되돌려 확인해 걸러낸다.
 * ⚠️ **검증은 여기 한 곳이다.** 전에는 표기 함수(`formatMonthDayWeekday`)에만 있어서
 *    `formatElapsed`가 그 문을 안 거쳤다 — 같은 값을 두고 한 셀의 본문은 `5개월 전`을
 *    지어내고 툴팁은 원문 `2026-02-30`을 보여줬다. 날짜를 읽는 문이 하나여야 말이 갈리지 않는다.
 */
function parseIsoDate(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }

  return { y, m, d };
}

/** 화면에 날짜로 내보낼 수 있는 값인지 — 아니면 부르는 쪽이 물러설 자리를 정한다 */
export function isReadableDate(iso: string): boolean {
  return parseIsoDate(iso) !== null;
}

/**
 * 두 날짜 사이의 **일수**. `to`가 `from`보다 앞이면 음수.
 *
 * ⚠️ `new Date(iso)`로 파싱하지 않는다 — `"2026-05-03"`은 UTC 자정으로 읽혀 지역
 *    시간대에 따라 하루가 밀린다. 조각을 갈라 `Date.UTC`로만 센다.
 */
function daysBetween(from: string, to: string): number | null {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (!a || !b) return null;

  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  return Math.round(ms / 86_400_000);
}

/**
 * 달 수 차이 — **달력 기준**이다.
 *
 * ⚠️ `일수 / 30`으로 세지 않는다. 364일이 `12개월 전`이 되어 `1년 전`과 겹친다.
 *    같은 달 안이면 0, 날짜가 아직 안 지났으면 한 달을 뺀다(3월 31일 → 4월 1일은 0개월).
 */
function monthsBetween(from: string, to: string): number | null {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (!a || !b) return null;

  const months = (b.y - a.y) * 12 + (b.m - a.m);
  return b.d < a.d ? months - 1 : months;
}

/**
 * 얼마나 지났는지 — `오늘` · `어제` · `5일 전` · `3주 전` · `4개월 전` · `2년 전`.
 *
 * ⚠️ **정확한 날짜를 대신하지 않는다.** 부르는 쪽이 절대 날짜를 `title`·`dateTime`으로
 *    함께 남겨야 한다 — 상대 표기는 감을 주는 것이고, 정확한 값이 필요한 사람도 있다.
 * ⚠️ **미래 날짜에는 `null`을 준다.** 시계가 어긋났거나 BE 값이 이상한 경우인데,
 *    `-3일 전` 같은 말을 지어내느니 부르는 쪽이 절대 날짜로 물러서는 게 낫다(§정직성).
 * ⚠️ 주는 4주까지만 쓴다(`1~4주 전`). 그 위는 달로 넘어가야 `7주 전`처럼 세기 힘든
 *    표기가 안 나온다.
 */
export function formatElapsed(iso: string, today: string): string | null {
  const days = daysBetween(iso, today);
  if (days === null || days < 0) return null;

  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;

  const months = monthsBetween(iso, today);
  if (months === null) return null;
  if (months < 12) return `${Math.max(1, months)}개월 전`;

  return `${Math.floor(months / 12)}년 전`;
}

/** 요일 라벨 — `Date.getUTCDay()` 인덱스(0=일)와 짝. */
const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * `2026-09-05` → `9월 5일(토)`. 형식이 아니면 `null`.
 *
 * ⚠️ 요일도 `toLocaleDateString` 대신 `Date.UTC`로 구한다 — 로케일·시간대에 흔들리지 않게
 *    (§렌더링: 서버·클라 표기가 갈리면 하이드레이션이 어긋난다). 카피 규칙 `8월 5일(수)`.
 * ⚠️ 없는 날짜는 `parseIsoDate`가 이미 걸렀다 — 여기서 다시 보지 않는다.
 */
export function formatMonthDayWeekday(iso: string): string | null {
  const d = parseIsoDate(iso);
  if (!d) return null;

  const date = new Date(Date.UTC(d.y, d.m - 1, d.d));
  const weekday = WEEKDAY_LABEL[date.getUTCDay()] ?? "";
  return `${d.m}월 ${d.d}일(${weekday})`;
}

/**
 * 화면 표기 — `2026-05-03` → `5월 3일(일)`(CLAUDE.md §카피).
 *
 * ⚠️ **ISO 문자열을 화면에 그대로 찍지 않는다.** `2026-09-01`은 개발자용 표기다 —
 *    구독 해지 창이 실제로 그러고 있어서 읽는 사람이 날짜를 한 번 더 해석해야 했다.
 * ⚠️ **해를 넘길 수 있는 값에는 쓰지 않는다.** 결제 주기(`12월 1일 ~ 1월 1일`)처럼 앞뒤로
 *    해가 갈리는 자리에서는 어느 해인지 알 수 없다 — `formatFullDate`를 쓴다.
 * ⚠️ 형식이 아니거나 없는 날짜면(`2026-02-30`) **원문을 그대로** 돌려준다 —
 *    지어내는 것보다 낫다. 판정은 `parseIsoDate` 한 곳이 한다.
 */
export function formatDate(iso: string): string {
  return formatMonthDayWeekday(iso) ?? iso;
}

/**
 * 올해가 아니면 연도를 붙인다 — `2025년 12월 3일(수)`.
 *
 * ⚠️ **올해 날짜에는 안 붙인다.** 대부분이 올해라 매 줄에 `2026년`이 붙으면 목록이
 *    시끄러워지고 정작 옛 날짜가 안 튄다.
 * ⚠️ 기준 연도를 **인자로 받는다.** 여기서 `new Date()`를 부르면 서버 렌더와 브라우저
 *    렌더가 해가 바뀌는 순간 갈려 하이드레이션이 어긋난다.
 */
export function formatDateWithYear(iso: string, currentYear: number): string {
  const day = formatMonthDayWeekday(iso);
  if (!day) return iso;

  const year = Number(iso.slice(0, 4));
  return year === currentYear ? day : `${year}년 ${day}`;
}

/**
 * `2026년 9월 1일(화)` — **연도를 항상 붙인다.**
 *
 * ⚠️ 결제 주기·다음 결제일·해지 시점처럼 **계약에 걸린 날짜**에 쓴다. 이런 값은 앞뒤로
 *    해가 갈릴 수 있어서(`12월 1일 ~ 1월 1일`) 연도가 없으면 어느 해인지 알 수 없고,
 *    돈이 언제 빠져나가는지를 말하는 자리라 짐작하게 두면 안 된다.
 * ⚠️ `formatDateWithYear`와 달리 **기준 연도를 안 받는다.** 올해든 아니든 늘 붙이므로
 *    서버에서 오늘을 내려보낼 필요가 없다 — 하이드레이션이 어긋날 자리가 없다.
 */
export function formatFullDate(iso: string): string {
  const day = formatMonthDayWeekday(iso);
  if (!day) return iso;

  return `${iso.slice(0, 4)}년 ${day}`;
}

/**
 * `2026년 9월 1일` — **요일 없이.**
 *
 * ⚠️ 요일이 **뜻이 없는 자리**에 쓴다. 입사일·가입일처럼 지나간 날짜는 무슨 요일이었는지가
 *    쓸모없는데, 표에서는 그 세 글자 때문에 칸이 모자라 `2020년 1월 2\n일(목)`처럼 줄이
 *    깨진다 — 요일은 회의·마감처럼 **앞으로 할 일**을 잡을 때만 필요하다.
 * ⚠️ 연도는 늘 붙인다. 입사일은 몇 해 전 값이 흔해서 `1월 2일`만 있으면 언제인지 모른다.
 */
export function formatYearMonthDay(iso: string): string {
  const day = formatMonthDayWeekday(iso);
  if (!day) return iso;

  return `${iso.slice(0, 4)}년 ${day.replace(/\(.\)$/, "")}`;
}
