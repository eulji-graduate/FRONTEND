import "server-only";

import { format } from "date-fns";

import { AI_SUMMARY_STATUS, MEETING_STATUS } from "@/constants/meeting";
import { PERSONAL_ACTION_DETAIL_MOCK } from "@/features/action/mock/action-detail";
import { requireAccessToken } from "@/features/auth/session";
import { listMockManagedMembers } from "@/features/member/mock/managed";
import { PROJECT_TEAM_ACTIONS_MOCK } from "@/features/project/mock/team-actions";
import { ApiError, serverApi } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import {
  type Actor,
  canCaptureMeeting,
  canOperateMeeting,
  canViewMeetingDetail,
} from "@/lib/permission";
import { isMock } from "@/mocks/config";

import { formatMeetingSchedule, meetingListRange } from "./lib";
import {
  type BeMeetingListItem,
  type BeUtterance,
  hostIdOf,
  isClosed,
  parseMeetingDetail,
  parseMeetingList,
  parseTranscriptsResponse,
  toMeetingCaptureInfo,
  toMeetingDetailView,
  toMeetingListItem,
  toMeetingOutput,
  toScriptChunks,
} from "./mapper";
import { findMockMeeting, listMockMeetings } from "./mock/meetings";
import { ensureMockMeetingsSeeded, findMockMeetingExtras } from "./mock/seed";
import { findMockMeetingReview } from "./review/mock/review";
import { meetingStatusOf } from "./status";
import type { Meeting } from "./types";
import type {
  MeetingAgenda,
  MeetingCaptureResult,
  MeetingContentPending,
  MeetingDetail,
  MeetingDetailResult,
  MeetingDirectory,
  MeetingListItem,
  MeetingOutput,
} from "./view-types";

/**
 * 회의 조회 — **격리막**(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ 컴포넌트는 `view-types`만 본다. 연동되면 여기 `isMock` 분기만 실서버 호출로 바꾸고
 *    매퍼가 shape을 흡수한다 — 화면은 안 바뀐다.
 * ⚠️ 산출물·참석자 이름은 다른 도메인의 목을 **id로 참조**해 조립한다(복사해 두면 두 벌이
 *    어긋난다). 예약 쪽도 같은 방식이다(`rooms/actions.ts` → `TOP_LEVEL_PROJECTS`).
 * ⚠️ 조회 전용이다 — 녹음·종료처럼 바꾸는 일은 캡처 화면이 브라우저에서 하고, 서버로 보내는
 *    자리는 아직 BE 협의 전이라 `TODO`로 비워 두었다.
 */

/** Owner 개설 회의의 소속 라벨(WORKFLOW §2) — 옛 문구 "프로젝트 공통"은 폐기됐다 */
const OWNER_ORIGIN_LABEL = "Owner 개설";

/**
 * 팀 액션 회의의 라벨 — 상위 팀 액션 이름. 목이 어긋나 못 찾으면 팀 액션임은 알린다.
 *
 * ⚠️ **이 함수는 목 전용이다.** 실 응답에는 상위 팀 액션 이름도, host 소속도 안 실린다 —
 *    연동할 때 이 라벨을 채우려면 BE에 그 필드를 **요청해야 한다.** 기다리면 오는 값이
 *    아니다(링크 자체는 BE 모델에 이미 있고 막힌 곳은 응답 DTO다 — 근거는 `mapper.ts`의
 *    `toDashboardMeeting` 주석에 모아 뒀다).
 */
function originLabelOf(meeting: Meeting): string {
  if (meeting.hostAuthority === "OWNER") return OWNER_ORIGIN_LABEL;

  const parent = (PROJECT_TEAM_ACTIONS_MOCK[meeting.projectTag] ?? []).find(
    (action) => action.id === meeting.parentTeamActionId,
  );
  return parent ? parent.name : "팀 액션 회의";
}

/**
 * 목 안건(쌍 목록) → 화면 계약(`MeetingAgenda` — 대주제 하나 + 소주제 목록).
 *
 * ⚠️ **BE가 하는 것과 같은 방식으로 접는다**(BE PR #461 `resolveAgenda` — 대주제는
 *    `findFirst`, 소주제는 전부). 목만 쌍을 그대로 보여 주면 실서버로 넘어가는 날 상세의
 *    안건 칸이 조용히 줄어든다 — 목은 실서버가 내줄 모양을 미리 보여야 한다(§정직한 목업).
 */
