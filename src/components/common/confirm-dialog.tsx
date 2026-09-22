"use client";

import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { DialogMark } from "@/components/common/dialog-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { splitErrorTag } from "@/lib/error-tag";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 무엇을 할지 묻는 한 문장 — "지울까요?"처럼 행동이 드러나게 */
  title: string;
  /** **무엇을 잃는지** 적는다. "정말요?"만 묻는 건 확인이 아니다 */
  description: ReactNode;
  /** 제목과 버튼 사이 — 무엇을 지우는지 요약해 보여줄 자리 */
  children?: ReactNode;
  /**
   * 실행 버튼 문구 — `확인`이 아니라 **하는 일을 한 낱말로** 적는다(`삭제`·`해지`·`발송`).
   *
   * ⚠️ **문장으로 쓰지 않는다.** `해지할게요`(해요체)도 `해지합니다`(장황)도 아니다 —
   *    버튼은 누르면 무슨 일이 일어나는지만 말하면 된다. 이유·결과는 설명이 맡는다.
   * ⚠️ `cancelLabel`은 웬만하면 **안 넘긴다.** 기본값 `취소`를 두고 창마다
   *    `그대로 둡니다`·`그만둡니다`처럼 다른 말을 쓰면 같은 자리가 매번 다르게 읽힌다.
   */
  confirmLabel: string;
  /** 물러나는 쪽 문구. 기본은 "취소" */
  cancelLabel?: string;
  /** 되돌릴 수 없는 일이면 켠다 — 실행 버튼이 빨강이 된다 */
  isDestructive?: boolean;
  /**
   * 표식 배지. 기본은 `check`.
   *
   * ⚠️ **안 된 일을 알리면서 다시 물을 때는 `alert`** 다 — 결제 실패처럼 "실패했다 + 다시 할래?"가
   *    한 창에 들어오는 경우. 체크를 그대로 두면 실패 창에 완료 표식이 뜬다.
   */
  mark?: "check" | "alert";
  /**
   * 서버를 부르는 중인지. 켜면 **두 버튼이 다 잠긴다** —
   * 실행 중에 취소를 누르면 창만 닫히고 요청은 계속 가서 결과를 못 본다.
   */
  isPending?: boolean;
  /** 진행 중에 보여줄 실행 버튼 문구 — 없으면 `confirmLabel`을 그대로 쓴다 */
  pendingLabel?: string;
  /**
   * 실패 사유 — 창을 **열어 둔 채** 버튼 위에 적는다.
   *
   * ⚠️ 되돌릴 수 없는 일이 막혔을 때는 토스트로만 알리지 않는다. 토스트는 사라지는데
   *    창은 그대로 떠 있어서, 몇 초 뒤에 온 사람은 아무 일도 안 일어난 줄 알고 같은
   *    버튼을 다시 누른다(§토스트는 보조다).
   */
  error?: string | null;
  /**
   * 실행 버튼만 잠근다 — `children`에 **채워야 할 칸**이 있을 때 쓴다(반려 사유).
   * ⚠️ 취소는 안 잠근다. 못 채워서 못 나가는 창이 되면 갇힌다.
   */
  isConfirmDisabled?: boolean;
  onConfirm: () => void;
}

/**
 * 창 폭 — **하나뿐이다.** 폼이 들어가도 이 폭을 쓴다.
 *
 * ⚠️ 폼 창들이 저마다 `Dialog`를 조립하면서 420·480·640·720 넷으로 갈렸는데(감사 2026-08-08),
 *    왜 이 창이 480이고 저 창이 420인지 설명할 수 있는 근거가 없었다. 한 화면에서 창을 두 번
 *    열면 상자가 172px씩 커졌다 작아진다.
 * ⚠️ **좁으면 폭을 늘리지 말고 칸을 세로로 쌓는다.** 창은 이미 화면 높이에 맞춰 스크롤되므로
 *    세로는 늘려도 되지만, 가로는 넓힐수록 입력칸만 길어져 읽고 쓰기가 나빠진다
 *    (DESIGN §1이 폼을 720에서 끊는 것과 같은 이유). 2열 격자도 칸이 홀수면 마지막만 반쪽이 남는다.
 */
