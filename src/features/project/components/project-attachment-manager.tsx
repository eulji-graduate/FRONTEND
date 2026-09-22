"use client";

import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";

import { deleteProjectAttachmentAction, getProjectAttachmentDownloadUrlAction } from "../actions";
import type { ProjectAttachment } from "../types";
import { useAttachmentUpload } from "../use-attachment-upload";

interface ProjectAttachmentManagerProps {
  projectId: number;
  attachments: ProjectAttachment[];
  /**
   * OWNER만 true — 그 외엔 조회·다운로드만(`canEditProjectPlan`, WORKFLOW.md §1
   * "수정·첨부파일 교체는 Owner만"). 화면 숨김은 UX일 뿐이라 서버 액션에서도 다시 검사한다.
   */
  canEdit: boolean;
}

/**
 * 프로젝트 기획 탭의 첨부파일 — 조회(전 구성원)는 그대로, **교체(삭제 + 새로 올리기)만
 * Owner에게 연다**(FE 감사 항목 #11).
 *
 * ⚠️ **BE에 "교체" API가 없다.** 있는 건 업로드(발급→확정)·삭제 둘뿐이라 교체는 이 화면이
 *    두 동작을 이어 붙인 것이다 — 삭제가 실패하면 새로 올리는 시도로 넘어가지 않는다.
 * ⚠️ 삭제는 **되돌릴 수 없다** — `ConfirmDialog`(파괴적 확인)를 반드시 거친다(§파괴적 작업 확인).
 */
export function ProjectAttachmentManager({
  projectId,
  attachments,
  canEdit,
}: ProjectAttachmentManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectAttachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { phase: uploadPhase, upload } = useAttachmentUpload(() => router.refresh());
  const isUploading = uploadPhase.kind === "uploading";

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    /*
      ⚠️ **`finally`에서 푼다**(CodeRabbit 지적). 서버 액션 호출 자체가 거절되면(세션 만료 등)
         `isDeleting`을 못 풀고 다이얼로그가 영원히 "삭제 중"에 갇힌다.
    */
    try {
      const result = await deleteProjectAttachmentAction(projectId, pendingDelete.id);
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }

      setPendingDelete(null);
      router.refresh();
    } catch {
      setDeleteError("첨부파일을 지우지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // 같은 파일을 다시 골라도 change가 뜨게 비운다
    if (!file) return;
    void upload(projectId, file);
  }

  if (!canEdit) {
    return <ReadOnlyAttachmentList projectId={projectId} attachments={attachments} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2">
              <DownloadLink projectId={projectId} attachment={attachment} />
              <button
                type="button"
                onClick={() => setPendingDelete(attachment)}
                aria-label={`${attachment.fileName} 삭제`}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={handlePickFile}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            올리는 중
          </>
        ) : (
          "첨부파일 추가"
        )}
      </Button>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDelete(null);
            setDeleteError(null);
          }
        }}
        title="첨부파일을 지울까요?"
        description={
          <>
            <strong className="text-foreground">{pendingDelete?.fileName}</strong> 파일이 사라지고
            되돌릴 수 없습니다.
          </>
        }
        confirmLabel="삭제"
        isDestructive
        isPending={isDeleting}
        pendingLabel="삭제 중"
        error={deleteError}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/** Owner가 아닐 때 — 다운로드만 되는 목록. 삭제·추가 UI가 없다. */
function ReadOnlyAttachmentList({
  projectId,
  attachments,
}: {
  projectId: number;
  attachments: ProjectAttachment[];
}) {
  if (attachments.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <DownloadLink projectId={projectId} attachment={attachment} />
        </li>
      ))}
    </ul>
  );
}

function DownloadLink({
  projectId,
  attachment,
}: {
  projectId: number;
  attachment: ProjectAttachment;
}) {
  async function handleClick() {
    /*
      ⚠️ **클릭의 동기 구간에서 먼저 연다**(CodeRabbit 지적). URL 발급은 서버를 한 번 더
         타는 비동기 작업이라, `await` 뒤에 `window.open`을 부르면 사용자 동작(user gesture)
         유효 구간을 벗어나 팝업 차단에 걸릴 수 있다 — 빈 창을 먼저 띄워 자리를 잡고,
         URL이 오면 그 창을 옮긴다. `noopener`는 여기서 못 쓴다(그러면 참조가 `null`이라
         옮길 수 없다) — 대신 연 뒤 바로 `opener`를 끊어 같은 효과를 낸다.
    */
    const popup = window.open("", "_blank");
    if (popup) popup.opener = null;

    const url = await getProjectAttachmentDownloadUrlAction(projectId, attachment.id);
    if (!url) {
      popup?.close();
      toast("다운로드는 아직 연동되지 않았습니다");
      return;
    }
    if (popup) popup.location.href = url;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-[13px] leading-5 underline-offset-2 hover:underline"
    >
      <Paperclip className="size-3.5" aria-hidden />
      {attachment.fileName}
    </button>
  );
}
