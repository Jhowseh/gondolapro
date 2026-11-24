import { DPI_OPTIONS, LANGUAGES } from '../../../core/languages'
import type { LabelLayout, Language } from '../../../core/types'
import type { Theme } from '../theme'
import { NumberField } from './NumberField'

interface ToolbarProps {
  layout: LabelLayout
  dirty: boolean
  theme: Theme
  onToggleTheme: () => void
  canUndo: boolean
  canRedo: boolean
  onLayoutChange: (patch: Partial<LabelLayout>) => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExport: () => void
  onUndo: () => void
  onRedo: () => void
}

export function Toolbar(props: ToolbarProps) {
  const { layout, dirty, onLayoutChange } = props

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand-mark">G</span>
        <span className="brand-name">GôndolaPro</span>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={props.onNew} title="Novo layout">Novo</button>
        <button type="button" onClick={props.onOpen} title="Abrir um layout .etq, um XML do SysPDV ou um código de impressora (Ctrl+O). Para código copiado do SysPDV, use Ctrl+V.">
          Abrir
        </button>
        <button type="button" onClick={props.onSave} title="Salvar (Ctrl+S)">
          Salvar{dirty ? ' •' : ''}
        </button>
        <button type="button" onClick={props.onSaveAs} title="Salvar como (Ctrl+Shift+S)">Salvar como</button>
        <button type="button" onClick={props.onExport} title="Gerar o XML que o SysPDV importa (Ctrl+E)">Exportar XML</button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={props.onUndo} disabled={!props.canUndo} title="Desfazer (Ctrl+Z)">Desfazer</button>
        <button type="button" onClick={props.onRedo} disabled={!props.canRedo} title="Refazer (Ctrl+Y)">Refazer</button>
      </div>

      <div className="toolbar-group toolbar-settings">
        <label className="field field-wide">
          <span className="field-label">Nome</span>
          <input value={layout.name} onChange={(event) => onLayoutChange({ name: event.target.value })} />
        </label>
        <NumberField label="Largura" suffix="mm" value={layout.widthMm} min={10} max={240} onChange={(widthMm) => onLayoutChange({ widthMm })} />
        <NumberField label="Altura" suffix="mm" value={layout.heightMm} min={5} max={300} onChange={(heightMm) => onLayoutChange({ heightMm })} />
        <NumberField label="Espaço" suffix="mm" value={layout.gapMm} min={0} max={20} onChange={(gapMm) => onLayoutChange({ gapMm })} />
        <label className="field">
          <span className="field-label">Linguagem</span>
          <select value={layout.language} onChange={(event) => onLayoutChange({ language: event.target.value as Language })}>
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.id} title={language.printers}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Resolução</span>
          <select value={layout.dpi} onChange={(event) => onLayoutChange({ dpi: Number(event.target.value) })}>
            {DPI_OPTIONS.map((dpi) => (
              <option key={dpi} value={dpi}>
                {dpi} dpi
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        className="theme-toggle"
        onClick={props.onToggleTheme}
        title={props.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        aria-label={props.theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
      >
        {props.theme === 'dark' ? '☀' : '☾'}
      </button>
    </header>
  )
}
