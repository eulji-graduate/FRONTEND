"use client";

import { CircleAlert, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AUTHORITY, type Authority } from "@/constants/authority";
import {
  HANDOVER_APPLICANT_TYPE_LABEL,
  HANDOVER_TYPE,
  HANDOVER_TYPE_LABEL,
} from "@/constants/handover";
import { formatMonthDayWeekday } from "@/lib/date";
import { cn } from "@/lib/utils";

import { approveHandoverAction, rejectHandoverAction } from "../manage-actions";
import type { PendingHandover } from "../manage-types";

interface HandoverApprovalCardProps {
  memberId: number;
  memberName: string;
  /** 제목에 "팀장/사원"을 붙이는 데만 쓴다 — 승인 판정과는 무관하다(그건 `canApprove`). */
  memberAuthority: Authority;
  handover: PendingHandover;
  /** OWNER만 참이다 — Admin 겸직자는 화면엔 들어와도 이 버튼이 없다(WORKFLOW §11) */
  canApprove: boolean;
  /**
   * **신청 당시** 그 사람이 팀장이었는지(`handover.requesterAuthority` 기준) — 중간 승인
   * 문구·귀속 안내 링크의 분기에 쓴다. `memberAuthority`(지금 권한, 제목용)와는 값이 갈릴
   * 수 있다 — 팀장 공석 중 승급되면 신청 당시엔 일반 팀원이었어도 지금은 팀장이라서다.
   */
  isRequesterLeader: boolean;
}

/**
 * 최종 승인 카드 — 인수인계의 **마지막 관문**.
 *
 * ⚠️ **인수인계 내용을 보여주지 않는다.** 중간 단계에서 이미 끝나 올라온 것이라 대표가
 *    실무 내용을 다시 볼 이유가 없다(WORKFLOW §7 "실무 내용 직접 볼 필요 없음").
 *    여기 적는 건 유형·기간·건수와 **누가 언제 중간 승인했는지**뿐이다.
 * ⚠️ 팀장 본인 신청은 중간 승인이 없다(WORKFLOW §7). **그런데 휴직과 오프보딩이 다르다** —
 *    휴직은 본인이 재할당까지 마치고 올라오지만, 오프보딩은 재할당 없이 "귀속 대기"로 남아
 *    새 팀장이 정해진 뒤 `/owner/leader-handovers`에서 일괄 이전된다. `midApproval`이 없다는
 *    것만 보고 한 문장을 쓰면, 승인자가 "재할당 끝났구나"로 읽고 승인해 아무도 안 맡은
 *    액션이 남는다(§정직성).
 * ⚠️ **승인도 반려도 확인 창을 거친다.** 승인하면 계정 상태가 바뀌고(오프보딩은 퇴사 처리라
 *    로그인이 막힌다), 반려하면 신청이 되돌아간다 — 둘 다 되돌릴 수 없다.
 *    반려는 사유를 적는 걸음이 하나 더 있다(사유 없이 되돌리면 무엇을 고칠지 모른다).
 */
/**
 * 반려 사유 상한 — 되돌려받는 사람이 읽고 고칠 만큼이면 충분하다.
 * ⚠️ 상한을 두면 **남은 글자 수도 같이** 보여야 한다. 말없이 자르면 글이 사라진 줄 안다.
 */
const REASON_MAX = 200;

