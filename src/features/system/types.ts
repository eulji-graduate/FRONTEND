import type {
  CompanySize,
  CompanySort,
  CompanyStatus,
  NoticeTarget,
  PaymentStatus,
  PipelineStage,
} from "@/constants/domain";

/** 대시보드 상단 통계 4종. */
export interface DashboardSummary {
  companyCount: number;
  /** 이번 달 신규 가입 기업 수 */
  companyCountDeltaThisMonth: number;
  activeUserCount: number;
  /** 전월 대비 증감률(%) */
  activeUserDeltaPercent: number;
  /** 월 반복 매출(원) */
  mrr: number;
  pendingApprovalCount: number;
}

/** 월별 신규 가입 기업 수 — 막대그래프 한 칸. */
export interface MonthlySignup {
  /** 화면에 그대로 나가는 월 라벨("2월" 등) */
  month: string;
  count: number;
}

/** 최근 가입 기업 한 행. */
export interface RecentCompany {
  id: string;
  name: string;
  /** 화면에 그대로 나가는 식별 코드(가입 승인 시 발급) */
  code: string;
  memberCount: number;
  /** "YYYY-MM-DD" — 관리자 화면 표기라 일반 화면의 "8월 5일(화)" 형식을 따르지 않는다 */
  joinedAt: string;
}

/** 대시보드 화면 하나가 필요로 하는 데이터 전부 — 격리막의 UI 계약. */
export interface DashboardOverview {
  summary: DashboardSummary;
  monthlySignups: MonthlySignup[];
  recentCompanies: RecentCompany[];
  /** 곁 컬럼의 "처리 큐" 카드 — 시스템 모니터링과 같은 값을 요약해서 쓴다 */
  pipelineQueue: PipelineQueueSummary;
}

/** 기업 가입 승인 대기 신청서 한 건. */
export interface PendingCompanyApproval {
  id: string;
  companyName: string;
  businessRegistrationNumber: string;
  representativeName: string;
  contactEmail: string;
  /** 신청 시 밝힌 구성원 수 */
  memberCount: number;
  /** "YYYY-MM-DD" */
  appliedAt: string;
}

/** "기업 관리" 목록·상세가 함께 쓰는 한 기업. */
export interface ManagedCompany {
  id: string;
  name: string;
  /** 화면에 그대로 나가는 식별 코드(가입 승인 시 발급) — 검색 대상이기도 하다 */
  code: string;
  size: CompanySize;
  memberCount: number;
  /** 이번 달 회의 횟수 */
  meetingCountThisMonth: number;
  status: CompanyStatus;
  /** "YYYY-MM-DD" */
  joinedAt: string;
  ownerEmail: string;
}

/**
 * "기업 관리" 목록 검색 조건 — 전부 선택값이라 없으면 전체를 대상으로 한다.
 * ⚠️ `server.ts`(`server-only`)가 아니라 여기(UI 계약)에 둔다 — 클라이언트 컴포넌트
 *    (`company-list.tsx`)가 prop 타입으로 그대로 써야 해서, server-only 모듈에 기대면 안 된다.
 */
export interface CompanyListFilter {
  /** 기업명 또는 코드 부분 일치(대소문자 무시) */
  keyword?: string;
  status?: CompanyStatus;
  /** 정렬 기준 — 없으면 최신 가입순 */
  sort?: CompanySort;
}

/** 구독·매출 상단 통계 4종. */
export interface BillingSummary {
  /** 이번 달 월 반복 매출(원) */
  mrr: number;
  /** 전월 대비 증감률(%) */
  mrrDeltaPercent: number;
  /** 결제 완료 건수 */
  paidCount: number;
  /** 결제 완료 건 합계(원) — 통계 카드의 보조 문구용 */
  paidAmount: number;
  unpaidCount: number;
  /** 이번 달 해지 건수 */
  canceledCountThisMonth: number;
}

/** 월별 MRR 추이 — 막대그래프 한 칸. */
export interface MonthlyMrr {
  /** 화면에 그대로 나가는 월 라벨("2월" 등) */
  month: string;
  amount: number;
}

/** 구독·매출 목록 한 행. */
export interface SubscriptionRecord {
  companyId: string;
  companyName: string;
  memberCount: number;
  /** 이번 결제 금액(원) */
  amount: number;
  /**
   * "YYYY-MM-DD" | null — 아직 첫 결제가 안 잡힌 기업은 `null`이다.
   * ⚠️ 한때 "Free 플랜은 결제일이 없다"였는데, 무료 요금제 자체가 없다(CLAUDE.md §요금제).
   */
  billingDate: string | null;
  paymentStatus: PaymentStatus;
  /** 미납 기업에 안내 메일을 보낼 대상 — 승인 시 발급된 오너 이메일과 같다 */
  ownerEmail: string;
  /** 정렬 기준(최신 가입순 보충 표시용) — 화면에는 안 나간다 */
  joinedAt: string;
}

/** 구독·매출 화면 하나가 필요로 하는 데이터 전부 — 격리막의 UI 계약. */
export interface BillingOverview {
  summary: BillingSummary;
  monthlyMrr: MonthlyMrr[];
  /** 항상 5건 — 미납 우선, 모자라면 최신 가입순으로 채운다(화면 명세) */
  subscriptions: SubscriptionRecord[];
}

/** AI 파이프라인 처리 큐 요약 — 시스템 모니터링 상단 3종. */
export interface PipelineQueueSummary {
  /** 처리 예정(대기) 건수 */
  waitingCount: number;
  /** 처리 중 건수 */
  processingCount: number;
  /** 처리 중 건들의 평균 소요(초) — 카드 보조 문구용 */
  processingAvgSeconds: number;
  /** 재처리가 필요한 실패 건수 */
  failedCount: number;
}

/** 단계별 평균 소요 시간 — 가로 막대 한 칸. */
export interface StageTiming {
  stage: PipelineStage;
  /** 평균 소요(초) */
  avgSeconds: number;
}

/** 처리에 실패해 재처리가 필요한 회의 한 건. */
export interface FailedPipelineItem {
  /** 화면에 그대로 나가는 회의 ID("MTG-2025-0721-03") — 재처리 요청 식별자이기도 하다 */
  meetingId: string;
  companyName: string;
  /** 실패한 단계 */
  stage: PipelineStage;
  /** "YYYY-MM-DD HH:mm" — 운영자 화면 표기 */
  failedAt: string;
  /** 실패 원인 한 줄("타임아웃 (30s)") */
  errorMessage: string;
}

/** 시스템 모니터링 화면 하나가 필요로 하는 데이터 전부 — 격리막의 UI 계약. */
export interface MonitoringOverview {
  queue: PipelineQueueSummary;
  stageTimings: StageTiming[];
  /** 실패 목록 — 재처리 필요분(화면 명세: 최신 실패순) */
  failedItems: FailedPipelineItem[];
}

/** 공지 "특정 기업" 대상 검색에 쓰는 가벼운 기업 항목 — 이름·코드로 검색해 고른다. */
export interface NoticeTargetCompany {
  id: string;
  name: string;
  /** 화면에 그대로 나가는 식별 코드 — 검색 대상이기도 하다 */
  code: string;
}

/** 발행된 공지 한 건 — "발행 이력" 목록 한 행. */
export interface NoticeHistoryItem {
  id: string;
  title: string;
  target: NoticeTarget;
  /** "YYYY-MM-DD" — 운영자 화면 표기 */
  sentAt: string;
  /** 실제로 발송된 기업 수 */
  recipientCompanyCount: number;
}
