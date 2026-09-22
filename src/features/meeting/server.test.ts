import { AUTHORITY } from "@/constants/authority";
import type { Actor } from "@/lib/permission";

import { addMockOnlineMeeting } from "./mock/meetings";
import { getMeetingCapture, getMeetingDetail, getMeetingDirectory } from "./server";
import type { MeetingDraft } from "./types";

/**
 * 캡처 진입 판정 — **접근 제어라 값으로 고정해 둔다**(CLAUDE.md §테스트: 로직은 짜자마자).
 *
 * ⚠️ 시드나 권한 규칙이 바뀔 때 **조용히 열리는 걸** 막는 게 목적이다. 화면을 눌러 보는
 *    것으로는 "Owner인데 남의 회의에 못 들어간다"를 확인하기 어렵다.
 */

/* 시드의 m1(박대표가 연 완료 회의)·m3(박대표의 예정 회의) 기준 — mock/seed.ts */
const OWNER: Actor = { id: 1, role: AUTHORITY.OWNER, isAdmin: false, teamId: undefined };
const OTHER_LEADER: Actor = { id: 2, role: AUTHORITY.LEADER, isAdmin: false, teamId: 1 };

describe("getMeetingCapture — 캡처 진입", () => {
  it("없는 회의는 notFound다", async () => {
    const result = await getMeetingCapture("없는-id", OWNER);
    expect(result.kind).toBe("notFound");
  });

  /*
    ⚠️ **역할이 아니라 소유권이다.** 김서준은 Leader이고 m3의 참석자이기도 하지만, 그 회의를
       연 사람이 아니라 녹음할 수 없다(§3-3 Host 전용).
  */
  it("개설자가 아니면 notHost다 — 참석자여도, 팀장이어도", async () => {
    const result = await getMeetingCapture("meeting-3", OTHER_LEADER);
    expect(result.kind).toBe("notHost");
  });

  /* 종료는 되돌릴 수 없다(§3-3 종료 정책) — 끝난 회의로 다시 들어가지 못한다 */
  it("이미 끝난 회의는 alreadyDone이다", async () => {
    const result = await getMeetingCapture("meeting-1", OWNER);
    expect(result.kind).toBe("alreadyDone");
  });

  it("개설자가 아직 안 끝난 회의를 열면 ok다", async () => {
    const result = await getMeetingCapture("meeting-3", OWNER);
    expect(result.kind).toBe("ok");
  });

  describe("참가자 매핑", () => {
    it("개설자가 참석자 명단에 있고 진행자로 표시된다", async () => {
      const result = await getMeetingCapture("meeting-3", OWNER);
      if (result.kind !== "ok") throw new Error("ok를 기대했다");

      const host = result.meeting.attendees.find((attendee) => attendee.id === OWNER.id);
      // ⚠️ §10 "개설자 Host도 참석자이므로 포함" — 빠지면 참가자 레일에 진행자가 안 보인다
      expect(host).toBeDefined();
      expect(host?.isHost).toBe(true);
    });

    it("개설자가 아닌 참석자는 진행자가 아니다", async () => {
      const result = await getMeetingCapture("meeting-3", OWNER);
      if (result.kind !== "ok") throw new Error("ok를 기대했다");

      const others = result.meeting.attendees.filter((attendee) => attendee.id !== OWNER.id);
      expect(others.length).toBeGreaterThan(0);
      expect(others.every((attendee) => !attendee.isHost)).toBe(true);
    });

    /* 회의 중에 옆자리 사람을 부르려면 이름만으로는 부족하다 */
    it("소속·직급을 함께 준다", async () => {
      const result = await getMeetingCapture("meeting-3", OWNER);
      if (result.kind !== "ok") throw new Error("ok를 기대했다");

      const teamMember = result.meeting.attendees.find((attendee) => attendee.id === 2);
      expect(teamMember?.subtitle).toContain("팀");
    });
  });
});

/**
 * 목록 차례 — 목·실서버가 **같은 함수**로 세운다(`sortMeetingListItems`).
 *
 * ⚠️ 값을 콕 집지 않고 **차례의 규칙**을 검증한다. 시드가 늘거나 줄어도 안 깨지고,
 *    정렬이 뒤집히는 것만 잡는다(WORKFLOW §3-2: 지금 다뤄야 하는 회의가 위로 온다).
 */
