"use client";

import { useState } from "react";

import { setCompactDragImage } from "./drag-ghost";
import { MAX_DEPARTMENT_DEPTH } from "./types";

/** 지금 끌고 있는 부서. 계층 제한을 판정하려면 하위 보유 여부가 필요하다. */
export interface DraggingInfo {
  id: string;
  parentId: string | null;
  hasChildren: boolean;
}

/** 놓는 자리 — 위/아래는 형제로 끼우기, 가운데는 그 부서의 하위로 넣기. */
export type DropZone = "before" | "after" | "inside";

interface UseDepartmentDragParams {
  nodeId: string;
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
  /** 드래그 미리보기에 쓸 이름 */
  nodeName: string;
  dragging: DraggingInfo | null;
  onDraggingChange: (info: DraggingInfo | null) => void;
  onMove: (draggedId: string, targetId: string, position: DropZone) => void;
}

/**
 * 부서 한 줄의 드래그 처리.
 * 순서 변경과 **다른 상위 부서로 옮기기**를 모두 다루고, 2계층 제한을 여기서 막는다.
 */
export function useDepartmentDrag({
  nodeId,
  parentId,
  depth,
  hasChildren,
  nodeName,
  dragging,
  onDraggingChange,
  onMove,
}: UseDepartmentDragParams) {
  const [dropZone, setDropZone] = useState<DropZone | null>(null);

  const isDragged = dragging?.id === nodeId;
  /** 자기 자신·자기 하위로는 못 간다(트리가 끊긴다) */
  const canDrop = dragging !== null && !isDragged && parentId !== dragging.id;
  /** 옆에 놓기 — 하위를 데리고 오면 최상위 자리에만 놓을 수 있다 */
  const canPlaceBeside =
    dragging !== null && depth + (dragging.hasChildren ? 1 : 0) < MAX_DEPARTMENT_DEPTH;
  /** 안에 넣기 — 최상위 부서만 하위를 받는다 */
  const canPlaceInside = dragging !== null && depth === 0 && !dragging.hasChildren;

  const resolveZone = (offsetY: number, height: number): DropZone | null => {
    const zone: DropZone =
      offsetY < height * 0.28 ? "before" : offsetY > height * 0.72 ? "after" : "inside";

    if (zone === "inside") {
      if (canPlaceInside) return "inside";
      return canPlaceBeside ? (offsetY < height / 2 ? "before" : "after") : null;
    }
    if (canPlaceBeside) return zone;
    return canPlaceInside ? "inside" : null;
  };

  return {
    isDragged,
    dropZone,
    /** 손잡이(grip)에 붙인다 */
    handleProps: {
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        event.dataTransfer.setData("text/plain", nodeId);
        event.dataTransfer.effectAllowed = "move";
        setCompactDragImage(event, nodeName);
        onDraggingChange({ id: nodeId, parentId, hasChildren });
      },
      onDragEnd: () => {
        onDraggingChange(null);
        setDropZone(null);
      },
    },
    /** 행 전체에 붙인다 */
    rowProps: {
      onDragOver: (event: React.DragEvent) => {
        if (!canDrop) return;
        const { top, height } = event.currentTarget.getBoundingClientRect();
        const zone = resolveZone(event.clientY - top, height);
        if (!zone) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropZone(zone);
      },
      onDragLeave: () => setDropZone(null),
      onDrop: (event: React.DragEvent) => {
        if (!canDrop || !dropZone) return;
        event.preventDefault();
        onMove(event.dataTransfer.getData("text/plain"), nodeId, dropZone);
        setDropZone(null);
        // 옮긴 행은 원래 자리에서 사라지므로 그 행의 dragend가 오지 않는다.
        // 여기서 직접 끝내지 않으면 "끌고 있는 중" 표시(흐림)가 그대로 남는다.
        onDraggingChange(null);
      },
    },
  };
}
