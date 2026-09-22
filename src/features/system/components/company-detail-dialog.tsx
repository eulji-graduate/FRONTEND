"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DialogMark } from "@/components/common/dialog-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COMPANY_STATUS, COMPANY_STATUS_LABEL } from "@/constants/domain";
import { formatDate } from "@/lib/date";
import { objectParticle } from "@/lib/korean";

import { suspendCompanyAction, unsuspendCompanyAction } from "../actions";
import type { ManagedCompany } from "../types";
import { StatusBadge, type StatusTone } from "./status-badge";

interface CompanyDetailDialogProps {
  company: ManagedCompany | null;
  /** 닫히면 돌아갈 곳 — 지금 보던 페이지 그대로(쿼리의 `id`만 없어진 형태) */
  closeHref: string;
  /** Server Action이 끝난 뒤 새로고침할 경로 — `revalidatePath`에 넘긴다 */
  currentPath: string;
}

const STATUS_TONE: Record<ManagedCompany["status"], StatusTone> = {
  ACTIVE: "positive",
  SUSPENDED: "negative",
  UNPAID: "warning",
};

/**
 * "기업 관리" 행을 누르면 뜨는 상세.
 *
 * ⚠️ **옆에서 밀려나오는 시트가 아니라 가운데 모달이다**(2026-08-10 변경). 담는 값이
 *    여섯 줄뿐이라 화면 높이를 다 쓰는 시트에서는 아래가 통째로 비었다 — 내용만큼만
 *    차지하는 모달이 맞다.
 * ⚠️ **공용 창(`ConfirmDialog`·`ResultDialog`)과 같은 옷을 입는다** — 원 표식 → 가운데 제목
 *    → 내용 → 버튼, 폭 420, 안쪽 여백 32. 같은 서비스의 창이 저마다 다르게 생기면
 *    열 때마다 새 화면처럼 읽힌다.
 *    ⚠️ 표식 배지는 `none`이다. 이 창은 묻지도 알리지도 않고 값만 보여준다 — 체크를 달면
 *       "이미 끝났다", 느낌표를 달면 "잘못됐다"로 읽힌다.
 * ⚠️ 값 줄은 **승인 상세와 같은 모양**이다(라벨 왼쪽·값 오른쪽·줄 사이 선).
 * ⚠️ **끝나면 모달을 닫는다.** 열어 두면 방금 정지한 것을 그 자리에서 바로 해제할 수 있어
 *    (정지 ↔ 해제를 무한히 오갈 수 있었다) 확인창을 거친 의미가 옅어진다 — 승인·반려도
 *    끝나면 목록으로 돌아간다. 바뀐 상태는 목록에서 보고, 결과는 토스트가 알린다.
 *    ⚠️ 실패했을 때는 **안 닫는다** — 무엇이 안 됐는지 확인할 자리가 없어진다.
 * ⚠️ 목록 새로고침은 `revalidatePath`가 한다(액션 안에서) — 승인처럼 다른 화면으로
 *    보내는 게 아니라 같은 목록으로 돌아오는 것이라 `redirect`를 쓰지 않는다.
 * ⚠️ `company`가 `null`이어도 항상 렌더링한다 — 닫히는 애니메이션 동안 내용이 먼저
 *    사라지면 어색하다. 열림 여부는 `open` prop 하나로만 정한다.
 * ⚠️ **정지는 묻고 나서 한다.** 그 회사 사람 전원이 워크스페이스에 못 들어오는 조작이라
 *    확인 없이 실행하지 않는다(CLAUDE.md §렌더링·데이터). 결과는 토스트로 알린다.
 * ⚠️ 실행 버튼은 **먹색(`ink`)**이다. `default`는 파랑(`--primary`)인데 이 제품은 파랑을
 *    강조색으로 안 쓴다(CLAUDE.md §디자인 토큰: 색으로 알리는 건 에러(빨강)뿐) —
 *    승인 화면의 `승인` 버튼과 같은 색이어야 한다.
 * ⚠️ 확인은 **공용 `ConfirmDialog`** 를 쓰되 **겹쳐 띄우지 않는다.** 모달 위에 모달이 뜨면
 *    카드가 두 겹이 되고 닫기 버튼도 두 개가 된다 — 어느 것을 닫는지도 헷갈린다.
 *    상세를 **닫고** 확인창을 띄운다(한 번에 하나만 뜬다). 회사 이름이 확인창 제목에 있어
 *    맥락은 안 끊긴다. 취소하면 상세로 되돌아온다.
 */
