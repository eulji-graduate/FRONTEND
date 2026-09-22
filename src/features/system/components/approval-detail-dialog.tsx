"use client";

import { Info } from "lucide-react";
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
import { APPROVAL_RESULT, APPROVAL_RESULT_LABEL } from "@/constants/system";
import { formatDate } from "@/lib/date";

import { approveCompanyAction, rejectCompanyAction } from "../actions";
import type { PendingCompanyApproval } from "../types";

interface ApprovalDetailDialogProps {
  company: PendingCompanyApproval | null;
  /** 닫히면 돌아갈 곳 — 목록(쿼리의 `id`만 없어진 형태) */
  closeHref: string;
}

type PendingAction = typeof APPROVAL_RESULT.APPROVE | typeof APPROVAL_RESULT.REJECT | null;

/**
 * "기업 승인" 행을 누르면 뜨는 신청서 상세 — 승인·반려를 여기서 끝낸다.
 *
 * ⚠️ **페이지가 아니라 모달이다**(2026-08-10 변경). 담는 값이 다섯 줄뿐이라 페이지로 열면
 *    1440 폭 화면 한가운데 420짜리 카드 하나만 떠서 나머지가 통째로 비었고, 목록 →
 *    상세 → 목록으로 화면이 두 번 갈아 끼워졌다. 옆 화면인 "기업 관리" 상세도 모달이라
 *    같은 목록 화면인데 하나는 페이지, 하나는 모달로 갈리는 것도 맞지 않았다.
 * ⚠️ 열림은 **주소(`?id=`)가 정한다** — `company-detail-dialog.tsx`와 같은 방식이다. 값은
 *    서버가 읽어 넘기므로 이 창은 자기가 뭘 불러오지 않는다(CLAUDE.md §핵심 4원칙 ①).
 * ⚠️ **공용 창(`ConfirmDialog`·`ResultDialog`)과 같은 옷을 입는다** — 원 표식 → 가운데 제목
 *    → 값 → 버튼, 폭 420, 안쪽 여백 32.
 *    ⚠️ 표식 배지는 `none`이다 — 아직 승인도 반려도 안 했다. 체크를 달면 "이미 끝났다"로
 *       읽힌다.
 * ⚠️ 확인은 **공용 `ConfirmDialog`** 를 쓰되 **겹쳐 띄우지 않는다.** 상세를 닫고 확인창을
 *    띄운다(한 번에 하나만 뜬다) — 취소하면 상세로 되돌아온다(`company-detail-dialog.tsx`와
 *    같은 이유).
 * ⚠️ 성공하면 **닫고 목록으로 돌아간다.** 처리된 신청은 대기 목록에 없으므로 그 자리에
 *    남아 있을 이유가 없다. 실패하면 안 닫는다 — 무엇이 안 됐는지 볼 자리가 없어진다.
 * ⚠️ `company`가 `null`이어도 항상 렌더링한다 — 닫히는 애니메이션 동안 내용이 먼저
 *    사라지면 어색하다. 열림 여부는 `open` prop 하나로만 정한다.
 */
