/**
 * 프로젝트 매퍼 회귀 — **한 매퍼가 지키는 세 계약**을 하나의 파일에 못박는다.
 *
 * ⚠️ 여기서 실패하면:
 *   ① `progressPct`(BE 소수)가 결과 객체에 살아나 다음 사람이 그걸 화면에 그리기 시작한다
 *      (FE `getProgressPercent` 반올림 규칙이 두 벌이 되고, 목 경로가 진척율을 못 만든다).
 *   ② 저장된 프로젝트 색이 화면에서 사라진다. 예전엔 `pickPaletteColor(project.tag)`가
 *      태그 이름 해시로 색을 다시 뽑아 저장만 되고 안 쓰였다.
 *   ③ 프로젝트 타임라인의 `isDelayed`가 매퍼에서 조용히 버려진다(BE가 이미 계산해 주는데
 *      화면이 다시 계산하면 자정 경계에서 어긋난다).
 *
 * ⚠️ #600(지연·진척율)과 #604(저장 색)이 같은 매퍼를 손댔고, rebase 병합 결과다. 세 계약
 *    중 어느 하나라도 실패하면 두 PR 중 하나의 회귀다 — 못박는 이유가 여기서 보인다.
 */
import {
  type BeProjectDetail,
  type BeProjectSummary,
  type BeProjectTimelineItem,
  toProjectDetail,
  toProjectListItem,
  toProjectTeamAction,
} from "./mapper";

const SUMMARY_BASE: BeProjectSummary = {
  id: 1,
  tag: "GOODS",
  color: "#0D9488",
  name: "굿즈 앱",
  description: "설명",
  status: "IN_PROGRESS",
  startDate: "2026-07-01",
  dueDate: "2026-09-30",
  teamCount: 3,
  actionCount: 3,
  completedActionCount: 1,
  meetingCount: 5,
  /* ⚠️ FE는 안 쓴다 — 결과 객체에 이 키가 없어야 한다(§`toProjectListItem` 주석) */
  progressPct: 33.333,
  teamNames: ["개발팀", "마케팅팀", "디자인팀"],
};

describe("toProjectListItem — 진척율 계약과 저장 색", () => {
  it("알려진 HEX(대문자)를 팔레트 이름(teal)으로 되돌린다", () => {
    expect(toProjectListItem(SUMMARY_BASE).tagColor).toBe("teal");
  });

  it("소문자 HEX도 같은 이름으로 옮긴다 — BE 검증이 대소문자 무시다", () => {
    expect(toProjectListItem({ ...SUMMARY_BASE, color: "#9333ea" }).tagColor).toBe("purple");
  });

  it("팔레트 밖 HEX가 오면 slate로 떨어뜨린다 — 임의로 지어내지 않는다", () => {
    expect(toProjectListItem({ ...SUMMARY_BASE, color: "#123456" }).tagColor).toBe("slate");
  });

  /*
    ⚠️ **HEX 문자열이 화면 계약에 남아 있지 않는지** 지킨다. 남아 있으면 다음 사람이 그걸
       그대로 `style`에 넣어 다크에서 칩이 거의 검게 깔린다(dashboard-meeting-item.tsx:92-95가
       그때의 기록이다).
  */
  it("결과 객체에 원본 HEX가 남아 있지 않다", () => {
    const item = toProjectListItem(SUMMARY_BASE);
    expect(JSON.stringify(item)).not.toContain("#");
  });

  it("`progressPct`(BE 소수)를 결과 객체로 옮기지 않는다 — FE `getProgressPercent`가 정본이다", () => {
    /*
      ⚠️ 여기서 실패하면 다음 사람이 BE 소수 값을 그대로 화면에 그리기 시작한다는 신호다.
         라인이 두 벌이 되면 목 경로가 진척율을 못 만들고, 반올림 규칙도 두 곳에 흩어진다.
    */
    const item = toProjectListItem(SUMMARY_BASE);
    expect(item).not.toHaveProperty("progressPct");
  });

  it("actionCount·completedActionCount만 UI 계약(actionTotal·actionDone)으로 옮긴다", () => {
    const item = toProjectListItem(SUMMARY_BASE);
    expect(item.actionTotal).toBe(3);
    expect(item.actionDone).toBe(1);
  });
});

describe("toProjectDetail — 저장된 색을 팔레트 이름으로 옮긴다", () => {
  const DETAIL_BASE: BeProjectDetail = {
    id: 1,
    tag: "GOODS",
    color: "#4F46E5",
    name: "굿즈 앱",
    description: "설명",
    status: "IN_PROGRESS",
    startDate: "2026-07-01",
    dueDate: "2026-09-30",
    teamIds: [1, 2, 3],
    attachments: [],
  };

  it("팔레트 이름(indigo)으로 되돌린다 — 목록·상세가 같은 매핑 규칙을 쓴다", () => {
    expect(toProjectDetail(DETAIL_BASE, ["개발팀"]).tagColor).toBe("indigo");
  });

  it("teamNames는 매퍼가 만들지 않고 호출부가 넘긴다 — 상세 응답엔 teamIds뿐이다", () => {
    const detail = toProjectDetail(DETAIL_BASE, ["개발팀", "마케팅팀"]);
    expect(detail.teamNames).toEqual(["개발팀", "마케팅팀"]);
  });
});

describe("toProjectTeamAction — 타임라인 지연 배지", () => {
  const TIMELINE_BASE: BeProjectTimelineItem = {
    actionId: 42,
    title: "설계 검토",
    teamId: 1,
    teamName: "개발팀",
    status: "IN_PROGRESS",
    dueDate: "2026-08-20",
    isDelayed: true,
  };

  it("BE `isDelayed`를 그대로 UI 계약(`ProjectTeamAction.isDelayed`)에 싣는다", () => {
    /*
      ⚠️ 예전엔 이 값이 매퍼에서 조용히 버려지고 있었다. 프로젝트 타임라인만 BE가 이미
         계산해 보내므로 화면이 다시 계산하지 않는다 — 두 벌이면 자정 경계에서 어긋난다.
    */
    expect(toProjectTeamAction(TIMELINE_BASE).isDelayed).toBe(true);
    expect(toProjectTeamAction({ ...TIMELINE_BASE, isDelayed: false }).isDelayed).toBe(false);
  });
});
