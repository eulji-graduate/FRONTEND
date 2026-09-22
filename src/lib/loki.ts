import "server-only";

/**
 * Loki push 창구 — 모니터링 서버(z-loki)로 로그를 직접 올린다.
 *
 * ⚠️ **로그 전송 실패가 요청을 깨면 안 된다.** 모니터링 서버가 잠깐 죽어도 사용자가 보는 화면은
 *    멀쩡해야 한다 — 그래서 실패를 던지지 않고 조용히 삼킨다(§정직성: 로그는 부가 기능이지
 *    핵심 경로가 아니다).
 * ⚠️ **프라이빗 IP로 붙는다.** 같은 VPC 안이라 퍼블릭 IP로 나갔다 들어오면 보안그룹의
 *    SG 참조 규칙이 매칭 안 될 수 있다(2026-08-13 실측 확인) — 반드시 프라이빗 IP를 쓴다.
 * ⚠️ `LOKI_URL`은 서버 전용이라 `NEXT_PUBLIC_`을 안 붙인다 — 브라우저에 나갈 값이 아니다.
 * ⚠️ **`after()`로 응답 뒤까지 살려 둔다.** 서버리스 실행 환경은 응답을 보내는 순간 함수를
 *    끊을 수 있어, `await` 없이 던진 fetch가 중간에 잘릴 수 있다 — Next의 `after`가 요청
 *    수명을 로그 전송이 끝날 때까지 늘려 준다.
 * ⚠️ **`next/server`는 함수 안에서 늦게 불러온다.** 모듈 최상단에서 부르면 이 파일을 불러오는
 *    모든 테스트가 (실제로 로그를 보내지 않아도) Next의 요청 폴리필을 물게 된다 — 호출 시점까지
 *    미루면 `pushLokiLog`를 아예 안 부르는 경로는 영향이 없다.
 * ⚠️ **HTTP 4xx/5xx도 실패로 본다.** `fetch`는 상태 코드가 나빠도 거부하지 않으므로
 *    `response.ok`를 직접 확인해 catch로 흘려 보낸다 — 그래야 조용한 유실을 안 만든다.
 */
const LOKI_URL = process.env.LOKI_URL ?? "http://172.31.41.26:3100";

/**
 * 한 번의 push에 허용하는 상한.
 *
 * ⚠️ **짧게 잡는다.** 로그는 부가 기능이라, Loki가 굳었을 때 요청 스코프까지 오래 붙잡고 있으면
 *    응답 뒤 실행 시간이 낭비된다 — 2초면 정상 응답에 넉넉하고 장애 시엔 곧 접힌다.
 */
const LOKI_TIMEOUT_MS = 2000;

type LogLevel = "info" | "warn" | "error";

/**
 * 로그 한 줄을 Loki push API 포맷으로 감싸 보낸다.
 *
 * ⚠️ **타임스탬프는 나노초 문자열이다.** Loki push API 스펙이 그렇게 정해져 있다 — 밀리초를
 *    그대로 보내면 Loki가 1970년대 로그로 착각한다.
 * ⚠️ **`meta`는 JSON으로 직렬화해 한 줄에 욱여넣는다.** 라벨(`stream`)에 자유 필드를 넣으면
 *    값마다 라벨 카디널리티가 늘어 Loki가 무거워진다 — 검색 가능한 축(`job`·`level`)만
 *    라벨로 두고, 나머지는 로그 본문 안에 둔다.
 */
export function pushLokiLog(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const nowNs = `${Date.now()}000000`;
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;

  const body = {
    streams: [
      {
        stream: { job: "z-frontend", level },
        values: [[nowNs, line]],
      },
    ],
  };

  const send = fetch(`${LOKI_URL}/loki/api/v1/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LOKI_TIMEOUT_MS),
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`[loki] push 실패: ${response.status}`);
    }
  });

  /*
    ⚠️ **실패는 삼킨다.** 부가 기능이라 예외가 원 요청을 깨면 안 된다 — 던지지 않는 대신
       Loki가 죽어도 관측을 잃을 뿐 사용자 화면은 멀쩡하다.
  */
  const guarded = send.catch(() => {});

  /*
    ⚠️ **요청 스코프가 없는 환경(테스트·비-Next 런타임)에서는 `after()`가 던진다** — 그때는
       그냥 붙잡지 말고 흘려 보낸다. fetch 자체는 이미 발사됐다.
  */
  import("next/server")
    .then(({ after }) => after(guarded))
    .catch(() => {
      // 요청 스코프가 없는 실행 환경 — 전송 자체는 이미 시작됐으니 그대로 둔다.
    });
}
