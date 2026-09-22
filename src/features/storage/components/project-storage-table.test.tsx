import { render, screen } from "@testing-library/react";

import { PROJECT_STATUS } from "@/constants/project";

import type { ProjectStorage } from "../types";
import { ProjectStorageTable } from "./project-storage-table";

/**
 * 표가 **거짓 숫자를 말하지 않는지** 본다.
 * 지운 뒤 남은 옛 날짜, ISO 그대로 찍기 같은 것들.
 */

const project = (patch: Partial<ProjectStorage> = {}): ProjectStorage => ({
  tag: "a",
  name: "프로젝트 A",
  meetingCount: 12,
  voiceGb: 3.6,
  sttGb: 0.8,
  lastRecordedAt: "2026-05-03",
  status: PROJECT_STATUS.DONE,
  ...patch,
});

const renderTable = (projects: ProjectStorage[]) =>
  render(
    <ProjectStorageTable
      projects={projects}
      totalVoiceGb={projects.reduce((sum, p) => sum + p.voiceGb, 0)}
      canManage
      today="2026-08-05"
      onDelete={() => {}}
    />,
  );

describe("ProjectStorageTable", () => {
  it("마지막 녹음을 상대 표기로 보여 준다 — 며칠인지 세는 건 사람 몫이 아니다", () => {
    // 기준 날짜는 2026-08-05, 픽스처의 마지막 녹음은 2026-05-03이다
    renderTable([project()]);

    expect(screen.getByText("3개월 전")).toBeInTheDocument();
    expect(screen.queryByText("2026-05-03")).not.toBeInTheDocument();
  });

  it("정확한 날짜를 버리지 않는다 — `time`에 원본과 우리 표기가 함께 남는다", () => {
    renderTable([project()]);

    const recorded = screen.getByText("3개월 전");
    expect(recorded.tagName).toBe("TIME");
    expect(recorded).toHaveAttribute("dateTime", "2026-05-03");
    expect(recorded).toHaveAttribute("title", "5월 3일(일)");
  });

  it("미래 날짜는 지어내지 않고 절대 날짜로 물러선다", () => {
    renderTable([project({ lastRecordedAt: "2026-12-25" })]);

    expect(screen.getByText("12월 25일(금)")).toBeInTheDocument();
  });

  /*
    ⚠️ **본문과 툴팁이 같은 판정을 거쳐야 한다.** 전에는 없는 날짜(`2026-02-30`)를 두고
       `formatElapsed`만 검증을 안 거쳐서, 본문엔 굴러간 날짜로 계산한 `5개월 전`이 뜨고
       툴팁엔 원문 ISO가 남아 한 셀이 두 말을 했다(적대적 검토 #137).
  */
  it("없는 날짜는 지어내지도, ISO 원문을 내보이지도 않는다", () => {
    renderTable([project({ lastRecordedAt: "2026-02-30" })]);

    expect(screen.queryByText("5개월 전")).not.toBeInTheDocument();
    expect(screen.queryByText("2026-02-30")).not.toBeInTheDocument();
  });

  /*
    ⚠️ **`—`로 두면 안 된다.** 이 표에서 `—`는 `남은 게 없다`는 뜻이라, 기록이 남은 줄이
       그렇게 읽히면 같은 줄의 지우기 버튼·확인 창과 말이 어긋난다.
    ⚠️ 화면에서 감추는 것과 값을 버리는 것은 다르다 — `dateTime`에는 원본이 남아야 한다.
  */
  it("날짜만 못 읽는 줄은 `—`가 아니라 `기록일 미상`이다 — 기록은 남아 있다", () => {
    renderTable([project({ lastRecordedAt: "2026-02-30", voiceGb: 1.3, sttGb: 0.2 })]);

    const cell = screen.getByText("기록일 미상");
    expect(cell.tagName).toBe("TIME");
    expect(cell).toHaveAttribute("dateTime", "2026-02-30");
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  /*
    ⚠️ 판정 기준은 **음성 + 자막·요약**이다(`canDeleteRecordings`와 같다). 전에는 음성만
       봐서, 자막·요약이 남은 줄이 `—`(= 남은 게 없다)로 읽혔다 — 같은 줄에서 삭제 버튼은
       살아 있고 확인 창은 "자막·요약이 삭제됩니다"라고 말하는데 말이 어긋났다.
  */
  it("자막·요약만 남아 있으면 날짜를 그대로 보여 준다 — 아직 지울 게 있는 줄이다", () => {
    renderTable([project({ voiceGb: 0, meetingCount: 0, sttGb: 1.3 })]);

    expect(screen.getByText("3개월 전")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("남은 게 하나도 없으면 날짜 대신 `—`다 — 없는 기록의 날짜를 말하면 안 된다", () => {
    renderTable([project({ voiceGb: 0, sttGb: 0, meetingCount: 0 })]);

    expect(screen.queryByText("3개월 전")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
