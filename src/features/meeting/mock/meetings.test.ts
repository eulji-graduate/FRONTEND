import { AUTHORITY } from "@/constants/authority";
import { AI_SUMMARY_STATUS } from "@/constants/meeting";

import type { MeetingDraft } from "../types";
import {
  addMockMeeting,
  addMockOnlineMeeting,
  findMockMeeting,
  listMockMeetings,
} from "./meetings";

const DRAFT: MeetingDraft = {
  title: "8월 킥오프 미팅",
  start: new Date("2026-08-11T13:00:00"),
  end: new Date("2026-08-11T13:30:00"),
  roomId: "room-large",
  roomName: "대회의실",
  projectId: 1,
  projectTag: "GOODS",
  topics: [{ main: "제품", sub: "킥오프" }],
  attendeeIds: [1, 2, 3],
  hostId: 1,
  hostAuthority: AUTHORITY.OWNER,
  roomReservationId: "reservation-1",
  isOnline: false,
  recordingFileName: null,
};

describe("회의 mock 스토어", () => {
  it("회의를 추가하면 id·생성시각을 채워 목록에 반영된다", () => {
    const before = listMockMeetings().length;

    const created = addMockMeeting(DRAFT);

    expect(created.id).toMatch(/^meeting-\d+$/);
    expect(created.createdAt).toBe(new Date(created.createdAt).toISOString());
    expect(created.title).toBe("8월 킥오프 미팅");
    expect(listMockMeetings()).toHaveLength(before + 1);
    expect(findMockMeeting(created.id)).toEqual(created);
  });

  it("연달아 추가하면 id 뒷자리가 순서대로 늘어난다", () => {
    const first = addMockMeeting(DRAFT);
    const second = addMockMeeting(DRAFT);

    const firstSeq = Number(first.id.replace("meeting-", ""));
    const secondSeq = Number(second.id.replace("meeting-", ""));
    expect(secondSeq).toBe(firstSeq + 1);
  });

  it("팀 액션 회의는 parentTeamActionId·hostTeamId를 그대로 담는다", () => {
    const created = addMockMeeting({
      ...DRAFT,
      hostAuthority: AUTHORITY.LEADER,
      hostTeamId: 7,
      parentTeamActionId: 2,
    });

    expect(created.parentTeamActionId).toBe(2);
    expect(created.hostTeamId).toBe(7);
  });

  it("없는 id는 조회 시 null을 돌려준다", () => {
    expect(findMockMeeting("존재하지-않음")).toBeNull();
  });
});

describe("비대면 회의 생성(이슈 #473) — addMockOnlineMeeting", () => {
  const ONLINE_DRAFT: MeetingDraft = {
    ...DRAFT,
    isOnline: true,
    roomId: null,
    roomName: null,
    roomReservationId: null,
    // ⚠️ 2026-08-14 계약 변경 — 등록 시점에 이미 파일이 S3에 올라가 있어 파일명이 채워져 온다
    //    (`createOnlineMeetingAction`이 `draft.recording.fileName`을 그대로 옮긴다).
    recordingFileName: "회의록.m4a",
  };

  it("만들자마자 종료 처리된다 — endedAt이 즉시 채워진다", () => {
    const created = addMockOnlineMeeting(ONLINE_DRAFT);

    expect(created.isOnline).toBe(true);
    expect(created.endedAt).not.toBeNull();
    expect(created.endedAt).toBe(new Date(created.endedAt!).toISOString());
  });

  /*
    ⚠️ 2026-08-14 계약 변경 — 단일 모달로 바뀌며 등록 시점에 이미 녹음 파일이 있으므로,
       대면 회의의 `endMockMeeting`과 같은 순간에 곧바로 분석 대기(PENDING)로 들어간다.
  */
  it("만들어지자마자 AI 요약 분석 대기(PENDING) 상태다", () => {
    const created = addMockOnlineMeeting(ONLINE_DRAFT);

    expect(created.aiSummaryStatus).toBe(AI_SUMMARY_STATUS.PENDING);
  });

  it("회의실이 없다 — roomId·roomName·roomReservationId가 그대로 null이다", () => {
    const created = addMockOnlineMeeting(ONLINE_DRAFT);

    expect(created.roomId).toBeNull();
    expect(created.roomName).toBeNull();
    expect(created.roomReservationId).toBeNull();
  });

  it("취소되지 않은 채로 만들어진다", () => {
    const created = addMockOnlineMeeting(ONLINE_DRAFT);

    expect(created.canceledAt).toBeNull();
  });

  // ⚠️ 2026-08-14 계약 변경 — 단일 모달이라 등록과 동시에 녹음 파일명이 이미 채워져 있다.
  it("만들어질 때 이미 녹음 파일명이 채워져 있다", () => {
    const created = addMockOnlineMeeting(ONLINE_DRAFT);

    expect(findMockMeeting(created.id)?.recordingFileName).toBe("회의록.m4a");
  });
});
