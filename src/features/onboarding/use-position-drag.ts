"use client";

import { useState } from "react";

import { setCompactDragImage } from "./drag-ghost";

/** 지금 끌고 있는 직급. 평면 목록이라 id만 있으면 된다. */
export type DraggingPositionId = string | null;

/** 놓는 자리 — 대상의 위/아래. 직급은 계층이 없어 "안에 넣기"가 없다. */
export type PositionDropEdge = "before" | "after";

interface UsePositionDragParams {
  positionId: string;
  /** 드래그 미리보기에 쓸 이름 */
  positionName: string;
  draggingId: DraggingPositionId;
  onDraggingChange: (id: DraggingPositionId) => void;
  onMove: (draggedId: string, targetId: string, edge: PositionDropEdge) => void;
}

/** 직급 한 줄의 드래그 처리 — 서열 순서 변경. */
export function usePositionDrag({
  positionId,
  positionName,
  draggingId,
  onDraggingChange,
  onMove,
}: UsePositionDragParams) {
  const [dropEdge, setDropEdge] = useState<PositionDropEdge | null>(null);

  const isDragged = draggingId === positionId;
  const canDrop = draggingId !== null && !isDragged;

  return {
    isDragged,
    dropEdge,
    /** 손잡이(grip)에 붙인다 */
    handleProps: {
      draggable: true,
      onDragStart: (event: React.DragEvent) => {
        event.dataTransfer.setData("text/plain", positionId);
        event.dataTransfer.effectAllowed = "move";
        setCompactDragImage(event, positionName);
        onDraggingChange(positionId);
      },
      onDragEnd: () => {
        onDraggingChange(null);
        setDropEdge(null);
      },
    },
    /** 행 전체에 붙인다 */
    rowProps: {
      onDragOver: (event: React.DragEvent) => {
        if (!canDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const { top, height } = event.currentTarget.getBoundingClientRect();
        setDropEdge(event.clientY < top + height / 2 ? "before" : "after");
      },
      onDragLeave: () => setDropEdge(null),
      onDrop: (event: React.DragEvent) => {
        if (!canDrop || !dropEdge) return;
        event.preventDefault();
        onMove(event.dataTransfer.getData("text/plain"), positionId, dropEdge);
        setDropEdge(null);
        // 옮긴 행은 원래 자리에서 사라져 dragend가 오지 않는다 → 여기서 직접 끝낸다
        onDraggingChange(null);
      },
    },
  };
}
