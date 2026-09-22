import { CheckMark } from "@/components/common/check-mark";
import { ZLogo } from "@/components/icons/z-logo";

/**
 * 다 됐다는 표식 — 빈 원에서 시작해 먹색이 차오르고 그 위에 **Z 로고**가 얹힌다.
 * 체크는 작은 배지로 옆에 붙어 살랑인다.
 *
 * ⚠️ 배지는 초록이 아니라 카드색 바탕에 먹색이다 — 색으로 알리는 건 에러뿐(§디자인 토큰).
 * ⚠️ 배지는 **테두리 있는 원**이다. 검은 원 위에 걸쳐 있어서, 테두리가 없으면 바탕만 남아
 *    원이 파먹힌 것처럼 보인다.
 * ⚠️ 온보딩 완료·기업 등록 완료가 같은 표식을 쓴다 — 끝났다는 신호는 화면마다 다르면 안 된다.
 * ⚠️ 배지·체크·로고 크기를 **전부 `size`에서 계산한다.** 배지만 고정 px로 두면 지름을 키우거나
 *    줄였을 때 비율이 깨져 다른 그림이 된다.
 */
interface ZDoneMarkProps {
  /** 원 지름(px). 로고와 배지는 여기에 맞춰 따라간다 */
  size?: number;
}

export function ZDoneMark({ size = 68 }: ZDoneMarkProps) {
  // 기본값(68)에서 로고 28px · 배지 20px · 체크 11px이 나오는 비율이다
  const logoSize = size * 0.41;
  const badgeSize = size * 0.29;
  const checkSize = Math.round(badgeSize * 0.55);

  return (
    <span className="relative" aria-hidden>
      <span
        style={{ width: size, height: size }}
        className="border-border relative flex items-center justify-center rounded-full border"
      >
        <span className="bg-foreground animate-fill-in absolute inset-0 rounded-full" />
        <ZLogo
          style={{ width: logoSize, height: logoSize }}
          className="text-background animate-mark-in relative"
        />
      </span>

      {/* 원 테두리에 살짝 걸치게 — 지름의 3%만 밖으로 뺀다 */}
      <span className="animate-mark-in absolute" style={{ top: -size * 0.03, right: -size * 0.03 }}>
        <span
          style={{ width: badgeSize, height: badgeSize }}
          className="bg-card border-foreground animate-float flex items-center justify-center rounded-full border"
        >
          <CheckMark size={checkSize} strokeWidth={3} />
        </span>
      </span>
    </span>
  );
}
