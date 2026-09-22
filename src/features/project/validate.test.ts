import type { ProjectDraft } from "./types";
import { validateAttachmentFile, validateProjectDraft } from "./validate";

function draft(overrides: Partial<ProjectDraft>): ProjectDraft {
  return {
    name: "연예인 굿즈 쇼핑몰 앱 구축",
    tag: "GOODS",
    description: "설명",
    tagColor: "slate",
    startDate: "2026-08-01",
    dueDate: "2026-09-01",
    teamNames: ["개발팀"],
    ...overrides,
  };
}

describe("validateProjectDraft — 날짜", () => {
  it("정상 범위(시작일 ≤ 마감일)면 통과한다", () => {
    expect(validateProjectDraft(draft({}))).toEqual({});
  });

  it("형식은 맞지만 실제로 없는 날짜(2월 30일)는 막는다", () => {
    const errors = validateProjectDraft(draft({ startDate: "2026-02-30" }));
    expect(errors.startDate).toBeDefined();
  });

  it("자릿수가 안 맞는 값(2026-2-01)은 막는다", () => {
    const errors = validateProjectDraft(draft({ dueDate: "2026-2-01" }));
    expect(errors.dueDate).toBeDefined();
  });

  it("마감 기한이 시작일보다 앞서면 막는다", () => {
    const errors = validateProjectDraft(draft({ startDate: "2026-09-01", dueDate: "2026-08-01" }));
    expect(errors.dueDate).toBe("마감 기한은 시작일보다 앞설 수 없습니다");
  });

  it("시작일 자체가 잘못됐으면 순서 비교 오류를 덧씌우지 않는다", () => {
    const errors = validateProjectDraft(draft({ startDate: "2026-02-30", dueDate: "2026-08-01" }));
    expect(errors.dueDate).toBeUndefined();
  });
});

describe("validateAttachmentFile — BE가 거부하는 것만 미리 막는다", () => {
  it("보통 파일은 통과한다", () => {
    expect(validateAttachmentFile("기획서.pdf", 1024)).toBeNull();
  });

  it("0바이트 파일은 막는다 — BE `@Positive fileSize`", () => {
    expect(validateAttachmentFile("빈파일.txt", 0)).toBe("빈 파일(0바이트)은 첨부할 수 없습니다");
  });

  it("'..'가 든 파일명은 막는다 — BE가 s3Key 경로 조작 오탐으로 발급을 거부한다", () => {
    expect(validateAttachmentFile("report..pdf", 10)).toBe("파일 이름에 '..'를 포함할 수 없습니다");
  });

  it("이름이 공백뿐이면 막는다", () => {
    expect(validateAttachmentFile("   ", 10)).toBe("파일 이름이 비어 있습니다");
  });

  it("점 하나짜리 확장자 구분(report.v2.pdf)은 정상이다 — '..'만 문제다", () => {
    expect(validateAttachmentFile("report.v2.pdf", 10)).toBeNull();
  });
});
