"use client";

import { Plus, X } from "lucide-react";

import { FieldError } from "@/components/common/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { MeetingTopicInput } from "../types";

interface MeetingTopicListProps {
  topics: MeetingTopicInput[];
  onChange: (topics: MeetingTopicInput[]) => void;
  error?: string;
}

const EMPTY_TOPIC: MeetingTopicInput = { main: "", sub: "" };

/**
 * 회의 안건(대주제/소주제) 입력 — **자유 텍스트**다, 고정 목록에서 고르지 않는다
 * (WORKFLOW.md §3-1). 첫 쌍은 필수, "안건 추가"로 늘리고 각 줄의 X로 줄인다(첫 줄은 못 뺀다 —
 * 최소 1쌍은 항상 있어야 한다).
 */
export function MeetingTopicList({ topics, onChange, error }: MeetingTopicListProps) {
  function updateTopic(index: number, patch: Partial<MeetingTopicInput>) {
    onChange(topics.map((topic, i) => (i === index ? { ...topic, ...patch } : topic)));
  }

  function removeTopic(index: number) {
    onChange(topics.filter((_, i) => i !== index));
  }

  function addTopic() {
    onChange([...topics, EMPTY_TOPIC]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>회의 주제</Label>
      <div className="flex flex-col gap-2">
        {topics.map((topic, index) => (
          // 안건 줄은 고유 id가 없고 순서만 의미가 있다 — index를 key로 쓴다.
          <div key={index} className="flex items-center gap-2">
            <Input
              name="topicMain"
              value={topic.main}
              onChange={(event) => updateTopic(index, { main: event.target.value })}
              placeholder="대주제"
              aria-label={`안건 ${index + 1} 대주제`}
              aria-invalid={Boolean(error)}
              className="flex-1"
            />
            <Input
              name="topicSub"
              value={topic.sub}
              onChange={(event) => updateTopic(index, { sub: event.target.value })}
              placeholder="소주제"
              aria-label={`안건 ${index + 1} 소주제`}
              aria-invalid={Boolean(error)}
              className="flex-1"
            />
            {topics.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`안건 ${index + 1} 삭제`}
                onClick={() => removeTopic(index)}
              >
                <X aria-hidden />
              </Button>
            )}
          </div>
        ))}
      </div>
      <FieldError reserveSpace message={error} />
      <Button
        type="button"
        variant="link"
        size="xs"
        className="w-fit px-0 text-[12px] leading-4"
        onClick={addTopic}
      >
        <Plus aria-hidden className="size-3.5" />
        주제 추가
      </Button>
    </div>
  );
}
