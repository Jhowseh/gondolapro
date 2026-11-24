import { useEffect } from 'react'

const SHORTCUTS: [string, string][] = [
  ['Setas', 'Move o elemento 0,5 mm (Shift: 5 mm)'],
  ['Delete', 'Exclui o elemento'],
  ['Ctrl+D', 'Duplica o elemento'],
  ['Esc', 'Tira a seleção'],
  ['Ctrl+Z / Ctrl+Y', 'Desfaz / refaz'],
  ['Ctrl+S', 'Salva o layout'],
  ['Ctrl+Shift+S', 'Salva como'],
  ['Ctrl+O', 'Abre layout, XML ou código'],
  ['Ctrl+V', 'Importa código copiado'],
  ['Ctrl+E', 'Exporta XML para o SysPDV']
]

interface ShortcutsDialogProps {
  onClose: () => void
}

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal modal-small" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <header className="modal-header">
          <h2 id="shortcuts-title">Atalhos do teclado</h2>
          <button type="button" className="icon-button" onClick={onClose} title="Fechar (Esc)">
            ×
          </button>
        </header>
        <div className="modal-body">
          <dl className="shortcuts">
            {SHORTCUTS.map(([keys, action]) => (
              <div key={keys}>
                <dt>
                  <kbd>{keys}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
