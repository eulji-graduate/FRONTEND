"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUTHORITY_LABEL, POSITION_AUTHORITIES } from "@/constants/domain";
import { cn } from "@/lib/utils";

import type { AssignableRole } from "../types";

interface RoleSelectProps {
  value: AssignableRole;
  onChange: (role: AssignableRole) => void;
  /** 스크린리더용 이름 — 어느 직급의 권한인지 알려준다 */
  label: string;
  /** 고를 수 없는 권한 — 이미 다른 직급이 가져갔다 */
  blocked?: readonly AssignableRole[];
  /** 목록 줄은 28px(`sm`), 추가 줄은 옆 입력칸에 맞춰 32px(`default`) */
  size?: "sm" | "default";
  className?: string;
}

/**
 * 직급 한 줄의 권한 선택. 폭을 고정해 어떤 권한이든 크기가 같다.
 *
 * ⚠️ 3단계 선택 칸(`OptionSelect`)과 **작동 방식이 같아야 한다** — 꺽쇠 크기(3.5)·꺽쇠를
 *    오른쪽 끝에 붙이는 것·값을 가운데 두는 것·목록 글자를 트리거와 맞추는 것.
 *    폭과 높이만 다르다(여기는 28px 줄, 3단계는 60px 줄).
 * ⚠️ 글자 크기는 **옆 직급명(13px)에 맞춘다.** 11px이던 시절엔 같은 줄에서 권한만 작아
 *    다른 물건처럼 보였다.
 */
export function RoleSelect({
  value,
  onChange,
  label,
  blocked = [],
  size = "sm",
  className,
}: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as AssignableRole)}>
      <SelectTrigger
        aria-label={label}
        // ⚠️ 기본 `data-[size=default]:h-8`이 특이도가 높아 `h-7`만으로는 안 먹는다.
        //    그래서 높이를 className으로 넘겨받지 않고 여기서 정한다 — 밖에서 덮으려 하면 조용히 무시된다.
        className={cn(
          "w-[92px] pr-1.5 pl-2.5 text-[13px] leading-none [&>svg]:size-3.5",
          // 값 칸이 기본 `flex-1`이라 글자가 왼쪽 끝에 붙는다 — 안에서 가운데로 모은다
          "[&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:justify-center [&>[data-slot=select-value]]:text-center",
          size === "sm" ? "h-7 data-[size=default]:h-7" : "h-8 data-[size=default]:h-8",
          className,
        )}
      >
        {/* 원본 값(LEADER)이 아니라 표기용 라벨(Leader)을 보여준다 */}
        <SelectValue>{(role) => AUTHORITY_LABEL[role as AssignableRole]}</SelectValue>
      </SelectTrigger>

      {/*
        `alignItemWithTrigger={false}` — 켜두면 고른 항목이 트리거 위로 겹쳐 올라온다.
        끄면 트리거 아래로만 펼쳐진다.
      */}
      <SelectContent
        side="bottom"
        align="start"
        sideOffset={4}
        alignItemWithTrigger={false}
        // 기본 min-w-36이 트리거보다 넓다 — 칸 폭에 맞춘다
        className="w-[92px] min-w-0"
      >
        {POSITION_AUTHORITIES.map((role) => (
          <SelectItem
            key={role}
            value={role}
            disabled={blocked.includes(role) && role !== value}
            className="text-[13px]"
          >
            {AUTHORITY_LABEL[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
