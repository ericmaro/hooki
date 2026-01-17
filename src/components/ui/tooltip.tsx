import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => children

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup> & { side?: 'top' | 'bottom' | 'left' | 'right' }
>(({ className, side = 'right', ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8}>
            <TooltipPrimitive.Popup
                ref={ref}
                className={cn(
                    "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md",
                    "animate-in fade-in-0 zoom-in-95",
                    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                    className
                )}
                {...props}
            />
        </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
