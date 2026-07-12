import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode
} from 'react'

type NavigationContextValue = {
  path: string
  navigate: (to: string, options?: { replace?: boolean }) => void
  back: () => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [path, setPath] = useState('/')
  const stackRef = useRef<string[]>(['/'])

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    setPath((current) => {
      if (to === current) return current
      if (options?.replace) {
        stackRef.current[stackRef.current.length - 1] = to
      } else {
        stackRef.current.push(to)
      }
      window.history.replaceState({ virtualPath: to }, '')
      return to
    })
  }, [])

  const back = useCallback(() => {
    setPath(() => {
      if (stackRef.current.length > 1) stackRef.current.pop()
      return stackRef.current[stackRef.current.length - 1] ?? '/'
    })
  }, [])

  const value = useMemo(() => ({ path, navigate, back }), [path, navigate, back])

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider')
  return ctx
}

export function usePathname(): string {
  return useNavigation().path
}

export function useRouter(): {
  push: (to: string) => void
  replace: (to: string) => void
  back: () => void
  refresh: () => void
} {
  const { navigate, back } = useNavigation()
  return useMemo(
    () => ({
      push: (to: string) => navigate(to),
      replace: (to: string) => navigate(to, { replace: true }),
      back,
      refresh: () => {}
    }),
    [navigate, back]
  )
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, onClick, children, ...rest },
  ref
) {
  const { navigate } = useNavigation()
  return (
    <a
      ref={ref}
      href={href}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(href)
      }}
      {...rest}
    >
      {children}
    </a>
  )
})
