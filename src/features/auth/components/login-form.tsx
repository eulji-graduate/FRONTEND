"use client";

import { AlertCircle, Building2, Eye, EyeOff, Info, KeyRound, Mail } from "lucide-react";
import { useActionState, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginState } from "../actions";
import { clearCompany, useSavedCompany } from "../company-code";
import { AuthCard } from "./auth-card";
import { CompanyCodeStep } from "./company-code-step";
import { FindPasswordStep } from "./find-password-step";
import { SubmitButton } from "./submit-button";

/**
 * 로그인 — 기업 코드를 먼저 확인하고 그 다음 계정을 받는다(카카오워크 문법).
 *
 * ⚠️ 두 단계를 **한 화면 안에서** 바꾼다. 주소를 나누면 뒤로가기가 어색해지고,
 *    기억된 코드로 들어온 사람은 1단계를 볼 일이 없다.
 * ⚠️ 검증도 로그인도 **Server Action**이 한다(`loginAction`). 화면은 목인지 실서버인지 모른다.
 * ⚠️ **로그인 API가 아직 없다.** 검증을 통과해도 갈 데가 없는데, 그때 조용히 아무것도 안 하면
 *    사용자는 비밀번호가 틀린 줄 안다 — 액션이 안내를 돌려주고 여기서 보여 준다(§정직성).
 * ⚠️ **비밀번호 찾기는 같은 화면 안의 세 번째 단계다**(2026-08-14 — 이전엔 화면이 없어
 *    안내 문구만 뒀는데, BE가 `POST /api/auth/password/reset`을 열어 화면을 만들었다).
 *    주소를 안 바꾸는 건 위 두 단계와 같은 이유다.
 */
