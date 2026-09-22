"use client";

import { Check, CircleAlert, Loader2, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useNotificationCenter } from "../notification-provider";
import { ANALYSIS_CARD_STATE, type AnalysisCardState, type AnalysisTracking } from "../types";

/**
 * 우측 하단 **지속형 카드** — 회의 종료 뒤 요약이 어디까지 갔는지.
 *
 * ⚠️ **이건 토스트가 아니다.** 전에는 종료 직후 `toast.success("백그라운드에서 요약 중입니다")`
 *    한 줄이 몇 초 뜨고 사라졌다 — 그 뒤로 끝났는지 깨졌는지 알 방법이 없어서, 사람이
 *    회의 상세를 새로고침하며 기다렸다. 카드는 **닫기 전까지 남고 자리에서 상태만 바뀐다.**
 * ⚠️ **자리를 바꿔 가며 알리지 않는다.** 스피너 → 완료 아이콘으로 같은 카드 안에서 바뀐다.
 *    새 카드가 뜨면 눈이 다시 자리를 찾아야 한다.
 * ⚠️ **토스트와 안 겹친다.** 토스트는 `top-center`(`components/ui/sonner.tsx`)이고 이건
 *    우하단이다. 랜딩의 고객센터 위젯도 우하단이지만 그건 로그인 **전** 화면이라 만나지 않는다.
 * ⚠️ **색을 안 쓴다**(DESIGN §5). 진행은 스피너, 완료는 체크 표식으로 가른다 —
 *    색을 쓰는 자리는 **실패(에러)** 하나뿐이다.
 */

/** 상태 한 장의 내용 — 아이콘·제목·보조 문구가 한 벌로 바뀐다 */
interface CardFace {
  icon: ReactNode;
  title: string;
  detail: string;
}

/*
  ⚠️ **아이콘은 배지(`bg-secondary`)에 담는다**(2026-08-19 — "너무 우리 그룹에 안
     맞는다"는 지적. 맨몸 아이콘은 브라우저 기본 알림처럼 읽혔다). 배지 모양은
     `EmptyState`를 따른다 — 색은 여전히 실패(에러) 하나에만 쓴다(DESIGN §5).
*/
function faceOf(state: AnalysisCardState): CardFace {
  switch (state) {
    case ANALYSIS_CARD_STATE.RUNNING:
      return {
        icon: <Loader2 className="text-muted-foreground size-[18px] animate-spin" aria-hidden />,
        title: "요약 중입니다",
        detail: "다른 작업을 하셔도 됩니다",
      };
    case ANALYSIS_CARD_STATE.DONE:
      return {
        icon: <Check className="text-foreground size-[18px]" aria-hidden />,
        title: "요약이 끝났습니다",
        detail: "검토 화면에서 액션을 확정해 주세요",
      };
    case ANALYSIS_CARD_STATE.FAILED:
      return {
        /* ⚠️ 여기만 색을 쓴다 — DESIGN §5가 색을 허용한 유일한 자리가 에러다 */
        icon: <CircleAlert className="text-destructive size-[18px]" aria-hidden />,
        title: "요약에 실패했습니다",
        /*
          ⚠️ **"회의 상세에서"라고 안 쓴다**(2026-08-16 정정). 회의 상세 화면은 일부러 이
             자리에 이동 수단을 안 둔다(meeting-detail-view.tsx 주석 참고) — 예전 문구는
             갈 곳 없는 안내였다. 지금은 이 카드 자체가 [다시 분석] 버튼을 갖는다.
        */
        detail: "아래 버튼으로 다시 분석할 수 있습니다",
      };
    case ANALYSIS_CARD_STATE.UNAVAILABLE:
      return {
        icon: <CircleAlert className="text-muted-foreground size-[18px]" aria-hidden />,
        /*
          ⚠️ **모르는 것을 실패라고 하지 않는다.** 조회가 안 된 것이지 요약이 깨진 게
             아니다 — 둘을 같은 말로 덮으면 멀쩡한 요약을 다시 돌리게 만든다(§정직성).
        */
        title: "요약 상태를 확인하지 못했습니다",
        detail: "요약은 서버에서 계속 돌고 있을 수 있습니다",
      };
  }
}

export function AnalysisProgressCard() {
  const { tracking, dismissAnalysis, retryAnalysis, retryFailedSummary } = useNotificationCenter();
  /* ⚠️ 요청이 오가는 동안만 쓰는 로컬 상태다 — 트래킹 자체는 아직 안 바뀐다(응답 전엔
     회의가 정말 다시 도는지 모른다). 버튼을 두 번 누르는 것만 막는다. */
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  if (!tracking) return null;

  async function handleRetryFailed() {
    setIsRetryingFailed(true);
    try {
      await retryFailedSummary();
    } finally {
      setIsRetryingFailed(false);
    }
  }

  return (
    <CardBody
      tracking={tracking}
      onClose={dismissAnalysis}
      onRetry={retryAnalysis}
      onRetryFailed={handleRetryFailed}
      isRetryingFailed={isRetryingFailed}
      face={faceOf(tracking.state)}
    />
  );
}