function toMockAgenda(topics: Meeting["topics"]): MeetingAgenda {
  return { main: topics[0].main, subs: topics.map((topic) => topic.sub) };
}

/**
 * 회의 수정 다이얼로그의 슬롯 피커 초기값(#436) — 실서버 매퍼의 `toEditableSlot`과 같은
 * 모양이다. 비대면 회의는 회의실·시간이 없어 `null`이다.
 */
function toMockEditableSlot(meeting: Meeting): MeetingDetail["editableSlot"] {
  if (meeting.isOnline || !meeting.roomId) return null;
  return {
    date: format(meeting.start, "yyyy-MM-dd"),
    startTime: format(meeting.start, "HH:mm"),
    meetingRoomId: meeting.roomId,
  };
}

function toListItem(meeting: Meeting, viewerId: number, now: Date): MeetingListItem {
  const firstTopic = meeting.topics[0];

  return {
    id: meeting.id,
    title: meeting.title,
    status: meetingStatusOf(meeting, now),
    projectTag: meeting.projectTag,
    originLabel: originLabelOf(meeting),
    topicSummary: `${firstTopic.main} · ${firstTopic.sub}`,
    schedule: formatMeetingSchedule(meeting.start, meeting.end),
    roomName: meeting.roomName ?? "",
    attendeeCount: meeting.attendeeIds.length,
    isHost: meeting.hostId === viewerId,
    aiSummaryStatus: meeting.aiSummaryStatus,
    /*
      ⚠️ 새 필수 필드(2026-08-16). 여기 목 경로는 아래 122행에서 `!isOnline`으로 걸러
         비대면 회의를 목록에 안 낸다 — 값이 항상 false다. 실서버(BE-18)가 확정된
         비대면을 실어 주기 시작하면 목 데이터에도 "확정 시각"을 붙여 정리한다.
    */
    isOnline: meeting.isOnline,
  };
}

/**
 * 목록 — 탭 두 개를 한 번에 만든다(WORKFLOW §3-2).
 *
 * ⚠️ **목록은 전 구성원 공개**다(§3-2-1) — 여기서 권한으로 거르지 않는다. 막는 건 상세다.
 * ⚠️ 차례: 진행중 → 예정(가까운 순) → 완료(최근 순). 지금 다뤄야 하는 회의가 위로 온다.
 * ⚠️ **비대면 회의(`isOnline`)는 목록에 아예 안 낸다**(2026-08-14 팀 확정 — 실서버 목록·대시보드
 *    (MEET-02·03·17)가 서버에서부터 `isOnline=false`만 준다). 목이 실서버 동작을 미리 따라 하지
 *    않으면 화면이 실서버로 넘어가는 날 갑자기 카드가 사라져 버그처럼 보인다 — 상세(`getMeetingDetail`)
 *    는 여전히 `/app/meeting/:id` 직접 링크로 열린다(§Mock 격리막: 목록·상세는 다른 조회다).
 */
export async function getMeetingDirectory(viewerId: number): Promise<MeetingDirectory> {
  if (!isMock) return getLiveMeetingDirectory();

  ensureMockMeetingsSeeded();
  const now = new Date();
  const listableMeetings = listMockMeetings().filter((meeting) => !meeting.isOnline);
  const byId = new Map(listableMeetings.map((meeting) => [meeting.id, meeting]));
  const rows = listableMeetings.map((meeting) => ({
    item: toListItem(meeting, viewerId, now),
    startMs: meeting.start.getTime(),
  }));
  const items = sortMeetingListItems(rows);

  return {
    hosted: items.filter((item) => item.isHost),
    invited: items.filter((item) => {
      if (item.isHost) return false;
      const meeting = byId.get(item.id);
      return meeting !== undefined && meeting.attendeeIds.includes(viewerId);
    }),
  };
}

/**
 * 목록 차례 — **지금 다뤄야 하는 회의가 위로 온다**(WORKFLOW §3-2).
 *
 * ⚠️ **목·실서버가 같은 함수를 쓴다.** 정렬이 두 벌이면 같은 회의가 경로마다 다른 자리에
 *    서고, 그건 화면을 눌러 보는 것만으로는 안 드러난다(§격리막과 같은 이유).
 * ⚠️ 시각은 항목이 아니라 **원본**에서 받는다 — `schedule`은 이미 사람이 읽는 문자열이라
 *    거기서 시각을 되파면 표기가 바뀔 때마다 정렬이 조용히 틀어진다.
 */
