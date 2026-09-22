import {
  burstAt,
  finaleAt,
  isTrackLongEnough,
  plateauBetween,
  scatterAt,
  shardFadeAt,
  shardMixAt,
  toHeroProgress,
} from "./hero-progress";

/**
 * 첫 화면 진행도 — **연출 전체가 이 값 하나로 움직인다.**
 * 범위를 벗어나면 3D가 뒤집히거나 조각이 화면 밖으로 날아간다.
 */
describe("toHeroProgress", () => {
  /* ⚠️ 문서 전체가 기준이다 — 연출이 첫 화면에서 끝나지 않고 맨 밑까지 이어진다 */
  it("스크롤할 수 있는 거리를 0~1로 잰다", () => {
    expect(toHeroProgress(2000, 4000)).toBeCloseTo(0.5);
    expect(toHeroProgress(4000, 4000)).toBe(1);
  });

  it("맨 위에서는 0이다", () => {
    expect(toHeroProgress(0, 4000)).toBe(0);
  });

  /* ⚠️ 되올리거나(음수) 한참 내려가도 범위를 안 벗어난다 */
  it("위아래로 벗어나지 않는다", () => {
    expect(toHeroProgress(-500, 4000)).toBe(0);
    expect(toHeroProgress(99999, 4000)).toBe(1);
  });

  /* ⚠️ 화면 높이를 아직 못 읽은 순간(0)에 나누면 `Infinity`가 나와 3D가 사라진다 */
  /* ⚠️ 스크롤할 곳이 없으면(짧은 화면·측정 전) 나눗셈이 `Infinity`가 되어 3D가 사라진다 */
  it("스크롤할 거리가 없으면 0으로 둔다", () => {
    expect(toHeroProgress(300, 0)).toBe(0);
  });
});

describe("plateauBetween — 벌어졌다 머물다 모인다", () => {
  /* ⚠️ 구간 밖은 0이어야 두 구간을 이어 붙여도 서로 간섭하지 않는다 */
  it("구간 밖에서는 0이다", () => {
    expect(plateauBetween(0.1, 0.2, 0.8, 0.1)).toBe(0);
    expect(plateauBetween(0.9, 0.2, 0.8, 0.1)).toBe(0);
  });

  /* ⚠️ **머무는 구간이 있다.** 산과 다른 점이 이것뿐이라, 없으면 쓸 이유가 없다 */
  it("가운데에서는 1로 머문다", () => {
    expect(plateauBetween(0.4, 0.2, 0.8, 0.1)).toBe(1);
    expect(plateauBetween(0.6, 0.2, 0.8, 0.1)).toBe(1);
  });

  it("양쪽 경사가 같은 길이다", () => {
    expect(plateauBetween(0.25, 0.2, 0.8, 0.1)).toBeCloseTo(plateauBetween(0.75, 0.2, 0.8, 0.1));
  });

  /* ⚠️ 0으로 나누면 `Infinity`가 나와 조각이 화면 밖으로 날아간다 */
  it("경사 길이가 0이면 켜지지 않는다", () => {
    expect(plateauBetween(0.5, 0.2, 0.8, 0)).toBe(0);
  });
});

