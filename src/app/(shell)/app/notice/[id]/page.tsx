import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NoticeCreateDialog } from "@/features/notice/components/notice-create-dialog";
import { NoticeDetail } from "@/features/notice/components/notice-detail";
import { NoticeList } from "@/features/notice/components/notice-list";
import { getNoticeById, getNotices } from "@/features/notice/server";
import { getViewer } from "@/features/shell/viewer";
import { getMockActor } from "@/lib/mock-actor";
import { canManageNotice } from "@/lib/permission";
import { isMock } from "@/mocks/config";

interface AppNoticeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AppNoticeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const notice = await getNoticeById(id);
  return { title: notice?.title ?? "공지" };
}

export default async function AppNoticeDetailPage({ params }: AppNoticeDetailPageProps) {
  const { id } = await params;
  const [notice, notices] = await Promise.all([getNoticeById(id), getNotices()]);

  // 없는 공지 id로 들어오면 404 — 링크로 닿는 화면이라 조용히 빈 화면을 보이지 않는다(§정직성).
  if (!notice) notFound();

  const actor = isMock ? getMockActor() : await getViewer();
  const canManage = canManageNotice(actor);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      {/*
        ⚠️ 상세만 있으면 720px 글 카드 옆이 텅 빈다(DESIGN §1 "1440을 채우는가") — 왼쪽에
           목록을 곁들여 오갈 때 상세 화면에서 바로 다른 공지로 넘어갈 수 있게 한다.
           곁 컬럼 폭은 §1의 360px 고정 규칙을 그대로 따른다.
      */}
      <div className="mx-auto grid h-full w-full max-w-[1440px] grid-cols-1 grid-rows-[minmax(0,1fr)] gap-7 lg:grid-cols-[360px_minmax(0,1fr)]">
        <NoticeList
          notices={notices}
          activeId={notice.id}
          action={canManage ? <NoticeCreateDialog /> : null}
          className="min-h-[560px]"
        />
        <NoticeDetail notice={notice} canManage={canManage} />
      </div>
    </main>
  );
}
