"use client";

import type { ReactNode } from "react";

import { DialogMark } from "@/components/common/dialog-mark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResultDialogProps {
  /**
   * 표식 배지 — `check`(됐다) 기본, `alert`(안 됐다).
   *
   * ⚠️ 실패에 기본값을 그대로 두면 **안 된 일 위에 완료 표식**이 뜬다.
   */
  badge?: "check" | "alert";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 제목 아래 한두 줄 설명 */
  description?: ReactNode;
  /** 제목과 버튼 사이 — 요약표처럼 결과를 정리해 보여줄 자리 */
  children?: ReactNode;
  /** 다음 행동 — 링크든 버튼이든 하나만 둔다 */
  action?: ReactNode;
  /**
   * 닫을 수 있는가(기본 `true`).
   *
   * ⚠️ `false`면 X를 지운다. **뒤에 볼 것이 없는 창**에만 쓴다 — 닫아서 빈 화면이 남으면
   *    막힌 게 아니라 고장 난 것처럼 보인다.
   * ⚠️ Esc·바깥 클릭은 여기서 막지 않는다. 그 둘은 `onOpenChange`를 부를 뿐이라,
   *    쓰는 쪽이 상태를 안 바꾸면(`isOpen`을 계속 참으로 두면) 열린 채로 남는다.
   */
  isDismissible?: boolean;
}

/**
 * 결과를 알리는 창 — **끝난 일을 알리는 모달은 전부 이걸 쓴다.** 됐든 안 됐든.
 *
 * 온보딩 완료 화면과 같은 결이다: 먹색 원에 Z 로고, 배지는 옆에,
 * 가운데 정렬로 **표식 → 문장 → 요약 → 버튼** 한 줄기로 읽힌다.
 *
 * ⚠️ 버튼은 **하나**다. 결과는 이미 정해졌으니 고를 게 없다 — 갈림길이 있는 창은
 *    `ConfirmDialog`이고, 그건 버튼이 둘이다.
 * ⚠️ 초록·파랑을 쓰지 않는다 — 색으로 알리는 건 에러뿐(DECISIONS §색 사용 규칙).
 *    실패도 **배지 하나만** 빨갛게 하고 원까지 물들이지 않는다.
 * ⚠️ 전에는 이름이 `SuccessDialog`였다. 결제 실패처럼 **안 된 결과**도 같은 모양으로
 *    알려야 하는데 이름이 성공만 가리켜서, 실패 창을 따로 그리게 만들고 있었다.
 */
export function ResultDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  action,
  badge,
  isDismissible = true,
}: ResultDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/*
        ⚠️ `gap-0` — DialogContent가 자체 `gap-4`를 갖고 있어 아래 `mt-*`와 겹쳐 간격이 두 배가 된다.
           여백은 여기서 한 곳으로만 준다.
      */}
      <DialogContent showCloseButton={isDismissible} className="gap-0 p-8 sm:max-w-[420px]">
        <DialogHeader className="items-center gap-5 text-center">
          <DialogMark badge={badge} />

          <span className="flex flex-col items-center gap-2">
            <DialogTitle className="text-xl leading-[26px] font-semibold tracking-[-0.4px]">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-center text-[13px] leading-[21px] break-keep">
                {description}
              </DialogDescription>
            )}
          </span>
        </DialogHeader>

        {children && <div className="mt-5">{children}</div>}
        {action && <div className="mt-5">{action}</div>}
      </DialogContent>
    </Dialog>
  );
}
