"use client";

import { AlertCircle, ArrowLeft, Building2, Mail, MailCheck } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { findPasswordAction, type FindPasswordState } from "../actions";
import type { Company } from "../types";
import { markPasswordResetAttempt, usePasswordResetCooldown } from "../use-password-reset-cooldown";
import { AuthCard } from "./auth-card";
import { SubmitButton } from "./submit-button";

interface FindPasswordStepProps {
  /** 로그인 1단계에서 이미 확인한 회사 — 다시 고르게 하지 않고 그대로 보낸다 */
  company: Company;
  /** [로그인으로 돌아가기] — 로그인 폼으로 되돌린다 */
  onBack: () => void;
}

const INITIAL: FindPasswordState = { errors: {}, done: false, attempt: 0 };

/**
 * 비밀번호 찾기 — 로그인 화면에서 갈라져 나온 자리(§AI 지시 2026-08-14).
 *
 * ⚠️ `companyCode`는 **로그인 1단계에서 이미 확인한 값**을 숨은 칸으로 보낸다. 이메일이
 *    회사 안에서만 유일해 다시 물을 필요가 없고, 또 물으면 오타로 다른 회사를 짚을 수 있다.
 * ⚠️ 성공하면 **폼을 접고 안내만 남긴다** — 새 비밀번호는 응답에 없다(메일로만 나간다).
 *    실패했을 때만 폼을 그대로 두고 위에 오류를 보여 준다(로그인 화면과 같은 자리).
 */
export function FindPasswordStep({ company, onBack }: FindPasswordStepProps) {
  const [state, formAction] = useActionState(findPasswordAction, INITIAL);
  const cooldownSeconds = usePasswordResetCooldown();

  /*
    ⚠️ **검증 실패(형식 오류)는 쿨다운을 안 쓴다.** `state.attempt`는 클라이언트 검증만
       걸려도 늘어나는데, 그건 서버까지 안 갔다 — 이메일 오타를 고치는 사람에게까지
       60초를 물리면 안 된다. `errors`가 비어 있어야(=서버 액션이 실제로 돌았어야) 마킹한다.
    ⚠️ `attempt > 0`으로 처음 렌더(마운트)를 건너뛴다 — 안 그러면 화면을 열기만 해도
       쿨다운이 시작된다.
  */
  const lastMarkedAttempt = useRef(0);
  useEffect(() => {
    if (state.attempt === 0 || state.attempt === lastMarkedAttempt.current) return;
    if (Object.keys(state.errors).length > 0) return;
    markPasswordResetAttempt();
    lastMarkedAttempt.current = state.attempt;
  }, [state.attempt, state.errors]);

  if (state.done) {
    return (
      <AuthCard icon={MailCheck} title="메일을 확인해 주세요">
        <div className="flex flex-col gap-5">
          <p
            role="status"
            className="border-border bg-secondary text-muted-foreground flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep"
          >
            <span className="flex h-[18px] shrink-0 items-center">
              <MailCheck className="size-3.5" aria-hidden />
            </span>
            {state.notice}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="text-primary focus-visible:ring-ring flex items-center justify-center gap-1.5 rounded text-[13px] leading-5 hover:underline focus-visible:ring-2 focus-visible:outline-hidden"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            로그인으로 돌아가기
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={Mail}
      title="비밀번호 찾기"
      description="가입하신 이메일로 새 비밀번호를 보내드립니다"
    >
      <form action={formAction} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="companyCode" value={company.code} />

        <div className="border-border bg-secondary flex items-center gap-3 rounded-lg border px-3.5 py-3">
          <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Building2 className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-5 font-medium">{company.name}</span>
            <span className="text-muted-foreground block truncate text-[11px] leading-4 tracking-[0.5px]">
              {company.code}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="find-password-email" className="flex items-center gap-1.5">
            <Mail className="text-muted-foreground size-3.5" aria-hidden />
            <span className="translate-y-px">이메일</span>
          </Label>
          <Input
            id="find-password-email"
            key={`find-password-email-${state.attempt}`}
            name="email"
            type="email"
            defaultValue={state.email}
            placeholder="name@company.com"
            autoComplete="email"
            aria-invalid={state.errors.email !== undefined}
            aria-describedby="find-password-email-error"
          />
          <p
            id="find-password-email-error"
            role="alert"
            className="text-destructive flex min-h-4 items-center gap-1.5 text-[12px] leading-4"
          >
            {state.errors.email && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
            <span className="translate-y-px">{state.errors.email}</span>
          </p>
        </div>

        <SubmitButton disabled={cooldownSeconds > 0}>
          {cooldownSeconds > 0 ? `${cooldownSeconds}초 후 다시 시도` : "새 비밀번호 받기"}
        </SubmitButton>

        {state.error && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep"
          >
            <span className="flex h-[18px] shrink-0 items-center">
              <AlertCircle className="size-3.5" aria-hidden />
            </span>
            {state.error}
          </p>
        )}

        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex items-center justify-center gap-1.5 rounded text-[12px] leading-4 focus-visible:ring-2 focus-visible:outline-hidden"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          로그인으로 돌아가기
        </button>
      </form>
    </AuthCard>
  );
}
