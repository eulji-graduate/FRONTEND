import type { Authority } from "@/constants/authority";
import type { ActionStatus } from "@/constants/domain";
import type { HandoverType } from "@/constants/handover";
import type { MemberStatus } from "@/constants/member";

/**
 * 사원 관리 화면의 **UI 계약**(`/manage/members`).
 *
 * ⚠️ 같은 폴더의 `types.ts`는 **내 대시보드**용이다. 파일을 나눈 건 보는 사람이 다르기
 *    때문이다 — 저기는 "내 일", 여기는 "회사의 사람".
 * ⚠️ ERD·API 미확정이라 아래는 **가정한 shape**이다(§연동 검증). 확정되면 매퍼만 고친다.
 */

/**
 * 목록 한 줄.
 *
 * ⚠️ 컬럼은 **이름 · 팀 · 직급 · 권한 · 역할 · 상태 · 입사일**이다(WORKFLOW §9).
 *    "미완료 액션" 컬럼은 없다 — 목록에서 셀 일이 아니다.
 */
export interface ManagedMember {
  id: number;
  name: string;
  email: string;
  /**
   * 소속 팀 이름. **Owner는 팀이 없다** — 화면에 `-`로 적는다(WORKFLOW §9).
   * ⚠️ 빈 문자열이 아니라 `null`이다. 빈 문자열은 "이름이 없는 팀"과 구분이 안 된다.
   */
  teamName: string | null;
  /** 직급(사원·대리·팀장 …) — 회사마다 다르게 쓰는 이름이다 */
  position: string;
  /** 시스템 접근 권한 */
  authority: Authority;
  /**
   * Admin 겸직 여부.
   * ⚠️ 권한이 아니라 **위에 덧붙는 것**이라 `authority`를 대체하지 않는다(§권한).
   */
  isAdmin: boolean;
  /**
   * 팀 안에서 맡는 세부 역할(프론트엔드 등). 없으면 `null`.
   * ⚠️ **계층이 아니라 라벨**이다(WORKFLOW §9) — 여기에 팀장을 두면 상위·하위 팀장이
   *    생겨 버려서, 역할을 가진 사람은 전부 그냥 Member 권한이다.
   */
  roleLabel: string | null;
  status: MemberStatus;
  /** 입사일 `YYYY-MM-DD` */
  joinedAt: string;
  /**
   * 승인을 기다리는 신청의 종류. 없으면 `null`.
   *
   * ⚠️ **행에 실어 둔다.** 상태만 보면 휴직 대기와 오프보딩 대기가 둘 다 `WAITING`이라
   *    구분이 안 된다 — 예전에는 이걸 알려고 목록이 상세를 사람 수만큼 훑었다(N+1).
   *    하나만 실패해도 목록 전체가 오류 화면이 됐다.
   * ⚠️ 컬럼으로 **보여주지는 않는다**(WORKFLOW §9의 컬럼 목록에 없다). 거르는 데만 쓴다.
   */
  pendingHandoverType: HandoverType | null;
}

/** 그 사람이 맡은 액션 한 줄 — 상세에서만 쓴다 */
export interface ManagedMemberAction {
  id: string;
  title: string;
  status: ActionStatus;
  /** 마감일 `YYYY-MM-DD` */
  dueDate: string;
}

/**
 * 담당 액션 카드가 받는 것 — **첫 페이지 + 서버가 센 전체 건수.**
 *
 * ⚠️ `items.length`와 `totalCount`가 **다를 수 있다.** BE가 페이지 단위로 주는데
 *    ([확인] `CompanyActionController` — `page`/`size`, 기본 20) 이 카드는 무한 스크롤이
 *    아니라 한 장만 보여 준다. 머리에 `items.length`를 적으면 21건 든 사람이 20건으로
 *    읽히므로 **머리는 `totalCount`**로 적고, 그러고도 남으면 아래에 몇 건만 보이는지 적는다.
 * ⚠️ 이 값이 `null`이면 그건 **"못 읽었다"**이지 "없다"가 아니다
 *    (`ManagedMemberDetail.actions` 주석 참고).
 */
