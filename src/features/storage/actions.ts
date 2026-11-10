"use server";

import { revalidatePath } from "next/cache";

import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi, toUserMessage } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { canManageStorage } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { getStorageOverview } from "./server";
import { canDeleteRecordings } from "./storage";

/**
 * 녹음 용량의 **변경 작업**. 전부 서버에서 돈다.
 *
 * ⚠️ 브라우저 → Next서버(액션) → BE 순서다(CLAUDE.md 핵심 4원칙 ②).
 * ⚠️ **되돌릴 수 없는 일이다.** 지운 음성은 복구되지 않는다 — 그래서 권한도, 지울 수 있는
 *    줄인지도 **서버에서 다시 본다**. 화면에서 버튼을 감춘 건 UX일 뿐이고, 액션은 주소만
 *    알면 직접 부를 수 있다(§권한: 화면 숨김은 보안이 아니다).
 * ⚠️ 조회(`getStorageOverview`, 2026-08-14 BE PR #494)와 삭제(`DELETE .../projects/{tag}`,
 *    #26) 둘 다 실연동됐다.
 */

/** 액션의 공통 결과 — 실패를 예외로 던지지 않고 값으로 돌려준다(화면이 문구를 고른다) */
export interface StorageActionResult {
  isSuccess: boolean;
  /** 실패 사유 한 줄. 성공이면 없다 */
  message?: string;
}

/**
 * BE 거절 코드 → 문장. [확인] BE `MeteringErrorCode`(develop).
 * ⚠️ `MT-010`은 BE 문구가 영어라 우리 문장으로 바꾼다. 나머지는 BE 한글 문구를 그대로 쓴다.
 */
const BE_ERROR_MESSAGE: Record<string, string> = {
  "MT-010": "끝난 프로젝트만 삭제할 수 있습니다",
};

const FORBIDDEN: StorageActionResult = {
  isSuccess: false,
  message: "녹음을 지울 권한이 없습니다",
};

/**
 * 권한 문지기.
 *
 * ⚠️ **던지지 않는다.** 세션을 못 읽으면 `getViewer`가 예외를 내는데, 그대로 두면 액션이
 *    거절되어 화면은 결과 대신 아무것도 못 받는다 — 못 읽으면 **권한 없음으로 본다.**
 */
async function assertCanManage(): Promise<boolean> {
  try {
    return canManageStorage(await getViewer());
  } catch {
    return false;
  }
}

/**
 * 한 프로젝트의 저장 기록을 지운다 — **음성과 자막·요약 전부.**
 *
 * ⚠️ 자막·요약도 지운다(2026-08-05 팀 결정). 보관 기한이 없는데 이것만 남기면 저장량이
 *    단조 증가해 포함량이 반드시 부족해지고 초과 요금만 계속 늘어난다.
 *    대신 **무엇을 잃는지**(회의 기록·액션 출처 추적) 화면이 분명히 말하고 나서 지운다.
 * ⚠️ **끝난 프로젝트만** 지운다. 화면에서 버튼을 감추는 것만으로는 부족해서 여기서 다시 본다.
 */
export async function deleteRecordingsAction(tag: string): Promise<StorageActionResult> {
  if (!(await assertCanManage())) return FORBIDDEN;

  /*
    ⚠️ **지울 수 있는 줄인지 서버가 판정한다.** 화면이 보낸 태그를 그대로 믿으면
       진행 중인 프로젝트의 녹음도 지워진다 — 되돌릴 수 없는 일이라 여기서 막는다.
  */
  /*
    ⚠️ **실패도 잡는다**(2026-08-15, `rooms/actions.ts`의 `getMeetingRooms()`와 같은 사고 —
       #553/#554/#556/#558). 감싸지 않으면 이 액션 전체가 죽어 페이지가 500으로 날아간다.
  */
  let overview: Awaited<ReturnType<typeof getStorageOverview>>;
  try {
    overview = await getStorageOverview();
  } catch {
    return {
      isSuccess: false,
      message: "저장소 정보를 불러오지 못했습니다 — 잠시 후 다시 시도해 주세요",
    };
  }
  const target = overview.projects.find((project) => project.tag === tag);

  if (!target) return { isSuccess: false, message: "프로젝트를 찾지 못했습니다" };
  if (!canDeleteRecordings(target)) {
    return { isSuccess: false, message: "끝난 프로젝트만 삭제할 수 있습니다" };
  }

  if (isMock) {
    /*
      ⚠️ **목에서는 `revalidatePath`를 부르지 않는다.** 목은 실제로 아무것도 안 지우므로,
         다시 읽어 오면 방금 지운 줄이 그대로 돌아와 **화면이 되돌아간다** — 눌러도 아무
         일도 안 일어난 것처럼 보인다. 지운 결과는 화면의 상태가 들고 있다.
      ⚠️ 실서버 분기만 아래에서 `revalidatePath("/manage/storage")`를 부른다.
    */
    return { isSuccess: true };
  }

  /*
    [확인] BE `CompanyStorageController.deleteProjectStorage`(develop, #26) —
    `DELETE /api/companies/me/storage/projects/{tag}`. Owner·Admin만, 끝난(DONE) 프로젝트만.
    ⚠️ **처리 중이면 409로 거절된다**(`MT-011` — 녹음·분석이 도는 중). 그 문장은 BE 한글
       문구를 그대로 보여 준다 — 사용자가 "잠시 뒤 다시"를 알아야 한다.
    ⚠️ 지워도 **구독 화면의 사용량 수치는 그대로다**(BE 동작, 민섭님 확인 2026-11-09) —
       그래서 `/manage/billing`은 다시 읽지 않는다.
  */
  try {
    const accessToken = await requireAccessToken();
    await serverApi<unknown>(ep.companyStorageProject(tag), { method: "DELETE", accessToken });
  } catch (error) {
    const known =
      error instanceof ApiError && error.code ? BE_ERROR_MESSAGE[error.code] : undefined;
    return { isSuccess: false, message: known ?? toUserMessage(error) };
  }

  revalidatePath("/manage/storage");
  return { isSuccess: true };
}