const STATUS_RANK = {
  [MEETING_STATUS.IN_PROGRESS]: 0,
  [MEETING_STATUS.SCHEDULED]: 1,
  [MEETING_STATUS.DONE]: 2,
  // ⚠️ 취소는 맨 뒤다(MEET-06) — 더 볼 일 없는 회의 중에서도 가장 뒤로 물러난다.
  [MEETING_STATUS.CANCELED]: 3,
} as const;

function sortMeetingListItems(
  rows: { item: MeetingListItem; startMs: number }[],
): MeetingListItem[] {
  return [...rows]
    .sort((a, b) => {
      const rankGap = STATUS_RANK[a.item.status] - STATUS_RANK[b.item.status];
      if (rankGap !== 0) return rankGap;

      /*
        ⚠️ **시각 없는 회의(비대면)는 자기 상태 그룹 맨 뒤**로 보낸다.
           `startMs`가 `NaN`이면 어느 비교도 false·NaN이라 `Array.prototype.sort`가 구현별로
           흔들린다 — 여기서 명시하지 않으면 정렬이 조용히 뒤바뀐다.
        ⚠️ 확인필요 — 목록 정렬 기준은 BE가 정한다(WORKFLOW.md §3-1-A). BE가 값을 정하면
           그 값으로 이 자리를 바꾼다. 지금은 "완료 그룹 안 맨 뒤"가 안전한 임시값이다
           (비대면 회의는 확정된 것만 오므로 status=DONE 그룹 안에서만 움직인다).
      */
      const aMissing = Number.isNaN(a.startMs);
      const bMissing = Number.isNaN(b.startMs);
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;

      // 예정·진행중은 가까운 회의부터, 완료·취소는 최근 회의부터
      return a.item.status === MEETING_STATUS.SCHEDULED ||
        a.item.status === MEETING_STATUS.IN_PROGRESS
        ? a.startMs - b.startMs
        : b.startMs - a.startMs;
    })
    .map((row) => row.item);
}

/**
 * 목록 — 실서버(MEET-02).
 *
 * ⚠️ **탭을 서버가 가른다**(`scope=HOSTED`·`ATTENDING`). 전부 받아 와서 `isHost`로 나누면
 *    같은 회의를 두 번 실어 나르고, 페이지가 잘릴 때 한쪽 탭만 조용히 비어 버린다 —
 *    BE가 `ATTENDING`에서 host를 이미 빼 준다(BE `MeetingListScope`).
 * ⚠️ **`from`·`to`를 반드시 싣는다.** 서버 기본이 `오늘-3개월 ~ 오늘`이라 생략하면 **예정
 *    회의가 통째로 빠진다**(§endpoints `MeetingListParams`) — 이 화면의 첫 줄이 예정 회의다.
 * ⚠️ **무한 스크롤은 이 이슈에서 안 만든다**(범위 밖). 대신 한 페이지를 BE 상한(100)까지
 *    받아 첫 화면이 20건에서 잘리지 않게 한다 — 그보다 많으면 뒤가 안 보인다(CLAUDE.md
 *    §목록의 스크롤 트리거를 붙일 때 이 상수를 지우고 `page`를 이어 붙인다).
 * ⚠️ 두 탭을 **같이 부른다**(`Promise.all`). 차례로 부르면 화면이 두 번 기다린다.
 */
const MEETING_LIST_PAGE_SIZE = 100;

async function getLiveMeetingDirectory(): Promise<MeetingDirectory> {
  const accessToken = await requireAccessToken();
  const { from, to } = meetingListRange(new Date());

  const query = { from, to, page: 0, size: MEETING_LIST_PAGE_SIZE } as const;
  const [hosted, invited] = await Promise.all([
    serverApi<unknown>(ep.meetings({ ...query, scope: "HOSTED" }), { accessToken }),
    serverApi<unknown>(ep.meetings({ ...query, scope: "ATTENDING" }), { accessToken }),
  ]);

  return {
    hosted: toSortedListItems(parseMeetingList(hosted)),
    invited: toSortedListItems(parseMeetingList(invited)),
  };
}

