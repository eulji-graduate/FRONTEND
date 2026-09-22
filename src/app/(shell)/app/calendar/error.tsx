"use client";

import { ScreenError } from "@/components/common/screen-error";

interface CalendarErrorProps {
  reset: () => void;
}

export default function Error({ reset }: CalendarErrorProps) {
  return <ScreenError title="캘린더를 불러오지 못했습니다" reset={reset} isInsideShell />;
}
