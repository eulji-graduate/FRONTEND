import { AUTHORITY_BADGE_CLASS } from "@/constants/authority";

/**
 * 역할 셋 + 겸직 하나 — 탭 색·배지·기본 화면 구성.
 *
 * ⚠️ **`+Admin`은 역할이 아니라 겸직 권한이다**(권한 개편 #59). 탭은 넷이지만 마지막 하나는
 *    Owner·Leader·Member와 나란한 자리가 아니라, Leader·Member 위에 얹는 운영 권한이다 —
 *    `/roles`의 권한표와 같은 말을 쓴다. 예전에는 여기만 넷째 **역할**로 적혀 있었다.
 *
 * ⚠️ 역할 이름은 **영어**로 쓴다(CLAUDE.md §카피: 역할 워딩은 영어).
 * ⚠️ 역할 색은 역할 배지 토큰(`--role-*`)을 그대로 쓴다 — 랜딩은 그 토큰을 밝기에 맞춰 뒤집는다.
 * ⚠️ 고른 탭의 글자는 `text-background`다. 밝은 역할색 위에 흰 글자를 얹으면 읽히지 않는다.
 */
export const ROLE_VIEWS = [
  {
    name: "Owner",
    korean: "대표",
    chip: AUTHORITY_BADGE_CLASS.OWNER,
    activeTab: "bg-role-owner text-background",
    body: "조직 전체 현황을 한눈에 보고, 인수인계를 최종 승인합니다.",
    screen: "대시보드",
    nav: ["대시보드", "사원 관리", "구독"],
  },
  {
    name: "Leader",
    korean: "팀장",
    chip: AUTHORITY_BADGE_CLASS.LEADER,
    activeTab: "bg-role-leader text-background",
    body: "팀원의 액션을 보고, 인수인계를 넘겨받아 나눕니다.",
    screen: "팀 보드",
    nav: ["팀 보드", "회의", "인수인계"],
  },
  {
    name: "Member",
    korean: "사원",
    chip: AUTHORITY_BADGE_CLASS.MEMBER,
    activeTab: "bg-role-member text-background",
    body: "내게 배정된 액션만 보면 됩니다. 회의도 직접 열 수 있습니다.",
    screen: "내 업무",
    nav: ["내 업무", "회의", "캘린더"],
  },
  /*
    ⚠️ **맨 끝이다.** 앞의 셋은 역할이고 이건 그 위에 얹는 겸직이라, 역할 사이에 끼워 두면
       넷째 역할처럼 읽힌다(#59). 순서로도 "역할 다음에 오는 것"임을 말한다.
    ⚠️ 메뉴에 **구독**이 들어간다. 겸직자도 결제하므로 관리 기능은 `/manage/*` 하나로
       모았다(팀 URL 문서). 여기서 빼면 랜딩만 결제를 대표 전용으로 말한다.
  */
  {
    name: "+Admin",
    korean: "겸직 권한",
    chip: "bg-role-admin-surface text-role-admin",
    activeTab: "bg-role-admin text-background",
    /*
      ⚠️ **한 줄로 끝낸다.** 앞의 셋은 한 줄인데 여기만 두 줄이면 탭을 옮길 때 문단이 늘어나
         아래 링크가 밀린다 — 자리는 `min-h`로 잡아 두었지만, 길이 자체가 튀면 눈에 걸린다.
         무엇을 맡는지는 옆 화면의 메뉴가 이미 보여준다.
    */
    body: "권한 위에 얹는 겸직입니다. 계정·회의실·결제를 맡습니다.",
    screen: "사원 관리",
    nav: ["사원 관리", "회의실", "구독"],
  },
] as const;

export type RoleName = (typeof ROLE_VIEWS)[number]["name"];
