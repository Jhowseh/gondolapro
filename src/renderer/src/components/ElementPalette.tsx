import { useMemo, useState } from 'react'
import { languageInfo } from '../../../core/languages'
import { isForeignRaw } from '../../../core/layout'
import { insertTextOf, PRINTABLE_FIELD_GROUPS, tag, type SysPdvField } from '../../../core/syspdvFields'
import type { DrawableType, LabelElement, Language, RawElement } from '../../../core/types'
import { Icon } from './Icon'

interface ElementPaletteProps {
  elements: LabelElement[]
  language: Language
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: (type: DrawableType) => void
  onAddField: (tagText: string) => void
}

const ELEMENT_BUTTONS: { type: DrawableType; label: string; title: string; icon: string }[] = [
  { type: 'text', label: 'Texto', title: 'Adicionar texto', icon: 'T' },
  { type: 'barcode', label: 'Barras', title: 'Adicionar código de barras', icon: '║' },
  { type: 'line', label: 'Linha', title: 'Adicionar linha', icon: '—' },
  { type: 'box', label: 'Caixa', title: 'Adicionar caixa', icon: '□' }
]

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const SEARCHABLE_GROUPS = PRINTABLE_FIELD_GROUPS.map((group) => ({
  ...group,
  fields: group.fields.map((field) => ({ field, key: normalizeSearch(`${tag(field.code)} ${field.code} ${field.label}`) }))
}))

function fieldTitle(field: SysPdvField): string {
  return [field.parameterHint, `Exemplo: ${field.sample}`, field.maxLength ? `Tamanho máximo: ${field.maxLength}` : ''].filter(Boolean).join('\n')
}

export function ElementPalette({ elements, language, selectedId, onSelect, onAdd, onAddField }: ElementPaletteProps) {
  const [query, setQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([PRINTABLE_FIELD_GROUPS[0].id]))
  const rawElements = elements.filter((element): element is RawElement => element.type === 'raw')
  const search = normalizeSearch(query)
  const searching = search.length > 0

  const toggleGroup = (id: string) =>
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const groups = useMemo(
    () =>
      SEARCHABLE_GROUPS.map((group) => ({
        ...group,
        fields: group.fields.filter(({ key }) => key.includes(search)).map(({ field }) => field)
      })).filter((group) => group.fields.length > 0),
    [search]
  )

  return (
    <aside className="panel palette">
      <section className="panel-section">
        <h2>Inserir</h2>
        <div className="palette-grid">
          {ELEMENT_BUTTONS.map((button) => (
            <button key={button.type} type="button" className="palette-button" onClick={() => onAdd(button.type)} title={button.title}>
              <span className="palette-icon">{button.icon}</span>
              {button.label}
            </button>
          ))}
        </div>
      </section>

      {rawElements.length > 0 && (
        <section className="panel-section">
          <h2>Comandos sem prévia</h2>
          <ul className="raw-list">
            {rawElements.map((element) => {
              const ignored = isForeignRaw(element, language)
              return (
                <li key={element.id}>
                  <button
                    type="button"
                    className={`${element.id === selectedId ? 'active' : ''} ${ignored ? 'ignored' : ''}`}
                    onClick={() => onSelect(element.id)}
                    title={ignored ? `Ignorado: comando de ${languageInfo(element.language).label}` : element.content}
                  >
                    <code>{element.content}</code>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="panel-section">
        <h2 title="Clique em um campo para colocá-lo na etiqueta como texto. Passe o mouse para ver o exemplo e o tamanho máximo.">Campos do SysPDV</h2>
        <label className="search">
          <Icon name="search" size={14} />
          <input value={query} placeholder="Buscar campo…" spellCheck={false} onChange={(event) => setQuery(event.target.value)} aria-label="Buscar campo do SysPDV" />
        </label>

        {groups.length === 0 && <p className="empty">Nenhum campo encontrado.</p>}

        {groups.map((group) => {
          const open = searching || openGroups.has(group.id)
          return (
            <div key={group.id} className="field-group">
              <button type="button" className="section-toggle" aria-expanded={open} onClick={() => toggleGroup(group.id)} disabled={searching}>
                <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
                <span>{group.label}</span>
                <span className="count">{group.fields.length}</span>
              </button>
              {open && (
                <ul className="field-list">
                  {group.fields.map((field) => (
                    <li key={field.code}>
                      <button type="button" onClick={() => onAddField(insertTextOf(field))} title={fieldTitle(field)}>
                        <code>{tag(field.code)}</code>
                        <span>{field.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </section>
    </aside>
  )
}
