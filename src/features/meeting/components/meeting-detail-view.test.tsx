import { render, screen, within } from "@testing-library/react";

import { AUTHORITY } from "@/constants/authority";
import type { AttendeeScopeViewer } from "@/features/rooms/attendee-scope";
import type { RoomMember } from "@/features/rooms/types";

import type { MeetingDetail } from "../view-types";
import { MeetingDetailView } from "./meeting-detail-view";

/**
 * 비대면 회의(이슈 #473) — 발치 레일과 발화 기록 칸이 `isOnline`으로 갈리는지 본다.
 * ⚠️ `pendingReason: null`(요약까지 끝난 상태)로 고정한다 — 그래야 [회의 수정]·[회의 취소]·
 *    [참석자 수정] 다이얼로그(`canEditMeeting` 등이 전부 `pendingReason === "SCHEDULED"`
 *    일 때만 연다)가 안 뜨고, 이 화면이 순수하게 데이터만 읽는 형태로 렌더된다.
 */
const MEMBERS: RoomMember[] = [
  { id: 1, name: "박대표", teamName: null, authority: AUTHORITY.OWNER },
];
const VIEWER: AttendeeScopeViewer = { id: 1, role: AUTHORITY.OWNER, teamName: null };

const BASE: MeetingDetail = {
  id: "meeting-1",
  title: "굿즈 앱 킥오프",
  projectId: 1,
  projectTag: "GOODS",
  originLabel: "Owner 개설",
  parentTeamActionHref: null,
  agenda: { main: "프로젝트", subs: ["킥오프"] },
  schedule: "8월 14일(금) 10:00 – 10:30",
  roomName: "대회의실",
  attendees: [{ id: 1, name: "박대표", isResigned: false }],
  outputKindLabel: "팀 액션",
  outputs: [],
  script: [],
  pendingReason: null,
  pendingActionCount: 0,
  isStalled: false,
  isHost: true,
  isOnline: false,
  recordingConsent: false,
  editableSlot: null,
};

function renderDetail(patch: Partial<MeetingDetail> = {}) {
  render(
    <MeetingDetailView
      detail={{ ...BASE, ...patch }}
      members={MEMBERS}
      viewer={VIEWER}
      rooms={[]}
      projects={[]}
    />,
  );
}

describe("MeetingDetailView — 비대면 회의(isOnline)", () => {
  it("대면 회의는 발치 레일에 일시·장소를 그대로 보여준다", () => {
    renderDetail({ isOnline: false });

    expect(screen.getByText("8월 14일(금) 10:00 – 10:30")).toBeInTheDocument();
    expect(screen.getByText("대회의실")).toBeInTheDocument();
    expect(screen.queryByText("온라인으로 진행된 회의입니다")).not.toBeInTheDocument();
  });

  it("비대면 회의는 발치 레일의 일시·장소 대신 안내 한 줄을 보여준다", () => {
    renderDetail({ isOnline: true, schedule: "", roomName: "" });

    expect(screen.getByText("온라인으로 진행된 회의입니다")).toBeInTheDocument();
    expect(screen.queryByText("대회의실")).not.toBeInTheDocument();
  });

  it("비대면 회의는 발화 기록 칸에 항상 안내만 뜬다 — 스크립트가 있어도 안 보여준다", () => {
    renderDetail({
      isOnline: true,
      schedule: "",
      roomName: "",
      script: [{ at: "10:00", text: "이 텍스트는 화면에 뜨면 안 된다" }],
    });

    expect(screen.getByText("온라인으로 진행된 회의입니다.")).toBeInTheDocument();
    expect(screen.getByText("비대면 회의는 발화 기록을 남기지 않습니다.")).toBeInTheDocument();
    expect(screen.queryByText("이 텍스트는 화면에 뜨면 안 된다")).not.toBeInTheDocument();
  });

  it("비대면 회의는 pendingReason이 있어도 발화 기록 칸은 안내가 우선한다", () => {
    renderDetail({
      isOnline: true,
      schedule: "",
      roomName: "",
      pendingReason: "SUMMARIZING",
      script: null,
    });

    // ⚠️ "요약 중" 문구 자체는 산출물(하달된 액션) 칸에도 그대로 뜬다 — 그 칸은 이 이슈의
    //    범위 밖이라 손대지 않는다(WORKFLOW: "AI 분배는 온라인 회의 전용 분기 없음"). 그래서
    //    페이지 전체가 아니라 **발화 기록 섹션 안**만 좁혀서 본다.
    const scriptHeading = screen.getByRole("heading", { name: "발화 기록" });
    const scriptSection = scriptHeading.closest("section");
    expect(scriptSection).not.toBeNull();

    expect(
      within(scriptSection!).getByText("비대면 회의는 발화 기록을 남기지 않습니다."),
    ).toBeInTheDocument();
    expect(
      within(scriptSection!).queryByText("회의 내용을 요약하고 있습니다."),
    ).not.toBeInTheDocument();
  });

  it("대면 회의는 발화 기록이 없으면 미연동 안내를 보여준다(회귀 방지)", () => {
    renderDetail({ isOnline: false, script: null });

    expect(screen.getByText("발화 기록을 아직 표시할 수 없습니다.")).toBeInTheDocument();
  });
});
