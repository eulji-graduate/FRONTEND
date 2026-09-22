jest.mock("@/features/meeting/actions", () => ({
  getMeetingSummaryAction: jest.fn(),
  updateMeetingAction: jest.fn(),
  cancelMeetingAction: jest.fn(),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  cancelMeetingAction,
  getMeetingSummaryAction,
  type MeetingSummary,
} from "@/features/meeting/actions";

import { RoomMeetingDetailDialog } from "./room-meeting-detail-dialog";

const SUMMARY: MeetingSummary = {
  id: "meeting-1",
  title: "주간 스크럼",
  schedule: "8월 15일(토) 10:00~10:30",
  roomName: "대회의실",
  attendees: [{ id: 1, name: "김서준", isResigned: false }],
  agenda: null,
  isHost: true,
  pendingReason: "SCHEDULED",
};

describe("RoomMeetingDetailDialog", () => {
  beforeEach(() => {
    jest.mocked(getMeetingSummaryAction).mockResolvedValue({ kind: "ok", summary: SUMMARY });
  });

  // ⚠️ 개설자(host)가 시작 전(SCHEDULED) 회의를 열면 [수정]뿐 아니라 [회의 취소]도 나와야 한다
  //    (회의실 개설 모달과 같은 수정/삭제 흐름, 2026-08-15).
  it("개설자가 열면 [회의 취소]를 눌러 회의를 취소할 수 있고, 성공하면 onCancelled가 불린다", async () => {
    jest.mocked(cancelMeetingAction).mockResolvedValue({ error: null });
    const onCancelled = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();

    render(
      <RoomMeetingDetailDialog
        meetingId="meeting-1"
        onOpenChange={onOpenChange}
        onTitleUpdated={jest.fn()}
        onCancelled={onCancelled}
      />,
    );

    const cancelButton = await screen.findByRole("button", { name: "회의 취소" });
    await user.click(cancelButton);

    const confirmDialog = await screen.findByRole("dialog", { name: "이 회의를 취소할까요?" });
    await user.click(within(confirmDialog).getByRole("button", { name: "회의 취소" }));

    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith("meeting-1"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("개설자가 아니면 [회의 취소] 버튼이 없다", async () => {
    jest.mocked(getMeetingSummaryAction).mockResolvedValue({
      kind: "ok",
      summary: { ...SUMMARY, isHost: false },
    });

    render(
      <RoomMeetingDetailDialog
        meetingId="meeting-1"
        onOpenChange={jest.fn()}
        onTitleUpdated={jest.fn()}
        onCancelled={jest.fn()}
      />,
    );

    await screen.findByText(SUMMARY.title);
    expect(screen.queryByRole("button", { name: "회의 취소" })).not.toBeInTheDocument();
  });

  // ⚠️ 회귀 방지 — 제목·안건이 길면 `truncate`가 안 먹혀 참석자(260px) 칸을 밀어내던 버그.
  //    부모(그리드 칸·ReadOnlyField 래퍼)에 `min-w-0`이 없으면 flex/grid 기본값(`min-width: auto`)
  //    때문에 안쪽 `truncate`가 무력화된다 — 그 min-w-0이 계속 붙어 있는지를 잠근다.
  // ⚠️ **안건도 함께 잠근다**(코드리뷰 반영, #668) — `agenda`를 `null`로 두면 이 필드
  //    자체가 안 렌더돼 회귀를 못 잡는다. 그리드 왼쪽 칸(`sm:grid-cols-[1fr_260px]`의
  //    1fr 칸)의 `min-w-0`도 제목 값 칸의 조부모로 올라가 직접 확인한다 — 이게 없으면
  //    안쪽 `ReadOnlyField`가 다 `min-w-0`이어도 그리드 칸 자체가 안 줄어든다.
  it("회의 제목·안건이 길어도 잘리고, 참석자 칸을 밀어내지 않게 min-w-0을 유지한다", async () => {
    const longTitle =
      "Q3 런칭 준비 중간 진척 상황 점검 및 개발팀 API 진척과 다음 마일스톤, 마케팅 캠페인 소재 진행 상황 공유 회의입니다";
    const longAgenda =
      "2026년 3분기 신규 런칭 관련 개발·디자인·마케팅 전 부서 진행 상황 공유 및 이슈 트래킹";
    jest.mocked(getMeetingSummaryAction).mockResolvedValue({
      kind: "ok",
      summary: { ...SUMMARY, title: longTitle, agenda: { main: longAgenda, subs: [] } },
    });

    render(
      <RoomMeetingDetailDialog
        meetingId="meeting-1"
        onOpenChange={jest.fn()}
        onTitleUpdated={jest.fn()}
        onCancelled={jest.fn()}
      />,
    );

    const titleBox = await screen.findByTitle(longTitle);
    expect(titleBox).toHaveClass("truncate");
    expect(titleBox.parentElement).toHaveClass("min-w-0");

    const agendaBox = await screen.findByTitle(longAgenda);
    expect(agendaBox).toHaveClass("truncate");
    expect(agendaBox.parentElement).toHaveClass("min-w-0");

    // 제목 값 칸 → ReadOnlyField 래퍼 → 그리드 왼쪽 칸
    const gridColumn = titleBox.parentElement?.parentElement;
    expect(gridColumn).toHaveClass("min-w-0");
  });
});
