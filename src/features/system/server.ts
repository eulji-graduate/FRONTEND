import "server-only";

import { COMPANY_SORT, type CompanySort, type CompanyStatus } from "@/constants/domain";
import { paginate, type PaginatedResult } from "@/lib/paginate";

import { findMockPendingApproval, listMockPendingApprovals } from "./mock/approvals";
import { MOCK_BILLING_OVERVIEW } from "./mock/billing";
import { findMockCompany, listMockCompanies, setMockCompanyStatus } from "./mock/companies";
import { MOCK_DASHBOARD_OVERVIEW } from "./mock/dashboard";
import { MOCK_MONITORING_OVERVIEW } from "./mock/monitoring";
import { MOCK_NOTICE_HISTORY } from "./mock/notices";
import type {
  BillingOverview,
  CompanyListFilter,
  DashboardOverview,
  ManagedCompany,
  MonitoringOverview,
  NoticeHistoryItem,
  NoticeTargetCompany,
  PendingCompanyApproval,
} from "./types";

/**
 * SYSTEM 대시보드 조회.
 * ⚠️ system 도메인은 프로젝트 기간 내내 목으로 남는다(팀 합의) — 다른 도메인과 달리
 *    `isMock` 전역 스위치를 보지 않고 항상 mock을 반환한다.
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  return MOCK_DASHBOARD_OVERVIEW;
}

/** 승인 대기 기업 목록 — 페이지 단위로 잘라 돌려준다. */
export async function getPendingApprovals(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<PendingCompanyApproval>> {
  return paginate(listMockPendingApprovals(), page, pageSize);
}

export async function getPendingApprovalById(id: string): Promise<PendingCompanyApproval | null> {
  return findMockPendingApproval(id);
}

function matchesFilter(company: ManagedCompany, filter: CompanyListFilter): boolean {
  if (filter.status && company.status !== filter.status) return false;

  if (filter.keyword) {
    const keyword = filter.keyword.trim().toLowerCase();
    if (keyword) {
      const matchesName = company.name.toLowerCase().includes(keyword);
      const matchesCode = company.code.toLowerCase().includes(keyword);
      if (!matchesName && !matchesCode) return false;
    }
  }

  return true;
}

/** 정렬 — 구성원수·가입일 기준(규모·플랜 필터를 대신한다). 없으면 최신 가입순. */
function sortCompanies(companies: ManagedCompany[], sort: CompanySort): ManagedCompany[] {
  const sorted = [...companies];
  switch (sort) {
    case COMPANY_SORT.MEMBERS_DESC:
      return sorted.sort((a, b) => b.memberCount - a.memberCount);
    case COMPANY_SORT.MEMBERS_ASC:
      return sorted.sort((a, b) => a.memberCount - b.memberCount);
    case COMPANY_SORT.JOINED_ASC:
      return sorted.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
    case COMPANY_SORT.JOINED_DESC:
    default:
      return sorted.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  }
}

/**
 * 기업 관리 목록 — 검색·필터 후 페이지 단위로 잘라 돌려준다.
 * ⚠️ 검색·필터는 서버에서 계산한다 — 목록이 무한히 늘어날 수 있어(CLAUDE.md §성능) 클라이언트로
 *    전체를 내려보내고 거르면 안 된다. 지금은 목 배열을 거르지만 자리(함수 시그니처)는 실서버와 같다.
 */
export async function getManagedCompanies(
  filter: CompanyListFilter,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<ManagedCompany>> {
  const filtered = listMockCompanies().filter((company) => matchesFilter(company, filter));
  const sorted = sortCompanies(filtered, filter.sort ?? COMPANY_SORT.JOINED_DESC);
  return paginate(sorted, page, pageSize);
}

export async function getManagedCompanyById(id: string): Promise<ManagedCompany | null> {
  return findMockCompany(id);
}

export async function setCompanyStatus(
  id: string,
  status: CompanyStatus,
): Promise<ManagedCompany | null> {
  return setMockCompanyStatus(id, status);
}

/** SYSTEM 구독·매출 조회. */
export async function getBillingOverview(): Promise<BillingOverview> {
  return MOCK_BILLING_OVERVIEW;
}

/**
 * SYSTEM 시스템 모니터링 조회.
 * 큐 상태·단계 소요·실패 목록은 실서버에선 파이프라인 메트릭/잡 큐에서 오는 값이다.
 */
export async function getMonitoringOverview(): Promise<MonitoringOverview> {
  return MOCK_MONITORING_OVERVIEW;
}

/** SYSTEM 공지 "발행 이력" 조회. */
export async function getNoticeHistory(): Promise<NoticeHistoryItem[]> {
  return MOCK_NOTICE_HISTORY;
}

/**
 * 공지 "특정 기업" 대상 검색용 기업 목록 — 이름·코드만 가볍게 넘긴다.
 * ⚠️ 지금은 전체 목록을 내려 클라이언트에서 걸러 보여준다(데모 규모).
 */
export async function getNoticeTargetCompanies(): Promise<NoticeTargetCompany[]> {
  return listMockCompanies().map((company) => ({
    id: company.id,
    name: company.name,
    code: company.code,
  }));
}
