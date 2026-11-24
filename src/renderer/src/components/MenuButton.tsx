import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  shortcut?: string
  onSelect: () => void
}

interface MenuButtonProps {
  title: string
  className?: string
  children: ReactNode
  items: MenuItem[]
}

export function MenuButton({ title, className = '', children, items }: MenuButtonProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="menu" ref={rootRef}>
      <button
        type="button"
        className={`${className} ${open ? 'active' : ''}`}
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {children}
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              <span>{item.label}</span>
              {item.shortcut && <kbd>{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
