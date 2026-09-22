"use client";

import { ScreenError } from "@/components/common/screen-error";

interface SearchErrorProps {
  reset: () => void;
}

export default function Error({ reset }: SearchErrorProps) {
  return <ScreenError title="검색을 불러오지 못했습니다" reset={reset} isInsideShell />;
}
