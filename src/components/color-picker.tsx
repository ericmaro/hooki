'use client'

import { useState } from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover'

// Preset colors for route labels
const PRESET_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#64748b', // slate
    '#78716c', // stone
]

interface ColorPickerProps {
    color: string
    onChange: (color: string) => void
    className?: string
}

export function ColorPicker({ color, onChange, className = '' }: ColorPickerProps) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                className={`w-4 h-4 rounded-full border-2 border-background shadow-sm shrink-0 cursor-pointer hover:scale-110 transition-transform ${className}`}
                style={{ backgroundColor: color }}
                title="Click to change color"
            />
            <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-8 gap-1">
                    {PRESET_COLORS.map((presetColor) => (
                        <button
                            key={presetColor}
                            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${color === presetColor ? 'border-foreground scale-110' : 'border-transparent'
                                }`}
                            style={{ backgroundColor: presetColor }}
                            onClick={() => {
                                onChange(presetColor)
                                setOpen(false)
                            }}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