const INITIAL: LoginState = { errors: {}, attempt: 0 };
export function LoginForm() {
  // 기억해 둔 회사가 있으면 1단계를 건너뛴다
  const company = useSavedCompany();
  const [view, setView] = useState<"login" | "find-password">("login");

  const [isPasswordShown, setIsPasswordShown] = useState(false);
  /*
    ⚠️ 브라우저 기본 검증(`required` + 말풍선)을 쓰지 않는다. 회색 말풍선이 우리 화면 위에
       떠서 디자인이 깨지고, 문구도 우리가 못 고친다. `noValidate`로 끄고 **필드 아래 인라인**으로
       직접 알린다(CLAUDE.md §토스트: 폼 검증 오류는 필드 인라인).
  */
  const [state, formAction] = useActionState(loginAction, INITIAL);
  const loginErrors = state.errors;

  const handleChangeCompany = () => clearCompany();

  if (!company) return <CompanyCodeStep />;
  if (view === "find-password") {
    return <FindPasswordStep company={company} onBack={() => setView("login")} />;
  }

  return (
    <AuthCard icon={KeyRound} step="2 / 2" title="로그인">
      {/* ⚠️ 필드마다 오류 자리(min-h-4)를 비워 두므로 간격을 좁게 잡는다 — 안 그러면 두 배로 벌어진다 */}
      <form action={formAction} noValidate className="flex flex-col gap-1.5">
        {/*
          ⚠️ 로그인은 **기업 코드까지 세 값**으로 한다(BE `LoginRequest`). 1단계에서 확인한
             코드는 브라우저에만 있으므로(`useSavedCompany`) 숨은 칸으로 실어 보낸다 —
             없으면 액션이 회사를 다시 고르라고 답한다.
        */}
        <input type="hidden" name="companyCode" value={company.code} />
        {/* 어느 회사로 들어가는지 — 코드를 다시 보여주는 대신 회사를 보여준다 */}
        {/* ⚠️ 아래 필드들은 오류 자리(min-h-4)만큼 이미 벌어져 있다 — 이 카드에만 여백을 더해 맞춘다 */}
        <div className="border-border bg-secondary mb-5 flex items-center gap-3 rounded-lg border px-3.5 py-3">
          <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Building2 className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-5 font-medium">{company.name}</span>
            <span className="text-muted-foreground block truncate text-[11px] leading-4 tracking-[0.5px]">
              {company.code}
            </span>
          </span>
          <button
            type="button"
            onClick={handleChangeCompany}
            className="text-primary focus-visible:ring-ring shrink-0 rounded text-[12px] leading-4 hover:underline focus-visible:ring-2 focus-visible:outline-hidden"
          >
            변경
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="flex items-center gap-1.5">
            <Mail className="text-muted-foreground size-3.5" aria-hidden />
            <span className="translate-y-px">이메일</span>
          </Label>
          <Input
            id="email"
            key={`email-${state.attempt}`}
            name="email"
            type="email"
            defaultValue={state.email}
            placeholder="name@company.com"
            autoComplete="email"
            aria-invalid={loginErrors.email !== undefined}
            aria-describedby="email-error"
          />
          {/*
            ⚠️ 오류 줄은 **자리를 미리 비워 둔다**(`min-h`). 뜰 때만 넣으면 카드 높이가
               그만큼 늘었다 줄어 화면이 출렁인다 — 검증 하나에 레이아웃이 흔들리면 안 된다.
          */}
          <p
            id="email-error"
            role="alert"
            className="text-destructive flex min-h-4 items-center gap-1.5 text-[12px] leading-4"
          >
            {loginErrors.email && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
            <span className="translate-y-px">{loginErrors.email}</span>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="flex items-center gap-1.5">
            <KeyRound className="text-muted-foreground size-3.5" aria-hidden />
            <span className="translate-y-px">비밀번호</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={isPasswordShown ? "text" : "password"}
              placeholder="비밀번호를 입력해 주세요"
              autoComplete="current-password"
              className="pr-10"
              aria-invalid={loginErrors.password !== undefined}
              aria-describedby="password-error"
            />
            <button
              type="button"
              onClick={() => setIsPasswordShown((shown) => !shown)}
              aria-label={isPasswordShown ? "비밀번호 숨기기" : "비밀번호 보기"}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 focus-visible:ring-2 focus-visible:outline-hidden"
            >
              {isPasswordShown ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
          <p
            id="password-error"
            role="alert"
            className="text-destructive flex min-h-4 items-center gap-1.5 text-[12px] leading-4"
          >
            {loginErrors.password && <AlertCircle className="size-3.5 shrink-0" aria-hidden />}
            <span className="translate-y-px">{loginErrors.password}</span>
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[12px] leading-4">
            {/* 체크값은 서버가 쿠키 수명(`maxAge`)을 정할 때 쓴다 — 연동되면 액션이 읽는다 */}
            <input
              type="checkbox"
              name="keepSignedIn"
              className="border-border accent-foreground size-3.5 rounded border"
              defaultChecked
            />
            <span className="translate-y-px">로그인 상태 유지</span>
          </label>
          <button
            type="button"
            onClick={() => setView("find-password")}
            className="text-muted-foreground/70 focus-visible:ring-ring rounded text-[11px] leading-4 hover:underline focus-visible:ring-2 focus-visible:outline-hidden"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <SubmitButton>로그인</SubmitButton>

        {/*
          ⚠️ 로그인 실패는 **칸 옆이 아니라 버튼 아래**다. BE가 아이디·비밀번호 어느 쪽이
             틀렸는지 가르지 않으므로(둘 다 `LOGIN_FAILED`) 어느 칸에도 붙일 수 없다 —
             한쪽에 붙이면 "이 주소는 있는 계정"이라고 알려주는 셈이 된다.
        */}
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

        {/*
          ⚠️ 여기까지가 지금 갈 수 있는 끝이다. **말해 주지 않으면 사용자는 실패로 오해한다** —
             빨강(오류)이 아니라 안내 색으로, 버튼 아래에 둔다(§정직성).
        */}
        {state.notice && (
          <p
            role="status"
            className="border-border bg-secondary text-muted-foreground mt-3 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep"
          >
            <span className="flex h-[18px] shrink-0 items-center">
              <Info className="size-3.5" aria-hidden />
            </span>
            {state.notice}
          </p>
        )}
      </form>
    </AuthCard>
  );
}
