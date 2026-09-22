import type { Metadata } from "next";

import { NoticeComposeCard } from "@/features/system/components/notice-compose-card";
import { NoticeHistoryCard } from "@/features/system/components/notice-history-card";
import { getNoticeHistory, getNoticeTargetCompanies } from "@/features/system/server";

export const metadata: Metadata = {
  title: "공지 관리",
};

export default async function SystemNoticePage() {
  const [history, companies] = await Promise.all([getNoticeHistory(), getNoticeTargetCompanies()]);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-7">
        <NoticeComposeCard companies={companies} />
        <NoticeHistoryCard items={history} />
      </div>
    </main>
  );
}
