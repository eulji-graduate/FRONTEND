jest.mock("../actions", () => ({ deleteMeetingRoomAction: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { deleteMeetingRoomAction } from "../actions";
import type { MeetingRoom } from "../types";
import { RoomDeleteDialog } from "./room-delete-dialog";

/**
 * 회의실 삭제 확인 창 — **되돌릴 수 없는 일이 막혔을 때 무엇을 말하는가.**
 *
 * ⚠️ 이 액션은 실패를 값이 아니라 **`throw`로만** 알린다(권한 없음·미연동 포함) —
 *    잡지 않으면 지워지지도 않았는데 "삭제했습니다"라고 말하거나 화면이 통째로 죽는다.
 */

const deleteMock = deleteMeetingRoomAction as unknown as jest.Mock;

const ROOM: MeetingRoom = {
  id: "r1",
  name: "대회의실",
  location: "3층 A동",
};

function renderDialog() {
  const onOpenChange = jest.fn();
  render(<RoomDeleteDialog room={ROOM} open onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

beforeEach(() => {
  deleteMock.mockReset();
});

it("실패하면 창을 열어 둔 채 그 안에 사유를 남긴다", async () => {
  const user = userEvent.setup();
  deleteMock.mockRejectedValue(new Error("회의실을 삭제할 권한이 없습니다"));
  const { onOpenChange } = renderDialog();

  await user.click(screen.getByRole("button", { name: "삭제" }));

  /*
    ⚠️ **토스트로만 알리지 않는다.** 토스트는 몇 초 뒤 사라지는데 확인 창은 그대로 떠 있어서,
       뒤늦게 본 사람은 아무 일도 안 일어난 줄 알고 같은 [삭제]를 다시 누른다(§토스트는 보조다).
  */
  expect(await screen.findByRole("alert")).toHaveTextContent("회의실을 삭제하지 못했습니다");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  // 창을 닫지 않는다 — 닫으면 무엇이 막혔는지 볼 자리가 사라진다
  expect(onOpenChange).not.toHaveBeenCalledWith(false);
});

it("성공하면 창을 닫는다", async () => {
  const user = userEvent.setup();
  deleteMock.mockResolvedValue(undefined);
  const { onOpenChange } = renderDialog();

  await user.click(screen.getByRole("button", { name: "삭제" }));

  expect(onOpenChange).toHaveBeenCalledWith(false);
});
