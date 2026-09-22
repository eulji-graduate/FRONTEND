import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** 폼 카드 — 네 화면이 같은 틀을 쓴다 */
interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** 카드 아래 안내 줄(가입 링크 등) */
  footer?: ReactNode;
  /** 카드 머리 배지 아이콘 — 무슨 화면인지 한눈에 */
  icon?: LucideIcon;
  /** "1 / 2"처럼 어디쯤인지 — 두 단계 흐름에서 길을 잃지 않게 */
  step?: string;
  /**
   * 제목 위에 세우는 큰 표식(완료 화면의 Z 마크 등).
   * ⚠️ 있으면 머리를 **가운데로** 세운다 — 표식만 가운데 두고 제목이 왼쪽에 붙으면 축이 어긋난다.
   */
  mark?: ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  icon: Icon,
  step,
  mark,
}: AuthCardProps) {
  return (
    <>
      <div className="border-border bg-card ring-rgb-static vt-auth-card relative overflow-hidden rounded-2xl border p-12 shadow-[0_24px_60px_-28px_rgba(124,58,237,0.45)]">
        {/* 위쪽 액센트 띠 — 카드가 그냥 흰 상자로 끝나지 않게 */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#3b82f6,#7c3aed,transparent)]"
        />

        {/*
          ⚠️ 아이콘을 **배지 상자에 담아 따로 세우지 않는다.** 제목 위에 아이콘만 덩그러니 뜨면
             앱 아이콘처럼 보이고 제목과 따로 논다. 제목 줄에 나란히 두고, 단계는 반대쪽 끝에.
        */}
        {/*
          ⚠️ 아이콘과 제목을 **줄을 나눠** 둔다. 한 줄에 나란히 두면 한글 글자 중심과 아이콘
             중심이 어긋나 수평이 어색해진다 — 줄을 나누면 그 문제가 아예 없다.
        */}
        {mark && <div className="flex justify-center pb-6">{mark}</div>}

        {!mark && (Icon || step) && (
          <div className="flex items-center justify-between pb-3.5">
            {Icon ? <Icon className="text-muted-foreground size-[22px]" aria-hidden /> : <span />}
            {step && (
              <span className="border-border text-muted-foreground rounded-full border px-2.5 py-1 text-[11px] leading-4 tracking-[0.5px] tabular-nums">
                {step}
              </span>
            )}
          </div>
        )}

        <h1
          className={`text-[28px] leading-9 font-semibold tracking-[-0.6px] ${mark ? "text-center" : ""}`}
        >
          {title}
        </h1>
        {description && (
          <p
            className={`text-muted-foreground pt-2.5 text-[13px] leading-5 break-keep ${mark ? "text-center text-balance" : ""}`}
          >
            {description}
          </p>
        )}

        <div className="pt-6">{children}</div>
      </div>

      {footer && (
        <p className="text-muted-foreground pt-1 text-center text-[13px] leading-5">{footer}</p>
      )}
    </>
  );
}
