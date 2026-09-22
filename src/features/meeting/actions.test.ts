// 서버 액션은 next 런타임 함수를 부른다 — jsdom엔 없으니 목으로 대체하고 호출만 검증한다.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// isMock은 NEXT_PUBLIC_USE_MOCK 환경변수로 정해진다 — 테스트가 환경에 휘둘리지 않게 고정한다.
jest.mock("@/mocks/config", () => ({ isMock: true }));
// 기본은 실제 getMockActor()와 같은 값(OWNER, Admin 아님) — `canManageMeeting`이 OWNER를
// 통과시키므로 host가 아닌 회의도 고칠 수 있다(MEET-09 계약: host·OWNER·ADMIN).
jest.mock("@/lib/mock-actor", () => ({
  getMockActor: jest.fn(() => ({ id: 1, role: "OWNER" })),
}));

import {
  createOnlineMeetingAction,
  getOnlineMeetingRecordingUploadUrlAction,
  updateMeetingAttendeesAction,
  updateMeetingScheduleAction,
} from "./actions";
import { addMockMeeting, findMockMeeting } from "./mock/meetings";
import type { MeetingDraft } from "./types";

const INITIAL = { error: null, attendeeIds: null } as const;

/*
  참석자 명부는 `features/rooms/mock/members.ts`다:
    1 박대표(OWNER, 팀 없음) · 2 김서준(개발팀 LEADER) · 3 이하윤(개발팀 MEMBER)
    5 최유진(마케팅팀 LEADER) · 7 강서연(디자인팀 LEADER)
*/
const BASE = {
  title: "테스트 회의",
  roomId: "room-small-b",
  roomName: "소회의실 B",
  projectId: 1,
  projectTag: "GOODS",
  topics: [{ main: "제품", sub: "로드맵 검토" }] as [{ main: string; sub: string }],
  roomReservationId: "reservation-test",
} as const;

/** 아직 안 끝난(예정) 회의를 하나 만든다 — 끝난 회의는 교체 자체가 막힌다. */
function seedMeeting(extra: Partial<MeetingDraft> & Pick<MeetingDraft, "hostAuthority">) {
  const start = new Date(Date.now() + 60 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  return addMockMeeting({
    ...BASE,
    start,
    end,
    hostId: 1,
    attendeeIds: [1],
    ...extra,
  } as MeetingDraft);
}

const form = (meetingId: string, attendeeIds: number[]) => {
  const data = new FormData();
  data.append("meetingId", meetingId);
  for (const id of attendeeIds) data.append("attendeeIds", String(id));
  return data;
};

/*
  ⚠️ 참석자 범위 강제(2026-08-13)는 **개설만이 아니라 교체(MEET-09)에도** 걸린다 — 개설만 막고
     교체를 열어 두면 만든 뒤에 규칙을 깨서 넣을 수 있고, "Owner 개설 회의의 참석자는 전부
     팀장"이라는 AI 팀 액션 판단 근거가 똑같이 무너진다.
*/
describe("참석자 교체(MEET-09) — 범위 재검증", () => {
  it("Owner 개설 회의는 팀장만 받는다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingAttendeesAction(INITIAL, form(meeting.id, [2, 5]));

    expect(result.error).toBeNull();
    expect(result.attendeeIds).toEqual([2, 5, 1]);
  });

  it("Owner 개설 회의에 사원을 끼워 넣으면 막는다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingAttendeesAction(INITIAL, form(meeting.id, [2, 3]));

    expect(result.error).toBe("Owner가 개설하는 회의에는 팀장만 참석자로 지정할 수 있습니다");
    expect(result.attendeeIds).toBeNull();
  });

  it("범위 기준은 액터가 아니라 **그 회의의 host**다 — Owner가 팀 회의를 고쳐도 host의 팀으로 잰다", async () => {
    // host = 김서준(id=2, 개발팀 LEADER). 액터는 OWNER지만 "팀장만"이 아니라 "개발팀만"이 걸린다.
    const meeting = seedMeeting({
      hostAuthority: "LEADER",
      hostId: 2,
      hostTeamId: 7,
      parentTeamActionId: 1,
      attendeeIds: [2],
    });

    const passed = await updateMeetingAttendeesAction(INITIAL, form(meeting.id, [3]));
    expect(passed.error).toBeNull();

    const blocked = await updateMeetingAttendeesAction(INITIAL, form(meeting.id, [5]));
    expect(blocked.error).toBe("자기 팀 소속만 참석자로 지정할 수 있습니다");
  });

  it("현재 명단에 들어 있는 host는 위반으로 세지 않는다(화면을 열기만 해도 막히면 안 된다)", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    // 다이얼로그는 현재 명단(host 포함)을 그대로 초기 선택으로 들고 연다.
    const result = await updateMeetingAttendeesAction(INITIAL, form(meeting.id, [1, 2]));

    expect(result.error).toBeNull();
  });

  it("존재하지 않는 참석자 id는 막는다(폼 조작 방어)", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingAttendeesAction(INITIAL, form(meeting.id, [9999]));

    expect(result.error).toBe("존재하지 않는 참석자가 있습니다");
  });
});

