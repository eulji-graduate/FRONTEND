"use client";

import type { AssignableRole, Position } from "../types";
import { SYSTEM_ISSUED_POSITIONS } from "../types";
import { useScrollToLatest } from "../use-scroll-to-latest";
import { RoleBadge } from "./role-badge";

/**
 * 좌측 축약 미리보기.
 * 위 두 줄(대표·관리자)은 **기업 승인 때 발급되는 계정**이고,
 * 아래는 이 화면에서 매핑한 직급이 그대로 따라온다.
 */
export function PositionPreview({ positions }: { positions: Position[] }) {
  // 직급이 늘면 새로 생긴 쪽으로 따라 내려간다
  const listRef = useScrollToLatest<HTMLUListElement>(positions.length);
  return (
    // 남는 세로 공간을 채운다. 직급이 많아지면 안에서만 스크롤한다(스크롤바 숨김)
    <ul
      ref={listRef}
      className="border-border bg-background/50 flex min-h-20 flex-1 flex-col gap-2 overflow-auto overscroll-contain rounded-lg border p-3"
    >
      {SYSTEM_ISSUED_POSITIONS.map((issued) => (
        <PreviewRow key={issued.name} name={issued.name} role={issued.role} />
      ))}
      {positions.map((position) => (
        <PreviewRow key={position.id} name={position.name} role={position.role} />
      ))}
      {positions.length === 0 && (
        <li className="text-muted-foreground/70 py-1 text-center text-[11px]">
          아직 직급이 없습니다
        </li>
      )}
    </ul>
  );
}

function PreviewRow({ name, role }: { name: string; role: AssignableRole }) {
  return (
    <li className="animate-in fade-in slide-in-from-bottom-1 flex h-[18px] items-center justify-between gap-2 duration-200">
      <span className="text-muted-foreground truncate text-[11px]">{name}</span>
      <RoleBadge role={role} className="text-[9px]" />
    </li>
  );
}
