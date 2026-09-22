import { AUTHORITY } from "@/constants/authority";
import { ACTION_STATUS } from "@/constants/domain";
import { HANDOVER_TYPE } from "@/constants/handover";
import { DELETED_MEMBER_STATUS, isVisibleMemberStatus, MEMBER_STATUS } from "@/constants/member";

import type {
  ManagedMember,
  ManagedMemberAction,
  ManagedMemberDetail,
  PendingHandover,
} from "../manage-types";

/**
 * 목 스토어 한 칸 — **화면 계약(`ManagedMemberDetail`)과 일부러 다르다.**
 *
 * ⚠️ 화면은 담당 액션을 `{ items, totalCount } | null`로 받는다(`null` = 못 읽었다).
 *    목 데이터에까지 그 껍데기를 씌우면 사람 열한 명 자리에 `{ items: [], totalCount: 0 }`이
 *    반복될 뿐이라, **읽는 자리(`findMockManagedMember`)에서 한 번에 씌운다** — 목은
 *    "이 사람이 무슨 액션을 들고 있나"만 적는다.
 */
interface MockManagedMemberEntry {
  member: ManagedMember;
  actions: ManagedMemberAction[];
  pendingHandover: PendingHandover | null;
}

/**
 * 목 — WORKFLOW §0의 **페르소나 그대로**다.
 *
 * ⚠️ 이름·팀·권한을 여기서 새로 지어내지 않는다. 대시보드·회의 참석자 목록과 같은 사람들이라,
 *    다르면 데모에서 화면을 오갈 때 회사가 달라 보인다.
 * ⚠️ **고치면 남는다.** 모듈 수준 저장소라 서버가 살아 있는 동안은 승인·변경이 실제로
 *    반영된다 — 눌러도 아무 일 없는 목은 "승인했습니다"가 거짓말이 된다(§정직한 목업).
 */

