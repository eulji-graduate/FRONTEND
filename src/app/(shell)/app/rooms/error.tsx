"use client";

import { ScreenError } from "@/components/common/screen-error";

interface RoomsErrorProps {
  reset: () => void;
}

export default function Error({ reset }: RoomsErrorProps) {
  return <ScreenError title="회의실 정보를 불러오지 못했습니다" reset={reset} isInsideShell />;
}
