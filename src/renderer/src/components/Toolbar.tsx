import type { Theme } from '../theme'
import { Icon } from './Icon'
import { MenuButton } from './MenuButton'

interface ToolbarProps {
  name: string
  dirty: boolean
  theme: Theme
  canUndo: boolean
  canRedo: boolean
  onNameChange: (name: string) => void
  onToggleTheme: () => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExport: () => void
  onUndo: () => void
  onRedo: () => void
  onManual: () => void
  onShortcuts: () => void
  onAbout: () => void
}

export function Toolbar(props: ToolbarProps) {
  const themeLabel = props.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'

  return (
    <header className="toolbar">
      <span className="brand-mark" title="GôndolaPro">
        G
      </span>
      <div className="layout-title">
        <input
          className="layout-name"
          value={props.name}
          placeholder="Sem nome"
          aria-label="Nome do layout"
          title="Nome do layout"
          spellCheck={false}
          onChange={(event) => props.onNameChange(event.target.value)}
        />
        {props.dirty && <span className="dirty-dot" title="Alterações não salvas" />}
      </div>

      <span className="toolbar-divider" />

      <div className="toolbar-group">
        <button type="button" onClick={props.onNew} title="Novo layout">
          Novo
        </button>
        <button
          type="button"
          onClick={props.onOpen}
          title="Abrir um layout .etq, um XML do SysPDV ou um código de impressora (Ctrl+O). Para código copiado do SysPDV, use Ctrl+V."
        >
          Abrir
        </button>
        <button type="button" onClick={props.onSave} title="Salvar (Ctrl+S)">
          Salvar
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon-only" onClick={props.onUndo} disabled={!props.canUndo} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
          <Icon name="undo" />
        </button>
        <button type="button" className="icon-only" onClick={props.onRedo} disabled={!props.canRedo} title="Refazer (Ctrl+Y)" aria-label="Refazer">
          <Icon name="redo" />
        </button>
      </div>

      <div className="toolbar-end">
        <button type="button" className="icon-only" onClick={props.onToggleTheme} title={themeLabel} aria-label={themeLabel}>
          <Icon name={props.theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <MenuButton
          title="Mais opções"
          className="icon-only"
          items={[
            { label: 'Salvar como…', shortcut: 'Ctrl+Shift+S', onSelect: props.onSaveAs },
            { label: 'Manual do usuário', onSelect: props.onManual },
            { label: 'Atalhos do teclado', onSelect: props.onShortcuts },
            { label: 'Sobre o GôndolaPro', onSelect: props.onAbout }
          ]}
        >
          <Icon name="more" />
        </MenuButton>
        <button type="button" className="primary" onClick={props.onExport} title="Gerar o XML que o SysPDV importa (Ctrl+E)">
          Exportar XML
        </button>
      </div>
    </header>
  )
}
