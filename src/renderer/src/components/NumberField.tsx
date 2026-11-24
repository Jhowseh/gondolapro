import { useEffect, useState, type KeyboardEvent } from 'react'
import { clamp } from '../../../core/units'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  integer?: boolean
}

function format(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false })
}

export function NumberField({ label, value, onChange, step = 0.5, min = 0, max = 9999, suffix, integer = false }: NumberFieldProps) {
  const [draft, setDraft] = useState(format(value))

  useEffect(() => {
    setDraft(format(value))
  }, [value])

  const normalize = (raw: number) => {
    const bounded = clamp(raw, min, max)
    return integer ? Math.round(bounded) : Math.round(bounded * 100) / 100
  }

  const commit = (text: string) => {
    const parsed = Number(text.trim().replace(',', '.'))
    if (text.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(format(value))
      return
    }
    const next = normalize(parsed)
    setDraft(format(next))
    if (next !== value) {
      onChange(next)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commit(event.currentTarget.value)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const direction = event.key === 'ArrowUp' ? 1 : -1
      onChange(normalize(value + direction * step * (event.shiftKey ? 10 : 1)))
    } else if (event.key === 'Escape') {
      setDraft(format(value))
    }
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  )
}
