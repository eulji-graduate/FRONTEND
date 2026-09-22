import type { Metadata } from "next";

import { ApprovalDetailDialog } from "@/features/system/components/approval-detail-dialog";
import { ApprovalList } from "@/features/system/components/approval-list";
import { getPendingApprovalById, getPendingApprovals } from "@/features/system/server";

export const metadata: Metadata = {
  title: "기업 가입 승인",
};

const PAGE_SIZE = 10;

const LIST_PATH = "/system/approval";

interface SystemApprovalPageProps {
  /** `?id=`가 있으면 그 신청서 상세가 모달로 뜬다(`companies/page.tsx`와 같은 방식) */
  searchParams: Promise<{ id?: string }>;
}

export default async function SystemApprovalPage({ searchParams }: SystemApprovalPageProps) {
  const params = await searchParams;

  const [{ items, page, totalPages, totalCount }, selected] = await Promise.all([
    getPendingApprovals(0, PAGE_SIZE),
    // 없는 id로 들어와도 404를 내지 않는다 — 상세가 안 뜰 뿐 목록은 그대로 보여야 한다
    params.id ? getPendingApprovalById(params.id) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7">
        <ApprovalList
          initialItems={items}
          initialPage={page}
          initialTotalPages={totalPages}
          initialTotalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </div>

      <ApprovalDetailDialog company={selected} closeHref={LIST_PATH} />
    </main>
  );
}
