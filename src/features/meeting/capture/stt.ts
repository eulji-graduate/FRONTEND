/**
 * STT 계층 — **여기 한 곳만 브라우저 음성 인식을 안다**(WORKFLOW §3-3).
 *
 * ⚠️ 화면은 이 파일의 `SttEngine` 모양만 안다. 나중에 상용 STT로 갈아탈 때 이 파일만
 *    바꾸면 되게 두는 것이 §3-3의 요구다("STT 계층만 교체 가능하게 분리").
 * ⚠️ **Chrome 계열 전용이다**(`webkitSpeechRecognition`). 미지원 브라우저에서 조용히 안 되는
 *    척하지 않는다 — `isSttSupported()`로 먼저 묻고 화면이 안내를 띄운다(CLAUDE.md §정직성).
 */

/** 자막 한 조각 — 문장 단위다(§3-3 "문장=청크 단위") */
export interface TranscriptChunk {
  id: string;
  /** 화면 표기용 `10:04` — 화자 구분은 없다(§3-2 "화자 구분 없이 청크 단위") */
  at: string;
  /** 같은 값의 ms 원본 — 남의 자막과 섞어 세울 때 정렬 기준이 된다(§CAP-13) */
  atMs: number;
  text: string;
}

export interface SttEngine {
  start(): void;
  stop(): void;
}

export interface SttHandlers {
  /** 문장이 확정될 때마다 — 서버로도 이 단위로 보낸다(§3-3 자막 청크 전송 API) */
  onChunk(text: string): void;
  /**
   * 아직 확정 전인 말 — 화면에 흐리게 비춘다.
   *
   * ⚠️ **서버로 보내지 않는다.** 중간 결과는 말이 이어지면서 통째로 뒤집힌다 —
   *    쌓아 두면 같은 말이 여러 번 남는다(확정본만 §3-3의 청크다).
   * ⚠️ 이걸 보여주는 이유는 정확도가 아니라 **되짚을 기회**다. 잘못 알아들은 게 바로
   *    보이면 진행자가 그 자리에서 다시 말할 수 있다.
   */
  onPartial(text: string): void;
  /** 되돌릴 수 없는 실패(권한 거부 등) — 화면이 안내를 띄운다 */
  onFatal(message: string): void;
}

