import { AUTHORITY } from "@/constants/authority";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/mock-actor", () => ({
  getMockActor: jest.fn(() => ({ id: 1, role: AUTHORITY.OWNER })),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MeetingRoom, RoomMember, RoomProjectOption, RoomTeamActionOption } from "../types";
import { RoomReservationDialog } from "./room-reservation-dialog";

const ROOMS: MeetingRoom[] = [
  {
    id: "room-large",
    name: "대회의실",
    location: "3층 A동",
  },
];
/* ⚠️ Owner가 여는 폼이라 후보는 **팀장뿐**이다(2026-08-13, `attendee-scope.ts`) — 예전의
   박대표(OWNER)를 그대로 두면 피커에 아무도 안 떠서 이 파일의 다른 케이스가 같이 죽는다. */
const MEMBERS: RoomMember[] = [
  { id: 2, name: "김서준", teamName: "개발팀", authority: AUTHORITY.LEADER },
];
const PROJECTS: RoomProjectOption[] = [{ id: "1", name: "굿즈 프로젝트", tag: "GOODS" }];
const TEAM_ACTIONS: RoomTeamActionOption[] = [];

const SLOT_START = new Date("2026-08-11T10:00:00");

/** 개설자 = Owner(팀 없음) — 참석자 후보가 팀장으로 고정되는 쪽이다. */
const OWNER_VIEWER = { id: 1, role: AUTHORITY.OWNER, teamName: null } as const;

function renderDialog(overrides: Partial<React.ComponentProps<typeof RoomReservationDialog>> = {}) {
  const onOpenChange = jest.fn();
  const onCreated = jest.fn();
  render(
    <RoomReservationDialog
      slotStart={SLOT_START}
      onOpenChange={onOpenChange}
      rooms={ROOMS}
      members={MEMBERS}
      projects={PROJECTS}
      showParentTeamAction={false}
      teamActions={TEAM_ACTIONS}
      viewer={OWNER_VIEWER}
      onCreated={onCreated}
      {...overrides}
    />,
  );
  return { onOpenChange, onCreated };
}

describe("RoomReservationDialog", () => {
  it("slotStart가 없으면 아무것도 그리지 않는다", () => {
    render(
      <RoomReservationDialog
        slotStart={null}
        onOpenChange={jest.fn()}
        rooms={ROOMS}
        members={MEMBERS}
        projects={PROJECTS}
        showParentTeamAction={false}
        teamActions={TEAM_ACTIONS}
        viewer={OWNER_VIEWER}
        onCreated={jest.fn()}
      />,
    );

    expect(screen.queryByText("회의실 예약")).not.toBeInTheDocument();
  });

  /*
    ⚠️ 2026-08-14부터 이 값은 초기 제안일 뿐이라 정적 텍스트가 아니라 피커(버튼)로 뜬다
       (`DatePickerField`·`TimePickerField`) — 그 버튼 라벨에 클릭한 슬롯 값이 실렸는지만 본다.
  */
  it("클릭한 슬롯을 날짜·시간 피커의 초기값으로 채운다", () => {
    renderDialog();

    expect(screen.getByText("8월 11일(화)")).toBeInTheDocument();
    expect(screen.getByText("오전 10:00")).toBeInTheDocument();
    expect(screen.getByText("30분 · 즉시 확정")).toBeInTheDocument();
  });

  /*
    ⚠️ 회귀 테스트다 — `DatePickerField`·`TimePickerField`에 `name`을 안 넘기면 그 값이 hidden
       input으로 안 나가서, 화면엔 날짜·시간이 멀쩡히 보이는데 실제 제출은 "날짜를 선택해
       주세요"/"시작 시간을 선택해 주세요"로 매번 막혔다(CodeRabbit 지적, PR #547).
  */
  it("날짜·시간 값이 hidden input으로 실려 나간다(제출용)", () => {
    renderDialog();

    // ⚠️ Radix `Dialog`는 포털로 `document.body`에 그려서 `container` 안에는 없다 — 문서 전체에서 찾는다.
    expect(document.querySelector('input[name="date"]')).toHaveValue("2026-08-11");
    expect(document.querySelector('input[name="startTime"]')).toHaveValue("10:00");
  });

  it("취소를 누르면 onOpenChange(false)를 부른다", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("showParentTeamAction이 false면 상위 팀 액션 필드가 없다(Owner 개설)", () => {
    renderDialog({ showParentTeamAction: false });

    expect(screen.queryByRole("combobox", { name: "상위 팀 액션" })).not.toBeInTheDocument();
  });

  it("showParentTeamAction이 true면 상위 팀 액션 필드가 뜬다(Leader/Member 개설)", () => {
    renderDialog({ showParentTeamAction: true });

    expect(screen.getByRole("combobox", { name: "상위 팀 액션" })).toBeInTheDocument();
  });

  it("즉시 예약을 누르면 바로 등록하지 않고 확인 모달을 먼저 띄운다", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderDialog();

    await user.click(screen.getByRole("button", { name: "즉시 예약" }));

    expect(screen.getByRole("dialog", { name: "이대로 등록하시겠습니까?" })).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("확인 모달에서 취소하면 등록하지 않는다", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderDialog();

    await user.click(screen.getByRole("button", { name: "즉시 예약" }));
    // ⚠️ 본 다이얼로그의 [취소]와 이름이 같다 — 나중에(위에) 뜬 확인 모달 쪽을 고른다.
    const cancelButtons = screen.getAllByRole("button", { name: "취소" });
    await user.click(cancelButtons.at(-1)!);

    expect(
      screen.queryByRole("dialog", { name: "이대로 등록하시겠습니까?" }),
    ).not.toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("제목 입력 중 Enter로 암시적 제출이 걸려도 등록하지 않고 확인 모달을 연다", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderDialog();

    await user.type(screen.getByLabelText("회의 제목"), "새 회의{Enter}");

    // ⚠️ 이 폼은 텍스트류 입력이 여러 개(제목·안건·참석자 검색)라 실제 브라우저에서도 Enter가
    //    암시적 제출을 걸지 않는다(HTML 암시적 제출 규칙) — 그래서 위 Enter 자체로는 아직
    //    아무 일도 안 일어난다. 그 "필드 개수 우연"에 기대지 않고 가드가 실제로 동작하는지
    //    보려고, 폼의 `submit` 이벤트를 직접 걸어 브라우저가 암시적으로 제출을 시도한 경우를
    //    그대로 흉내낸다.
    const form = screen.getByLabelText("회의 제목").closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(screen.getByRole("dialog", { name: "이대로 등록하시겠습니까?" })).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("필수값을 안 채우고 확인 모달에서 예약을 누르면 필드별 오류를 보여주고 onCreated는 안 부른다", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderDialog();

    await user.type(screen.getByLabelText("회의 제목"), "새 회의");
    await user.click(screen.getByRole("button", { name: "즉시 예약" }));
    await user.click(screen.getByRole("button", { name: "예약" }));

    await waitFor(() => {
      const roomError = screen.getByText(
        (_content, element) =>
          element?.tagName === "P" && element.textContent === "회의실을 선택해 주세요",
      );
      expect(roomError).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === "P" && element.textContent === "프로젝트를 선택해 주세요",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("회의 안건(대주제·소주제)을 한 쌍 이상 입력해 주세요"),
    ).toBeInTheDocument();
    expect(screen.getByText("참석자를 한 명 이상 선택해 주세요")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
