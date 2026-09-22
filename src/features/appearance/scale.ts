/**
 * 화면 배율 — **기기마다 다른 CSS 픽셀 밀도를 사람이 직접 맞추는 자리.**
 *
 * 같은 `13px` 글자가 맥북(dpr 2)에서는 물리 26px, 배율 100%인 윈도우 노트북(dpr 1)에서는
 * 물리 13px로 그려진다. 코드가 다르게 도는 게 아니라 자가 다르다.
 *
 * ⚠️ **자동으로 바꾸지 않는다.** `dpr === 1`이고 화면이 넓으면 확대해 주고 싶지만,
 *    27인치 데스크톱 모니터도 `dpr = 1`이다 — 브라우저는 화면의 **물리적 크기를 안 알려줘서**
 *    노트북인지 모니터인지 구분할 방법이 없다. 폭만 보고 확대하면 모니터 쓰는 사람 화면에서
 *    모든 게 우스꽝스럽게 커진다. 그래서 **감지는 하되 제안까지만** 한다.
 * ⚠️ **서버에 저장하지 않는다.** 기기 설정이라 계정을 따라다니면 안 된다 —
 *    같은 사람이 노트북과 모니터에서 다른 배율을 써야 한다.
 */

/**
 * 고를 수 있는 배율 — **줄이는 쪽만 둔다**(2026-08-06).
 *
 * ⚠️ **키우는 쪽(125·150·200)을 뺐다.** 화면을 키우면 쓸 수 있는 CSS 폭이 그만큼 줄어든다 —
 *    1455px 창에서 200%를 고르면 남는 폭이 727px뿐이라, 1440 기준으로 짠 화면이 들어갈 자리가
 *    없어 **레이아웃이 통째로 무너진다**(2컬럼이 한 뼘으로 눌린다).
 *    아주 넓은 화면(2880 등)에서는 말이 되지만, 그런 기기에서만 쓸 수 있는 값을 모두에게
 *    보여 주면 대부분의 사람이 화면을 깨뜨리게 된다. 필요해지면 **화면 폭을 보고 고를 수 있는
 *    것만 내주는** 방식으로 되살린다.
 * ⚠️ 줄이는 쪽은 남긴다. OS 배율이 높은 기기(예: 2880×1800을 250%로 쓰는 노트북)는 CSS 뷰포트가
 *    1152라 맥북(1440)보다 **크게** 보인다 — 거기서는 줄여야 맞는다.
 * ⚠️ 80%가 있는 이유 — 2880×1800을 250%로 쓰면 CSS 폭이 정확히 1152이고,
 *    1152 ÷ 1440 = 0.8이다. 흔한 조합이라 딱 맞는 칸을 둔다.
 */
export const SCREEN_SCALES = [75, 80, 90, 100] as const;

export type ScreenScale = (typeof SCREEN_SCALES)[number];

export const DEFAULT_SCALE: ScreenScale = 100;

/** `localStorage` 키 — 랜딩 밝기(`z:landing-theme`)와 같은 규칙을 따른다 */
export const SCALE_STORAGE_KEY = "z:screen-scale";

/**
 * 저장된 값을 배율로 읽는다.
 *
 * ⚠️ 목록에 없는 값은 **기본값으로 되돌린다.** 저장소는 사람이 고칠 수 있어서
 *    `scale(9999)` 같은 값이 들어오면 화면이 통째로 못 쓰게 된다.
 */
export function parseScale(raw: string | null): ScreenScale {
  const value = Number(raw);
  return SCREEN_SCALES.find((scale) => scale === value) ?? DEFAULT_SCALE;
}

/**
 * 설계 기준 폭 — 화면들이 이 폭을 전제로 그려져 있다(§디자인 토큰: 1440 기준).
 * 여기서 얼마나 벗어났는지가 곧 "다른 기기와 얼마나 다르게 보이나"다.
 */
export const REFERENCE_WIDTH = 1440;

export type ScaleHint = "none" | "smaller";