/*
  ⚠️ 비대면 회의 만들기(이슈 #473) — **이 파일은 mock 전용이다**(파일 머리 `isMock: true`
     고정). `!isMock` 분기("아직 준비 중")는 별도 파일(`actions.online-real.test.ts`)이 본다.
*/
const onlineForm = (entries: {
  title?: string;
  projectId?: string;
  attendeeIds?: number[];
  topics?: { main: string; sub: string }[];
  parentTeamActionId?: number;
  withRecording?: boolean;
}) => {
  const data = new FormData();
  data.append("title", entries.title ?? "비대면 주간 싱크");
  data.append("projectId", entries.projectId ?? "1");
  for (const id of entries.attendeeIds ?? [2]) data.append("attendeeIds", String(id));
  for (const topic of entries.topics ?? [{ main: "제품", sub: "로드맵 검토" }]) {
    data.append("topicMain", topic.main);
    data.append("topicSub", topic.sub);
  }
  if (entries.parentTeamActionId !== undefined) {
    data.append("parentTeamActionId", String(entries.parentTeamActionId));
  }
  // ⚠️ 2026-08-14 계약 변경 — 단일 모달이 등록 시점에 S3 업로드까지 끝낸 뒤 이 세 값을 채워
  //    보낸다(`useOnlineMeetingForm.handleSubmit`). 기본값은 "이미 업로드까지 마쳤다"로 둔다.
  if (entries.withRecording ?? true) {
    data.append("recordingS3Key", "recordings/mock/online-pending/meeting.webm");
    data.append("recordingFileName", "meeting.webm");
    data.append("recordingContentType", "audio/webm");
    data.append("recordingSizeBytes", "12345");
  }
  return data;
};

const ONLINE_INITIAL = { errors: {} } as const;

describe("비대면 회의 만들기(이슈 #473) — mock 분기", () => {
  it("성공하면 즉시 완료 처리된 회의를 만들고 id를 돌려준다", async () => {
    const result = await createOnlineMeetingAction(ONLINE_INITIAL, onlineForm({}));

    expect(result.errors).toEqual({});
    expect(result.created?.id).toMatch(/^meeting-\d+$/);
  });

  it("녹음 파일 정보가 없으면 막는다(2026-08-14 계약 변경 — 단일 모달, 등록의 일부다)", async () => {
    const result = await createOnlineMeetingAction(
      ONLINE_INITIAL,
      onlineForm({ withRecording: false }),
    );

    expect(result.errors.recording).toBe("녹음 파일을 첨부해 주세요");
    expect(result.created).toBeUndefined();
  });

  it("존재하지 않는 프로젝트면 막는다(폼 조작 방어)", async () => {
    const result = await createOnlineMeetingAction(
      ONLINE_INITIAL,
      onlineForm({ projectId: "999" }),
    );

    expect(result.errors.projectId).toBe("존재하지 않는 프로젝트입니다");
    expect(result.created).toBeUndefined();
  });

  it("Owner 개설인데 팀장이 아닌 참석자를 넣으면 막는다(참석자 범위)", async () => {
    // 3 = 이하윤(개발팀 MEMBER) — Owner가 여는 회의엔 팀장만 지정할 수 있다.
    const result = await createOnlineMeetingAction(
      ONLINE_INITIAL,
      onlineForm({ attendeeIds: [3] }),
    );

    expect(result.errors.attendeeIds).toBe(
      "Owner가 개설하는 회의에는 팀장만 참석자로 지정할 수 있습니다",
    );
    expect(result.created).toBeUndefined();
  });

  it("존재하지 않는 참석자 id는 막는다(폼 조작 방어)", async () => {
    const result = await createOnlineMeetingAction(
      ONLINE_INITIAL,
      onlineForm({ attendeeIds: [9999] }),
    );

    expect(result.errors.attendeeIds).toBe("존재하지 않는 참석자가 있습니다");
    expect(result.created).toBeUndefined();
  });
});