const INITIAL: MockManagedMemberEntry[] = [
  {
    // ⚠️ Owner는 팀이 없다 — 화면에 `-`로 적힌다(WORKFLOW §9)
    member: {
      id: 1,
      name: "박대표",
      email: "ceo@zgroup.co.kr",
      teamName: null,
      position: "대표",
      authority: AUTHORITY.OWNER,
      isAdmin: false,
      roleLabel: null,
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2020-01-02",
      pendingHandoverType: null,
    },
    actions: [],
    pendingHandover: null,
  },
  {
    member: {
      id: 2,
      name: "김서준",
      email: "seojun@zgroup.co.kr",
      teamName: "개발팀",
      position: "팀장",
      authority: AUTHORITY.LEADER,
      isAdmin: false,
      roleLabel: null,
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2021-03-02",
      pendingHandoverType: null,
    },
    actions: [
      {
        id: "a-201",
        title: "3분기 개발 로드맵 확정",
        status: ACTION_STATUS.IN_PROGRESS,
        dueDate: "2026-08-14",
      },
    ],
    pendingHandover: null,
  },
  {
    /*
      ⚠️ **휴직 승인을 기다리는 사람을 하나 둔다.** 없으면 이 화면의 핵심 경로
         (최종 승인·반려)를 데모에서 아예 못 본다.
    */
    member: {
      id: 3,
      name: "이하윤",
      email: "hayun@zgroup.co.kr",
      teamName: "개발팀",
      position: "선임",
      authority: AUTHORITY.MEMBER,
      isAdmin: true,
      roleLabel: "프론트엔드",
      status: MEMBER_STATUS.WAITING,
      joinedAt: "2022-05-10",
      pendingHandoverType: null,
    },
    actions: [
      {
        id: "a-101",
        title: "온보딩 플로우 와이어프레임 검토",
        status: ACTION_STATUS.IN_PROGRESS,
        dueDate: "2026-08-05",
      },
      {
        id: "a-102",
        title: "API 엔드포인트 문서화",
        status: ACTION_STATUS.TODO,
        dueDate: "2026-08-07",
      },
      {
        id: "a-103",
        title: "스프린트 보드 세팅",
        status: ACTION_STATUS.DONE,
        dueDate: "2026-07-25",
      },
    ],
    pendingHandover: {
      id: "h-301",
      type: HANDOVER_TYPE.VACATION,
      period: { from: "2026-08-05", to: "2026-08-09" },
      actionCount: 3,
      /*
        ⚠️ 아직 팀장 중간 승인 전이다(`null`) — `/team/handover`에서 김서준이 이 신청을
           처리해야 하는 데모 대상이다. 이미 중간 승인된 신청 데모는 임지안(id 8)이 맡는다.
      */
      midApproval: null,
      /*
        ⚠️ **신청 당시** 값을 굳혀 둔다(CodeRabbit 지적, 2026-08-09) — 나중에 이 사람의
           `authority`가 바뀌어도(팀장 승급 등) 이 신청은 그때 기준을 그대로 유지한다.
      */
      requesterAuthority: AUTHORITY.MEMBER,
    },
  },
  {
    member: {
      id: 4,
      name: "박도현",
      email: "dohyun@zgroup.co.kr",
      teamName: "개발팀",
      position: "주임",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleLabel: "백엔드",
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2023-01-15",
      pendingHandoverType: null,
    },
    actions: [
      {
        id: "a-104",
        title: "회의록 저장 API 연동",
        status: ACTION_STATUS.TODO,
        dueDate: "2026-08-12",
      },
    ],
    pendingHandover: null,
  },
  {
    member: {
      id: 5,
      name: "최유진",
      email: "yujin@zgroup.co.kr",
      teamName: "마케팅팀",
      position: "팀장",
      authority: AUTHORITY.LEADER,
      isAdmin: false,
      roleLabel: null,
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2023-04-20",
      pendingHandoverType: null,
    },
    actions: [],
    pendingHandover: null,
  },
  {
    member: {
      id: 6,
      name: "정민석",
      email: "minseok@zgroup.co.kr",
      teamName: "마케팅팀",
      position: "대리",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleLabel: "브랜드",
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2020-09-01",
      pendingHandoverType: null,
    },
    actions: [],
    pendingHandover: null,
  },
  {
    member: {
      id: 7,
      name: "강서연",
      email: "seoyeon@zgroup.co.kr",
      teamName: "디자인팀",
      position: "팀장",
      authority: AUTHORITY.LEADER,
      isAdmin: false,
      roleLabel: null,
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2024-02-19",
      pendingHandoverType: null,
    },
    actions: [],
    pendingHandover: null,
  },
  {
    /* ⚠️ 오프보딩 대기도 하나 — 휴직과 문구·결과가 다르다 */
    member: {
      id: 8,
      name: "임지안",
      email: "jian@zgroup.co.kr",
      teamName: "마케팅팀",
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleLabel: "캠페인",
      status: MEMBER_STATUS.WAITING,
      joinedAt: "2024-06-01",
      pendingHandoverType: null,
    },
    actions: [
      {
        id: "a-105",
        title: "8월 캠페인 소재 정리",
        status: ACTION_STATUS.IN_PROGRESS,
        dueDate: "2026-08-20",
      },
    ],
    pendingHandover: {
      id: "h-302",
      type: HANDOVER_TYPE.OFFBOARDING,
      period: null,
      actionCount: 5,
      midApproval: { approverName: "최유진", approvedAt: "2026-08-01" },
      requesterAuthority: AUTHORITY.MEMBER,
    },
  },
  {
    member: {
      id: 9,
      name: "오현우",
      email: "hyunwoo@zgroup.co.kr",
      teamName: "전략기획팀",
      position: "과장",
      authority: AUTHORITY.LEADER,
      isAdmin: false,
      roleLabel: null,
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2021-11-08",
      pendingHandoverType: null,
    },
    actions: [],
    pendingHandover: null,
  },
  {
    member: {
      id: 10,
      name: "한소율",
      email: "soyul@zgroup.co.kr",
      teamName: "디자인팀",
      position: "사원",
      authority: AUTHORITY.MEMBER,
      isAdmin: false,
      roleLabel: "비주얼",
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: "2024-08-12",
      pendingHandoverType: null,
    },
    actions: [],
    pendingHandover: null,
  },
];

/*
  ⚠️ `structuredClone`을 쓰지 않는다. Node엔 있지만 **jsdom 테스트 환경에는 없어서**
     이 모듈을 import하는 것만으로 스위트가 죽는다. 여기 값은 전부 평범한 JSON이다.
*/
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let store: MockManagedMemberEntry[] = clone(INITIAL);

