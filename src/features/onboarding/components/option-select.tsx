"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { SelectOption } from "../types";
import { EmptySelect, LockedSelect } from "./option-select-locked";

// 쓰던 곳이 많아 여기서 그대로 다시 내보낸다 — 정본은 `types.ts`다
export type { SelectOption };

interface OptionSelectProps {
  value: string;
  onChange: (id: string) => void;
  options: SelectOption[];
  /** 스크린리더용 이름 — 어느 줄의 무엇을 고르는지 알려준다 */
  label: string;
  /** 고를 게 없을 때 보여줄 문구 */
  emptyText: string;
  /** 칸 너비(px). 펼친 목록도 같은 폭을 써서 트리거와 어긋나지 않는다. */
  width: number;
  /**
   * 아직 고를 수 없는 상태.
   * ⚠️ **왜 못 고르는지 칸 안에 적지 않는다.** `부서 먼저` 같은 문구를 값 자리에 넣으면
   *    그게 고른 값처럼 읽히고, 옆 칸들과 글자만 다른 이상한 칸이 된다.
   *    비활성으로 **보이게** 하고 이유는 왼쪽 안내가 맡는다.
   */
  disabled?: boolean;
  /** 잠겨 있을 때 칸에 보여줄 문구 */
  /**
   * 값을 **플레이스홀더 색**으로 눕힌다. 아직 실체가 없는 줄(주소를 안 적은 줄)에 쓴다 —
   * 옆 입력칸은 비어서 회색인데 이 칸만 진하면 빈 줄이 반쯤 채워진 것처럼 보인다.
   * ⚠️ "안 골랐다"는 뜻이 아니다. 값은 그대로 쓰인다 — 줄 자체가 비었다는 표시다.
   */
  isMuted?: boolean;
  /**
   * 아직 아무것도 안 골랐을 때(`value === ""`) 칸에 띄울 글자.
   *
   * ⚠️ 빈 값은 **오직 "아직 안 골랐다"** 뿐이다. `없음`처럼 고른 결과는 목록에 실제 항목으로
   *    넣는다(`NO_ROLE_ID`) — 둘을 같은 값으로 두면 다음 칸을 언제 열지 알 수 없다.
   */
  placeholder?: string;
  className?: string;
}

/**
 * 이름 목록에서 하나를 고르는 칸. 부서·직급이 같은 모양을 쓴다.
 * 폭을 고정해 어떤 이름이 와도 열이 흔들리지 않는다(길면 잘린다).
 */
export function OptionSelect({
  value,
  onChange,
  options,
  label,
  emptyText,
  width,
  disabled = false,
  placeholder,
  isMuted = false,
  className,
}: OptionSelectProps) {
  const nameOf = (id: string) => options.find((option) => option.id === id)?.name;

  if (disabled) {
    /*
      잠긴 칸에도 **고른 값을 그대로 보여준다.** 값이 없을 때만 안내 글자를 쓴다 —
      리더 직급이라 잠긴 역할 칸은 `없음`이 보여야 무엇으로 정해졌는지 알 수 있다.
    */
    const settledText = value ? (nameOf(value) ?? emptyText) : (placeholder ?? emptyText);
    return <LockedSelect text={settledText} label={label} width={width} className={className} />;
  }

  // 고를 게 아무것도 없고 "없음"조차 못 쓰면 칸을 잠근다
  if (options.length === 0) {
    return <EmptySelect text={emptyText} label={label} width={width} className={className} />;
  }

  return (
    // 선택 해제(null)는 쓰지 않는다 — 부서·직급은 항상 하나가 골라져 있다
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next) return;
        onChange(next as string);
      }}
    >
      <SelectTrigger
        aria-label={label}
        style={{ width }}
        // data-[size=default]:h-8 이 기본으로 걸려 있어 h-7만으로는 안 먹는다 —
        // 옆 입력칸(28px)과 높이를 맞춰야 한 줄로 보인다
        // ⚠️ 정렬은 기본(`justify-between`)을 그대로 둔다. 대신 **칸을 내용에 맞게 좁혔다** —
        //    칸이 넓으면 글자와 화살표가 양 끝으로 벌어져 사이가 텅 비고, 칸 자체도 커 보인다.
        //    가운데로 모으는 것보다 이 편이 긴 이름이 들어와도 잘리며 버틴다.
        // ⚠️ 입력칸과 **높이(h-8)도 글자 크기(14px)도** 같아야 한 줄로 읽힌다 —
        //    한쪽만 작으면 색이 같아도 다른 물건처럼 보인다
        className={cn(
          // 꺽쇠(size-4)가 좁은 칸에서 글자 자리를 뺏어 `프론트엔드`가 잘렸다 —
          // 한 치수 줄여(3.5) 글자에 자리를 돌려준다
          // 꺽쇠는 **오른쪽 끝에 붙인다** — 오른쪽 여백을 왼쪽보다 좁게(2.5 → 1.5) 준다
          "h-8 pr-1.5 pl-2.5 text-[13px] leading-none data-[size=default]:h-8 [&>svg]:size-3.5",
          /*
            ⚠️ 값 칸은 `flex-1`(남는 자리 전부) 그대로 두고, **그 안에서** 글자를 가운데로 보낸다.
               칸을 내용만큼만 줄여 글자+꺽쇠를 함께 가운데로 모으면 꺽쇠가 안쪽으로 딸려 들어온다.
            ⚠️ 기본값이 `text-left`라 글자가 왼쪽 끝에 붙어 열 머리(가운데)와 어긋나 보였다.
          */
          "[&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:justify-center [&>[data-slot=select-value]]:text-center",
          // ⚠️ 빈 줄이라도 **테두리는 건드리지 않는다** — 연하게 눕히면 줄 전체가 비활성으로 읽힌다
          isMuted && "text-muted-foreground",
          className,
        )}
      >
        <SelectValue>
          {(id) => {
            const name = nameOf(id as string);
            if (name) return name;
            // 안 고른 칸은 **연하게** 둔다 — 고른 값과 같은 세기면 이미 정해진 줄로 읽힌다
            if (placeholder) {
              return <span className="text-muted-foreground/70">{placeholder}</span>;
            }
            return emptyText;
          }}
        </SelectValue>
      </SelectTrigger>

      {/*
        alignItemWithTrigger={false} — 고른 항목이 트리거 위로 겹쳐 올라오지 않게 한다.
        기본 min-w-36이 트리거보다 넓다 — 칸 폭에 맞춘다(2단계 권한 선택과 같은 형태).
      */}
      <SelectContent
        side="bottom"
        align="start"
        sideOffset={4}
        alignItemWithTrigger={false}
        // 트리거 폭을 최소로만 쓴다 — 좁은 칸(76px)에서 설명이 체크 표시와 겹치던 문제
        style={{ minWidth: width }}
        /*
          ⚠️ 항목 글자를 **가운데**로 둔다. 트리거의 값도 가운데라, 목록만 왼쪽이면
             펼치는 순간 글자가 옆으로 튀어 보인다.
          ⚠️ 오른쪽 체크 표식은 절대 위치라 가운데 정렬에 끼어들지 않는다. 대신 왼쪽에도
             같은 여백(`pl-8`)을 줘야 글자가 진짜 가운데에 선다.
        */
        className="w-auto min-w-0 [&_[data-slot=select-item]]:justify-center [&_[data-slot=select-item]]:pl-8"
      >
        {options.map((option) => (
          <SelectItem
            key={option.id}
            value={option.id}
            disabled={option.disabled && option.id !== value}
            className="text-[13px]"
          >
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