function toSortedListItems(meetings: BeMeetingListItem[]): MeetingListItem[] {
  return sortMeetingListItems(
    meetings.map((meeting) => ({
      item: toMeetingListItem(meeting),
      /*
        ⚠️ **비대면 회의는 `startAt`이 `null`이다**(MEET-18). `new Date(null).getTime()`은
           `0(epoch, 1970-01-01)`이 되어 완료 그룹 최근순 정렬의 맨 뒤에 값이 있는 것처럼
           박히지만, "시각이 없다"는 사실이 사라진다. `NaN`으로 명시해 `sortMeetingListItems`가
           갈라 보게 한다(같은 함수의 `Number.isNaN` 분기 참고).
      */
      startMs: meeting.startAt === null ? Number.NaN : new Date(meeting.startAt).getTime(),
    })),
  );
}

/** 산출물 조립 — 회의 종류에 따라 팀 액션(§2) 또는 개인 액션(§5)이다 */
function outputsOf(meeting: Meeting): { kindLabel: string; outputs: MeetingOutput[] } {
  const extrasFound = findMockMeetingExtras(meeting.id);

  if (meeting.hostAuthority === "OWNER") {
    const pool = PROJECT_TEAM_ACTIONS_MOCK[meeting.projectTag] ?? [];
    const outputs = (extrasFound?.outputTeamActionIds ?? [])
      .map((id) => pool.find((action) => action.id === id))
      .filter((action) => action !== undefined)
      .map((action) => ({
        id: action.id,
        name: action.name,
        assignee: action.team,
        status: action.status,
        dueDate: action.dueDate,
        href: `/app/projects/${meeting.projectId}/team/${action.id}`,
      }));
    return { kindLabel: "팀 액션", outputs };
  }

  /*
    이름·담당자는 `action` 목에서 id로 찾고, 상태·마감일은 시드가 든다 — 그 두 값은
    `PersonalActionDetail`에 저장돼 있지 않다(§seed).
  */
  const outputs = (extrasFound?.outputPersonalActions ?? [])
    .map((ref) => ({ ref, action: PERSONAL_ACTION_DETAIL_MOCK[ref.id] }))
    .filter(
      (pair): pair is { ref: (typeof pair)["ref"]; action: NonNullable<(typeof pair)["action"]> } =>
        pair.action !== undefined,
    )
    .map(({ ref, action }) => ({
      id: action.id,
      name: action.name,
      /*
        ⚠️ `PersonalActionDetail.assigneeName`이 optional로 바뀌었다(개인 액션 담당자 미지정
           가능) — `MeetingOutput.assignee`는 여전히 non-null string이라 화면 계약대로 정본
           문구(WORKFLOW.md §3-1-A "담당자 미정")로 접는다.
      */
      assignee: action.assigneeName ?? "담당자 미정",
      status: ref.status,
      dueDate: ref.dueDate,
      href: `/app/actions/${action.id}`,
    }));
  return { kindLabel: "개인 액션", outputs };
}

/**
 * 상세 — **완료 회의만** 연다(§3-2). 못 여는 이유를 값으로 돌려준다(§view-types).
 *
 * ⚠️ 권한 판정은 `canViewMeetingDetail` **그대로**다(§3-2-1) — 새 판정을 만들지 않는다.
 *    잠금은 에러가 아니라서 목록 카드(메타)는 계속 보인다.
 */
