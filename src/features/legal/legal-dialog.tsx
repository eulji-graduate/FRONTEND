"use client";

import { type ReactNode, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PrivacyContent } from "./privacy-content";
import { TermsContent } from "./terms-content";

/**
 * 약관·개인정보를 **모달로** 보여준다.
 *
 * ⚠️ 링크로 페이지를 열면 입력하던 폼이 통째로 날아간다 — 로그인·등록 화면에서는 치명적이다.
 *    읽고 닫으면 하던 자리로 돌아오도록 모달로 띄운다.
 * ⚠️ 페이지(`/terms`·`/privacy`)도 그대로 둔다. 주소를 공유하거나 북마크할 수 있어야 하고,
 *    약관은 법적으로도 따로 가리킬 수 있어야 한다.
 * ⚠️ 본문이 길다 — 모달 안에서만 스크롤한다(`overflow-y-auto`). 페이지가 같이 밀리면 안 된다.
 */
const DOCS = {
  terms: { title: "이용약관", description: "Z를 쓰실 때 적용되는 약속입니다." },
  privacy: { title: "개인정보처리방침", description: "어떤 정보를 왜 다루는지 적어 두었습니다." },
} as const;

interface LegalDialogProps {
  doc: keyof typeof DOCS;
  /** 모달을 여는 글자 */
  children: ReactNode;
}

export function LegalDialog({ doc, children }: LegalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const meta = DOCS[doc];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* ⚠️ 이 Dialog는 `asChild`를 받지 않는다 — 트리거 자체에 스타일을 준다 */}
      <DialogTrigger className="text-foreground focus-visible:ring-ring rounded font-semibold transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:outline-hidden">
        {children}
      </DialogTrigger>

      {/*
        ⚠️ `gap-0` — DialogContent가 자체 `gap-4`를 갖고 있어 아래 `mt-*`와 겹쳐 두 배가 된다.
           여백은 여기서 한 곳으로만 준다(공용 `ResultDialog`와 같은 규칙).
        ⚠️ 본문이 길다 — 머리는 고정하고 **본문만** 스크롤한다.
        ⚠️ 높이를 `flex-1`로 잡지 않는다. 이 Dialog의 기본 레이아웃이 `grid`라
           `flex-1`이 먹지 않아 내용이 잘린 채 스크롤도 안 됐다.
           스크롤 상자에 **직접 `max-h`** 를 준다 — 짧은 글은 그만큼만, 긴 글은 스크롤된다.
      */}
      {/*
        ⚠️ **모달 자체**를 화면보다 작게 묶는다. 본문에만 `max-h`를 주면 머리·안쪽 여백 높이가
           그 위에 더해져, 세로가 짧은 화면에서 팝업이 화면 밖으로 삐져나간다 —
           가운데 고정이라 닫기 버튼에도 못 닿는다.
        ⚠️ 행을 `auto`(머리) + `minmax(0,1fr)`(본문)로 나눈다. `minmax(0,…)`이 있어야
           본문이 내용 높이 밑으로 줄어들 수 있다(그래야 스크롤이 생긴다).
      */}
      {/*
        ⚠️ `surface-light` — 이 창은 **로그인 전 화면에서만** 뜨는데, 포털로 `<body>` 밑에
           붙어 폼 칸 바깥에 렌더된다. 조상 토큰이 닿지 않아 앱이 다크면 창만 까매졌다.
      */}
      <DialogContent className="surface-light grid max-h-[min(calc(100dvh-2rem),620px)] grid-rows-[auto_minmax(0,1fr)] gap-0 p-8 sm:max-w-[640px]">
        <DialogHeader className="items-center gap-2 text-center">
          <DialogTitle className="text-xl leading-[26px] font-semibold tracking-[-0.4px]">
            {meta.title}
          </DialogTitle>
          <DialogDescription className="text-center text-[13px] leading-[21px] break-keep">
            {meta.description}
          </DialogDescription>
        </DialogHeader>

        {/*
          ⚠️ 바깥에 `overflow-hidden`을 걸지 않는다. 걸면 첫 카드의 위 테두리가 잘려 나간다 —
             흐림 띠는 스크롤 상자 위에 얹히는 것이라 굳이 잘라낼 필요가 없다.
          ⚠️ 안쪽은 `px-1`·`pt-4`만큼 물러선다. 첫 카드는 `first:mt-0`이라 위 여백이 없어,
             상자에 딱 붙으면 둘째 카드보다 위가 좁아 잘린 것처럼 보인다.
          ⚠️ 스크롤 막대는 감춘다 — 모달 틀이 이미 경계를 말해 준다.
          ⚠️ 아래에 `pb-9`를 둔다. 흐림 띠(32px)가 마지막 줄을 덮어 **글이 잘린 것처럼** 보였다 —
             띠 높이만큼 여백을 둬야 끝까지 읽힌다.
        */}
        <div className="relative -mx-1 mt-5 min-h-0">
          <div
            /*
              ⚠️ 스크롤 상자에 **포커스가 가야 한다**(`tabIndex={0}`). 본문에 링크·버튼이 없어서,
                 이게 없으면 키보드만 쓰는 사람은 긴 약관을 아예 내릴 수 없다.
              ⚠️ 넘칠 때만 흐림 띠를 켠다 — 개인정보처리방침처럼 짧은 글에서는 스크롤이 없는데도
                 위아래가 흐려져 잘린 것처럼 보인다. 실제 높이를 재서 판단한다.
              ⚠️ `useEffect` 대신 **ref 콜백**에서 잰다. 효과에서 상태를 바꾸면 렌더가 한 번 더 돈다.
              ⚠️ 창 크기가 바뀌면 담기는 높이도 바뀐다 — `ResizeObserver`로 다시 잰다.
                 한 번만 재면 넓혔을 때 띠가 남거나, 줄였을 때 안 뜬다.
            */
            role="region"
            aria-label={`${meta.title} 본문`}
            tabIndex={0}
            ref={(node) => {
              if (!node) return;
              const measure = () => setHasOverflow(node.scrollHeight > node.clientHeight + 1);
              measure();
              const observer = new ResizeObserver(measure);
              observer.observe(node);
              return () => observer.disconnect();
            }}
            className="focus-visible:ring-ring h-full overflow-y-auto px-1 pt-4 pb-9 focus-visible:ring-2 focus-visible:outline-hidden"
          >
            {doc === "terms" ? <TermsContent /> : <PrivacyContent />}
          </div>

          {hasOverflow && (
            <>
              <span
                aria-hidden
                className="from-card pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b to-transparent"
              />
              <span
                aria-hidden
                className="from-card pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent"
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
