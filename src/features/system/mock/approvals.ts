import type { PendingCompanyApproval } from "../types";

/**
 * ⚠️ 목 데이터 — BE 연동 전. **서버 프로세스 메모리에만 있다**(재시작하면 초기값으로 되돌아간다).
 * 승인·반려 Server Action이 이 배열을 직접 지운다 — 실제 DB 흉내다.
 */
let mockPendingApprovals: PendingCompanyApproval[] = [
  {
    id: "1",
    companyName: "(주)넥스트웨이브",
    businessRegistrationNumber: "123-45-67890",
    representativeName: "이지훈",
    contactEmail: "contact@nextwave.kr",
    memberCount: 42,
    appliedAt: "2025-07-28",
  },
  {
    id: "2",
    companyName: "솔로몬AI",
    businessRegistrationNumber: "234-56-78901",
    representativeName: "박서현",
    contactEmail: "admin@solomonai.io",
    memberCount: 12,
    appliedAt: "2025-07-27",
  },
  {
    id: "3",
    companyName: "리얼타임랩스",
    businessRegistrationNumber: "345-67-89012",
    representativeName: "김도현",
    contactEmail: "ceo@realtlabs.kr",
    memberCount: 4,
    appliedAt: "2025-07-26",
  },
  {
    id: "4",
    companyName: "(주)브릿지파트너스",
    businessRegistrationNumber: "456-78-90123",
    representativeName: "정유나",
    contactEmail: "hello@bridgeptn.com",
    memberCount: 130,
    appliedAt: "2025-07-25",
  },
  {
    id: "5",
    companyName: "클리어웍스",
    businessRegistrationNumber: "567-89-01234",
    representativeName: "한승우",
    contactEmail: "team@clearworks.kr",
    memberCount: 9,
    appliedAt: "2025-07-24",
  },
  {
    id: "6",
    companyName: "(주)파인애플스튜디오",
    businessRegistrationNumber: "678-90-12345",
    representativeName: "오세연",
    contactEmail: "info@pineapplestudio.kr",
    memberCount: 55,
    appliedAt: "2025-07-23",
  },
  {
    id: "7",
    companyName: "노드포지",
    businessRegistrationNumber: "789-01-23456",
    representativeName: "최민재",
    contactEmail: "contact@nodeforge.dev",
    memberCount: 3,
    appliedAt: "2025-07-22",
  },
  {
    id: "8",
    companyName: "(주)그레이스케일",
    businessRegistrationNumber: "890-12-34567",
    representativeName: "송지원",
    contactEmail: "admin@grayscale.kr",
    memberCount: 14,
    appliedAt: "2025-07-21",
  },
  {
    id: "9",
    companyName: "블루밍웍스",
    businessRegistrationNumber: "901-23-45678",
    representativeName: "장하은",
    contactEmail: "hi@bloomingworks.io",
    memberCount: 5,
    appliedAt: "2025-07-20",
  },
  {
    id: "10",
    companyName: "(주)코어스퀘어",
    businessRegistrationNumber: "012-34-56789",
    representativeName: "윤태호",
    contactEmail: "biz@coresquare.co.kr",
    memberCount: 38,
    appliedAt: "2025-07-19",
  },
  {
    id: "11",
    companyName: "머스트텍",
    businessRegistrationNumber: "111-22-33445",
    representativeName: "임소율",
    contactEmail: "contact@musttech.kr",
    memberCount: 11,
    appliedAt: "2025-07-18",
  },
  {
    id: "12",
    companyName: "(주)비컨랩스",
    businessRegistrationNumber: "222-33-44556",
    representativeName: "배준영",
    contactEmail: "hello@beaconlabs.kr",
    memberCount: 145,
    appliedAt: "2025-07-17",
  },
  {
    id: "13",
    companyName: "라이트하우스랩",
    businessRegistrationNumber: "333-44-55667",
    representativeName: "구예린",
    contactEmail: "team@lighthouselab.io",
    memberCount: 4,
    appliedAt: "2025-07-16",
  },
];

export function listMockPendingApprovals(): PendingCompanyApproval[] {
  return mockPendingApprovals;
}

export function findMockPendingApproval(id: string): PendingCompanyApproval | null {
  return mockPendingApprovals.find((company) => company.id === id) ?? null;
}

/** 승인·반려 둘 다 대기 목록에서 지운다 — "기업 관리"·"반려 이력" 화면은 아직 없다. */
export function removeMockPendingApproval(id: string): void {
  mockPendingApprovals = mockPendingApprovals.filter((company) => company.id !== id);
}
