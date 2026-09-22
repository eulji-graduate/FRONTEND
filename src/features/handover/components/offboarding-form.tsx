"use client";

import { useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DatePickerField } from "@/components/common/date-picker-field";
import { ResultDialog } from "@/components/common/result-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HANDOVER_TYPE } from "@/constants/domain";

import { submitHandoverAction } from "../actions";
import { handoverDateMin } from "../lib";
import type { HandoverContext } from "../types";
import { HandoverActionListCard } from "./handover-action-list-card";

const DESCRIPTION_MAX_LENGTH = 1000;

interface OffboardingFormProps {
  context: HandoverContext;
}

/**
 * 오프보딩 신청 — 전체 액션 자동 선택(해제 불가) + 인수인계 상세 설명(WORKFLOW.md §7).
 * ⚠️ 팀장 오프보딩도 신청 화면 자체는 똑같다 — 다른 건 신청 뒤 라우팅(바로 오너에게)뿐이고
 *    그건 승인 화면(`/team/handover`·`/owner/leader-handovers`, 별도 이슈) 쪽 일이다.
 */
export function OffboardingForm({ context }: OffboardingFormProps) {
  const { actions } = context;
  const selectedIds = useMemo(() => new Set(actions.map((action) => action.id)), [actions]);

  const [description, setDescription] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  /*
    ⚠️ **넘길 액션이 없어도 신청은 열려 있다**(#637). WORKFLOW §7 · 아래 목록 카드
       (`HandoverActionListCard`)의 "넘길 액션이 없어도 인수인계서는 신청할 수 있습니다"
       문구와 정책이 같다 — 담당하고 있던 액션이 실제로 하나도 없는 팀장 오프보딩도
       인수인계서는 남긴다(설명·마지막 근무일이 인수인계 기록의 본체).
  */
  const canSubmit = description.trim().length > 0 && Boolean(lastWorkingDay);

  function handleConfirm() {
    setConfirmError(null);
    startTransition(async () => {
      try {
        await submitHandoverAction({
          type: HANDOVER_TYPE.OFFBOARDING,
          description: description.trim(),
          actionIds: actions.map((action) => action.id),
          lastWorkingDay,
        });
        setConfirmOpen(false);
        setResultOpen(true);
      } catch {
        setConfirmError("인수인계서 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/*
        ⚠️ **한 장으로 합친다**(2026-08-11). 날짜 한 칸과 설명 한 칸을 각각 카드로 두니 흰 상자
           셋이 세로로 쌓여, 어디까지가 신청서고 어디부터가 액션 목록인지 모양으로는 알 수
           없었다 — 같이 적어 내는 값이면 한 카드다.
        ⚠️ 머리를 붙인다. 아래 `내 담당 액션`은 제목이 있는데 이 카드만 없으면 둘이 다른
           물건처럼 보인다.
      */}
      <section className="border-border bg-card flex flex-col gap-5 rounded-2xl border p-7">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">신청 내용</h2>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offboarding-last-working-day">
            마지막 근무일 <span className="text-destructive">*</span>
          </Label>
          {/* ⚠️ 날짜 한 칸이 카드 폭을 다 먹지 않는다 — 값이 짧은 입력은 폭도 짧아야 무엇을 넣는 칸인지 읽힌다 */}
          <DatePickerField
            id="offboarding-last-working-day"
            value={lastWorkingDay}
            min={handoverDateMin()}
            onChange={setLastWorkingDay}
            /* ⚠️ 상한이지 고정폭이 아니다 — 좁은 화면에서 224를 못 박으면 카드 밖으로 나간다 */
            className="w-full max-w-56"
          />
        </div>

        {/* ⚠️ 쓰는 글도 좁게 둔다(§DESIGN 4) — 한 줄이 1400px이면 눈이 다음 줄을 못 찾는다 */}
        <div className="flex max-w-[720px] flex-col gap-1.5">
          <Label htmlFor="offboarding-description">
            담당 업무 및 인수인계 상세 설명 <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="offboarding-description"
            rows={4}
            value={description}
            onChange={(event) =>
              setDescription(event.target.value.slice(0, DESCRIPTION_MAX_LENGTH))
            }
            placeholder="담당했던 업무, 진행 맥락, 인수받을 사람이 알아야 할 사항을 작성해 주세요. PDF에도 함께 포함됩니다."
            maxLength={DESCRIPTION_MAX_LENGTH}
          />
          <p className="text-muted-foreground text-right text-[12px] leading-4 tabular-nums">
            {description.length}/{DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
      </section>

      <HandoverActionListCard actions={actions} selectedIds={selectedIds} locked />

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!canSubmit}
          className="bg-foreground text-background hover:bg-foreground/90"
          onClick={() => setConfirmOpen(true)}
        >
          인수인계서 신청
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmError(null);
        }}
        title="인수인계서를 신청할까요?"
        description={`담당 액션 ${actions.length}건 전체가 인수인계서에 담겨 신청됩니다. 신청 뒤에는 이 화면에서 되돌릴 수 없습니다.`}
        confirmLabel="신청"
        isDestructive
        isPending={isPending}
        pendingLabel="신청 중"
        error={confirmError}
        onConfirm={handleConfirm}
      />

      <ResultDialog
        isOpen={resultOpen}
        onOpenChange={setResultOpen}
        title="인수인계서를 신청했습니다."
        description="담당자 승인을 기다려 주세요."
        action={
          <Button
            type="button"
            className="bg-foreground text-background hover:bg-foreground/90 w-full"
            onClick={() => setResultOpen(false)}
          >
            확인
          </Button>
        }
      />
    </div>
  );
}
