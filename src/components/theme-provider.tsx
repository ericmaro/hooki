import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderState {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light' | 'dark'
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

const STORAGE_KEY = 'hooki-theme'

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'system'
        return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
    })
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'light'
        const stored = localStorage.getItem(STORAGE_KEY) as Theme
        if (stored === 'light' || stored === 'dark') return stored
        return getSystemTheme()
    })

    useEffect(() => {
        const root = window.document.documentElement

        const applyTheme = () => {
            const resolved = theme === 'system' ? getSystemTheme() : theme
            setResolvedTheme(resolved)
            root.classList.remove('light', 'dark')
            root.classList.add(resolved)
        }

        applyTheme()

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = () => {
            if (theme === 'system') {
                applyTheme()
            }
        }
        mediaQuery.addEventListener('change', handleChange)

        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [theme])

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem(STORAGE_KEY, newTheme)
        setThemeState(newTheme)
    }

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeProviderContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
