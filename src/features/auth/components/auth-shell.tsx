"use client";

import { FileText, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ZLogo } from "@/components/icons/z-logo";
import { LegalDialog } from "@/features/legal/legal-dialog";
import { useMediaQuery } from "@/hooks/use-media-query";

import { AuthBackdrop } from "./auth-backdrop";
import { AuthPreview } from "./auth-preview";
import { SpotlightPanel } from "./spotlight-panel";

/**
 * 로그인 전 계정 화면의 껍데기 — 왼쪽 검정 패널 + 오른쪽 폼.
 *
 * ⚠️ 랜딩 셸(`LandingShell`)을 쓰지 않는다. 여기는 **밝기 선택도 상단바도 없는** 화면이다 —
 *    입력에 집중해야 하는 자리라 고를 것을 늘리지 않는다. 왼쪽 패널만 항상 어둡다.
 * ⚠️ 왼쪽은 좁은 화면(md 미만)에서 통째로 사라진다. 폼이 먼저다.
 */
/* ⚠️ 아이콘은 lucide만 쓴다 — 이모지 금지(§디자인 토큰). 문구마다 성격이 달라 그림도 다르다 */
const SELLING_POINTS = [
  { icon: Sparkles, text: "회의만 하면 요약이 쌓여요" },
  { icon: ListChecks, text: "내 할 일이 자동으로 꽂혀요" },
  { icon: FileText, text: "사람이 빠져도 일이 안 멈춰요" },
] as const;

interface AuthShellProps {
  children: ReactNode;
  /**
   * 약관 동의 안내를 보일지.
   * ⚠️ 제출이 끝난 화면(신청 완료)에서는 끈다 — 동의할 게 남지 않았는데 "계속 진행하면"이라고
   *    말하면 아직 할 일이 있는 줄 안다.
   */
  hasLegalNotice?: boolean;
}