export interface ManagedMemberActions {
  items: ManagedMemberAction[];
  totalCount: number;
}

/**
 * 최종 승인을 기다리는 신청.
 *
 * ⚠️ **인수인계 내용은 담지 않는다.** 중간 단계에서 이미 끝나 올라온 것이라 대표가 실무
 *    내용을 다시 볼 이유가 없다(WORKFLOW §7 "실무 내용 직접 볼 필요 없음").
 *    화면에는 **누가 언제 중간 승인했는지**만 적는다.
 * ⚠️ 팀장 본인 신청은 중간 승인이 없다 — 그때 `midApproval`은 `null`이고, 화면은
 *    "본인이 재할당까지 마쳤다"는 뜻으로 다른 문장을 쓴다(WORKFLOW §7).
 */
export interface PendingHandover {
  id: string;
  type: HandoverType;
  /** 휴직 기간 `YYYY-MM-DD`. 오프보딩이면 `null`(돌아오지 않는다) */
  period: { from: string; to: string } | null;
  /** 넘긴 액션 수 */
  actionCount: number;
  midApproval: { approverName: string; approvedAt: string } | null;
  /**
   * **신청 당시** 그 사람이 팀장이었는지 — 지금(`member.authority`)이 아니라 그때 값을
   * 그대로 굳혀 둔다(CodeRabbit 지적, 2026-08-09). 팀장 공석 중엔 일반 팀원도 승급될 수
   * 있는데, 승인 카드가 그때그때의 권한을 다시 읽으면 승급 전 일반 팀원 신청이 승급 후엔
   * "팀장 본인 신청"으로 잘못 표시된다.
   */
  requesterAuthority: Authority;
}

/** 상세 한 사람 */
export interface ManagedMemberDetail {
  member: ManagedMember;
  /*
    ⚠️ **연락처는 없다.** 받는 곳이 없어서(계정 발급·마이페이지 어디에도 전화 칸이 없다)
       화면에 목이 지어낸 번호가 떠 있었다 — 타입에 남겨 두면 "받는 값"으로 오해된다.
       마이페이지가 본인에게 받게 되면 그때 여기부터 되살린다.
  */
  /**
   * 그 사람이 맡고 있는 액션 — **`null`은 "못 읽었다"이지 "없다"가 아니다.**
   *
   * ⚠️ 둘을 가르는 이유(§정직성 — `meeting/view-types.ts`의 `MeetingContentPending`과 같은
   *    idiom). 이 카드는 **승인 직전에 "이 사람이 뭘 들고 있나"를 보는 자리**다. 조회가
   *    실패했을 때 빈 배열로 뭉개면 화면은 `맡고 있는 액션이 없습니다`라고 말하는데,
   *    그 말을 믿고 오프보딩을 승인하면 인수인계 없이 액션이 붕 뜬다.
   * ⚠️ 값이 있어도 `items`는 **첫 페이지뿐**이다(`ManagedMemberActions` 주석).
   */
  actions: ManagedMemberActions | null;
  /** 승인을 기다리는 신청. 없으면 `null` */
  pendingHandover: PendingHandover | null;
  /**
   * 지금 이 사람에게 붙은 역할 id. [확인] BE `MemberDetailResponse.roleId`(신규, PR #489).
   *
   * ⚠️ **`roleLabel`(이름)이 아니라 id로 들고 다닌다.** 역할 이름은 회사 안에서도 중복될 수
   *    있어(`(company_id, name)` UNIQUE 없음) 이름으로 지금 값을 되찾으면 같은 이름의 다른
   *    역할이 골라질 수 있다 — `member.roleLabel`은 목록·표시용으로 그대로 두고, 폼의
   *    선택 상태는 이 값으로만 잡는다(`MemberGradeCard`).
   * ⚠️ 이 팀에 역할이 하나도 없거나(이상 상태) 팀이 없는 사람(Owner)이면 `null`이다.
   */
  roleId: string | null;
}

