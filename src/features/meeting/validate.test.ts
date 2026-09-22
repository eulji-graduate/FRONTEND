import { AUTHORITY } from "@/constants/authority";

import { validateOnlineMeetingDraft } from "./validate";

const OWNER_HOST = { role: AUTHORITY.OWNER };
const LEADER_HOST = { role: AUTHORITY.LEADER };

const VALID_RECORDING = {
  s3Key: "recordings/org-1/member-1/online-pending/uuid/meeting.webm",
  fileName: "meeting.webm",
  contentType: "audio/webm",
  sizeBytes: 12345,
};

const VALID_DRAFT = {
  title: "비대면 주간 싱크",
  projectId: "1",
  topics: [{ main: "제품", sub: "로드맵 검토" }],
  attendeeIds: [1],
  recording: VALID_RECORDING,
};

describe("비대면 회의 만들기 검증", () => {
  it("전부 채우면 통과한다", () => {
    expect(validateOnlineMeetingDraft(VALID_DRAFT, OWNER_HOST)).toEqual({});
  });

  it("제목이 비면 막는다", () => {
    const errors = validateOnlineMeetingDraft({ ...VALID_DRAFT, title: "   " }, OWNER_HOST);
    expect(errors.title).toBe("회의 제목을 입력해 주세요");
  });

  it("프로젝트를 안 고르면 막는다(WORKFLOW.md §3-1: 항상 필수)", () => {
    const errors = validateOnlineMeetingDraft({ ...VALID_DRAFT, projectId: "" }, OWNER_HOST);
    expect(errors.projectId).toBe("프로젝트를 선택해 주세요");
  });

  it("안건을 하나도 안 채우면 막는다", () => {
    const errors = validateOnlineMeetingDraft(
      { ...VALID_DRAFT, topics: [{ main: "", sub: "" }] },
      OWNER_HOST,
    );
    expect(errors.topics).toBe("회의 안건(대주제·소주제)을 한 쌍 이상 입력해 주세요");
  });

  it("첫 안건의 소주제만 비어도 막는다", () => {
    const errors = validateOnlineMeetingDraft(
      { ...VALID_DRAFT, topics: [{ main: "제품", sub: "" }] },
      OWNER_HOST,
    );
    expect(errors.topics).toBeDefined();
  });

  it("둘째 안건부터는 비어 있으면 막는다(첫 쌍만 있어도 안 됨)", () => {
    const errors = validateOnlineMeetingDraft(
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
    const errors = validateOnlineMeetingDraft(
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
    const errors = validateOnlineMeetingDraft(VALID_DRAFT, OWNER_HOST);
    expect(errors.parentTeamActionId).toBeUndefined();
  });

  it("Host가 Leader면 상위 팀 액션이 없으면 막는다", () => {
    const errors = validateOnlineMeetingDraft(VALID_DRAFT, LEADER_HOST);
    expect(errors.parentTeamActionId).toBe("상위 팀 액션을 선택해 주세요");
  });

  it("Host가 Leader여도 상위 팀 액션을 채우면 통과한다", () => {
    const errors = validateOnlineMeetingDraft(
      { ...VALID_DRAFT, parentTeamActionId: 1 },
      LEADER_HOST,
    );
    expect(errors.parentTeamActionId).toBeUndefined();
  });

  it("Host가 Owner인데 상위 팀 액션을 넣으면 막는다(폼 조작 방어)", () => {
    const errors = validateOnlineMeetingDraft(
      { ...VALID_DRAFT, parentTeamActionId: 1 },
      OWNER_HOST,
    );
    expect(errors.parentTeamActionId).toBe(
      "Owner가 개설하는 회의에는 상위 팀 액션을 지정할 수 없습니다",
    );
  });

  it("참석자가 한 명도 없으면 막는다", () => {
    const errors = validateOnlineMeetingDraft({ ...VALID_DRAFT, attendeeIds: [] }, OWNER_HOST);
    expect(errors.attendeeIds).toBe("참석자를 한 명 이상 선택해 주세요");
  });

  it("참석자 값이 정수가 아니면 막는다", () => {
    const errors = validateOnlineMeetingDraft(
      { ...VALID_DRAFT, attendeeIds: [Number.NaN] },
      OWNER_HOST,
    );
    expect(errors.attendeeIds).toBe("참석자 값이 올바르지 않습니다");
  });

  it("회의실·날짜·시작 시각 검증은 없다 — 비대면 회의는 그 개념 자체가 없다(이슈 #473)", () => {
    const errors = validateOnlineMeetingDraft(VALID_DRAFT, OWNER_HOST);
    expect(errors).not.toHaveProperty("roomId");
    expect(errors).not.toHaveProperty("date");
    expect(errors).not.toHaveProperty("startTime");
  });

  it("녹음 파일이 없으면 막는다(2026-08-14 계약 변경 — 단일 모달, 등록의 일부다)", () => {
    const errors = validateOnlineMeetingDraft({ ...VALID_DRAFT, recording: null }, OWNER_HOST);
    expect(errors.recording).toBe("녹음 파일을 첨부해 주세요");
  });
});
