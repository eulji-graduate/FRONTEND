"use client";

import { CircleAlert } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { Invite } from "../types";
import { INVITE_COLUMN } from "./invite-columns";

interface InviteRowFieldsProps {
  invite: Invite;
  /** 목록에서 몇 번째인지(0부터). 화면에는 1부터 보여준다. */
  index: number;
  /** 그 줄에 띄울 오류 문구 — 없으면 문구 칸만 자리를 지킨다 */
  errorText: string | null;
  errorId?: string;
  /** 안내 글자를 띄울지 — **첫 줄에만** 켠다 */
  hasPlaceholder: boolean;
  onChangeName: (id: string, name: string) => void;
  onChangeEmail: (id: string, email: string) => void;
}

/**
 * 한 줄에서 **직접 적어 넣는 칸들** — 번호 · 이름 · 주소 · 오류 문구.
 *
 * ⚠️ 이름이 **먼저**다. 목록을 훑을 때 사람을 먼저 찾지 주소를 먼저 찾지 않는다 —
 *    회사 메일이 `dev01@`처럼 이름과 무관한 경우가 흔하다.
 */
export function InviteRowFields({
  invite,
  index,
  errorText,
  errorId,
  hasPlaceholder,
  onChangeName,
  onChangeEmail,
}: InviteRowFieldsProps) {
  return (
    <>
      {/* 2단계와 같은 번호 칸. 초대는 순서에 의미가 없어 드래그 손잡이는 두지 않는다 */}
      <span className="text-muted-foreground/40 w-5 shrink-0 text-center text-[12px] leading-none tabular-nums">
        {index + 1}
      </span>

      {/*
        이름은 세 글자가 대부분이다 — 칸이 넓으면 가운데 글자만 뜨고 양옆이 비어,
        옆 선택 칸(글자가 칸을 거의 채운다)과 견줘 이 칸만 헐거워 보인다.
      */}
      <span className={cn(INVITE_COLUMN.NAME, "shrink-0")}>
        <label htmlFor={`invite-name-${invite.id}`} className="sr-only">
          받는 사람 이름
        </label>
        <Input
          id={`invite-name-${invite.id}`}
          autoComplete="off"
          value={invite.name}
          placeholder={hasPlaceholder ? "이름" : undefined}
          onChange={(event) => onChangeName(invite.id, event.target.value)}
          className={cn(
            /*
              ⚠️ 옆의 선택 칸과 **같은 모양**을 쓴다(테두리 · 둥근 모서리 · 같은 높이).
                 전에는 테두리 없이 글자만 떠 있어서, 알약처럼 생긴 선택 칸들과 따로 놀았다.
            */
            "border-input h-8 w-full min-w-0 rounded-lg bg-transparent px-2.5 text-[13px] shadow-none",
            // ⚠️ 이름만 가운데 정렬이다 — 칸이 좁아(68px) 글자가 왼쪽에 붙으면
            //    머리글 `이름`과 세로축이 어긋나 열이 밀려 보인다. 주소는 길어서 왼쪽 정렬을 유지한다.
            "placeholder:text-muted-foreground/45 text-center",
          )}
        />
      </span>

      {/*
        이메일.
        ⚠️ `flex-1`로 두면 넓은 화면에서 이 칸만 끝없이 늘어나 오른쪽 선택 칸들과 사이가 벌어진다.
           **폭을 정해 두고** 남는 자리는 옆 문구 칸이 먹게 한다.
      */}
      <span
        className={cn(
          INVITE_COLUMN.EMAIL,
          "ml-1 shrink-0",
          errorText && INVITE_COLUMN.EMAIL_WITH_MESSAGE,
        )}
      >
        <label htmlFor={`invite-email-${invite.id}`} className="sr-only">
          초대할 메일 주소
        </label>
        <Input
          id={`invite-email-${invite.id}`}
          type="email"
          inputMode="email"
          // ⚠️ 예시에 **사람 이름을 쓰지 않는다**(`hong.gildong@`) — 실제 사원 주소로 읽힌다.
          //    짧은 예시(`name@`)는 들어올 주소보다 훨씬 짧아 칸이 남아 보이므로 길이는 이만큼 둔다.
          placeholder={hasPlaceholder ? "example@z-groupware.site" : undefined}
          autoComplete="off"
          value={invite.email}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChangeEmail(invite.id, event.target.value)}
          className={cn(
            "border-input placeholder:text-muted-foreground/45 h-8 w-full min-w-0 rounded-lg bg-transparent px-2.5 text-[13px] shadow-none",
            errorText && "border-destructive/60",
          )}
        />
      </span>

      {/* 문구 자리 — 남는 폭을 그대로 쓴다. 비어 있어도 자리를 지킨다 */}
      <span className={cn(INVITE_COLUMN.MESSAGE, "flex min-w-0 items-center")}>
        {errorText && (
          /*
            ⚠️ 자리가 모자라면 **잘린다**(`truncate`). 안 자르면 오른쪽 부서 칸 위로 글자가 겹쳐
               두 열이 뒤엉킨다 — 실제로 `부서·직급을 골라 주세요`가 부서 칸을 파고들었다.
               전체 문구는 `title`로 읽는다.
          */
          <span
            id={errorId}
            className="text-destructive flex min-w-0 items-center gap-1 text-[12px] leading-4"
            title={errorText}
          >
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{errorText}</span>
          </span>
        )}
      </span>
    </>
  );
}
