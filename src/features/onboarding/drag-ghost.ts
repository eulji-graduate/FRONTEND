/**
 * 드래그 중 커서를 따라다니는 미리보기를 만든다.
 *
 * ⚠️ 행 요소를 그대로 넘기면(`setDragImage(row)`) 행 폭이 수백 px이라
 *    커서 옆으로 거대한 잔상이 뻗는다. 이름만 담은 **작은 조각**을 따로 만들어 쓴다.
 */
export function setCompactDragImage(event: React.DragEvent, label: string) {
  const ghost = document.createElement("div");
  ghost.textContent = label;
  ghost.className =
    "bg-card text-foreground border-border pointer-events-none rounded-md border px-2.5 py-1 text-[13px] leading-none shadow-sm";
  // 화면 밖에 두고 스냅샷만 찍게 한다
  ghost.style.position = "fixed";
  ghost.style.top = "-1000px";
  ghost.style.left = "-1000px";

  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, 14, 14);
  // 스냅샷을 뜬 뒤에 지운다 — 즉시 지우면 미리보기가 비어 보인다
  requestAnimationFrame(() => ghost.remove());
}
