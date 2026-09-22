import {
  DEFAULT_SCALE,
  isScaledPath,
  nextScaleByKey,
  parseScale,
  recommendScale,
  SCALE_BOOT_SCRIPT,
  SCALED_PATH_PREFIXES,
  SCREEN_SCALES,
  suggestScale,
} from "./scale";

describe("parseScale", () => {
  it.each([
    ["75", 75],
    ["80", 80],
    ["90", 90],
    ["100", 100],
  ])("저장된 값을 그대로 읽는다: %s", (raw, expected) => {
    expect(parseScale(raw)).toBe(expected);
  });

  it("아직 안 고른 사람은 기본값이다", () => {
    expect(parseScale(null)).toBe(DEFAULT_SCALE);
  });

  /*
    ⚠️ **저장소는 사람이 고칠 수 있다.** 목록에 없는 값을 그대로 믿으면 `scale(9999)`가 걸려
       화면을 통째로 못 쓰게 되고, 되돌릴 버튼도 안 보인다.
    ⚠️ `110`처럼 **그럴듯하지만 목록에 없는 값**도 걸러야 한다. 목록이 바뀌면 예전에 골라 둔
       값이 저장소에 남아 있다.
  */
  it.each(["9999", "0", "-1", "abc", "", "1e3", "110", "150", "200"])(
    "목록에 없는 값은 기본값으로 되돌린다: %s",
    (raw) => {
      expect(parseScale(raw)).toBe(DEFAULT_SCALE);
    },
  );
});

describe("suggestScale", () => {
  const at = (viewportWidth: number, hasChosen = false) =>
    suggestScale({ viewportWidth, hasChosen });

  it("기준보다 좁으면 줄이라고 권한다 — OS 배율이 높아 크게 보이는 경우", () => {
    expect(at(1152)).toBe("smaller");
  });

  /*
    ⚠️ **넓은 화면에는 권하지 않는다**(2026-08-06). 키우는 배율을 없앴으니 권할 값이 없다 —
       답이 없는 안내는 하지 않는다(§정직성). 화면을 키우면 쓸 수 있는 폭이 줄어
       1440 기준 화면이 무너진다.
  */
  it.each([1440, 1200, 1512, 1800, 2880])("보통·넓은 폭에서는 참견하지 않는다: %s", (width) => {
    expect(at(width)).toBe("none");
  });

  it("**이미 고른 사람에게는 안 권한다** — 일부러 고른 사람에게 매번 권하면 잔소리다", () => {
    expect(at(2880, true)).toBe("none");
  });

  it("아직 폭을 모를 때는 아무 말도 안 한다 — 서버 렌더에서는 0이다", () => {
    expect(at(0)).toBe("none");
  });
});

describe("SCALE_BOOT_SCRIPT", () => {
  /*
    ⚠️ 이 스크립트는 **첫 페인트 전에** 인라인으로 돈다. 문법이 깨지면 화면이 통째로 안 뜨는데
       빌드는 통과한다 — 문자열이라 타입 검사가 안 닿는다.
  */
  it("문법이 성립한다", () => {
    expect(() => new Function(SCALE_BOOT_SCRIPT)).not.toThrow();
  });

  it("저장소를 못 읽어도 던지지 않는다 — 사생활 모드에서도 화면은 산다", () => {
    const run = new Function(SCALE_BOOT_SCRIPT);
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("차단됨");
      },
    });

    expect(() => run()).not.toThrow();

    if (original) Object.defineProperty(globalThis, "localStorage", original);
  });

  /*
    ⚠️ **`zoom`이 아니라 `--app-scale` 변수다**(2026-08-06 전환). 실제로 줄이는 일은
       `globals.css`의 `body`가 `transform: scale()`로 한다 — `zoom`은 배율을 레이아웃에
       섞어 좌표를 다루는 코드를 전부 어긋나게 했다(DECISIONS §화면 배율).
  */
  const scaleVar = () => document.documentElement.style.getPropertyValue("--app-scale");

  it("100%는 아무것도 세우지 않는다 — 기본값 `1`로 둔다", () => {
    // ⚠️ 앱 경로에서 돌아야 이 테스트가 "100% 건너뛰기"를 검증한다 — 공개 경로면
    //    경로 게이트에 막혀 어떤 값이든 안 세워지므로, 통과해도 아무것도 증명 못 한다
    window.history.pushState({}, "", "/app/board");
    localStorage.setItem("z:screen-scale", "100");
    document.documentElement.style.removeProperty("--app-scale");

    new Function(SCALE_BOOT_SCRIPT)();

    expect(scaleVar()).toBe("");
  });

  it("고른 배율을 `--app-scale`로 세운다 — 로그인 이후 경로에서", () => {
    // ⚠️ 부트 스크립트는 경로를 본다(2026-08-19) — 앱 경로가 아니면 안 건다
    window.history.pushState({}, "", "/app/board");
    localStorage.setItem("z:screen-scale", "90");

    new Function(SCALE_BOOT_SCRIPT)();

    expect(scaleVar()).toBe("0.9");
  });

  it("공개 화면(랜딩·로그인)에서는 저장된 배율이 있어도 안 건다", () => {
    localStorage.setItem("z:screen-scale", "75");
    for (const path of ["/", "/login"]) {
      window.history.pushState({}, "", path);
      document.documentElement.style.removeProperty("--app-scale");

      new Function(SCALE_BOOT_SCRIPT)();

      expect(scaleVar()).toBe("");
    }
  });

  /*
    ⚠️ 목록 **첫 자리**의 값이다. 전에는 `indexOf(s) > 0`으로 걸러서 100%를 건너뛰었는데,
       줄이는 배율이 앞에 붙자 75%가 통째로 무시됐다 — 목록이 바뀌어도 안 깨지는지 본다.
  */
  it("목록 첫 값(75%)도 걸린다", () => {
    window.history.pushState({}, "", "/app/board");
    localStorage.setItem("z:screen-scale", "75");

    new Function(SCALE_BOOT_SCRIPT)();

    expect(scaleVar()).toBe("0.75");
  });

  /*
    ⚠️ **`zoom`으로 돌아가면 안 된다.** 그게 좌표를 다루는 코드를 세 군데 어긋나게 했다 —
       팝업 위치·클릭 차단 층·기준 상자. 부트 스크립트에 그 낱말이 다시 들어오면 잡는다.
  */
  it("`zoom`을 건드리지 않는다", () => {
    expect(SCALE_BOOT_SCRIPT).not.toContain("zoom");
  });
});

