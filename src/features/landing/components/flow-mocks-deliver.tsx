import { Bell, Check, FileText, Send, User } from "lucide-react";

import { CountUp } from "./count-up";
import { AssignAside, HandoverAside } from "./flow-mock-aside";
import { MockHead } from "./flow-mock-head";

/**
 * 흐름 축소판 뒷단 — 액션 하달·인수인계.
 *
 * ⚠️ 담당자는 **이름 대신 자리(부서·직무)** 로 적는다. 목이라도 특정 인물처럼 읽히면 안 된다.
 */
const ASSIGNED = [
  { role: "개발 담당", what: "API 문서 최신화", due: "8월 7일(금)", state: "진행중" },
  { role: "디자인 담당", what: "디자인 기준 작성", due: "8월 5일(수)", state: "할 일" },
  { role: "기획 담당", what: "KPI 문서 업데이트", due: "8월 2일(일)", state: "할 일" },
  { role: "QA 담당", what: "회귀 테스트 시나리오", due: "8월 8일(토)", state: "할 일" },
] as const;

const HANDOVER_ITEMS = [
  { label: "회의 기록", count: 24, unit: "건" },
  { label: "미완료 액션", count: 4, unit: "건" },
  { label: "참여 결정", count: 12, unit: "건" },
  { label: "담당 프로젝트", count: 3, unit: "개" },
] as const;

export function AssignMock() {
  return (
    <>
      <MockHead
        left={
          <>
            <Send className="text-landing-accent size-3.5" aria-hidden />
            <span className="text-landing-accent">액션 하달</span>
          </>
        }
        right="4건"
      />

      <div className="grid gap-3 pt-3 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          {ASSIGNED.map((action, index) => (
            <div
              key={action.what}
              style={{ animationDelay: `${index * 0.45}s` }}
              className="border-landing-dark-border animate-cycle-in flex items-center gap-2.5 rounded-md border px-3 py-1.5"
            >
              <span className="bg-landing-dark-surface landing-light:bg-gradient-to-b landing-light:from-white landing-light:to-[#fbfbfa] border-landing-dark-border text-landing-dark-muted flex size-7 shrink-0 items-center justify-center rounded-full border">
                <User className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] leading-5">{action.what}</span>
                <span className="text-landing-dark-muted block text-[11px] leading-4">
                  {action.role} · {action.due}
                </span>
              </span>
              {/* 상태점 대기=회색·진행중=초록(§디자인 토큰) */}
              <span className="text-landing-dark-muted flex shrink-0 items-center gap-1.5 text-[11px] leading-4">
                <span
                  aria-hidden
                  className="size-[6px] rounded-full"
                  style={{ backgroundColor: action.state === "진행중" ? "#22c55e" : "#71717a" }}
                />
                {action.state}
              </span>
            </div>
          ))}
        </div>
        <AssignAside />
      </div>

      {/*
        ⚠️ 01은 파형, 04는 완성도 막대가 꼬리에 있는데 여기만 글자 한 줄이라 밋밋했다.
           **알림이 간 사람 수**를 겹친 동그라미로 보여준다 — 문장이 말하는 걸 눈으로 받는다.
        ⚠️ 얼굴이나 이름을 넣지 않는다. 목이라도 사람처럼 보이면 실제 계정으로 읽힌다.
      */}
      <div className="border-landing-dark-border mt-auto flex items-center justify-between gap-3 border-t pt-3">
        <p className="text-landing-dark-muted flex items-center gap-1.5 text-[11px] leading-4">
          <Bell className="size-3" aria-hidden />
          배정되는 즉시 담당자에게 알림이 갑니다
        </p>
        <span className="flex shrink-0 items-center" aria-hidden>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{ marginLeft: index === 0 ? 0 : -6 }}
              className="border-landing-dark bg-landing-dark-surface landing-light:bg-white text-landing-dark-muted flex size-[18px] items-center justify-center rounded-full border-2"
            >
              <User className="size-2.5" />
            </span>
          ))}
          <span className="text-landing-dark-muted pl-2 text-[11px] leading-4 tabular-nums">
            3명
          </span>
        </span>
      </div>
    </>
  );
}

