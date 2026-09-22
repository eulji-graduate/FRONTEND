import { AI_SUMMARY_STATUS } from "@/constants/meeting";

import {
  type BeDashboardMeeting,
  type BeMeetingDetail,
  type BeMeetingListItem,
  type BeUtterance,
  hostIdOf,
  isClosed,
  meetingPendingReasonOf,
  parseDashboardMeetings,
  parseMeetingDetail,
  parseMeetingList,
  parseTranscriptsResponse,
  toDashboardMeetingCard,
  toMeetingCaptureInfo,
  toMeetingDetailView,
  toMeetingListItem,
  toScriptChunks,
} from "./mapper";

/** MEET-04 응답 그대로 — 중첩·필드 이름을 BE 실코드에 맞춰 둔다 */
const BASE: BeMeetingDetail = {
  meetingId: 12,
  title: "굿즈 앱 주간 운영 점검",
  status: "SCHEDULED",
  startAt: "2026-08-14T10:00:00",
  endAt: "2026-08-14T10:30:00",
  pendingActionCount: 0,
  /* ⚠️ 안 끝난 회의는 `NONE`이다 — 요약을 시도조차 안 한 상태(BE `MeetingSummaryStatus`) */
  summaryStatus: "NONE",
  /* ⚠️ 일부러 안 채운다 — #461 필드가 없는 기본 상태를 대표하는 게 이 BASE의 역할이다(아래
     "안 물어본 칸" 테스트가 이 값에 기댄다). 필요한 테스트가 각자 override한다. */
  project: { projectId: 3, tag: "GOODS" },
  meetingRoom: { meetingRoomId: 2, name: "대회의실" },
  host: { memberId: 1, name: "대표 계정" },
  attendees: [
    { memberId: 1, name: "대표 계정", teamId: null, teamName: null, jobPosition: "대표" },
    { memberId: 2, name: "김서준", teamId: 5, teamName: "개발팀", jobPosition: "팀장" },
  ],
  recordingConsent: false,
};

describe("toMeetingCaptureInfo", () => {
  it("중첩된 태그·회의실을 꺼내고 id를 문자열로 바꾼다", () => {
    const info = toMeetingCaptureInfo(BASE);

    expect(info.id).toBe("12");
    expect(info.projectTag).toBe("GOODS");
    expect(info.roomName).toBe("대회의실");
  });

  it("시각을 우리 표기로 굳힌다 — 화면이 원문을 포맷하지 않는다", () => {
    // ⚠️ 오프셋 없는 문자열이라 프로세스 시간대로 읽힌다(서버는 `TZ=Asia/Seoul`)
    expect(toMeetingCaptureInfo(BASE).schedule).toBe("8월 14일(금) 10:00 – 10:30");
  });

  it("팀이 없는 사람은 앞이 빈 가운뎃점을 남기지 않는다", () => {
    const subtitles = toMeetingCaptureInfo(BASE).attendees.map((attendee) => attendee.subtitle);

    expect(subtitles).toEqual(["대표", "개발팀 · 팀장"]);
  });

  it("개설자만 진행자로 표시한다", () => {
    const marked = toMeetingCaptureInfo(BASE).attendees.map((attendee) => attendee.isHost);

    expect(marked).toEqual([true, false]);
  });
});

describe("hostIdOf", () => {
  /* ⚠️ 매퍼는 값이 어디 있는지만 안다 — 들어갈 수 있냐는 `canCaptureMeeting`이 정한다 */
  it("중첩 안의 개설자 id를 꺼낸다", () => {
    expect(hostIdOf(BASE)).toBe(1);
  });
});

describe("isClosed", () => {
  it("예정·진행중은 녹음할 수 있다", () => {
    expect(isClosed({ status: "SCHEDULED" })).toBe(false);
    expect(isClosed({ status: "IN_PROGRESS" })).toBe(false);
  });

  it("끝났거나 취소된 회의는 막는다 — 취소는 아직 화면 계약에 없어 같은 자리로 보낸다", () => {
    expect(isClosed({ status: "DONE" })).toBe(true);
    expect(isClosed({ status: "CANCELED" })).toBe(true);
  });
});

