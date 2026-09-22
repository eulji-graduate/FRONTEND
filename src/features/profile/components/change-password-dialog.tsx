"use client";

import { CircleAlert, Eye, EyeOff } from "lucide-react";
import {
  type FormEvent,
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { changePasswordAction, type ChangePasswordState } from "../actions";
import { PASSWORD_FORMAT_ERROR, PASSWORD_PATTERN, PASSWORD_POLICY_HINTS } from "../password";

const INITIAL_STATE: ChangePasswordState = { errors: {}, attempt: 0 };

interface PasswordDraft {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

const EMPTY_DRAFT: PasswordDraft = { currentPassword: "", newPassword: "", newPasswordConfirm: "" };

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 마이페이지 비밀번호 변경 — `PATCH /api/auth/me/password`(2026-08-14 담당자 문서).
 *
 * ⚠️ **외부에서 열림 상태를 받는다**(2026-08-19 — 트리거가 프로필 머리의 "⋯" 메뉴
 *    (`profile-actions-menu.tsx`)로 옮겨서 이 컴포넌트가 직접 버튼을 그릴 필요가 없다.
 *    `room-edit-dialog.tsx`와 같은 골격이다).
 * ⚠️ **공용 `ConfirmDialog`를 쓴다**(같은 날 — "저 모달은 Z 있는 공용 모달이 아니잖아"라는
 *    지적). 전엔 이 창만 맨몸 `Dialog`라 확인 창·완료 창과 다른 물건처럼 보였다 —
 *    표식(`DialogMark`)·제목·설명·버튼 배치를 전부 `ConfirmDialog`에 맡기고, 세 입력칸은
 *    `children`으로 얹는다. 실행은 `formRef.current?.requestSubmit()`으로 감춘 폼을 대신 낸다.
 * ⚠️ **꼭 3칸이다.** "새 비밀번호 + 확인" 두 칸만 두면 토큰만 훔친 사람이 계정을 가져갈 수
 *    있어 서버가 애초에 거절한다 — 현재 비밀번호 칸을 빼지 않는다.
 * ⚠️ 성공하면 액션이 스스로 `/login`으로 보낸다(모든 기기 로그아웃) — 여기서는 닫을 필요가
 *    없다. 실패만 이 다이얼로그에 남는다.
 * ⚠️ **`<form action={...}>`을 안 쓴다.** 그 방식은 액션이 끝나면 폼을 통째로 리셋하는데,
 *    실패해도 세 칸이 전부 비워져 처음부터 다시 적어야 했다 — 이 폼은 값을 직접 들고 있다가
 *    (`draft`) 실패하면 그대로 두고, `formAction`은 `ConfirmDialog`의 [변경] 클릭에서 불린다.
 * ⚠️ **값을 들고 있어야 실시간 일치 판정도 된다.** 새 비밀번호·확인 두 칸을 다 아는 채로
 *    타이핑마다 비교해야 제출 전에 알려줄 수 있다 — 서버 왕복 없이 그 자리에서 본다.
 */
export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [state, formAction, isPending] = useActionState(changePasswordAction, INITIAL_STATE);
  const [draft, setDraft] = useState<PasswordDraft>(EMPTY_DRAFT);
  const formRef = useRef<HTMLFormElement>(null);
  /*
    ⚠️ **세 칸을 따로 토글한다.** 하나로 묶으면 현재 비밀번호를 확인하려고 켰을 뿐인데
       새 비밀번호 두 칸까지 같이 드러난다 — 로그인 화면(`LoginForm`)과 같은 눈 아이콘
       패턴이되, 칸마다 독립된 상태를 갖는다.
  */
  const [isCurrentShown, setCurrentShown] = useState(false);
  const [isNewShown, setNewShown] = useState(false);
  const [isConfirmShown, setConfirmShown] = useState(false);
  /*
    ⚠️ **칸 밖 오류(`ConfirmDialog`의 `error`)는 열 때마다 지운다.** `useActionState`는
       이 컴포넌트가 계속 떠 있는 한(메뉴로 다시 여는 것만으론 안 사라진다) 지난 실패를
       그대로 들고 있다 — 전엔 토스트라 한 번 뜨고 사라져 무해했는데, 이제 칸 안에
       계속 박아 두면 다시 열었을 때 "아직 아무것도 안 눌렀는데" 실패 문구부터 보인다.
       이번에 연 뒤로 **새 시도**(`attempt`가 늘어난 것)가 없으면 안 보여 준다.
    ⚠️ **`ref`가 아니라 `state`로 든다.** 렌더 중에 `ref.current`를 읽으면 안 된다(React
       규칙) — 이 값은 렌더 결과(보일 오류)를 결정하는 값이라 애초에 state여야 한다.
  */
  const [dismissedAttempt, setDismissedAttempt] = useState(state.attempt);
  /*
    ⚠️ **칸별 오류도 "고치는 순간" 지운다**(2026-08-19 — "기업 신청처럼 안 맞으면 빨간색,
       맞으면 사라지고" — `register-form.tsx`의 `fixed` 패턴을 그대로 가져온다). 서버가
       돌려준 오류를 로컬 상태로 복사하지 않는다(그러려면 효과가 필요하고 렌더가 한 번
       더 돈다) — 대신 "고친 칸" 이름만 기억해 두고 그 칸의 오류를 가린다.
  */
  const [fixed, setFixed] = useState<ReadonlySet<string>>(new Set());

  // 닫는 경로(취소·ESC·바깥 클릭) 전부 여기로 모은다 — 한 곳만 고치면 전부 반영된다.
  const handleClose = () => {
    if (isPending) return;
    onOpenChange(false);
    setDraft(EMPTY_DRAFT);
  };

  /*
    ⚠️ **열릴 때마다 지난 시도 흔적을 지운다.** 메뉴로 다시 열었을 때 저번 실패가
       그대로 남아 있으면 아직 아무것도 안 적었는데 오류부터 보인다.
  */
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(EMPTY_DRAFT);
      setDismissedAttempt(state.attempt);
      setFixed(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visibleError = state.attempt > dismissedAttempt ? state.error : undefined;

  /** 고치는 순간 그 칸의 서버 오류는 감춘다 — 다 고칠 때까지 빨간 글씨를 남겨 둘 이유가 없다 */
  const markFixed = (field: string) => setFixed((prev) => new Set(prev).add(field));
  const errorOf = (field: keyof ChangePasswordState["errors"]) =>
    fixed.has(field) ? undefined : state.errors[field];

  /*
    ⚠️ **확인칸이 비었으면 아무 말도 안 한다** — 아직 아무것도 안 적은 사람에게 "일치하지
       않습니다"부터 보이면 오류로 시작하는 폼이 된다. 뭐라도 적은 뒤부터 그때그때 비교한다.
  */
  const confirmMatch =
    draft.newPasswordConfirm.length === 0 ? null : draft.newPassword === draft.newPasswordConfirm;

  /*
    ⚠️ **새 비밀번호는 제출 전에도 그 자리에서 본다**(2026-08-19 — "뭔가 쳤는데 안 맞으면
       바로 빨갛게"). 서버 왕복(제출) 없이 같은 정규식(`PASSWORD_PATTERN`)으로 타이핑마다
       맞는지 본다 — "확인" 칸의 실시간 일치 판정과 같은 자리다. 비었으면 `null`(아직 아무
       말도 안 함), 적었는데 규칙에 안 맞으면 `false`다.
  */
  const newPasswordLiveValid =
    draft.newPassword.length === 0 ? null : PASSWORD_PATTERN.test(draft.newPassword);
  /*
    ⚠️ **서버 오류가 우선이다** — "확인" 칸과 같은 규칙(줄 아래 주석 참고). 서버가 방금
       돌려준 문구(예: 이전 비밀번호 재사용)가 있으면 그걸 보여주고, 없으면 타이핑 중
       실시간 형식 판정을 보여준다.
  */
  const newPasswordError =
    errorOf("newPassword") ?? (newPasswordLiveValid === false ? PASSWORD_FORMAT_ERROR : undefined);

  /*
    ⚠️ **"확인" 칸도 같은 규칙 — 서버 오류 우선, 없으면 실시간 일치 판정.** 문구는
       `confirmMatch`가 이미 갖고 있으니 여기서 하나로 합쳐 자리를 늘 갖고 있는
       `<p>` 하나에만 넣는다(아래 렌더).
  */
  const confirmError = errorOf("newPasswordConfirm");
  const confirmMessage =
    confirmError ??
    (confirmMatch === false
      ? "비밀번호가 일치하지 않습니다"
      : confirmMatch === true
        ? "비밀번호가 일치합니다"
        : undefined);
  const confirmIsBad = Boolean(confirmError) || confirmMatch === false;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFixed(new Set()); // 다시 제출했으니 가려 뒀던 오류를 되살린다(새 결과가 곧 온다)
    const formData = new FormData();
    formData.set("currentPassword", draft.currentPassword);
    formData.set("newPassword", draft.newPassword);
    formData.set("newPasswordConfirm", draft.newPasswordConfirm);
    /*
      ⚠️ **트랜지션 안에서 부른다**(2026-08-19 — 콘솔에 "useActionState was called outside
         of a transition" 경고가 떴고, 실제로 실패 문구(`ConfirmDialog`의 `error`)가 안
         떴다). `useActionState`의 디스패치는 `<form action>`으로 자동 걸릴 때만
         트랜지션을 두르는데, 여기서는 손으로 부르는 자리라 감싸지 않으면 `isPending`도
         `state` 갱신도 온전히 안 됐다.
    */
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <ConfirmDialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) {
          handleClose();
          return;
        }
        onOpenChange(true);
      }}
      title="비밀번호를 변경할까요?"
      description="변경하면 모든 기기에서 로그아웃됩니다."
      confirmLabel="변경"
      pendingLabel="변경 중"
      isPending={isPending}
      error={visibleError}
      onConfirm={() => formRef.current?.requestSubmit()}
    >
      {/*
        ⚠️ **`noValidate`가 있어야 한다**(2026-08-19 — 브라우저 기본 말풍선("이 입력란을
           작성하세요")이 우리 오류 상자 대신 떴다). `register-form.tsx`가 이미 정해 둔
           규칙이다: 검증은 `required` 말풍선이 아니라 `noValidate` + 필드 인라인으로
           한다 — 안 그러면 빈 칸 그대로 [변경]을 누를 때 우리 자리(`ConfirmDialog`의
           오류)가 아니라 브라우저가 골라 준 자리에 회색 말풍선이 뜬다.
      */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 text-left"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">현재 비밀번호</Label>
          <div className="relative">
            <Input
              id="current-password"
              name="currentPassword"
              type={isCurrentShown ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pr-10"
              value={draft.currentPassword}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, currentPassword: event.target.value }));
                markFixed("currentPassword");
              }}
              aria-describedby={errorOf("currentPassword") ? "current-password-error" : undefined}
              aria-invalid={errorOf("currentPassword") ? true : undefined}
            />
            <PasswordVisibilityToggle
              isShown={isCurrentShown}
              onToggle={() => setCurrentShown((shown) => !shown)}
            />
          </div>
          {/*
            ⚠️ **자리를 늘 갖고 있는다**(2026-08-19 — "그 칸, 안 떴을 때도 배치해서 안
               커지게"라는 지적. `ConfirmDialog`의 칸 밖 오류와 같은 이유·같은 값(`min-h-4`
               = `leading-4`와 같은 16px)이다). 조건부로 통째로 넣고 빼면 오류가 뜨는
               순간 그 아래 칸들이 전부 밀려 내려간다 — 늘 한 줄 자리를 잡아 두고
               내용만 있고 없고를 가른다.
          */}
          <p
            id="current-password-error"
            className="text-destructive flex min-h-4 items-center gap-1 text-[12px] leading-4"
          >
            {errorOf("currentPassword") && (
              <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            )}
            {errorOf("currentPassword")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">새 비밀번호</Label>
          <div className="relative">
            <Input
              id="new-password"
              name="newPassword"
              type={isNewShown ? "text" : "password"}
              autoComplete="new-password"
              maxLength={16}
              required
              className="pr-10"
              value={draft.newPassword}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, newPassword: event.target.value }));
                markFixed("newPassword");
              }}
              aria-describedby="new-password-hints new-password-error"
              aria-invalid={newPasswordError ? true : undefined}
            />
            <PasswordVisibilityToggle
              isShown={isNewShown}
              onToggle={() => setNewShown((shown) => !shown)}
            />
          </div>
          {/* ⚠️ 자리를 늘 갖고 있는다 — 위 "현재 비밀번호" 칸과 같은 이유(§min-h-4) */}
          <p
            id="new-password-error"
            className="text-destructive flex min-h-4 items-center gap-1 text-[12px] leading-4"
          >
            {newPasswordError && <CircleAlert className="size-3.5 shrink-0" aria-hidden />}
            {newPasswordError}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password-confirm">새 비밀번호 확인</Label>
          <div className="relative">
            <Input
              id="new-password-confirm"
              name="newPasswordConfirm"
              type={isConfirmShown ? "text" : "password"}
              autoComplete="new-password"
              maxLength={16}
              required
              className="pr-10"
              value={draft.newPasswordConfirm}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, newPasswordConfirm: event.target.value }));
                markFixed("newPasswordConfirm");
              }}
              aria-describedby="new-password-confirm-hint"
              aria-invalid={confirmIsBad ? true : undefined}
            />
            <PasswordVisibilityToggle
              isShown={isConfirmShown}
              onToggle={() => setConfirmShown((shown) => !shown)}
            />
          </div>
          {/*
            ⚠️ **서버 오류가 우선이다.** 방금 제출해서 돌아온 문구가 있으면 그걸 보여주고,
               없으면 타이핑 중 실시간 판정을 보여준다 — 같은 뜻의 줄이 두 개 뜨지 않는다.
               (제출 전 클라이언트 검증이 같은 조건을 이미 막아서, 둘이 실제로 어긋날 일은 없다.)
            ⚠️ 자리를 늘 갖고 있는다 — 다른 두 칸과 같은 이유(§min-h-4).
          */}
          <p
            id="new-password-confirm-hint"
            className={cn(
              "flex min-h-4 items-center gap-1 text-[12px] leading-4",
              confirmIsBad ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {confirmIsBad && <CircleAlert className="size-3.5 shrink-0" aria-hidden />}
            {confirmMessage}
          </p>
        </div>

        {/*
          ⚠️ **세 칸 맨 아래로 내린다**(2026-08-19 재배치 — "새 비밀번호 확인 밑이 좋을
             것 같다"는 지적). 전엔 "새 비밀번호" 칸 바로 밑이라 그 아래 "새 비밀번호 확인"
             칸이 오히려 규칙과 입력 사이에 끼는 모양이었다 — 세 칸을 다 채운 뒤 마지막으로
             확인하는 자리가 맞다.
          ⚠️ **한 줄로 흘려보낸다.** 네 문장을 세로로 쌓으면 폼 한가운데 문단이 하나 더
             생긴 것처럼 보였다 — 가운뎃점으로 이어 **캡션 한 줄**(좁으면 자연스럽게
             접힘)로 읽히게 한다.
          ⚠️ `id`는 그대로 `new-password-hints`다 — "새 비밀번호" 칸의
             `aria-describedby`가 이 값을 그대로 가리킨다. 화면에서 눈으로 보이는 자리와
             스크린리더가 그 칸을 설명할 때 읽는 자리가 같은 요소일 필요는 없다.
        */}
        <p
          id="new-password-hints"
          className="text-muted-foreground text-[12px] leading-4 break-keep"
        >
          {PASSWORD_POLICY_HINTS.join(" · ")}
        </p>
      </form>
    </ConfirmDialog>
  );
}

/** 눈 아이콘 토글 — `LoginForm`의 비밀번호 칸과 같은 자리·같은 문구다(일관성). */
function PasswordVisibilityToggle({
  isShown,
  onToggle,
}: {
  isShown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isShown ? "비밀번호 숨기기" : "비밀번호 보기"}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 focus-visible:ring-2 focus-visible:outline-hidden"
    >
      {isShown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
    </button>
  );
}
