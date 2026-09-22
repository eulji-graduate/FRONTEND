import type { ReactNode } from "react";

/**
 * 기업 설정의 카드 한 장.
 *
 * ⚠️ **저장소 관리·구독 화면과 같은 규격이다** — `rounded-2xl` · `px-7 pt-6 pb-3` 머리에
 *    17px 제목과 앞의 점 · 오른쪽에 작은 수치 · 그 아래 설명 한 줄 · 구획은 `border-t`.
 *    온보딩 카드는 머리에 `bg-muted` 띠를 두르는데, 그건 **한 번 지나가는 화면**의 모양이라
 *    워크스페이스 안에 그대로 가져오면 이 화면만 다른 서비스처럼 읽힌다.
 * ⚠️ 카드 **안쪽**(팀 트리·직급 행)은 온보딩 조각을 그대로 쓴다 — 같은 것을 고치는 자리라
 *    조작이 이어져야 한다. 맞춘 건 껍데기뿐이다.
 * ⚠️ **설명은 카드마다 있다.** 여기서 고치는 것들은 권한과 소속이 달린 값이라, 무엇이
 *    바뀌는지 안 적어 두면 눌러 보고 알게 된다.
 */
export function SettingCard({
  title,
  aside,
  description,
  children,
  footer,
}: {
  title: string;
  /** 제목 오른쪽 작은 수치(`팀 3개 · 역할 2개` 등) */
  aside?: ReactNode;
  /** 이 카드에서 무엇이 바뀌는지 한 줄 */
  description: ReactNode;
  children: ReactNode;
  /** 카드 밑단 — 저장 버튼이 온다 */
  footer?: ReactNode;
}) {
  return (
    <section className="border-border bg-card flex h-full flex-col overflow-hidden rounded-2xl border">
      <div className="flex items-baseline justify-between gap-3 px-7 pt-6 pb-3">
        <h2 className="text-[17px] leading-7 font-semibold tracking-[-0.3px]">{title}</h2>
        {aside && (
          <p className="text-foreground/75 shrink-0 -translate-x-px text-[12px] leading-4 tabular-nums">
            {aside}
          </p>
        )}
      </div>

      {/*
        ⚠️ **설명 자리를 세 줄로 잡아 둔다**(2026-08-11). 카드 둘을 나란히 놨는데 설명이
           한 줄(팀 체계)과 세 줄(직급·권한)이라, 바로 아래 **표 머리가 서로 다른 높이**에서
           시작했다 — 밑단(입력 줄·저장 줄)은 이미 맞아 있어서 위만 어긋난 게 더 눈에 띄었다.
        ⚠️ 74 = 줄 높이 18 × 3 + 아래 여백 20. **여백까지 더해야 한다** — `box-sizing: border-box`라
           54로 두면 두 줄짜리 설명(36+20=56)이 그 값을 넘어 2px 더 커진다.
      */}
      <p className="text-muted-foreground min-h-[74px] px-7 pb-5 text-[12px] leading-[18px] break-keep">
        {description}
      </p>

      {/*
        ⚠️ `flex-1` — 카드 둘을 나란히 놓으면 키가 다른데, 이게 없으면 짧은 쪽 저장 줄이
           카드 중간에 뜬다. 늘어나는 건 목록 자리고 저장 줄은 바닥에 붙는다.
        ⚠️ 세로 flex인 것도 같은 이유다. 안쪽에서 **목록만** 늘어나야 [추가] 줄이 목록 끝에
           붙는다 — 블록으로 두면 짧은 카드의 [추가] 줄이 허공에 뜬다.
      */}
      <div className="border-border flex min-h-0 flex-1 flex-col border-t">{children}</div>

      {footer && (
        <div className="border-border flex items-center justify-end gap-2 border-t px-7 py-4">
          {footer}
        </div>
      )}
    </section>
  );
}
