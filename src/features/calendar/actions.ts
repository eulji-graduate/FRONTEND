"use server";

import { revalidatePath } from "next/cache";

import { requireAccessToken } from "@/features/auth/session";
import { serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { isMock } from "@/mocks/config";

import { type BeTodoResponse, toPersonalCalendarEventFromTodo } from "./mapper";
import { addMockTodo, findMockEvent, toggleMockCompletion } from "./mock/events";
import {
  CALENDAR_ITEM_TAG,
  type PersonalCalendarEvent,
  type PersonalTodoDraft,
  type PersonalTodoFormErrors,
} from "./types";
import { validatePersonalTodoDraft } from "./validate";

const CALENDAR_PATH = "/app/calendar";

/** Todo 작성 폼 결과 — `useActionState`가 그대로 들고 있는 모양. */
export interface PersonalTodoFormState {
  errors: PersonalTodoFormErrors;
  /** 생성 성공 시 서버 확정값(id 등) — 화면은 재조회 없이 이 값을 바로 반영한다(비관적 갱신 최적화). */
  created?: PersonalCalendarEvent;
}

function readDraft(formData: FormData): PersonalTodoDraft {
  return {
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
}

/**
 * 개인 Todo 추가 — 격리막(CLAUDE.md §Mock 격리막).
 * ⚠️ 액션(PERSONAL_ACTION)은 여기서 만들지 않는다 — 액션은 AI가 회의 요약으로만 생성한다.
 *    이 액션이 다루는 건 사용자가 직접 쓰는 Todo뿐이다.
 * ⚠️ 리턴값에 생성된 이벤트를 실어 보낸다 — 모달은 이 값을 받는 즉시 로컬 상태에 반영하고,
 *    `revalidatePath`는 다른 화면(사이드바 등)의 정합성만 백그라운드로 맞춘다.
 */
export async function createPersonalTodoAction(
  _prev: PersonalTodoFormState,
  formData: FormData,
): Promise<PersonalTodoFormState> {
  const draft = readDraft(formData);
  const errors = validatePersonalTodoDraft(draft);
  if (Object.keys(errors).length > 0) return { errors };

  if (!isMock) {
    const accessToken = await requireAccessToken();
    const be = await serverApi<BeTodoResponse>(ep.todos(), {
      method: "POST",
      accessToken,
      json: { title: draft.title.trim(), date: draft.date, endDate: draft.endDate },
    });
    revalidatePath(CALENDAR_PATH);
    return { errors: {}, created: toPersonalCalendarEventFromTodo(be) };
  }

  const created = addMockTodo(draft);
  revalidatePath(CALENDAR_PATH);
  return { errors: {}, created };
}

/**
 * Todo 완료 토글.
 * ⚠️ PERSONAL_ACTION의 완료 여부는 보드(액션 도메인)에서 상태를 바꿀 때 따라온다 — 화면이
 *    PERSONAL_TODO id만 보낸다고 가정하지 않고, **여기서도 다시 확인**한다(태그가 다르면 거부).
 */
export async function toggleTodoCompletionAction(id: string): Promise<void> {
  if (!isMock) {
    /*
      ⚠️ 여기서 태그를 다시 검증하지 않는다 — 이 화면에서 넘어오는 id는 항상 TODO다(ACTION은
      이 피드에서 id 자체가 없다, `mapper.ts`). BE도 본인 소유 TODO가 아니면 CAL-001(404)로
      거부한다([확인] BE PL 가이드).
    */
    const numericId = id.trim() === "" ? NaN : Number(id);
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      throw new Error("id가 올바르지 않습니다");
    }

    const accessToken = await requireAccessToken();
    await serverApi<unknown>(ep.todoComplete(numericId), {
      method: "PATCH",
      accessToken,
    });
    revalidatePath(CALENDAR_PATH);
    return;
  }

  const target = findMockEvent(id);
  if (!target || target.tag !== CALENDAR_ITEM_TAG.PERSONAL_TODO) {
    throw new Error("개인 Todo만 완료 처리할 수 있습니다");
  }

  toggleMockCompletion(id);
  revalidatePath(CALENDAR_PATH);
}