export async function getMeetingDetail(id: string, viewer: Actor): Promise<MeetingDetailResult> {
  if (!isMock) return getLiveMeetingDetail(id, viewer);

  ensureMockMeetingsSeeded();
  const meeting = findMockMeeting(id);
  if (!meeting) return { kind: "notFound" };

  const canView = canViewMeetingDetail(viewer, {
    isOwnerHosted: meeting.hostAuthority === "OWNER",
    attendeeIds: meeting.attendeeIds,
    hostTeamId: meeting.hostTeamId,
  });
  if (!canView) return { kind: "locked", title: meeting.title };

  /*
    ⚠️ **아직 안 끝났다고 화면을 막지 않는다**(2026-08-10 팀 협의). 예정·진행중 회의도
       시간·장소·참석자·안건은 이미 정해진 값이다 — 없는 건 회의가 남기는 것(기록·산출물)뿐이라
       그 두 칸만 안내로 채운다(§view-types `MeetingContentPending`).
    ⚠️ 순서가 있다. 회의가 안 끝났으면 요약은 시작조차 안 했으므로 회의 상태를 먼저 본다.
    ⚠️ **비대면 회의는 완료 + `aiSummaryStatus: null`("아직 요청 안 함")로 며칠이고 남을 수 있다**
       (2026-08-14 팀 확정 — [AI 요약 요청]을 안 누르면 계속 이 상태다). 아래 삼항이 그 조합을
       `null`(=다 찼다)로 흘려보내는데, 산출물 칸은 `outputs`가 빈 배열이라 "0건"으로 자연히
       읽혀 깨지진 않는다 — 다만 "아직 요청 안 함"과 "정말 하달할 게 없음"을 문구로는 못
       가른다. 새 `MeetingContentPending` 값을 추가하는 건 이 이슈 범위 밖이라(화면 문구·
       아이콘 맵까지 늘어난다) 지금은 이 fallthrough를 그대로 둔다.
  */
  const status = meetingStatusOf(meeting, new Date());
  const pendingReason: MeetingContentPending | null =
    status === MEETING_STATUS.CANCELED
      ? "CANCELED"
      : status === MEETING_STATUS.SCHEDULED
        ? "SCHEDULED"
        : status === MEETING_STATUS.IN_PROGRESS
          ? "IN_PROGRESS"
          : meeting.aiSummaryStatus === AI_SUMMARY_STATUS.PENDING ||
              meeting.aiSummaryStatus === AI_SUMMARY_STATUS.SUMMARIZING
            ? "SUMMARIZING"
            : meeting.aiSummaryStatus === AI_SUMMARY_STATUS.FAILED
              ? "FAILED"
              : null;

  /*
    참석자 이름은 사원 명부에서 id로 찾는다 — 같은 사람이 화면마다 같은 이름·같은 아바타 색이
    되려면 명부가 하나여야 한다(§구성원과 같은 이유). 명부에 없는 id는 조용히 숨기지 않고
    "알 수 없음"으로 남긴다(§정직성).
  */
  const roster = new Map(listMockManagedMembers().map((member) => [member.id, member.name]));
  const { kindLabel, outputs } = outputsOf(meeting);

  /*
    ⚠️ 검토 대기·중단은 **산출물 칸만의 사정**이다(회의 안 끝남·요약 중과는 다른 축) — 요약이
       끝났는데도(REVIEWED) Host가 [액션 분배 확정]을 안 눌렀거나, 요약 자체가 서버 문제로
       중단됐을 때(FAILED + isStalled) 산출물 칸이 왜 비었는지 갈라 보여준다(§view-types).
  */
  const review =
    meeting.aiSummaryStatus === AI_SUMMARY_STATUS.REVIEWED
      ? findMockMeetingReview(meeting.id)
      : null;
  const pendingActionCount = review && !review.actionsConfirmed ? review.drafts.length : 0;
  const isStalled =
    pendingReason === "FAILED" ? (findMockMeetingExtras(meeting.id)?.isStalled ?? false) : false;

  return {
    kind: "ok",
    detail: {
      id: meeting.id,
      title: meeting.title,
      projectId: meeting.projectId,
      projectTag: meeting.projectTag,
      originLabel: originLabelOf(meeting),
      parentTeamActionHref:
        meeting.hostAuthority === "OWNER"
          ? null
          : `/app/projects/${meeting.projectId}/team/${meeting.parentTeamActionId}`,
      agenda: toMockAgenda(meeting.topics),
      // ⚠️ 비대면 회의는 회의실·시간이 없다(이슈 #473) — 상세도 목록 카드와 같은 규칙이다.
      schedule: meeting.isOnline ? "" : formatMeetingSchedule(meeting.start, meeting.end),
      roomName: meeting.roomName ?? "",
      attendees: meeting.attendeeIds.map((attendeeId) => ({
        id: attendeeId,
        name: roster.get(attendeeId) ?? "알 수 없음",
        // 목 명부는 퇴사자를 안 담는다(§도메인 상수) — 이 화면에서 퇴사 시나리오를 만들 수 없다.
        isResigned: false,
      })),
      outputKindLabel: kindLabel,
      outputs,
      script: findMockMeetingExtras(meeting.id)?.script ?? [],
      pendingReason,
      pendingActionCount,
      isStalled,
      isHost: canOperateMeeting(viewer, { ownerId: meeting.hostId }),
      isOnline: meeting.isOnline,
      // ⚠️ 개설 때는 항상 `false`(§types `Meeting.recordingConsent`)지만, 회의 수정
      //    다이얼로그(#436)가 고치면 그 값이 스토어에 남는다 — 여기서 저장된 값을 그대로 읽는다.
      recordingConsent: meeting.recordingConsent,
      editableSlot: toMockEditableSlot(meeting),
    },
  };
}

