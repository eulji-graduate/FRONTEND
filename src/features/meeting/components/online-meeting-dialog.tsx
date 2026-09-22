"use client";

import { Paperclip, Video, X } from "lucide-react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FieldError } from "@/components/common/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNotificationCenter } from "@/features/notification/notification-provider";
import type { AttendeeScopeViewer } from "@/features/rooms/attendee-scope";
import { RoomAttendeePicker } from "@/features/rooms/components/room-attendee-picker";
import type { RoomMember, RoomProjectOption, RoomTeamActionOption } from "@/features/rooms/types";

import { RECORDING_FILE_ACCEPTED_EXTENSIONS } from "../recording-file";
import { OnlineMeetingFields } from "./online-meeting-fields";
import { useOnlineMeetingForm } from "./use-online-meeting-form";

/** 파일 피커의 `accept` 속성 — 확장자 앞에 점을 붙인다. 실제 차단은 `validateRecordingFile`이 한다. */
const RECORDING_FILE_ACCEPT = RECORDING_FILE_ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

interface OnlineMeetingDialogProps {
  members: RoomMember[];
  projects: RoomProjectOption[];
  showParentTeamAction: boolean;
  teamActions: RoomTeamActionOption[];
  viewer: AttendeeScopeViewer;
  /** 트리거 버튼에 얹을 클래스 — 회의실 패널(280px)에서는 폭을 꽉 채운다(`room-list-panel.tsx`). */
  triggerClassName?: string;
}

/**
 * 비대면 회의 만들기 — `/app/rooms` 회의실 패널의 진입점(이슈 #473). **단일 모달**이다
 * (2026-08-14 계약 변경 — 이전엔 회의 생성 뒤 별도 2단계에서 녹음 파일을 붙였지만, MEET-18이
 * 녹음 정보를 요청 본문에 직접 받도록 바뀌면서 그 구분이 사라졌다).
 *
 * [등록]을 한 번 누르면 `useOnlineMeetingForm`이 순서대로
 *   1) presigned 업로드 URL 발급 → 2) 브라우저에서 S3로 직접 PUT → 3) 회의 생성(MEET-18)
 * 을 처리한다. 셋 중 하나라도 실패하면 다음 단계로 넘어가지 않고, 입력값·선택한 파일을
 * 그대로 둔 채 오류만 보여준다(팀 명세: "실패 시 입력값과 선택한 파일을 유지").
 * ⚠️ **201이 오기 전까지 창을 닫지 않는다** — `isSubmitting` 동안 Esc·바깥 클릭·닫기 버튼을
 *    전부 막는다(`RoomReservationDialog`와 같은 이유, 요청은 계속 가는데 창만 사라지면 결과를
 *    못 본다).
 */