/**
 * 목록 위 필터.
 * ⚠️ 상태 전부를 칸으로 늘어놓지 않는다 — 이 화면에서 **손이 필요한 것**만 추린다.
 *    재직·퇴사를 고르는 건 검색으로 충분하고, 승인 대기는 놓치면 사람이 기다린다.
 */
export const MEMBER_FILTER = {
  ALL: "ALL",
  VACATION_PENDING: "VACATION_PENDING",
  OFFBOARDING_PENDING: "OFFBOARDING_PENDING",
} as const;
export type MemberFilter = (typeof MEMBER_FILTER)[keyof typeof MEMBER_FILTER];

export const MEMBER_FILTER_LABEL: Record<MemberFilter, string> = {
  ALL: "전체",
  VACATION_PENDING: "휴직 승인 대기",
  OFFBOARDING_PENDING: "오프보딩 승인 대기",
};

/**
 * 계정 발급 폼이 보내는 값.
 *
 * ⚠️ **발급 대상은 Leader·Member뿐**이다(WORKFLOW §11). Owner는 회사에 하나라 여기서
 *    만들지 않는다 — 만들 수 있게 두면 대표가 둘인 회사가 생긴다.
 * ⚠️ 비밀번호를 받지 않는다. 발급하면 아이디와 첫 비밀번호가 **메일로 나간다**
 *    (§온보딩 3단계와 같은 방식) — 여기서 정하면 그 값을 누군가 알고 있게 된다.
 */
export interface AccountDraft {
  name: string;
  email: string;
  teamName: string;
  position: string;
  authority: Authority;
  /**
   * 관리자 겸직으로 낼지.
   *
   * ⚠️ **권한이 아니라 그 위에 덧붙는 플래그**다(§권한: 축이 2개다). 발급 대상이 Leader·Member
   *    뿐이라는 규칙은 이 값과 무관하다 — 그건 `authority` 이야기다.
   * ⚠️ 온보딩 3단계 초대가 줄마다 같은 토글을 갖는다. 여기만 없으면 방금 만든 사람에게
   *    겸직을 주려고 목록 → 상세 → 저장을 다시 밟아야 한다.
   */
  isAdmin: boolean;
  /**
   * 팀 안의 세부 역할(프론트엔드 등) id. [확인] BE `IssueMemberRequest.roleId`(PR #489).
   *
   * ⚠️ **역할은 팀에 매여 있다** — 팀을 바꾸면 다시 골라야 한다(`team-roles`).
   * ⚠️ **이름이 아니라 id다.** 역할 이름은 회사 안에서도 중복될 수 있어(`(company_id, name)`
   *    UNIQUE 없음) 이름으로는 어느 역할을 가리키는지 확정할 수 없다.
   * ⚠️ `null`은 "아직 안 골랐다"가 아니라 **`없음`을 그대로 고른 상태**다 — BE가 모든 팀의
   *    역할 목록에 `없음`을 실제 행으로 끼워 주므로, 기본값도 그 행의 진짜 id로 잡는다
   *    (`emptyDraft`) — 화면이 직접 만든 자리표시자가 아니다.
   */
  roleId: string | null;
}

/** 칸별 오류 — 칸 밑에 인라인으로 붙는다(§토스트: 폼 검증 오류는 인라인) */
export type AccountErrors = Partial<Record<keyof AccountDraft, string>>;

/**
 * 목록 질의 — 검색·필터·페이지를 **서버가** 받는다.
 *
 * ⚠️ 화면에서 거르지 않는다. 전부 받아 `slice`하면 사원이 수백 명일 때 그 수백을 다 받는다
 *    (CLAUDE.md §목록·페이지네이션: 화면만 잘릴 뿐이다).
 */
export interface MemberQuery {
  keyword: string;
  filter: MemberFilter;
}

/** 변경 작업의 공통 결과 — 실패를 던지지 않고 값으로 돌려준다(화면이 문구를 고른다) */
export interface MemberActionResult {
  isSuccess: boolean;
  /** 실패 사유 한 줄. 성공이면 없다 */
  message?: string;
}
