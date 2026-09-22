"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * 폼 제출 버튼 — 보내는 동안 스스로 잠긴다.
 *
 * ⚠️ `useFormStatus`는 **폼 안의 자식**에서만 값을 읽는다. 그래서 버튼을 따로 컴포넌트로 뺀다 —
 *    폼과 같은 컴포넌트에 두면 항상 `pending: false`다.
 * ⚠️ 두 번 눌리는 걸 막는 게 핵심이다. 신청이 두 벌 들어가면 승인 담당자가 헷갈린다.
 * ⚠️ 랜딩과 같은 먹색 버튼이다 — 기본 variant는 파랑(액센트)이라 여기만 튄다.
 * ⚠️ 보내는 동안에도 **버튼 이름이 남아 있어야 한다.** 회전만 그리고 글자를 빼 버리면
 *    스크린 리더에는 이름 없는 버튼이 된다 — 눈에서만 감추고(`sr-only`) 이름은 남긴다(§a11y).
 */
export function SubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  /** 폼 자체 판단으로 추가로 잠글 때만 넘긴다(예: 재요청 쿨다운) — 기본은 `pending`만 본다 */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className="bg-foreground text-background hover:bg-foreground/90 h-12 gap-1.5 text-[15px]"
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {/* `contents`라 평소에는 이 span이 레이아웃에 끼어들지 않는다 */}
      <span className={pending ? "sr-only" : "contents"}>{children}</span>
    </Button>
  );
}