export function OnlineMeetingDialog({
  members,
  projects,
  showParentTeamAction,
  teamActions,
  viewer,
  triggerClassName,
}: OnlineMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmedSubmitRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { trackAnalysis } = useNotificationCenter();

  /*
    ⚠️ **등록 직후부터 진행 카드를 띄운다.** 비대면 회의는 등록되는 순간 서버가 전체 파일
       STT·AI 분석을 곧장 시작한다(`MeetingService.createOnlineMeeting` 주석) — 실시간
       캡처 종료(`capture-view.tsx`)와 같은 이유로, 여기서도 안 쫓으면 회의를 만들고도
       검토 화면으로 갈 길이 안 생긴다.
  */
  const { form, setForm, file, fileError, errors, isSubmitting, handleFileChange, handleSubmit } =
    useOnlineMeetingForm({
      onCreated: (meetingId, title) => {
        trackAnalysis(meetingId, title);
        setOpen(false);
      },
    });

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmedSubmitRef.current) {
      confirmedSubmitRef.current = false;
      void handleSubmit(event.currentTarget);
      return;
    }
    setShowConfirm(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return;
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" className={triggerClassName} />}
      >
        <Video aria-hidden />
        비대면 회의
      </DialogTrigger>

      {/*
        ⚠️ **닫기(X) 버튼을 헤더 안에 직접 그린다.** `DialogContent`의 기본 닫기 버튼은
           `p-4` 여백을 전제로 `top-2 right-2`에 절대 위치한다 — 이 다이얼로그는 `p-0`을 쓰고
           헤더가 직접 여백(`px-6 py-4`)을 잡아서, 기본값을 그대로 쓰면 버튼이 모서리 밖으로
           걸쳐 뜬다. `showCloseButton={false}`로 끄고 헤더 여백 안에 자연스럽게 배치한다.
      */}
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[720px]" showCloseButton={false}>
        <DialogHeader className="border-border flex-row items-center justify-between border-b px-6 py-4">
          <DialogTitle>비대면 회의 만들기</DialogTitle>
          <DialogClose
            disabled={isSubmitting}
            render={<Button type="button" variant="ghost" size="icon-sm" />}
          >
            <X aria-hidden />
            <span className="sr-only">닫기</span>
          </DialogClose>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleFormSubmit}>
          <input type="hidden" name="projectId" value={form.projectId} />
          <input type="hidden" name="parentTeamActionId" value={form.parentTeamActionId} />

          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_260px]">
              <OnlineMeetingFields
                form={form}
                setForm={setForm}
                errors={errors}
                projects={projects}
                showParentTeamAction={showParentTeamAction}
                teamActions={teamActions}
              />

              <div className="flex flex-col gap-4">
                <RoomAttendeePicker
                  members={members}
                  selectedIds={form.attendeeIds}
                  onChange={(attendeeIds) => setForm((prev) => ({ ...prev, attendeeIds }))}
                  viewer={viewer}
                />
                <FieldError reserveSpace message={errors.attendeeIds} />

                {/*
                  ⚠️ **왼쪽 열의 [+ 주제 추가]와 같은 높이로 붙인다** — 참석자 블록이 짧게 끝나면
                     생기는 빈 자리를 `mt-auto`로 채워 이 블록을 오른쪽 열 맨 아래로 민다.
                */}
                <div className="mt-auto flex flex-col gap-1.5">
                  <span
                    id="online-meeting-recording-label"
                    className="text-[13px] leading-5 font-medium"
                  >
                    녹음 파일 첨부
                  </span>
                  {/* ⚠️ 바이너리는 hidden input에 안 싣는다 — 등록 시 `handleSubmit`이 S3로 직접 올린다. */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={RECORDING_FILE_ACCEPT}
                    className="hidden"
                    disabled={isSubmitting}
                    onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-0 flex-1 justify-start"
                      aria-labelledby="online-meeting-recording-label online-meeting-recording-filename"
                      disabled={isSubmitting}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip aria-hidden />
                      {/*
                        ⚠️ **`aria-labelledby`는 버튼의 시각적 자식을 완전히 대신한다** — 스크린리더는
                           여기 참조된 요소들의 글만 읽고 버튼 안의 다른 텍스트는 안 읽는다. 그래서 고른
                           파일명이 접근성 이름에 들어가려면 이 span도 `id`로 같이 참조돼야 한다.
                      */}
                      <span id="online-meeting-recording-filename" className="truncate">
                        {file?.name ?? "선택된 파일 없음"}
                      </span>
                    </Button>
                    {file && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="녹음 파일 선택 해제"
                        disabled={isSubmitting}
                        onClick={() => {
                          handleFileChange(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X aria-hidden />
                      </Button>
                    )}
                  </div>
                  <FieldError reserveSpace message={fileError ?? errors.recording} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-border flex items-center justify-end gap-4 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button type="submit" variant="ink" disabled={isSubmitting}>
              {isSubmitting ? "등록 중" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <ConfirmDialog
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        title="이대로 등록하시겠습니까?"
        description="등록하면 곧바로 회의가 완료 처리됩니다."
        confirmLabel="등록"
        onConfirm={() => {
          setShowConfirm(false);
          confirmedSubmitRef.current = true;
          formRef.current?.requestSubmit();
        }}
      />
    </Dialog>
  );
}
