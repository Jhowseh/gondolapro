import type { ReactNode } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'

interface ModalProps {
  title: ReactNode
  titleId: string
  className?: string
  bodyClassName?: string
  footer?: ReactNode
  onClose: () => void
  onSubmit?: () => void
  children: ReactNode
}

export function Modal({ title, titleId, className = '', bodyClassName = '', footer, onClose, onSubmit, children }: ModalProps) {
  useEscapeKey(onClose)

  const dialog = {
    className: `modal ${className}`,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId
  }

  const content = (
    <>
      <header className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} title="Fechar (Esc)">
          ×
        </button>
      </header>
      <div className={`modal-body ${bodyClassName}`}>{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </>
  )

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      {onSubmit ? (
        <form
          {...dialog}
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          {content}
        </form>
      ) : (
        <section {...dialog}>{content}</section>
      )}
    </div>
  )
}
