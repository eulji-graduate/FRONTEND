import { Check } from "lucide-react";

import { ZLogo } from "@/components/icons/z-logo";

/**
 * 왼쪽 패널 아래 붙는 제품 축소판 — 회의가 요약으로 바뀌는 장면.
 *
 * ⚠️ 스크린샷을 쓰지 않는다. 화면이 바뀌면 같이 낡고, 여기만 다른 손이 그린 것처럼 보인다.
 * ⚠️ 담긴 문장은 명세에 있는 것만. 자막은 화자 없는 청크지만 **여기는 회의 참석자 발언**이라
 *    이름을 붙인다 — 자막 화면이 아니라 회의 장면이다.
 * ⚠️ 전부 목이다. 스크린 리더가 실제 정보처럼 읽지 않도록 통째로 숨긴다.
 * ⚠️ 여기는 **검정 패널 위**다. 흰 카드로 두면 혼자 튀어 왼쪽 무대에서 떠오른다 —
 *    앱 다크 값(`#242120` 계열)을 직접 박아 어두운 유리로 둔다. 밝기 토큰을 따르지 않는다.
 */
const SPEAKERS = [
  { initial: "김", color: "#0284c7", line: "이번 스프린트 블로커부터 정리해볼게요" },
  { initial: "이", color: "#16a34a", line: "디자인 시스템 업데이트 공유가 안 됐습니다" },
  { initial: "박", color: "#ea580c", line: "API 문서 최신화가 계속 밀리고 있습니다" },
] as const;

const SUMMARY = [
  "결정: 스프린트 블로커 우선 처리",
  "액션: API 문서 최신화 (개발 담당)",
  "액션: 디자인 공유 정리 (디자인 담당)",
] as const;

export function AuthPreview() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-sm"
    >
      {/* 창 머리 — 이게 앱 화면이라는 신호 */}
      <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="flex size-[21px] items-center justify-center rounded bg-white/10">
          <ZLogo className="size-3 text-white/85" />
        </span>
        <span className="flex gap-2 text-[11px] leading-4 text-white/45">
          {["회의", "프로젝트", "액션", "보드"].map((tab) => (
            <span key={tab}>{tab}</span>
          ))}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="flex items-center gap-1.5 text-[11px] leading-4">
          <span className="size-[7px] animate-pulse rounded-full bg-[#4ade80]" />
          <span className="font-medium text-[#4ade80]">LIVE</span>
          <span className="text-white/90">스프린트 회의 · 제품팀</span>
        </p>

        {SPEAKERS.map((speaker) => (
          <div key={speaker.initial} className="flex items-center gap-2">
            <span
              className="flex size-[17px] shrink-0 items-center justify-center rounded-full text-[8px] leading-none text-white"
              style={{ backgroundColor: speaker.color }}
            >
              {speaker.initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[9px] leading-[14px] text-white/55">
              {speaker.line}
            </span>
          </div>
        ))}

        {/* 요약 상자 — 회의가 곧바로 정리되는 장면 */}
        <div className="mt-1 rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-[9px] leading-[14px] tracking-[0.9px] text-white/40 uppercase">
            AI 요약 생성 중…
          </p>
          <div className="flex flex-col gap-1.5 pt-2">
            {SUMMARY.map((row, index) => (
              <p
                key={row}
                style={{ animationDelay: `${index * 0.45}s` }}
                className="animate-cycle-in flex items-center gap-1.5 text-[9px] leading-[14px] text-white/80"
              >
                <Check className="size-2 shrink-0 text-[#4ade80]" strokeWidth={3} />
                {row}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
