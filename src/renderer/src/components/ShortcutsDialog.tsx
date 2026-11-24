import { Modal } from './Modal'

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
  return (
    <Modal title="Atalhos do teclado" titleId="shortcuts-title" className="modal-small" onClose={onClose}>
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
    </Modal>
  )
}
