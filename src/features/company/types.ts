import type { PickedPlace } from "@/features/auth/register-draft";
import type { DepartmentNode, Position } from "@/features/onboarding/types";

/**
 * 기업 설정 — **UI 계약**.
 *
 * ⚠️ 조직 트리·직급 타입은 **온보딩 것을 그대로 쓴다**(다시 정의하지 않는다).
 *    같은 것을 두 벌로 두면 온보딩에서 되는 조작이 여기서 조용히 안 되게 된다.
 *    편집 조각(`useDepartmentTree`·`usePositionList`·행 컴포넌트)도 같은 이유로 재사용한다.
 * ⚠️ ERD·API 미확정이라 아래는 **가정한 shape**이다(§연동 검증). 확정되면 매퍼만 고친다.
 */
export type { DepartmentNode, PickedPlace, Position };

/**
 * 회사 기본 정보.
 *
 * ⚠️ **기업 등록 신청에서 받는 것만 둔다** — 기업명·사업자등록번호·회사 위치 셋이다.
 *    대표자·대표 연락처는 신청에서도 온보딩에서도 받지 않는다. 없는 값을 칸으로 두면
 *    빈 채로 남거나 여기서 처음 적게 되는데, 그러면 이 화면이 **정본이 아닌 값의 유일한
 *    출처**가 된다(세금계산서에 그대로 나가는 값이라 특히 위험하다).
 *    신청 폼의 나머지 셋(담당자 이름·이메일·연락처)은 회사가 아니라 **첫 OWNER 계정**의
 *    정보라 여기가 아니라 마이페이지·사원 관리에 산다.
 */
export interface CompanyProfile {
  /** 사업자등록증에 적힌 이름 — 신청 폼의 `companyName`과 같은 값이다 */
  name: string;
  /** `000-00-00000` 꼴. 숫자 10자리 */
  businessNumber: string;
  /**
   * 회사 위치 — 지도에서 고른 곳.
   * ⚠️ 지도를 못 쓰는 환경에서는 주소만 적히고 좌표가 `0`으로 남는다(신청 화면과 같은 규칙).
   */
  place: PickedPlace | null;
  /**
   * 기업 코드 — **읽기 전용**이다.
   * ⚠️ 승인될 때 발급되고 사원이 로그인할 때 적는 값이라, 바뀌면 기존 사원이 전부 못 들어온다.
   *    URL에는 안 붙는다(§라우트 그룹: 기업 식별은 세션 쿠키).
   */
  code: string;
}

/** 화면이 한 번에 받는 값 — 기본 정보 + 조직 체계. */
export interface CompanySetting {
  profile: CompanyProfile;
  departments: DepartmentNode[];
  positions: Position[];
  /**
   * 팀 id → 그 팀에 속한 사원 수.
   *
   * ⚠️ **사람이 딸린 팀은 지울 수 없다**(우리가 정한 잠정 규칙 — BE 확인 필요).
   *    권한 판정(`isWithinTeamScope`)이 `teamId` 비교라, 팀이 사라진 사원은 **아무도 관리할 수
   *    없는 상태**가 된다. 인수인계·액션 추적도 팀 기준이라 소속이 끊기면 출처가 사라진다
   *    (퇴사자의 이름을 회의·액션 기록에 스냅샷으로 남겨 추적을 지키는 것과 같은 이유).
   * ⚠️ 막는 쪽을 고른 건 **되돌릴 길이 있어서**다 — 사원 관리에서 옮긴 뒤 다시 지우면 된다.
   *    미배정으로 흘려보내면 그 사원들을 다시 찾아 붙이는 일이 남는다.
   * ⚠️ 트리 노드에 넣지 않는다. `DepartmentNode`는 온보딩과 공유하는 타입이고, 거기엔
   *    아직 사원이 없다.
   */
  teamMemberCounts: Record<string, number>;
  /**
   * 역할 id → 그 역할을 쓰는 사원 수(BE PR #528).
   *
   * ⚠️ **사원이 있는 역할은 지울 수 없다** — 팀과 같은 원칙이다(위 `teamMemberCounts` 주석).
   *    역할이 사라지면 그 역할로 불리던 사람이 조용히 "역할 없음"이 되는데, 되돌릴 명시적
   *    재할당 절차가 없다.
   */
  roleMemberCounts: Record<string, number>;
}

/** 폼이 보내는 값 — 기업 코드는 못 고치므로 빠진다 */
export type CompanyProfileDraft = Omit<CompanyProfile, "code">;

/** 기본 정보 칸별 오류 — 칸 밑에 인라인으로 붙는다(§토스트: 폼 검증 오류는 인라인) */
export type CompanyProfileErrors = Partial<Record<keyof CompanyProfileDraft, string>>;

/** 변경 작업의 공통 결과 — 실패를 던지지 않고 값으로 돌려준다(화면이 문구를 고른다) */
export interface CompanyActionResult {
  isSuccess: boolean;
  /** 실패 사유 한 줄. 성공이면 없다 */
  message?: string;
}

/**
 * `saveDepartmentsAction` 전용 — 팀·역할은 **한 건씩** 저장하므로 중간에 실패할 수 있다.
 *
 * ⚠️ **`departments`는 실패했을 때만 실린다**(코드래빗 지적, 2026-08-14). 저장이 팀 삭제 →
 *    생성·이름변경 → 역할 삭제·생성·이름변경 순으로 여러 번 부르는데, 앞쪽이 성공하고 뒤쪽만
 *    실패하면 **서버에는 이미 진짜 id로 반영된 것**과 **화면이 여전히 들고 있는 임시 id**가
 *    섞인다. 그 상태로 다시 [저장]을 누르면 이미 만든 것을 "없다"고 보고 지운 뒤 임시 id로
 *    또 만든다(중복 생성·유실). 실패 응답에 지금 서버의 진짜 트리를 실어, 화면이 그 값으로
 *    되돌아가게 한다 — 실패는 그대로 알리되 다음 시도가 이 함정을 다시 밟지 않는다.
 */
export interface SaveDepartmentsResult extends CompanyActionResult {
  /** 부분 실패 뒤 되돌아갈 서버의 실제 트리. 성공했거나 BE를 아예 안 불렀으면 없다 */
  departments?: DepartmentNode[];
}
