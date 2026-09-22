"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { MeetingCaptureInfo } from "../view-types";
import type { LiveCaption } from "./types";

/**
 * 캡처 화면을 **브라우저에서만** 그리게 감싸는 한 겹.
 *
 * ⚠️ **`ssr: false`는 클라이언트 컴포넌트에서만 쓸 수 있다.** App Router에서 서버 컴포넌트가
 *    그 옵션을 주면 빌드가 깨진다 — 그래서 페이지가 직접 부르지 않고 이 파일을 거친다.
 * ⚠️ 서버 렌더를 끄는 이유는 캡처가 `webkitSpeechRecognition`·`MediaRecorder`를 쓰기
 *    때문이다(CLAUDE.md §브라우저 API). 서버엔 둘 다 없어서, 서버가 한 번 그리면 지원
 *    여부를 서버와 브라우저가 다르게 판단해 하이드레이션이 어긋난다.
 * ⚠️ 회의 정보 **조회는 여전히 서버**가 한다(`page.tsx`). 클라이언트로 내려가는 건 녹음하는
 *    잎사귀뿐이다(§핵심 4원칙 1).
 */
const CaptureView = dynamic(() => import("./capture-view").then((mod) => mod.CaptureView), {
  ssr: false,
  /* 로딩도 본문과 같은 골격이다 — 다르면 그려질 때 화면이 튄다(DESIGN §4) */
  loading: () => (
    <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col gap-7">
      {/* 조작 줄 — 본문과 같은 높이로 잡아 둔다 */}
      <Skeleton className="h-[134px] shrink-0 rounded-2xl" />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-full rounded-2xl" />
        <Skeleton className="h-full rounded-2xl" />
      </div>
    </div>
  ),
});

export function CaptureClient({
  meeting,
  initialCaptions,
  viewerId,
}: {
  meeting: MeetingCaptureInfo;
  initialCaptions: LiveCaption[];
  viewerId: number;
}) {
  return <CaptureView meeting={meeting} initialCaptions={initialCaptions} viewerId={viewerId} />;
}