describe("parseMeetingDetail", () => {
  it("우리가 읽는 모양이면 그대로 돌려준다", () => {
    expect(parseMeetingDetail(BASE)).toBe(BASE);
  });

  /*
    ⚠️ 단언만 하던 때는 여기서 안 터지고 **한참 뒤 `host.memberId`에서** 터졌다 —
       원인을 알 수 없는 `TypeError`가 아니라 무엇이 어긋났는지 말하게 한다(§정직성).
  */
  it.each([
    ["중첩이 통째로 없으면", { ...BASE, host: undefined }],
    ["참석자가 배열이 아니면", { ...BASE, attendees: null }],
    ["id가 문자열로 오면", { ...BASE, meetingId: "12" }],
    ["응답이 비면", null],
    ["참석자에 null이 섞이면", { ...BASE, attendees: [null] }],
    ["참석자에 이름이 없으면", { ...BASE, attendees: [{ memberId: 2, teamName: null }] }],
    [
      "참석자 직급이 문자열도 null도 아니면",
      { ...BASE, attendees: [{ memberId: 2, name: "김서준", teamName: null, jobPosition: 3 }] },
    ],
    ["소속 팀이 숫자도 null도 아니면", { ...BASE, teamId: "3" }],
    ["안건 소주제가 배열이 아니면", { ...BASE, agenda: { mainTopic: "운영", subTopics: null } }],
    [
      "안건 소주제에 문자열이 아닌 게 섞이면",
      { ...BASE, agenda: { mainTopic: null, subTopics: [3] } },
    ],
  ])("%s 판정 전에 멈춘다", (_label, broken) => {
    expect(() => parseMeetingDetail(broken)).toThrow("약속한 모양");
  });

  /* ⚠️ #461이 늦게 배포돼도 상세가 통째로 막히면 안 된다(목록 파서와 같은 이유) */
  it("#461 확장 필드가 없거나 null인 응답도 통과시킨다", () => {
    expect(parseMeetingDetail(BASE)).toBe(BASE);

    const nulled = { ...BASE, teamId: null, agenda: null };
    expect(parseMeetingDetail(nulled)).toBe(nulled);
  });
});

/**
 * 목록(MEET-02) — **BE 실코드에서 옮겨 적은 shape**으로 검증한다(§연동 검증).
 * [확인] `meeting/presentation/api/response/MeetingListResponse.java`(2026-08-13).
 */
const LIST_ITEM: BeMeetingListItem = {
  meetingId: 91,
  title: "굿즈 앱 주간 운영 점검",
  status: "DONE",
  startAt: "2026-08-14T10:00:00",
  endAt: "2026-08-14T10:30:00",
  attendeeCount: 4,
  isHost: true,
  meetingRoom: { meetingRoomId: 2, name: "대회의실" },
  project: { projectId: 3, tag: "GOODS" },
};

