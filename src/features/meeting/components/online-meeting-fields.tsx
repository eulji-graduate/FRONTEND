"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";

import { FieldError } from "@/components/common/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetingTopicList } from "@/features/rooms/components/meeting-topic-list";
import type { RoomProjectOption, RoomTeamActionOption } from "@/features/rooms/types";

import type { OnlineMeetingFormErrors } from "../types";
import type { OnlineMeetingFormValues } from "./use-online-meeting-form";

interface OnlineMeetingFieldsProps {
  form: OnlineMeetingFormValues;
  setForm: Dispatch<SetStateAction<OnlineMeetingFormValues>>;
  errors: OnlineMeetingFormErrors;
  projects: RoomProjectOption[];
  /** "상위 팀 액션" 필드를 보여줄지 — `RoomReservationFields`와 같은 판정(`requiresParentTeamAction`). */
  showParentTeamAction: boolean;
  teamActions: RoomTeamActionOption[];
}

/**
 * 비대면 회의 만들기 모달 왼쪽 열(이슈 #473) — `RoomReservationFields`와 같은 필드를 쓰되
 * **회의실이 없다.** 회의실 예약 폼과 같은 select·안건 위젯을 그대로 재사용한다.
 */
export function OnlineMeetingFields({
  form,
  setForm,
  errors,
  projects,
  showParentTeamAction,
  teamActions,
}: OnlineMeetingFieldsProps) {
  const selectedProjectTag = projects.find((project) => project.id === form.projectId)?.tag;

  // ⚠️ `useMemo`로 참조를 고정한다 — `RoomReservationFields`와 같은 이유(base-ui `Select`
  //    내부 이펙트가 매 렌더 새 참조를 물면 "Maximum update depth exceeded"로 이어진다).
  const availableTeamActions = useMemo(
    () => teamActions.filter((teamAction) => teamAction.projectTag === selectedProjectTag),
    [teamActions, selectedProjectTag],
  );
  const projectItems = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const teamActionItems = useMemo(
    () =>
      Object.fromEntries(
        availableTeamActions.map((teamAction) => [String(teamAction.id), teamAction.name]),
      ),
    [availableTeamActions],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="online-meeting-title">회의 제목</Label>
        <Input
          id="online-meeting-title"
          name="title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="회의 제목을 입력하세요"
          aria-invalid={Boolean(errors.title)}
        />
        <FieldError reserveSpace message={errors.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="online-meeting-project">프로젝트</Label>
        <Select
          items={projectItems}
          value={form.projectId}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, projectId: value ?? "", parentTeamActionId: "" }))
          }
        >
          <SelectTrigger
            id="online-meeting-project"
            aria-invalid={Boolean(errors.projectId)}
            className="w-full"
          >
            <SelectValue placeholder="프로젝트 선택" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError reserveSpace message={errors.projectId} />
      </div>

      {showParentTeamAction && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="online-meeting-parent-team-action">상위 팀 액션</Label>
          <Select
            items={teamActionItems}
            value={form.parentTeamActionId}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, parentTeamActionId: value ?? "" }))
            }
            disabled={!form.projectId}
          >
            <SelectTrigger
              id="online-meeting-parent-team-action"
              aria-invalid={Boolean(errors.parentTeamActionId)}
              className="w-full"
            >
              <SelectValue
                placeholder={form.projectId ? "상위 팀 액션 선택" : "프로젝트를 먼저 선택해 주세요"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableTeamActions.map((teamAction) => (
                <SelectItem key={teamAction.id} value={String(teamAction.id)}>
                  {teamAction.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError reserveSpace message={errors.parentTeamActionId} />
        </div>
      )}

      <MeetingTopicList
        topics={form.topics}
        onChange={(topics) => setForm((prev) => ({ ...prev, topics }))}
        error={errors.topics}
      />
    </div>
  );
}
