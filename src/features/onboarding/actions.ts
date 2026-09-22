"use server";

import { revalidatePath } from "next/cache";

import { requireAccessToken } from "@/features/auth/session";
import { ApiError, serverApi, toUserMessage } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { findPayloadProblem, toOnboardingPayload } from "./mapper";
import type { DepartmentNode, Invite, Position } from "./types";

/**
 * [확인] `AU-035` — 이미 온보딩을 끝낸 회사가 커밋을 다시 시도했다(BE
 * `AuthErrorCode.ALREADY_ONBOARDED`, 409). 응답이 끊긴 뒤 재시도했을 때 실제로 나는 코드다 —
 * 이 시도가 잘못된 게 아니라 **앞선 시도가 서버에서는 이미 성공**했다는 뜻이라 일반 실패와
 * 다르게 다룬다(`use-invite-commit.ts` 참고).
 */
const ALREADY_ONBOARDED = "AU-035";

/**
 * 온보딩 커밋 창구 — 격리막(§Mock 격리막).
 *
 * 1·2·3단계 입력을 [완료]에서 **한 번에** 보낸다(`POST /api/companies/me/onboarding`,
 * [확인] BE `CompanyController.onboard`). 부서·역할·직급이 만들어지고 초대 명단은
 * **그 자리에서 계정이 된다** — 수락 단계가 없다.
 *
 * ⚠️ **한 번뿐이다.** 재호출은 409(`ALREADY_ONBOARDED`)다 — 되돌리는 경로가 없다.
 * ⚠️ 이메일이 겹치면 400이 아니라 `skipped`로 돌아온다. 조용히 버리지 말고 화면에 띄운다
 *    (§정직성) — 오너는 누가 빠졌는지 알아야 계정 발급 화면에서 다시 만든다.
 * ⚠️⚠️ **응답이 끊기면 재시도가 이 409를 실제로 밟는다**(2026-08-14 프로덕션에서 겪었다).
 *    Next↔BE 구간이 오래 걸리거나 끊기면 브라우저는 실패로 보는데 BE는 이미 처리를
 *    끝냈을 수 있다 — 그 상태에서 다시 누르면 여기로 떨어진다. `alreadyOnboarded`로
 *    구분해서 일반 실패와 다르게 다룬다(부르는 쪽 참고).
 */

export interface OnboardingCommitResult {
  ok: boolean;
  /** 실패했을 때 화면에 그대로 띄울 한 줄. `alreadyOnboarded`면 안 쓴다 */
  error?: string;
  /**
   * ⚠️ **이 회사는 이미 온보딩이 끝났다는 뜻이다** — 이번 시도가 잘못된 게 아니라, 앞선
   *    시도가 응답만 못 받고 서버에서는 이미 성공했을 뿐이다. 화면은 이걸 오류로 세우지
   *    않고 결제 단계로 그냥 넘긴다(`use-invite-commit.ts`).
   */
  alreadyOnboarded?: boolean;
  /**
   * 실제로 계정이 나간 주소 — 이 줄에만 `isSent` 도장을 찍는다.
   *
   * ⚠️ **`alreadyOnboarded`면 빈 배열이지만 "아무도 안 나갔다"는 뜻이 아니다.** 앞선
   *    시도가 실제로 몇 명을 발급하고 몇 명은 주소 중복으로 건너뛰었을 수 있는데, 그
   *    응답을 브라우저가 못 받아서 **우리는 그 결과를 영영 모른다**(재검증 API가 없다) —
   *    "빈 배열=전원 성공"으로 읽으면 안 된다(적대적 검토, 2026-08-14).
   */
  issuedEmails: string[];
  /**
   * 빠진 주소와 사유 — 확인 창이 아니라 완료 화면에서 알린다.
   * ⚠️ 위 `issuedEmails`와 같은 이유로 `alreadyOnboarded`면 빈 배열이라도 "빠진 사람 없음"을
   *    보장하지 않는다.
   */
  skipped: { email: string; reason: string }[];
}

interface OnboardingResponse {
  onboardedAt: string;
  teamCount: number;
  subTeamCount: number;
  jobPositionCount: number;
  issued: { email: string; status: string }[];
  skipped: { email: string; reason: string }[];
}

export async function commitOnboardingAction(input: {
  departments: DepartmentNode[];
  positions: Position[];
  /** 이번에 실제로 나갈 줄만 넘긴다 — 발송 판정은 화면의 `sendableInvites`가 이미 했다 */
  invites: Invite[];
}): Promise<OnboardingCommitResult> {
  const payload = toOnboardingPayload(input);

  /*
    ⚠️ 화면이 이미 걸렀더라도 **여기서 다시 본다.** 화면 검증은 편의일 뿐이고 판정은
       서버가 한다(§권한: 화면 숨김은 보안이 아니다).
  */
  const problem = findPayloadProblem(payload);
  if (problem) return { ok: false, error: problem, issuedEmails: [], skipped: [] };

  if (isMock) {
    return {
      ok: true,
      issuedEmails: payload.invites.map((invite) => invite.email),
      skipped: [],
    };
  }

  try {
    const token = await requireAccessToken();
    const data = await serverApi<OnboardingResponse>(ep.companyOnboarding(), {
      method: "POST",
      json: payload,
      accessToken: token,
      /*
        ⚠️ **기본 15초로는 부족하다**(`lib/api.ts`의 `DEFAULT_TIMEOUT_MS` 주석이 말하는
           "더 걸리는 호출"이 바로 이거다). 이 요청 하나가 부서·직급 생성뿐 아니라 초대
           인원수만큼 계정 발급 + 메일 발송까지 **동기로** 끝내고 응답한다 — 인원이 많으면
           BE는 정상적으로 계속 처리 중인데 Next 쪽에서 먼저 타임아웃으로 끊어 화면에
           실패로 뜨는 사고가 실제로 있었다. 그 직후 재시도가 `AU-035`(이미 온보딩됨)로
           떨어지는 게 그 증거다 — BE는 이미 성공했는데 응답만 못 받은 것.
      */
      timeoutMs: 60_000,
    });

    /*
      ⚠️ **온보딩이 끝나면 화면 전체를 다시 그린다**(§핵심 4원칙 ②: 변경 뒤 `revalidatePath`).
         이 한 번으로 `isOnboarded`가 뒤집히는데, 그 값을 보는 곳이 온보딩 가드
         (`guardOnboardingStep`)와 워크스페이스 셸(`guardWorkspaceEntry`) 둘이다 —
         캐시된 화면이 남아 있으면 방금 끝낸 사람이 "아직 온보딩 전"인 화면을 다시 만난다.
      ⚠️ 경로 하나가 아니라 **`layout` 통째**다. 부서·직급·계정이 한꺼번에 생겨서
         사이드바부터 사원 목록까지 다 바뀐다 — 어디를 고를지 고민할 이유가 없고,
         온보딩은 회사당 한 번뿐이라 통째로 날려도 비싸지 않다.
    */
    revalidatePath("/", "layout");

    return {
      ok: true,
      issuedEmails: data.issued.map((item) => item.email),
      skipped: data.skipped,
    };
  } catch (error) {
    const alreadyOnboarded = error instanceof ApiError && error.code === ALREADY_ONBOARDED;
    return {
      ok: false,
      // ⚠️ 이미 끝난 회사면 문구를 안 쓴다 — 부르는 쪽이 오류로 세우지 않고 넘긴다
      error: alreadyOnboarded ? undefined : toUserMessage(error),
      alreadyOnboarded,
      issuedEmails: [],
      skipped: [],
    };
  }
}
