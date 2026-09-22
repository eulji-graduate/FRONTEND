"use client";

import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 초대 줄의 Admin 겸직 스위치.
 *
 * ⚠️ **역할 드롭다운에 넣지 않는다.** Admin은 Leader·Member를 대체하는 값이 아니라 그 위에
 *    얹히는 권한이라, 같은 목록에 두면 "Leader 대신 Admin"으로 읽힌다.
 * ⚠️ 켜짐/꺼짐을 색이 아니라 **채움과 아이콘**으로 알린다 — 색으로 알리는 건 에러뿐이다(§디자인 토큰).
 * ⚠️ `aria-pressed`로 상태를 읽힌다. 체크박스가 아니라 토글 버튼이라 `checked`가 아니다(§a11y).
 * ⚠️ **이미 나간 줄은 버튼을 그리지 않는다.** 같은 자리에 먹색 버튼이 그대로 남으면
 *    흐려진 줄에서 그것만 도드라져 아직 누를 수 있는 것처럼 보인다.
 * ⚠️ **잠긴 모양은 두지 않는다**(2026-08-04). 발송과 단계 이동을 [완료]가 함께 해서
 *    보낸 줄이 화면에 남는 순간이 없다 — 그릴 일 없는 상태를 위한 분기는 없앴다.
 */
interface InviteAdminToggleProps {
  isOn: boolean;
  /** 스크린 리더가 어느 줄인지 알 수 있게 — 메일 주소를 넣는다 */
  label: string;
  onToggle: () => void;
}

export function InviteAdminToggle({ isOn, label, onToggle }: InviteAdminToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      aria-label={`${label} Admin 겸직`}
      onClick={onToggle}
      className={cn(
        "focus-visible:ring-ring flex size-6 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
        isOn
          ? "bg-foreground text-background border-foreground"
          : // ⚠️ 한 줄의 다른 칸들과 **같은 토큰**(`border-input`)을 쓴다 — `border-border`는
            //    카드·구분선용이라 값이 달라, 같은 줄에서 이 칸만 테두리가 달라 보였다.
            "border-input text-muted-foreground/50 hover:text-foreground hover:border-foreground/40",
      )}
    >
      <ShieldCheck className="size-3.5" aria-hidden />
    </button>
  );
}