export function HandoverMock() {
  /*
    04 인수인계 — 막대가 100%까지 차오르고 나면 **완성 배지**가 튀어오르며
    카드에 초록 후광이 켜진다. 다 됐다는 게 눈으로 끝나야 마지막 단계가 마무리된 느낌이 든다.
  */
  return (
    <>
      <MockHead
        left={
          <>
            <FileText className="text-landing-accent size-3.5" aria-hidden />
            <span className="text-landing-accent">인수인계서 자동 구성</span>
          </>
        }
        right="전임 → 후임"
      />

      {/* 카드를 키워 숫자를 앞세운다 — 작은 목록이면 "모였다"는 실감이 안 난다 */}
      <div className="grid gap-3 pt-2.5 md:grid-cols-2">
        <div className="grid min-w-0 grid-cols-2 gap-2">
          {HANDOVER_ITEMS.map((item, index) => (
            <div
              key={item.label}
              style={{ animationDelay: `${index * 0.35}s` }}
              className="border-landing-dark-border animate-cycle-in rounded-lg border px-3 py-2"
            >
              <p className="text-landing-dark-muted flex items-center gap-1.5 text-[11px] leading-4">
                <Check
                  className="text-landing-accent size-3 shrink-0"
                  strokeWidth={3}
                  aria-hidden
                />
                {item.label}
              </p>
              <p className="text-[18px] leading-6 font-semibold tabular-nums">
                {/* ⚠️ 세는 동안 폭이 흔들리지 않게 `tabular-nums`는 이 줄이 이미 갖고 있다 */}
                <CountUp value={item.count} />
                <span className="text-landing-dark-muted pl-0.5 text-[12px] font-normal">
                  {item.unit}
                </span>
              </p>
            </div>
          ))}
        </div>
        <HandoverAside />
      </div>

      <div className="text-landing-dark-muted mt-auto flex items-center justify-between pt-3 text-[12px] leading-[18px]">
        <span>완성도</span>
        <span className="text-landing-accent font-semibold tabular-nums">100%</span>
      </div>
      <div className="bg-landing-dark-surface landing-light:bg-gradient-to-b landing-light:from-white landing-light:to-[#fbfbfa] mt-2 h-[5px] overflow-hidden rounded-full">
        <div
          className="animate-fill-bar bg-landing-accent h-full w-full rounded-full"
          aria-hidden
        />
      </div>

      {/*
        100%에 닿으면 **Z가 조립되며** 완성을 알린다 — 막대와 같은 6초 주기다.
        안쪽까지 무지개로 채우고, 100%에 닿는 순간 빛이 확 터졌다 잦아든다.
        ⚠️ 채운 그라데이션을 **흐르게 하지 않는다.** 색이 되감기는 지점에 딱딱한 이음선이
           생겨 얼룩처럼 보인다 — 움직임은 바깥 발광이 맡는다.
      */}
      <div className="animate-complete-badge relative mt-3 flex items-center justify-center gap-2.5 overflow-hidden rounded-lg bg-[linear-gradient(110deg,#2563eb,#7c3aed_55%,#8b5cf6)] py-2.5">
        {/* 흰 섬광 — 완성되는 순간 한 번 훑고 지나간다 */}
        <span
          aria-hidden
          className="animate-complete-sheen pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35)_25%,rgba(255,255,255,0.98)_50%,rgba(255,255,255,0.35)_75%,transparent)] blur-[3px]"
        />
        <svg
          viewBox="0 0 100 100"
          fill="currentColor"
          className="size-5 text-white [perspective:400px]"
          aria-hidden
        >
          <path className="animate-z-land-top" d="M0 0 L63 0 L45.5 25 L0 25 Z" />
          <path className="animate-z-land-slash" d="M70 0 L100 0 L30 100 L0 100 Z" />
          <path className="animate-z-land-bottom" d="M54.5 75 L100 75 L100 100 L37 100 Z" />
        </svg>
        <span className="text-[12px] leading-[18px] font-semibold text-white">
          인수인계서 완성 — 전달할 준비가 끝났습니다
        </span>
      </div>
    </>
  );
}
