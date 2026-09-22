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

import type {
  MeetingRoom,
  RoomProjectOption,
  RoomReservationFormErrors,
  RoomTeamActionOption,
} from "../types";
import { MeetingTopicList } from "./meeting-topic-list";
import { RoomPickerList } from "./room-picker-list";
import type { RoomReservationFormValues } from "./use-room-reservation-form";

interface RoomReservationFieldsProps {
  form: RoomReservationFormValues;
  setForm: Dispatch<SetStateAction<RoomReservationFormValues>>;
  errors: RoomReservationFormErrors;
  rooms: MeetingRoom[];
  projects: RoomProjectOption[];
  /**
   * "상위 팀 액션" 필드를 보여줄지 — 판정은 `lib/permission.ts`의 `requiresParentTeamAction`
   * 한 곳에서 하고, 이 컴포넌트는 그 결과 boolean만 받는다(권한 판정을 화면에 흩어 두지 않는다).
   */
  showParentTeamAction: boolean;
  /** Host의 팀에 하달된 팀 액션 전체(프로젝트 무관) — 지금 고른 프로젝트로 화면에서 다시 거른다. */
  teamActions: RoomTeamActionOption[];
}

/**
 * 예약 모달 왼쪽 열 — 제목·회의실·프로젝트·상위 팀 액션·회의 주제(`room-reservation-dialog.tsx`가
 * 오른쪽 열의 참석자 패널과 나란히 배치한다).
 */
export function RoomReservationFields({
  form,
  setForm,
  errors,
  rooms,
  projects,
  showParentTeamAction,
  teamActions,
}: RoomReservationFieldsProps) {
  const selectedProjectTag = projects.find((project) => project.id === form.projectId)?.tag;

  /*
    ⚠️ `useMemo`로 참조를 고정한다 — `.filter()`는 매 렌더 새 배열을 만들고, 거기서 파생한
       `items` 객체도 매번 새 참조가 된다. base-ui `Select`의 내부 이펙트가 참조 변화 → store
       갱신 → 리렌더 → 새 객체를... 반복해 "Maximum update depth exceeded"로 이어진다
       (`search-filter-bar.tsx`가 같은 이유로 `useMemo`를 쓰던 걸 놓쳤다가 실제로 터졌다).
  */
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
        <Label htmlFor="reservation-title">회의 제목</Label>
        <Input
          id="reservation-title"
          name="title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="회의 제목을 입력하세요"
          aria-invalid={Boolean(errors.title)}
        />
        <FieldError reserveSpace message={errors.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>회의실</Label>
        <RoomPickerList
          rooms={rooms}
          selectedId={form.roomId}
          onChange={(roomId) => setForm((prev) => ({ ...prev, roomId }))}
          error={Boolean(errors.roomId)}
        />
        <FieldError reserveSpace message={errors.roomId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reservation-project">프로젝트</Label>
        <Select
          // ⚠️ `items`(값→라벨 맵)를 넘긴다 — 안 넘기면 트리거가 닫혀 있는 동안 `SelectContent`가
          //    아직 안 그려져 라벨을 못 찾고 원문 값(`project.id`)이 그대로 보인다
          //    (`search-filter-bar.tsx`와 같은 이유).
          items={projectItems}
          value={form.projectId}
          onValueChange={(value) =>
            // 프로젝트를 바꾸면 그 프로젝트 소속이 아닌 상위 팀 액션 선택은 의미가 없어진다.
            setForm((prev) => ({ ...prev, projectId: value ?? "", parentTeamActionId: "" }))
          }
        >
          <SelectTrigger
            id="reservation-project"
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
          <Label htmlFor="reservation-parent-team-action">상위 팀 액션</Label>
          <Select
            items={teamActionItems}
            value={form.parentTeamActionId}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, parentTeamActionId: value ?? "" }))
            }
            disabled={!form.projectId}
          >
            <SelectTrigger
              id="reservation-parent-team-action"
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