describe("burstAt — 두 번 흩어진다", () => {
  /* ⚠️ 사이에서 **완전히 모여야** 한다. 계속 벌어져 있으면 그냥 어수선한 배경이 된다 */
  it("맨 위·사이·맨 밑에서는 모여 있다", () => {
    expect(burstAt(0)).toBe(0);
    expect(burstAt(0.62)).toBe(0);
    expect(burstAt(1)).toBe(0);
  });

  /*
    ⚠️ **붙박이 구간(0.18~0.46) 내내 가장 멀리 벌어져 있어야 한다.** 거기는 스크롤을 내려도
       화면이 안 움직이는 자리라, **벌어진 채로 도는 것**이 그 구간의 유일한 사건이다
       (2026-08-12 확정). 한가운데서 모여 버리면 볼 것이 없다 — 산이 아니라 평평한 구간을
       쓰는 이유가 이것이다.
  */
  it("흐름 섹션이 붙박여 있는 동안 계속 벌어져 있다", () => {
    expect(burstAt(0.18)).toBeGreaterThan(0.9);
    expect(burstAt(0.32)).toBe(1);
    expect(burstAt(0.44)).toBeGreaterThan(0.9);
  });

  /* ⚠️ 붙박이가 풀리면서 모인다 — 기능 섹션에 들어설 땐 온전한 Z다 */
  it("붙박이가 풀리며 모인다", () => {
    expect(burstAt(0.58)).toBe(0);
  });

  /* ⚠️ 두 번째는 **기능 섹션(0.66~0.86)**이다 — 거기서 다시 쪼개진다 */
  it("기능 섹션에서 다시 쪼개진다", () => {
    expect(burstAt(0.74)).toBe(1);
  });

  /*
    ⚠️ **0.86에서 끝난다.** `finaleAt`이 거기서부터 완성 연출을 시작하므로, 구간이 조금이라도
       넘어가면 부서진 채로 커지고 `--hero-shatter` 때문에 완성 순간의 로고가 되레 흐려진다
       (2026-08-14에 0.95로 밀었다가 되돌렸다). 끝점을 값으로 못 박아 다시 밀리지 않게 한다.
  */
  it("완성 구간이 시작되는 0.86에는 이미 다 모여 있다", () => {
    expect(burstAt(0.86)).toBe(0);
    expect(burstAt(0.9)).toBe(0);
  });

  /*
    ⚠️ **첫 화면을 읽는 동안에는 온전하다.** 0부터 부풀리면 스크롤 2%만에 다 부서져, 로고는
       없고 부스러기만 떠 있는 화면을 한참 본다(2026-08-12 피드백).
  */
  it("첫 화면에서는 아직 안 부서진다", () => {
    expect(burstAt(0.02)).toBe(0);
    expect(burstAt(0.05)).toBe(0);
  });
});

describe("finaleAt — 맨 밑에서 완성", () => {
  it("끝에 닿기 전에 시작해 바닥에서 끝난다", () => {
    expect(finaleAt(0.85)).toBe(0);
    expect(finaleAt(0.93)).toBeCloseTo(0.5);
    expect(finaleAt(1)).toBe(1);
  });
});

describe("scatterAt — 떠나는 건 빠르게", () => {
  /*
    ⚠️ 벌어짐을 그대로 쓰면 초반에 조각이 제자리 근처에 남아 **계단 모양 Z**가 그대로 보인다 —
       그 계단이 매끈한 원본과 겹쳐 보이는 게 어색함의 진짜 원인이었다(2026-08-12 재지적).
  */
  it("조금만 흩어져도 크게 벌어진다", () => {
    expect(scatterAt(0.04)).toBeCloseTo(0.2);
    expect(scatterAt(0.25)).toBeCloseTo(0.5);
  });

  it("양 끝은 그대로다 — 모였을 때 0, 끝까지 흩어지면 1", () => {
    expect(scatterAt(0)).toBe(0);
    expect(scatterAt(1)).toBe(1);
  });
});