describe("recommendScale", () => {
  /*
    ⚠️ 2880×1800을 250%로 쓰면 CSS 폭이 정확히 1152다. 1152 ÷ 1440 = 0.8 →
       80%가 딱 맞는 값이라 목록에 넣어 뒀다.
  */
  it.each([
    [1152, 80],
    [1440, 100],
    [1280, 90],
    [1080, 75],
  ])("폭 %s에서는 %s%%를 권한다", (width, expected) => {
    expect(recommendScale(width)).toBe(expected);
  });

  it("폭을 아직 모르면 기본값이다 — 서버 렌더에서는 0이다", () => {
    expect(recommendScale(0)).toBe(DEFAULT_SCALE);
  });

  it("아주 넓어도 목록 밖으로 나가지 않는다 — 임의 배율을 허용하면 걸러낼 기준이 없어진다", () => {
    expect(SCREEN_SCALES).toContain(recommendScale(9999));
  });

  /*
    ⚠️ **권하는 값은 반드시 목록에 있어야 한다.** 목록에 없는 값을 권하면 눌러도 아무 일이 없다.
    ⚠️ 넓은 화면에서는 권하는 값이 100%가 된다(키우는 배율이 없다) — 그래서 `suggestScale`이
       넓은 쪽에는 아예 안내를 안 띄운다. 둘이 어긋나면 "권했는데 안 바뀐다"가 된다.
  */
  it.each([1152, 1440, 2880, 1080])("권하는 값은 언제나 고를 수 있다: 폭 %s", (width) => {
    expect(SCREEN_SCALES).toContain(recommendScale(width));
  });
});

describe("nextScaleByKey", () => {
  it("오른쪽·아래는 다음 배율", () => {
    expect(nextScaleByKey(90, "ArrowRight")).toBe(100);
    expect(nextScaleByKey(90, "ArrowDown")).toBe(100);
  });

  it("왼쪽·위는 이전 배율", () => {
    expect(nextScaleByKey(100, "ArrowLeft")).toBe(90);
    expect(nextScaleByKey(100, "ArrowUp")).toBe(90);
  });

  it("Home·End는 양 끝", () => {
    expect(nextScaleByKey(100, "Home")).toBe(SCREEN_SCALES[0]);
    expect(nextScaleByKey(100, "End")).toBe(SCREEN_SCALES.at(-1));
  });

  /* ⚠️ 끝에서 돌지 않는다 — 크기 순서라 가장 큰 값의 다음이 가장 작은 값이 되면 방향이 깨진다 */
  it("양 끝에서는 제자리에 머문다(순환하지 않는다)", () => {
    expect(nextScaleByKey(SCREEN_SCALES.at(-1)!, "ArrowRight")).toBe(SCREEN_SCALES.at(-1));
    expect(nextScaleByKey(SCREEN_SCALES[0], "ArrowLeft")).toBe(SCREEN_SCALES[0]);
  });

  it("방향키가 아니면 null — 부르는 쪽이 기본 동작을 막지 않게", () => {
    expect(nextScaleByKey(100, "Enter")).toBeNull();
    expect(nextScaleByKey(100, "a")).toBeNull();
  });
});

describe("isScaledPath — 배율은 로그인 이후 화면만", () => {
  it.each([
    "/app/board",
    "/app",
    "/manage/members/3",
    "/onboarding/2",
    "/my",
    "/team/action",
    "/subscription",
  ])("%s → 적용", (path) => {
    expect(isScaledPath(path)).toBe(true);
  });

  it.each(["/", "/login", "/register", "/plans", "/terms", "/privacy", "/mypage"])(
    "%s → 미적용 (공개 화면·접두사 오인)",
    (path) => {
      expect(isScaledPath(path)).toBe(false);
    },
  );

  it("부트 스크립트도 같은 경로 목록을 쓴다 — 두 판정이 어긋나면 첫 페인트만 배율이 새거나 빠진다", () => {
    for (const prefix of SCALED_PATH_PREFIXES) {
      expect(SCALE_BOOT_SCRIPT).toContain(`"${prefix}"`);
    }
  });
});