describe("parseMeetingList", () => {
  it("봉투 안의 회의 배열만 꺼낸다 — `page`는 안 본다", () => {
    const raw = {
      meetings: [LIST_ITEM],
      page: { page: 0, size: 20, totalElements: 1, totalPages: 1 },
    };

    expect(parseMeetingList(raw)).toEqual([LIST_ITEM]);
  });

  it("결과가 없어도 빈 배열로 통과한다 — BE가 null을 안 준다", () => {
    expect(parseMeetingList({ meetings: [], page: {} })).toEqual([]);
  });

  it.each([
    ["응답이 비면", null],
    ["회의가 배열이 아니면", { meetings: null }],
    ["행에 null이 섞이면", { meetings: [null] }],
    ["개설자 여부가 없으면", { meetings: [{ ...LIST_ITEM, isHost: undefined }] }],
    ["중첩 회의실이 통째로 없으면", { meetings: [{ ...LIST_ITEM, meetingRoom: undefined }] }],
    ["소속 팀이 숫자도 null도 아니면", { meetings: [{ ...LIST_ITEM, teamId: "3" }] }],
    ["안건 미리보기 모양이 다르면", { meetings: [{ ...LIST_ITEM, agendaPreview: [null] }] }],
  ])("%s 그리기 전에 멈춘다", (_label, broken) => {
    expect(() => parseMeetingList(broken)).toThrow("약속한 모양");
  });

  /*
    ⚠️ **머지 순서에 안전해야 한다.** #461 확장 필드는 BE가 아직 안 줄 수 있다 — 필수로
       검사하면 FE가 먼저 배포됐을 때 **목록 전체가 통째로 막힌다**(§Mock 격리막).
  */
  it("#461 확장 필드가 통째로 없는 구버전 응답도 통과시킨다", () => {
    expect(parseMeetingList({ meetings: [LIST_ITEM] })).toEqual([LIST_ITEM]);
  });

  it("#461 확장 필드가 null로 와도 통과시킨다 — Owner 개설·안건 0건이 그 모양이다", () => {
    const row = { ...LIST_ITEM, teamId: null, summaryStatus: null, agendaPreview: null };

    expect(parseMeetingList({ meetings: [row] })).toEqual([row]);
  });

  /*
    ⚠️ **확정된 비대면 회의(2026-08-16, B안)** — startAt·endAt·meetingRoom이 모두 null이다.
       예전 계약은 세 필드를 non-null 문자열로 강제해서, 이 행이 하나만 섞여도 배열 전체가
       throw로 죽었다. 정상 행과 섞여도 파서가 통과해야 한다.
  */
  it("비대면 회의(startAt/endAt/meetingRoom 모두 null)가 섞여도 배열이 통과한다", () => {
    const online = { ...LIST_ITEM, startAt: null, endAt: null, meetingRoom: null };

    expect(parseMeetingList({ meetings: [LIST_ITEM, online] })).toEqual([LIST_ITEM, online]);
  });

  /* ⚠️ 계약을 넓힌 것이지 검사를 없앤 게 아니다 — 있는데 모양이 다른 회의실은 여전히 거절한다 */
  it("meetingRoom이 있는데 모양이 다르면(빈 객체) 여전히 거절한다", () => {
    expect(() => parseMeetingList({ meetings: [{ ...LIST_ITEM, meetingRoom: {} }] })).toThrow(
      "약속한 모양",
    );
  });

  /*
    ⚠️ **세 필드는 함께 움직인다** — 대면이면 셋 다 채우고 비대면이면 셋 다 `null`이다
       (MEET-01/18). mixed 조합이 통과되면 `toMeetingListItem`이 `isOnline`을 `meetingRoom`만
       보고 잘못 판정해 대면 카드의 일시가 사라지거나 비대면 카드에 빈 일시가 뜬다
       (2026-08-16 CodeRabbit 회귀 방어).
  */
  it("startAt은 있는데 meetingRoom이 null인 mixed 조합은 거절한다", () => {
    expect(() => parseMeetingList({ meetings: [{ ...LIST_ITEM, meetingRoom: null }] })).toThrow(
      "약속한 모양",
    );
  });

  it("meetingRoom은 있는데 startAt이 null인 mixed 조합도 거절한다", () => {
    expect(() => parseMeetingList({ meetings: [{ ...LIST_ITEM, startAt: null }] })).toThrow(
      "약속한 모양",
    );
  });

  it("endAt만 null(다른 둘은 있음)인 mixed 조합도 거절한다", () => {
    expect(() => parseMeetingList({ meetings: [{ ...LIST_ITEM, endAt: null }] })).toThrow(
      "약속한 모양",
    );
  });
});

