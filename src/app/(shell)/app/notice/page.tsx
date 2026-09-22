import type { Metadata } from "next";
import { Suspense } from "react";

import { FlashToast } from "@/components/common/flash-toast";
import { NoticeCreateDialog } from "@/features/notice/components/notice-create-dialog";
import { NoticeList } from "@/features/notice/components/notice-list";
import { getNotices } from "@/features/notice/server";
import { getViewer } from "@/features/shell/viewer";
import { getMockActor } from "@/lib/mock-actor";
import { canManageNotice } from "@/lib/permission";
import { isMock } from "@/mocks/config";

export const metadata: Metadata = {
  title: "공지",
};

export default async function AppNoticePage() {
  const notices = await getNotices();
  // 작성 권한이 있을 때만 "새 공지"를 보인다 — 서버 재검사는 createNoticeAction이 다시 한다(§권한).
  const actor = isMock ? getMockActor() : await getViewer();
  const canManage = canManageNotice(actor);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
      {/* 삭제 뒤 넘어온 화면에서 "삭제했습니다"를 대신 말한다(§토스트 · `FlashToast`) */}
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
        <NoticeList notices={notices} action={canManage ? <NoticeCreateDialog /> : null} />
      </div>
    </main>
  );
}