/**
 * 배율을 **어느 쪽으로** 권할지.
 *
 * ⚠️ **좁은 쪽만 본다.** 넓은 화면은 내용이 작아 보이지만, 키우는 배율을 없앴으므로
 *    권할 값이 없다 — 답이 없는 안내는 하지 않는다(§정직성).
 * ⚠️ **이미 고른 사람에게는 안 띄운다.** 일부러 고른 사람에게 매번 권하면 잔소리다.
 * ⚠️ 문턱을 넉넉히 둔다(±25%). 1200~1800은 보통 화면이라 권할 일이 아니다 —
 *    조금만 달라도 참견하면 대부분의 사람에게 잘못된 안내가 뜬다.
 */
/**
 * 이 화면 폭에서 **기준(1440)에 가장 가까워지는** 배율.
 *
 * 지금 CSS 폭이 1152이면 1152 ÷ 1440 = 0.8 → 80%다. 배율을 걸면 화면이 그만큼 넓게
 * 계산되므로 다른 기기와 같은 폭이 된다.
 *
 * ⚠️ 목록에 있는 값 중에서 고른다. 딱 맞는 값이 없으면 **가장 가까운 것**이다 —
 *    임의의 배율을 허용하면 저장소에 이상한 값이 들어왔을 때 걸러낼 기준이 없어진다.
 */
export function recommendScale(viewportWidth: number): ScreenScale {
  if (viewportWidth <= 0) return DEFAULT_SCALE;

  const ideal = (viewportWidth / REFERENCE_WIDTH) * 100;
  return SCREEN_SCALES.reduce((best, scale) =>
    Math.abs(scale - ideal) < Math.abs(best - ideal) ? scale : best,
  );
}

/**
 * 방향키로 옮겨 갈 **다음 배율.**
 *
 * ⚠️ 라디오 그룹의 키보드 계약이다 — 좌/상은 이전, 우/하는 다음, Home·End는 양 끝.
 *    UI가 아니라 여기서 정하는 건 순서 계산이 로직이라 테스트가 붙기 때문이다(§테스트).
 * ⚠️ **끝에서 돌지 않는다(clamp).** 배율은 크기 순서라, 100%에서 오른쪽을 눌러 75%로 튀면
 *    "가장 크게"의 다음이 "가장 작게"가 되어 방향 감각이 깨진다. 목록·달력의 순환과 다르다.
 * ⚠️ 방향키가 아니면 `null` — 부르는 쪽이 기본 동작(스크롤 등)을 막지 않게 한다.
 */
export function nextScaleByKey(current: ScreenScale, key: string): ScreenScale | null {
  const index = SCREEN_SCALES.indexOf(current);
  const last = SCREEN_SCALES.length - 1;

  const at = (i: number): ScreenScale => SCREEN_SCALES[Math.min(Math.max(i, 0), last)] ?? current;

  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return at(index + 1);
    case "ArrowLeft":
    case "ArrowUp":
      return at(index - 1);
    case "Home":
      return at(0);
    case "End":
      return at(last);
    default:
      return null;
  }
}

export function suggestScale(input: { viewportWidth: number; hasChosen: boolean }): ScaleHint {
  if (input.hasChosen || input.viewportWidth === 0) return "none";
  // ⚠️ 경계를 포함한다. 2880을 250%로 쓰면 정확히 1152(= 1440 × 0.8)라 딱 걸린다
  return input.viewportWidth <= REFERENCE_WIDTH * 0.8 ? "smaller" : "none";
}

/**
 * 배율이 적용되는 경로 — **로그인 이후 화면만**(2026-08-19).
 *
 * 배율은 "1440 기준으로 짠 워크스페이스를 내 기기에 맞추는" 설정이라, 랜딩·로그인 같은
 * 공개 화면까지 줄이면 처음 온 사람의 첫 화면이 이유 없이 작아 보인다 — 마이페이지에서
 * 75%를 고르면 랜딩까지 75%로 굳던 문제의 원인이 이것이다(값이 `localStorage`라
 * 화면 구분 없이 전역으로 읽혔다).
 *
 * ⚠️ 접두사는 **정확히 그 경로이거나 `접두사/`로 시작**해야 맞는다 — `/my`가 `/mypage`를
 *    잡아먹지 않게 한다(`isScaledPath`).
 * ⚠️ 라우트 그룹이 늘면 여기에 추가한다 — 부트 스크립트와 `AppScaleScope`가 같은 목록을 쓴다.
 */
