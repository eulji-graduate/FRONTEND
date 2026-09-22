"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

import { STATUS_ACTION_CLASS, StatusScreen } from "@/components/common/status-screen";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 화면을 못 불러왔을 때 쓰는 공용 오류 화면.
 *
 * ⚠️ 조용히 빈 화면을 보여주지 않는다(CLAUDE.md §정직성). 무엇을 못 불러왔는지 말하고
 *    다시 시도할 길을 준다.
 * ⚠️ **401·403·404와 한 벌이다**(`StatusScreen`, 2026-08-11). 넷은 사용자에게 같은 순간이다 —
 *    가려던 곳에 못 갔고, 지금 무엇을 해야 하는지 알아야 한다. 화면마다 다르게 생기면
 *    그때마다 새로 읽어야 한다.
 * ⚠️ **붙일 숫자가 없다.** 404·403은 서버가 정한 답이지만 이건 그리다 터진 것이라, 숫자를
 *    지어내지 않고 표식(⚠)만 둔다.
 * ⚠️ 여기서는 셸을 **그리지** 않는다. 셸이 터졌을 수도 있어서 이 화면만은 아무것에도 기대지 않는다.
 *    다만 셸 **안**에서 뜰 수는 있다(라우트가 셸 아래면 상단바가 그대로 남는다) —
 *    그때는 `isInsideShell`로 높이와 제목 층위를 바꾼다.
 * ⚠️ `console`은 커밋 금지다 — 오류 수집 경로가 정해지면 그때 붙인다.
 */
interface ScreenErrorProps {
  /** 무엇을 못 불러왔는지 — 화면마다 다르다 */
  title: string;
  reset: () => void;
  /**
   * 셸(사이드바·상단바) **안**에서 뜨는 오류인지.
   *
   * ⚠️ 켜면 화면 전체가 아니라 **남은 높이**를 채운다. 셸 본문은 `h-dvh overflow-hidden`인데
   *    그 안에서 상단바(56px) 다음에 `min-h-dvh`를 두면 `56 + 100dvh`가 되어
   *    **아래 56px이 잘리고**(스크롤도 안 된다) 카드가 그만큼 아래로 밀린다.
   * ⚠️ 셸 밖(온보딩·`/subscription`·public)에서는 **끈 채로 둔다.**
   * ⚠️ **`(shell)`뿐 아니라 `(system)`도 셸이다.** 두 레이아웃 다 `flex h-dvh overflow-hidden`에
   *    `PageHeader`(56px)를 얹는 같은 구조라, 라우트 그룹 이름이 아니라 **위에 상단바가 남는지**로
   *    판단한다. 그룹 이름으로 외우면 셸이 하나 더 생길 때 똑같이 잘린다.
   */
  isInsideShell?: boolean;
}

export function ScreenError({ title, reset, isInsideShell }: ScreenErrorProps) {
  return (
    <StatusScreen
      mark={TriangleAlert}
      title={title}
      description="잠시 후 다시 시도해 주세요. 계속 안 되면 담당자에게 알려 주세요."
      isInsideShell={isInsideShell}
      action={
        /*
          ⚠️ **먹색이다.** 기본 버튼(파랑)은 액센트라 "여기를 눌러 나아가라"는 다른 뜻이 되고,
             화면에서 유일한 색이 되어 오류보다 버튼이 먼저 읽힌다(§DESIGN 5).
        */
        <Button type="button" onClick={reset} className={cn(STATUS_ACTION_CLASS)}>
          <RotateCw />
          다시 시도
        </Button>
      }
    />
  );
}
