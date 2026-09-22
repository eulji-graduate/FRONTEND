"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

import { hasInAppHistory } from "@/components/common/nav-history";
import { directionParticle } from "@/lib/korean";

interface BackLinkProps {
  /** 되돌아갈 자리 — 앱 안 이력이 없을 때(주소로 바로 들어온 경우) 갈 곳 */
  href: string;
  /** 접근성 이름에 쓰는 이름 */
  label: string;
  className?: string;
}

/**
 * 상단바 뒤로가기.
 *
 * ⚠️ **왔던 길로 돌아간다.** 전에는 늘 한 칸 위 화면(목록·상위 상세)으로 보냈는데,
 *    대시보드나 검색에서 바로 들어온 사람은 누른 적도 없는 목록으로 튕겨 나갔다 —
 *    "뒤로"라고 생긴 것을 눌렀는데 뒤가 아니었다.
 * ⚠️ 그래도 **`href`는 그대로 둔다.** 앱 안 이력이 없을 때(주소를 직접 열었거나 새 탭으로
 *    연 경우) 갈 곳이 필요하고, 오른쪽 클릭·새 탭으로 열기도 링크여야 동작한다.
 * ⚠️ 이력 유무는 `nav-history`가 판정한다 — Next 16의 `history.state`에는 순번(`idx`)이
 *    없어서(실측) 앱 안 이동을 직접 기록한다.
 * ⚠️ 보조 클릭(⌘·Ctrl·Shift·가운데 버튼)은 **가로채지 않는다.** 새 탭으로 열려는 손짓이라
 *    거기서 `router.back()`을 부르면 엉뚱한 창이 뒤로 간다.
 */
export function BackLink({ href, label, className }: BackLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    if (!hasInAppHistory()) return;

    event.preventDefault();
    router.back();
  }

  return (
    <Link
      href={href}
      /*
        ⚠️ 조사는 **받침을 보고 고른다**(`lib/korean.ts`). `(으)로`로 박아 두면
           스크린리더가 괄호까지 읽어 `회의 상세(으)로 돌아가기`가 된다 — 이 자리는
           #252에서 한 번 걷어낸 곳이라, 컴포넌트로 옮기면서 되살리지 않는다.
      */
      aria-label={`${label}${directionParticle(label)} 돌아가기`}
      className={className}
      onClick={handleClick}
    >
      <ArrowLeft className="size-[18px]" />
    </Link>
  );
}