/*
  ⚠️ `SpeechRecognition`은 표준 타입이 없다. `any`를 쓰지 않고(CLAUDE.md) 우리가 쓰는 만큼만
     좁게 적는다 — 여기 적힌 것 말고는 부르지 않는다.
*/
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function ctorOf(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/** 이 브라우저가 STT를 하는가 — 화면은 이걸 먼저 묻고 안내를 띄운다 */
export function isSttSupported(): boolean {
  return ctorOf() !== null;
}

/**
 * 권한 거부처럼 **다시 시작해도 소용없는** 실패인가.
 *
 * ⚠️ `no-speech`·`aborted`·`network`는 여기 없다 — 조용한 구간이나 순간적인 끊김이라
 *    자동 재시작으로 이어가야 한다. 이걸 치명으로 보면 3~4초 침묵마다 회의가 멈춘다.
 */
function isFatalSttError(error: string): boolean {
  return error === "not-allowed" || error === "service-not-allowed" || error === "audio-capture";
}

const FATAL_MESSAGE: Record<string, string> = {
  "not-allowed": "마이크 사용이 거부되어 자막을 받을 수 없습니다. 브라우저 권한을 열어 주세요.",
  "service-not-allowed": "브라우저가 음성 인식을 막았습니다. 주소창 옆 권한 설정을 확인해 주세요.",
  "audio-capture": "마이크를 찾지 못했습니다. 연결 상태를 확인해 주세요.",
};

/**
 * 끊김 없이 듣는 것처럼 도는 STT를 만든다.
 *
 * ⚠️ **`onend`에서 다시 켠다**(§3-3). 브라우저 STT는 3~4초 조용하면 세션을 스스로 닫는다 —
 *    자동 재시작이 없으면 회의 중간에 자막이 조용히 죽는다.
 * ⚠️ 우리가 `stop()`을 부른 경우에는 **다시 켜지 않는다.** 그 구분이 없으면 일시정지·종료가
 *    먹히지 않고 마이크가 계속 열려 있다.
 * ⚠️ 미지원 브라우저면 `null`을 준다 — 부르는 쪽이 안내를 띄우게 하고, 여기서 조용히
 *    아무 일도 안 하는 가짜 엔진을 돌려주지 않는다(§정직성).
 */
/** 이만큼 연속으로 빈 세션이면 포기하고 알린다 — 대략 30초어치다 */
const MAX_EMPTY_RESTARTS = 8;

/**
 * 한 발화가 확정 없이 이어질 수 있는 최대 시간(ms).
 *
 * ⚠️ **`isFinal`은 전적으로 브라우저 엔진이 정한다.** 쉬지 않고 이어 말하면 문장이
 *    끝나도 다음 말과 합쳐진 채 계속 interim으로만 머무는 경우가 실제로 나온다(QA
 *    확인) — 우리 쪽에 문장 경계를 아는 방법이 없어 완전히 고칠 수는 없고,
 *    **너무 길어지면 끊어서 확정시키는** 정도로 완화한다.
 * ⚠️ 8초로 잡은 이유 — 화면(§DESIGN)의 발화 단위 감각과 맞춘 값이다. 더 짧으면 정상
 *    속도로 긴 문장을 말하는 사람의 말까지 억지로 끊는다.
 */
const MAX_UTTERANCE_MS = 8_000;

/** 발화가 너무 길어졌는지 이 주기로 살핀다 */
const UTTERANCE_CHECK_MS = 1_000;

export function createSttEngine(handlers: SttHandlers): SttEngine | null {
  const Ctor = ctorOf();
  if (!Ctor) return null;

  let recognition: SpeechRecognitionLike | null = null;
  /** 우리가 멈춘 것인가 — 자동 재시작을 할지 가른다 */
  let stopped = true;
  /**
   * 한 문장도 못 받고 바로 닫힌 횟수.
   *
   * ⚠️ **즉시·무한 재시작을 막는다.** `network`·`no-speech`처럼 치명이 아닌 오류는 바로
   *    `onend`로 이어지는데, 그때마다 곧장 다시 열면 실패가 계속되는 환경에서
   *    `onerror → onend → start`가 초당 수백 번 돈다(탭이 멎는다).
   */
  let emptyRestarts = 0;
  let retryTimer: number | null = null;
  /** 지금 확정 안 된 말이 **언제부터** 이어지고 있는가 — 없으면 `null` */
  let utteranceOpenAt: number | null = null;
  let utteranceCheckTimer: number | null = null;

  const spawn = () => {
    const instance = new Ctor();
    instance.lang = "ko-KR";
    instance.continuous = true;
    /*
      ⚠️ 중간 결과를 **받되 쌓지는 않는다.** 확정본만 목록에 넣고, 중간 것은 흐린 한 줄로
         비쳤다 사라진다 — 켜 두면 말하는 동안 화면이 반응해서 마이크가 죽었는지 알 수 있다.
    */
    instance.interimResults = true;

    instance.onresult = (event) => {
      let pending = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript?.trim();
        if (!text) continue;

        if (result?.isFinal) {
          // 한 문장이라도 받았으면 정상이다 — 물러설 시간을 되돌린다
          emptyRestarts = 0;
          utteranceOpenAt = null;
          handlers.onChunk(text);
        } else {
          pending = pending ? `${pending} ${text}` : text;
        }
      }

      // 새로 이어지는 말이 생겼으면 그 시작 시각을 잡는다 — 너무 길어지면 강제로 끊는다
      if (pending && utteranceOpenAt === null) utteranceOpenAt = Date.now();
      if (!pending) utteranceOpenAt = null;

      // 확정으로 넘어간 순간 흐린 줄을 비운다 — 안 비우면 같은 말이 두 줄로 보인다
      handlers.onPartial(pending);
    };

    instance.onerror = (event) => {
      if (!isFatalSttError(event.error)) return;
      stopped = true;
      clearUtteranceTimer();
      // ⚠️ 비추던 문장을 지운다 — 안 지우면 받아쓰기가 죽었는데 점선 줄이 계속 깜빡여
      //    **아직 듣고 있는 것처럼** 보인다(§정직성). 어차피 확정 안 돼 서버로도 안 간다.
      handlers.onPartial("");
      handlers.onFatal(FATAL_MESSAGE[event.error] ?? "자막을 받지 못했습니다.");
    };

    instance.onend = () => {
      if (stopped) return;

      /*
        ⚠️ **여기서도 지운다.** 확정 없이 interim만 있던 세션이 스스로 닫히면(다음 줄의
           재시작), 그 발화는 다음 세션으로 안 이어진다 — 지우지 않으면 새 세션의 첫
           interim이 이 낡은 시각을 물려받아 감시 타이머가 아직 시작도 안 한 발화를
           너무 일찍 끊는다(CodeRabbit 지적, 2026-08-16).
      */
      utteranceOpenAt = null;

      /*
        세션이 스스로 닫혔다 — 다시 연다.
        ⚠️ 연속 실패가 쌓이면 **물러서며** 연다(0.2s → 0.4s → 0.8s …, 최대 5초). 조용해서
           닫힌 정상 상황은 첫 문장이 오는 순간 `emptyRestarts`가 0으로 돌아가 지연이 사라진다.
        ⚠️ 아주 오래 실패하면 **포기하고 알린다.** 조용히 안 되는 척하지 않는다(§정직성).
      */
      emptyRestarts += 1;
      if (emptyRestarts > MAX_EMPTY_RESTARTS) {
        stopped = true;
        clearUtteranceTimer();
        handlers.onPartial("");
        handlers.onFatal("자막을 계속 받지 못했습니다. 마이크와 네트워크를 확인해 주세요.");
        return;
      }

      /*
        ⚠️ 다시 열기 전에 비춘 문장을 지운다. 세션이 닫히면 그 중간 결과는 **확정되지 않는다** —
           그대로 두면 다음 결과가 올 때까지(몇 분이든) 낡은 문장이 깜빡이며 남는다.
      */
      handlers.onPartial("");

      const delay = Math.min(200 * 2 ** (emptyRestarts - 1), 5_000);
      retryTimer = window.setTimeout(() => {
        if (!stopped) spawn();
      }, delay);
    };

    recognition = instance;

    /*
      ⚠️ `start()`는 상태가 안 맞으면 **동기 예외**를 던진다(이미 도는 세션이 남아 있을 때 등).
         `onend` 안에서 던지면 아무도 안 잡아 자동 재시작이 통째로 죽는다 — 여기서 받아
         다음 물러섬에 맡긴다.
    */
    try {
      instance.start();
    } catch {
      recognition = null;
    }
  };

  /*
    ⚠️ **`.stop()`으로 끊는다, `.abort()`가 아니다.** `stop()`은 지금까지 들은 걸 확정해서
       `onresult(isFinal)`로 돌려준 뒤 `onend`를 부른다 — `abort()`는 그 없이 즉시 버린다.
       여기서 `abort()`를 쓰면 8초 넘게 참은 말이 그대로 통째로 사라진다.
    ⚠️ **`stopped`는 안 건드린다.** 이건 우리가 의도적으로 끝내는 게 아니라 **길어서
       강제로 한 번 끊는 것**이다 — `onend`가 정상적으로 다시 여는 경로를 그대로 탄다.
  */
  const cutIfTooLong = () => {
    if (utteranceOpenAt === null) return;
    if (Date.now() - utteranceOpenAt < MAX_UTTERANCE_MS) return;
    utteranceOpenAt = null;
    recognition?.stop();
  };

  /*
    ⚠️ **종료로 가는 길이 셋이다** — 공개 `stop()`, 치명 오류(`onerror`), 재시작 포기
       (`onend`의 `MAX_EMPTY_RESTARTS` 초과) — 셋 다 여기를 거쳐야 한다. 하나라도
       빠뜨리면 그 길로 끝난 세션의 타이머가 안 멈추고 계속 돌다가, 다음 `start()`가
       새 타이머 ID로 `utteranceCheckTimer`를 덮어써서 **옛 타이머는 영영 못 지운다**
       (CodeRabbit 지적, 2026-08-16).
  */
  const clearUtteranceTimer = () => {
    utteranceOpenAt = null;
    if (utteranceCheckTimer !== null) {
      window.clearInterval(utteranceCheckTimer);
      utteranceCheckTimer = null;
    }
  };

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      emptyRestarts = 0;
      utteranceOpenAt = null;
      utteranceCheckTimer = window.setInterval(cutIfTooLong, UTTERANCE_CHECK_MS);
      spawn();
    },
    stop() {
      stopped = true;
      clearUtteranceTimer();
      handlers.onPartial("");
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
      recognition?.abort();
      recognition = null;
    },
  };
}
