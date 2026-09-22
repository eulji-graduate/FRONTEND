"use client";

import { AlertCircle, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { type CompanyCodeState, findCompanyAction } from "../actions";
import { saveCompany } from "../company-code";
import { AuthCard } from "./auth-card";
import { SubmitButton } from "./submit-button";

/**
 * 로그인 1단계 — 어느 회사로 들어가는지 먼저 정한다(카카오워크 문법).
 *
 * ⚠️ 코드 확인은 **Server Action**이 한다(`findCompanyAction`). 화면은 목인지 실서버인지
 *    모르고, 통과시키는 것도 서버다(§권한: 화면 숨김은 보안이 아니다).
 * ⚠️ 기억은 **서버가 답을 준 뒤** 클라이언트에서 한다. `useActionState`에 넘긴 함수는
 *    클라이언트에서 돌기 때문에 `useEffect` 없이 여기서 바로 저장할 수 있다.
 * ⚠️ 브라우저 기본 검증(`required` + 말풍선)을 쓰지 않는다. 회색 말풍선이 우리 화면 위에
 *    떠서 디자인이 깨지고 문구도 못 고친다 — `noValidate` + 필드 인라인으로 직접 알린다.
 */
const INITIAL: CompanyCodeState = { company: null };

export function CompanyCodeStep() {
  const [state, formAction] = useActionState(async (prev: CompanyCodeState, formData: FormData) => {
    /*
      ⚠️ **거절도 받아 낸다.** 액션은 실패를 `error` 문구로 돌려주지만, 브라우저에서 Next
         서버까지 가는 길이 끊기면 `await` 자체가 던진다 — 안 잡으면 로그인 첫 화면이
         통째로 `error.tsx`로 넘어가, 코드를 잘못 친 것과 구분할 수 없게 된다.
    */
    let next: CompanyCodeState;
    try {
      next = await findCompanyAction(prev, formData);
    } catch {
      return { company: null, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }

    if (next.company) saveCompany(next.company);
    return next;
  }, INITIAL);

  return (
    <AuthCard
      icon={Building2}
      step="1 / 2"
      title="워크스페이스 연결"
      description="회사에서 받은 기업 코드로 워크스페이스에 연결합니다"
      footer={
        <>
          아직 기업 코드가 없나요?{" "}
          <Link href="/register" className="text-foreground font-medium hover:underline">
            기업 등록 신청
          </Link>
        </>
      }
    >
      <form action={formAction} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company-code" className="flex items-center gap-1.5">
            <Building2 className="text-muted-foreground size-3.5" aria-hidden />
            <span>기업 코드</span>
          </Label>
          <Input
            id="company-code"
            name="companyCode"
            placeholder="예: NOVA-7K3D"
            autoComplete="organization"
            aria-invalid={state.error !== undefined}
            aria-describedby="company-code-help"
          />
          {/*
            ⚠️ 검증 오류는 토스트가 아니라 필드 아래 인라인이다(CLAUDE.md §토스트).
            ⚠️ 안내 문구("이메일로 받은 코드를 입력하세요")는 여기 두지 않는다 —
               카드 설명이 이미 같은 말을 한다. 같은 말이 두 번 있으면 둘 다 안 읽힌다.
               이 자리는 **오류 전용**이고, 자리만 미리 비워 카드 높이가 흔들리지 않게 한다.
          */}
          <p
            id="company-code-help"
            role="alert"
            className="text-destructive flex min-h-4 items-center gap-1.5 text-[12px] leading-4 break-keep"
          >
            {state.error && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
            <span>{state.error}</span>
          </p>
        </div>

        <SubmitButton>
          다음
          <ArrowRight className="size-4" />
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
