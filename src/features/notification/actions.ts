"use server";

import { isProcessingStatus, PROCESSING_STATUS } from "@/constants/meeting";
import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import type { AnalysisProbe } from "./analysis";

/**
 * 요약 진행 조회 창구(CAP-06) — 격리막(§Mock → Live 격리막).
 *
 * ⚠️ **왜 조회를 액션으로 하나.** 조회는 서버 컴포넌트가 하는 게 원칙이지만(§핵심 4원칙 ①),
 *    이건 **화면을 옮겨 다니는 동안 계속 물어보는 값**이라 그릴 화면이 없다. 라우트 핸들러를
 *    하나 더 파는 대신 액션으로 둔다 — 토큰이 브라우저로 안 나가는 건 똑같다(§4원칙 ②).
 * ⚠️ **BE 응답을 그대로 흘리지 않는다.** 카드가 쓰는 건 `status` 하나뿐이라, 계층·구멍·토큰
 *    같은 나머지 칸은 여기서 버린다 — 컴포넌트가 BE shape을 알면 모양이 바뀔 때 화면을 고친다.
 * ⚠️ **던지지 않는다.** 5초마다 부르는 호출이 예외를 던지면 훅이 그때마다 잡아야 하고,
 *    한 번 실패한 것과 세 번 연속 실패한 것을 가릴 수 없다 — 실패도 값으로 돌려준다.
 */

/** [확인] BE `AnalysisController.getProcessingStatus` — `ProcessingStatusResponse` */
interface ProcessingStatusApiResponse {
  status: string;
}

/**
 * @param meetingId 화면이 쓰는 문자열 id(라우트 `[meetingId]`와 같은 값). **숫자로 바꾸는 건
 *                  여기, BE 경로를 만들 때뿐이다** — 화면이 들고 다니는 값이 숫자면 목 id
 *                  (`meeting-3`)가 `NaN`이 된다(`types.ts` 주석).
 * @param attempt 몇 번째 조회인지 — **목에서만** 쓴다(진행하는 척을 시간이 아니라 횟수로 만든다).
 *                실서버에서는 무시된다.
 */
export async function fetchAnalysisStatusAction(
  meetingId: string,
  attempt: number,
): Promise<AnalysisProbe> {
  if (isMock) {
    /*
      ⚠️ **목에서는 서버를 안 부른다**(스트림도 안 연다 — `use-notification-stream`).
         그렇다고 「요약 중」에 굳혀 두면 목으로 도는 개발·데모에서 이 카드가 **끝나는 걸
         아무도 못 본다** — 회의를 끝내도 검토 화면으로 갈 길이 안 생긴다.
         그래서 두 번 물어본 뒤 완료로 넘긴다(5초 간격 × 2 ≈ 10초).
      ⚠️ **`attempt`는 0부터 온다** — 첫 조회가 0, 두 번째가 1이다(`startTracking`이 0으로
         시작하고 `advance`가 응답 뒤에 올린다). 그래서 두 번째를 완료로 만드는 조건은
         `>= 1`이다. `>= 2`로 두면 세 번째(약 15초)라 위에 적은 시나리오와 어긋난다.
      ⚠️ 실패 카드는 목으로 못 본다 — 실패를 섞어 넣으면 데모 때마다 무작위로 깨진 것처럼
         보인다. 실패 모양은 테스트(`analysis.test.ts`)가 지킨다.
    */
    return { ok: true, status: attempt >= 1 ? PROCESSING_STATUS.DONE : PROCESSING_STATUS.RUNNING };
  }

  try {
    const accessToken = await requireAccessToken();
    /* ⚠️ 경로에 들어갈 때만 숫자다 — `getLiveMeetingCapture`의 `ep.meeting(Number(id))`와 같다 */
    const response = await serverApi<ProcessingStatusApiResponse>(
      ep.processingStatus(Number(meetingId)),
      { accessToken },
    );
    /*
      ⚠️ **모르는 값은 실패로 본다.** BE가 새 상태를 늘렸는데 우리가 임의로 「요약 중」이나
         「완료」로 접으면 화면이 사실이 아닌 말을 한다 — 못 읽었다고 말하는 편이 낫다.
    */
    if (!isProcessingStatus(response.status)) return { ok: false };
    return { ok: true, status: response.status };
  } catch {
    return { ok: false };
  }
}