export function CompanyDetailDialog({ company, closeHref, currentPath }: CompanyDetailDialogProps) {
  const router = useRouter();
  /*
    확인창에 쓸 값은 **누르는 순간 베껴 둔다**(열림 여부까지 이 값 하나가 정한다).

    ⚠️ 전에는 확인창 문구를 살아 있는 `company`에서 바로 뽑았다. 그런데 실행이 끝나면
       그 값이 **발밑에서 바뀐다** — `revalidatePath`로 상태가 뒤집히고(정지↔활성),
       목록 필터에서 빠지면 아예 `null`이 된다. 그 사이 확인창은 닫히는 애니메이션 중이라
       화면에 남아 있어서, 사라지는 0.2초 동안 제목이 `'undefined'을(를) 정지할까요?`로,
       버튼이 빨간 `정지`로 **홱 바뀌었다** — 방금 누른 것과 정반대 문구가 스쳐 지나간다.
    ⚠️ 베껴 두면 창이 뜬 순간의 말이 닫힐 때까지 그대로다. 실행할 대상도 여기 든 id라
       화면이 어떻게 바뀌든 엉뚱한 회사를 건드리지 않는다.
  */
  const [confirmed, setConfirmed] = useState<{
    id: string;
    name: string;
    isSuspended: boolean;
  } | null>(null);
  /*
    ⚠️ 열림 여부는 **따로 둔다.** 닫을 때 위 값을 같이 비우면, 사라지는 애니메이션 동안
       화면에 남아 있는 창이 곧바로 다시 그려져 제목이 `'undefined'`, 버튼이 반대쪽 말로
       홱 바뀐다 — 사라지는 창이 마지막에 딴소리를 한다. 값은 남기고 깃발만 내린다.
  */
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const isSuspended = company?.status === COMPANY_STATUS.SUSPENDED;

  /*
    보고 있던 기업이 바뀌거나 사라지면 확인창도 같이 내린다 — `approval-detail-dialog.tsx`와
    같은 이유다. 확인창이 뜬 채 뒤로가기를 누르면 주소에서 id만 빠지는데, state는 그대로라
    확인창이 남고 실행을 눌러도 아무 일도 안 일어난다.
  */
  const currentId = company?.id ?? null;
  const [shownId, setShownId] = useState(currentId);

  if (shownId !== currentId) {
    setShownId(currentId);
    setIsConfirmOpen(false);
  }

  function handleConfirm() {
    const target = confirmed;
    if (!target) return;

    const formData = new FormData();
    formData.set("companyId", target.id);
    formData.set("path", currentPath);

    startTransition(async () => {
      let success = true;

      try {
        await (target.isSuspended
          ? unsuspendCompanyAction(formData)
          : suspendCompanyAction(formData));
      } catch {
        // 미구현(!isMock) 분기가 던지는 에러가 여기로 온다 — 조용히 삼키지 않는다
        success = false;
      }

      if (success) {
        toast.success(target.isSuspended ? "정지를 해제했습니다" : "기업을 정지했습니다");
        /*
          ⚠️ **여기서 확인창을 내리지 않는다.** 내리면 주소가 바뀌기 전 한 프레임 동안
             `company`가 아직 남아 있어 **상세가 다시 열렸다가** 곧바로 닫힌다 —
             창이 두 번 깜빡이는 것처럼 보인다. 주소에서 id가 빠질 때(위 렌더 중 정리)
             확인창·상세가 **한 번에** 닫히는 게 맞다. 그때까지는 진행 중 문구가 떠 있다.
        */
        router.push(closeHref);
      } else {
        // 실패면 상세로 되돌아온다 — 닫아 버리면 무엇이 안 됐는지 확인할 자리가 없다
        setIsConfirmOpen(false);
        toast.error(target.isSuspended ? "정지를 해제하지 못했습니다" : "정지하지 못했습니다");
      }
    });
  }

  return (
    <>
      <Dialog
        open={company !== null && !isConfirmOpen}
        onOpenChange={(open) => {
          // 확인창을 띄우느라 닫히는 것은 진짜로 닫는 게 아니다 — 주소를 건드리지 않는다
          if (open || isConfirmOpen || isPending) return;
          router.push(closeHref);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-8 sm:max-w-[420px]">
          {company && (
            <>
              <DialogHeader className="items-center gap-5 text-center">
                <DialogMark badge="none" />

                <span className="flex flex-col items-center gap-2">
                  <DialogTitle className="text-xl leading-[26px] font-semibold tracking-[-0.4px]">
                    {company.name}
                  </DialogTitle>
                  <DialogDescription className="text-center text-[13px] leading-[21px] break-keep">
                    가입한 기업의 현황입니다.
                  </DialogDescription>
                </span>
              </DialogHeader>

              <dl className="mt-5 flex flex-col">
                <Field label="기업 코드" value={company.code} isMono />
                <Field label="가입일" value={formatDate(company.joinedAt)} />
                <Field label="구성원 수" value={`${company.memberCount}명`} />
                <Field label="이번 달 회의" value={`${company.meetingCountThisMonth}회`} />
                <Field
                  label="상태"
                  value={
                    <StatusBadge tone={STATUS_TONE[company.status]}>
                      {COMPANY_STATUS_LABEL[company.status]}
                    </StatusBadge>
                  }
                />
                <Field label="오너 이메일" value={company.ownerEmail} />
              </dl>

              {/* 공용 창과 같은 버튼 규격 — 높이 44, 테두리 있음(§confirm-dialog) */}
              <div className="mt-5">
                <Button
                  type="button"
                  variant={isSuspended ? "ink" : "destructive"}
                  onClick={() => {
                    setConfirmed({ id: company.id, name: company.name, isSuspended });
                    setIsConfirmOpen(true);
                  }}
                  className={
                    isSuspended
                      ? "border-foreground h-11 w-full border text-[13px]"
                      : "border-destructive/40 h-11 w-full border text-[13px]"
                  }
                >
                  {isSuspended ? "정지 해제" : "정지"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/*
        ⚠️ 상세 **밖**에 둔다. 안에 두면 상세가 닫힐 때 같이 사라져 확인창이 못 뜬다.
        ⚠️ 취소하면 상세로 되돌아온다 — 실수로 눌렀을 때 값 화면을 다시 찾지 않아도 된다.
      */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={(open) => {
          // 처리 중엔 안 닫는다 — 창만 사라지고 요청은 계속 가면 결과를 못 본다
          if (!open && !isPending) setIsConfirmOpen(false);
        }}
        title={
          confirmed?.isSuspended
            ? `'${confirmed.name}' 정지를 해제할까요?`
            : `'${confirmed?.name}'${objectParticle(confirmed?.name ?? "")} 정지할까요?`
        }
        description={
          confirmed?.isSuspended
            ? "해제하면 이 회사 사람들이 다시 워크스페이스를 쓸 수 있습니다."
            : "정지하면 이 회사 사람 전원이 워크스페이스에 들어올 수 없습니다."
        }
        confirmLabel={confirmed?.isSuspended ? "정지 해제" : "정지"}
        pendingLabel={confirmed?.isSuspended ? "해제 중" : "정지 중"}
        isDestructive={!confirmed?.isSuspended}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}

/** 값 한 줄 — 승인 상세(`approval-detail-dialog.tsx`)와 같은 규격이다 */
function Field({
  label,
  value,
  isMono,
}: {
  label: string;
  value: React.ReactNode;
  isMono?: boolean;
}) {
  return (
    <div className="border-border flex items-center justify-between gap-6 border-b py-2.5 last:border-b-0">
      <dt className="text-muted-foreground shrink-0 text-[13px] leading-5">{label}</dt>
      <dd
        className={`text-foreground min-w-0 truncate text-right text-[13px] leading-5 ${
          isMono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