describe("getMeetingDirectory — 목록 차례", () => {
  const RANK: Record<string, number> = {
    IN_PROGRESS: 0,
    SCHEDULED: 1,
    DONE: 2,
    CANCELED: 3,
  };

  it("진행중 → 예정 → 완료 → 취소 순이다", async () => {
    const directory = await getMeetingDirectory(OWNER.id);
    const ranks = directory.hosted.map((item) => RANK[item.status] ?? 0);

    expect(ranks.length).toBeGreaterThan(0);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  /* ⚠️ 두 탭은 겹치지 않는다 — 참여해야 할 탭에서 내가 연 회의는 빠진다(§3-2) */
  it("내가 개설한 회의는 «참여해야 할»에 안 뜬다", async () => {
    const directory = await getMeetingDirectory(OWNER.id);

    expect(directory.hosted.every((item) => item.isHost)).toBe(true);
    expect(directory.invited.every((item) => !item.isHost)).toBe(true);
  });
});

/**
 * 비대면 회의(이슈 #473) — 목록 카드·상세가 `isOnline`을 세우고 회의실·시간을 빈 문자열로
 * 비우는지 본다. 대면 회의(시드)는 그대로 채워져 있어야 한다(회귀 방지).
 */
describe("비대면 회의(이슈 #473) — isOnline·빈 schedule·roomName", () => {
  const ONLINE_DRAFT: MeetingDraft = {
    title: "비대면 회의 서버 테스트",
    start: new Date(0),
    end: new Date(0),
    roomId: null,
    roomName: null,
    roomReservationId: null,
    isOnline: true,
    recordingFileName: null,
    projectId: 1,
    projectTag: "GOODS",
    topics: [{ main: "제품", sub: "점검" }],
    // ⚠️ OTHER_LEADER를 진짜 참석자로 넣는다 — host(OWNER) 관점만으로는 "초대 탭"이 원래도
    //    비어 있어 걸러지는지 확인이 안 된다(host는 애초에 자기 회의에 초대받지 않는다).
    attendeeIds: [OWNER.id, OTHER_LEADER.id],
    hostId: OWNER.id,
    hostAuthority: AUTHORITY.OWNER,
  };

  /*
    ⚠️ 2026-08-14 팀 확정으로 실서버 목록·대시보드(MEET-02·03·17)가 비대면 회의를 서버에서부터
       걸러 준다 — 목도 같은 동작을 미리 따라 한다(`server.ts`의 `getMeetingDirectory` 주석).
  */
  it("비대면 회의는 목록(호스트·초대 탭 모두)에 나오지 않는다", async () => {
    const created = addMockOnlineMeeting(ONLINE_DRAFT);

    const hostDirectory = await getMeetingDirectory(OWNER.id);
    expect(hostDirectory.hosted.some((row) => row.id === created.id)).toBe(false);
    expect(hostDirectory.invited.some((row) => row.id === created.id)).toBe(false);

    // ⚠️ 진짜 초대받은 사람(host가 아닌 OTHER_LEADER) 기준으로도 «참여해야 할» 탭에 안 뜬다.
    const attendeeDirectory = await getMeetingDirectory(OTHER_LEADER.id);
    expect(attendeeDirectory.invited.some((row) => row.id === created.id)).toBe(false);
  });

  it("상세도 isOnline을 세우고 schedule·roomName을 빈 문자열로 비운다", async () => {
    const created = addMockOnlineMeeting(ONLINE_DRAFT);

    const result = await getMeetingDetail(created.id, OWNER);
    if (result.kind !== "ok") throw new Error("ok를 기대했다");

    expect(result.detail.isOnline).toBe(true);
    expect(result.detail.schedule).toBe("");
    expect(result.detail.roomName).toBe("");
  });

  it("대면 회의(시드)는 그대로 schedule·roomName이 채워진다(회귀 방지)", async () => {
    const result = await getMeetingDetail("meeting-1", OWNER);
    if (result.kind !== "ok") throw new Error("ok를 기대했다");

    expect(result.detail.isOnline).toBe(false);
    expect(result.detail.schedule).not.toBe("");
    expect(result.detail.roomName).not.toBe("");
  });
});
