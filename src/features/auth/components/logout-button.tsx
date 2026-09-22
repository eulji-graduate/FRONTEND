"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

import { logoutAction } from "../actions";

/**
 * 로그아웃 — 마이페이지 프로필 줄 오른쪽 끝.
 *
 * ⚠️ **나갈 문이 없으면 안 된다.** 로그인이 붙기 전에는 나갈 데도 없어서 이 버튼이 없었는데,
 *    세션이 붙은 지금은 한번 들어오면 쿠키가 만료될 때까지 못 나간다 — 공용 PC에서 특히 나쁘다.
 * ⚠️ 확인 창을 띄우지 않는다. 되돌릴 수 없는 일이 아니라 **다시 로그인하면 그만**이다 —
 *    무게가 다른 일에 같은 창을 쓰면 진짜 위험한 창이 가벼워진다(§DECISIONS 확인창).
 * ⚠️ `<form action={서버액션}>`이라 JS가 아직 안 붙은 순간에도 눌린다.
 */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton />
    </form>
  );
}

/*
  ⚠️ **공용 `Button`을 쓴다**(2026-08-19 — "옆의 [비밀번호 변경]이랑 너무 다르다"는 지적).
     손으로 그린 버튼이라 모서리(`rounded-md` vs `rounded-lg`)·안쪽 여백(`px-3` vs
     `px-2.5`)·글자 크기(`text-[12px]` vs `text-sm`)가 미묘하게 달라 나란히 두면 서로
     다른 버튼 계열처럼 보였다 — `variant="outline"`으로 옆 버튼과 같은 값을 쓴다.
*/
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" disabled={pending}>
      <LogOut aria-hidden />
      {pending ? "로그아웃 중" : "로그아웃"}
    </Button>
  );
}
