"use client";

import { ScreenError } from "@/components/common/screen-error";

interface BoardErrorProps {
  reset: () => void;
}

export default function Error({ reset }: BoardErrorProps) {
  // 셸(상단바 h1) 안에서 뜨므로 isInsideShell — h1 중복·높이 잘림을 막는다
  return <ScreenError title="보드를 불러오지 못했습니다" reset={reset} isInsideShell />;
}
