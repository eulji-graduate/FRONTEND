import { COMPANY_SIZE, COMPANY_STATUS } from "@/constants/domain";

import type { ManagedCompany } from "../types";

/** ⚠️ 목 데이터 — BE 연동 전. 검색·필터·페이지네이션을 눈으로 확인할 수 있도록 넉넉히 둔다. */
const BASE_COMPANIES: ManagedCompany[] = [
  {
    id: "1",
    name: "(주)테크스타트",
    code: "TECHSTART-2025",
    size: COMPANY_SIZE.MEDIUM,
    memberCount: 12,
    meetingCountThisMonth: 47,
    status: COMPANY_STATUS.ACTIVE,
    joinedAt: "2025-01-14",
    ownerEmail: "ceo@techstart.kr",
  },
  {
    id: "2",
    name: "그린로직스",
    code: "GREENLOGICS-25",
    size: COMPANY_SIZE.SMALL,
    memberCount: 4,
    meetingCountThisMonth: 8,
    status: COMPANY_STATUS.ACTIVE,
    joinedAt: "2025-02-02",
    ownerEmail: "hello@greenlogics.kr",
  },
  {
    id: "3",
    name: "(주)레이어원",
    code: "LAYERONE-2025",
    size: COMPANY_SIZE.MEDIUM,
    memberCount: 27,
    meetingCountThisMonth: 83,
    status: COMPANY_STATUS.ACTIVE,
    joinedAt: "2025-04-22",
    ownerEmail: "ceo@techstart.kr",
  },
  {
    id: "4",
    name: "모멘텀랩",
    code: "MOMENTUM-2025",
    size: COMPANY_SIZE.SMALL,
    memberCount: 8,
    meetingCountThisMonth: 19,
    status: COMPANY_STATUS.UNPAID,
    joinedAt: "2025-03-11",
    ownerEmail: "biz@momentumlab.kr",
  },
  {
    id: "5",
    name: "엔드포인트",
    code: "ENDPOINT-2025",
    size: COMPANY_SIZE.MICRO,
    memberCount: 3,
    meetingCountThisMonth: 2,
    status: COMPANY_STATUS.ACTIVE,
    joinedAt: "2025-05-30",
    ownerEmail: "admin@endpoint.dev",
  },
  {
    id: "6",
    name: "(주)블루스톤",
    code: "BLUESTONE-2025",
    size: COMPANY_SIZE.MEDIUM,
    memberCount: 14,
    meetingCountThisMonth: 31,
    status: COMPANY_STATUS.SUSPENDED,
    joinedAt: "2025-06-15",
    ownerEmail: "ceo@techstart.kr",
  },
];

/** 검색·페이지네이션이 실제로 넘어가는지 보이도록 이름만 바꿔 62개까지 늘린다. */
const EXTRA_COMPANY_NAMES = [
  "노드포지",
  "(주)그레이스케일",
  "블루밍웍스",
  "(주)코어스퀘어",
  "머스트텍",
  "(주)비컨랩스",
  "라이트하우스랩",
  "클리어웍스",
  "(주)파인애플스튜디오",
  "솔로몬AI",
  "리얼타임랩스",
  "(주)브릿지파트너스",
  "픽셀그로브",
  "(주)스트림웍스",
  "웨이브포인트",
  "(주)크리스탈넷",
  "오비트랩스",
  "(주)메이플시스템즈",
  "다이나모웍스",
  "(주)실버라인",
  "그래비티랩",
  "(주)넥서스포지",
  "브릿지스톤테크",
  "(주)폴라리스랩",
  "코발트웍스",
  "(주)에메랄드시스템",
  "선라이즈랩스",
  "(주)베이스캠프",
  "인피니티그룹",
  "(주)스텔라웍스",
  "포워드랩",
  "(주)하모니시스템",
  "블랙포레스트",
  "(주)골든게이트랩",
  "카이트웍스",
  "(주)리버사이드",
  "문라이트랩스",
  "(주)선다이얼",
  "패스파인더",
  "(주)오로라시스템",
  "리플렉트랩",
  "(주)헤리티지웍스",
  "스파클랩스",
  "(주)트윈피크스",
  "제니스랩",
  "(주)벡터포인트",
  "글로우웍스",
  "(주)크레센트",
  "아이콘랩스",
  "(주)파노라마",
  "브릴리언스랩",
  "(주)에코시스템",
  "노바크래프트",
  "(주)스카이라인",
  "루미나웍스",
  "(주)프론티어랩",
] as const;

const SIZES = [COMPANY_SIZE.MICRO, COMPANY_SIZE.SMALL, COMPANY_SIZE.MEDIUM, COMPANY_SIZE.LARGE];
/**
 * ⚠️ 미납(UNPAID)은 **드물게만** 나오게 한다 — "구독·매출" 화면의 요약 카드·목록이
 *    "미납 1건" 수준을 전제로 만들어졌다(화면 시안 기준). 비율이 높으면(예전엔 5칸 중
 *    1칸) 62개 목 기업 중 여러 곳이 미납이 되어, 구독 목록(미납 우선 채움)이 5칸을
 *    전부 미납으로 채워버려 "미납 우선 + 최신 가입 보충"이라는 화면 의도가 안 보인다.
 */
const STATUSES = [
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.ACTIVE,
  COMPANY_STATUS.SUSPENDED,
  COMPANY_STATUS.SUSPENDED,
  COMPANY_STATUS.SUSPENDED,
  COMPANY_STATUS.UNPAID,
];

const EXTRA_COMPANIES: ManagedCompany[] = EXTRA_COMPANY_NAMES.map((name, index) => {
  const seed = index + 1;
  const size = SIZES[seed % SIZES.length]!;
  const status = STATUSES[seed % STATUSES.length]!;
  const slug = name.replace(/[()·]/g, "").slice(0, 6).toUpperCase();

  return {
    id: `${BASE_COMPANIES.length + seed}`,
    name,
    code: `${slug}-${2020 + (seed % 6)}`,
    size,
    memberCount: (seed % 40) + 5,
    meetingCountThisMonth: (seed * 3) % 90,
    status,
    joinedAt: `2025-${String((seed % 12) + 1).padStart(2, "0")}-${String((seed % 27) + 1).padStart(2, "0")}`,
    ownerEmail: `owner${seed}@${slug.toLowerCase()}.kr`,
  };
});

let mockCompanies: ManagedCompany[] = [...BASE_COMPANIES, ...EXTRA_COMPANIES];

export function listMockCompanies(): ManagedCompany[] {
  return mockCompanies;
}

export function findMockCompany(id: string): ManagedCompany | null {
  return mockCompanies.find((company) => company.id === id) ?? null;
}

/** 정지·정지 해제 — 실제 DB 흉내라 배열 안 항목을 직접 바꾼다. */
export function setMockCompanyStatus(
  id: string,
  status: ManagedCompany["status"],
): ManagedCompany | null {
  const company = findMockCompany(id);
  if (!company) return null;

  mockCompanies = mockCompanies.map((item) => (item.id === id ? { ...item, status } : item));
  return { ...company, status };
}
