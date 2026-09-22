"use client";

import { KeyRound, LogOut, MoreVertical } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/actions";

import { ChangePasswordDialog } from "./change-password-dialog";

/**
 * 프로필 머리의 "⋯" 메뉴 — 비밀번호 변경·로그아웃을 한데 묶는다.
 *
 * ⚠️ **버튼 둘을 나란히 두지 않는다**(2026-08-19 — "손으로 그린 로그아웃 버튼이 옆
 *    [비밀번호 변경]과 미묘하게 다르다"는 지적에 이어, 아예 하나로 묶어 달라는 요청).
 *    회의실 행의 "⋯" 메뉴(`room-row-actions.tsx`)와 같은 골격 — 트리거는 이 메뉴
 *    하나뿐이고, 실제 동작(비밀번호 변경 창·로그아웃)은 항목을 골라야 시작된다.
 * ⚠️ **로그아웃은 감춘 폼을 대신 낸다.** `logoutAction`은 `<form action>`으로만 부를 수
 *    있는 서버 액션이라, 메뉴 항목 클릭에서 `formRef.current?.requestSubmit()`으로
 *    그 폼을 대신 제출한다 — 화면에는 메뉴 항목만 보인다.
 * ⚠️ **`LogoutButton`을 재사용하지 않는다.** 그 컴포넌트는 자기 모양(테두리 버튼)을
 *    직접 그리는 독립 버튼이라 구독 정지 화면(`subscription-blocked-dialog.tsx`)이
 *    그대로 쓴다 — 메뉴 항목은 아이콘·글자만 있으면 되는 다른 모양이라 여기서 새로 그린다.
 */
export function ProfileActionsMenu() {
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const logoutFormRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="outline" size="icon" aria-label="계정 관리">
              <MoreVertical aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
            <KeyRound aria-hidden />
            비밀번호 변경
          </DropdownMenuItem>
          {/*
            ⚠️ **확인 창을 안 띄운다**(`logout-button.tsx`와 같은 이유) — 되돌릴 수 없는 일이
               아니라 다시 로그인하면 그만이다.
          */}
          <DropdownMenuItem onClick={() => logoutFormRef.current?.requestSubmit()}>
            <LogOut aria-hidden />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ⚠️ 화면에 안 그린다 — 로그아웃 메뉴 항목 클릭이 이 폼을 대신 제출한다 */}
      <form ref={logoutFormRef} action={logoutAction} className="hidden" aria-hidden />

      <ChangePasswordDialog open={isPasswordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </>
  );
}
