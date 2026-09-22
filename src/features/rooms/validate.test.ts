import { AUTHORITY } from "@/constants/authority";

import { validateMeetingRoomDraft, validateRoomReservationDraft } from "./validate";

const OWNER_HOST = { role: AUTHORITY.OWNER };
const LEADER_HOST = { role: AUTHORITY.LEADER };

/** 2026-08-10은 월요일이다 — 평일 검사 테스트는 이 값을 흔들면 같이 깨진다. */
const VALID_DRAFT = {
  title: "주간 싱크",
  roomId: "room-large",
  date: "2026-08-10",
  startTime: "10:00",
  projectId: "1",
  topics: [{ main: "제품", sub: "로드맵 검토" }],
  attendeeIds: [1],
};

describe("회의실 예약 검증", () => {
  it("전부 채우면 통과한다", () => {
    expect(validateRoomReservationDraft(VALID_DRAFT, OWNER_HOST)).toEqual({});
  });

  it("제목이 비면 막는다", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, title: "   " }, OWNER_HOST);
    expect(errors.title).toBe("회의 제목을 입력해 주세요");
  });

  it("회의실을 안 고르면 막는다", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, roomId: "" }, OWNER_HOST);
    expect(errors.roomId).toBeDefined();
  });

  it("날짜 형식이 아니면 막는다", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, date: "2026/08/10" }, OWNER_HOST);
    expect(errors.date).toBe("올바른 날짜가 아니에요");
  });

  it("존재하지 않는 날짜는 막는다", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, date: "2026-02-30" }, OWNER_HOST);
    expect(errors.date).toBe("올바른 날짜가 아니에요");
  });

  /* 주말도 막지 않는다(2026-08-15 재확정) — BE에 요일 제약이 없어(§연동 검증) 막을 이유가 없다. */
  it("주말도 통과한다 — 2026-08-15는 토요일", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, date: "2026-08-15" }, OWNER_HOST);
    expect(errors.date).toBeUndefined();
  });

  it("30분 단위가 아닌 시작 시각은 막는다", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, startTime: "10:15" }, OWNER_HOST);
    expect(errors.startTime).toBe("예약은 30분 단위로만 가능합니다");
  });

  /* ⚠️ 회의실 이용 시간 검사는 없다(2026-08-15, BE PR #523 — 운영시간 개념 자체를 없앴다). */
  it("운영 시간 밖(새벽)이어도 30분 단위이기만 하면 통과한다", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, startTime: "01:00" }, OWNER_HOST);
    expect(errors.startTime).toBeUndefined();
  });

  it("프로젝트를 안 고르면 막는다(WORKFLOW.md §3-1: 항상 필수)", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, projectId: "" }, OWNER_HOST);
    expect(errors.projectId).toBe("프로젝트를 선택해 주세요");
  });

  it("안건을 하나도 안 채우면 막는다", () => {
    const errors = validateRoomReservationDraft(
      { ...VALID_DRAFT, topics: [{ main: "", sub: "" }] },
      OWNER_HOST,
    );
    expect(errors.topics).toBe("회의 안건(대주제·소주제)을 한 쌍 이상 입력해 주세요");
  });

  it("첫 안건의 소주제만 비어도 막는다", () => {
    const errors = validateRoomReservationDraft(
      { ...VALID_DRAFT, topics: [{ main: "제품", sub: "" }] },
      OWNER_HOST,
    );
    expect(errors.topics).toBeDefined();
  });

  it("둘째 안건부터는 비어 있으면 막는다(첫 쌍만 있어도 안 됨)", () => {
    const errors = validateRoomReservationDraft(
      {
        ...VALID_DRAFT,
        topics: [
          { main: "제품", sub: "로드맵 검토" },
          { main: "", sub: "" },
        ],
      },
      OWNER_HOST,
    );
    expect(errors.topics).toBe("빈 안건 칸을 채우거나 삭제해 주세요");
  });

  it("안건을 여러 쌍 다 채우면 통과한다", () => {
    const errors = validateRoomReservationDraft(
      {
        ...VALID_DRAFT,
        topics: [
          { main: "제품", sub: "로드맵 검토" },
          { main: "마케팅", sub: "캠페인 리뷰" },
        ],
      },
      OWNER_HOST,
    );
    expect(errors.topics).toBeUndefined();
  });

  it("Host가 Owner면 상위 팀 액션 없이도 통과한다", () => {
    const errors = validateRoomReservationDraft(VALID_DRAFT, OWNER_HOST);
    expect(errors.parentTeamActionId).toBeUndefined();
  });

  it("Host가 Leader면 상위 팀 액션이 없으면 막는다", () => {
    const errors = validateRoomReservationDraft(VALID_DRAFT, LEADER_HOST);
    expect(errors.parentTeamActionId).toBe("상위 팀 액션을 선택해 주세요");
  });

  it("Host가 Leader여도 상위 팀 액션을 채우면 통과한다", () => {
    const errors = validateRoomReservationDraft(
      { ...VALID_DRAFT, parentTeamActionId: 1 },
      LEADER_HOST,
    );
    expect(errors.parentTeamActionId).toBeUndefined();
  });

  it("Host가 Owner인데 상위 팀 액션을 넣으면 막는다(폼 조작 방어)", () => {
    const errors = validateRoomReservationDraft(
      { ...VALID_DRAFT, parentTeamActionId: 1 },
      OWNER_HOST,
    );
    expect(errors.parentTeamActionId).toBe(
      "Owner가 개설하는 회의에는 상위 팀 액션을 지정할 수 없습니다",
    );
  });

  it("참석자가 한 명도 없으면 막는다", () => {
    const errors = validateRoomReservationDraft({ ...VALID_DRAFT, attendeeIds: [] }, OWNER_HOST);
    expect(errors.attendeeIds).toBe("참석자를 한 명 이상 선택해 주세요");
  });

  it("참석자 값이 정수가 아니면 막는다", () => {
    const errors = validateRoomReservationDraft(
      { ...VALID_DRAFT, attendeeIds: [Number.NaN] },
      OWNER_HOST,
    );
    expect(errors.attendeeIds).toBe("참석자 값이 올바르지 않습니다");
  });
});

const VALID_ROOM_DRAFT = {
  name: "대회의실",
  location: "3층 A동",
};

describe("회의실 추가·수정 검증", () => {
  it("전부 채우면 통과한다", () => {
    expect(validateMeetingRoomDraft(VALID_ROOM_DRAFT)).toEqual({});
  });

  it("이름이 비면 막는다", () => {
    const errors = validateMeetingRoomDraft({ ...VALID_ROOM_DRAFT, name: "   " });
    expect(errors.name).toBe("회의실 이름을 입력해 주세요");
  });

  it("위치가 비면 막는다", () => {
    const errors = validateMeetingRoomDraft({ ...VALID_ROOM_DRAFT, location: "" });
    expect(errors.location).toBe("위치를 입력해 주세요");
  });
});
