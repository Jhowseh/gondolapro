import { languageInfo } from '../../../core/languages'
import { FIELD_GROUPS, insertTextOf, isPrintableField, SYSPDV_FIELDS, tag } from '../../../core/syspdvFields'
import type { DrawableType, LabelElement, Language, RawElement } from '../../../core/types'

interface ElementPaletteProps {
  elements: LabelElement[]
  language: Language
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: (type: DrawableType) => void
  onAddField: (tagText: string) => void
}

const ELEMENT_BUTTONS: { type: DrawableType; label: string; icon: string }[] = [
  { type: 'text', label: 'Texto', icon: 'T' },
  { type: 'barcode', label: 'Código de barras', icon: '║' },
  { type: 'line', label: 'Linha', icon: '—' },
  { type: 'box', label: 'Caixa', icon: '□' }
]

export function ElementPalette({ elements, language, selectedId, onSelect, onAdd, onAddField }: ElementPaletteProps) {
  const rawElements = elements.filter((element): element is RawElement => element.type === 'raw')

  return (
    <aside className="panel palette">
      <h2>Elementos</h2>
      <div className="palette-grid">
        {ELEMENT_BUTTONS.map((button) => (
          <button key={button.type} type="button" className="palette-button" onClick={() => onAdd(button.type)}>
            <span className="palette-icon">{button.icon}</span>
            {button.label}
          </button>
        ))}
      </div>

      {rawElements.length > 0 && (
        <>
          <h2>Comandos sem prévia</h2>
          <ul className="raw-list">
            {rawElements.map((element) => (
              <li key={element.id}>
                <button
                  type="button"
                  className={`${element.id === selectedId ? 'active' : ''} ${element.language !== language ? 'ignored' : ''}`}
                  onClick={() => onSelect(element.id)}
                  title={element.language !== language ? `Ignorado: comando de ${languageInfo(element.language).label}` : element.content}
                >
                  <code>{element.content}</code>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Campos do SysPDV</h2>
      {FIELD_GROUPS.map((group) => (
        <div key={group.id} className="field-group">
          <h3>{group.label}</h3>
          <ul className="field-list">
            {SYSPDV_FIELDS.filter((field) => isPrintableField(field) && field.group === group.id).map((field) => (
              <li key={field.code}>
                <button
                  type="button"
                  onClick={() => onAddField(insertTextOf(field))}
                  title={[field.parameterHint, `Exemplo: ${field.sample}`, field.maxLength ? `Tamanho máximo: ${field.maxLength}` : '']
                    .filter(Boolean)
                    .join('\n')}
                >
                  <code>{tag(field.code)}</code>
                  <span>{field.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="hint">Clique em um campo para colocá-lo na etiqueta como texto. Passe o mouse sobre ele para ver o exemplo e o tamanho máximo.</p>
    </aside>
  )
}
