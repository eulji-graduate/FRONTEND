"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { MeetingTopicInput } from "@/features/rooms/types";

import {
  createOnlineMeetingAction,
  getOnlineMeetingRecordingUploadUrlAction,
  type OnlineMeetingFormState,
} from "../actions";
import { contentTypeOf, validateRecordingFile } from "../recording-file";

const EMPTY_TOPIC: MeetingTopicInput = { main: "", sub: "" };

const EMPTY_FORM = {
  title: "",
  projectId: "",
  topics: [EMPTY_TOPIC] as MeetingTopicInput[],
  attendeeIds: [] as number[],
  /** Select 값은 문자열이라 여기서도 문자열로 든다 — `useRoomReservationForm`과 같은 관례. */
  parentTeamActionId: "",
};

export type OnlineMeetingFormValues = typeof EMPTY_FORM;

interface UseOnlineMeetingFormOptions {
  /**
   * 세 단계가 전부 끝나 회의가 만들어지면 다이얼로그를 닫으라고 알린다.
   *
   * ⚠️ **방금 만든 회의의 id·제목을 같이 준다.** 비대면 회의는 등록되는 순간 서버가 전체
   *    파일 STT·AI 분석을 곧장 시작한다(`MeetingService.createOnlineMeeting` 주석) — 실시간
   *    캡처 종료(`capture-view.tsx`의 `trackAnalysis`)와 똑같이, 등록 직후부터 진행 상황을
   *    쫓아야 검토 화면으로 갈 길이 생긴다. 값이 없으면 그 카드를 못 띄운다.
   */
  onCreated: (meetingId: string, title: string) => void;
}

/**
 * 비대면 회의 만들기 — 단일 모달, 등록 한 번(이슈 #473, 2026-08-14 계약 변경으로 2단계
 * 다이얼로그를 접었다). [등록]을 누르면 순서대로
 *   1) `getOnlineMeetingRecordingUploadUrlAction` — presigned 업로드 URL 발급
 *   2) 브라우저 `fetch`로 그 URL에 파일을 직접 PUT(BE 서버를 안 거친다)
 *   3) `createOnlineMeetingAction` — 회의 생성(녹음 정보 포함)
 * 을 부른다.
 * ⚠️ **`useActionState`를 안 쓴다.** 2단계가 브라우저에서 외부 호스트(S3)로 가는 `fetch`라
 *    한 번의 폼 제출로 표현이 안 된다(`project`의 첨부파일 업로드 훅과 같은 이유) — 로컬
 *    상태로 세 단계를 순서대로 부르고, 하나라도 실패하면 다음 단계로 넘어가지 않은 채
 *    입력값·선택한 파일을 그대로 두고 오류만 보여준다.
 */
export function useOnlineMeetingForm({ onCreated }: UseOnlineMeetingFormOptions) {
  const [form, setForm] = useState<OnlineMeetingFormValues>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errors, setErrors] = useState<OnlineMeetingFormState["errors"]>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(nextFile: File | null) {
    if (!nextFile) {
      setFile(null);
      setFileError(null);
      return;
    }
    const validationError = validateRecordingFile(nextFile);
    if (validationError) {
      setFile(null);
      setFileError(validationError);
      return;
    }
    setFile(nextFile);
    setFileError(null);
    setErrors((prev) => ({ ...prev, recording: undefined }));
  }

  /**
   * ⚠️ **`FormData`를 맨 먼저 스냅샷 뜬다.** 그 뒤로 여러 번의 `await`(발급·S3 PUT·생성)를
   *    거치는데, 그사이 사용자가 입력을 더 고치면 `formElement`를 나중에 다시 읽었을 때
   *    값이 어긋난다.
   * ⚠️ **파일이 없어도 3단계까지 그대로 진행한다.** 업로드 URL 발급·S3 PUT만 건너뛰고
   *    `createOnlineMeetingAction`을 그대로 부른다 — `validateOnlineMeetingDraft`(서버·클라
   *    공용 규칙 한 곳)가 `recording` 없음을 다른 필드 오류와 **한 번에** 돌려준다. 여기서
   *    미리 막아 버리면 파일만 없을 때 제목·프로젝트 오류를 못 보고 한 번에 하나씩만 고치게 된다.
   */
  async function handleSubmit(formElement: HTMLFormElement) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrors({});
    setFileError(null);

    const formData = new FormData(formElement);

    if (file) {
      const contentType = contentTypeOf(file.name);
      const issued = await getOnlineMeetingRecordingUploadUrlAction({
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
      });
      if (!issued.ok) {
        setFileError(issued.message);
        setIsSubmitting(false);
        return;
      }

      if (issued.presignedUrl) {
        try {
          const response = await fetch(issued.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": issued.contentType },
            body: file,
          });
          if (!response.ok) {
            setFileError(
              `파일 업로드에 실패했습니다 (HTTP ${response.status}) — 다시 시도해 주세요`,
            );
            setIsSubmitting(false);
            return;
          }
        } catch {
          setFileError("파일 업로드 중 연결이 끊겼습니다 — 다시 시도해 주세요");
          setIsSubmitting(false);
          return;
        }
      }

      formData.set("recordingS3Key", issued.s3Key);
      /*
        ⚠️ **원본 이름(`file.name`)이 아니라 발급 응답의 저장용 이름이다.** BE 확정 단계가
           `s3Key.endsWith("/" + fileName)`을 검사한다(`OnlineMeetingRecordingAdapter.java`) —
           원본을 그대로 보내면 한글·공백·괄호가 든 파일명이 전부 400 CAP-015로 튕긴다.
           화면에 보여주는 이름은 `file.name` 그대로다(이 훅의 `file` 상태).
      */
      formData.set("recordingFileName", issued.storageFileName);
      formData.set("recordingContentType", issued.contentType);
      formData.set("recordingSizeBytes", String(file.size));
    }

    const result = await createOnlineMeetingAction({ errors: {} }, formData);
    setIsSubmitting(false);

    if (Object.keys(result.errors).length > 0) {
      setErrors(result.errors);
      if (result.errors.recording) setFileError(result.errors.recording);
      return;
    }

    toast.success("비대면 회의를 등록했습니다");
    // ⚠️ 성공 응답엔 항상 `created`가 실린다(`errors`가 비었을 때만 여기 온다) — 없으면 계약 위반이다.
    if (result.created) onCreated(result.created.id, form.title);
  }

  return {
    form,
    setForm,
    file,
    fileError,
    errors,
    isSubmitting,
    handleFileChange,
    handleSubmit,
  };
}
