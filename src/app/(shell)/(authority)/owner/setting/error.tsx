"use client";

import { ScreenError } from "@/components/common/screen-error";

/** 화면 전체가 실패하면 토스트가 아니라 여기서 알린다(DECISIONS §토스트). */
export default function OwnerSettingError({ reset }: { error: Error; reset: () => void }) {
  return <ScreenError title="기업 설정을 불러오지 못했습니다" reset={reset} isInsideShell />;
}
