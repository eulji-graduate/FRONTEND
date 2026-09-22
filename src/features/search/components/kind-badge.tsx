import { Badge } from "@/components/ui/badge";

import type { SearchKind } from "../types";
import { SEARCH_KIND_LABEL } from "../types";

interface KindBadgeProps {
  kind: SearchKind;
}

/**
 * 결과 종류 표식 — **무채색뿐이다**(DESIGN §5). 색으로 종류를 가르지 않는다,
 * 이미 정해진 색 자리(상태점·프로젝트 태그·에러)와 겹치면 뜻이 두 개가 된다.
 */
export function KindBadge({ kind }: KindBadgeProps) {
  return (
    /*
      ⚠️ **폭을 고정하지 않는다.** `w-11`(44px)로 묶어 뒀더니 넉 자인 `프로젝트`가 칸을
         넘어갔다 — 두 자(`회의`)에 맞춘 폭이라 긴 라벨이 들어갈 자리가 없었다.
      ⚠️ 대신 **가장 긴 라벨(`프로젝트`)에 맞춰 고정**한다. 폭이 들쭉날쭉하면 그 뒤의 제목이
         줄마다 다른 자리에서 시작해 **오와 열이 안 맞는다** — 목록은 한 세로선을 따라 읽는다.
    */
    <Badge variant="outline" className="w-16 shrink-0 justify-center font-normal">
      {SEARCH_KIND_LABEL[kind]}
    </Badge>
  );
}
