"use client";

import { ScreenError } from "@/components/common/screen-error";

interface MeetingReviewErrorProps {
  reset: () => void;
}

export default function Error({ reset }: MeetingReviewErrorProps) {
  return <ScreenError title="액션 분배 결과를 불러오지 못했습니다" reset={reset} isInsideShell />;
}