describe("toMeetingListItem", () => {
  it("중첩된 태그·회의실을 꺼내고 시각을 우리 표기로 굳힌다", () => {
    const item = toMeetingListItem(LIST_ITEM);

    expect(item.id).toBe("91");
    expect(item.projectTag).toBe("GOODS");
    expect(item.roomName).toBe("대회의실");
    expect(item.schedule).toBe("8월 14일(금) 10:00 – 10:30");
  });

  /* ⚠️ 이 값이 두 탭을 가른다 — 백엔드 §10-A 요청의 핵심이라 값으로 고정해 둔다 */
  it("개설자 여부를 그대로 싣는다", () => {
    expect(toMeetingListItem(LIST_ITEM).isHost).toBe(true);
    expect(toMeetingListItem({ ...LIST_ITEM, isHost: false }).isHost).toBe(false);
  });

  /*
    ⚠️ **없는 값을 지어내지 않는다**(§정직성). BE #461 배포 전 응답엔 요약 상태·소속 팀·안건이
       없다 — 채우면 완료 카드에 [액션 검토]가 잘못 뜨거나 안 뜬다.
    ⚠️ 특히 `teamId`는 **없는 것(`undefined`)과 `null`이 다른 뜻**이다. 뭉치면 미배포 서버의
       모든 회의가 "Owner 개설"로 읽힌다.
  */
  it("#461 확장 필드가 없으면 요약 상태·소속 라벨·안건을 비운다", () => {
    const item = toMeetingListItem(LIST_ITEM);

    expect(item.aiSummaryStatus).toBeNull();
    expect(item.originLabel).toBe("");
    expect(item.topicSummary).toBe("");
  });

  /*
    ⚠️ **비대면 회의**(2026-08-16, B안) — 상세 매퍼와 같은 규칙으로 세 필드를 접는다.
       카드가 `isOnline`을 보고 그 자리에 "온라인으로 진행된 회의입니다"를 대신 그린다.
  */
  it("startAt/endAt/meetingRoom이 모두 null이면 schedule/roomName을 비우고 isOnline=true", () => {
    const item = toMeetingListItem({
      ...LIST_ITEM,
      startAt: null,
      endAt: null,
      meetingRoom: null,
    });

    expect(item.schedule).toBe("");
    expect(item.roomName).toBe("");
    expect(item.isOnline).toBe(true);
  });

  it("대면 회의는 isOnline=false", () => {
    expect(toMeetingListItem(LIST_ITEM).isOnline).toBe(false);
  });

  /* [확인] BE PR #461 `MeetingListQueryService.originLabel` — `teamId == null`이 Owner다 */
  it("소속 팀이 null이면 Owner 개설, 숫자면 팀 액션 회의로 읽는다", () => {
    expect(toMeetingListItem({ ...LIST_ITEM, teamId: null }).originLabel).toBe("Owner 개설");
    expect(toMeetingListItem({ ...LIST_ITEM, teamId: 7 }).originLabel).toBe("팀 액션 회의");
  });

  it("안건 미리보기를 `대주제 · 소주제` 한 줄로 잇는다", () => {
    const preview = { mainTopic: "운영", firstSubTopic: "주간 점검" };

    expect(toMeetingListItem({ ...LIST_ITEM, agendaPreview: preview }).topicSummary).toBe(
      "운영 · 주간 점검",
    );
  });

  /* ⚠️ 한쪽만 있는 안건에 가운뎃점을 남기면 카드가 ` · 주간 점검`으로 읽힌다 */
  it.each([
    [{ mainTopic: "운영", firstSubTopic: null }, "운영"],
    [{ mainTopic: null, firstSubTopic: "주간 점검" }, "주간 점검"],
    [{ mainTopic: null, firstSubTopic: null }, ""],
  ])("한쪽만 있는 안건은 가운뎃점째 뺀다 (%p)", (agendaPreview, expected) => {
    expect(toMeetingListItem({ ...LIST_ITEM, agendaPreview }).topicSummary).toBe(expected);
  });

  /*
    ⚠️ 목록이 실제로 주는 값은 `NONE`·`STALLED`·`null`뿐이다(BE `resolveSummaryStatus`) —
       나머지는 어휘만 맞춰 두고, 모르는 값은 지어내지 않는다.
  */
  it.each([
    ["NONE", null],
    ["STALLED", AI_SUMMARY_STATUS.FAILED],
    /* ⚠️ 목록엔 아직 안 온다(BE가 STALLED로 접는다) — 접기를 푸는 날 조용히 갈리지 않게 잠근다 */
    ["FAILED", AI_SUMMARY_STATUS.FAILED],
    ["PROCESSING", AI_SUMMARY_STATUS.SUMMARIZING],
    ["DONE", AI_SUMMARY_STATUS.REVIEWED],
    /* ⚠️ 분석 시작 전이라 화면에 쓸 말이 아직 없다 — 문구는 팀 결정 대기다 */
    ["WAITING_TRANSCRIPT", null],
    ["WHAT", null],
  ])("요약 상태 %s를 화면 어휘로 옮긴다", (summaryStatus, expected) => {
    expect(toMeetingListItem({ ...LIST_ITEM, summaryStatus }).aiSummaryStatus).toBe(expected);
  });

  it("모르는 상태는 그냥 넘기지 않는다", () => {
    expect(() => toMeetingListItem({ ...LIST_ITEM, status: "PAUSED" })).toThrow(
      "알 수 없는 회의 상태",
    );
  });
});

/**
 * 상세의 요약 신호(MEET-04) → 화면이 «아직 못 보여주는 이유».
 * [확인] `meeting/domain/model/MeetingSummaryStatus.java` ·
 *   `application/service/MeetingDetailQueryService.resolveSummaryStatus`(2026-08-13).
 */
