import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 역할마다 다른 홈 화면 축소판 — **넷이 같은 뼈대를 쓴다.**
 *
 * 지표 세 칸 → 목록 두 줄 → 강조 띠 하나. 이 순서는 실제 화면이 읽히는 순서와 같다:
 * *얼마나 있나 → 무엇이 있나 → 지금 뭘 해야 하나.*
 *
 * ⚠️ **전에는 넷이 제각각이었다.** Owner·Leader는 지표+띠, `+Admin`은 지표+목록+띠,
 *    Member는 목록만이라 **탭을 옮길 때마다 액자 높이가 튀었다** — 화면이 바뀐 게 아니라
 *    무너진 것처럼 보인다. 데이터만 갈아 끼우게 바꾸면 높이가 저절로 같아진다.
 * ⚠️ `+Admin`은 역할이 아니라 겸직 권한이다(#59) — 이름 앞의 `+`가 그 뜻이다.
 * ⚠️ **숫자에 색을 칠하지 않는다.** 전에는 셋을 파랑·주황·초록으로 칠했는데, 뜻이 다른 게
 *    아니라 그냥 셋이라 산만하기만 했다. 역할 색은 **아래 띠 하나**에서만 쓴다.
 * ⚠️ 목록 왼쪽의 **이니셜 동그라미를 뺐다.** `제품팀 팀장`의 `제`처럼 사람 이름이 아니라
 *    직책의 첫 글자였어서 아무 뜻이 없었다 — 대신 상태 점을 둔다.
 * ⚠️ 숫자·이름은 전부 목이다.
 */
import { ROLE_MOCKS } from "./role-mocks";
import type { RoleName } from "./role-views";

export function RoleScreen({ name }: { name: RoleName }) {
  const mock = ROLE_MOCKS[name];

  return (
    /*
      ⚠️ **실제 화면과 같은 문법으로 세운다.** `/manage/billing`이 그렇듯 카드마다 `● 제목`이 붙고,
         카드 안에서 지표는 `--secondary` 칸으로, 알림은 색 띠로 앉는다.
         전에는 카드도 제목도 없이 칸만 늘어놔서 우리 화면이 아니라 아무 대시보드처럼 보였다.
    */
    <div className="flex flex-col gap-2.5">
      <Card title={mock.summaryLabel}>
        <div className="grid grid-cols-3 gap-2">
          {mock.metrics.map((metric, index) => (
            <div
              key={metric.label}
              style={{ animationDelay: `${index * 80}ms` }}
              className="bg-secondary/50 animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both rounded-lg px-2.5 py-2 duration-500"
            >
              <p className="text-muted-foreground/80 truncate text-[9px] leading-[13px]">
                {metric.label}
              </p>
              <p className="pt-0.5 text-[15px] leading-[21px] font-semibold tabular-nums">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* 막대 — 실제 사용량 카드와 같은 모양(값은 오른쪽 끝, 막대는 그 아래 한 줄) */}
        <div className="pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground/80 text-[9px] leading-[13px]">
              {mock.progress.label}
            </span>
            <span className="text-[11px] leading-[14px] font-medium tabular-nums">
              {mock.progress.value}
            </span>
          </div>
          <div className="bg-secondary mt-1 h-1 overflow-hidden rounded-full">
            <div
              className="bg-foreground h-full rounded-full transition-[width] duration-700"
              style={{ width: `${Math.round(mock.progress.ratio * 100)}%` }}
              aria-hidden
            />
          </div>
        </div>

        {/* 지금 손대야 하는 것 하나 — 역할 색은 여기서만 쓴다(실제 사용량 카드의 안내 띠와 같다) */}
        <div className={cn("mt-3 rounded-lg px-3 py-2", mock.surface)}>
          <p className="text-[11px] leading-[14px] font-semibold">{mock.banner.title}</p>
          <p className="text-foreground/80 truncate pt-0.5 text-[11px] leading-[14px]">
            {mock.banner.detail}
          </p>
        </div>
      </Card>

      <Card title={mock.listLabel}>
        <ul className="divide-border/60 divide-y">
          {mock.rows.map((row) => (
            <li key={row.title} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
              {/* 끝난 줄은 점을 흐리게 — 색을 하나 더 쓰지 않고 명도로만 가른다 */}
              <span
                className={cn(
                  "size-[5px] shrink-0 rounded-full",
                  row.isDone ? "bg-muted-foreground/30" : "bg-foreground",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] leading-4">{row.title}</span>
                <span className="text-muted-foreground/70 block truncate text-[9px] leading-[13px]">
                  {row.detail}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[9px] leading-[14px]",
                  row.isDone ? "bg-secondary text-muted-foreground/70" : mock.surface,
                )}
              >
                {row.state}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/**
 * 카드 한 장 — **실제 화면의 섹션과 같은 모양**이다(`● 제목` + 내용).
 *
 * ⚠️ 점 표식은 온보딩·구독 화면이 쓰는 것과 같다. 이게 있어야 "우리 화면"으로 읽힌다.
 * ⚠️ 면은 `--card`가 아니라 **`--popover`** 다. 어두운 무대에서 `--card`는 흰색 4% 반투명으로
 *    재정의되어(`html.landing-night #landing-stage`) 무대 위에서 거의 사라진다 —
 *    `--popover`는 불투명(#171717)이라 그 위에 얹힌 게 보인다.
 */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border bg-popover animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both rounded-xl border p-3 duration-500">
      <h3 className="flex items-center gap-1.5 pb-2 text-[11px] leading-[14px] font-semibold">
        <span className="bg-foreground size-[5px] rounded-full" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}
