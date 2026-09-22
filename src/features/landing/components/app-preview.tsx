import { Sparkles } from "lucide-react";

import { ZLogo } from "@/components/icons/z-logo";

/**
 * 제품 화면 축소판 — 히어로 오른쪽.
 *
 * ⚠️ 스크린샷 이미지를 넣지 않는다 — 화면이 바뀌면 같이 낡고, 다크모드도 따라오지 못한다.
 *    같은 토큰으로 그린 축소판이라 테마가 바뀌면 함께 바뀐다.
 * ⚠️ 수치·회의점 색은 랜딩 정체성 표현이다 — 상태색 규칙(§디자인 토큰)의 랜딩 예외.
 * 좌상단·우하단에 알림 카드가 **떠 있고 살랑인다**(`float`) — 시안의 디테일이다.
 */
const MEETINGS = [
  { title: "스프린트 킥오프", team: "제품팀", when: "오늘 14:00", color: "var(--landing-green)" },
  { title: "Q3 전략 회의", team: "경영진", when: "어제 10:00", color: "var(--landing-accent)" },
  { title: "디자인 리뷰", team: "UX팀", when: "월요일", color: "var(--landing-violet)" },
] as const;

/*
  ⚠️ **숫자에 색을 칠하지 않는다.** 전에는 셋을 파랑·초록·주황으로 칠했는데 뜻이 다른 게 아니라
     그냥 셋이라, 축소판이 알록달록해지고 정작 아래 회의 목록의 상태 점 색이 묻혔다.
     역할 축소판(`role-screens.tsx`)과 같은 규칙이다.
*/
const STATS = [
  { label: "이번 달 회의", value: "24건" },
  { label: "완료 액션", value: "87%" },
  { label: "대기 인수인계", value: "2건" },
] as const;