describe("meetingPendingReasonOf", () => {
  const done = { status: "DONE", summaryStatus: null, pendingActionCount: 0 };

  it("회의 상태를 먼저 본다 — 안 끝난 회의는 요약을 시작조차 안 했다", () => {
    expect(meetingPendingReasonOf({ ...done, status: "SCHEDULED" })).toBe("SCHEDULED");
    expect(meetingPendingReasonOf({ ...done, status: "IN_PROGRESS" })).toBe("IN_PROGRESS");
    expect(meetingPendingReasonOf({ ...done, status: "CANCELED" })).toBe("CANCELED");
  });

  it("중단은 실패로, 완료는 다 찬 것으로 읽는다", () => {
    expect(meetingPendingReasonOf({ ...done, summaryStatus: "STALLED" })).toBe("FAILED");
    expect(meetingPendingReasonOf({ ...done, summaryStatus: "DONE" })).toBeNull();
  });

  /*
    ⚠️ 이걸 놓쳐서 **요약 실패가 끝나지 않는 「요약 중」으로 보였다**(2026-08-16 고침).
       `FAILED`가 어느 분기에도 안 걸려 마지막 줄로 떨어졌었다.
  */
  it("실패(FAILED)도 중단과 같은 자리에서 걸러 «요약 중»으로 흘리지 않는다", () => {
    expect(meetingPendingReasonOf({ ...done, summaryStatus: "FAILED" })).toBe("FAILED");
  });

  /* ⚠️ 초안이 있어도 실패가 먼저다 — 뒤 계층이 깨진 회의는 [다시 분석]부터 안내해야 한다 */
  it("초안이 있어도 실패를 먼저 말한다", () => {
    expect(
      meetingPendingReasonOf({ ...done, summaryStatus: "FAILED", pendingActionCount: 3 }),
    ).toBe("FAILED");
  });

  /*
    ⚠️ **팀 결정 대기 중인 현행을 못박는다.** 끝난 회의의 `NONE`(자막 0건이라 분석이 안 돎)과
       `WAITING_TRANSCRIPT`(받아쓰기 도는 중)를 무엇이라 쓸지 정해지면 **이 테스트도 같이 고친다.**
  */
  it("[현행·팀결정대기] 끝난 회의의 NONE·WAITING_TRANSCRIPT는 아직 «요약 중»이다", () => {
    expect(meetingPendingReasonOf({ ...done, summaryStatus: "NONE" })).toBe("SUMMARIZING");
    expect(meetingPendingReasonOf({ ...done, summaryStatus: "WAITING_TRANSCRIPT" })).toBe(
      "SUMMARIZING",
    );
  });

  /*
    ⚠️ BE는 `null`을 "끝났지만 PROCESSING인지 DONE인지 모른다"는 뜻으로 준다 — 그걸 완료로
       읽으면 화면이 "하달된 액션이 없습니다"라고 단정한다(§정직성).
  */
  it("모르는 값(null)을 완료로 읽지 않는다", () => {
    expect(meetingPendingReasonOf(done)).toBe("SUMMARIZING");
  });

  /* ⚠️ 초안이 나왔다는 건 요약이 끝났다는 증거다 — 그때는 검토 대기 안내가 맞는 말이다 */
  it("확정 대기 건수가 있으면 요약은 끝난 것으로 본다", () => {
    expect(meetingPendingReasonOf({ ...done, pendingActionCount: 3 })).toBeNull();
  });

  /* ⚠️ 상태값이 뭐라 하든 초안이 있으면 검토 대기다 — 상태만 보면 "요약 중"이 뜬다 */
  it("상태가 PROCESSING이어도 초안이 있으면 요약 중이라 하지 않는다", () => {
    expect(
      meetingPendingReasonOf({ ...done, summaryStatus: "PROCESSING", pendingActionCount: 2 }),
    ).toBeNull();
  });

  /* ⚠️ 중단만은 초안보다 앞이다 — 뒤 계층이 깨진 회의는 [다시 분석]부터 안내한다 */
  it("중단은 초안이 있어도 실패로 읽는다", () => {
    expect(
      meetingPendingReasonOf({ ...done, summaryStatus: "STALLED", pendingActionCount: 2 }),
    ).toBe("FAILED");
  });
});

