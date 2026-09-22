"use client";

import { type KeyboardEvent, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import {
  DEFAULT_SCALE,
  nextScaleByKey,
  parseScale,
  recommendScale,
  SCREEN_SCALES,
  suggestScale,
} from "../scale";
import {
  readScale,
  readViewport,
  subscribeScale,
  subscribeViewport,
  writeScale,
} from "../scale-store";

/**
 * 화면 배율 카드.
 *
 * ⚠️ **자동으로 안 바꾼다.** 기준 폭에서 많이 벗어났으면 한 줄로 권하기만 한다 —
 *    브라우저는 화면의 물리적 크기를 안 알려줘서 27인치 모니터와 노트북을 구분할 수 없고,
 *    지금 배율을 일부러 고른 사람에게 강제로 바꾸면 서비스가 고장 난 것으로 보인다.
 * ⚠️ **좁은 쪽만 권한다**(2026-08-06). 화면이 좁으면 크게 보이므로 줄이라고 권한다.
 *    넓은 화면은 작게 보이지만 **키우는 배율을 없앴으므로 권할 값이 없다** — 답이 없는
 *    안내는 하지 않는다(§정직성 · DECISIONS §화면 배율).
 * ⚠️ 값은 **이 기기에만** 남는다. 계정을 따라다니면 노트북과 모니터가 같은 배율이 된다.
 * ⚠️ 배율은 `<html>`의 변수 하나로 세우고, 실제로 줄이는 일은 `body`가 한다(`globals.css`).
 * ⚠️ 본문에만 걸면 사이드바·상단바가 따로 논다. 그리고 `100dvh`를 쓰는
 *    화면들이 어긋난다.
 */
export function ScreenScaleCard() {
  /*
    ⚠️ 서버는 저장된 배율을 모른다. 첫 렌더는 기본값으로 그리고 **구독이 지금 값을 알려 줄 때**
       맞춘다 — 효과 본문에서 저장소를 읽으면 렌더가 한 번 더 돈다.
    ⚠️ **화면은 안 튄다.** 실제 확대는 첫 페인트 전에 루트 부트 스크립트가 이미 끝냈고,
       여기서 정하는 건 "어느 칸이 눌려 있나"뿐이다.
  */
  /*
    ⚠️ `null`로 시작한다 — 서버는 저장값을 모른다. 여기에 `localStorage`를 바로 읽어 넣으면
       서버(100%)와 클라이언트(실제 값)의 첫 렌더가 어긋나 하이드레이션 경고가 난다.
       구독이 값을 알려 줄 때 맞춘다.
  */
  const [stored, setStored] = useState<string | null>(null);
  const [viewport, setViewport] = useState("");

  useEffect(() => subscribeScale(() => setStored(readScale())), []);
  useEffect(() => subscribeViewport(() => setViewport(readViewport())), []);

  const scale = parseScale(stored);
  const width = Number(viewport) || 0;
  const hint = suggestScale({ viewportWidth: width, hasChosen: stored !== null });
  // ⚠️ 권한다면 **몇 %인지까지** 말한다. "줄여 보세요"만으로는 어디까지 줄일지 모른다
  const recommended = recommendScale(width);

  /*
    ⚠️ **DOM을 맞추는 건 효과의 일이다.** 브라우저는 React 밖의 시스템이라, 고른 값이 바뀔 때마다
       여기서 한 번 반영한다 — 이벤트 핸들러에서 직접 쓰면 다른 탭에서 바뀐 값이 안 따라온다.
    ⚠️ 100%면 변수를 지워 기본값(`1`)으로 돌려놓는다.
    ⚠️ **저장값을 읽기 전(`stored === null`)에는 손대지 않는다.** 부트 스크립트가 첫 페인트
       전에 이미 올바른 배율을 세워 뒀는데, 여기서 값을 알기도 전에 100%로 덮으면
       그 확대가 한 번 풀렸다가 되돌아온다 — 부트 스크립트가 막으려던 튐이 이 화면에서만
       재발한다. 구독이 값을 준 뒤부터 맞춘다.
  */
  useEffect(() => {
    if (stored === null) return;

    const root = document.documentElement;
    const ratio = scale / DEFAULT_SCALE;

    /*
      ⚠️ **변수 하나만 세운다.** 실제로 줄이는 일은 `globals.css`의 `body`가
         `transform: scale()`로 한다 — 전에는 여기서 `zoom`을 직접 걸었는데, `zoom`은
         배율을 레이아웃에 섞어 좌표를 다루는 코드를 전부 어긋나게 했다
         (DECISIONS §화면 배율).
    */
    if (scale === DEFAULT_SCALE) root.style.removeProperty("--app-scale");
    else root.style.setProperty("--app-scale", String(ratio));
  }, [scale, stored]);

  /*
    ⚠️ 방향키로 배율을 옮긴다. 값을 바꾸면 리렌더로 `tabIndex`가 새 칸에 붙으므로,
       그 뒤 **새로 선택된 칸에 포커스를 옮겨** 준다 — 안 그러면 포커스가 방금 -1이 된
       칸에 남아 다음 방향키가 안 먹는다. React 밖 DOM 조작이라 여기서 직접 한다.
  */
  const handleScaleKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextScaleByKey(scale, event.key);
    if (next === null) return;

    event.preventDefault();
    writeScale(next);
    const target = event.currentTarget.querySelector<HTMLButtonElement>(`[data-scale="${next}"]`);
    target?.focus();
  };

  return (
    /* ⚠️ 옆 카드(테마)와 **바닥을 맞춘다** — 마지막 줄을 아래로 밀어(`mt-auto`) 높이를 채운다 */
    <section className="border-border bg-card flex h-full flex-col rounded-2xl border p-7">
      <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">화면 배율</h2>

      <p className="text-muted-foreground pt-2 text-[13px] leading-[21px] break-keep">
        글자와 여백이 한 번에 커지고 작아집니다.{" "}
        <span className="text-foreground font-medium">이 기기에만</span> 저장되고 다른 기기에는
        영향을 주지 않습니다.
      </p>

      {/*
        ⚠️ 라디오 그룹이다. 네 값 중 **하나만** 고르는 자리라 버튼 넷을 나열하면
           스크린 리더에서 서로 무관한 버튼으로 읽힌다(§a11y).
        ⚠️ **방향키로 옮긴다(roving tabindex).** `role="radio"`라고만 하고 방향키를 안 붙이면
           스크린 리더 사용자가 배율을 바꿀 수 없다 — 라디오 그룹의 키보드 계약이다.
           탭은 **선택된 칸 하나**에만 멈추고(나머지 `tabIndex={-1}`), 좌우/상하 키로
           고르며 이동한다.
      */}
      {/*
        ⚠️ **옆 카드(테마)의 타일과 가운데를 맞춘다**(2026-08-11). 둘 다 카드 바닥에 붙어 있는데
           타일은 83px, 배율 버튼은 36px이라 바닥만 같고 **가운데가 23px 어긋나** 보였다 —
           버튼을 타일과 같은 높이의 띠 안에 넣어 세로 가운데에 세운다.
        ⚠️ 83은 타일의 조립값이다: 미리보기 44 + 라벨 13 + 안쪽 여백 8×3 + 테두리 2.
           타일이 바뀌면 이 값도 같이 본다.
      */}
      <div className="mt-auto pt-5">
        <div className="flex min-h-[83px] items-center">
          <div
            role="radiogroup"
            aria-label="화면 배율"
            onKeyDown={handleScaleKeys}
            /*
          ⚠️ 네 칸 격자다 — `flex-wrap`은 남는 폭이 모자라면 `100%`만 다음 줄로 떨어뜨려 셋+하나로 갈린다.
          ⚠️ **카드 폭을 다 쓴다.** 상한을 걸어 왼쪽에 몰아 뒀더니 옆 카드(테마)는 세 칸이
             고르게 퍼져 있는데 여기만 한쪽으로 쏠려 보였다 — 같은 층에 선 카드끼리는
             안쪽 리듬도 같아야 한다.
        */
            className="grid w-full grid-cols-4 gap-2"
          >
            {SCREEN_SCALES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={value === scale}
                tabIndex={value === scale ? 0 : -1}
                data-scale={value}
                onClick={() => writeScale(value)}
                className={cn(
                  "focus-visible:ring-ring h-9 rounded-lg border px-2 text-[13px] leading-none tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
                  value === scale
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-secondary",
                )}
              >
                {value}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {hint !== "none" && (
        /*
          ⚠️ **권하기만 한다.** 자동으로 바꾸면, 지금 배율을 일부러 고른 사람에게는 서비스가
             고장 난 것으로 보인다.
          ⚠️ 색을 쓰지 않는다 — 잘못된 상태가 아니라 알려 주는 말이다(§디자인 토큰).
        */
        <p className="border-border bg-secondary mt-4 rounded-lg border px-3.5 py-3 text-[12px] leading-[18px] break-keep">
          화면이 기준보다 좁아 다른 기기보다 <span className="font-medium">크게</span> 보입니다.{" "}
          {/*
            ⚠️ "같은 폭이 된다"고 단언하지 않는다. 권장값은 배율 목록 중 **가장 가까운** 값일
               뿐이라, 좁은 창(약 1152px 미만)에서는 눌러도 기준 1440px에 못 미친다 —
               "가까워진다"까지만 말한다(§정직성).
          */}
          <span className="text-foreground font-medium">{recommended}%</span>를 누르면 기준 폭에
          가까워집니다.
        </p>
      )}
    </section>
  );
}