/**
 * 상세 — 실서버(MEET-04).
 *
 * ⚠️ **판정 순서를 목과 맞춘다**(없음 → 권한 없음 → 통과). `getLiveMeetingCapture`와 같은
 *    규칙이다 — 순서가 갈리면 같은 회의가 경로마다 다른 이유로 막힌다.
 * ⚠️ **404(`MT-001`)·403(`MT-011`) 둘 다 값으로 돌린다.** 캡처(`getLiveMeetingCapture`)는 403을
 *    던지는데, 거기서는 **우리가 먼저 판정한 뒤**의 403이라 판정이 틀렸다는 신호이기 때문이다.
 *    상세는 다르다 — 목록이 전 구성원 공개라 아무나 눌러 들어올 수 있고, 우리는 판정에 필요한
 *    값(개설 팀·참석자)을 조회 전에 갖고 있지 않다. 여기서 403은 고장이 아니라 **잠금**이고,
 *    잠금은 에러 화면이 아니다(WORKFLOW §3-2-1).
 * ⚠️ 제목은 못 싣는다 — 실패 봉투에 회의 제목이 없다(§view-types `locked`).
 * ⚠️ 개설자 판정은 **목 경로와 같은 함수**(`canOperateMeeting`)다. 매퍼는 값이 어디 있는지만
 *    알려 주고(`hostIdOf`) 판정은 `lib/permission.ts` 한 곳이다(CLAUDE.md §권한).
 */
/**
 * 발화 기록 전체(ANLZ-05) — 커서를 서버가 `nextCursor`로 끊어 줄 때까지 이어 받는다.
 *
 * ⚠️ **왜 페이지를 그대로 안 보여주고 다 모아 온다.** 이 화면은 스크롤 목록이 아니라
 *    상세의 고정 섹션이다 — "N건"이라는 건수를 보여주는데 첫 페이지만 세면 그 수가
 *    거짓말이 된다(§정직성, §목록·페이지네이션과는 다른 자리 — 여기는 무한 스크롤 목록이
 *    아니라 한 회의 분량이 유한하다).
 * ⚠️ **그래도 무한 루프는 안 된다.** BE가 커서를 안 끊어 주는 결함이 나면 화면이 걸린 채
 *    영영 안 끝난다 — 상한(50페이지, 회의 하나에 발화 수천 건이라는 BE 주석 기준 넉넉하다)
 *    에 걸리면 그때까지 받은 것만 돌린다. `console`은 커밋하지 않는다(PR 체크리스트) —
 *    상한에 걸리는 건 BE 결함(끝없는 커서)일 때뿐이라 서버 쪽에서 잡을 일이다.
 * ⚠️ **`transcriptId`로 중복을 거른다**(§목록·페이지네이션 — 이어 붙일 때 id 중복 제거).
 *    커서 경계가 겹치는 BE 결함이 나도 "N건"과 화면에 같은 발화가 두 번 찍히지 않는다.
 */
async function fetchAllTranscripts(meetingId: number, accessToken: string): Promise<BeUtterance[]> {
  const TRANSCRIPT_PAGE_CAP = 50;
  const utterances: BeUtterance[] = [];
  const seenTranscriptIds = new Set<number>();
  let cursor: string | undefined;

  for (let page = 0; page < TRANSCRIPT_PAGE_CAP; page++) {
    const raw = await serverApi<unknown>(ep.meetingTranscripts(meetingId, { cursor }), {
      accessToken,
    });
    const parsed = parseTranscriptsResponse(raw);
    for (const utterance of parsed.utterances) {
      if (seenTranscriptIds.has(utterance.transcriptId)) continue;
      seenTranscriptIds.add(utterance.transcriptId);
      utterances.push(utterance);
    }
    if (!parsed.nextCursor) return utterances;
    cursor = parsed.nextCursor;
  }

  return utterances;
}

