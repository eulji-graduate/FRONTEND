"use client";

import { Loader2 } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";

interface InviteCommitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** 부서 수 · 직급 수 · 초대 수 — 무엇을 확정하는지 숫자로 보여준다 */
  departmentCount: number;
  positionCount: number;
  /**
   * **주소를 적은 줄 수** — 요약 알약에 적는다.
   *
   * ⚠️ `sendableCount`가 아니다. 세 칸을 다 못 고른 줄이 있으면 그 값이 `0`이 되는데,
   *    사람 넷을 적어 놓고 `초대 0`을 보면 **적은 게 다 날아간 줄 안다.**
   *    적은 수를 보여 주고, 그중 몇이 빠지는지는 아래 문장이 말한다.
   */
  writtenCount: number;
  /** 이번에 실제로 나갈 줄 수 — 되돌릴 수 없는 일이라 문장은 이 값으로 말한다 */
  sendableCount: number;
  /** 주소는 적었지만 부서·직급을 안 골라 **발송에서 빠지는** 줄 수 */
  /** 아직 안 고른 줄 — 목록에 표시가 없어서 여기서 직접 말한다 */
  unfilledCount: number;
  /** 다 골랐는데 규칙에 걸린 줄 — 그 줄에 문구가 떠 있다 */
  flaggedCount: number;
  onConfirm: () => void;
  /** 서버에 보내는 중 — 두 버튼이 다 잠긴다 */
  isPending?: boolean;
  /** 저장 실패 사유 — 창을 **열어 둔 채** 버튼 위에 적는다 */
  error?: string | null;
}

/**
 * 3단계 [완료] 확인 — **여기서 조직이 확정되고 초대장이 나간다.**
 *
 * ⚠️ 되돌릴 수 없어서 창을 띄운다. 나간 메일은 취소되지 않고, 확인 뒤에는 이 단계로
 *    돌아올 수 없다(4단계에 [이전]이 없다) — 토스트로 알릴 일이 아니다(DECISIONS §토스트).
 * ⚠️ **무엇을 확정하는지 숫자로 적는다.** "정말요?"만 묻는 건 확인이 아니다 —
 *    앞 두 단계에서 만든 것까지 함께 굳는다는 걸 이 자리에서만 볼 수 있다.
 * ⚠️ 창은 공용 `ConfirmDialog`를 쓴다. 무게가 같은 결정인데 화면마다 다르게 생기면 안 된다.
 */
export function InviteCommitDialog({
  isOpen,
  onOpenChange,
  departmentCount,
  positionCount,
  writtenCount,
  sendableCount,
  unfilledCount,
  flaggedCount,
  onConfirm,
  isPending,
  error,
}: InviteCommitDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="이대로 기업 정보를 등록할까요?"
      description={
        sendableCount > 0
          ? `확인을 누르면 ${sendableCount}명에게 초대장이 나갑니다. 보낸 초대장은 취소할 수 없고, 이 단계로 돌아올 수 없습니다.`
          : "확인을 누르면 조직 구성이 확정됩니다. 이 단계로 돌아올 수 없고, 사원 초대는 워크스페이스에 들어간 뒤 기업 설정에서 합니다."
      }
      confirmLabel="등록"
      onConfirm={onConfirm}
      isPending={isPending}
      pendingLabel="등록 중"
      error={error}
    >
      {isPending ? (
        /*
          ⚠️ **제출 중엔 알약·경고 대신 진행 안내로 바꾼다**(2026-08-18, 타임아웃 60초로
             늘리며 같이 손봄). 팀·직급 수나 "몇 줄 빠집니다" 경고는 제출 전에만 의미가
             있다 — 이미 넘어간 뒤에도 그대로 떠 있으면 "지금 뭐가 되고 있는지"와 무관한
             정보만 보여서 창이 멈춘 것처럼 읽힌다(§정직성). 버튼 글자(`pendingLabel`)만
             바뀌는 걸로는 최대 1분을 버티기엔 신호가 약하다 — 회전 아이콘 + 얼마나
             걸릴지까지 적어서 "지금 일하고 있다"를 분명히 한다.
        */
        <div
          className="flex flex-col items-center gap-2 pt-1 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="text-muted-foreground size-5 animate-spin" aria-hidden />
          <p className="text-muted-foreground text-[12px] leading-[18px] break-keep">
            {/* 두 문장을 줄로 가른다 — 한 덩어리면 사실(소요 시간)과 지시(창 유지)가 안 갈린다 */}
            <span className="block">계정 발급과 초대 메일 발송에 최대 1분 정도 걸립니다.</span>
            <span className="block">창을 닫지 말고 기다려 주세요.</span>
          </p>
        </div>
      ) : (
        <>
          {/*
            ⚠️ 칸을 나눠 상자 세 개로 그리지 않는다. 가운데 정렬 창 안에서 테두리 상자가 더 생기면
               표식·제목·설명·상자·버튼이 다섯 덩어리로 쌓여 눈이 어디를 봐야 할지 흩어진다.
               **알약 하나**에 담으면 덩어리가 하나로 줄고, 창 높이도 낮아진다.
          */}
          <div className="flex justify-center">
            <dl className="bg-secondary/60 inline-flex items-center gap-3.5 rounded-full px-4 py-2">
              <Item label="팀" value={departmentCount} />
              <Divider />
              <Item label="직급" value={positionCount} />
              <Divider />
              <Item label="초대" value={writtenCount} />
            </dl>
          </div>

          {/*
            ⚠️ 빠지는 줄을 **여기서** 알린다. 줄마다 경고를 붙이는 대신 넘어가기 직전에 한 번 말한다 —
               조용히 빼면 보낸 줄 알고 넘어간다(§정직성).
          */}
          {/*
            ⚠️ **이유를 갈라서 말한다.** 전에는 `목록에서 표시된 줄을 확인해 주세요` 한 문장이었는데,
               가장 흔한 사유인 **아직 안 고른 줄에는 목록에 표시가 없다** — 안 고른 건 "틀렸다"가
               아니라 "아직"이라 줄에 빨간 글씨를 안 띄우기 때문이다(`InviteRow`).
               없는 표시를 가리키면 사용자는 찾다가 못 찾는다(적대적 검토 #163).
            ⚠️ 표시가 있는 줄(주소 형식·주소 중복·리더 중복)만 `표시가 뜬`이라고 부른다.
          */}
          {unfilledCount + flaggedCount > 0 && (
            <p className="text-muted-foreground pt-3 text-[12px] leading-[18px] break-keep">
              {unfilledCount > 0 && `팀·역할·직급을 고르지 않은 ${unfilledCount}줄`}
              {unfilledCount > 0 && flaggedCount > 0 && "과 "}
              {flaggedCount > 0 && `목록에 표시가 뜬 ${flaggedCount}줄`}
              {"은 이번 발송에서 빠집니다. 취소하고 고치거나, 나중에 기업 설정에서 초대해 주세요."}
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}

function Item({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground text-[11px] leading-4">{label}</dt>
      <dd className="text-[13px] leading-5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** 가운뎃점 대신 얇은 세로선 — 글자 사이에 끼는 점보다 열이 또렷하게 갈린다 */
function Divider() {
  return <span className="bg-border h-3 w-px shrink-0" aria-hidden />;
}
