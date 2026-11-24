import { useState } from 'react'
import { sampleFieldsFor, sampleValue, tag, type SampleValues } from '../../../core/syspdvFields'
import { Icon } from './Icon'

interface SampleFieldsProps {
  texts: string[]
  samples: SampleValues | undefined
  title: string
  defaultOpen?: boolean
  onChange: (code: string, value: string) => void
}

export function SampleFields({ texts, samples, title, defaultOpen = false, onChange }: SampleFieldsProps) {
  const [open, setOpen] = useState(defaultOpen)
  const fields = sampleFieldsFor(texts)
  if (fields.length === 0) {
    return null
  }

  return (
    <div className="sample-fields">
      <button
        type="button"
        className="section-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Valores usados só na prévia e na impressão de teste. O código do SysPDV continua com as tags."
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
        <span>{title}</span>
        <span className="count">{fields.length}</span>
      </button>
      {open && (
        <div className="sample-list">
          {fields.map((field) => {
            const value = sampleValue(field, samples)
            const changed = value !== field.sample
            return (
              <label key={field.code} className="field">
                <span className="field-label">
                  <code>{tag(field.code)}</code> {field.label}
                </span>
                <span className="sample-input">
                  <input value={value} maxLength={field.maxLength} spellCheck={false} onChange={(event) => onChange(field.code, event.target.value)} />
                  {changed && (
                    <button type="button" title={`Voltar para ${field.sample}`} onClick={() => onChange(field.code, field.sample)}>
                      ↺
                    </button>
                  )}
                </span>
                {field.padding && <span className="hint">O SysPDV coloca 2 espaços antes do preço; a prévia já conta com eles.</span>}
              </label>
            )
          })}
          <p className="hint">Só aparecem na prévia e no teste. O código continua com as tags.</p>
        </div>
      )}
    </div>
  )
}
