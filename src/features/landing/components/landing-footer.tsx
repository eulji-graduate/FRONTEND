import { Package, Scale } from "lucide-react";
import Link from "next/link";

import { ZLogo } from "@/components/icons/z-logo";

/**
 * 푸터.
 *
 * ⚠️ 약관·개인정보·권한 안내는 **각각 독립된 주소**를 갖는다.
 *    랜딩 안에서 스크롤로 넘기지 않는다 — 주소를 공유하거나 북마크할 수 있어야 하고,
 *    약관은 법적으로도 따로 가리킬 수 있어야 한다.
 * ⚠️ 여기 적힌 화면은 **전부 실제로 있다.** 아직 없는 화면을 미리 적어 두지 않는다 —
 *    누르면 404가 뜬다(§정직성). 화면이 생기면 그때 한 줄 추가한다.
 */
const COLUMNS = [
  {
    title: "제품",
    items: [
      { label: "요금제", href: "/plans" },
      { label: "권한 매트릭스", href: "/roles" },
      { label: "오시는 길", href: "/location" },
    ],
  },
  {
    title: "법적 고지",
    items: [
      { label: "이용약관", href: "/terms" },
      { label: "개인정보처리방침", href: "/privacy" },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="relative z-10 py-12">
      <div className="mx-auto grid w-full max-w-[1144px] gap-10 px-7 sm:grid-cols-3">
        <div>
          {/* 로고만 둔다 — 옆에 "Z" 글자를 또 쓰면 같은 말이 두 번이다 */}
          <Link href="/" aria-label="Z 홈" className="inline-block">
            <ZLogo className="text-foreground size-[20px]" title="Z" />
          </Link>
          <p className="text-muted-foreground max-w-[200px] pt-2.5 text-[13px] leading-[21px] break-keep">
            회의를 하면, 조직의 기억이 된다
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="flex items-center gap-1.5 text-[12px] leading-[18px] font-semibold tracking-[1.2px] uppercase">
              {column.title === "제품" ? (
                <Package className="text-foreground/70 size-3.5" aria-hidden />
              ) : (
                <Scale className="text-foreground/70 size-3.5" aria-hidden />
              )}
              {/* 한글 글자가 상자 안에서 위쪽에 앉아 아이콘보다 떠 보인다 — 1px 내려 맞춘다 */}
              <span>{column.title}</span>
            </p>
            <ul className="flex flex-col gap-[7px] pt-2.5">
              {column.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded text-[13px] leading-5 transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[1144px] px-7">
        <p className="text-muted-foreground/70 mt-9 text-right text-[12px] leading-[18px]">
          © 2026 Z. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
