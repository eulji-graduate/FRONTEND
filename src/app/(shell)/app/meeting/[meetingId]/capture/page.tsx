import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaptureClient } from "@/features/meeting/capture/capture-client";
import { getMeetingCaptions } from "@/features/meeting/capture/server";
import { getMeetingCapture } from "@/features/meeting/server";
import { getViewer } from "@/features/shell/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "회의 진행",
};

/**
 * 캡처 — `/app/meeting/:id/capture` (WORKFLOW §3-3).
 *
 * 못 들어가는 세 경우가 **다른 화면**이다(§view-types):
 * - 없는 회의 → `notFound()`
 * - Host가 아님 → 참석자가 들어올 화면이 아니다(§3-2, STT 충돌 방지). 잠금이 아니라 다른 말이 필요하다.
 * - 이미 끝남 → 종료는 되돌릴 수 없다. 다시 녹음하려면 회의를 새로 열어야 한다.
 */
export default async function MeetingCapturePage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const viewer = await getViewer();
  const result = await getMeetingCapture(meetingId, viewer);
  if (result.kind === "notFound") notFound();

  if (result.kind !== "ok") {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto px-8 py-7">
        <div className="mx-auto w-full max-w-[1440px]">
          <section className="border-border bg-card rounded-2xl border px-7 py-14 text-center">
            <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">
              {result.title}
            </h2>
            <p className="text-muted-foreground pt-1 text-[13px] leading-5 break-keep">
              {result.kind === "notHost"
                ? "회의를 개설한 사람만 진행할 수 있습니다."
                : "이미 끝난 회의입니다. 종료한 회의는 다시 녹음할 수 없습니다."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  /*
    ⚠️ **여기는 스크롤하지 않는다.** 자막이 쌓이면 페이지가 늘어나 조작 줄(녹음·일시정지·종료)이
       위로 밀려 안 보였다 — 화면 높이를 그대로 쓰고 **자막 카드 안에서만** 스크롤한다.
  */
  /*
    ⚠️ **구독 전 자막을 서버가 먼저 읽는다**(CAP-12). SSE(CAP-13)는 구독 시점 이후만
       내려주므로, 회의 중간에 들어온 사람은 이걸 안 채우면 앞부분을 영영 못 본다.
    ⚠️ **거부 분기 아래에 둔다.** 위에 두면 Host가 아닌 사람·끝난 회의에도 자막 조회가
       나간다 — 화면은 거부인데 서버 요청은 이미 갔다. 주석과 코드가 어긋나 있었다.
  */
  const initialCaptions = await getMeetingCaptions(meetingId);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-8 py-7">
      <CaptureClient
        meeting={result.meeting}
        initialCaptions={initialCaptions}
        viewerId={viewer.id}
      />
    </main>
  );
}
