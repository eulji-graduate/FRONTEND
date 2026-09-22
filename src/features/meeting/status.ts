import { AI_SUMMARY_STATUS, MEETING_STATUS, type MeetingStatus } from "@/constants/meeting";

import type { Meeting } from "./types";
import type { MeetingDetail } from "./view-types";
import type { MeetingListItem } from "./view-types";

/**
 * 회의 상태 — **완료만 저장이고 나머지는 계산**이다(CLAUDE.md §도메인 상수: 파생값은 계산).
 *
 * ⚠️ **끝나는 시각이 지나도 완료가 아니다.** 완료는 Host가 [회의 종료 및 제출]을 눌러야
 *    된다(WORKFLOW §3-3 — 그래서 되돌릴 수 없다). 예약한 30분이 지났는데 안 눌렀으면
 *    그 회의는 아직 **진행중**이다 — 실제로 회의가 길어진 것일 수 있고, 여기서 멋대로
 *    완료로 돌리면 스크립트도 산출물도 없는 회의가 "완료 카드"로 열린다.
 * ⚠️ `now`를 인자로 받는다 — 안에서 `new Date()`를 부르면 테스트가 시각을 못 잡는다.
 */
export function meetingStatusOf(
  meeting: Pick<Meeting, "start" | "endedAt" | "canceledAt">,
  now: Date,
): MeetingStatus {
  // ⚠️ 취소를 가장 먼저 본다 — 취소된 회의는 시작 전이었어도(§types) 예정으로 되돌아가지 않는다.
  if (meeting.canceledAt !== null) return MEETING_STATUS.CANCELED;
  if (meeting.endedAt !== null) return MEETING_STATUS.DONE;
  if (now < meeting.start) return MEETING_STATUS.SCHEDULED;
  return MEETING_STATUS.IN_PROGRESS;
}

/**
 * 완료 카드가 **지금 무엇을 내줄 수 있는지**.
 *
 * ⚠️ **완료 = 열람 가능이 아니다.** 종료를 누른 순간 회의는 완료지만 요약·액션 추출은
 *    그때부터 서버가 몇 분 돌린다(WORKFLOW §3-3 4·5) — 그 사이에 상세로 들여보내면
 *    회의록도 산출물도 없는 빈 화면을 준다(§정직성). 그래서 회의 상태(`MeetingStatus`)와
 *    분석 상태(`AiSummaryStatus`)를 **곱해서** 카드가 할 일을 정한다.
 * ⚠️ `review`·`retry`는 **Host만** 본다. 참석자에게 남의 회의 액션을 확정할 자리를 주면
 *    안 된다(§3-4 — 조정·확정은 Host의 일이다).
 * ⚠️ 판정은 여기 한 곳이다. 카드가 직접 상태를 조합하면 대시보드 위젯이 또 다르게 조합한다
 *    (배지 맵이 두 벌로 갈라졌던 것과 같은 일이다).
 */
export type MeetingCardAffordance =
  /** 예정·진행중 — Host면 [녹음하기], 아니면 아무것도 */
  | "live"
  /** 분석은 끝났고 Host가 액션을 검토·확정할 차례 */
  | "review"
  /** 상세로 간다 */
  | "open";

export function meetingCardAffordanceOf(
  meeting: Pick<MeetingListItem, "status" | "aiSummaryStatus" | "isHost">,
): MeetingCardAffordance {
  // ⚠️ 취소된 회의는 "live"가 아니다 — [녹음하기]를 띄우면 취소된 회의를 다시 시작할 수 있는
  //    것처럼 보인다. 볼 것도 없다(산출물·발화 기록 자체가 없다) — 상세로만 보낸다.
  if (meeting.status === MEETING_STATUS.CANCELED) return "open";
  if (meeting.status !== MEETING_STATUS.DONE) return "live";

  /*
    ⚠️ **목록 카드는 요약 이야기를 하지 않는다**(2026-08-10 팀 확정 B안). 대기·요약 중·실패는
       종료 직후 잠깐 지나가는 상태인데, 그걸 배지로 올리니 목록에 회의 상태(예정·진행중·완료)와
       분석 상태 두 축이 겹쳐 보였다 — 카드는 **회의가 어디까지 왔나**만 말하고, 요약이
       어디까지 왔는지는 **상세의 그 칸에서** 말한다(`MeetingDetail.pendingReason`).
    ⚠️ 그래서 다 열린다. 들어가면 산출물·발화 기록 자리가 왜 비었는지 적혀 있다.
  */
  if (meeting.aiSummaryStatus === AI_SUMMARY_STATUS.REVIEWED && meeting.isHost) return "review";

  return "open";
}

/**
 * 참석자 명단 교체(MEET-09) 가능 여부 — **host만, 끝나지 않은 회의에서만**. `pendingReason`이
 * "SCHEDULED"·"IN_PROGRESS"일 때만 회의가 아직 안 끝났다는 뜻이다(§view-types) — 그 값이
 * `SUMMARIZING`·`FAILED`·`null`이면 이미 DONE이라 교체할 수 없다.
 * ⚠️ 판정은 여기 한 곳이다 — 회의 상세 화면과 그 서버 컴포넌트가 각자 조합하면 조건이 갈린다.
 */
export function canEditMeetingAttendees(
  detail: Pick<MeetingDetail, "isHost" | "pendingReason">,
): boolean {
  return (
    detail.isHost &&
    (detail.pendingReason === "SCHEDULED" || detail.pendingReason === "IN_PROGRESS")
  );
}

/** 회의 취소(MEET-06) 가능 여부 — **시작 전(SCHEDULED)만**. 진행중은 종료(MEET-08)를 써야 한다. */
export function canCancelMeeting(detail: Pick<MeetingDetail, "isHost" | "pendingReason">): boolean {
  return detail.isHost && detail.pendingReason === "SCHEDULED";
}

/**
 * 회의 수정(MEET-05) 가능 여부 — **시작 전(SCHEDULED)만**.
 *
 * ⚠️ **BE가 그 자리에서 막는다.** `MeetingUpdateService`는 상태가 `SCHEDULED`가 아니면
 *    409 `MT-014`를 던진다 — 입장·종료가 시작된 회의는 캡처 시간축이 확정돼 시간을 되돌릴
 *    수 없기 때문이다. **서버가 안 받는 자리에 버튼을 두지 않는다**(§정직성).
 * ⚠️ 취소(`canCancelMeeting`)와 지금은 조건이 같지만 **이름을 따로 둔다.** 둘은 각자 다른 BE
 *    계약(MEET-05·MEET-06)을 보고 있어서 한쪽 관문이 바뀌면 여기서 갈라져야 한다 — 지금
 *    같다고 합치면 그때 두 기능이 함께 틀린다.
 * ⚠️ 화면 판정은 `isHost`뿐이지만 **서버는 host·OWNER·ADMIN까지 받는다**(`canManageMeeting` —
 *    BE `MeetingUpdateService.canManageMeeting`과 같은 범위). 화면 숨김은 UX고 판정은
 *    Server Action이 다시 한다(§권한).
 */
export function canEditMeeting(detail: Pick<MeetingDetail, "isHost" | "pendingReason">): boolean {
  return detail.isHost && detail.pendingReason === "SCHEDULED";
}