export function HandoverApprovalCard({
  memberId,
  memberName,
  memberAuthority,
  handover,
  canApprove,
  isRequesterLeader,
}: HandoverApprovalCardProps) {
  const [reason, setReason] = useState("");
  /**
   * 지금 확인을 기다리는 일.
   * ⚠️ 승인도 반려도 **되돌릴 수 없다** — 승인하면 계정 상태가 바뀌고(오프보딩은 퇴사 처리),
   *    반려하면 신청이 되돌아간다. 둘 다 한 번 더 묻는다(§토스트: 파괴적 작업은 Dialog).
   */
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  /*
    ⚠️ 실패는 **창 안에** 남긴다. 토스트로만 알리면 창은 그대로 떠 있는데 문구는 사라져서,
       같은 버튼을 다시 누르게 된다(§토스트는 보조다).
  */
  const [error, setError] = useState<string | null>(null);
  /*
    ⚠️ 칸 하나짜리 검증은 **그 칸 밑에** 적는다(§토스트: 폼 검증 오류는 필드 인라인).
       위쪽 `error`는 서버가 막은 이유고, 이건 아직 서버에 가지도 않은 일이라 자리가 다르다.
  */
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  /*
    ⚠️ 창이 열리면 **사유 칸에 포커스를 준다.** 안 주면 포커스가 창 껍데기에 머물러,
       키보드 사용자는 적을 자리를 Tab으로 찾아 들어가야 한다(§a11y).
  */
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (confirming === "reject") reasonRef.current?.focus();
  }, [confirming]);

  const isVacation = handover.type === HANDOVER_TYPE.VACATION;
  const typeLabel = HANDOVER_TYPE_LABEL[handover.type];
  /*
    ⚠️ **제목에 팀장/사원을 박아 넣는다**(사용자 확정, 2026-08-08) — 전에는 본문을 읽어야만
       팀장 본인 신청인지 알 수 있었다. "팀장 휴직"·"사원 오프보딩"처럼 넷을 한눈에
       가르는 게 목적이라 여기 값은 권한 배지(Leader/Member, 영문)가 아니라 그 옆에서
       쓰는 한글 서술어다 — `이 화면 제목`이지 `권한 라벨`이 아니다. `AUTHORITY_LABEL`(영문)을
       재사용하지 않는 것도 같은 이유 — 라벨 하드코딩 금지는 지키되 값은 `constants/handover.ts`
       (이 서술어를 쓰는 도메인)에 둔다.
  */
  const applicantTypeLabel =
    memberAuthority === AUTHORITY.LEADER
      ? HANDOVER_APPLICANT_TYPE_LABEL.LEADER
      : HANDOVER_APPLICANT_TYPE_LABEL.MEMBER;

  const run = (task: () => Promise<{ isSuccess: boolean; message?: string }>, done: string) =>
    startTransition(async () => {
      /*
        ⚠️ **거절도 받아 낸다.** 값으로 오는 실패는 아래에서 받지만, 브라우저에서 Next 서버까지
           가는 길이 끊기면 `await`가 던진다 — 안 잡으면 이 화면이 통째로 `error.tsx`가 되어
           **적어 둔 반려 사유까지 함께 날아간다**(팀 배정판은 이미 막아 뒀다, 2026-08-12).
      */
      let result;
      try {
        result = await task();
      } catch {
        setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!result.isSuccess) {
        setError(result.message ?? "처리하지 못했습니다");
        return;
      }
      setConfirming(null);
      setError(null);
      setReason("");
      toast.success(done);
    });

  return (
    /*
      ⚠️ **주황을 걷어냈다**(2026-08-11). 테두리와 배지에 경고 색을 쓰고 있었는데, 승인 대기는
         **할 일이지 문제가 아니다** — 색으로 알리는 건 에러(빨강)뿐이다(DESIGN §5).
      ⚠️ 대신 **테두리를 진하게** 해서 눈에 걸리게 한다. 급한 것은 명도로 가른다(§DESIGN 5).
    */
    <section className="border-foreground/25 bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">
          {applicantTypeLabel} {typeLabel} 최종 승인 대기
        </h2>
        {/* ⚠️ 배지도 명도로 세운다 — 이 화면에서 제일 진한 표식이라 색 없이도 먼저 읽힌다 */}
        <span className="bg-foreground text-background shrink-0 rounded px-2 py-0.5 text-[11px] leading-4 font-medium">
          검토 필요
        </span>
      </div>

      <div className="flex flex-col gap-4 px-7 pb-6">
        {/*
          신청 요약 — 유형·기간·건수 셋뿐이다.
          ⚠️ **가로로 눕힌다.** 셋을 세로로 쌓으니 라벨 칸(80px) 오른쪽이 통째로 비고 카드만
             120px 넘게 길어졌다 — 값이 짧은 셋이라 한 줄에 나란히 두는 편이 읽기도 쉽다.
          ⚠️ 라벨 위·값 아래는 **왼쪽 사람 정보 카드와 같은 문법**이다. 한 화면에서 같은
             성격의 묶음이 다르게 생기면 다른 물건처럼 보인다.
          ⚠️ 좁아지면 세로로 돌아온다(`sm:`) — 나란히 두려다 값이 잘리는 것보다 낫다.
          ⚠️ 오프보딩은 기간이 없다(돌아오지 않는다). `flex-1`이라 남은 둘이 폭을 나눠 갖고,
             빈 칸을 남기지 않는다 — 빈 자리를 두면 값이 빠진 것처럼 읽힌다.
        */}
        <dl className="border-border bg-secondary/40 divide-border flex flex-col divide-y rounded-lg border sm:flex-row sm:divide-x sm:divide-y-0">
          <div className="flex flex-1 flex-col gap-0.5 px-4 py-2.5">
            <dt className="text-muted-foreground text-[12px] leading-4">유형</dt>
            <dd className="text-[13px] leading-5">{typeLabel}</dd>
          </div>
          {handover.period && (
            <div className="flex flex-1 flex-col gap-0.5 px-4 py-2.5">
              <dt className="text-muted-foreground text-[12px] leading-4">기간</dt>
              <dd className="text-[13px] leading-5">
                <time dateTime={handover.period.from}>
                  {formatMonthDayWeekday(handover.period.from)}
                </time>
                {" ~ "}
                <time dateTime={handover.period.to}>
                  {formatMonthDayWeekday(handover.period.to)}
                </time>
              </dd>
            </div>
          )}
          <div className="flex flex-1 flex-col gap-0.5 px-4 py-2.5">
            <dt className="text-muted-foreground text-[12px] leading-4">인계 액션</dt>
            <dd className="text-[13px] leading-5 tabular-nums">{handover.actionCount}건</dd>
          </div>
        </dl>

        {/*
          ⚠️ 중간 승인 여부만 적는다. 팀장 본인 신청이면 중간 단계가 없어 `null`이고,
             그때 "중간 승인이 없다"가 아니라 **왜 없는지**를 적어야 빠뜨린 것처럼 안 읽힌다.
        */}
        <p className="border-border bg-secondary/40 text-muted-foreground rounded-lg border px-4 py-3 text-[13px] leading-5 break-keep">
          {handover.midApproval
            ? `${handover.midApproval.approverName} 리더가 ${formatMonthDayWeekday(handover.midApproval.approvedAt)} 중간 승인했습니다.`
            : isRequesterLeader
              ? isVacation
                ? "팀장 본인 신청이라 중간 승인 단계 없이 올라왔습니다. 재할당은 본인이 마쳤습니다."
                : "팀장 오프보딩이라 중간 승인 단계 없이 올라왔습니다. 승인 뒤 인수인계서를 새 팀장에게 귀속해야 합니다."
              : "아직 팀장의 중간 승인을 기다리고 있습니다. 팀장이 인수인계서 관리에서 재배정을 마치면 여기 표시됩니다."}
        </p>

        {/*
          ⚠️ 팀장 오프보딩은 승인이 끝이 아니다 — 인수인계서를 새 팀장에게 귀속해야 완결된다
             (WORKFLOW §7). 갈 곳을 여기서 알려 준다.
        */}
        {isRequesterLeader && !isVacation && !handover.midApproval && (
          <Link
            href="/owner/leader-handovers"
            className="text-muted-foreground hover:text-foreground text-[12px] leading-4 underline underline-offset-2"
          >
            인수인계서 관리로 가기
          </Link>
        )}

        {/*
          ⚠️ **오프보딩만** PDF를 준다 — 휴직은 재직 상태로 되돌아오는 일이라 문서로 남길
             필요가 없다고 정리했다(§7). 승인 여부와 무관하게 보인다 — Admin 겸직자도
             내용은 몰라도 되지만(WORKFLOW §11) 파일을 미리 받아 둘 수는 있어야 한다.
          ⚠️ PDF는 `/api/handovers/{id}/pdf`(BFF)가 그 자리에서 만든다 — 미리 발급받아 두지
             않는다(§HandoverPdfDocument.tsx).
        */}
        {!isVacation && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit"
            onClick={() =>
              window.open(`/api/handovers/${handover.id}/pdf`, "_blank", "noopener,noreferrer")
            }
          >
            <Download />
            인수인계서 PDF 다운로드
          </Button>
        )}

        {canApprove && (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setReasonError(null);
                setConfirming("reject");
              }}
            >
              반려
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ink"
              disabled={isPending}
              onClick={() => {
                setError(null);
                setConfirming("approve");
              }}
            >
              {isPending ? "처리 중…" : "최종 승인"}
            </Button>
          </div>
        )}
      </div>

      {/*
        ⚠️ 승인은 **계정 상태를 바꾼다.** 휴직이면 휴직으로, 오프보딩이면 퇴사 처리라
           계정이 닫힌다 — 무엇이 일어나는지 적고 한 번 더 받는다.
      */}
      <ConfirmDialog
        isOpen={confirming === "approve"}
        onOpenChange={() => setConfirming(null)}
        error={error}
        title={`${memberName} 님의 ${typeLabel}을 승인할까요?`}
        description={
          /*
            ⚠️ **두 줄을 비슷한 길이로 끊는다.** 앞 문장이 길어 창 폭(356px)을 넘기니 제멋대로
               접혀 `이미 재할당된 / 대로 유지됩니다`처럼 낱말이 잘렸다 — `<br />`은 줄이
               넘치지 않을 때만 줄바꿈 자리를 정한다.
            ⚠️ 이름을 다시 안 적는다. 바로 위 제목이 이미 말했고, 그 세 글자 때문에 줄이 넘쳤다.
          */
          isVacation ? (
            <>
              휴직 상태가 되고, 넘긴 액션 {handover.actionCount}건은 그대로 남습니다.
              <br />
              복귀해도 되돌아오지 않습니다.
            </>
          ) : (
            <>
              계정이 퇴사 처리되어 더는 로그인할 수 없습니다.
              <br />
              남긴 회의·액션 기록은 그대로 남습니다.
            </>
          )
        }
        confirmLabel="최종 승인"
        isPending={isPending}
        pendingLabel="승인 중…"
        onConfirm={() =>
          run(() => approveHandoverAction(memberId), `${typeLabel}을 최종 승인했습니다`)
        }
      />

      {/*
        ⚠️ 반려는 되돌릴 수 없다 — **무엇이 일어나는지** 적고 한 번 더 받는다.
           휴직과 오프보딩은 되돌아가는 자리가 같지만(재직), 신청한 사람이 다시 밟을 절차가
           달라서 유형을 문장에 적는다.
        ⚠️ **사유도 이 창에서 받는다.** 전에는 카드 안에 붉은 칸이 펼쳐지고 그다음 확인 창이
           떠서, 같은 한 가지 일을 두 번 물었다 — 게다가 그 붉은 면은 "색으로 알리는 건
           에러뿐"(§디자인 토큰)에 어긋났다. 되돌릴 수 없는 일을 묻는 자리는 공용 확인 창
           하나다(§토스트: 파괴적 작업은 Dialog).
        ⚠️ 사유가 비면 **실행만 잠근다** — 취소는 열어 둬야 잘못 연 창에서 나갈 수 있다.
      */}
      <ConfirmDialog
        isOpen={confirming === "reject"}
        onOpenChange={() => {
          setConfirming(null);
          setReason("");
          setReasonError(null);
        }}
        error={error}
        title={`${memberName} 님의 ${typeLabel} 신청을 반려할까요?`}
        description={
          <>
            신청이 되돌아가고 다시 재직 상태가 됩니다.
            <br />
            {isVacation
              ? "다시 신청하려면 인수인계부터 새로 밟아야 합니다."
              : "이미 넘긴 액션은 되돌아오지 않습니다."}
          </>
        }
        confirmLabel="반려"
        isDestructive
        mark="alert"
        isPending={isPending}
        pendingLabel="반려 중…"
        onConfirm={() => {
          /*
            ⚠️ **버튼을 잠그지 않는다.** 회색으로 죽여 두면 왜 못 누르는지 아무 데도 안 적혀,
               사유를 안 적은 사람은 창이 고장 난 줄 안다 — 눌러 보게 하고 무엇이 빠졌는지
               칸 밑에서 말한다.
            ⚠️ 포커스를 그 칸으로 옮긴다 — 문구만 띄우면 키보드 사용자는 어디를 고쳐야
               하는지 모른다(§a11y).
          */
          if (!reason.trim()) {
            setReasonError("반려 사유를 적어 주세요");
            reasonRef.current?.focus();
            return;
          }
          setReasonError(null);
          run(() => rejectHandoverAction(memberId, reason), `${typeLabel} 신청을 반려했습니다`);
        }}
      >
        {/*
          ⚠️ **선으로 가른다.** 위는 가운데 정렬 문장, 아래는 왼쪽 정렬 입력칸이라 이어 붙이면
             두 정렬이 뒤엉켜 어디부터 적는 자리인지 안 읽힌다.
          ⚠️ 라벨을 `sr-only`로 감추지 않는다 — 화면에도 보여야 무엇을 적는 칸인지 알고,
             스크린 리더와 눈이 같은 것을 읽는다(§a11y).
          ⚠️ **설명과 글자 수를 한 줄에** 둔다. 위아래로 나눠 놓으니 짧은 글 넷이 층층이
             쌓여 창이 길어지고, 정작 적을 칸이 가운데 끼여 안 보였다.
        */}
        <div className="border-border flex flex-col gap-2 border-t pt-5 text-left">
          <Label htmlFor="reject-reason" className="text-[13px] leading-5">
            반려 사유
          </Label>

          <Textarea
            ref={reasonRef}
            id="reject-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value.slice(0, REASON_MAX));
              // 적기 시작하면 지운다 — 고치는 중에 빨간 글이 남아 있으면 계속 틀린 줄 안다
              setReasonError(null);
            }}
            rows={3}
            maxLength={REASON_MAX}
            aria-invalid={reasonError !== null}
            aria-describedby={reasonError ? "reject-reason-error" : undefined}
            placeholder="예) 인계 대상 액션이 빠졌습니다. 다시 올려 주세요."
            className={cn(
              /*
                ⚠️ **`dark:bg-card`를 같이 준다**(2026-08-19, 적대적 검증에서 발견). 공용
                   `Textarea`의 기본값 `dark:bg-input/30`과 `bg-card`는 tailwind-merge가
                   서로 다른 슬롯(변형자가 다름)으로 봐서 **둘 다 살아남고**, 다크에서는
                   `dark:` 선택자가 명시도로 이겨 카드 배경이 사라졌다. 같은 변형자
                   (`dark:`)로 맞춰 줘야 merge가 올바르게 나중 값(`dark:bg-card`)으로 덮는다.
              */
              "bg-card dark:bg-card px-3 py-2.5",
              reasonError
                ? "border-destructive focus-visible:border-destructive"
                : "border-input focus-visible:border-ring",
            )}
          />

          <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-[12px] leading-4">
            {/*
              ⚠️ 평소에는 **비워 둔다.** 무엇을 적을지는 예시(placeholder)가 이미 보여주고,
                 안내문을 늘 띄워 두면 정작 오류가 떴을 때 자리가 바뀐 줄 모른다.
                 (`신청자에게 전달됩니다`는 못 쓴다 — 지금 이 값은 어디에도 안 남는다.)
              ⚠️ 자리는 **글자 수와 같은 줄**이라, 문구가 생겨도 창 높이가 안 변한다.
            */}
            {reasonError ? (
              <p
                id="reject-reason-error"
                role="alert"
                className="text-destructive flex items-start gap-1 break-keep"
              >
                {/* ⚠️ 저장소·구독 경고와 **같은 표식**이다. 줄 높이만 한 상자에 담아 세운다 */}
                <span className="flex h-4 shrink-0 items-center">
                  <CircleAlert className="size-3.5" aria-hidden />
                </span>
                <span>{reasonError}</span>
              </p>
            ) : (
              <span aria-hidden />
            )}
            {/* ⚠️ 상한이 있는 칸은 어디까지 썼는지 보여준다. `tabular-nums`라 안 흔들린다 */}
            <p className="shrink-0 tabular-nums">
              {reason.length} / {REASON_MAX}
            </p>
          </div>
        </div>
      </ConfirmDialog>
    </section>
  );
}
