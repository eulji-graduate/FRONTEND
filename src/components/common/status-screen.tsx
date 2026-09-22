import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ZLogo } from "@/components/icons/z-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 이 화면들의 버튼은 **먹색 하나**다 — 파란 버튼은 액센트라 다른 뜻이 된다(§DESIGN 5). */
export const STATUS_ACTION_CLASS =
  "bg-foreground text-background hover:bg-foreground/90 h-11 gap-1.5 px-5 text-[13px]";

/** 화면을 못 여는 세 경우 — 숫자는 화면에 그대로 적는다 */
export type StatusCode = "401" | "403" | "404";

interface StatusScreenProps {
  /** 401·403·404에만 있다. 화면이 터진 것(오류)에는 붙일 숫자가 없다. */
  code?: StatusCode;
  /**
   * 표식 — 안 주면 **Z 로고**다(주소가 잘못된 경우: 서비스는 멀쩡하다).
   * 아이콘을 주면 둥근 사각형 안에 담는다(무언가 잘못된 경우: 빈 상태와 같은 표식).
   */
  mark?: LucideIcon;
  /** 무엇이 막혔는지 한 문장 — 마침표를 찍지 않는다(제목이다) */
  title: string;
  /** 왜 막혔고 다음에 무엇을 하면 되는지 */
  description: string;
  /** 나갈 문 하나. 막다른 길에 뒤로가기만 남기지 않는다(`StatusActionLink` 또는 버튼). */
  action: ReactNode;
  /**
   * 셸(사이드바·상단바) **안**에서 뜨는지.
   *
   * ⚠️ 켜면 화면 전체가 아니라 **남은 높이**를 채운다. 셸 본문은 `h-dvh overflow-hidden`인데
   *    그 안에서 `min-h-screen-z`를 두면 상단바(56px)만큼 아래가 잘리고 스크롤도 안 된다
   *    (`ScreenError`가 같은 함정을 맞고 남긴 기록이다).
   * ⚠️ 켜면 제목도 `h2`다. 위에 `PageHeader`의 `h1`이 남아 있어 한 페이지에 제목이 둘이 된다.
   */
  isInsideShell?: boolean;
}

/**
 * 401·403·404 — **세 화면이 한 벌이다.**
 *
 * ⚠️ 생김새를 하나로 묶는다(2026-08-11). 셋은 사용자 입장에서 같은 순간이다 — 가려던 곳에
 *    못 갔고, 지금 무엇을 해야 하는지 알아야 한다. 화면마다 다르게 생기면 그때마다 새로 읽어야 한다.
 * ⚠️ **숫자를 적는다.** 담당자에게 알릴 때 `404`라는 세 글자가 문장 열 줄보다 정확하다 —
 *    사내 도구라 화면을 보는 사람과 고치는 사람이 같은 회사에 있다.
 * ⚠️ **말투는 ~합니다체**다(CLAUDE.md §카피). 돈·권한·기록이 걸린 도구라 `못 찾았어요`처럼
 *    친근한 말은 가볍게 읽힌다. 명령은 `~해 주세요`.
 * ⚠️ 로고는 **셸 밖에서만 링크**다. 셸 안에서는 사이드바가 이미 갈 곳을 들고 있고,
 *    거기서 `/`로 보내면 로그인한 사람을 소개 페이지로 내보내게 된다.
 */
export function StatusScreen({
  code,
  mark: Mark,
  title,
  description,
  action,
  isInsideShell,
}: StatusScreenProps) {
  const Heading = isInsideShell ? "h2" : "h1";
  const logo = <ZLogo className="text-foreground size-8" title={isInsideShell ? undefined : "Z"} />;

  return (
    <main
      className={cn(
        "bg-background flex flex-col items-center justify-center gap-7 px-6 text-center",
        isInsideShell ? "min-h-0 flex-1" : "min-h-screen-z",
      )}
    >
      {Mark ? (
        /* 빈 상태(`EmptyState`)와 같은 표식이다 — 한 앱에서 "여기가 끝이다"는 한 모양으로 말한다 */
        <span
          className="bg-secondary text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-2xl"
          aria-hidden
        >
          <Mark className="size-6" strokeWidth={1.75} />
        </span>
      ) : isInsideShell ? (
        <span aria-hidden>{logo}</span>
      ) : (
        <Link href="/" aria-label="Z 홈으로" className="focus-visible:ring-ring rounded">
          {logo}
        </Link>
      )}

      <div className="flex flex-col gap-2.5">
        {/* 숫자는 제목보다 먼저 오되 작게 — 무엇이 막혔는지가 먼저 읽혀야 한다 */}
        {code && (
          <p className="text-muted-foreground/70 text-[13px] leading-5 tracking-[1.2px] tabular-nums">
            {code}
          </p>
        )}
        <Heading className="text-[30px] leading-9 font-semibold tracking-[-0.8px] break-keep">
          {title}
        </Heading>
        {/* ⚠️ 읽는 글은 좁게 둔다(§DESIGN 4) — 가운데 정렬이라 한 줄이 길면 눈이 다음 줄을 못 찾는다 */}
        <p className="text-muted-foreground max-w-[420px] text-[13px] leading-6 break-keep">
          {description}
        </p>
      </div>

      {action}
    </main>
  );
}

/** 세 화면이 같은 문을 쓴다 — 버튼 생김새를 화면마다 적지 않는다. */
export function StatusActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(buttonVariants(), STATUS_ACTION_CLASS)}>
      {label}
    </Link>
  );
}
