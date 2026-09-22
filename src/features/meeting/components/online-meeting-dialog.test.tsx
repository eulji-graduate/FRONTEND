jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/mock-actor", () => ({
  getMockActor: jest.fn(() => ({ id: 1, role: "OWNER" })),
}));
jest.mock("@/features/notification/notification-provider", () => ({
  useNotificationCenter: jest.fn(() => ({ trackAnalysis: jest.fn() })),
}));

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/authority";
import type { RoomMember, RoomProjectOption, RoomTeamActionOption } from "@/features/rooms/types";

import { OnlineMeetingDialog } from "./online-meeting-dialog";

/*
  ⚠️ 이 파일은 `RoomReservationDialog`의 테스트(`room-reservation-dialog.test.tsx`)와 같은
     전제다 — `isMock`을 따로 목하지 않는다(`NEXT_PUBLIC_USE_MOCK`이 없으면 기본이 `true`라
     mock 분기가 실제로 돈다). Owner가 여는 폼이라 참석자 후보는 팀장뿐이다(2026-08-13,
     `attendee-scope.ts`).
  ⚠️ **단일 모달이다**(2026-08-14 계약 변경 — MEET-18이 녹음 정보를 요청 본문에 직접 받도록
     바뀌며 2단계 다이얼로그가 사라졌다). 목 분기는 업로드 URL 발급이 `presignedUrl: null`을
     돌려줘 브라우저 `fetch` 자체를 안 태운다 — jsdom에 `fetch`를 목할 필요가 없다.
*/
const MEMBERS: RoomMember[] = [
  { id: 2, name: "김서준", teamName: "개발팀", authority: AUTHORITY.LEADER },
];
const PROJECTS: RoomProjectOption[] = [{ id: "1", name: "굿즈 프로젝트", tag: "GOODS" }];
const TEAM_ACTIONS: RoomTeamActionOption[] = [];
const OWNER_VIEWER = { id: 1, role: AUTHORITY.OWNER, teamName: null } as const;

function renderDialog() {
  return render(
    <OnlineMeetingDialog
      members={MEMBERS}
      projects={PROJECTS}
      showParentTeamAction={false}
      teamActions={TEAM_ACTIONS}
      viewer={OWNER_VIEWER}
    />,
  );
}

async function attachRecordingFile(user: ReturnType<typeof userEvent.setup>) {
  const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(fileInput).not.toBeNull();
  const file = new File(["dummy audio content"], "recording.mp3", { type: "audio/mpeg" });
  await user.upload(fileInput!, file);
}

async function fillFormFields(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "비대면 회의" }));
  await user.type(screen.getByLabelText("회의 제목"), "새 비대면 회의");
  await user.click(screen.getByRole("combobox", { name: "프로젝트" }));
  await user.click(await screen.findByRole("option", { name: "굿즈 프로젝트" }));
  await user.type(screen.getByLabelText("안건 1 대주제"), "제품");
  await user.type(screen.getByLabelText("안건 1 소주제"), "점검");
  await user.click(screen.getByRole("checkbox", { name: /김서준/ }));
  await attachRecordingFile(user);
}

async function confirmSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "등록" }));

  // ⚠️ 확인 모달이 뜬 뒤엔 폼 안의 [등록] 버튼이 여전히 DOM에 남아 있다 — 전역으로 다시 찾으면
  //    두 개가 잡혀 모호해진다. 뜨는 걸 기다린 뒤 그 다이얼로그 안에서만 찾는다.
  const confirmDialog = await screen.findByRole("dialog", { name: "이대로 등록하시겠습니까?" });
  await user.click(within(confirmDialog).getByRole("button", { name: "등록" }));
}

describe("OnlineMeetingDialog", () => {
  it("트리거를 누르기 전에는 모달 제목이 없다", () => {
    renderDialog();

    expect(screen.queryByText("비대면 회의 만들기")).not.toBeInTheDocument();
  });

  it("[비대면 회의]를 누르면 회의실·시간 필드 없이, 녹음 파일 첨부와 함께 열린다(단일 모달)", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "비대면 회의" }));

    expect(screen.getByRole("dialog", { name: "비대면 회의 만들기" })).toBeInTheDocument();
    expect(screen.queryByLabelText("회의실")).not.toBeInTheDocument();
    expect(screen.queryByText(/시작 시간/)).not.toBeInTheDocument();
    expect(screen.getByText("녹음 파일 첨부")).toBeInTheDocument();
  });

  it("등록을 누르면 바로 등록하지 않고 확인 모달을 먼저 띄운다", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "비대면 회의" }));
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(screen.getByRole("dialog", { name: "이대로 등록하시겠습니까?" })).toBeInTheDocument();
  });

  it("제목 입력 중 Enter로 암시적 제출이 걸려도 확인 모달을 연다", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "비대면 회의" }));
    await user.type(screen.getByLabelText("회의 제목"), "새 비대면 회의{Enter}");

    const form = screen.getByLabelText("회의 제목").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByRole("dialog", { name: "이대로 등록하시겠습니까?" })).toBeInTheDocument();
  });

  it("필수값을 안 채우고 확인 모달에서 등록을 누르면 필드별 오류를 한 번에 보여준다(녹음 파일 포함)", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "비대면 회의" }));
    await user.click(screen.getByRole("button", { name: "등록" }));
    await user.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          (_content, element) =>
            element?.tagName === "P" && element.textContent === "회의 제목을 입력해 주세요",
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" && element.textContent === "프로젝트를 선택해 주세요",
      ),
    ).toBeInTheDocument();
    // ⚠️ 단일 모달이라 녹음 파일 누락도 다른 필드 오류와 같은 시점에 드러난다.
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" && element.textContent === "녹음 파일을 첨부해 주세요",
      ),
    ).toBeInTheDocument();
  });

  it("모든 필드와 녹음 파일을 채우고 등록하면 한 번에 처리되고 창이 닫힌다", async () => {
    const user = userEvent.setup();
    renderDialog();

    await fillFormFields(user);
    await confirmSubmit(user);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  /*
    ⚠️ 등록 직후부터 요약 진행 카드를 쫓아야 한다 — 서버가 등록 시점에 곧장 STT·AI 분석을
       시작해서(`MeetingService.createOnlineMeeting`), 실시간 캡처 종료와 같은 이유로
       `trackAnalysis`를 안 부르면 검토 화면으로 갈 길이 안 생긴다.
  */
  it("등록에 성공하면 요약 진행 카드를 쫓기 시작한다", async () => {
    const { useNotificationCenter } = jest.requireMock(
      "@/features/notification/notification-provider",
    ) as { useNotificationCenter: jest.Mock };
    const trackAnalysis = jest.fn();
    useNotificationCenter.mockReturnValue({ trackAnalysis });

    const user = userEvent.setup();
    renderDialog();

    await fillFormFields(user);
    await confirmSubmit(user);

    await waitFor(() => {
      expect(trackAnalysis).toHaveBeenCalledTimes(1);
    });
    expect(trackAnalysis).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  });
});
