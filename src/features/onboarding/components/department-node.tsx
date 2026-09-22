"use client";

import { ChevronRight, Folder, GripVertical } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  type DepartmentNode as DepartmentNodeType,
  getDepthLabel,
  MAX_DEPARTMENT_DEPTH,
  MAX_ORG_NAME_LENGTH,
} from "../types";
import { type DraggingInfo, type DropZone, useDepartmentDrag } from "../use-department-drag";
import { DepartmentNodeActions } from "./department-node-actions";

export interface DepartmentNodeHandlers {
  onRename: (id: string, name: string) => void;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  /** 순서 변경과 다른 상위 부서로 옮기기를 모두 처리한다 */
  onMove: (draggedId: string, targetId: string, position: DropZone) => void;
  /** 키보드 대체 경로 — Alt + ↑/↓ 순서, Alt + ←/→ 계층 */
  onShift: (id: string, offset: 1 | -1) => void;
  onPromote: (id: string) => void;
  onDemote: (id: string) => void;
  /** 새로 만든 부서는 바로 편집 상태로 열린다 */
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
  dragging: DraggingInfo | null;
  onDraggingChange: (info: DraggingInfo | null) => void;
  /**
   * 드래그 손잡이·Alt+방향키 전부를 끈다. **기본은 켜짐**(온보딩) — 저장 한 번에 트리
   * 전체가 새로 만들어져서 순서·계층 변경이 그대로 반영된다.
   *
   * ⚠️ **기업 설정만 끈다.** 그 화면은 저장이 팀 단위 API(`POST`·`PATCH`·`DELETE`)로
   *    나뉘는데, 순서를 저장할 API 자체가 없고(§연동 검증), 계층 변경(승격·강등)은
   *    이미 다른 경로(`역할 안 저장` 안내)로 막혀 있다 — 그런데 **순서만** 그 경로를
   *    안 타서, 바꾸고 [저장]을 누르면 성공했다고 뜨고 실제로는 조용히 사라진다
   *    (2026-08-14 적발). 손잡이를 아예 안 주는 게 거짓 성공보다 정직하다(§정직성).
   */
  canReorder?: boolean;
}

interface DepartmentNodeProps extends DepartmentNodeHandlers {
  node: DepartmentNodeType;
  depth: number;
  parentId: string | null;
}

export function DepartmentNode({ node, depth, parentId, ...handlers }: DepartmentNodeProps) {
  const { onRename, onAddChild, onRemove, onShift, onPromote, onDemote } = handlers;
  const { editingId, onEditingChange } = handlers;
  const canReorder = handlers.canReorder ?? true;

  const [isExpanded, setIsExpanded] = useState(true);

  const hasChildren = node.children.length > 0;
  const isEditing = editingId === node.id;

  const { isDragged, dropZone, handleProps, rowProps } = useDepartmentDrag({
    nodeId: node.id,
    parentId,
    depth,
    hasChildren,
    nodeName: node.name,
    dragging: handlers.dragging,
    onDraggingChange: handlers.onDraggingChange,
    onMove: handlers.onMove,
  });

  const submitName = (value: string) => {
    const name = value.trim();
    if (name) onRename(node.id, name);
    onEditingChange(null);
  };

  const handleKeyMove = (event: React.KeyboardEvent) => {
    if (!event.altKey) return;
    const actions: Record<string, () => void> = {
      ArrowUp: () => onShift(node.id, -1),
      ArrowDown: () => onShift(node.id, 1),
      ArrowLeft: () => onPromote(node.id),
      ArrowRight: () => onDemote(node.id),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <>
      <div
        {...rowProps}
        className={cn(
          "group relative flex h-[38px] items-center gap-2 rounded-md px-2 transition-[background-color,opacity]",
          isDragged ? "opacity-40" : "hover:bg-secondary",
          // 점선 = 여기 들어온다. 아래 "부서 추가" 입력창의 점선과 같은 표현을 쓴다.
          dropZone === "before" &&
            "before:border-ring before:absolute before:inset-x-0 before:-top-0.5 before:border-t-2 before:border-dashed before:content-['']",
          dropZone === "after" &&
            "after:border-ring after:absolute after:inset-x-0 after:-bottom-0.5 after:border-t-2 after:border-dashed after:content-['']",
          dropZone === "inside" && "bg-secondary outline-ring outline-2 outline-dashed",
        )}
      >
        {canReorder ? (
          <button
            {...handleProps}
            type="button"
            aria-label={`${node.name} 위치 이동 — Alt와 방향키로도 옮길 수 있습니다(위아래: 순서, 왼쪽: 팀으로 빼기, 오른쪽: 바로 위 팀의 역할로)`}
            onKeyDown={handleKeyMove}
            className="text-muted-foreground/40 hover:text-muted-foreground focus-visible:ring-ring shrink-0 cursor-grab rounded opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-hidden active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : (
          // ⚠️ 자리만 지킨다 — 없으면 옆 아이콘들이 한 칸씩 밀린다(위 `canReorder` 주석 참고)
          <span className="size-3.5 shrink-0" aria-hidden />
        )}

        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label={`${node.name} ${isExpanded ? "접기" : "펼치기"}`}
            aria-expanded={isExpanded}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden />
        )}

        <Folder className="text-muted-foreground/60 size-3.5 shrink-0" aria-hidden />

        {isEditing ? (
          <>
            {/* ⚠️ `aria-label`만으로는 부족하다 — 입력은 `label htmlFor`로 잇는다(§a11y).
                줄마다 있는 입력이라 id에 노드 id를 섞어 겹치지 않게 한다 */}
            <label htmlFor={`department-name-${node.id}`} className="sr-only">
              {getDepthLabel(depth)} 이름
            </label>
            <input
              id={`department-name-${node.id}`}
              maxLength={MAX_ORG_NAME_LENGTH}
              autoFocus
              defaultValue={node.name}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={(event) => submitName(event.target.value)}
              onKeyDown={(event) => {
                // 한글 조합 중의 Enter는 글자 확정용이다 — 편집을 끝내면 안 된다
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter") submitName(event.currentTarget.value);
                if (event.key === "Escape") onEditingChange(null);
              }}
              className="border-ring bg-background min-w-0 flex-1 rounded border px-1.5 text-[13px] leading-5 outline-none"
            />
          </>
        ) : (
          <button
            type="button"
            onDoubleClick={() => onEditingChange(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEditingChange(node.id);
              }
            }}
            aria-label={`${node.name} 이름 바꾸기`}
            className="min-w-0 flex-1 truncate text-left text-[13px] leading-5"
          >
            {node.name}
          </button>
        )}

        {/* 윗단은 팀, 아랫단은 그 안의 역할이다 */}
        <span className="text-muted-foreground/50 shrink-0 text-[11px] transition-opacity group-focus-within:opacity-0 group-hover:opacity-0">
          {getDepthLabel(depth)}
        </span>

        <DepartmentNodeActions
          name={node.name}
          canAddChild={depth + 1 < MAX_DEPARTMENT_DEPTH}
          onAddChild={() => {
            setIsExpanded(true);
            onAddChild(node.id);
          }}
          onRemove={() => onRemove(node.id)}
        />
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4">
          <ul className="border-border border-l pl-3">
            {node.children.map((child, index) => (
              <li key={child.id} className={index > 0 ? "pt-[1.75px]" : undefined}>
                <DepartmentNode node={child} depth={depth + 1} parentId={node.id} {...handlers} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
