"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { recordRecentViewAction } from "../actions";
import type { SearchKind } from "../types";

interface RecordViewLinkProps extends ComponentProps<typeof Link> {
  kind: SearchKind;
  itemId: number;
}

/**
 * 검색/랜딩에서 결과를 열 때 "최근 본 항목"에 남긴다(`POST /search/recent-views`).
 * **상호작용 잎사귀만** 클라이언트다(§핵심 4원칙 1) — 이동 자체는 `next/link`가 그대로 하고,
 * 여기서는 클릭 시점에 기록 액션 하나만 얹는다.
 *
 * ⚠️ **이동을 절대 안 막는다.** 기록은 `void`로 던지고 기다리지 않는다 — 기록 API가 느리거나
 *    실패해도 화면 전환은 그대로다(`recordRecentViewAction`이 실패를 알아서 삼킨다).
 */
export function RecordViewLink({ kind, itemId, onClick, ...linkProps }: RecordViewLinkProps) {
  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        void recordRecentViewAction(kind, itemId);
      }}
    />
  );
}