describe("shardMixAt — 바꿔치기 구간", () => {
  /*
    ⚠️ **다 모인 뒤에 바꾸지 않는다.** 그러면 격자 실루엣과 매끈한 원본이 나란히 비교되어
       "띡" 하고 바뀐 것처럼 보인다 — 한창 흩어져 있을 때 섞어야 눈이 둘을 못 견준다.
  */
  /* ⚠️ 넘기는 값은 **벌어진 정도**(`scatterAt`)다 — 흩어짐 자체가 아니다 */
  it("모여 있을 때는 매끈한 원본만 보인다", () => {
    expect(shardMixAt(scatterAt(0))).toBe(0);
    expect(shardMixAt(scatterAt(0.01))).toBe(0);
  });

  it("한창 흩어졌을 때 조각으로 완전히 넘어간다", () => {
    expect(shardMixAt(scatterAt(0.25))).toBe(1);
    expect(shardMixAt(scatterAt(1))).toBe(1);
  });

  it("가운데에서는 섞인다 — 그 구간이 넓어야 바뀌는 순간이 안 보인다", () => {
    expect(shardMixAt(0.285)).toBeCloseTo(0.5, 1);
  });

  /* ⚠️ 섞이기 시작할 땐 이미 조각이 **눈에 띄게 벌어져** 있어야 계단이 안 보인다 */
  it("섞이기 시작하는 지점에서 이미 충분히 벌어져 있다", () => {
    const burstWhenMixStarts = 0.12 * 0.12;

    expect(scatterAt(burstWhenMixStarts)).toBeCloseTo(0.12);
    expect(shardMixAt(scatterAt(0.09))).toBeGreaterThan(0.5);
  });
});

describe("shardFadeAt — 멀어질수록 옅어진다", () => {
  /* ⚠️ 모여 있을 때는 원본만큼 진해야 한다 — 옅으면 로고가 흐릿해진 채로 서 있는다 */
  it("모여 있을 때는 그대로 진하다", () => {
    expect(shardFadeAt(0)).toBe(1);
  });

  /*
    ⚠️ 다 흩어졌을 때 진하면 흰 정육면체가 화면에 **얼룩처럼** 박힌다(2026-08-12 피드백).
       그렇다고 0이면 "부서졌다"가 아니라 "꺼졌다"로 보인다 — 흐릿하게 남아야 한다.
  */
  it("다 흩어졌을 때는 흐릿하게만 남는다", () => {
    expect(shardFadeAt(1)).toBeLessThan(0.8);
    expect(shardFadeAt(1)).toBeGreaterThan(0);
  });

  it("범위를 벗어나도 진하기가 뒤집히지 않는다", () => {
    expect(shardFadeAt(-1)).toBe(1);
    expect(shardFadeAt(2)).toBe(shardFadeAt(1));
  });
});

describe("isTrackLongEnough — 짧은 페이지에서는 연출을 끈다", () => {
  /* ⚠️ 요금제·약관처럼 한두 화면짜리에서는 흩어짐→모임이 스크롤 몇 칸에 다 지나가 어수선하다 */
  it("화면 두 개 반은 내려갈 수 있어야 켠다", () => {
    expect(isTrackLongEnough(900, 800)).toBe(false);
    expect(isTrackLongEnough(2400, 800)).toBe(true);
  });

  /*
    ⚠️ **경계를 날숫자로 못 박는다.** 1.1배·3.0배만 보면 `MIN_TRACK_SCREENS`를 2.0으로 바꿔도
       둘 다 통과한다 — 상수를 바꿔도 안 깨지는 테스트는 지키는 게 없다(2026-08-14 확인).
    ⚠️ 여기서 `MIN_TRACK_SCREENS`를 **쓰면 안 된다.** 상수로 기대값을 만들면 상수를 바꿀 때
       테스트가 같이 따라가서 결국 아무것도 안 지킨다(같은 실수를 한 번 했다).
       800 × 2.5 = 2000이라 1999는 false, 2000은 true다.
  */
  it("정확히 2.5배부터 켠다", () => {
    expect(isTrackLongEnough(1999, 800)).toBe(false);
    expect(isTrackLongEnough(2000, 800)).toBe(true);
  });

  /* ⚠️ 화면 높이를 못 읽은 순간에는 켜지 않는다 — `x >= 0`은 늘 참이라 짧은 페이지가 켜진다 */
  it("화면 높이를 모를 때는 끈다", () => {
    expect(isTrackLongEnough(900, 0)).toBe(false);
  });
});