export const SCALED_PATH_PREFIXES = [
  "/app",
  "/owner",
  "/manage",
  "/team",
  "/my",
  "/onboarding",
  "/subscription",
  "/system",
] as const;

/** 이 경로에서 배율을 적용하나 — 로그인 이후 화면(§SCALED_PATH_PREFIXES)만 true. */
export function isScaledPath(pathname: string): boolean {
  return SCALED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * 지금 걸려 있는 배율 값 — **좌표를 직접 다루는 코드가 나눠 쓰는 자리.**
 *
 * `transform: scale()`은 그리기만 줄이고 레이아웃 좌표는 그대로 둔다. 그래서
 * 포인터 좌표(화면 px)를 레이아웃 좌표(px)로 바꿔 쓰는 코드는 이 값으로 나눠야 한다 —
 * 대표적으로 dnd-kit `DragOverlay`(보드)가 그렇다(§scaleCompensation).
 *
 * ⚠️ **rect끼리만 비교하는 코드는 이 값이 필요 없다.** `clientY`와 `getBoundingClientRect()`는
 *    둘 다 배율이 적용된 값이라 포함 여부 판정에서는 배율이 약분된다(§rooms/grid-slot).
 *    이 함수를 부르기 전에, 정말 좌표계가 섞이는 자리인지부터 확인한다.
 * ⚠️ 서버·테스트(jsdom)처럼 `document`가 없거나 변수가 안 읽히면 1이다 — 배율 보정이
 *    빠질 뿐 좌표 자체는 성립한다.
 */
export function getAppScale(): number {
  if (typeof document === "undefined") return 1;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--app-scale");
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * 첫 페인트 전에 도는 부트 스크립트.
 *
 * ⚠️ **하이드레이션까지 기다리면 안 된다.** 새로고침마다 100%로 한 번 그려졌다가 확대되면서
 *    화면이 통째로 튄다 — 랜딩 밝기가 이미 같은 방식으로 `<head>`에서 처리한다.
 * ⚠️ 저장소를 못 읽어도(사생활 모드·CSP) 화면은 산다. 기본값 100%로 남을 뿐이다.
 * ⚠️ 100%면 **아무것도 안 건다.** 기본값이 `1`이라 `scale(1)`은 그리기에 영향이 없다.
 * ⚠️ 목록에 있는지를 `indexOf(s) >= 0`으로 본다. 전에는 `> 0`이었는데, 100%가 배열 첫
 *    자리라 그걸로 "100%는 건너뛴다"까지 겸했다 — 줄이는 배율이 앞에 붙자 **75%가 통째로
 *    무시됐다.** 두 판정을 섞어 쓰면 목록이 바뀔 때 조용히 틀린다.
 * ⚠️ 문자열로 넣는다. 브라우저는 숫자도 받아 주지만, 값을 다시 읽는 쪽(테스트 등)에서
 *    타입이 갈려 헷갈린다.
 * ⚠️ **`zoom`이 아니라 `--app-scale` 변수 하나만 세운다**(2026-08-06 전환). 실제로 줄이는 일은
 *    `globals.css`의 `body`가 `transform: scale()`로 한다 — `zoom`은 배율을 레이아웃에 섞어
 *    좌표를 다루는 코드를 전부 어긋나게 했다(DECISIONS §화면 배율).
 * ⚠️ **로그인 이후 경로에서만 건다**(§SCALED_PATH_PREFIXES). 첫 페인트 몫은 여기,
 *    클라이언트 내비게이션 몫은 `AppScaleScope`가 맡는다 — 판정 로직은 한쪽(`isScaledPath`)이고
 *    이 스크립트는 같은 목록을 직렬화해서 쓴다.
 */
export const SCALE_BOOT_SCRIPT = `try{var p=location.pathname;var pre=${JSON.stringify(SCALED_PATH_PREFIXES)};var ok=false;for(var i=0;i<pre.length;i++){if(p===pre[i]||p.indexOf(pre[i]+"/")===0){ok=true;break}}if(ok){var s=Number(localStorage.getItem("${SCALE_STORAGE_KEY}"));if(s!==${DEFAULT_SCALE}&&[${SCREEN_SCALES.join(",")}].indexOf(s)>=0){document.documentElement.style.setProperty("--app-scale",String(s/100))}}}catch(e){}`;
