"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { FLASH_TOAST_PARAM } from "@/constants/flash-toast";
import { requireAccessToken } from "@/features/auth/session";
import { getViewer } from "@/features/shell/viewer";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { getMockActor } from "@/lib/mock-actor";
import { canManageNotice } from "@/lib/permission";
import { isMock } from "@/mocks/config";

import {
  type BeCreateNoticeResponse,
  type BeNotice,
  toCreatedNotice,
  toCreateNoticePayload,
  toNotice,
} from "./mapper";
import { addMockNotice, deleteMockNotice, updateMockNotice } from "./mock/notices";
import type { Notice, NoticeDraft, NoticeFormErrors } from "./types";
import { validateNoticeDraft } from "./validate";

/**
 * 작성·수정 API 실패를 폼 필드 오류로 바꾼다(NOTI-03·04 공통).
 * ⚠️ 이 폼엔 "전체 오류"를 보여줄 별도 자리가 없다 — `rooms`의 `toMeetingRoomFormErrors`와
 *    같은 이유로 필드 슬롯이 없는 오류는 `title` 칸에 얹는다.
 */
function toNoticeFormErrors(error: unknown): NoticeFormErrors {
  if (!(error instanceof ApiError)) throw error;

  switch (error.code) {
    case "NT-001":
      return { title: "수정할 공지를 찾을 수 없습니다" };
    case "NT-002":
      return { title: "공지를 작성·수정할 권한이 없습니다" };
    default:
      return { title: error.message };
  }
}

const LIST_PATH = "/app/notice";

/**
 * 작성·수정 폼 결과 — `useActionState`가 그대로 들고 있는 모양.
 * ⚠️ 성공하면 `redirect` 대신 `notice`로 결과를 돌려준다 — 모달(`NoticeCreateDialog`·
 *    `NoticeEditDialog`)이 페이지 이동 없이 이 값을 보고 스스로 닫힌다(캘린더
 *    `PersonalTodoFormState.created`와 같은 패턴).
 */
export interface NoticeFormState {
  errors: NoticeFormErrors;
  notice?: Notice;
}

function readDraft(formData: FormData): NoticeDraft {
  return {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  };
}

/**
 * 공지 작성 — 격리막(CLAUDE.md §Mock 격리막).
 * ⚠️ **권한을 서버에서 다시 본다** — 화면 숨김은 UX일 뿐 보안이 아니다(§권한). 지금은 목 actor다.
 * ⚠️ 화면과 **같은 함수**(`validateNoticeDraft`)로 다시 검증한다 — 규칙이 두 벌이면 어긋난다.
 */
export async function createNoticeAction(
  _prev: NoticeFormState,
  formData: FormData,
): Promise<NoticeFormState> {
  const actor = isMock ? getMockActor() : await getViewer();
  if (!canManageNotice(actor)) return { errors: { title: "공지를 작성할 권한이 없습니다" } };

  const draft = readDraft(formData);
  const errors = validateNoticeDraft(draft);
  if (Object.keys(errors).length > 0) return { errors };

  if (!isMock) {
    const accessToken = await requireAccessToken();
    try {
      const { noticeId } = await serverApi<BeCreateNoticeResponse>(ep.notices(), {
        method: "POST",
        accessToken,
        json: toCreateNoticePayload(draft),
      });
      revalidatePath(LIST_PATH);
      return { errors: {}, notice: toCreatedNotice(noticeId, draft) };
    } catch (error) {
      return { errors: toNoticeFormErrors(error) };
    }
  }

  // "YYYY-MM-DD" — 발행일은 서버 기준으로 찍는다(목 데이터는 날짜를 만들지 않는다).
  const publishedAt = new Date().toISOString().slice(0, 10);
  const notice = addMockNotice(draft, publishedAt);

  // 목록은 다음 방문 때를 위한 백그라운드 정합성용 — 화면 반영은 아래 `notice` 반환값이 맡는다.
  revalidatePath(LIST_PATH);
  return { errors: {}, notice };
}

/** 공지 수정 — 작성과 같은 규칙. 끝나면 그 공지 상세로 돌아간다. */
export async function updateNoticeAction(
  _prev: NoticeFormState,
  formData: FormData,
): Promise<NoticeFormState> {
  const actor = isMock ? getMockActor() : await getViewer();
  if (!canManageNotice(actor)) return { errors: { title: "공지를 수정할 권한이 없습니다" } };

  const id = String(formData.get("id") ?? "");
  const draft = readDraft(formData);
  const errors = validateNoticeDraft(draft);
  if (Object.keys(errors).length > 0) return { errors };

  if (!isMock) {
    const accessToken = await requireAccessToken();
    try {
      const be = await serverApi<BeNotice>(ep.notice(Number(id)), {
        method: "PUT",
        accessToken,
        json: toCreateNoticePayload(draft),
      });
      revalidatePath(LIST_PATH);
      revalidatePath(`${LIST_PATH}/${id}`);
      return { errors: {}, notice: toNotice(be) };
    } catch (error) {
      return { errors: toNoticeFormErrors(error) };
    }
  }

  const updated = updateMockNotice(id, draft);
  if (!updated) return { errors: { title: "수정할 공지를 찾을 수 없습니다" } };

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return { errors: {}, notice: updated };
}

/**
 * 공지 삭제(`DELETE /api/notices/{noticeId}`, NOTI-05) — 격리막(CLAUDE.md §Mock 격리막).
 * ⚠️ 되돌릴 수 없는 조작이라 화면(`NoticeDeleteButton`)에서 확인 Dialog를 먼저 띄운 뒤에만 이 폼이
 *    제출된다(§토스트: 파괴적 작업은 Dialog). 여기서도 **권한을 다시 본다**(§권한: 서버 재검사).
 * ⚠️ **재호출을 성공으로 감싸지 않는다**(문서 규칙 — `rooms`의 `MR-001` 멱등 처리와 다르다).
 *    이미 지운 공지를 다시 지우면 BE가 `NT-001`(404)을 그대로 준다 — 지워진 건지 애초에
 *    없었는지 화면이 구분 못 하게 만들면 안 되므로, `ApiError`를 조용히 삼키지 않고
 *    그대로 던져 가장 가까운 `error.tsx`가 받게 둔다. `NoticeDeleteButton`엔 오류 슬롯이
 *    없어(파괴적 삭제라 재시도 UI가 필요 없다고 판단, ROOM-05와 다른 지점) 이 방식이 맞다.
 */
export async function deleteNoticeAction(formData: FormData): Promise<void> {
  const actor = isMock ? getMockActor() : await getViewer();
  if (!canManageNotice(actor)) {
    throw new Error("공지를 삭제할 권한이 없습니다");
  }

  const id = String(formData.get("id") ?? "");

  if (!isMock) {
    const accessToken = await requireAccessToken();
    await serverApi<null>(ep.notice(Number(id)), { method: "DELETE", accessToken });
    revalidatePath(LIST_PATH);
    redirect(`${LIST_PATH}?${FLASH_TOAST_PARAM}=NOTICE_DELETED`);
  }

  deleteMockNotice(id);

  revalidatePath(LIST_PATH);
  /*
    ⚠️ `redirect`는 내부적으로 예외를 던진다 — try/catch 밖에 둔다(§렌더링·데이터).
    ⚠️ **지웠다는 말을 주소에 실어 보낸다.** 상세가 사라지고 목록으로 튕기는 조작이라,
       아무 말도 없으면 지워진 건지 화면이 튄 건지 알 수 없다(§토스트).
  */
  redirect(`${LIST_PATH}?${FLASH_TOAST_PARAM}=NOTICE_DELETED`);
}