describe("toMeetingDetailView", () => {
  const DONE_DETAIL: BeMeetingDetail = {
    ...BASE,
    status: "DONE",
    summaryStatus: null,
    pendingActionCount: 2,
  };

  it("중첩된 프로젝트·회의실·참석자를 화면 계약으로 편다", () => {
    const detail = toMeetingDetailView(DONE_DETAIL, { isHost: true });

    expect(detail.id).toBe("12");
    expect(detail.projectId).toBe(3);
    expect(detail.roomName).toBe("대회의실");
    expect(detail.attendees).toEqual([
      { id: 1, name: "대표 계정", isResigned: false },
      { id: 2, name: "김서준", isResigned: false },
    ]);
  });

  it("녹음 동의를 그대로 옮기고, 시작 시각·회의실을 슬롯 피커 초기값으로 바꾼다(#436)", () => {
    const detail = toMeetingDetailView({ ...BASE, recordingConsent: true }, { isHost: true });

    expect(detail.recordingConsent).toBe(true);
    expect(detail.editableSlot).toEqual({
      date: "2026-08-14",
      startTime: "10:00",
      meetingRoomId: "2",
    });
  });

  it("비대면 회의(시작 시각·회의실이 없다)는 editableSlot이 null이다", () => {
    const detail = toMeetingDetailView(
      { ...BASE, startAt: null, endAt: null, meetingRoom: null },
      { isHost: true },
    );

    expect(detail.editableSlot).toBeNull();
  });

  it("퇴사한 참석자는 isResigned를 그대로 옮기고, 없으면(옛 응답) 재직으로 본다(FE 감사 #13)", () => {
    const detail = toMeetingDetailView(
      {
        ...BASE,
        attendees: [
          { memberId: 1, name: "대표 계정", teamName: null, jobPosition: "대표", isResigned: true },
          { memberId: 2, name: "김서준", teamName: "개발팀", jobPosition: "팀장" },
        ],
      },
      { isHost: true },
    );

    expect(detail.attendees).toEqual([
      { id: 1, name: "대표 계정", isResigned: true },
      { id: 2, name: "김서준", isResigned: false },
    ]);
  });

  it("확정 대기 건수와 중단 여부를 그대로 싣는다", () => {
    expect(toMeetingDetailView(DONE_DETAIL, { isHost: true }).pendingActionCount).toBe(2);
    expect(toMeetingDetailView(DONE_DETAIL, { isHost: true }).isStalled).toBe(false);
    expect(
      toMeetingDetailView({ ...DONE_DETAIL, summaryStatus: "STALLED" }, { isHost: true }).isStalled,
    ).toBe(true);
  });

  /*
    ⚠️ **중단(STALLED)과 실패(FAILED)를 뭉개지 않는다.** 못 보여주는 이유(`pendingReason`)는
       둘 다 "FAILED"로 같지만, `isStalled`는 **원인을 가르는 값**이라 STALLED만 true다 —
       넓히면 실패한 회의에 "다시 분석하면 됩니다"라는 거짓 안내가 붙는다.
  */
  it("실패(FAILED)는 중단이 아니다 — 못 보여주는 이유는 같아도 원인은 가른다", () => {
    const failed = toMeetingDetailView(
      { ...DONE_DETAIL, summaryStatus: "FAILED", pendingActionCount: 0 },
      { isHost: true },
    );
    expect(failed.pendingReason).toBe("FAILED");
    expect(failed.isStalled).toBe(false);
  });

  /*
    ⚠️ **빈 배열이 아니라 `null`이다.** 빈 배열은 "물어봤는데 없다"는 뜻이라 화면이 "없습니다"라고
       단정하는데, 산출물·발화 기록은 다른 API가 줄 값이라 **묻지도 않았다**(§정직성).
  */
  it("안 물어본 칸(산출물·발화 기록)은 null, #461 전 응답의 안건·소속 라벨은 비운다", () => {
    const detail = toMeetingDetailView(DONE_DETAIL, { isHost: false });

    expect(detail.outputs).toBeNull();
    expect(detail.script).toBeNull();
    expect(detail.agenda).toBeNull();
    expect(detail.originLabel).toBe("");
    expect(detail.parentTeamActionHref).toBeNull();
    /* 팀 액션인지 개인 액션인지는 `teamId`가 없으면 못 가른다 — 둘 중 하나로 찍지 않는다 */
    expect(detail.outputKindLabel).toBe("액션");
  });

  /* [확인] BE PR #461 `MeetingDetailQueryService`(2026-08-13) — `teamId == null`이 Owner다 */
  it("소속 팀이 null이면 Owner 개설·팀 액션, 숫자면 팀 회의·개인 액션으로 읽는다", () => {
    const owner = toMeetingDetailView({ ...DONE_DETAIL, teamId: null }, { isHost: false });
    const team = toMeetingDetailView({ ...DONE_DETAIL, teamId: 7 }, { isHost: false });

    expect(owner.originLabel).toBe("Owner 개설");
    expect(owner.outputKindLabel).toBe("팀 액션");
    expect(team.originLabel).toBe("팀 액션 회의");
    expect(team.outputKindLabel).toBe("개인 액션");
  });

  /*
    ⚠️ 상위 팀 액션 링크는 **`teamId`가 와도 못 만든다** — 팀은 팀 액션이 아니다(#461 회신).
       팀 회의라는 걸 안다고 링크를 지어 붙이면 존재하지 않는 주소로 보낸다(§정직성).
  */
  it("팀 회의여도 상위 팀 액션 링크는 안 만든다 — 팀 액션 id가 응답에 없다", () => {
    expect(
      toMeetingDetailView({ ...DONE_DETAIL, teamId: 7 }, { isHost: false }).parentTeamActionHref,
    ).toBeNull();
  });

  it("안건을 대주제 하나 + 소주제 목록 그대로 싣는다 — 쌍으로 지어 붙이지 않는다", () => {
    const detail = toMeetingDetailView(
      { ...DONE_DETAIL, agenda: { mainTopic: "운영", subTopics: ["주간 점검", "배송 정책"] } },
      { isHost: false },
    );

    expect(detail.agenda).toEqual({ main: "운영", subs: ["주간 점검", "배송 정책"] });
  });

  /* ⚠️ 판정은 `lib/permission.ts`가 한다 — 매퍼는 결과만 받는다(§권한) */
  it("개설자 여부는 부르는 쪽이 판정한 값을 그대로 쓴다", () => {
    expect(toMeetingDetailView(DONE_DETAIL, { isHost: false }).isHost).toBe(false);
  });
});

