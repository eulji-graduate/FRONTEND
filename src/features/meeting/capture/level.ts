/**
 * 마이크 음량계 — 자막 청크에 실어 보낼 **dBFS**를 잰다.
 *
 * ⚠️ **장식이 아니다.** BE는 자막 청크마다 `rms`를 **NOT NULL**로 요구하고, 그 값이
 *    화자 판정의 **유일한 근거**다(`cap/.../CaptionChunk.java`). 안 보내면 422로 튕긴다 —
 *    자막이 저장 자체가 안 된다.
 * ⚠️ **모델이 아니라 산수다.** `AnalyserNode`가 준 파형에서 제곱평균제곱근을 구해
 *    `20·log10(rms)`로 바꾼다. 그래서 값은 **음수**(0 dBFS가 최대)다.
 * ⚠️ **녹음기와 같은 스트림을 쓴다.** `getUserMedia`를 따로 부르면 마이크가 두 번 열려
 *    표시등·장치 점유가 어긋나고, 무엇보다 **녹음과 다른 소리를 재게 된다.**
 * ⚠️ 문장 하나가 여러 프레임에 걸치므로 **구간 평균**을 쓴다. 순간값은 숨 쉬는 자리에서
 *    바닥을 쳐서, 말한 사람과 안 한 사람이 뒤집힌다.
 */

/** 완전한 무음일 때 쓸 값 — `log10(0)`이 `-Infinity`라 그대로 두면 JSON에 못 싣는다 */
const SILENCE_DBFS = -100;

/** DECIMAL(6,2) 컬럼이라 소수 둘째 자리까지만 보낸다 — 그 아래는 어차피 잘린다 */
function roundToHundredth(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface LevelMeter {
  /** 지금부터 재기 시작한다 — 문장이 시작될 때 부른다 */
  mark(): void;
  /**
   * `mark()` 이후 구간의 평균 음량(dBFS).
   * ⚠️ `mark()` 없이 부르면 **그때까지 쌓인 전부**의 평균이다 — 문장 경계를 놓쳐도
   *    값이 비지는 않는다(`null`을 보내면 422다).
   */
  read(): number;
  /** 마이크를 놓는다 — 화면을 떠날 때 반드시 부른다 */
  close(): void;
}

/**
 * 스트림에 음량계를 물린다.
 *
 * ⚠️ 실패해도 **녹음을 막지 않는다.** `AudioContext`가 없거나 막힌 브라우저에서 음량계
 *    때문에 회의 자체를 못 하게 만들 수는 없다 — 그때는 `null`을 돌려주고, 부르는 쪽이
 *    무음값을 실어 보낸다(자막은 남는다).
 */
export function createLevelMeter(stream: MediaStream): LevelMeter | null {
  if (typeof window === "undefined") return null;

  /*
    ⚠️ `webkitAudioContext`는 표준 타입에 없다. `any`를 쓰지 않고(CLAUDE.md) 우리가 쓰는
       만큼만 좁게 적는다 — `stt.ts`가 `webkitSpeechRecognition`을 다루는 방식과 같다.
  */
  const scope = window as Window & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextCtor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!AudioContextCtor) return null;

  let context: AudioContext;
  try {
    context = new AudioContextCtor();
  } catch {
    return null;
  }

  const analyser = context.createAnalyser();
  /*
    ⚠️ 2048은 약 46ms다(48kHz 기준). 더 짧으면 저음이 잘려 남자 목소리가 낮게 잡히고,
       더 길면 짧은 대답("네")이 앞뒤 침묵에 묻힌다.
  */
  analyser.fftSize = 2048;
  const buffer = new Float32Array(analyser.fftSize);

  const source = context.createMediaStreamSource(stream);
  source.connect(analyser);
  /*
    ⚠️ **스피커로 내보내지 않는다**(`context.destination`에 안 잇는다). 이으면 자기
       마이크 소리가 자기 스피커로 나가 하울링이 난다.
  */

  /** `mark()` 이후 프레임들의 제곱합·개수 — 평균을 내려고 쌓는다 */
  let squareSum = 0;
  let frames = 0;
  let timer: number | null = null;

  function sample() {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    /* ⚠️ `for...of`를 쓴다 — 인덱스 접근은 `noUncheckedIndexedAccess` 때문에 매번 `undefined` 검사를 요구한다 */
    for (const value of buffer) {
      sum += value * value;
    }
    squareSum += sum / buffer.length;
    frames += 1;
  }

  /*
    ⚠️ 100ms마다 잰다. 문장 하나가 보통 2~5초라 20~50번 쌓인다 — 평균을 내기 충분하고,
       `requestAnimationFrame`과 달리 **탭이 뒤로 가도 계속 돈다**(화면 밖에서도 회의는
       계속된다).
  */
  timer = window.setInterval(sample, 100);

  return {
    mark() {
      squareSum = 0;
      frames = 0;
    },
    read() {
      if (frames === 0) return SILENCE_DBFS;
      const rms = Math.sqrt(squareSum / frames);
      if (rms <= 0) return SILENCE_DBFS;
      const dbfs = 20 * Math.log10(rms);
      /* 아주 작은 소리는 -100 아래로도 내려간다 — 컬럼 폭(DECIMAL(6,2))에 맞춰 자른다 */
      return roundToHundredth(Math.max(dbfs, SILENCE_DBFS));
    },
    close() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      source.disconnect();
      void context.close();
    },
  };
}