async function getLiveMeetingDetail(id: string, viewer: Actor): Promise<MeetingDetailResult> {
  const accessToken = await requireAccessToken();

  let raw: unknown;
  try {
    raw = await serverApi<unknown>(ep.meeting(Number(id)), { accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { kind: "notFound" };
    if (error instanceof ApiError && error.status === 403) return { kind: "locked", title: null };
    throw error;
  }

  /* ⚠️ 단언이 아니라 **검사**다 — 모양이 어긋나면 화면을 그리기 전에 여기서 멈춘다 */
  const detail = parseMeetingDetail(raw);
  const view = toMeetingDetailView(detail, {
    isHost: canOperateMeeting(viewer, { ownerId: hostIdOf(detail) }),
  });

  /*
    ⚠️ **`pendingReason`이 있으면 산출물·발화 기록을 안 물어본다.** 화면이 그 칸을 안 그리는데
       (`meeting-detail-view.tsx` — 안내 카드만 뜬다) 조회부터 하면 헛수고다. 회의가 아직
       안 끝났으면 하달·발화 자체가 없다.
    ⚠️ 산출물 조회(#637 연동)는 발화 기록(`startAt` 필요)과 조건이 갈린다 — 발화는 비대면
       회의(startAt=null)에서 못 부르지만 산출물은 회의 종료·확정이 된 이상 부를 수 있다.
       그래서 산출물부터 채운 뒤, `startAt`이 있을 때만 발화 기록을 이어 붙인다.
  */
  if (view.pendingReason !== null) {
    return { kind: "ok", detail: view };
  }

  const outputs = await fetchMeetingOutputs(Number(id), accessToken);
  const withOutputs = { ...view, outputs };

  if (detail.startAt === null) {
    return { kind: "ok", detail: withOutputs };
  }

  const utterances = await fetchAllTranscripts(Number(id), accessToken);
  return {
    kind: "ok",
    detail: {
      ...withOutputs,
      script: toScriptChunks(new Date(detail.startAt), utterances),
    },
  };
}

/**
 * 회의별 하달 액션 조회(FR-AC-09, #637 연동).
 *
 * ⚠️ **실패해도 화면을 세우지 않는다.** 상단(제목·안건·참석자)은 이미 온전한 상태고,
 *    산출물 칸만 못 그리면 매퍼가 준 `null`(=미연동과 같은 자리)로 그대로 두면 된다 —
 *    "다른 칸까지 통째로 에러 화면"은 정보 손실이 크다(§정직성 · script 조회와 같은 결).
 * ⚠️ **응답이 `null`(BE 결함)이거나 배열이 아니면 미연동과 같은 자리에 두지 않고 빈 배열로
 *    돌린다** — 여기까지 왔으면 회의 요약이 끝난 상태라 "물어봤는데 실제로 0건"이 나올
 *    수 있고, 그 자리는 화면이 "하달된 게 없습니다"로 정직하게 답할 자리다.
 */
async function fetchMeetingOutputs(
  meetingId: number,
  accessToken: string,
): Promise<MeetingOutput[] | null> {
  try {
    const raw = await serverApi<unknown>(ep.meetingActions(meetingId), { accessToken });
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item): item is Parameters<typeof toMeetingOutput>[0] => {
        if (typeof item !== "object" || item === null) return false;
        const summary = item as Record<string, unknown>;
        return (
          typeof summary.id === "number" &&
          (summary.actionType === "TEAM" || summary.actionType === "PERSONAL") &&
          typeof summary.title === "string" &&
          typeof summary.status === "string" &&
          typeof summary.dueDate === "string" &&
          typeof summary.projectId === "number"
        );
      })
      .map(toMeetingOutput);
  } catch {
    return null;
  }
}

/**
 * 캡처 진입 — **Host만**(WORKFLOW §3-3).
 *
 * ⚠️ 상세와 **판정이 다르다.** 상세는 `canViewMeetingDetail`(참석자·팀·Owner)로 열리지만
 *    캡처는 `canCaptureMeeting`(그 회의를 연 사람 한 명)이다 — 권한(역할)이 아니라
 *    **리소스 소유권**이라 Owner라고 남의 회의를 녹음할 수 없다(§권한: 축이 2개다).
 * ⚠️ 판정은 `lib/permission.ts`에 있다. 여기서 `hostId`를 직접 비교하면, 앞으로 붙을
 *    종료·업로드 API가 다른 조건을 쓰게 되어 화면과 서버가 갈린다.
 * ⚠️ 끝난 회의는 다시 못 들어간다 — 종료는 되돌릴 수 없다(§3-3 종료 정책).
 * ⚠️ 화면 판정일 뿐이다. 진짜 검사는 종료·업로드 API가 서버에서 다시 한다.
 */