/**
 * 대시보드 최근 회의(MEET-17).
 * [확인] `meeting/presentation/api/response/DashboardMeetingListResponse.java`(2026-08-13).
 */
const DASHBOARD_MEETING: BeDashboardMeeting = {
  meetingId: 91,
  title: "8월 스프린트 계획",
  projectTag: "GOODS",
  status: "DONE",
  room: "회의실 A",
  scheduledAt: "2026-08-12T14:00:00",
  attendeeCount: 4,
  /* ⚠️ 둘 다 `null`이 정상이다 — `scope=team`의 소속 라벨은 명세에 없고, 개설자 라벨은 미구현 */
  originLabel: null,
  hostLabel: null,
};

describe("parseDashboardMeetings", () => {
  it("결과가 없어도 빈 배열로 통과한다", () => {
    expect(parseDashboardMeetings({ meetings: [] })).toEqual([]);
  });

  it.each([
    ["응답이 비면", null],
    ["회의가 배열이 아니면", { meetings: {} }],
    ["라벨이 문자열도 null도 아니면", { meetings: [{ ...DASHBOARD_MEETING, hostLabel: 3 }] }],
  ])("%s 그리기 전에 멈춘다", (_label, broken) => {
    expect(() => parseDashboardMeetings(broken)).toThrow("약속한 모양");
  });
});

describe("toDashboardMeetingCard", () => {
  it("평평한 카드 값을 그대로 옮긴다", () => {
    expect(toDashboardMeetingCard(DASHBOARD_MEETING)).toEqual({
      id: "91",
      title: "8월 스프린트 계획",
      projectTag: "GOODS",
      status: "DONE",
      room: "회의실 A",
      scheduledAt: "2026-08-12T14:00:00",
      attendeeCount: 4,
    });
  });

  /* ⚠️ `null`은 키째로 뺀다 — 선택 필드라 없으면 화면이 배지를 안 그린다(§정직성) */
  it("서버가 준 라벨이 있으면 싣는다", () => {
    const card = toDashboardMeetingCard({
      ...DASHBOARD_MEETING,
      originLabel: "개발팀",
      hostLabel: "김서준(팀장)",
    });

    expect(card.originLabel).toBe("개발팀");
    expect(card.hostLabel).toBe("김서준(팀장)");
  });
});