/**
 * 화면에 내보낼 사원들.
 *
 * ⚠️ **지워진 사람은 뺀다**(`isVisibleMemberStatus`). 퇴사자도 여기 포함된다(2026-08-15
 *    정정 — "퇴사자는 남는다"였던 이전 정책이 뒤집혔다) — `approveMockHandover`가 오프보딩
 *    최종 승인 즉시 `DELETED_MEMBER_STATUS`로 보내 실서버(즉시 소프트 딜리트)와 같은
 *    동작을 흉내낸다(§도메인 상수). 남는 건 그 사람이 남긴 회의·액션 **기록**뿐이다.
 * ⚠️ 대기 중인 신청의 종류를 **행에 실어 준다** — 목록이 상세를 사람 수만큼 훑지 않게.
 */
export function listMockManagedMembers(): ManagedMember[] {
  return clone(store)
    .filter((entry) => isVisibleMemberStatus(entry.member.status))
    .map((entry) => ({
      ...entry.member,
      pendingHandoverType: entry.pendingHandover?.type ?? null,
    }));
}

/**
 * ⚠️ 담당 액션에 껍데기를 씌워 내보낸다 — 목은 **항상 다 읽은 상태**라 `null`이 아니고,
 *    `totalCount`는 목이 가진 전부다(실서버는 첫 페이지만 오고 전체는 서버가 센다).
 * ⚠️ **`roleId`는 여기서 안 채운다.** 이 저장소는 역할을 이름(`roleLabel`)으로만 들고
 *    있어서, 그 팀의 역할 목록과 대조해야 id를 찾을 수 있다 — 그건 팀 목록을 아는
 *    `manage-server.ts`(`getManagedMember`)가 `roleIdOf`로 채운다.
 */
export function findMockManagedMember(id: number): Omit<ManagedMemberDetail, "roleId"> | null {
  const found = store.find((entry) => entry.member.id === id);
  if (!found) return null;

  const entry = clone(found);
  return {
    member: entry.member,
    actions: { items: entry.actions, totalCount: entry.actions.length },
    pendingHandover: entry.pendingHandover,
  };
}

/**
 * 직급·권한·Admin 겸직·역할 변경.
 *
 * ⚠️ **`roleLabel`은 안 넘기면 안 바꾼다**(부분 수정) — `manage-actions.ts`가 화면의
 *    역할 id를 이 저장소의 이름으로 바꿔서 넘긴다(`roleNameOf`). 실서버는 id를 그대로
 *    BE에 보내므로 이 다리가 필요 없다.
 */
export function updateMockMemberGrade(
  id: number,
  next: {
    position: string;
    authority: ManagedMember["authority"];
    isAdmin: boolean;
    roleLabel?: string | null;
  },
): void {
  store = store.map((entry) => {
    if (entry.member.id !== id) return entry;
    return {
      ...entry,
      member: {
        ...entry.member,
        position: next.position,
        authority: next.authority,
        isAdmin: next.isAdmin,
        ...(next.roleLabel !== undefined ? { roleLabel: next.roleLabel } : {}),
      },
    };
  });
}

/**
 * 최종 승인 — 신청을 치우고 사람 상태를 옮긴다.
 *
 * ⚠️ **오프보딩은 승인 즉시 소프트 삭제된다**(2026-08-14 정정 — BE `MemberJpaEntity.offboard`
 *    확인). `RESIGNED`는 BE 내부 감사 흔적일 뿐 조회 응답엔 안 실린다 — 목이 그 자리에서
 *    `RESIGNED`로만 바꾸고 그대로 남겨 두면, 실제로는 절대 안 오는 상태가 이 화면에 계속
 *    보이고(`org-member-node.tsx`의 `StatusMark`가 더 이상 안 그린다) `gradeLockOf`도 더는
 *    막지 않아 지워진 사람의 계정을 권한만으로 다시 만질 수 있는 구멍이 생긴다 — 그래서
 *    `DELETED_MEMBER_STATUS`로 바로 보내 `isVisibleMemberStatus`가 걸러 내게 한다.
 * ⚠️ 휴직(`VACATION`)은 다르다 — 복귀를 전제로 하므로 계속 보인다.
 * ⚠️ **팀장이 오프보딩되면 `authority`도 같이 내린다**(2026-08-08 정정) — 안 내리면
 *    이 사람은 퇴사했는데도 시스템엔 여전히 그 팀 LEADER로 남아, 후임을 승급하려 하면
 *    "이미 팀장이 있다"로 막히고 본인을 내리려 해도 "유일한 팀장"이라 막혀 순환 잠금에
 *    빠진다(WORKFLOW §7 "리더 공석"은 실제로 비어 있어야 다음 사람을 앉힐 수 있다).
 *    휴직은 복귀를 전제로 하므로 권한을 안 건드린다 — 휴직 중에도 팀장 자리는 그대로다.
 */
