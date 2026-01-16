'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './ui/button'
import { codeToHtml } from 'shiki'

interface CodeBlockProps {
    content: string
    language?: 'json' | 'text'
    className?: string
}

export function CodeBlock({ content, language = 'json', className = '' }: CodeBlockProps) {
    const [copied, setCopied] = useState(false)
    const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

    // Format JSON if possible
    let displayContent = content
    if (language === 'json' && content) {
        try {
            const parsed = JSON.parse(content)
            displayContent = JSON.stringify(parsed, null, 2)
        } catch {
            displayContent = content
        }
    }

    useEffect(() => {
        if (!displayContent) {
            setHighlightedHtml(null)
            return
        }

        codeToHtml(displayContent, {
            lang: language,
            theme: 'github-dark',
        }).then(html => {
            setHighlightedHtml(html)
        }).catch(() => {
            setHighlightedHtml(null)
        })
    }, [displayContent, language])

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(displayContent)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    if (!content) {
        return (
            <pre className="text-xs bg-secondary p-3 rounded font-mono text-muted-foreground">
                (empty)
            </pre>
        )
    }

    return (
        <div className={`relative group ${className}`}>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary/80 hover:bg-secondary z-10"
                onClick={handleCopy}
            >
                {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                ) : (
                    <Copy className="h-3 w-3" />
                )}
            </Button>
            {highlightedHtml ? (
                <div
                    className="text-xs rounded overflow-x-auto [&_pre]:p-3 [&_pre]:m-0 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:whitespace-pre-wrap [&_code]:break-all"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
            ) : (
                <pre className="text-xs bg-secondary p-3 rounded overflow-x-auto whitespace-pre-wrap break-all font-mono">
                    {displayContent}
                </pre>
            )}
        </div>
    )
}
