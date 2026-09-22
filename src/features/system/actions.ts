"use server";

import { revalidatePath } from "next/cache";

import { COMPANY_STATUS, NOTICE_TARGET, type NoticeTarget } from "@/constants/domain";
import type { PaginatedResult } from "@/lib/paginate";

import { findMockPendingApproval, removeMockPendingApproval } from "./mock/approvals";
import { findMockCompany, setMockCompanyStatus } from "./mock/companies";
import { findMockFailedItem } from "./mock/monitoring";
import { getManagedCompanies, getPendingApprovals } from "./server";
import type { CompanyListFilter, ManagedCompany, PendingCompanyApproval } from "./types";

const APPROVAL_LIST_PATH = "/system/approval";

/** 클라이언트가 부르는 값이라 그대로 믿지 않는다 — 범위를 벗어나면 안으로 당긴다. */
const MAX_PAGE_SIZE = 50;

// ⚠️ `page`는 0-base다(BE 표준 확정, 2026-08-10) — `page=0`이 첫 페이지.
function clampPage(page: number): number {
  return Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
}

function clampPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) return MAX_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}

/**
 * 기업 승인 화면의 **변경 창구** — 격리막(CLAUDE.md §Mock 격리막).
 * ⚠️ 지금은 목뿐이다 — 승인·반려 둘 다 대기 목록에서 지우기만 한다(실제 기업 코드 발급·메일
 *    발송·"기업 관리" 반영은 API가 붙어야 의미가 있다).
 * ⚠️ **페이지 이동 없이 그 자리에서 끝난다.** 목록이 무한 스크롤로 이미 여러 페이지를 들고 있어
 *    `redirect`로 화면을 되돌리면 그동안 이어붙인 항목이 전부 날아간다 — 확인 모달을 닫고
 *    로컬 목록에서 그 행만 지우는 쪽이 결과와 맞는다(`revalidatePath`는 다음 방문을 위한
 *    백그라운드 정합성용).
 */
export async function approveCompanyAction(companyId: string): Promise<{ success: boolean }> {
  if (!findMockPendingApproval(companyId)) return { success: false };
  removeMockPendingApproval(companyId);
  revalidatePath(APPROVAL_LIST_PATH);
  return { success: true };
}

export async function rejectCompanyAction(companyId: string): Promise<{ success: boolean }> {
  if (!findMockPendingApproval(companyId)) return { success: false };
  removeMockPendingApproval(companyId);
  revalidatePath(APPROVAL_LIST_PATH);
  return { success: true };
}

/**
 * "기업 승인" 무한 스크롤 — 다음 페이지를 클라이언트가 직접 부른다(CLAUDE.md §목록·페이지네이션).
 * `server.ts`의 `getPendingApprovals`(서버 컴포넌트 전용, `server-only`)를 클라이언트에서
 * 부를 수 있게 감싼 얇은 창구다.
 */
export async function fetchApprovalsPageAction(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<PendingCompanyApproval>> {
  return getPendingApprovals(clampPage(page), clampPageSize(pageSize));
}

/** "기업 관리" 무한 스크롤 — 위와 같은 이유로 `getManagedCompanies`를 감싼다. */
export async function fetchCompaniesPageAction(
  filter: CompanyListFilter,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<ManagedCompany>> {
  return getManagedCompanies(filter, clampPage(page), clampPageSize(pageSize));
}

/**
 * "기업 관리" 상세 패널의 정지·정지 해제 — 격리막(CLAUDE.md §Mock 격리막).
 * ⚠️ `redirect` 없이 **같은 화면에 머문다** — 승인/반려와 달리 상세를 계속 보는 흐름이라
 *    `revalidatePath`로 목록·상세를 새로고침한다(CLAUDE.md §핵심 4원칙 ②).
 */
export async function suspendCompanyAction(formData: FormData): Promise<void> {
  const id = String(formData.get("companyId") ?? "");
  const path = String(formData.get("path") ?? "/system/companies");

  if (!setMockCompanyStatus(id, COMPANY_STATUS.SUSPENDED)) {
    throw new Error("존재하지 않는 기업입니다.");
  }
  revalidatePath(path);
}

export async function unsuspendCompanyAction(formData: FormData): Promise<void> {
  const id = String(formData.get("companyId") ?? "");
  const path = String(formData.get("path") ?? "/system/companies");

  if (!setMockCompanyStatus(id, COMPANY_STATUS.ACTIVE)) {
    throw new Error("존재하지 않는 기업입니다.");
  }
  revalidatePath(path);
}

/**
 * "구독·매출" 미납 안내 발송 — 격리막(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ **폼이 아니라 직접 호출한다.** "안내 발송" 버튼을 누르면 바로 이 액션을 실행하고,
 *    끝나면 결과를 `SuccessDialog`로 보여준다(`owner/billing/checkout`의 결제 흐름과 같은
 *    패턴 — 확인 Dialog 없이 액션 → 완료 안내). `redirect`도 `revalidatePath`도 필요 없다 —
 *    화면·데이터 어느 것도 안 바뀌고 그냥 메일 한 통을 보내는 조작이다.
 * ⚠️ 지금은 목이라 **실제로 메일이 나가지 않는다** — 성공만 흉내 낸다(§정직성).
 */
export async function sendUnpaidNoticeAction(
  companyId: string,
): Promise<{ success: boolean; ownerEmail?: string }> {
  const company = findMockCompany(companyId);
  if (!company) return { success: false };

  return { success: true, ownerEmail: company.ownerEmail };
}

/**
 * "시스템 모니터링" 실패 건 재처리 — 격리막(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ **폼이 아니라 직접 호출한다.** 실패 행의 "재처리" 버튼을 누르면 이 액션을 실행하고
 *    결과를 그 자리에서 "완료"로 바꿔 보여준다(구독·매출 "안내 발송"과 같은 패턴).
 *    `redirect`도 `revalidatePath`도 필요 없다 — 잡 하나를 큐에 다시 넣을 뿐이다.
 * ⚠️ 지금은 목이라 **실제로 재처리가 돌지 않는다** — 성공만 흉내 낸다(§정직성).
 */
export async function retryPipelineAction(meetingId: string): Promise<{ success: boolean }> {
  return { success: findMockFailedItem(meetingId) !== null };
}

/**
 * "공지 관리" 공지 발행 — 격리막(CLAUDE.md §Mock 격리막).
 *
 * ⚠️ 제목·내용이 비면 발행 버튼 자체가 눌리지 않지만(클라이언트 가드), 서버에서도 한 번 더
 *    막는다 — 화면 가드는 UX일 뿐 검증이 아니다(CLAUDE.md §권한: 검증은 서버에서).
 * ⚠️ 지금은 목이라 **실제로 공지가 나가지 않는다** — 성공만 흉내 낸다(§정직성).
 */
export async function publishNoticeAction(input: {
  title: string;
  content: string;
  target: NoticeTarget;
  /** target이 "특정 기업"일 때 고른 기업 id들 */
  companyIds?: string[];
}): Promise<{ success: boolean }> {
  if (!input.title.trim() || !input.content.trim()) return { success: false };
  // 특정 기업 대상인데 고른 곳이 없으면 발송 대상이 없다 — 화면 가드와 별개로 서버에서도 막는다.
  if (input.target === NOTICE_TARGET.SPECIFIC && (input.companyIds?.length ?? 0) === 0) {
    return { success: false };
  }

  return { success: true };
}
