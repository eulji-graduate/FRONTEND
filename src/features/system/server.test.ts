// server.ts는 "server-only"를 import한다 — jest(기본 조건)에선 그 모듈이 던지므로 비운다.
jest.mock("server-only", () => ({}));

import { COMPANY_SORT, COMPANY_STATUS } from "@/constants/domain";

import { MOCK_BILLING_OVERVIEW } from "./mock/billing";
import { listMockCompanies } from "./mock/companies";
import { MOCK_DASHBOARD_OVERVIEW } from "./mock/dashboard";
import { MOCK_MONITORING_OVERVIEW } from "./mock/monitoring";
import { MOCK_NOTICE_HISTORY } from "./mock/notices";
import {
  getBillingOverview,
  getDashboardOverview,
  getManagedCompanies,
  getManagedCompanyById,
  getMonitoringOverview,
  getNoticeHistory,
  getPendingApprovalById,
  getPendingApprovals,
} from "./server";

const TOTAL_COMPANIES = listMockCompanies().length;

describe("기업 관리 목록 — 검색·필터·페이지네이션", () => {
  it("조건이 없으면 전체를 페이지 단위로 자른다 — page=0이 첫 페이지다", async () => {
    const result = await getManagedCompanies({}, 0, 10);

    expect(result.totalCount).toBe(TOTAL_COMPANIES);
    expect(result.items).toHaveLength(10);
    expect(result.page).toBe(0);
    expect(result.totalPages).toBe(Math.ceil(TOTAL_COMPANIES / 10));
  });

  // ⚠️ 범위를 벗어난 페이지는 빈 화면 대신 마지막 페이지로 당긴다(lib/paginate 규칙).
  it("범위를 벗어난 페이지는 마지막 페이지로 당긴다", async () => {
    const result = await getManagedCompanies({}, 999, 10);

    const lastPageIndex = Math.ceil(TOTAL_COMPANIES / 10) - 1;
    expect(result.page).toBe(lastPageIndex);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("기업명 부분 일치로 걸러낸다", async () => {
    const result = await getManagedCompanies({ keyword: "테크스타트" }, 0, 20);

    expect(result.totalCount).toBeGreaterThan(0);
    for (const company of result.items) {
      const hit =
        company.name.includes("테크스타트") || company.code.toLowerCase().includes("테크스타트");
      expect(hit).toBe(true);
    }
  });

  // ⚠️ 검색은 대소문자를 무시한다 — 코드(GREENLOGICS-25)를 소문자로 쳐도 잡혀야 한다.
  it("코드 검색은 대소문자를 가리지 않는다", async () => {
    const result = await getManagedCompanies({ keyword: "greenlogics" }, 0, 20);

    expect(result.items.some((company) => company.name === "그린로직스")).toBe(true);
  });

  it("공백만 있는 검색어는 필터로 치지 않는다", async () => {
    const result = await getManagedCompanies({ keyword: "   " }, 0, 10);

    expect(result.totalCount).toBe(TOTAL_COMPANIES);
  });

  it("상태 필터는 그 상태만 남긴다", async () => {
    const result = await getManagedCompanies({ status: COMPANY_STATUS.ACTIVE }, 0, 100);

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((company) => company.status === COMPANY_STATUS.ACTIVE)).toBe(true);
  });

  it("상태 필터와 정렬을 함께 걸면 상태로 거르고 그 순서로 돌려준다", async () => {
    const result = await getManagedCompanies(
      { status: COMPANY_STATUS.ACTIVE, sort: COMPANY_SORT.MEMBERS_DESC },
      0,
      100,
    );

    expect(result.items.every((company) => company.status === COMPANY_STATUS.ACTIVE)).toBe(true);
    // 구성원 많은순 정렬 — 내림차순으로 정렬돼 있어야 한다.
    const memberCounts = result.items.map((company) => company.memberCount);
    expect(memberCounts).toEqual([...memberCounts].sort((a, b) => b - a));
  });
});

describe("기업 상세 조회", () => {
  it("있는 id는 그 기업을 돌려준다", async () => {
    const company = await getManagedCompanyById("1");

    expect(company?.name).toBe("(주)테크스타트");
  });

  it("없는 id는 null이다", async () => {
    expect(await getManagedCompanyById("존재하지-않음")).toBeNull();
  });
});

describe("기업 승인 대기 목록", () => {
  it("페이지 단위로 자른다 — page=0이 첫 페이지다", async () => {
    const result = await getPendingApprovals(0, 5);

    expect(result.items).toHaveLength(5);
    expect(result.page).toBe(0);
    expect(result.totalCount).toBeGreaterThan(5);
  });

  it("있는 id는 그 신청서를, 없는 id는 null을 돌려준다", async () => {
    expect((await getPendingApprovalById("1"))?.companyName).toBe("(주)넥스트웨이브");
    expect(await getPendingApprovalById("존재하지-않음")).toBeNull();
  });
});

// 격리막 통과 — 목 모드에선 UI 계약 객체를 그대로 넘긴다(server.ts는 분기만 한다).
describe("목 모드 조회는 목 데이터를 그대로 넘긴다", () => {
  it("대시보드", async () => {
    expect(await getDashboardOverview()).toBe(MOCK_DASHBOARD_OVERVIEW);
  });

  it("구독·매출", async () => {
    expect(await getBillingOverview()).toBe(MOCK_BILLING_OVERVIEW);
  });

  it("시스템 모니터링", async () => {
    expect(await getMonitoringOverview()).toBe(MOCK_MONITORING_OVERVIEW);
  });

  it("공지 발행 이력", async () => {
    expect(await getNoticeHistory()).toBe(MOCK_NOTICE_HISTORY);
  });
});