function CardBody({
  tracking,
  face,
  onClose,
  onRetry,
  onRetryFailed,
  isRetryingFailed,
}: {
  tracking: AnalysisTracking;
  face: CardFace;
  onClose: () => void;
  onRetry: () => void;
  onRetryFailed: () => void;
  isRetryingFailed: boolean;
}) {
  const isDone = tracking.state === ANALYSIS_CARD_STATE.DONE;

  /*
    ⚠️ **재시도 버튼을 본문과 한 줄에 둔다**(2026-08-19, "위아래로 긴 게 싫다, 버튼 자리가
       애매하다, 오른쪽에 작게" 지적). 전에는 아이콘+글 석 줄 밑에 버튼이 **제 줄을 새로
       차지해** 카드가 세로로 길었다 — 버튼을 본문과 나란히, 오른쪽 끝에 작게(`size="xs"`)
       두면 카드는 옆으로 늘고 세로는 줄어든다. 카드 폭을 288→384로 넉넉히 준 것도 그래서다.
  */
  const retryButton =
    tracking.state === ANALYSIS_CARD_STATE.UNAVAILABLE ? (
      /* ⚠️ 조용히 멈추지 않는다 — 다시 물어볼 길을 준다(§목록 3상태와 같은 규칙) */
      <Button variant="outline" size="xs" onClick={onRetry} className="shrink-0">
        <RotateCcw aria-hidden />
        다시 시도
      </Button>
    ) : tracking.state === ANALYSIS_CARD_STATE.FAILED ? (
      /*
        ⚠️ **`onRetry`(상태 재조회)가 아니라 `onRetryFailed`(ANLZ-02 실제 재분석)다.**
           이 버튼은 마이페이지 「요약이 중단된 회의」의 [다시 분석]과 같은 일을 한다 —
           그 화면으로 보내는 대신 카드에서 바로 끝낸다(2026-08-16, 알림 카드 문구가
           갈 곳 없는 "회의 상세에서" 안내였던 것을 대체).
      */
      <Button
        variant="outline"
        size="xs"
        onClick={onRetryFailed}
        disabled={isRetryingFailed}
        className="shrink-0"
      >
        <RotateCcw aria-hidden className={isRetryingFailed ? "animate-spin" : undefined} />
        {isRetryingFailed ? "요청 중…" : "다시 분석"}
      </Button>
    ) : null;

  const body = (
    <>
      {/*
        ⚠️ **원이 아니라 둥근 사각형이다**(2026-08-19 재수정 — 처음엔 원으로 고쳤는데도
           "여전히 별로"였다. `EmptyState`(`components/common/empty-state.tsx`)가 이미
           정해 둔 규칙을 놓쳤다: **원은 아바타 전용**(`ProfileAvatar`가 쓰는 모양)이고,
           사람이 아닌 상태·도메인 아이콘은 둥근 사각형을 쓴다 — 원으로 담으면 "사람"으로
           잘못 읽혀 은근히 어색하다. `EmptyState`와 같은 배지 모양(`rounded-2xl`)을 그대로 쓴다.
      */}
      <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-xl">
        {face.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-[18px] font-medium break-keep">
          {face.title}
        </span>
        <span className="text-muted-foreground block truncate pt-0.5 text-[11px] leading-4">
          {tracking.title}
        </span>
        <span className="text-muted-foreground block pt-1 text-[11px] leading-4 break-keep">
          {face.detail}
        </span>
      </span>
    </>
  );

  return (
    /*
      ⚠️ `--card` + 얕은 그림자다(DESIGN §5 표면). 라이트에서는 바탕과 카드가 둘 다 흰색이라
         그림자가 없으면 화면 위에 떠 있는 것으로 안 읽힌다.
      ⚠️ 폭을 **버튼 유무로 가른다**(2026-08-19 재수정 — 384로 고정했더니 버튼이 없는
         요약중·완료 상태는 글이 짧아 오른쪽이 텅 비어 "왼쪽 쏠림"이 또 났다). 버튼이
         있는 실패·확인못함만 384(버튼이 한 줄에 들어갈 자리), 나머지는 320으로 좁힌다 —
         상태가 바뀌는 순간 아이콘·글도 통째로 다시 그려지므로, 그때 폭이 같이 바뀌는 건
         내용과 무관하게 폭만 따로 튀는 것과는 다르게 느껴진다.
      ⚠️ 다만 **좁은 화면에서는 접힌다**(§디자인 토큰 — 고정 폭 대신 반응형 여지).
         `max-w`로 양옆 24px을 남긴다.
      ⚠️ 모션은 **150ms**다(DESIGN — 100/150/250ms). 상태가 바뀔 때 카드를 다시 튀어나오게
         하지 않는다: 처음 뜰 때만 올라오고, 그 뒤로는 안쪽 내용만 바뀐다.
    */
    <div
      className={cn(
        "border-border bg-card animate-in fade-in slide-in-from-bottom-2 fixed right-6 bottom-6 z-50 max-w-[calc(100vw-3rem)] rounded-2xl border shadow-lg duration-150",
        retryButton ? "w-96" : "w-80",
      )}
    >
      {/*
        ⚠️ `role="status"` + `aria-live`로 **자리에서 바뀌는 것**을 읽게 한다. 카드가 이미
           떠 있는 채로 글자만 바뀌면 스크린리더는 아무 말도 하지 않는다 — 눈으로 보는
           사람만 완료를 알게 된다.
      */}
      <div role="status" aria-live="polite" className="flex items-center gap-2.5 py-3 pr-9 pl-4">
        {/*
          ⚠️ **완료 카드는 통째로 링크다**(이슈 #442 — "완료 카드 클릭 → 검토 화면").
             안쪽에 작은 [보기] 버튼을 두면 누를 자리를 찾아야 한다.
          ⚠️ 완료가 아닐 때는 링크로 만들지 않는다 — 아직 없는 검토 화면으로 보내면
             빈 화면을 보여 주게 된다.
        */}
        {isDone ? (
          <Link
            href={`/app/meeting/${tracking.meetingId}/review`}
            onClick={onClose}
            className="focus-visible:ring-ring flex flex-1 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:outline-hidden"
          >
            {body}
          </Link>
        ) : (
          body
        )}
        {retryButton}
      </div>

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="요약 진행 알림 닫기"
        onClick={onClose}
        className="text-muted-foreground absolute top-2.5 right-2.5"
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
