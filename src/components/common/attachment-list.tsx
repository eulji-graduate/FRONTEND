"use client";

import { Paperclip } from "lucide-react";
import { toast } from "sonner";

export interface AttachmentListItem {
  id: number;
  fileName: string;
}

interface AttachmentListProps {
  attachments: AttachmentListItem[];
  /** 클릭한 첨부파일 id로 다운로드 URL을 발급받는다 — 부르는 쪽이 어느 리소스(프로젝트·팀 액션)인지 안다. */
  fetchDownloadUrl: (attachmentId: number) => Promise<string | null>;
}

/**
 * 첨부파일 목록 — 클릭하면 그 자리에서 다운로드 URL을 발급받아 새 탭으로 연다.
 * 프로젝트 상세·팀 액션 상세가 같은 모양을 쓴다(도메인마다 발급 엔드포인트만 다르다).
 * ⚠️ **미리 발급받아 두지 않는다**(5분 만료, 2026-08-10 연동 가이드) — 클릭한 시점에만 부른다.
 * ⚠️ mock 단계는 발급할 실제 파일이 없어 액션이 `null`을 돌려준다 — 그러면 조용히 실패하는
 *    대신 "아직 연동되지 않았다"고 알린다(handover-approval-card.tsx의 PDF 스텁과 같은 패턴).
 */
export function AttachmentList({ attachments, fetchDownloadUrl }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  async function handleClick(attachmentId: number) {
    const url = await fetchDownloadUrl(attachmentId);
    if (!url) {
      toast("다운로드는 아직 연동되지 않았습니다");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-1.5">
      {attachments.map((attachment) => (
        <button
          key={attachment.id}
          type="button"
          onClick={() => handleClick(attachment.id)}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-[13px] leading-5 underline-offset-2 hover:underline"
        >
          <Paperclip className="size-3.5" aria-hidden />
          {attachment.fileName}
        </button>
      ))}
    </div>
  );
}
