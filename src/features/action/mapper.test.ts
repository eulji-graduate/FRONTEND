/**
 * 개인 액션 상세 매퍼 — nullable 필드 계약 회귀.
 *
 * ⚠️ 이 파일이 지키는 것 둘:
 *   ① `parseActionDetail`은 **BE가 실제로 내리는 nullable 5필드**(`description`·`assigneeName`·
 *      `projectTag`·`projectName`·`teamName`)의 `null`을 통과시키고, 모르는 `status` 같은
 *      **모양이 다른** 응답은 던진다. 지금까지 `serverApi<BeActionDetail>` 단언만 있어
 *      가드 없이 화면까지 흘렀다.
 *   ② `toPersonalActionDetail`은 그 null을 화면 계약으로 **빈 문자열이 아니라 `undefined`**로
 *      접는다 — 빈 칩·빈 태그를 그리면 화면이 뭔가 있는 척한다(§정직성).
 */
import { type BeActionDetail, parseActionDetail, toPersonalActionDetail } from "./mapper";

const BASE: BeActionDetail = {
  id: 1,
  projectId: 10,
  title: "온보딩 플로우 와이어프레임 검토",
  description: "온보딩 화면 흐름을 검토한다.",
  status: "TODO",
  startDate: "2026-08-20",
  dueDate: "2026-08-29",
  needsReview: false,
  assigneeName: "이하윤",
  assigneeRoleLabel: "프론트엔드",
  projectTag: "GOODS",
  projectName: "굿즈 앱",
  /* ⚠️ 개인 액션은 팀이 없다(BE ActionTypeShapePolicy) — 기본값도 null */
  teamName: null,
  parentActionId: 3,
  parentActionTitle: "앱 개발 착수",
  parentActionTeamName: "개발팀",
  parentActionDueDate: "2026-08-29",
  sourceMeetingId: 5,
  sourceMeetingTitle: "앱 개발 착수 팀 액션 회의",
  sourceMeetingScheduledAt: "2026-07-21T10:00",
};

describe("parseActionDetail — 응답 가드", () => {
  it("nullable 5필드(description·assigneeName·projectTag·projectName·teamName)가 전부 null인 응답을 통과시킨다", () => {
    /*
      ⚠️ 여기 나열한 다섯이 BE가 정말로 null로 내려보내는 필드들이다 —
      description(TEXT NULL, `@NotBlank` 없음)·assigneeName(ActionService:258)·
      projectTag(:288)·projectName(:289)·teamName(:267-269).
      가드가 이 다섯을 거절하면 실서버에서 오는 정상 응답이 화면까지 못 온다.
    */
    const raw = {
      ...BASE,
      description: null,
      assigneeName: null,
      projectTag: null,
      projectName: null,
      teamName: null,
    };
    expect(() => parseActionDetail(raw)).not.toThrow();
  });

  it("id가 문자열이면 던진다 — 단언만으로는 못 잡던 것", () => {
    expect(() => parseActionDetail({ ...BASE, id: "1" })).toThrow(
      "액션 상세 응답이 약속한 모양이 아닙니다.",
    );
  });

  it("status가 모르는 값이면 던진다 — 지금은 단언이라 그대로 흘러갔다", () => {
    /*
      ⚠️ ACTION_STATUS는 3개(TODO·IN_PROGRESS·DONE)뿐이고, BE 도메인 정책이 마이그레이션 없이
         새 상태를 더하지 않는다는 조건에서 화면이 안전하다. 모르는 값이 오면 화면 렌더가
         조용히 이상해지느니 명시 오류가 낫다(회의 상세 가드와 같은 기준).
    */
    expect(() => parseActionDetail({ ...BASE, status: "WIP" })).toThrow(
      "액션 상세 응답이 약속한 모양이 아닙니다.",
    );
  });

  it("필드가 통째로 undefined면 던진다 — BE record는 항상 키를 내려보내므로 확장 필드가 아니다", () => {
    /*
      ⚠️ 회의 상세 가드가 확장 필드에만 `isOptionalNullableString`을 쓰는 것과 같은 이유:
         이 필드들은 확장이 아니라 필수라, `undefined`(키 자체가 없음)는 이상 신호다.
    */
    const raw: Record<string, unknown> = { ...BASE };
    delete raw.assigneeName;
    expect(() => parseActionDetail(raw)).toThrow("액션 상세 응답이 약속한 모양이 아닙니다.");
  });
});

describe("toPersonalActionDetail — null을 화면 계약으로 접는다", () => {
  it("팀·태그·담당자가 null이면 undefined로 접는다 — 빈 문자열이 아니다(빈 칩·빈 태그 방지)", () => {
    const detail = toPersonalActionDetail({
      ...BASE,
      teamName: null,
      projectTag: null,
      assigneeName: null,
    });
    expect(detail.team).toBeUndefined();
    expect(detail.projectTag).toBeUndefined();
    expect(detail.assigneeName).toBeUndefined();
  });

  it("description이 null이면 빈 문자열로 접는다 — UI 계약이 non-null string이라 대체값이 필요하다", () => {
    /*
      ⚠️ description만 별도 처리다 — 화면(`ActionContentCard`)이 문단으로 그리므로 undefined보다
         빈 문자열이 자연스럽다. 나머지 nullable은 칩·태그·이름이라 없으면 아예 안 그린다.
    */
    const detail = toPersonalActionDetail({ ...BASE, description: null });
    expect(detail.description).toBe("");
  });

  it("정상 값은 그대로 통과한다 — 목 데이터가 계속 통과해야 한다", () => {
    const detail = toPersonalActionDetail(BASE);
    expect(detail.team).toBe(BASE.teamName ?? undefined); // BASE의 teamName은 null
    expect(detail.projectTag).toBe("GOODS");
    expect(detail.assigneeName).toBe("이하윤");
    expect(detail.assigneeRoleLabel).toBe("프론트엔드");
    expect(detail.sourceMeeting?.id).toBe(5);
    expect(detail.parentTeamAction?.id).toBe(3);
  });

  it("상위 팀 액션·출처 회의는 4·3필드가 다 있어야 블록을 만든다 — 하나라도 null이면 undefined", () => {
    /* 기존 매퍼 규칙 회귀 — 이 작업에서 손대지 않았음을 명시한다 */
    expect(
      toPersonalActionDetail({ ...BASE, parentActionTeamName: null }).parentTeamAction,
    ).toBeUndefined();
    expect(
      toPersonalActionDetail({ ...BASE, sourceMeetingTitle: null }).sourceMeeting,
    ).toBeUndefined();
  });
});