export async function getMeetingCapture(id: string, viewer: Actor): Promise<MeetingCaptureResult> {
  if (!isMock) return getLiveMeetingCapture(id, viewer);

  ensureMockMeetingsSeeded();
  const meeting = findMockMeeting(id);
  if (!meeting) return { kind: "notFound" };

  if (!canCaptureMeeting(viewer, meeting)) return { kind: "notHost", title: meeting.title };

  if (meetingStatusOf(meeting, new Date()) === MEETING_STATUS.DONE) {
    return { kind: "alreadyDone", title: meeting.title };
  }

  /*
    ⚠️ 소속·직급까지 든다. 회의 중 참가자 레일은 이름만으로 부족하다 — 명부가 하나라
       화면마다 같은 사람이 같은 이름·같은 아바타 색으로 나온다(§구성원과 같은 이유).
  */
  const roster = new Map(listMockManagedMembers().map((member) => [member.id, member]));

  return {
    kind: "ok",
    meeting: {
      id: meeting.id,
      title: meeting.title,
      projectTag: meeting.projectTag,
      schedule: formatMeetingSchedule(meeting.start, meeting.end),
      // ⚠️ 비대면 회의(`roomName === null`)는 이 자리에 올 일이 없다 — 만들어지자마자 완료
      //    상태라 위의 "이미 끝난 회의" 분기가 먼저 걸린다(캡처는 시작 전·진행중만 연다).
      //    타입만 맞춘다(`meeting.roomName`이 `string | null`이 됐다, 이슈 #473).
      roomName: meeting.roomName ?? "",
      attendees: meeting.attendeeIds.map((attendeeId) => {
        const member = roster.get(attendeeId);
        return {
          id: attendeeId,
          name: member?.name ?? "알 수 없음",
          // 목 명부는 퇴사자를 안 담는다(§도메인 상수) — 이 화면에서 퇴사 시나리오를 만들 수 없다.
          isResigned: false,
          // 팀이 없는 사람(대표)은 직급만 — 빈 가운뎃점을 남기지 않는다
          subtitle: [member?.teamName, member?.position].filter(Boolean).join(" · "),
          isHost: attendeeId === meeting.hostId,
        };
      }),
    },
  };
}

/**
 * 캡처 진입 — 실서버.
 *
 * ⚠️ **판정 순서를 목과 똑같이 맞춘다**(없음 → Host 아님 → 이미 끝남 → 통과). 순서가 갈리면
 *    같은 회의가 목에서는 `notHost`, 실서버에서는 `alreadyDone`으로 다르게 막혀 화면이
 *    다른 말을 한다.
 * ⚠️ **404(`MT-001`)는 값으로 돌린다.** 던지면 `error.tsx`가 뜨는데, 없는 회의는 고장이 아니라
 *    "그런 회의가 없습니다"라고 말해 줄 일이다(§view-types: 못 들어가는 이유를 값으로).
 *    나머지 오류(500·네트워크)는 그대로 던진다 — 그건 진짜 고장이라 에러 화면이 맞다.
 * ⚠️ **403(`MT-011` 열람 권한 없음)은 뭉개지 않는다.** BE가 막았다면 우리 판정이 틀렸다는
 *    뜻이라, 조용히 다른 화면을 그리면 어긋난 걸 아무도 모른다.
 * ⚠️ **개설자 판정은 `canCaptureMeeting`이 한다** — 목 경로와 같은 함수다. 응답에서는 그 값이
 *    `host.memberId`에 들어 있어 매퍼(`hostIdOf`)가 꺼내 준다. `server.ts`가 중첩을 직접
 *    벗기면 shape이 바뀔 때 여기까지 고쳐야 한다.
 */
async function getLiveMeetingCapture(id: string, viewer: Actor): Promise<MeetingCaptureResult> {
  const accessToken = await requireAccessToken();

  let raw: unknown;
  try {
    raw = await serverApi<unknown>(ep.meeting(Number(id)), { accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { kind: "notFound" };
    throw error;
  }

  /* ⚠️ 단언이 아니라 **검사**다 — 모양이 어긋나면 판정 전에 여기서 멈춘다(매퍼 주석 참고) */
  const detail = parseMeetingDetail(raw);

  /* ⚠️ 판정은 목 경로와 **같은 함수**다 — 매퍼는 값이 어디 있는지만 알려 준다(§권한) */
  if (!canCaptureMeeting(viewer, { hostId: hostIdOf(detail) })) {
    return { kind: "notHost", title: detail.title };
  }
  if (isClosed(detail)) return { kind: "alreadyDone", title: detail.title };

  return { kind: "ok", meeting: toMeetingCaptureInfo(detail) };
}
