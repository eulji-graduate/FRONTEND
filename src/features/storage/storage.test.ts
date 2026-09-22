import { PROJECT_STATUS } from "@/constants/project";
import type { BillingConfig } from "@/features/billing/types";

import { buildStorageTotals, canDeleteRecordings, freedGb, totalFreeableGb } from "./storage";
import type { ProjectStorage } from "./types";

/** 포함량 50GB · 초과 1GB당 월 ₩500 — 값은 `BillingConfig`가 정본이다 */
const config = { includedStorageGb: 50, overagePerGbMonth: 500 } as BillingConfig;

const project = (patch: Partial<ProjectStorage> = {}): ProjectStorage => ({
  tag: "a",
  name: "프로젝트 A",
  meetingCount: 10,
  voiceGb: 5,
  sttGb: 1,
  lastRecordedAt: "2026-01-01",
  status: PROJECT_STATUS.IN_PROGRESS,
  ...patch,
});

const overview = (projects: ProjectStorage[]) => ({
  voiceGb: projects.reduce((sum, p) => sum + p.voiceGb, 0),
  sttGb: projects.reduce((sum, p) => sum + p.sttGb, 0),
  projects,
});

describe("buildStorageTotals", () => {
  it("음성과 자막·요약을 합쳐 소진율을 낸다", () => {
    const totals = buildStorageTotals(overview([project({ voiceGb: 20, sttGb: 5 })]), config);

    expect(totals.usedGb).toBe(25);
    expect(totals.ratio).toBe(0.5);
    expect(totals.overageGb).toBe(0);
  });

  it("넘기면 **1로 자르지 않는다** — 얼마나 넘겼는지가 중요하다", () => {
    const totals = buildStorageTotals(overview([project({ voiceGb: 55, sttGb: 5 })]), config);

    expect(totals.ratio).toBeCloseTo(1.2);
    expect(totals.overageGb).toBe(10);
  });

  it("초과분을 금액으로 바꾼다 — 표시용이고 실제 청구는 서버가 한다", () => {
    const totals = buildStorageTotals(overview([project({ voiceGb: 52, sttGb: 2 })]), config);

    expect(totals.overageGb).toBe(4);
    expect(totals.overageAmount).toBe(2000);
  });

  /*
    ⚠️ 포함량 0은 BE가 줄 수 있는 값이다. 나눗셈이 무한대가 되면 게이지가 칸을 뚫고 나간다.
    ⚠️ 그렇다고 0으로 두면 **`0% · 초과`** 라는 앞뒤 안 맞는 화면이 된다 — 포함량이 없는데
       쓴 게 있으면 전부가 초과다.
  */
  it("포함량이 0인데 쓴 게 있으면 꽉 찬 것으로 본다", () => {
    const totals = buildStorageTotals(overview([project({ voiceGb: 5, sttGb: 0 })]), {
      ...config,
      includedStorageGb: 0,
    } as BillingConfig);

    expect(Number.isFinite(totals.ratio)).toBe(true);
    expect(totals.ratio).toBe(1);
    expect(totals.overageGb).toBe(5);
  });

  it("포함량도 0이고 쓴 것도 없으면 0%다", () => {
    const totals = buildStorageTotals(overview([project({ voiceGb: 0, sttGb: 0 })]), {
      ...config,
      includedStorageGb: 0,
    } as BillingConfig);

    expect(totals.ratio).toBe(0);
  });

  it("음성과 자막·요약을 **따로** 들고 있다 — 합계만 있으면 무엇을 지울지 알 수 없다", () => {
    const totals = buildStorageTotals(
      overview([project({ voiceGb: 9, sttGb: 1 }), project({ tag: "b", voiceGb: 6, sttGb: 4 })]),
      config,
    );

    expect(totals.voiceGb).toBe(15);
    expect(totals.sttGb).toBe(5);
  });
});

describe("canDeleteRecordings", () => {
  it("끝난 프로젝트만 지운다 — 진행 중인 녹음은 다시 들을 일이 남아 있다", () => {
    expect(canDeleteRecordings(project({ status: PROJECT_STATUS.IN_PROGRESS }))).toBe(false);
    expect(canDeleteRecordings(project({ status: PROJECT_STATUS.DONE }))).toBe(true);
  });

  it("`할 일`도 지울 수 없다 — 참·거짓으로 줄였으면 진행중과 같이 묶였을 값이다", () => {
    expect(canDeleteRecordings(project({ status: PROJECT_STATUS.TODO }))).toBe(false);
  });

  it("남은 게 하나도 없으면 지울 게 없다 — 눌러도 아무 일이 없는 버튼은 두지 않는다", () => {
    expect(
      canDeleteRecordings(project({ status: PROJECT_STATUS.DONE, voiceGb: 0, sttGb: 0 })),
    ).toBe(false);
  });

  /* ⚠️ 음성을 이미 지웠어도 자막·요약이 남아 있으면 지울 게 있다 */
  it("음성이 0이어도 자막·요약이 남아 있으면 지울 수 있다", () => {
    expect(
      canDeleteRecordings(project({ status: PROJECT_STATUS.DONE, voiceGb: 0, sttGb: 3 })),
    ).toBe(true);
  });
});

describe("freedGb", () => {
  /*
    ⚠️ 자막·요약도 센다(2026-08-05 팀 결정). 보관 기한이 없는데 이것만 못 지우면 저장량이
       단조 증가해 포함량이 반드시 부족해진다 — 그 구조를 막으려고 삭제 대상에 넣었다.
  */
  it("음성과 자막·요약을 **함께** 센다 — 줄 하나가 통째로 비워진다", () => {
    expect(freedGb(project({ voiceGb: 7, sttGb: 3 }))).toBe(10);
  });
});

describe("totalFreeableGb", () => {
  it("지울 수 있는 줄만 더한다", () => {
    const projects = [
      project({ tag: "a", status: PROJECT_STATUS.DONE, voiceGb: 4, sttGb: 1 }),
      project({ tag: "b", status: PROJECT_STATUS.IN_PROGRESS, voiceGb: 9, sttGb: 3 }),
      project({ tag: "c", status: PROJECT_STATUS.DONE, voiceGb: 2, sttGb: 5 }),
    ];

    // `a`(4+1) + `c`(2+5) = 12. `b`는 진행 중이라 안 센다
    expect(totalFreeableGb(projects)).toBe(12);
  });
});
