"use client";

import { Check, Paperclip, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, CSSProperties } from "react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DatePickerField } from "@/components/common/date-picker-field";
import { FieldError } from "@/components/common/field-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FLASH_TOAST_PARAM } from "@/constants/flash-toast";
import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_TAG_MAX_LENGTH } from "@/constants/project";
import { paletteColorByName, TAG_NAME_LABEL, TAG_NAMES, type TagColorName } from "@/lib/palette";
import { cn } from "@/lib/utils";

import type { ProjectFormState } from "../actions";
import { useAttachmentUpload } from "../use-attachment-upload";
import { validateAttachmentFile } from "../validate";

interface TeamRow {
  /** React key용 — 팀명이 아니라 행 자체의 정체성(같은 팀을 지웠다 다시 골라도 행은 별개). */
  rowId: number;
  team: string;
}

interface ProjectFormProps {
  action: (prev: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  /** 참여 팀 드롭다운 선택지 — 회사 전체 팀 목록. */
  teamOptions: string[];
  cancelHref: string;
}

/** 대문자 A-Z가 아닌 문자를 전부 걷어낸다 — 소문자는 버리지 않고 대문자로 살린다. */
function toTagInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, PROJECT_TAG_MAX_LENGTH);
}

let nextRowId = 1;

/*
  ⚠️ 액션(`actions.ts`)의 `CREATED_PATH`와 같은 주소다 — 첨부가 있으면 `redirect` 대신
     화면이 업로드를 마치고 **여기서** 이동하므로, 도착 토스트 열쇠도 같은 것을 싣는다.
*/
const CREATED_HREF = `/app/projects?${FLASH_TOAST_PARAM}=PROJECT_CREATED`;

/**
 * 프로젝트 생성 폼.
 * ⚠️ 참여 팀은 **드롭다운 하나가 아니라 다중 지정**이다 — 프로젝트 하나에 여러 팀이 참여할 수 있어
 *    행을 늘려가며 고른다(팀당 한 행, 중복 선택 불가).
 * ⚠️ 태그 색상은 고정 팔레트(`lib/palette`)에서만 고른다 — 자유 HEX는 다크모드에 안 맞는다.
 */