const DIALOG_WIDTH = "sm:max-w-[420px]";

/**
 * 확인을 받는 창 — **되돌리기 어려운 일은 전부 이걸 쓴다.**
 *
 * 모양은 `ResultDialog`와 **한 식구**다: 원 표식 → 제목 → 설명 → 버튼으로 가운데 정렬.
 * 결과를 알리는 창과 확인을 받는 창이 다르게 생기면 같은 서비스로 안 읽힌다.
 *
 * ⚠️ 표식은 완료 창과 **완전히 같다**(원 + 차오름 + Z + 체크 배지). 다른 건 버튼이 둘이라는 것뿐이다.
 *    체크가 "이미 끝났다"로 읽힐 여지는 있지만, 두 창이 한 식구로 보이는 쪽을 택했다(팀 결정).
 *    무엇을 묻는지는 제목이 말한다 — "~할까요?"로 끝나므로 아직 안 끝난 게 문장에서 드러난다.
 * ⚠️ 토스트로 확인받지 않는다. 토스트는 결과를 알리는 자리고, 확인은 선택지가 둘이라
 *    멈춰 세워야 한다(DECISIONS §토스트).
 * ⚠️ 실행 버튼을 **기본(파랑)으로 두지 않는다.** 파랑은 "권하는 행동"으로 읽히는데
 *    해지·삭제는 권할 일이 아니다 — `isDestructive`면 빨강, 아니면 먹색이다.
 * ⚠️ 물러나는 쪽이 **왼쪽**이다. 오른쪽 끝(엄지가 먼저 닿는 자리)에 파괴적 버튼을 두면
 *    실수로 눌린다.
 */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "취소",
  isDestructive,
  mark,
  isPending,
  pendingLabel,
  isConfirmDisabled,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  /* ⚠️ 문구 안에 섞여 온 꼬리표를 떼어 낸다 — 없으면 `tag`가 `null`이라 아무것도 안 그린다 */
  const failure = error ? splitErrorTag(error) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/*
        ⚠️ `gap-0` — DialogContent가 자체 `gap-4`를 갖고 있어 아래 `mt-*`와 겹쳐 간격이 두 배가 된다.
           여백은 여기서 한 곳으로만 준다(§success-dialog와 같은 이유).
        ⚠️ **높이를 화면 안으로 묶고 넘치면 스크롤한다.** 공용 `DialogContent`에는 `max-h`도
           `overflow`도 없다 — 폼이 들어오면서 창이 길어졌는데(회의실 예약은 안건을 몇 개만
           더해도 늘어난다), 창은 `top-1/2 -translate-y-1/2`로 **가운데 고정**이라 넘치면
           위아래가 동시에 잘린다. 그러면 [예약]·[취소] 버튼에 닿을 방법이 없어 창에 갇힌다.
        ⚠️ `2rem`은 위아래 여백이다 — 창이 화면에 딱 붙으면 잘린 것처럼 보인다.
      */}
      <DialogContent
        className={cn("max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-8", DIALOG_WIDTH)}
      >
        <DialogHeader className="items-center gap-5 text-center">
          {/*
            ⚠️ 완료 창과 **같은 표식**을 쓴다(`DialogMark`) — 표식이 다르게 뜨면 두 창이
               다른 물건처럼 보인다. 달라지는 건 배지뿐이다.
          */}
          <DialogMark badge={mark} />

          <span className="flex flex-col items-center gap-2">
            <DialogTitle className="text-xl leading-[26px] font-semibold tracking-[-0.4px]">
              {title}
            </DialogTitle>
            <DialogDescription className="text-center text-[13px] leading-[21px] break-keep">
              {description}
            </DialogDescription>
          </span>
        </DialogHeader>

        {children && <div className="mt-5">{children}</div>}

        {/*
          ⚠️ 버튼 **바로 위**다 — 다시 누르려는 손이 지나가는 자리에 있어야 읽힌다.
          ⚠️ 표식은 **동그라미 느낌표**(`CircleAlert`)다. 저장소·구독 화면의 경고와 같은
             것을 같은 크기로 쓴다 — 빨간 글자만 두면 앞뒤 회색 문장에 묻힌다.
          ⚠️ 아이콘은 **줄 높이만 한 상자**에 담아 세운다. 그냥 나란히 두면 글자보다
             살짝 떠 보인다(§아이콘 옆 한글 정렬).
          ⚠️ **자리를 늘 갖고 있는다**(2026-08-19 재수정 — "에러 메시지 때문에 모달이
             커지는 게 싫다"는 지적). 한 번은 상자(테두리+배경)를 둘렀다가 되돌렸다 —
             `{failure && (...)}`로 통째로 넣고 빼면 뜨는 순간 창 높이가 훌쩍 뛰었다.
             `company-code-step.tsx`와 같은 값(`min-h`)으로 이 자리를 항상 잡아 두고,
             내용만 있고 없고를 가른다 — 오류가 없을 땐 그냥 빈 줄이다.
          ⚠️ **`role="alert"`는 이 자리에 늘 건다.** 스크린리더의 알림 영역(live region)은
             DOM에 계속 있어야 **내용이 바뀔 때** 그걸 알아챈다 — 오류가 뜨는 순간 요소째로
             새로 나타나면 오히려 못 읽는 경우가 있다.
        */}
        <div role="alert" className="mt-4 flex min-h-[18px] items-start justify-center gap-1.5">
          {failure && (
            <>
              {/*
                ⚠️ **문장과 꼬리표를 갈라 그린다**(2026-08-12). 한 덩이로 두면 빨간 문장 안에
                   `(Z-003 · 271d9bab)`가 끼어들어, 정작 읽어야 할 말보다 코드가 먼저 눈에
                   걸린다 — 꼬리표는 원인을 찾을 사람만 읽는 값이다.
                ⚠️ 가르는 일은 화면이 한다(`splitErrorTag`). 붙이는 일은 서버(`toUserMessage`)
                   한 곳이라 화면마다 배선할 것이 없다.
              */}
              <span className="flex h-[18px] shrink-0 items-center">
                <CircleAlert className="text-destructive size-3.5" aria-hidden />
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-destructive text-[12px] leading-[18px] break-keep">
                  {failure.text}
                </span>
                {failure.tag && (
                  <span className="text-muted-foreground text-[11px] leading-4 tabular-nums">
                    오류 코드 {failure.tag}
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        {/*
          두 버튼이 같은 폭이다 — 한쪽이 넓으면 그쪽을 권하는 것처럼 보인다.
          ⚠️ 높이는 완료 창 버튼(h-11)과 같다. 확인 창만 작으면 같은 무게의 결정으로 안 읽힌다.
        */}
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 text-[13px]"
          >
            {cancelLabel}
          </Button>
          {/*
            ⚠️ 파괴적이 아닐 때 `variant="default"`를 쓰지 않는다 — 그 변형은 `--primary`(파랑)라
               이 서비스의 주 버튼(먹색 = `ink`)과 다르다. 파랑은 링크·강조용이지 실행 버튼 색이 아니다.
            ⚠️ 실행 버튼에도 **테두리**를 준다. 옆의 물러나는 버튼만 테두리가 있으면
               둘이 다른 종류의 물건처럼 보인다 — 같은 줄의 선택지는 윤곽이 같아야 한다.
          */}
          <Button
            type="button"
            variant={isDestructive ? "destructive" : "ink"}
            disabled={isPending || isConfirmDisabled}
            onClick={onConfirm}
            className={
              isDestructive
                ? "border-destructive/40 h-11 flex-1 border text-[13px]"
                : "border-foreground h-11 flex-1 border text-[13px]"
            }
          >
            {isPending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
