// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { revalidatePath } from "next/cache";

import { createPersonalTodoAction, toggleTodoCompletionAction } from "./actions";
import { addMockTodo } from "./mock/events";

const revalidatePathMock = revalidatePath as unknown as jest.Mock;

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
};

beforeEach(() => {
  revalidatePathMock.mockClear();
});

describe("개인 Todo 작성", () => {
  it("제목·시작·끝 날짜가 있으면 성공하고 생성값을 돌려준다", async () => {
    const result = await createPersonalTodoAction(
      { errors: {} },
      form({ title: "새 할 일", date: "2026-09-01", endDate: "2026-09-01" }),
    );

    expect(result.errors).toEqual({});
    expect(result.created?.title).toBe("새 할 일");
    expect(revalidatePathMock).toHaveBeenCalledWith("/app/calendar");
  });

  it("끝 날짜가 시작 날짜보다 나중이면 여러 날에 걸친 Todo를 만든다", async () => {
    const result = await createPersonalTodoAction(
      { errors: {} },
      form({ title: "여러 날 할 일", date: "2026-09-01", endDate: "2026-09-03" }),
    );

    expect(result.errors).toEqual({});
    expect(result.created?.start).toEqual(new Date("2026-09-01T00:00:00"));
    expect(result.created?.end).toEqual(new Date("2026-09-03T00:00:00"));
  });

  it("제목이 비면 막고 revalidatePath를 안 부른다", async () => {
    const result = await createPersonalTodoAction(
      { errors: {} },
      form({ title: "", date: "2026-09-01", endDate: "2026-09-01" }),
    );

    expect(result.errors.title).toBeDefined();
    expect(result.created).toBeUndefined();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("시작 날짜가 올바르지 않으면 막는다", async () => {
    const result = await createPersonalTodoAction(
      { errors: {} },
      form({ title: "제목", date: "2026-02-30", endDate: "2026-02-30" }),
    );

    expect(result.errors.date).toBeDefined();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("끝 날짜가 시작 날짜보다 이전이면 막는다", async () => {
    const result = await createPersonalTodoAction(
      { errors: {} },
      form({ title: "제목", date: "2026-09-05", endDate: "2026-09-01" }),
    );

    expect(result.errors.endDate).toBeDefined();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("개인 Todo 완료 토글", () => {
  it("개인 Todo는 토글되고 경로를 재검증한다", async () => {
    const created = addMockTodo({ title: "토글 대상", date: "2026-09-02", endDate: "2026-09-02" });

    await toggleTodoCompletionAction(created.id);

    expect(revalidatePathMock).toHaveBeenCalledWith("/app/calendar");
  });

  // ⚠️ 개인 액션은 이 화면이 아니라 다른 화면에서 완료 처리한다 — id로 우회 요청해도 막혀야 한다.
  it("개인 액션 id는 거부한다", async () => {
    await expect(toggleTodoCompletionAction("action-1")).rejects.toThrow();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("없는 id는 거부한다", async () => {
    await expect(toggleTodoCompletionAction("존재하지-않음")).rejects.toThrow();
  });
});

// 실서버 분기에서 id를 그대로 `Number()`로 밀면 빈 문자열이 0이 되고 잘못된 요청이 나간다.
// mock 모드에선 이 검증이 걸리면 안 된다(Mock ID는 `todo-*` 문자열이라 항상 다른 실패로 걸린다).
describe("Todo 완료 토글 — 실서버 분기 id 검증", () => {
  const originalIsMock = process.env.NEXT_PUBLIC_USE_MOCK;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_USE_MOCK = "false";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_USE_MOCK = originalIsMock;
  });

  it.each([
    ["빈 문자열", ""],
    ["공백", "   "],
    ["비수치", "abc"],
    ["소수", "1.5"],
    ["0", "0"],
    ["음수", "-1"],
  ])("%s id는 BE로 나가지 않고 거부된다", async (_label, badId) => {
    jest.doMock("@/features/auth/session", () => ({
      requireAccessToken: jest.fn(async () => "token"),
    }));
    const serverApiSpy = jest.fn();
    jest.doMock("@/lib/api", () => ({ serverApi: serverApiSpy }));

    const { toggleTodoCompletionAction: liveToggle } = await import("./actions");
    await expect(liveToggle(badId)).rejects.toThrow(/올바르지 않습니다/);
    expect(serverApiSpy).not.toHaveBeenCalled();
  });

  it("숫자 문자열 id는 그대로 정수로 변환해 BE에 넘긴다", async () => {
    jest.doMock("@/features/auth/session", () => ({
      requireAccessToken: jest.fn(async () => "token"),
    }));
    const serverApiSpy = jest.fn(async () => undefined);
    jest.doMock("@/lib/api", () => ({ serverApi: serverApiSpy }));

    const { toggleTodoCompletionAction: liveToggle } = await import("./actions");
    await liveToggle("42");

    expect(serverApiSpy).toHaveBeenCalledWith(
      "/api/todos/42/complete",
      expect.objectContaining({ method: "PATCH", accessToken: "token" }),
    );
  });
});