export function ProjectForm({ action, teamOptions, cancelHref }: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(action, { errors: {} });

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tagColor, setTagColor] = useState<TagColorName>(TAG_NAMES[0]);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [teamRows, setTeamRows] = useState<TeamRow[]>([{ rowId: nextRowId++, team: "" }]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isSkipAttachmentConfirmOpen, setIsSkipAttachmentConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const goToList = useCallback(() => router.replace(CREATED_HREF), [router]);
  const { phase: uploadPhase, upload } = useAttachmentUpload(goToList);

  /*
    ⚠️ **첨부가 있으면 액션이 `redirect` 대신 만들어진 id를 되돌린다**(`ProjectFormState` 주석).
       그 id가 도착하는 순간 업로드 3단계(발급→브라우저 PUT→확정)를 **한 번만** 건다 —
       StrictMode의 이중 실행·리렌더에 또 걸리지 않게 ref로 잠근다. 실패 후 [다시 시도]는
       이 잠금과 무관하게 버튼이 직접 다시 부른다.
  */
  const uploadStartedRef = useRef(false);
  const createdProjectId = state.createdProjectId;
  useEffect(() => {
    if (createdProjectId === undefined || uploadStartedRef.current) return;
    uploadStartedRef.current = true;
    /*
      ⚠️ **첨부가 사라졌으면 그냥 목록으로 간다**(2026-08-13 고침). 액션은 `hasAttachment=1`을
         보고 `redirect` 대신 id만 돌려주는데, 응답이 오기 전에 사람이 [첨부 선택 해제]를
         누르면 여기서 올릴 파일이 없어진다 — 전에는 아무것도 안 하고 끝나서 **프로젝트는
         만들어졌는데 화면이 제출 버튼만 잠긴 채 멈췄다.** 만들어진 건 사실이므로 이동은 한다.
    */
    if (!attachment) {
      goToList();
      return;
    }
    void upload(createdProjectId, attachment);
  }, [createdProjectId, attachment, upload, goToList]);

  const isUploading = uploadPhase.kind === "uploading";
  /* 프로젝트가 이미 만들어진 뒤다 — 제출을 또 받으면 같은 프로젝트가 두 개 생긴다. */
  const isCreated = createdProjectId !== undefined;

  const canSubmit =
    name.trim().length > 0 &&
    tag.length > 0 &&
    description.trim().length > 0 &&
    startDate.trim().length > 0 &&
    dueDate.trim().length > 0 &&
    teamRows.length > 0 &&
    teamRows.every((row) => row.team.trim().length > 0);
  /*
    ⚠️ **첨부 오류가 제출을 막지 않는다**(2026-08-13 고침). 전에는 `!attachmentError`가
       `canSubmit`에 있었는데, 파일이 검증에 걸리면 `attachment`는 `null`이 되고 오류만 남아
       **제출 버튼이 영영 잠겼다** — 그 상태를 풀 [첨부 제거] 버튼은 `attachment`가 있을 때만
       그려져서 누를 수도 없었다. 첨부는 선택이고 걸린 파일은 붙지 않으므로, 오류 문구는
       그대로 두고(왜 안 붙는지 말해 준다) 프로젝트 생성은 막지 않는다.
  */
  const mainColor = paletteColorByName(tagColor);
  const usedTeams = new Set(teamRows.map((row) => row.team).filter(Boolean));
  const canAddTeamRow = teamRows.length < teamOptions.length;

  function cycleTagColor() {
    const rest = TAG_NAMES.filter((candidate) => candidate !== tagColor);
    const next = rest[Math.floor(Math.random() * rest.length)] ?? tagColor;
    setTagColor(next);
  }

  function updateTeamRow(rowId: number, team: string) {
    setTeamRows((rows) => rows.map((row) => (row.rowId === rowId ? { ...row, team } : row)));
  }

  function removeTeamRow(rowId: number) {
    setTeamRows((rows) => rows.filter((row) => row.rowId !== rowId));
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return; // 파일 고르기를 취소한 경우 — 기존 선택을 유지한다

    /* ⚠️ 고른 **직후** 인라인으로 알린다(§토스트 ❌폼 검증 오류) — 제출까지 갔다가 BE한테
       거절당하면 프로젝트만 만들어지고 파일이 튕기는 반쪽 결과가 된다. */
    const invalid = validateAttachmentFile(file.name, file.size);
    if (invalid) {
      setAttachment(null);
      setAttachmentError(invalid);
      event.target.value = ""; // 비워야 같은 파일을 다시 골라도 change가 또 뜬다
      return;
    }
    setAttachmentError(null);
    setAttachment(file);
  }

  function clearAttachment() {
    setAttachment(null);
    setAttachmentError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="tagColor" value={tagColor} />

      {/*
        ⚠️ **두 칸으로 가른다**(2026-08-11). 폭을 1440으로 넓히면서 한 줄에 `태그 색상 … 시작일`을
           나란히 두니, 왼쪽 칸 하나와 오른쪽 칸 하나 사이가 700px씩 벌어져 같은 줄인데도
           서로 상관없어 보였다 — 왼쪽은 **적는 것**(이름·설명·참여 팀), 오른쪽은
           **정하는 것**(태그·색·기간·첨부)이다(§DESIGN 4 detail 2컬럼, 인수인계 상세와 같은 해부).
        ⚠️ 곁 칸은 300px 고정이다. 비율로 두면 화면 폭에 따라 날짜 칸이 늘었다 줄었다 한다.
        ⚠️ 좁아지면 한 줄로 떨어진다(`lg:`).
      */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">
              프로젝트명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 온라인 굿즈샵 웹 구축"
              aria-invalid={Boolean(state.errors.name)}
            />
            <FieldError message={state.errors.name} />
          </div>

          {/* ⚠️ 폭 상한은 안 건다 — 본문 칸 자체가 곁 칸(300)을 뺀 나머지라 이미 좁다 */}
          <div className="flex flex-col gap-1.5">
            {/* ⚠️ 글자 수는 **라벨 줄 오른쪽**이다 — 칸 아래에 두면 다음 항목과 붙어 어디 것인지 흐리다 */}
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="project-description">
                세부 설명 <span className="text-destructive">*</span>
              </Label>
              <span className="text-muted-foreground text-[12px] leading-4 tabular-nums">
                {description.length}/{PROJECT_DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="project-description"
              name="description"
              /* ⚠️ 곁 칸(태그·색·기간·첨부)과 키를 맞춘다 — 4줄이면 왼쪽 아래가 통째로 비었다 */
              rows={8}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value.slice(0, PROJECT_DESCRIPTION_MAX_LENGTH))
              }
              placeholder="예: 아티스트 공식 굿즈를 판매하는 온라인 커머스 웹을 신규 구축합니다."
              maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
              aria-invalid={Boolean(state.errors.description)}
            />
            <FieldError message={state.errors.description} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              참여 팀 <span className="text-destructive">*</span>
            </Label>
            {/*
              ⚠️ **두 칸으로 깐다**(2026-08-11). 팀 줄을 세로로만 쌓으니 선택칸이 360px인데
                 본문 칸은 그 세 배라, 줄이 늘어날수록 **오른쪽 절반이 통째로 빈 채로 아래로만**
                 길어졌다 — 화면 가운데 아래에 구멍이 생기는 자리가 여기다.
              ⚠️ 칸은 남는 폭을 채운다(`w-full`). 팀 이름은 짧지만, 옆줄과 오른쪽 끝이 맞아야
                 두 칸이 표처럼 읽힌다.
            */}
            <div className="grid gap-2 sm:grid-cols-2">
              {teamRows.map((row) => (
                <div key={row.rowId} className="flex items-center gap-2">
                  <Select
                    value={row.team}
                    onValueChange={(value) => updateTeamRow(row.rowId, value ?? "")}
                  >
                    <SelectTrigger aria-label="참여 팀 선택" className="w-full">
                      <SelectValue placeholder="팀 선택" />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                      {teamOptions.map((team) => (
                        <SelectItem
                          key={team}
                          value={team}
                          disabled={team !== row.team && usedTeams.has(team)}
                        >
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {teamRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="이 팀 지정 삭제"
                      onClick={() => removeTeamRow(row.rowId)}
                    >
                      <X />
                    </Button>
                  )}
                  {row.team && <input type="hidden" name="teamNames" value={row.team} />}
                </div>
              ))}

              {/* ⚠️ [팀 추가]는 격자 아래 한 줄이다 — 칸 하나를 차지하면 빈 선택칸처럼 보인다 */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit sm:col-span-2"
                disabled={!canAddTeamRow}
                onClick={() => setTeamRows((rows) => [...rows, { rowId: nextRowId++, team: "" }])}
              >
                <Plus />팀 추가
              </Button>
            </div>
            <FieldError message={state.errors.teamNames} />
          </div>
        </div>

        {/* 곁 칸 — 정하는 것 */}
        <div className="flex flex-col gap-5 lg:w-[300px] lg:shrink-0">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-tag">
              프로젝트 태그 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-tag"
              name="tag"
              value={tag}
              onChange={(event) => setTag(toTagInput(event.target.value))}
              placeholder="GOODS"
              maxLength={PROJECT_TAG_MAX_LENGTH}
              className="font-mono"
              aria-invalid={Boolean(state.errors.tag)}
            />
            <p className="text-muted-foreground text-[12px] leading-4">
              영문 대문자만, 최대 {PROJECT_TAG_MAX_LENGTH}자
            </p>
            <FieldError message={state.errors.tag} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              태그 색상 <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cycleTagColor}
                /*
                  ⚠️ 테두리 링은 **고른 색**을 두르는 장식이라, 포커스 표시를 그 링에 맡길 수 없다
                     — `outline-none`만 두면 키보드로 온 사람에게 이 칸이 어디인지 알릴 방법이 없다.
                     포커스는 먹색 윤곽(`--ring`)으로 따로 그린다(§디자인 토큰: 포커스 링은 먹색).
                */
                className="ring-offset-background focus-visible:outline-ring size-8 shrink-0 rounded-full ring-2 ring-offset-2 transition-transform outline-none focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
                style={
                  {
                    backgroundColor: mainColor.solidColor,
                    "--tw-ring-color": mainColor.solidColor,
                  } as CSSProperties
                }
                aria-label={`태그 색상: ${TAG_NAME_LABEL[tagColor]} (누르면 다른 색으로 바뀝니다)`}
              />

              <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" size="sm">
                      더보기
                    </Button>
                  }
                />
                {/*
                ⚠️ **이름을 칸마다 적지 않는다**(2026-08-11). 색 이름이 한 글자(`틸`)부터 네 글자
                   (`에메랄드`)까지라 격자 아래 글자 길이가 제각각이었고, 넘치는 걸 막느라
                   네 글자만 9px로 줄여 놔서 같은 목록 안에 글자 크기가 둘이었다(§DESIGN 4는
                   다섯 크기뿐이다). 고르는 건 **색**이지 이름이 아니다.
                ⚠️ 대신 **이름을 한 곳에** 둔다 — 지금 고른 색 이름을 격자 아래 한 줄로 적는다.
                   색을 못 가리는 사람에게도 무엇을 골랐는지 남는다(§a11y: 색 하나로만 알리지 않는다).
                ⚠️ 칸마다 `title`·`aria-label`에는 이름이 그대로 들어간다.
              */}
                {/* ⚠️ 아래로 편다 — 오른쪽에 자리가 없어 왼쪽으로 뒤집히면서 폼 본문을 덮었다 */}
                <PopoverContent side="bottom" align="start" sideOffset={8} className="w-64">
                  <div className="grid grid-cols-6 gap-2">
                    {TAG_NAMES.map((colorName) => {
                      const color = paletteColorByName(colorName);
                      const label = TAG_NAME_LABEL[colorName];
                      const isPicked = colorName === tagColor;
                      return (
                        <button
                          key={colorName}
                          type="button"
                          title={label}
                          aria-label={`태그 색상 ${label}`}
                          aria-pressed={isPicked}
                          onClick={() => {
                            setTagColor(colorName);
                            setColorPickerOpen(false);
                          }}
                          className={cn(
                            "focus-visible:ring-ring/50 ring-offset-background flex size-8 items-center justify-center rounded-full transition-transform outline-none focus-visible:ring-3 active:scale-95",
                            isPicked && "ring-foreground ring-2 ring-offset-2",
                          )}
                          style={{ backgroundColor: color.solidColor }}
                        >
                          {/* 고른 칸만 체크 — 링만으로는 밝은 색에서 잘 안 보인다 */}
                          {isPicked && <Check className="size-4 text-white" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-muted-foreground pt-3 text-[12px] leading-4">
                    지금 고른 색 ·{" "}
                    <span className="text-foreground font-medium">{TAG_NAME_LABEL[tagColor]}</span>
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {/* ⚠️ 화면엔 노출하지 않는다 — 상태·타임라인 계산용 값일 뿐 마감일처럼 보여줄 정보가
                아니다(사용자 확인). 생성 폼에서만 받는다. */}
            <Label htmlFor="project-start-date">
              시작일 <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              id="project-start-date"
              name="startDate"
              value={startDate}
              onChange={setStartDate}
              max={dueDate || undefined}
              aria-invalid={Boolean(state.errors.startDate)}
              className="w-full"
            />
            <FieldError message={state.errors.startDate} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-due-date">
              마감 기한 <span className="text-destructive">*</span>
            </Label>
            <DatePickerField
              id="project-due-date"
              name="dueDate"
              value={dueDate}
              onChange={setDueDate}
              min={startDate || undefined}
              aria-invalid={Boolean(state.errors.dueDate)}
              className="w-full"
            />
            <FieldError message={state.errors.dueDate} />
          </div>

          <div className="flex flex-col gap-1.5">
            {/*
              ⚠️ **`htmlFor`를 안 쓴다**(2026-08-13 고침). 실제 조작은 아래 [파일 첨부] 버튼이
                 하고 `input`은 `hidden`이라 포커스를 못 받는다 — 라벨이 포커스 불가 요소를
                 가리키면 라벨을 눌러도 아무 일이 없다. 라벨·오류를 **버튼**에 건다(§a11y).
            */}
            <span id="project-attachment-label" className="text-[13px] leading-5 font-medium">
              첨부파일
            </span>
            {/*
              ⚠️ 파일 자체는 폼으로 안 보낸다 — BE는 바이너리를 안 받고, 액션이 만든 프로젝트
                 id로 화면이 presigned PUT을 잇는다(`use-attachment-upload.ts`). 폼에는
                 "첨부가 기다린다"는 신호(`hasAttachment`)만 싣는다.
            */}
            <input
              ref={fileInputRef}
              id="project-attachment"
              type="file"
              className="hidden"
              onChange={handleAttachmentChange}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full min-w-0 justify-start"
                disabled={isUploading || isCreated}
                aria-labelledby="project-attachment-label"
                aria-describedby={attachmentError ? "project-attachment-error" : undefined}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip />
                <span className="truncate">{attachment?.name ?? "파일 첨부 (선택)"}</span>
              </Button>
              {/*
                ⚠️ **제출 중에도 잠근다** — 응답을 기다리는 사이 해제하면 올릴 파일이 사라진다.
                   위 effect가 그 경우에도 목록으로 보내 주지만, 애초에 못 누르게 하는 편이
                   "눌렀는데 첨부만 조용히 없어지는" 일을 안 만든다.
                ⚠️ 파일이 검증에 걸려 `attachment`가 비었어도 **오류 문구가 남아 있으면** 지울
                   자리가 있어야 한다 — 전에는 이 버튼이 안 그려져 오류를 치울 길이 없었다.
              */}
              {(attachment || attachmentError) && !isCreated && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="첨부파일 선택 해제"
                  disabled={isPending}
                  onClick={clearAttachment}
                >
                  <X />
                </Button>
              )}
            </div>
            {attachment && <input type="hidden" name="hasAttachment" value="1" />}
            {attachment && <input type="hidden" name="attachmentName" value={attachment.name} />}
            <FieldError id="project-attachment-error" message={attachmentError ?? undefined} />
            {uploadPhase.kind === "failed" ? (
              /*
                ⚠️ **반쪽 성공을 그대로 말한다**(§정직성) — 프로젝트는 이미 만들어졌고 파일만
                   못 올라갔다. 조용히 목록으로 보내면 첨부가 증발한 것처럼 보인다.
                   [다시 시도]는 안전하다 — 발급은 새 키, 확정은 idempotent(훅 주석 참고).
              */
              <div className="flex flex-col gap-1.5" role="alert">
                <p className="text-destructive text-[12px] leading-4 break-keep">
                  프로젝트는 만들어졌지만 첨부파일을 올리지 못했습니다 — {uploadPhase.message}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (createdProjectId !== undefined && attachment)
                        void upload(createdProjectId, attachment);
                    }}
                  >
                    다시 시도
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSkipAttachmentConfirmOpen(true)}
                  >
                    첨부 없이 완료
                  </Button>
                </div>
                {/*
                  ⚠️ **프로젝트는 이미 만들어졌다** — 이 확인창이 "생성할까요?"를 묻지 않는
                     이유다(§정직성). 여기서 되돌릴 수 없는 건 첨부뿐이고, 나중에 다시 첨부할
                     수 있는지는 아직 확인된 바 없어 그렇다고도 아니라고도 단언하지 않는다
                     (DESIGN §9 "화면은 사실만 말한다").
                */}
                <ConfirmDialog
                  isOpen={isSkipAttachmentConfirmOpen}
                  onOpenChange={setIsSkipAttachmentConfirmOpen}
                  title="첨부파일 없이 넘어갈까요?"
                  description="프로젝트는 이미 만들어졌습니다. 지금 넘어가면 첨부파일 없는 채로 남습니다."
                  confirmLabel="넘어가기"
                  onConfirm={goToList}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-[12px] leading-4">
                {isUploading
                  ? "첨부파일을 올리고 있습니다…"
                  : "프로젝트 기획서 등 참고 문서가 있다면 첨부해 주세요."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ⚠️ 제출은 **두 칸 아래 한 줄**이다 — 곁 칸에 붙이면 본문을 다 적기 전에 눈에 들어온다 */}
      <div className="border-border flex justify-end gap-2 border-t pt-5">
        <Link href={cancelHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          취소
        </Link>
        <Button
          type="submit"
          size="sm"
          /* ⚠️ 만들어진 뒤에는 잠근다 — 업로드가 실패한 채 또 제출하면 프로젝트가 두 개 생긴다 */
          disabled={isPending || !canSubmit || isCreated}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          {isPending ? "생성 중…" : isUploading ? "파일 올리는 중…" : "프로젝트 생성"}
        </Button>
      </div>
    </form>
  );
}
