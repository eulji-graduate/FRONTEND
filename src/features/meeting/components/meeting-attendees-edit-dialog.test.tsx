jest.mock("../actions", () => ({ updateMeetingAttendeesAction: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AUTHORITY } from "@/constants/authority";
import type { AttendeeScopeViewer } from "@/features/rooms/attendee-scope";
import type { RoomMember } from "@/features/rooms/types";

import { MeetingAttendeesEditDialog } from "./meeting-attendees-edit-dialog";

/**
 * 참석자 교체(MEET-09) 다이얼로그 — **규칙 밖 기존 참석자를 어떻게 다루는가.**
 *
 * ⚠️ 규칙(`attendee-scope.ts`)이 생기기 전에 만든 회의에는 지금 규칙으로는 못 고르는 참석자가
 *    그대로 남아 있다(예: Owner 회의에 일반 사원). 그 사람을 화면이 알리지 않으면 host가
 *    아무것도 안 건드리고 [저장]만 눌러도 명단에서 사라진 채 성공 토스트가 뜬다(§정직성).
 * ⚠️ 알리는 일 자체는 `RoomAttendeePicker`가 하지만, **현재 명단을 피커에 넘기는 건 이 다이얼로그**다
 *    — 그 한 줄(`currentAttendeeIds`)이 빠지면 피커 테스트는 다 통과한 채 회귀가 되살아난다.
 *    그래서 여기서 잠근다.
 */

const MEMBERS: RoomMember[] = [
  { id: 1, name: "박대표", teamName: null, authority: AUTHORITY.OWNER },
  { id: 2, name: "김서준", teamName: "개발팀", authority: AUTHORITY.LEADER },
  { id: 3, name: "이하윤", teamName: "개발팀", authority: AUTHORITY.MEMBER },
];

/** 회의를 연 사람 = Owner(id 1) — 지정 가능한 참석자는 팀장뿐이다. */
const OWNER_VIEWER: AttendeeScopeViewer = { id: 1, role: AUTHORITY.OWNER, teamName: null };

async function openDialog(currentAttendeeIds: number[]) {
  const user = userEvent.setup();
  render(
    <MeetingAttendeesEditDialog
      meetingId="m1"
      currentAttendeeIds={currentAttendeeIds}
      members={MEMBERS}
      viewer={OWNER_VIEWER}
    />,
  );
  await user.click(screen.getByRole("button", { name: "참석자 수정" }));
}

it("규칙 밖 기존 참석자를 이름으로 알린다(현재 명단을 피커로 넘긴다)", async () => {
  /* 3(사원 이하윤)은 예전엔 참석자였지만 지금 규칙(Owner=팀장만)으로는 못 고른다. */
  await openDialog([1, 2, 3]);

  const notice = screen.getByText(/저장하면 명단에서 빠집니다/);
  expect(notice).toHaveTextContent("이하윤");
});

it("규칙 밖 기존 참석자는 선택 수에도 안 센다 — 세는 수와 저장되는 명단이 같다", async () => {
  await openDialog([1, 2, 3]);

  /* host(1)는 서버가 다시 끼워 넣고, 3은 규칙 밖이라 빠진다 → 남는 건 2 하나뿐이다. */
  expect(screen.getByText("선택 1명")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /김서준/ })).toBeChecked();
});

it("전부 범위 안이면 안내가 뜨지 않는다 — 매번 뜨면 문구가 배경이 된다", async () => {
  await openDialog([1, 2]);

  expect(screen.queryByText(/저장하면 명단에서 빠집니다/)).not.toBeInTheDocument();
});
