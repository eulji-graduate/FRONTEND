import { Bell, Check, FileText, type LucideIcon, PenLine } from "lucide-react";
import type { ReactNode } from "react";

import { CountUp } from "./count-up";

/**
 * 흐름 축소판의 **오른쪽 칸** — 왼쪽 목록만으로는 넓은 패널이 헐거워서 한 칸을 더 둔다.
 *
 * ⚠️ 자리를 메우려고 없는 기능을 그리지 않는다. 여기 있는 넷은 전부 실제로 만들 화면이다
 *    (자막↔메모 1:1 · 3줄 요약 · 담당자별 묶음 · 인수인계서 목차).
 * ⚠️ 담당자는 **이름 대신 자리(부서·직무)** 로 적는다 — 목이라도 특정 인물처럼 읽히면 안 된다.
 */
const MEMOS = [
  { at: "07:58", text: "문서 최신화 — 이번 주 마감으로 합의" },
  { at: "08:22", text: "디자인 기준 문서: 컴포넌트 규칙까지 포함" },
  { at: "08:35", text: "KPI는 다음 회의 안건으로 넘김" },
] as const;

const SUMMARY = [
  "스프린트 블로커를 먼저 처리하기로 했습니다",
  "문서 두 건은 이번 주 안에 마감합니다",
  "KPI 논의는 다음 회의로 넘김",
] as const;

const BY_OWNER = [
  { role: "개발 담당", count: "2건", note: "가장 이른 마감 8월 7일" },
  { role: "디자인 담당", count: "1건", note: "가장 이른 마감 8월 5일" },
  { role: "기획 담당", count: "1건", note: "가장 이른 마감 8월 2일" },
] as const;

const DOC_SECTIONS = [
  "담당 프로젝트와 현재 상태",
  "넘기는 미완료 액션",
  "참여한 결정과 그 근거",
  "관련 회의 기록 모음",
  "후임이 먼저 볼 것",
] as const;

/** 오른쪽 칸 껍데기 — 넷이 같은 머리·같은 여백을 쓴다 */
interface AsideProps {
  /** 칸 머리 문구 */
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

function Aside({ title, icon: Icon, children }: AsideProps) {
  return (
    // ⚠️ `h-full` — 왼쪽 목록이 더 길 때 칸이 같이 늘어난다. 안 그러면 오른쪽만 짧게 떠 있다
    <div className="border-landing-dark-border flex h-full min-w-0 flex-col rounded-lg border p-3">
      <p className="text-landing-dark-muted flex items-center gap-1.5 text-[11px] leading-4">
        <Icon className="size-3 shrink-0" aria-hidden />
        {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
        <span>{title}</span>
      </p>
      {children}
    </div>
  );
}

/** 01 캡처 — 자막 옆에 붙는 메모. 자막과 **1:1로 이어진다**(§브라우저 API) */
export function CaptureAside() {
  return (
    <Aside title="메모 · 자막과 1:1로 붙습니다" icon={PenLine}>
      <div className="flex flex-col gap-1.5 pt-2.5">
        {MEMOS.map((memo, index) => (
          <p
            key={memo.at}
            style={{ animationDelay: `${index * 0.45 + 0.2}s` }}
            className="border-landing-dark-border animate-cycle-in flex items-start gap-2.5 rounded-md border px-2.5 py-1.5 text-[12px] leading-[18px] break-keep"
          >
            <span className="text-landing-dark-muted shrink-0 tabular-nums">{memo.at}</span>
            {memo.text}
          </p>
        ))}
      </div>
    </Aside>
  );
}

/**
 * 02 분석 — 3줄 요약. 결정·액션과 **같은 회의에서 한 번에** 나온다.
 *
 * ⚠️ 세 줄만 두면 옆 목록보다 훨씬 짧아 칸 아래가 통째로 빈다. 자리를 메우려고 없는 걸
 *    그리지 않고, **같은 분석에서 이미 나온 수치**를 아래에 붙인다 — 왼쪽 목록의
 *    `3줄 요약 · 결정 2건 · 액션 3건`과 같은 회의, 같은 숫자다.
 */
const ANALYZED_COUNTS = [
  { label: "결정", value: 2, unit: "건" },
  { label: "액션", value: 3, unit: "건" },
  { label: "다음 안건", value: 1, unit: "건" },
] as const;

export function AnalyzeAside() {
  return (
    <Aside title="3줄 요약" icon={FileText}>
      <ol className="flex flex-col gap-1.5 pt-2.5">
        {SUMMARY.map((line, index) => (
          <li
            key={line}
            style={{ animationDelay: `${index * 0.45 + 0.2}s` }}
            className="animate-cycle-in flex items-start gap-2 text-[12px] leading-[18px] break-keep"
          >
            <span className="text-landing-dark-muted shrink-0 tabular-nums">{index + 1}</span>
            {line}
          </li>
        ))}
      </ol>

      {/* ⚠️ `mt-auto`다 — 칸이 늘어나면 이 줄이 바닥에 붙어, 위 요약과 아래가 따로 놀지 않는다 */}
      <div className="border-landing-dark-border mt-auto grid grid-cols-3 gap-2 border-t pt-3">
        {ANALYZED_COUNTS.map((item) => (
          <div key={item.label}>
            <p className="text-landing-dark-muted text-[11px] leading-[14px]">{item.label}</p>
            <p className="pt-0.5 text-[15px] leading-[21px] font-semibold tabular-nums">
              <CountUp value={item.value} />
              {item.unit}
            </p>
          </div>
        ))}
      </div>
    </Aside>
  );
}

/** 03 하달 — 사람 기준으로 다시 묶어 본 것. 목록은 액션 기준이라 누가 얼마나인지 안 보인다 */
export function AssignAside() {
  return (
    <Aside title="담당자별로 묶으면" icon={Bell}>
      <div className="flex flex-col gap-1.5 pt-2.5">
        {BY_OWNER.map((owner, index) => (
          <div
            key={owner.role}
            style={{ animationDelay: `${index * 0.45 + 0.2}s` }}
            className="border-landing-dark-border animate-cycle-in flex items-center gap-2.5 rounded-md border px-2.5 py-1.5"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] leading-[18px]">{owner.role}</span>
              <span className="text-landing-dark-muted block text-[11px] leading-4">
                {owner.note}
              </span>
            </span>
            <span className="shrink-0 text-[12px] leading-[18px] font-semibold tabular-nums">
              {owner.count}
            </span>
          </div>
        ))}
      </div>
    </Aside>
  );
}

/** 04 인수인계 — 숫자만으로는 뭐가 담기는지 모른다. 문서 목차를 같이 보여 준다 */
export function HandoverAside() {
  return (
    <Aside title="인수인계서에 담기는 것" icon={FileText}>
      <ul className="flex flex-col gap-1.5 pt-2.5">
        {DOC_SECTIONS.map((section, index) => (
          <li
            key={section}
            style={{ animationDelay: `${index * 0.3 + 0.2}s` }}
            className="animate-cycle-in flex items-start gap-2 text-[12px] leading-[18px] break-keep"
          >
            <Check className="text-landing-accent mt-[3px] size-3 shrink-0" strokeWidth={3} />
            {section}
          </li>
        ))}
      </ul>
    </Aside>
  );
}
