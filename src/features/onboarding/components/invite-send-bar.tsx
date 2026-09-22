"use client";

import { Plus } from "lucide-react";

interface InviteSendBarProps {
  /** 이번에 나갈 줄 수 — 주소가 유효하고 아직 안 보낸 것 */
  sendableCount: number;
  onAddRow: () => void;
}

/**
 * 카드 하단 바 — [행 추가]와 몇 명이 나가는지.
 *
 * ⚠️ **[초대 발송] 버튼을 두지 않는다**(2026-08-04 변경). 발송과 다음 단계가 따로 있으면
 *    "보냈는데 왜 안 넘어가지", "넘어갔는데 안 보냈네" 두 실수가 다 생긴다 —
 *    **[완료]를 누를 때 함께 나간다.**
 * 추가 버튼이 목록 안에 있으면 줄이 늘 때마다 아래로 밀려 스크롤해야 눌린다 — 여기 고정한다.
 * ⚠️ 1·2단계 하단 바(`DepartmentAddRow`·`PositionAddRow`)와 **같은 높이(54px)**, 버튼도
 *    그쪽처럼 **오른쪽 끝**이다. 단계를 넘길 때 같은 자리에 있어야 손이 안 헤맨다.
 *    1·2단계는 왼쪽이 입력칸이라 여기서는 그 자리에 안내 문구가 온다.
 * ⚠️ 다만 **배경은 깔지 않는다.** 저쪽은 입력칸과 짝을 이뤄야 해서 상자가 필요하지만,
 *    여기는 옆이 문구뿐이라 상자를 두면 바 안에서 그것만 도드라진다.
 */
export function InviteSendBar({ sendableCount, onAddRow }: InviteSendBarProps) {
  return (
    <div className="border-border bg-muted flex h-[54px] shrink-0 items-center gap-2 border-t px-4">
      {/* 몇 명이 나가는지 — [완료]를 누르면 이 수만큼 계정이 만들어진다 */}
      <p className="text-muted-foreground/70 min-w-0 flex-1 truncate text-[12px] leading-4">
        {sendableCount > 0
          ? `[완료]를 누르면 ${sendableCount}명에게 발송됩니다`
          : "주소를 적으면 [완료]에서 함께 발송됩니다"}
      </p>

      <button
        type="button"
        onClick={onAddRow}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[12px] leading-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
      >
        <Plus className="size-3.5" />
        {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
        <span className="leading-none">행 추가</span>
      </button>
    </div>
  );
}
