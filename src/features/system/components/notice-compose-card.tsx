"use client";

import { Check, PenLine, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NOTICE_TARGET, NOTICE_TARGET_LABEL, type NoticeTarget } from "@/constants/domain";

import { publishNoticeAction } from "../actions";
import type { NoticeTargetCompany } from "../types";
import { NoticeCompanyPicker } from "./notice-company-picker";
import { SystemCardHeading } from "./system-card-heading";

const TARGET_OPTIONS = Object.values(NOTICE_TARGET);

/**
 * "공지 작성" 카드 — 제목·내용·발행 대상을 받아 공지를 발행한다.
 *
 * ⚠️ 상호작용이 있는 잎사귀라 클라이언트 컴포넌트다(CLAUDE.md §서버우선). 발행은 서버 액션
 *    (`publishNoticeAction`)으로 넘겨 토큰이 브라우저로 새지 않게 한다(§핵심 4원칙 ②).
 * ⚠️ "특정 기업" 선택 시 기업을 검색해 골라 담는다 — 실제 발송은 하지 않는 UI 데모다(§정직성).
 */
export function NoticeComposeCard({ companies }: { companies: NoticeTargetCompany[] }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState<NoticeTarget>(NOTICE_TARGET.ALL);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [isSent, setIsSent] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSpecific = target === NOTICE_TARGET.SPECIFIC;
  const canPublish =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    (!isSpecific || selectedCompanyIds.length > 0);

  /*
    ⚠️ **묻고 나서 보낸다.** 발행은 남의 회사로 나가는 조작이라 되돌릴 수 없다 —
       파괴적 작업 확인은 토스트가 아니라 Dialog가 맡는다(CLAUDE.md §렌더링·데이터).
    ⚠️ 결과는 토스트로 알린다. 실패를 조용히 넘기지 않는다(§정직성) — 전에는 성공만
       알리고 실패하면 아무 일도 안 일어난 것처럼 보였다.
  */
  const handlePublish = () => {
    startTransition(async () => {
      let success = false;

      try {
        const response = await publishNoticeAction({
          title,
          content,
          target,
          companyIds: isSpecific ? selectedCompanyIds : undefined,
        });
        success = response.success;
      } catch {
        success = false;
      }

      setIsConfirmOpen(false);

      if (success) {
        setIsSent(true);
        toast.success("공지를 발행했습니다");
      } else {
        toast.error("공지를 발행하지 못했습니다");
      }
    });
  };

  return (
    <section className="border-border bg-card rounded-2xl border">
      <SystemCardHeading icon={PenLine}>공지 작성</SystemCardHeading>

      <div className="flex flex-col gap-3 px-7 pt-5 pb-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notice-title">제목</Label>
          <Input
            id="notice-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="공지 제목"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notice-content">내용</Label>
          <Textarea
            id="notice-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="공지 내용을 입력하세요"
            rows={5}
            className="min-h-[120px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notice-target">발행 대상</Label>
          <Select value={target} onValueChange={(value) => setTarget(value as NoticeTarget)}>
            <SelectTrigger id="notice-target" className="w-full">
              {/* base-ui Value는 팝업이 열리기 전엔 라벨을 못 찾아 값(ALL)을 그대로 보인다 —
                  render prop으로 라벨을 직접 매핑해 첫 화면부터 "전체 기업"이 뜨게 한다. */}
              <SelectValue>{(value) => NOTICE_TARGET_LABEL[value as NoticeTarget]}</SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
              {TARGET_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {NOTICE_TARGET_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 특정 기업: 검색해 골라 담는다 / 미납 기업: 조건에 맞는 곳으로 자동 발송(안내만) */}
          {isSpecific && (
            <NoticeCompanyPicker
              companies={companies}
              selectedIds={selectedCompanyIds}
              onChange={setSelectedCompanyIds}
            />
          )}
          {target === NOTICE_TARGET.UNPAID && (
            <p className="text-muted-foreground text-[11px]">
              미납 상태인 기업에 자동으로 발송돼요
            </p>
          )}
        </div>

        {isSent ? (
          <div
            role="status"
            aria-live="polite"
            className="border-border text-foreground flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-4 font-medium"
          >
            <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
            공지를 발행했습니다
          </div>
        ) : (
          <Button
            type="button"
            size="lg"
            variant="ink"
            className="w-full"
            disabled={!canPublish || isPending}
            onClick={() => setIsConfirmOpen(true)}
          >
            <Send aria-hidden />
            발행
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={(open) => {
          // 보내는 중엔 안 닫는다 — 창만 사라지고 요청은 계속 가면 결과를 못 본다
          if (!open && !isPending) setIsConfirmOpen(false);
        }}
        title="이 공지를 발행할까요?"
        description={
          isSpecific
            ? `고른 ${selectedCompanyIds.length}개사에 지금 나가고, 보낸 공지는 되돌릴 수 없습니다.`
            : `${NOTICE_TARGET_LABEL[target]}에 지금 나가고, 보낸 공지는 되돌릴 수 없습니다.`
        }
        confirmLabel="발행"
        pendingLabel="발행 중"
        isPending={isPending}
        onConfirm={handlePublish}
      />
    </section>
  );
}
