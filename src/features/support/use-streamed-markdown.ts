import { useEffect, useMemo, useState } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";

import { tokenizeForStreaming } from "./tokenize-for-streaming";

/**
 * 흐르는 속도 — **초당 조각 수**다(조각 하나 = 한 글자, `tokenize-for-streaming`).
 *
 * ⚠️ **간격(ms)이 아니라 속도로 잡는다.** 옛 `setInterval(45ms)`은 프레임 주기(60Hz=16.7ms)의
 *    배수가 아니라서 조각이 프레임에 고르게 안 떨어졌다 — 한 프레임에 두 조각이 몰리고 다음
 *    프레임엔 하나도 안 오는 식으로 덜컹거렸다. 흘러간 시간 × 속도로 계산하면 프레임마다
 *    갈 만큼만 나아가서, 화면 주사율이 얼마든 같은 시간에 같은 만큼 흐른다.
 * ⚠️ 60Hz에서 프레임당 약 한 글자다. 옛 낱말 속도(초당 22낱말 ≒ 55자)와 총 시간은 같게 뒀다 —
 *    바뀐 건 매끄러움이지 빠르기가 아니다.
 */
const CHUNKS_PER_SECOND = 55;

/**
 * 답이 서버에서 흘러오는 것처럼 청크 단위로 흘려 보여준다.
 *
 * ⚠️ **연출이다.** 답은 이미 번들 안에 다 있다(`SupportWidget` §서버를 부르지 않는다) —
 *    진짜로 스트리밍되는 게 아니라, 다 가진 답을 조금씩 흘려서 보여줄 뿐이다.
 *    화면 문구("자주 묻는 질문에서 찾아드립니다")가 이미 AI·서버가 아니라고 말하고 있으니
 *    이 연출이 그 말을 뒤집지는 않는다.
 * ⚠️ **모션을 줄여 달라는 사람에게는 안 건다**(`prefers-reduced-motion`) — 켜자마자
 *    전부 보여준다(§smooth-scroll과 같은 판단).
 */
export function useStreamedMarkdown(content: string) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const chunks = useMemo(() => tokenizeForStreaming(content), [content]);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;

    /*
      ⚠️ **`requestAnimationFrame`으로 흘린다.** 타이머로 밀면 조각이 도착하는 시점과 브라우저가
         다시 그리는 시점이 어긋나 글이 덜컹거린다 — rAF는 "이 프레임을 그리기 직전"에 불리므로
         지금 계산한 만큼이 그 프레임에 그대로 나간다.
      ⚠️ 갈 곳은 **누적이 아니라 절대 위치**로 잡는다(`시작 후 흐른 시간 × 속도`). 프레임을
         한 번 건너뛰어도 다음 프레임이 제자리를 찾아가서, 탭을 잠깐 가렸다 돌아와도 밀리지 않는다.
    */
    let frame = 0;
    let startedAt: number | null = null;

    const step = (now: number) => {
      startedAt ??= now;
      const elapsedSeconds = (now - startedAt) / 1000;
      const next = Math.min(chunks.length, Math.floor(elapsedSeconds * CHUNKS_PER_SECOND));
      setRevealed(next);
      if (next < chunks.length) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [chunks, reduceMotion]);

  /* 모션을 줄여 달라는 사람 · 아직 안 흐른 첫 틱에는 다 보여준 값으로 대체한다 */
  const effectiveRevealed = reduceMotion ? chunks.length : revealed;

  return {
    text: chunks.slice(0, effectiveRevealed).join(""),
    isStreaming: !reduceMotion && effectiveRevealed < chunks.length,
  };
}