describe("parseTranscriptsResponse — ANLZ-05", () => {
  const UTTERANCE: BeUtterance = {
    transcriptId: 1,
    seq: 0,
    speakerMemberId: 3,
    speakerSource: "SELF_STREAM",
    startOffsetMs: 4_000,
    endOffsetMs: 6_500,
    content: "안녕하세요, 시작하겠습니다.",
  };

  it("정상 응답을 그대로 읽는다", () => {
    expect(parseTranscriptsResponse({ utterances: [UTTERANCE], nextCursor: "abc" })).toEqual({
      utterances: [UTTERANCE],
      nextCursor: "abc",
    });
  });

  /* ⚠️ 마지막 페이지는 `nextCursor`가 없다(`undefined`) — `null`로 정규화해 호출부가 한 값만 본다 */
  it("마지막 페이지의 nextCursor 부재를 null로 정규화한다", () => {
    expect(parseTranscriptsResponse({ utterances: [] }).nextCursor).toBeNull();
  });

  /* ⚠️ speakerMemberId===null은 정상이다(BE 주석 — 화자 판정 포기) — 검사에 안 걸려야 한다 */
  it("speakerMemberId가 null이어도 통과한다(화자 판정 포기, 오류 아님)", () => {
    expect(() =>
      parseTranscriptsResponse({
        utterances: [{ ...UTTERANCE, speakerMemberId: null, speakerSource: null }],
      }),
    ).not.toThrow();
  });

  it.each([
    ["utterances가 없음", { nextCursor: "x" }],
    ["content가 숫자", { utterances: [{ ...UTTERANCE, content: 1 }] }],
    ["배열 안이 문자열", { utterances: ["안녕"] }],
  ])("%s이면 그리기 전에 멈춘다", (_label, broken) => {
    expect(() => parseTranscriptsResponse(broken)).toThrow("약속한 모양");
  });
});

describe("toScriptChunks — 회의 시작 + 오프셋 = 발화 시각", () => {
  /* ⚠️ 목 데이터와 같은 형식이다(`mock/seed.ts`) — "10:00", "10:04"처럼 회의 시작 기준 시계다 */
  it("시작 시각에 오프셋(ms)을 더해 HH:MM으로 찍는다", () => {
    const start = new Date("2026-08-14T10:00:00+09:00");
    const chunks = toScriptChunks(start, [
      {
        transcriptId: 1,
        seq: 0,
        speakerMemberId: 3,
        speakerSource: null,
        startOffsetMs: 0,
        endOffsetMs: 2_000,
        content: "시작합니다.",
      },
      {
        transcriptId: 2,
        seq: 1,
        speakerMemberId: 4,
        speakerSource: null,
        startOffsetMs: 240_000,
        endOffsetMs: 245_000,
        content: "네, 진행하겠습니다.",
      },
    ]);

    expect(chunks).toEqual([
      { at: "10:00", text: "시작합니다." },
      { at: "10:04", text: "네, 진행하겠습니다." },
    ]);
  });

  /* ⚠️ 화자 귀속 포기(오프셋 없음)도 화면에서는 그냥 회의 시작 시각으로 보인다 — 없는 값을 지어내지 않는다 */
  it("오프셋이 없으면(null) 회의 시작 시각으로 찍는다", () => {
    const start = new Date("2026-08-14T14:00:00+09:00");
    const chunks = toScriptChunks(start, [
      {
        transcriptId: 1,
        seq: 0,
        speakerMemberId: null,
        speakerSource: null,
        startOffsetMs: null,
        endOffsetMs: null,
        content: "...",
      },
    ]);

    expect(chunks[0]!.at).toBe("14:00");
  });

  /* ⚠️ BE는 페이지 단위로 주는데, 페이지 경계에서 seq가 뒤섞여 오면 화면 순서가 틀어진다 */
  it("seq 순서가 뒤섞여 와도 시간순으로 정렬한다", () => {
    const start = new Date("2026-08-14T10:00:00+09:00");
    const chunks = toScriptChunks(start, [
      {
        transcriptId: 2,
        seq: 1,
        speakerMemberId: null,
        speakerSource: null,
        startOffsetMs: 60_000,
        endOffsetMs: null,
        content: "두 번째",
      },
      {
        transcriptId: 1,
        seq: 0,
        speakerMemberId: null,
        speakerSource: null,
        startOffsetMs: 0,
        endOffsetMs: null,
        content: "첫 번째",
      },
    ]);

    expect(chunks.map((chunk) => chunk.text)).toEqual(["첫 번째", "두 번째"]);
  });
});
