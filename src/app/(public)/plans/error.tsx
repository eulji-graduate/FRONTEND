"use client";

import { ScreenError } from "@/components/common/screen-error";

export default function Error({ reset }: { reset: () => void }) {
  return <ScreenError title="요금제를 불러오지 못했습니다" reset={reset} />;
}
