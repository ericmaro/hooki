'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './ui/button'

interface CodeBlockProps {
    content: string
    language?: 'json' | 'text'
    className?: string
}

// Simple JSON syntax highlighter (CSS-based, no dependencies)
function highlightJson(str: string): string {
    // Escape HTML first
    const escaped = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    // Apply syntax highlighting
    return escaped
        // Strings (keys and values)
        .replace(/"([^"\\]|\\.)*"/g, (match) => {
            // Check if it's a key (followed by :)
            return `<span class="text-emerald-400">${match}</span>`
        })
        // Numbers
        .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>')
        // Booleans and null
        .replace(/\b(true|false|null)\b/g, '<span class="text-purple-400">$1</span>')
}

export function CodeBlock({ content, language = 'json', className = '' }: CodeBlockProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    // Format JSON if possible
    let displayContent = content
    let highlighted = false

    if (language === 'json' && content) {
        try {
            const parsed = JSON.parse(content)
            displayContent = JSON.stringify(parsed, null, 2)
            highlighted = true
        } catch {
            // Not valid JSON, display as-is
            displayContent = content
        }
    }

    return (
        <div className={`relative group ${className}`}>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary/80 hover:bg-secondary"
                onClick={handleCopy}
            >
                {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                ) : (
                    <Copy className="h-3 w-3" />
                )}
            </Button>
            <pre
                className="text-xs bg-secondary p-3 rounded overflow-x-auto whitespace-pre-wrap break-all font-mono"
                dangerouslySetInnerHTML={
                    highlighted
                        ? { __html: highlightJson(displayContent) }
                        : undefined
                }
            >
                {!highlighted ? displayContent || '(empty)' : undefined}
            </pre>
        </div>
    )
}