/*
  ⚠️ 업로드 URL 발급(2026-08-14 계약 변경) — mock 분기는 실제 S3가 없어 `presignedUrl: null`을
     돌려준다(§정직한 목업). 형식·용량 검증은 발급 단계에서 먼저 걸린다.
*/
describe("비대면 회의 녹음 업로드 URL 발급 — mock 분기", () => {
  it("성공하면 s3Key를 받고 presignedUrl은 null이다(목엔 실제 S3가 없다)", async () => {
    const result = await getOnlineMeetingRecordingUploadUrlAction({
      fileName: "meeting.webm",
      contentType: "audio/webm",
      sizeBytes: 12345,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.presignedUrl).toBeNull();
      expect(result.s3Key).toContain("meeting.webm");
    }
  });

  it("지원하지 않는 형식이면 발급 전에 막는다", async () => {
    const result = await getOnlineMeetingRecordingUploadUrlAction({
      fileName: "meeting.txt",
      contentType: "text/plain",
      sizeBytes: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("지원하지 않는 형식입니다");
  });

  it("5GiB를 넘으면 발급 전에 막는다", async () => {
    const result = await getOnlineMeetingRecordingUploadUrlAction({
      fileName: "meeting.webm",
      contentType: "audio/webm",
      sizeBytes: 5 * 1024 * 1024 * 1024 + 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("파일 용량이 5GiB를 넘었습니다");
  });
});

const scheduleForm = (entries: {
  meetingId: string;
  title?: string;
  roomId?: string;
  date?: string;
  startTime?: string;
  projectId?: string;
  recordingConsent?: boolean;
}) => {
  const data = new FormData();
  data.append("meetingId", entries.meetingId);
  data.append("title", entries.title ?? "스프린트 계획 수정");
  data.append("roomId", entries.roomId ?? "room-large");
  // ⚠️ 목의 5개 시드 예약(2026-08-03~06)과 안 겹치는 먼 미래 날짜를 기본값으로 쓴다.
  data.append("date", entries.date ?? "2027-03-01");
  data.append("startTime", entries.startTime ?? "09:00");
  data.append("projectId", entries.projectId ?? "1");
  if (entries.recordingConsent) data.append("recordingConsent", "on");
  return data;
};

const SCHEDULE_INITIAL = { errors: {}, saved: null } as const;

/**
 * 회의 시간·회의실·프로젝트·녹음 동의 수정(MEET-05, #436) — mock 분기.
 * ⚠️ 제목만 고치는 `updateMeetingAction`과 **다른 액션**이다 — 슬롯 피커가 있는 다이얼로그만
 *    이 액션을 쓴다(액션을 나눈 이유는 `actions.ts`의 함수 주석 참고).
 */
describe("회의 시간·회의실·프로젝트·녹음 동의 수정(#436) — mock 분기", () => {
  it("성공하면 회의·예약 레코드가 같이 바뀌고 저장 표식을 돌려준다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({ meetingId: meeting.id, recordingConsent: true }),
    );

    expect(result.errors).toEqual({});
    expect(result.saved).toEqual({ title: "스프린트 계획 수정" });
    // 성공 응답만 보고 끝내지 않는다 — 실제로 스토어에 반영됐는지 다시 읽어 확인한다.
    expect(findMockMeeting(meeting.id)?.recordingConsent).toBe(true);
  });

  it("녹음 동의를 다시 끄면 꺼진 값이 저장된다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });
    await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({ meetingId: meeting.id, recordingConsent: true }),
    );

    await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({ meetingId: meeting.id, recordingConsent: false }),
    );

    expect(findMockMeeting(meeting.id)?.recordingConsent).toBe(false);
  });

  it("시작한 회의는 수정할 수 없다", async () => {
    const meeting = addMockMeeting({
      ...BASE,
      start: new Date(Date.now() - 60 * 60_000),
      end: new Date(Date.now() - 30 * 60_000),
      hostId: 1,
      attendeeIds: [1],
      hostAuthority: "OWNER",
      isOnline: false,
      recordingFileName: null,
    } as MeetingDraft);

    const result = await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({ meetingId: meeting.id }),
    );

    expect(result.errors.title).toBe("이미 시작된 회의는 수정할 수 없습니다");
  });

  it("존재하지 않는 회의실이면 폼 조작 방어로 막는다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({ meetingId: meeting.id, roomId: "room-없음" }),
    );

    expect(result.errors.roomId).toBe("존재하지 않는 회의실입니다");
  });

  it("존재하지 않는 프로젝트면 폼 조작 방어로 막는다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({ meetingId: meeting.id, projectId: "999" }),
    );

    expect(result.errors.projectId).toBe("존재하지 않는 프로젝트입니다");
  });

  it("이미 다른 회의가 예약된 회의실·시간이면 막는다(시드 예약-2와 겹침)", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      // 시드 reservation-2: room-large, 2026-08-03 10:00–10:30
      scheduleForm({
        meetingId: meeting.id,
        roomId: "room-large",
        date: "2026-08-03",
        startTime: "10:00",
      }),
    );

    expect(result.errors.roomId).toBe("그 시간에는 이미 예약된 회의실입니다");
  });

  it("시간을 안 바꾸고 그대로 저장해도(자기 자신과의 겹침) 막히지 않는다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });
    // 자기 자신의 지금 슬롯으로 한 번 옮겨 둔다 — 실제 예약 레코드가 그 슬롯을 갖게 만든다.
    await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({
        meetingId: meeting.id,
        roomId: "room-video",
        date: "2027-05-10",
        startTime: "11:00",
      }),
    );

    // 같은 값으로 다시 저장 — 자기 자신과 겹치는 것뿐이라 통과해야 한다.
    const result = await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({
        meetingId: meeting.id,
        roomId: "room-video",
        date: "2027-05-10",
        startTime: "11:00",
      }),
    );

    expect(result.errors).toEqual({});
  });

  it("형식이 어긋난 폼은 목 조회보다 먼저 막힌다", async () => {
    const meeting = seedMeeting({ hostAuthority: "OWNER" });

    const result = await updateMeetingScheduleAction(
      SCHEDULE_INITIAL,
      scheduleForm({ meetingId: meeting.id, startTime: "10:15" }),
    );

    expect(result.errors.startTime).toBe("수정은 30분 단위로만 가능합니다");
  });
});
