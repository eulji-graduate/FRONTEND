import { Check, Clock, MessagesSquare, UserMinus, X } from "lucide-react";

/*
  ⚠️ 공용 `CheckMark`는 아직 develop에 없다(#22·#26 브랜치에만 있음).
     그게 머지되면 여기도 그걸로 바꾼다 — 지금 만들면 같은 파일이 두 벌이 된다.
*/
import { cn } from "@/lib/utils";

import { COMPARISONS, FEATURES, PROBLEMS } from "../content";
import { AfterScreen } from "./after-screen";
import { FeatureMock } from "./feature-mock";
import { BuriedChatArt, EmptyNotesArt, LostContextArt } from "./problem-art";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * 겪어본 사람이 알아볼 문제 세 가지.
 * 글만 두면 심심하다 — 카드 위쪽에 각 문제를 그림 한 장으로 먼저 보여준다(시안).
 */
export function ProblemSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1144px] px-7">
        <SectionHeading label="Problem" title="회의는 했는데, 남는 게 없나요?" />

        {/*
          ⚠️ 나란한 세 장은 **같은 박자**로 올라온다. step을 다르게 주면 스크롤 도중
             한 장만 아래에 처져 배치가 어긋난 것처럼 보인다 — 줄 맞춤이 먼저다.
        */}
        <div className="grid gap-4 pt-12 md:grid-cols-3">
          {PROBLEMS.map((problem, index) => (
            <Reveal key={problem.title}>
              <div
                className={cn(
                  "border-border bg-card hover-lift h-full overflow-hidden rounded-xl border",
                  /* ⚠️ 이 섹션만 그림자가 없어서 밝은 무대에서 카드가 바닥에 붙어 보였다 */
                  "landing-light:shadow-[0_1px_2px_rgba(37,99,235,0.05),0_12px_30px_-14px_rgba(37,99,235,0.18)] landing-light:bg-gradient-to-b landing-light:from-white landing-light:to-[#fbfbfa]",
                )}
              >
                {/* 그림은 카드 폭을 꽉 채운다 — 가운데 작게 놓으면 카드가 비어 보인다 */}
                <div className="border-border flex h-[168px] items-center justify-center border-b px-5">
                  {index === 0 && <EmptyNotesArt />}
                  {index === 1 && <BuriedChatArt />}
                  {index === 2 && <LostContextArt />}
                </div>
                <div className="p-6">
                  {/* 제목 옆 아이콘 — 그림과 글 사이를 잇는 표식(§아이콘: lucide만, 이모지 금지) */}
                  <p className="flex items-center gap-2 text-[15px] leading-[22px] font-semibold">
                    <span className="bg-foreground/[0.07] text-foreground flex size-6 shrink-0 items-center justify-center rounded-md">
                      {index === 0 && <Clock className="size-3.5" aria-hidden />}
                      {index === 1 && <MessagesSquare className="size-3.5" aria-hidden />}
                      {index === 2 && <UserMinus className="size-3.5" aria-hidden />}
                    </span>
                    {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
                    <span>{problem.title}</span>
                  </p>
                  <p className="text-muted-foreground pt-2 text-[13px] leading-[21px] break-keep">
                    {problem.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * `**굵게**` 표기를 실제 굵은 글씨로 바꾼다.
 *
 * ⚠️ 예전엔 별표만 지웠다 — 강조하려고 적어둔 표기가 화면에서는 **아무 일도 하지 않았다.**
 *    마크다운 렌더러를 들이기엔 문장 하나라 과하다. 별표 기준으로 잘라 번갈아 굵게 칠한다.
 */
function EmphasizedText({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, index) =>
        index % 2 === 1 ? (
          <strong key={part} className="text-foreground font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** 기능 셋 — 좌우로 번갈아 놓아 스크롤이 단조롭지 않게 한다. */
export function FeatureSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1144px] px-7">
        <SectionHeading label="Features" title="별도 노력 없이 회의가 자산이 됩니다" />

        <div className="flex flex-col gap-14 pt-14">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.label}
              className={
                index % 2 === 1
                  ? "flex flex-col gap-6 lg:flex-row-reverse lg:items-center lg:gap-16"
                  : "flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-16"
              }
            >
              {/* 글과 축소판이 **서로 자기 자리 쪽에서** 밀려 들어온다 — 좌우가 번갈아 열린다 */}
              <Reveal from={index % 2 === 1 ? "right" : "left"} className="flex-1">
                {/* 라벨은 전부 액센트 파랑 — 색이 흩어지면 섹션끼리 따로 논다 */}
                <p className="text-landing-accent text-[11px] leading-4 font-semibold tracking-[1.1px] uppercase">
                  {feature.label}
                </p>
                <h3 className="pt-2 text-[28px] leading-[36px] font-semibold tracking-[-0.6px] break-keep">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground max-w-[520px] pt-3.5 text-[15px] leading-[26px] break-keep">
                  <EmphasizedText text={feature.body} />
                </p>
              </Reveal>

              <Reveal from={index % 2 === 1 ? "left" : "right"} step={1} className="flex-1">
                <FeatureMock kind={feature.label} />
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 지금까지 ↔ Z를 쓰면.
 *
 * ⚠️ **표로 만들지 않는다.** 두 열을 좌우로 늘어놓으면 줄이 붙어 읽혀서
 *    "회의록 수동 작성회의 끝나면 자동 정리"처럼 한 문장으로 뭉개진다 — 실제로 그랬다.
 *    항목마다 **카드 하나**를 주고, 그 안에서 위(지금까지) → 아래(Z를 쓰면)로 내려 읽게 한다.
 * ⚠️ 항목마다 카드를 세우지도 않는다 — 안이 비어 어색했다. 세로 실선에 **한 줄씩** 꿴다.
 * ⚠️ 위는 작고 흐리게+취소선, 아래는 한 급 크고 굵게 — 대비가 곧 메시지다.
 * ⚠️ 오른쪽에는 **그래서 무엇이 보이는지**를 화면 축소판으로 붙인다.
 *    글로만 "모아서 확인"이라고 하면 그림이 안 그려진다.
 */
export function CompareSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1144px] px-7">
        <SectionHeading label="Before · After" title="지금까지와 다릅니다" />

        <div className="grid items-center gap-10 pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          {/*
            카드 네 장을 세우니 안이 비어 어색했다 — 테두리를 걷고 **한 줄씩** 붙인다.
            왼쪽 세로 실선이 네 항목을 하나로 묶어 오른쪽 화면과 높이가 맞는다.
          */}
          <ol className="border-border flex flex-col gap-5 border-l pl-6">
            {COMPARISONS.map((row, index) => (
              <Reveal key={row.before} from="left" step={index % 3}>
                <li className="relative">
                  {/* 실선 위에 얹힌 점 — 항목이 어디서 시작하는지 */}
                  <span
                    aria-hidden
                    className="bg-border ring-background absolute top-[9px] -left-[27px] size-[7px] rounded-full ring-4"
                  />

                  {/* 위: 낡은 쪽. 작고 흐리게, 취소선 — 눈이 머물지 않게 */}
                  <p className="text-muted-foreground/70 flex items-center gap-1.5 text-[12px] leading-[18px] break-keep">
                    <X className="size-3 shrink-0" aria-hidden />
                    <span className="line-through">{row.before}</span>
                  </p>

                  {/* 아래: 바뀐 쪽. 한 급 크고 굵게, 초록 체크로 결과라는 걸 못 박는다 */}
                  <p className="flex items-start gap-2 pt-1 text-[17px] leading-[26px] font-semibold break-keep">
                    <span className="bg-landing-green mt-[5px] flex size-4 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-2.5 text-white" strokeWidth={3.5} aria-hidden />
                    </span>
                    {row.after}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>

          <Reveal from="right" step={1}>
            <AfterScreen />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
