jest.mock("../actions", () => ({ updateMeetingScheduleAction: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MeetingRoom, RoomProjectOption } from "@/features/rooms/types";

import { updateMeetingScheduleAction } from "../actions";
import { MeetingEditDialog } from "./meeting-edit-dialog";

const updateMeetingScheduleActionMock = updateMeetingScheduleAction as unknown as jest.Mock;

const ROOMS: MeetingRoom[] = [
  { id: "room-large", name: "대회의실", location: "3층 A동" },
  { id: "room-small-b", name: "소회의실 B", location: "3층 B동" },
];
const PROJECTS: RoomProjectOption[] = [
  { id: "1", name: "굿즈 쇼핑몰 앱", tag: "GOODS" },
  { id: "2", name: "브랜드 리뉴얼", tag: "BRAND" },
];

async function openDialog(
  overrides: Partial<{
    currentRecordingConsent: boolean;
  }> = {},
) {
  const user = userEvent.setup();
  render(
    <MeetingEditDialog
      meetingId="meeting-1"
      currentTitle="스프린트 계획"
      editableSlot={{ date: "2026-08-20", startTime: "10:00", meetingRoomId: "room-small-b" }}
      currentProjectId={1}
      currentRecordingConsent={overrides.currentRecordingConsent ?? false}
      rooms={ROOMS}
      projects={PROJECTS}
    />,
  );
  await user.click(screen.getByRole("button", { name: "회의 수정" }));
}

/**
 * 회의 수정(MEET-05, #436) 다이얼로그 — 제목 한 칸이던 폼이 시간·회의실·프로젝트·녹음 동의로
 * 늘어난 뒤에도 **현재 값에서 시작**하는지 확인한다. 슬롯 피커·회의실 피커 자체의 동작은
 * 회의실 예약 화면(`room-reservation-dialog.test.tsx`류)이 이미 본다 — 여기서는 이 다이얼로그가
 * 그 조각들을 올바른 초기값으로 조립해 넘기는지만 본다.
 */
describe("MeetingEditDialog — 현재 값으로 시작한다", () => {
  it("현재 제목이 입력칸 기본값이다", async () => {
    await openDialog();

    expect(screen.getByLabelText("회의 제목")).toHaveValue("스프린트 계획");
  });

  it("현재 회의실이 회의실 피커에서 선택돼 있다", async () => {
    await openDialog();

    expect(screen.getByRole("radio", { name: /소회의실 B/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: /대회의실/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("현재 프로젝트가 select 트리거에 보인다", async () => {
    await openDialog();

    expect(screen.getByRole("combobox", { name: /프로젝트/ })).toHaveTextContent("굿즈 쇼핑몰 앱");
  });

  it("녹음 동의 체크박스가 현재 값에서 시작한다", async () => {
    await openDialog({ currentRecordingConsent: true });

    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});

describe("MeetingEditDialog — 필드별 오류", () => {
  it("액션이 돌려준 필드 오류를 그 칸 밑에 보여준다", async () => {
    updateMeetingScheduleActionMock.mockResolvedValue({
      errors: { roomId: "그 시간에는 이미 예약된 회의실입니다" },
      saved: null,
    });
    const user = userEvent.setup();
    await openDialog();

    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("그 시간에는 이미 예약된 회의실입니다")).toBeInTheDocument();
  });
});