export function approveMockHandover(id: number): void {
  store = store.map((entry) => {
    if (entry.member.id !== id || !entry.pendingHandover) return entry;
    const isVacation = entry.pendingHandover.type === HANDOVER_TYPE.VACATION;
    const wasLeader = entry.member.authority === AUTHORITY.LEADER;
    return {
      ...entry,
      member: {
        ...entry.member,
        status: isVacation ? MEMBER_STATUS.VACATION : (DELETED_MEMBER_STATUS as never),
        authority: !isVacation && wasLeader ? AUTHORITY.MEMBER : entry.member.authority,
      },
      pendingHandover: null,
    };
  });
}

/**
 * 팀장 중간 승인 — `/team/handover`에서 팀원 보드로 재배정을 마치고 [인수인계 확정]을
 * 누른 순간 호출된다. 신청 자체는 그대로 두고(최종 승인은 오너 몫) `midApproval`만 채운다.
 */
export function completeMockHandoverMidApproval(
  id: number,
  approverName: string,
  approvedAt: string,
): void {
  store = store.map((entry) =>
    entry.member.id === id && entry.pendingHandover
      ? {
          ...entry,
          pendingHandover: { ...entry.pendingHandover, midApproval: { approverName, approvedAt } },
        }
      : entry,
  );
}

/** 반려 — 신청을 치우고 사람은 재직으로 되돌린다 */
export function rejectMockHandover(id: number): void {
  store = store.map((entry) =>
    entry.member.id === id && entry.pendingHandover
      ? {
          ...entry,
          member: { ...entry.member, status: MEMBER_STATUS.ACTIVE },
          pendingHandover: null,
        }
      : entry,
  );
}

/**
 * 계정 발급 — 목록 맨 뒤에 붙인다.
 * ⚠️ 입사일은 **오늘**이 아니라 부르는 쪽이 준다. 여기서 `new Date()`를 부르면 서버 렌더와
 *    클라이언트가 갈려 하이드레이션이 어긋난다(§저장소 화면과 같은 이유).
 */
export function addMockManagedMember(
  draft: {
    name: string;
    email: string;
    teamName: string;
    position: string;
    authority: ManagedMember["authority"];
    isAdmin: boolean;
    roleLabel: string;
  },
  joinedAt: string,
): ManagedMember {
  const id = Math.max(0, ...store.map((entry) => entry.member.id)) + 1;
  const member: ManagedMember = {
    id,
    name: draft.name.trim(),
    email: draft.email.trim(),
    teamName: draft.teamName.trim(),
    position: draft.position.trim(),
    authority: draft.authority,
    isAdmin: draft.isAdmin,
    /*
      ⚠️ 발급 때 정한다. 전에는 `null`로 두고 "팀장이 붙인다"고 적어 뒀는데,
         **팀장이 붙일 화면이 없었다** — 온보딩 뒤에 들어온 사람은 계속 `없음`이었다.
      ⚠️ 빈 값은 `null`로 저장한다 — 화면은 `없음`으로 읽고, 값이 있는 것과 없는 것을 가른다.
    */
    roleLabel: draft.roleLabel.trim() || null,
    status: MEMBER_STATUS.ACTIVE,
    joinedAt,
    pendingHandoverType: null,
  };
  store = [...store, { member, actions: [], pendingHandover: null }];
  return clone(member);
}

/** 이미 쓰고 있는 메일 주소들 — 중복 발급을 막는 데 쓴다 */
export function listMockMemberEmails(): string[] {
  return store.map((entry) => entry.member.email);
}

/** 테스트가 앞 테스트의 변경을 물려받지 않게 되돌린다 */
export function resetMockManagedMembers(): void {
  store = clone(INITIAL);
}
