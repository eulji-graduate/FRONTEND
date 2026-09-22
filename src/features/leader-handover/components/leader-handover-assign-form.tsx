"use client";

import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEADER_HANDOVER_CUSTODY_STATUS } from "@/constants/domain";

import { assignLeaderHandoverAction } from "../actions";
import type { LeaderHandoverDetail } from "../types";

interface LeaderHandoverAssignFormProps {
  handover: LeaderHandoverDetail;
}

/**
 * 수신자(신규 팀장) 선택 + [OOO에게 귀속](WORKFLOW.md §7).
 * ⚠️ 이미 귀속 완료된 건은 다시 못 바꾼다 — 일괄 이전은 한 번뿐이다.
 * ⚠️ PDF는 `/api/handovers/{id}/pdf`(BFF)가 그 자리에서 만들어 새 탭으로 연다 — 미리
 *    발급받아 두지 않는다(§HandoverPdfDocument.tsx).
 */
export function LeaderHandoverAssignForm({ handover }: LeaderHandoverAssignFormProps) {
  const isAssigned = handover.custodyStatus === LEADER_HANDOVER_CUSTODY_STATUS.ASSIGNED;
  const [selectedId, setSelectedId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCandidate = handover.candidates.find((candidate) => candidate.id === selectedId);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      /*
        ⚠️ **던질 수 있는 호출이다.** `isMock`이 꺼지면 Action이 예외를 던지는데, 여기서
           안 잡으면 이 창이 아니라 페이지 전체 error.tsx로 넘어가 확인 창이 통째로
           사라진다(§토스트: 페이지 전체 실패는 error.tsx, 이건 그 자리가 아니다).
      */
      try {
        const result = await assignLeaderHandoverAction(handover.id, selectedId);
        if (!result.isSuccess) {
          setError(result.message ?? "귀속 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        setConfirmOpen(false);
        toast.success(`${selectedCandidate?.name} 님에게 귀속했습니다`);
      } catch {
        setError("귀속 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-7">
      {/*
        ⚠️ **제목과 버튼을 위아래로 푼다**(2026-08-11). 곁 컬럼(360px)에 들어가면서 한 줄에 나란히
           두니 제목 바로 옆에 버튼이 붙어 둘이 한 덩이로 읽혔다 — 좁은 칸에서는 가로로 나누는
           대신 층으로 나눈다.
      */}
      <div className="flex flex-col gap-3">
        {/* ⚠️ 카드 제목은 17px이다(§DESIGN 4 다섯 크기) — 15px는 규격 밖이라 이 카드만 작았다 */}
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">새 팀장에게 귀속</h2>
      </div>

      {/*
        ⚠️ PDF는 **카드 맨 아래**다. 제목 옆·바로 밑에 두면 정작 먼저 읽어야 할 안내문보다
           버튼이 앞선다 — 이 카드에서 할 일은 귀속이고, PDF는 곁다리다.
      */}
      {isAssigned ? (
        <p className="text-muted-foreground text-[13px] leading-5">
          이미 귀속이 완료된 인수인계서입니다.
        </p>
      ) : handover.candidates.length === 0 ? (
        /*
          ⚠️ **타 부서 팀장은 후보에 안 넣는다**(팀 정정, 2026-08-08) — 그 팀에 새 팀장이
             생기기 전까지는 넘길 곳이 없다는 뜻이라, 빈 셀렉트 대신 다음 할 일을 알려준다.
        */
        /*
          ⚠️ **문장 안에 링크를 두지 않는다**(2026-08-11). 좁은 곁 컬럼(360px)에서 `사원 관리`가
             줄 중간에 끊겨 `사원 / 관리`로 갈라졌고, 밑줄까지 두 줄로 나뉘어 링크인지도
             흐려졌다 — 읽는 글과 누르는 것을 섞지 않는다.
          ⚠️ 문장은 **두 줄로 끊어 적는다.** 무엇이 문제인지(팀장이 없다)와 무엇을 해야 하는지
             (승급해라)는 다른 말이라, 한 문장에 이으면 둘 다 흐릿하게 읽힌다.
        */
        <div className="flex flex-col gap-1">
          <p className="text-[13px] leading-6 break-keep">
            {handover.teamName}에 아직 새 팀장이 지정되지 않았습니다.
          </p>
          <p className="text-muted-foreground text-[13px] leading-6 break-keep">
            그 팀 소속 사원을 팀장으로 승급해 주세요.
          </p>
        </div>
      ) : (
        /*
          ⚠️ **세로로 쌓는다**(2026-08-11, 코드래빗 지적). 곁 칸은 360이고 카드 안쪽 여백을
             빼면 304px인데, `w-56`(224) 셀렉트와 이름이 든 버튼(`○○○에게 귀속`)을 한 줄에
             두면 이름이 길 때 버튼이 잘려 **귀속을 끝낼 수 없다.**
          ⚠️ 둘 다 칸 폭을 다 쓴다 — 좁은 칸에서 반씩 나누면 이름이 양쪽 다 잘린다.
        */
        <div className="flex flex-col gap-2.5">
          <Select value={selectedId} onValueChange={(value) => setSelectedId(value ?? "")}>
            <SelectTrigger aria-label="수신자 선택" className="w-full">
              {/* 원본 값(id)이 아니라 이름·팀 라벨을 보여준다(다른 화면의 담당자 선택과 같은 패턴) */}
              <SelectValue placeholder="수신자(신규 팀장) 선택">
                {(value) => {
                  const candidate = handover.candidates.find((c) => c.id === value);
                  return candidate ? `${candidate.name} · ${candidate.teamName}` : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              {handover.candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.name} · {candidate.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={!selectedId}
            className="bg-foreground text-background hover:bg-foreground/90 w-full"
            onClick={() => setConfirmOpen(true)}
          >
            {selectedCandidate ? `${selectedCandidate.name}에게 귀속` : "귀속"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() =>
            window.open(`/api/handovers/${handover.id}/pdf`, "_blank", "noopener,noreferrer")
          }
        >
          <Download />
          인수인계서 PDF 다운로드
        </Button>

        {/*
          ⚠️ **PDF 아래에 글자 링크로 둔다.** 같은 테두리 버튼으로 두면 둘이 같은 무게가 되어
             무엇을 눌러야 하는지 알 수 없다 — 이 카드에서 할 일은 귀속이고, 아래 둘은 곁다리다.
          ⚠️ 한 줄로 붙여 둔다(`whitespace-nowrap`) — 화살표가 다음 줄로 떨어지면 링크가 끊겨 보인다.
        */}
        <Link
          href="/manage/members"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-8 items-center justify-center gap-1 rounded-md text-[13px] leading-5 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
        >
          사원 관리로 가기
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setError(null);
        }}
        title={`${selectedCandidate?.name} 님에게 귀속할까요?`}
        description={`담긴 액션 ${handover.actionCount}건 전체의 담당자가 ${selectedCandidate?.name} 님으로 한 번에 바뀝니다. 되돌릴 수 없습니다.`}
        confirmLabel="귀속"
        isPending={isPending}
        pendingLabel="귀속 중"
        error={error}
        onConfirm={handleConfirm}
      />
    </section>
  );
}
