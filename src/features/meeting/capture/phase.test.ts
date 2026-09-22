import {
  canSubmit,
  CAPTURE_PHASE,
  closedSegmentCountOf,
  formatRecordedTime,
  isCapturing,
  nextUtteranceStart,
  recordedMsOf,
  SEGMENT_MS,
  showsWorkspace,
} from "./phase";

describe("단계 판정", () => {
  it("녹음 중일 때만 마이크를 켠다", () => {
    expect(isCapturing(CAPTURE_PHASE.RECORDING)).toBe(true);
    expect(isCapturing(CAPTURE_PHASE.PAUSED)).toBe(false);
    expect(isCapturing(CAPTURE_PHASE.READY)).toBe(false);
  });

  it("준비 화면과 종료 후에는 작업 화면을 안 그린다", () => {
    expect(showsWorkspace(CAPTURE_PHASE.BEFORE_START)).toBe(false);
    expect(showsWorkspace(CAPTURE_PHASE.ENDED)).toBe(false);
    expect(showsWorkspace(CAPTURE_PHASE.READY)).toBe(true);
    expect(showsWorkspace(CAPTURE_PHASE.PAUSED)).toBe(true);
  });

  /* 녹음 한 번 없이 종료하면 스크립트도 파일도 없는 회의가 되돌릴 수 없게 굳는다 */
  it("녹음을 시작하기 전에는 종료할 수 없다", () => {
    expect(canSubmit(CAPTURE_PHASE.BEFORE_START)).toBe(false);
    expect(canSubmit(CAPTURE_PHASE.READY)).toBe(false);
    expect(canSubmit(CAPTURE_PHASE.RECORDING)).toBe(true);
    expect(canSubmit(CAPTURE_PHASE.PAUSED)).toBe(true);
  });
});

describe("실제 녹음 누적 시간", () => {
  it("열린 구간은 지금까지로 센다", () => {
    expect(recordedMsOf([{ from: 1_000, to: null }], 4_000)).toBe(3_000);
  });

  it("일시정지 구간은 빼고 센다", () => {
    const spans = [
      { from: 0, to: 5_000 }, // 5초 녹음
      { from: 60_000, to: 63_000 }, // 55초 쉬고 3초 더
    ];
    expect(recordedMsOf(spans, 100_000)).toBe(8_000);
  });

  it("구간이 없으면 0이다", () => {
    expect(recordedMsOf([], 10_000)).toBe(0);
  });

  /* 시계가 뒤로 가거나 값이 이상해도 음수를 만들지 않는다 */
  it("끝이 시작보다 앞서면 0으로 본다", () => {
    expect(recordedMsOf([{ from: 5_000, to: 1_000 }], 9_000)).toBe(0);
  });
});

describe("10분 세그먼트", () => {
  it("실제 녹음 10분마다 하나씩 닫는다", () => {
    expect(closedSegmentCountOf(0)).toBe(0);
    expect(closedSegmentCountOf(SEGMENT_MS - 1)).toBe(0);
    expect(closedSegmentCountOf(SEGMENT_MS * 2 + 1)).toBe(2);
  });

  /* 경계를 앞당겨 세면 아직 안 온 조각까지 포함된 파일이 확정된다 */
  it("정확히 10분이 되는 순간 하나가 닫힌다", () => {
    expect(closedSegmentCountOf(SEGMENT_MS - 1)).toBe(0);
    expect(closedSegmentCountOf(SEGMENT_MS)).toBe(1);
    expect(closedSegmentCountOf(SEGMENT_MS + 1)).toBe(1);
  });

  /* 30분 쉬었다고 빈 파일 세 개가 생기면 안 된다 */
  it("벽시계가 아니라 녹음 시간으로 끊는다", () => {
    const spans = [{ from: 0, to: 60_000 }]; // 1분만 녹음
    const recorded = recordedMsOf(spans, 60 * 60 * 1000); // 벽시계로는 한 시간 뒤
    expect(closedSegmentCountOf(recorded)).toBe(0);
  });
});

describe("경과 시간 표기", () => {
  it("한 시간 미만은 분:초다", () => {
    expect(formatRecordedTime(0)).toBe("00:00");
    expect(formatRecordedTime(9_000)).toBe("00:09");
    expect(formatRecordedTime(754_000)).toBe("12:34");
  });

  it("한 시간을 넘기면 시간을 붙인다", () => {
    expect(formatRecordedTime(3_723_000)).toBe("1:02:03");
  });

  it("음수는 0으로 본다", () => {
    expect(formatRecordedTime(-5_000)).toBe("00:00");
  });
});

describe("발화 시작 시각", () => {
  it("첫 중간 결과에서 지금 시각을 잡는다", () => {
    expect(nextUtteranceStart(null, "안녕하", 10_000)).toBe(10_000);
  });

  /* ⚠️ 한 문장이 자라는 동안 시작 시각은 처음 그대로여야 한다 — 말 끝이 아니라 말 시작이다 */
  it("이미 잡았으면 덮어쓰지 않는다", () => {
    expect(nextUtteranceStart(10_000, "안녕하세요 반갑", 12_000)).toBe(10_000);
  });

  /*
    ⚠️ 여기가 이 함수의 존재 이유다. 일시정지·세션 종료로 중간 결과가 확정 없이 사라질 때
       안 지우면 **다음 문장이 앞 문장의 시각을 물려받는다**.
  */
  it("빈 문자열이 오면 지운다 — 다음 문장이 옛 시각을 물려받지 않게", () => {
    expect(nextUtteranceStart(20_000, "", 320_000)).toBeNull();
  });

  it("지운 뒤 새 문장은 그때 시각을 잡는다", () => {
    const cleared = nextUtteranceStart(20_000, "", 320_000);

    expect(nextUtteranceStart(cleared, "다시 말하면", 320_000)).toBe(320_000);
  });
});
