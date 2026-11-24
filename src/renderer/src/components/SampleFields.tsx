import { sampleFieldsFor, sampleValue, tag, type SampleValues } from '../../../core/syspdvFields'

interface SampleFieldsProps {
  texts: string[]
  samples: SampleValues | undefined
  title: string
  onChange: (code: string, value: string) => void
}

export function SampleFields({ texts, samples, title, onChange }: SampleFieldsProps) {
  const fields = sampleFieldsFor(texts)
  if (fields.length === 0) {
    return null
  }

  return (
    <div className="sample-fields">
      <h3>{title}</h3>
      {fields.map((field) => {
        const value = sampleValue(field, samples)
        const changed = value !== field.sample
        return (
          <label key={field.code} className="field">
            <span className="field-label">
              <code>{tag(field.code)}</code> {field.label}
            </span>
            <span className="sample-input">
              <input
                value={value}
                maxLength={field.maxLength}
                spellCheck={false}
                onChange={(event) => onChange(field.code, event.target.value)}
              />
              {changed && (
                <button type="button" title={`Voltar para ${field.sample}`} onClick={() => onChange(field.code, field.sample)}>
                  ↺
                </button>
              )}
            </span>
            {field.padding && <span className="hint">O SysPDV coloca 2 espaços antes do preço. A prévia já conta com eles.</span>}
          </label>
        )
      })}
      <p className="hint">Esses valores só aparecem na prévia e na impressão de teste. O código do SysPDV continua com as tags.</p>
    </div>
  )
}
