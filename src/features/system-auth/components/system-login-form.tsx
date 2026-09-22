"use client";

import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/features/auth/components/submit-button";

import { systemLoginAction, type SystemLoginState } from "../actions";

/**
 * SYSTEM(서비스 운영자) 로그인 — 단일 계정, 기업 로그인과 완전히 분리된 화면.
 *
 * ⚠️ 별도 라우트(`/system/login`)를 만들지 않는다. `(system)/layout.tsx`가 세션이 없을 때
 *    이 폼을 그 자리에 그대로 그린다 — URL을 조작해 `/system/*` 어디로 들어와도 같은
 *    로그인 화면을 보게 하려는 목적이라, 라우트를 나누면 그 목적이 흐려진다.
 */
const INITIAL: SystemLoginState = { errors: {}, attempt: 0 };

export function SystemLoginForm() {
  const [state, formAction] = useActionState(systemLoginAction, INITIAL);
  const errors = state.errors;

  return (
    <div className="border-border bg-card w-full max-w-[380px] rounded-2xl border p-10 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)]">
      <ShieldCheck className="text-muted-foreground size-[22px]" aria-hidden />
      <h1 className="pt-3.5 text-[22px] leading-8 font-semibold tracking-[-0.4px]">
        시스템 관리자 로그인
      </h1>
      <p className="text-muted-foreground pt-2 text-[13px] leading-5">
        서비스 운영자만 접근할 수 있습니다.
      </p>

      <form action={formAction} noValidate className="flex flex-col gap-1.5 pt-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adminId">아이디</Label>
          <Input
            id="adminId"
            key={`adminId-${state.attempt}`}
            name="adminId"
            type="text"
            defaultValue={state.adminId}
            autoComplete="username"
            aria-invalid={errors.adminId !== undefined}
            aria-describedby="adminId-error"
          />
          <p
            id="adminId-error"
            role="alert"
            className="text-destructive flex min-h-4 items-center gap-1.5 text-[12px] leading-4"
          >
            {errors.adminId && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
            <span className="translate-y-px">{errors.adminId}</span>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="flex items-center gap-1.5">
            <KeyRound className="text-muted-foreground size-3.5" aria-hidden />
            <span className="translate-y-px">비밀번호</span>
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password !== undefined}
            aria-describedby="password-error"
          />
          <p
            id="password-error"
            role="alert"
            className="text-destructive flex min-h-4 items-center gap-1.5 text-[12px] leading-4"
          >
            {errors.password && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
            <span className="translate-y-px">{errors.password}</span>
          </p>
        </div>

        <SubmitButton>로그인</SubmitButton>

        {state.error && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive mt-3 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep"
          >
            <span className="flex h-[18px] shrink-0 items-center">
              <AlertCircle className="size-3.5" aria-hidden />
            </span>
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