export function AuthShell({ children, hasLegalNotice = true }: AuthShellProps) {
  /*
    ⚠️ 왼쪽 패널은 좁은 화면에서 `hidden`이지만, **숨긴다고 안 만들어지는 게 아니다.**
       three.js Canvas는 WebGL 컨텍스트를 잡고 매 프레임 도는데, 모바일에서 보이지도 않는 걸
       돌리면 배터리만 먹는다 — 아예 렌더 트리에서 뺀다.
  */
  const isWide = useMediaQuery("(min-width: 48rem)");

  return (
    /*
      ⚠️ 온보딩 셸과 같은 구조다 — **껍데기는 화면 높이에 고정**하고 스크롤은 안쪽에서만 일어난다.
         페이지 자체가 스크롤되거나 끝에서 튕기지 않는다(`overscroll-none`).
      ⚠️ 높이 조건(`@media(min-height:…)`)으로 잠그지 않는다. 기준값을 찍어 맞추는 방식은
         카드 높이가 바뀔 때마다 다시 재야 하고, 그 사이 화면에서는 잘린다.
    */
    <div className="h-screen-z flex overflow-hidden overscroll-none">
      {/* 왼쪽 — 제품이 뭘 하는지 한 번 더. 검정은 랜딩 무대와 같은 값이다 */}
      <SpotlightPanel className="relative hidden w-[46%] max-w-[720px] shrink-0 overflow-hidden bg-[#0a0a0a] md:block">
        {/* 무대 광원 — 랜딩과 같은 축(파랑·보라) */}
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(110%_80%_at_20%_25%,rgba(37,99,235,0.22)_0%,transparent_58%),radial-gradient(100%_70%_at_85%_95%,rgba(124,58,237,0.2)_0%,transparent_58%)]"
        />

        {/*
          ⚠️ 세 덩어리를 **다른 모서리에** 앉힌다 — 글은 왼쪽 위, 축소판은 오른쪽 가운데,
             3D는 왼쪽 아래. 한 줄로 세우면 가운데만 뭉치고 패널이 비어 보인다.
          ⚠️ 절대 배치 대신 **흐름**으로 잡는다. 절대 배치는 짧은 창에서 서로 겹치거나 잘린다.
        */}
        <div className="relative h-full px-10 py-14 xl:px-14">
          {/* 위 왼쪽 — 로고와 메시지 */}
          <div className="relative z-10 flex max-w-[460px] flex-col gap-9">
            {/* 왼쪽 패널 로고도 홈으로 가는 길이다 */}
            <Link
              href="/"
              aria-label="Z 홈으로"
              className="focus-visible:ring-ring w-fit rounded transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-hidden"
            >
              <ZLogo className="size-[38px] text-white" title="Z" />
            </Link>

            <div className="flex flex-col gap-6">
              {/* 두 줄의 무게를 다르게 준다 — 앞줄은 조건, 뒷줄이 결론이다 */}
              <h2 className="text-[38px] leading-[52px] font-semibold tracking-[-0.9px] text-white/70">
                회의를 하면,
                <br />
                <span className="text-white">조직의 기억이 된다</span>
              </h2>

              <ul className="flex flex-col gap-3.5">
                {SELLING_POINTS.map((point) => (
                  <li
                    key={point.text}
                    className="flex items-center gap-3 text-[15px] text-white/75"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                      <point.icon className="size-3.5 text-white/85" aria-hidden />
                    </span>
                    {/* 한글이 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
                    <span>{point.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/*
            아래 절반은 **한 장면**이다 — 3D Z가 왼쪽 뒤에서 돌고 그 앞으로 축소판이 겹친다.
            둘을 멀리 떼어 놓으면 모서리마다 조각이 떠 있는 것처럼 보인다.
          */}
          {/*
            ⚠️ 카드와 3D만 **패널 기준으로** 앉힌다. 글과 한 묶음으로 흐름에 두면
               글 위치까지 같이 움직여, 글은 위 · 카드는 가운데를 동시에 만들 수 없다.
          */}
          {/* 가운데 오른쪽 — 제품 축소판. 살짝 기울여 깊이를 준다(랜딩 3D 문법) */}
          <div className="tilt-scene absolute top-1/2 right-10 z-10 w-full max-w-[440px] -translate-y-1/2 xl:right-14">
            <div className="tilt-left">
              <AuthPreview />
            </div>
          </div>

          {/* 아래 왼쪽 — 도는 3D Z */}
          {isWide && (
            <div className="absolute bottom-6 left-4 z-0">
              <AuthBackdrop />
            </div>
          )}
        </div>
      </SpotlightPanel>

      {/*
        오른쪽 — 폼.
        ⚠️ 여기만 `overflow-y-auto`다. 화면이 낮으면 카드가 안 들어가는데 숨겨버리면
           [로그인] 버튼에 아예 닿을 수 없다. 평소에는 넘치지 않아 스크롤바가 안 보인다.
        ⚠️ 가운데 정렬을 `justify-center`로 하지 않는다 — 넘칠 때 위쪽이 스크롤 시작점 밖으로
           밀려나 못 보게 된다. `m-auto`는 자리가 남을 때만 가운데로 민다.
        흰 판만 두면 왼쪽 검정과 따로 논다.
        랜딩과 같은 광원(파랑·보라)을 아주 옅게 깔고 그레인을 얹어 한 손에서 나온 화면으로 잇는다.
      */}
      {/*
        ⚠️ 광원·그레인은 **스크롤 상자 밖**에 둔다. 안에 두면 `inset-0`이 스크롤되는 전체 길이가
           아니라 **보이는 만큼**만 덮어서, 폼이 길어지면 덮개가 끝나는 자리에 가로줄이 생기고
           그 아래는 맨 흰 바탕이 된다. 바깥에 두면 기둥 전체를 덮은 채 가만히 있는다.
      */}
      {/*
        ⚠️ 오른쪽 폼 칸은 **앱 테마와 무관하게 항상 밝다**(팀 결정). 왼쪽이 늘 검정이라
           오른쪽까지 어두워지면 화면 전체가 까매져 입력칸이 어디인지 안 보인다.
           밝기 스위치도 없는 화면이라 사용자가 되돌릴 방법도 없다.
        ⚠️ `bg-white`로 바르지 않고 **토큰째 덮는다**(`globals.css`의 `.surface-light`) —
           색만 칠하면 안쪽 입력칸·보더·글자색은 여전히 다크 토큰이라 흰 바탕에 흰 글씨가 된다.
      */}
      <div className="surface-light bg-background relative flex min-h-0 flex-1 flex-col">
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(90%_70%_at_15%_0%,rgba(37,99,235,0.07)_0%,transparent_58%),radial-gradient(85%_65%_at_90%_100%,rgba(124,58,237,0.07)_0%,transparent_58%)]"
        />
        <span className="film-grain" aria-hidden />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-12">
          {/*
          카드 하나만 가운데 띄우면 오른쪽이 텅 빈다.
          위에 로고·안내, 아래 도움말을 붙여 **세로로 읽히는 한 덩어리**로 만든다.
        */}
          <div className="relative m-auto flex w-full max-w-[600px] flex-col gap-8">
            {/*
            왼쪽 패널이 사라지는 좁은 화면에서는 여기 로고가 유일한 표식이다.
            ⚠️ **넓은 화면에서는 감춘다.** 왼쪽 패널에 이미 로고가 있어 같은 표식이 둘이 되고,
               카드 위에 홀로 뜬 조각처럼 보인다. 패널이 사라지는 좁은 화면에서만 켠다.
          */}
            <Link
              href="/"
              aria-label="Z 홈으로"
              className="focus-visible:ring-ring w-fit rounded transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:outline-hidden md:hidden"
            >
              <ZLogo className="text-foreground size-7" title="Z" />
            </Link>

            {children}

            {/*
            ⚠️ 페이지로 넘기지 않고 **모달**로 띄운다. 입력하던 폼이 날아가면 안 된다.
            ⚠️ 밑줄 대신 굵게 — 밑줄이 두 번 나오면 안내 문장이 링크 덩어리처럼 보인다.
          */}
            {hasLegalNotice && (
              <p className="text-muted-foreground/70 text-center text-[11px] leading-4 break-keep">
                계속 진행하면 <LegalDialog doc="terms">이용약관</LegalDialog>
                {"과 "}
                <LegalDialog doc="privacy">개인정보처리방침</LegalDialog>에 동의하는 것으로 봅니다
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
