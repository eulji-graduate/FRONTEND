"use client";

import { AlertCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 계정 화면의 입력 한 칸 — 라벨 + 입력 + 오류 줄.
 *
 * ⚠️ 오류 줄은 **자리를 미리 비워 둔다**(`min-h-4`). 뜰 때만 넣으면 카드 높이가 늘었다 줄어
 *    화면이 출렁인다 — 검증 하나에 레이아웃이 흔들리면 안 된다.
 * ⚠️ 검증 오류는 토스트가 아니라 **필드 아래 인라인**이다(CLAUDE.md §토스트).
 * ⚠️ 오류 줄에 `role="alert"`를 준다. 제출하면 포커스가 버튼에 남아서, 이게 없으면
 *    스크린 리더는 오류가 떴다는 걸 아예 말해 주지 않는다.
 * ⚠️ 한글은 아이콘보다 떠 보인다 — 라벨 글자만 1px 내려 맞춘다.
 */
interface AuthFieldProps {
  id: string;
  /** `FormData` 키 — Server Action이 이 이름으로 값을 읽는다 */
  name?: string;
  label: string;
  icon: LucideIcon;
  /**
   * 값을 화면이 쥐고 있어야 할 때만 넘긴다(입력하면서 모양을 다듬는 칸 등).
   * ⚠️ 대부분은 **넘기지 않는다.** 값은 `FormData`가 실어 나르므로 굳이 리렌더를 만들 이유가 없다.
   */
  value?: string;
  /**
   * 처음에 채워 둘 값 — **제출이 실패했을 때 적었던 값을 되살리는 데 쓴다.**
   *
   * ⚠️ React 19의 `<form action={서버액션}>`은 액션이 끝나면 **폼을 리셋한다.** 값이
   *    화면 상태에 없는 칸(이 컴포넌트의 기본 모드)은 그 순간 빈칸이 된다 — 동의를 안 눌러
   *    막힌 사람이 여섯 칸을 처음부터 다시 적게 된다.
   * ⚠️ 되살리려면 `key`도 같이 바꿔야 한다. 리셋된 칸은 이미 마운트돼 있어서
   *    `defaultValue`만 바꿔서는 다시 반영되지 않는다(`RegisterForm` 참고).
   */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** 브라우저 자동완성 힌트 — 사내 도구라도 이름·메일은 채워 주는 편이 낫다 */
  autoComplete?: string;
  type?: "text" | "email" | "tel";
  error?: string;
  /** 입력 대신 다른 걸 넣어야 할 때(주소 고르기 등) */
  children?: ReactNode;
}

export function AuthField({
  id,
  name,
  label,
  icon: Icon,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  autoComplete,
  type = "text",
  error,
  children,
}: AuthFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Icon className="text-muted-foreground size-3.5" aria-hidden />
        <span className="translate-y-px">{label}</span>
      </Label>

      {children ?? (
        <Input
          id={id}
          name={name}
          type={type}
          {...(value === undefined ? { defaultValue } : { value })}
          onChange={(event) => onValueChange?.(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error !== undefined}
          aria-describedby={errorId}
        />
      )}

      <p
        id={errorId}
        role="alert"
        className="text-destructive flex min-h-4 items-center gap-1.5 text-[12px] leading-4 break-keep"
      >
        {error && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
        <span className="translate-y-px">{error}</span>
      </p>
    </div>
  );
}
