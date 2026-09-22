jest.mock("./actions", () => ({ fetchAnalysisStatusAction: jest.fn() }));
jest.mock("@/features/meeting/summary/actions", () => ({
  retryMeetingSummaryAction: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { PROCESSING_STATUS } from "@/constants/meeting";
import { retryMeetingSummaryAction } from "@/features/meeting/summary/actions";

import { fetchAnalysisStatusAction } from "./actions";
import { ANALYSIS_POLL_INTERVAL_MS } from "./analysis";
import { NotificationProvider, useNotificationCenter } from "./notification-provider";

/*
  ⚠️ **`retryFailedSummary`는 `retryAnalysis`와 다른 함수다** — 이 파일은 그 차이를 지킨다.
     `retryAnalysis`(상태 재조회)는 이미 `analysis.test.ts`의 `restart` 테스트가 다루므로,
     여기서는 **ANLZ-02를 실제로 부르고 그 결과에 따라 트래킹을 되돌리는지**만 검증한다.
*/

const mockedFetchStatus = fetchAnalysisStatusAction as jest.Mock;
const mockedRetry = retryMeetingSummaryAction as jest.Mock;
const mockedToast = toast as unknown as jest.Mock & { error: jest.Mock };

function TestConsumer() {
  const { tracking, trackAnalysis, retryFailedSummary } = useNotificationCenter();
  return (
    <div>
      <button onClick={() => trackAnalysis("meeting-1", "주간 회의")}>start</button>
      <button onClick={() => void retryFailedSummary()}>retry</button>
      <span data-testid="state">{tracking?.state ?? "NONE"}</span>
    </div>
  );
}

async function renderFailedTracking() {
  mockedFetchStatus.mockResolvedValue({ ok: true, status: PROCESSING_STATUS.FAILED });
  render(
    <NotificationProvider>
      <TestConsumer />
    </NotificationProvider>,
  );

  fireEvent.click(screen.getByText("start"));
  // 5초 폴링 한 번으로 FAILED까지 간다(mock이 첫 조회부터 FAILED를 돌려준다).
  await act(async () => {
    jest.advanceTimersByTime(ANALYSIS_POLL_INTERVAL_MS);
  });
  await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("FAILED"));
}

describe("retryFailedSummary — ANLZ-02 실제 재분석", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedFetchStatus.mockReset();
    mockedRetry.mockReset();
    mockedToast.mockReset();
    mockedToast.error.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("성공하면 트래킹을 RUNNING으로 되돌린다(폴링이 다시 쫓게)", async () => {
    await renderFailedTracking();
    mockedRetry.mockResolvedValue({ error: null, needsFullRerun: false, pendingNote: null });

    fireEvent.click(screen.getByText("retry"));

    await waitFor(() => expect(mockedRetry).toHaveBeenCalledWith("meeting-1"));
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("RUNNING"));
    expect(mockedToast.error).not.toHaveBeenCalled();
  });

  it("일반 실패면 에러 토스트만 띄우고 FAILED에 그대로 둔다(다시 누를 수 있어야 한다)", async () => {
    await renderFailedTracking();
    mockedRetry.mockResolvedValue({
      error: "서버가 응답하지 않습니다",
      needsFullRerun: false,
      pendingNote: null,
    });

    fireEvent.click(screen.getByText("retry"));

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith("서버가 응답하지 않습니다"));
    expect(screen.getByTestId("state")).toHaveTextContent("FAILED");
  });

  it("재개할 지점이 없으면(ANLZ-008) 처음부터 다시 캡처하라는 별도 문구를 띄운다", async () => {
    await renderFailedTracking();
    mockedRetry.mockResolvedValue({
      error: "재개할 계층이 없습니다",
      needsFullRerun: true,
      pendingNote: null,
    });

    fireEvent.click(screen.getByText("retry"));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        "재개할 수 있는 지점이 없습니다. 회의를 다시 캡처해야 합니다.",
      ),
    );
    expect(screen.getByTestId("state")).toHaveTextContent("FAILED");
  });

  it("요청은 갔지만 아직 요약이 없으면(pendingNote) 안내 토스트를 띄우고 RUNNING으로 돌아간다", async () => {
    await renderFailedTracking();
    mockedRetry.mockResolvedValue({
      error: null,
      needsFullRerun: false,
      pendingNote: "다른 재분석이 이미 진행 중입니다",
    });

    fireEvent.click(screen.getByText("retry"));

    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith("다른 재분석이 이미 진행 중입니다"),
    );
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("RUNNING"));
  });
});