export function ApprovalDetailDialog({ company, closeHref }: ApprovalDetailDialogProps) {
  const router = useRouter();
  /*
    확인창에 쓸 값은 **누르는 순간 베껴 둔다**(무엇을 할지 + 어느 신청서인지 + 이름).

    ⚠️ 문구를 살아 있는 `company`에서 바로 뽑으면, 실행이 끝나 그 신청서가 목록에서
       빠지는 순간(`revalidatePath`) 닫히는 중인 확인창의 제목이 `'undefined'`로 홱 바뀐다 —
       방금 누른 것과 다른 말이 0.2초 스쳐 지나간다(`company-detail-dialog.tsx`와 같은 이유).
  */
  const [confirmed, setConfirmed] = useState<{
    action: Exclude<PendingAction, null>;
    id: string;
    companyName: string;
  } | null>(null);
  /*
    ⚠️ 열림 여부는 **따로 둔다.** 닫을 때 위 값을 같이 비우면, 사라지는 애니메이션 동안 남아
       있는 창이 다시 그려져 제목이 `'undefined'`로 홱 바뀐다(`company-detail-dialog.tsx`와
       같은 이유). 값은 남기고 깃발만 내린다.
  */
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const isReject = confirmed?.action === APPROVAL_RESULT.REJECT;

  /*
    보고 있던 신청서가 바뀌거나 사라지면 확인창도 같이 내린다.

    ⚠️ 확인창의 열림은 로컬 state가 정하는데 **내용은 주소(`?id=`)가 정한다.** 확인창이 뜬
       상태에서 브라우저 뒤로가기를 누르면 주소에서 id만 빠져 `company`가 `null`이 되는데,
       state는 그대로라 확인창이 남는다 — 제목이 `'undefined' 가입을 승인할까요?`가 되고,
       실행을 눌러도 아래 `if (!company …) return`에 걸려 **아무 일도 안 일어난다**(취소로만
       빠져나온다). 모달을 주소로 여닫는 이상 뒤로가기는 자연스러운 조작이라 막을 게 아니다.
    ⚠️ **이펙트가 아니라 렌더 중에 맞춘다**(React: prop이 바뀔 때 state 조정). 이펙트는
       그려진 뒤에 도는지라 그 사이 한 프레임 동안 `undefined` 제목이 스친다.
    ⚠️ id를 비교한다 — 사라질 때뿐 아니라 **다른 신청서로 갈아탈 때도** 내려야 한다.
       안 내리면 새로 연 상세 위에 앞 사람의 확인창이 그대로 떠 있는다.
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

    startTransition(async () => {
      let success = false;

      try {
        const response =
          target.action === APPROVAL_RESULT.APPROVE
            ? await approveCompanyAction(target.id)
            : await rejectCompanyAction(target.id);
        success = response.success;
      } catch {
        // ⚠️ 미구현(!isMock) 분기 등에서 던진 에러가 여기로 온다 — 조용히 삼키지 않는다
        success = false;
      }

      if (success) {
        toast.success(APPROVAL_RESULT_LABEL[target.action]);
        /*
          ⚠️ **여기서 확인창을 내리지 않는다.** 내리면 주소가 바뀌기 전 한 프레임 동안
             `company`가 아직 남아 있어 상세가 다시 열렸다가 곧바로 닫힌다 — 창이 두 번
             깜빡인다. 주소에서 id가 빠질 때(위 렌더 중 정리) 둘이 한 번에 닫힌다.
        */
        router.push(closeHref);
      } else {
        // 실패면 상세로 되돌아온다 — 닫아 버리면 무엇이 안 됐는지 확인할 자리가 없다
        setIsConfirmOpen(false);
        toast.error("처리하지 못했습니다");
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
                    {company.companyName}
                  </DialogTitle>
                  <DialogDescription className="text-center text-[13px] leading-[21px] break-keep">
                    가입을 신청한 기업입니다.
                  </DialogDescription>
                </span>
              </DialogHeader>

              {/*
                ⚠️ **한 줄에 한 항목**이다. 2열 격자로 두면 값 길이가 제각각이라 오른쪽 칸이
                   통째로 비고(담당자 이메일 줄이 그랬다) 어느 라벨의 값인지 눈이 한 번 더 찾는다.
              */}
              <dl className="mt-5 flex flex-col">
                <Field label="사업자등록번호" value={company.businessRegistrationNumber} isMono />
                <Field label="신청일" value={formatDate(company.appliedAt)} />
                <Field label="대표자" value={company.representativeName} />
                <Field label="구성원" value={`${company.memberCount}명`} />
                <Field label="담당자 이메일" value={company.contactEmail} />
              </dl>

              {/*
                ⚠️ "기업 코드 자동 발급·이메일 발송"이라 적지 않는다 — 지금은 목이라 대기
                   목록에서 지우기만 한다(`../actions.ts`의 `approveCompanyAction` 주석). 실제로
                   안 하는 일을 약속하지 않는다(§정직성).
                ⚠️ 버튼 바로 위 가운데 — 누르려는 손이 지나가는 자리에 있어야 읽힌다.
                   왼쪽 라벨 줄에 세웠더니 값이 하나 더 있는 것처럼 읽혔다(§confirm-dialog).
              */}
              <p className="text-muted-foreground mt-5 flex items-start justify-center gap-1.5 text-[13px] leading-5 break-keep">
                <span className="flex h-5 shrink-0 items-center">
                  <Info className="size-3.5" aria-hidden />
                </span>
                <span>승인하면 이 신청은 대기 목록에서 사라집니다.</span>
              </p>

              {/*
                ⚠️ 두 버튼이 **같은 폭·같은 높이(44)** 다 — 공용 확인창과 같은 규격이다. 한쪽이
                   넓으면 그쪽을 권하는 것처럼 보이고, 낮으면 같은 무게의 결정으로 안 읽힌다.
                ⚠️ 물러나는 쪽(반려)이 왼쪽이다.
              */}
              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive h-11 flex-1 text-[13px]"
                  onClick={() => {
                    setConfirmed({
                      action: APPROVAL_RESULT.REJECT,
                      id: company.id,
                      companyName: company.companyName,
                    });
                    setIsConfirmOpen(true);
                  }}
                >
                  반려
                </Button>
                <Button
                  type="button"
                  variant="ink"
                  className="border-foreground h-11 flex-1 border text-[13px]"
                  onClick={() => {
                    setConfirmed({
                      action: APPROVAL_RESULT.APPROVE,
                      id: company.id,
                      companyName: company.companyName,
                    });
                    setIsConfirmOpen(true);
                  }}
                >
                  승인
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
          isReject
            ? `'${confirmed?.companyName}' 신청을 반려할까요?`
            : `'${confirmed?.companyName}' 가입을 승인할까요?`
        }
        description={
          isReject
            ? "반려하면 이 신청은 목록에서 사라지고 되돌릴 수 없습니다."
            : "승인하면 이 신청은 대기 목록에서 사라집니다."
        }
        confirmLabel={isReject ? "반려" : "승인"}
        pendingLabel={isReject ? "반려 중" : "승인 중"}
        isDestructive={isReject}
        isPending={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}

/** 값 한 줄 — 기업 상세(`company-detail-dialog.tsx`)와 같은 규격이다 */
function Field({ label, value, isMono }: { label: string; value: string; isMono?: boolean }) {
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
