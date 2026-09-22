import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * hover/포커스 시 뜨는 말풍선. base-ui `Tooltip`.
 * ⚠️ 트리거가 `<a>`·`<button>` 안에 들어갈 땐 `render`로 비상호작용 요소(span 등)를 넘긴다 —
 *    기본 트리거는 `<button>`이라 링크·버튼 안에 겹쳐 넣으면 마크업이 깨진다.
 */
function TooltipProvider({
  delay = 200,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
}

function Tooltip(props: ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  side = "top",
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Popup> & {
  sideOffset?: number;
  side?: ComponentProps<typeof TooltipPrimitive.Positioner>["side"];
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "bg-popover text-popover-foreground border-border z-50 max-w-xs rounded-md border px-2.5 py-1.5 text-xs shadow-md",
            "origin-[var(--transform-origin)] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
