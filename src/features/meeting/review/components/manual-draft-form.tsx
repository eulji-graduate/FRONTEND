"use client";

import { Users } from "lucide-react";
import { useState } from "react";

import { DatePickerField } from "@/components/common/date-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_ASSIGNMENT_TARGET_LABEL } from "@/constants/meeting";

import { formatAssigneeLabel, reviewStartDateMin } from "../lib";
import type { AssigneeOption, ManualDraftInput, TeamOption } from "../types";

interface ManualDraftFormProps {
  assigneeOptions: AssigneeOption[];
  defaultDueDate: string;
  onAdd: (input: ManualDraftInput) => void;
  onCancel: () => void;
  /** 있으면 담당자 대신 부서를 고르는 모드다 — `action-review-row.tsx`와 같은 규칙(2026-08-13). */
  teamOptions?: TeamOption[];
}

/** [액션 직접 추가] 클릭 시 펼쳐지는 입력 행 — 담당자(또는 부서)·내용·시작일·마감일 전부 직접 입력. */
export function ManualDraftForm({
  assigneeOptions,
  defaultDueDate,
  onAdd,
  onCancel,
  teamOptions,
}: ManualDraftFormProps) {
  const isTeamMode = teamOptions !== undefined;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(assigneeOptions[0]?.id ?? 0);
  const [teamId, setTeamId] = useState(teamOptions?.[0]?.teamId ?? 0);
  const [startDate, setStartDate] = useState(defaultDueDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  const canAdd =
    title.trim().length > 0 && (isTeamMode ? teamId > 0 : assigneeId > 0) && startDate && dueDate;

  return (
    <div className="border-border bg-muted/30 flex flex-col gap-2 border-t px-7 py-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="액션명을 입력해 주세요"
            aria-label="액션명"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="세부 내용(선택)"
            aria-label="세부 내용"
            rows={1}
            className="px-2.5 py-1.5 text-[12px] leading-4"
          />
        </div>
        {isTeamMode ? (
          <Select
            value={String(teamId)}
            onValueChange={(value) => value && setTeamId(Number(value))}
          >
            <SelectTrigger
              aria-label={`${REVIEW_ASSIGNMENT_TARGET_LABEL.TEAM} 선택`}
              className="w-36"
            >
              <SelectValue>
                {(value) => {
                  const option = teamOptions?.find(
                    (candidate) => String(candidate.teamId) === value,
                  );
                  return option ? (
                    <>
                      <Users className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{option.teamName}</span>
                    </>
                  ) : (
                    value
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              {teamOptions?.map((option) => (
                <SelectItem key={option.teamId} value={String(option.teamId)}>
                  <Users className="size-4 shrink-0" aria-hidden />
                  {option.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={String(assigneeId)}
            onValueChange={(value) => value && setAssigneeId(Number(value))}
          >
            <SelectTrigger
              aria-label={`${REVIEW_ASSIGNMENT_TARGET_LABEL.PERSONAL} 선택`}
              className="w-36"
            >
              <SelectValue>
                {(value) => {
                  const option = assigneeOptions.find(
                    (candidate) => String(candidate.id) === value,
                  );
                  return option ? formatAssigneeLabel(option) : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              {assigneeOptions.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {formatAssigneeLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DatePickerField
          aria-label="시작일"
          value={startDate}
          min={reviewStartDateMin()}
          max={dueDate || undefined}
          onChange={setStartDate}
          className="w-full sm:w-[180px]"
        />
        <DatePickerField
          aria-label="마감일"
          value={dueDate}
          min={startDate || undefined}
          onChange={setDueDate}
          className="w-full sm:w-[180px]"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canAdd}
          className="bg-foreground text-background hover:bg-foreground/90"
          onClick={() =>
            onAdd({
              title: title.trim(),
              description: description.trim(),
              ...(isTeamMode ? { teamId } : { assigneeId }),
              startDate,
              dueDate,
            })
          }
        >
          추가
        </Button>
      </div>
    </div>
  );
}
