"use client";

import { useCallback, useRef, useState } from "react";

import { confirmProjectAttachmentAction, issueProjectAttachmentUploadUrlAction } from "./actions";

/**
 * 업로드 진행 상태 — 화면이 이 넷만 보고 그린다.
 * ⚠️ `failed`에는 문장이 **반드시** 실린다 — 조용히 멈추면 파일이 사라진 것처럼 보인다(§정직성).
 */
export type AttachmentUploadPhase =
  { kind: "idle" } | { kind: "uploading" } | { kind: "done" } | { kind: "failed"; message: string };

/**
 * 프로젝트 첨부 업로드 3단계를 도는 훅 — 발급(서버 액션) → **브라우저가 S3에 직접 PUT** →
 * 확정(서버 액션). 로직은 컴포넌트에 안 둔다(§폴더·네이밍: 로직=커스텀훅).
 *
 * ⚠️ **PUT은 브라우저에서 한다.** BE는 바이너리를 안 받고(§핵심 4원칙 ②의 예외가 아니라
 *    설계다 — [확인] BE `ProjectAttachmentController` 주석 "BE는 바이너리를 받지 않는다"),
 *    presigned URL은 서명 자체가 인증이라 우리 토큰이 브라우저로 나갈 일도 없다.
 * ⚠️ **헤더를 손대지 않는다.** presign 서명에 Content-Type이 안 들어 있어([확인] BE
 *    `ProjectAttachmentS3StorageAdapter.issueUploadUrl` — `PutObjectRequest`가 bucket·key뿐)
 *    브라우저가 파일 타입으로 알아서 채우는 값이 그대로 통과한다. 굳이 세팅하면
 *    서명 규약이 바뀌는 날 여기가 먼저 깨진다.
 * ⚠️ **재시도가 파일을 두 벌로 만들지 않는다**(2026-08-13 고침). 확정은 같은 `fileUrl`이면
 *    기존 레코드를 돌려주지만(idempotent — [확인] BE `ProjectAttachmentService.confirm`),
 *    발급을 다시 하면 **새 키(UUID)**를 받아 그 멱등성이 안 걸린다 — PUT까지 성공하고 확정만
 *    실패한 뒤 [다시 시도]를 누르면 같은 파일이 첨부 목록에 두 번 남았다. 그래서 **올라간
 *    티켓을 기억했다가 그때는 확정만 다시 부른다.**
 */
export function useAttachmentUpload(onDone: () => void) {
  const [phase, setPhase] = useState<AttachmentUploadPhase>({ kind: "idle" });
  /*
    ⚠️ **S3에 이미 올라간 파일의 자리**(위 재시도 주석). 여기 값이 있으면 그 파일은 저장소에
       들어가 있고 확정만 남은 상태다 — 재시도는 발급·PUT을 건너뛰고 확정만 다시 부른다.
       그래야 BE의 `fileUrl` 멱등성이 실제로 걸린다.
  */
  const uploadedRef = useRef<{ projectId: number; fileUrl: string } | null>(null);

  const upload = useCallback(
    async (projectId: number, file: File) => {
      setPhase({ kind: "uploading" });

      /*
        ⚠️ **전부 감싼다**(2026-08-13 고침). 전에는 서버 액션이 값으로 실패하는 경우만 봤는데,
           호출 자체가 거절되면(전송 계층 오류·액션 안에서 던진 예외) 아무도 안 잡아
           **"올리는 중…"에서 영영 멈췄다** — 실패도 재시도도 없는 화면이 남는다(§정직성).
      */
      try {
        let ticket = uploadedRef.current?.projectId === projectId ? uploadedRef.current : null;

        if (!ticket) {
          const issued = await issueProjectAttachmentUploadUrlAction(
            projectId,
            file.name,
            file.size,
          );
          if (!issued.ok) {
            setPhase({ kind: "failed", message: issued.message });
            return;
          }

          // `uploadUrl`이 없으면 목 단계 — PUT을 건너뛰고 확정으로 간다(UI 계약 `AttachmentUploadTicket`).
          if (issued.ticket.uploadUrl) {
            const response = await fetch(issued.ticket.uploadUrl, { method: "PUT", body: file });
            if (!response.ok) {
              // S3 오류 본문은 XML이라 사람에게 못 보여준다 — 상태 코드만 단서로 남긴다.
              setPhase({
                kind: "failed",
                message: `저장소가 업로드를 거부했습니다 (HTTP ${response.status}). 다시 시도해 주세요.`,
              });
              return;
            }
          }

          /* 여기서부터 파일은 저장소에 있다 — 재시도가 새 키를 받지 않게 적어 둔다 */
          ticket = { projectId, fileUrl: issued.ticket.fileUrl };
          uploadedRef.current = ticket;
        }

        const confirmed = await confirmProjectAttachmentAction(projectId, {
          fileName: file.name,
          fileUrl: ticket.fileUrl,
          fileSize: file.size,
        });
        if (!confirmed.ok) {
          setPhase({ kind: "failed", message: confirmed.message });
          return;
        }

        uploadedRef.current = null;
        setPhase({ kind: "done" });
        onDone();
      } catch {
        setPhase({
          kind: "failed",
          message: "업로드 중 연결이 끊겼습니다. 네트워크를 확인하고 다시 시도해 주세요.",
        });
      }
    },
    [onDone],
  );

  return { phase, upload };
}