/*
  ⚠️ **떠 있는 카드의 테두리는 `border-border`가 아니라 `border-foreground/10`이다.**
     다크에서 `--card`와 앱 창의 `--popover`가 **같은 값**(#242120)이라, 카드가 창 위에 얹혀도
     경계가 없어 통째로 묻혔다. 밝은 화면에서는 그림자가 층을 만들어 주지만 어두운 화면에서는
     그림자가 보이지 않아 아무 층도 안 생긴다.
     ⚠️ 게다가 어두운 무대(`html.landing-night #landing-stage`)에서는 `--card`와 `--secondary`가
     **반투명**(흰색 4%·6%)으로 재정의된다 — 무대 위에 옅게 깔리라고 만든 값이라, 그대로 쓰면
     카드가 비쳐서 뒤의 사이드바 글자가 그대로 읽힌다.
     그래서 **불투명한 `--popover`(#171717)** 를 쓴다. 무대(#0a0a0a)보다 밝아 떠 보이고,
     같은 값인 앱 창 위에서는 `--foreground` 흰 실선이 경계를 만든다.
     밝은 무대(`landing-light`)에서는 원래대로 `--card` + `--border`다.
  ⚠️ **창에 걸쳐 둔다.** 완전히 밖으로 빼면 그냥 옆에 놓인 상자가 되고, 겹쳐야 앱 위에 떠 있는
     알림처럼 읽힌다. 대신 **겹치는 자리를 고른다** — 왼쪽 카드는 사이드바(로고와 메뉴 넷뿐),
     오른쪽 카드는 목록 아래 빈 곳이다. 지표 숫자와 회의 제목은 이 축소판이 보여줘야 할 것이라
     가리지 않는다. 카드가 좁아진 만큼 같은 위치에서도 덜 덮는다.
*/
export function AppPreview() {
  return (
    <div className="relative" aria-hidden>
      {/*
        좌상단 — AI 요약이 끝났다는 알림.
        ⚠️ **브라우저 껍데기를 덮지 않는다.** 전에는 `-top-7`이라 주소 표시줄 위에 걸쳐서
           `app.getz.kr`을 가렸다 — 창이 부서진 것처럼 보인다. 본문 높이로 내려 앉힌다.
        ⚠️ 아래 액션 칩과 **같은 짜임**이다: 알약 → 제목 → 상태 한 줄.
           둘이 다르게 생기면 떠 있는 것끼리 따로 놀아 화면이 어수선해진다.
      */}
      <div className="border-foreground/25 landing-light:border-border bg-popover landing-light:bg-card animate-float absolute top-10 -left-12 z-10 rounded-2xl border px-4 py-3.5 shadow-lg lg:-left-16">
        <span className="bg-landing-violet/10 text-landing-violet inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-2 text-[11px] leading-4 font-semibold">
          <Sparkles className="size-3 shrink-0" aria-hidden />
          <span>AI 요약</span>
        </span>
        <p className="pt-2 text-[12px] leading-[18px] font-semibold">스프린트 킥오프</p>
        <p className="text-muted-foreground flex items-center gap-1.5 pt-1.5 text-[11px] leading-4">
          {/* 상태점 완료=보라(§디자인 토큰) */}
          <span className="bg-landing-violet size-[5px] rounded-full" aria-hidden />
          3줄 · 방금 전
        </p>
      </div>

      {/*
        우하단 — 배정된 액션 카드. 반대 박자로 살랑이게 지연을 준다.
        ⚠️ 라벨을 글자로만 두지 않고 **알약**으로 세운다. `액션`이 위에 덩그러니 있으면
           제목인지 분류인지 안 읽힌다 — 실제 화면의 상태 배지와 같은 모양이다.
        ⚠️ 창 밖으로 덜 나가게 당긴다. 많이 걸치면 잘린 것처럼 보인다.
        ⚠️ **가로 하한을 두지 않는다.** `min-w`로 억지로 넓히면 글자 오른쪽이 비어 카드가
           헐렁해 보인다 — 대신 **안쪽 문구를 짧게** 잡아 카드가 글자만큼만 차지하게 한다
           (`방금 전 · 3줄 요약` → `3줄 · 방금 전`). 세로가 세 줄이라 짧아도 납작해지지 않는다.
      */}
      <div className="border-foreground/25 landing-light:border-border bg-popover landing-light:bg-card animate-float absolute -right-8 -bottom-8 z-10 rounded-2xl border px-4 py-3.5 shadow-lg [animation-delay:-2s] lg:-right-12">
        <span className="bg-landing-accent/10 text-landing-accent inline-flex rounded-full px-2.5 py-0.5 text-[11px] leading-4 font-semibold">
          액션
        </span>
        <p className="pt-2 text-[12px] leading-[18px] font-semibold">와이어프레임 작성</p>
        <p className="text-muted-foreground flex items-center gap-1.5 pt-1.5 text-[11px] leading-4">
          {/* 상태점 진행중=초록(§디자인 토큰) */}
          <span className="bg-landing-green size-[5px] rounded-full" aria-hidden />
          디자인 담당 · 8/5
        </p>
      </div>

      {/*
        둘레를 도는 그라데이션 링.
        ⚠️ 프레임 자신에게 걸면 안 된다 — 안쪽 배경이 반투명이라 링이 카드 속으로 비친다.
           래퍼가 링을 그리고, **불투명한 프레임이 안을 덮어** 테두리 1.5px만 남는다.
      */}
      <div className="glow-ring rounded-xl">
        {/* 앱 창은 불투명 표면(--popover) — 반투명이면 뒤 광선이 내용을 관통한다 */}
        <div className="border-border bg-popover overflow-hidden rounded-xl border shadow-2xl">
          {/* 브라우저 껍데기 — 실제 화면처럼 보이게 하는 최소한만 */}
          <div className="border-border bg-secondary flex items-center gap-2.5 border-b px-3 py-2.5">
            <span className="flex gap-1.5">
              {["#ef4444", "#f59e0b", "#22c55e"].map((color) => (
                <span
                  key={color}
                  className="size-[9px] rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            {/* ⚠️ `--card`(어두운 무대에서 흰색 4%)가 아니라 `--background`다 — 입력칸은 껍데기보다
                한 단 눌러야 눌린 자리로 읽히고, 반투명이 아니라 실제로 보인다 */}
            <span className="border-border bg-background text-muted-foreground/70 flex-1 rounded border px-2 py-0.5 text-[11px] leading-4">
              app.getz.kr
            </span>
          </div>

          <div className="flex min-h-[300px]">
            <div className="border-border bg-secondary/60 hidden w-[110px] shrink-0 flex-col gap-1 border-r p-2.5 sm:flex">
              <span className="flex items-center gap-1.5 px-1.5 pb-2">
                <ZLogo className="text-foreground size-3" />
              </span>
              <span className="bg-foreground text-background rounded px-2 py-1 text-[11px] leading-4">
                대시보드
              </span>
              {["프로젝트", "보드", "회의"].map((item) => (
                <span key={item} className="text-muted-foreground px-2 py-1 text-[11px] leading-4">
                  {item}
                </span>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
              <p className="text-[12px] leading-[18px] font-semibold">대시보드</p>

              <div className="grid grid-cols-3 gap-2">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-border bg-secondary/60 rounded-lg border px-2.5 py-2"
                  >
                    <p className="text-muted-foreground/70 truncate text-[9px] leading-[13px]">
                      {stat.label}
                    </p>
                    <p className="pt-0.5 text-[15px] leading-[22px] font-semibold tabular-nums">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-border overflow-hidden rounded-lg border">
                <p className="border-border bg-secondary/60 text-muted-foreground/70 border-b px-2.5 py-1.5 text-[9px] leading-[13px] tracking-[0.9px] uppercase">
                  최근 회의
                </p>
                {MEETINGS.map((meeting, index) => (
                  <div
                    key={meeting.title}
                    className={
                      index > 0
                        ? "border-border/60 flex items-center gap-2 border-t px-2.5 py-2"
                        : "flex items-center gap-2 px-2.5 py-2"
                    }
                  >
                    <span
                      className="size-[5px] shrink-0 rounded-full"
                      style={{ backgroundColor: meeting.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] leading-4">{meeting.title}</span>
                      <span className="text-muted-foreground/70 block text-[9px] leading-[13px]">
                        {meeting.team}
                      </span>
                    </span>
                    <span className="text-muted-foreground/70 shrink-0 text-[9px] leading-[13px]">
                      {meeting.when}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
