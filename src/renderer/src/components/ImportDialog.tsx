import { useEffect, useMemo, useState } from 'react'
import { restoreControlCodes, showControlCodes } from '../../../core/controlCodes'
import { detectLanguage, importScript, inferFrame, summarizeImport, type ImportCandidate, type ImportResult } from '../../../core/importing'
import { DPI_OPTIONS, LANGUAGES, languageInfo } from '../../../core/languages'
import type { Language } from '../../../core/types'
import { NumberField } from './NumberField'

export interface ImportSource {
  label: string
  candidates: ImportCandidate[]
}

interface ImportDialogProps {
  source: ImportSource
  defaultDpi: number
  onCancel: () => void
  onImport: (result: ImportResult) => void
}

const DEFAULT_SIZE = { widthMm: 100, heightMm: 30, gapMm: 3 }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function roundMm(value: number): number {
  return Math.round(value * 10) / 10
}

function sizeOf(script: string, language: Language, dpi: number) {
  const inferred = inferFrame(script, language, dpi)
  return {
    widthMm: roundMm(inferred.widthMm ?? DEFAULT_SIZE.widthMm),
    heightMm: roundMm(inferred.heightMm ?? DEFAULT_SIZE.heightMm),
    gapMm: roundMm(inferred.gapMm ?? DEFAULT_SIZE.gapMm)
  }
}

export function ImportDialog({ source, defaultDpi, onCancel, onImport }: ImportDialogProps) {
  const { candidates } = source
  const first = candidates[0]
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [script, setScript] = useState(first.script)
  const [name, setName] = useState(first.name)
  const [syspdvCode, setSyspdvCode] = useState(first.syspdvCode)
  const [language, setLanguage] = useState<Language>(() => detectLanguage(first.script))
  const [languageTouched, setLanguageTouched] = useState(false)
  const [size, setSize] = useState(() => sizeOf(first.script, detectLanguage(first.script), defaultDpi))
  const [sizeTouched, setSizeTouched] = useState(false)
  const [dpi, setDpi] = useState(defaultDpi)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const applyScript = (text: string, options: { resetTouched: boolean }) => {
    setScript(text)
    const detected = detectLanguage(text)
    const nextLanguage = options.resetTouched || !languageTouched ? detected : language
    if (options.resetTouched) {
      setLanguageTouched(false)
      setSizeTouched(false)
    }
    setLanguage(nextLanguage)
    if (options.resetTouched || !sizeTouched) {
      setSize(sizeOf(text, nextLanguage, dpi))
    }
  }

  const selectCandidate = (index: number) => {
    const candidate = candidates[index]
    setCandidateIndex(index)
    setName(candidate.name)
    setSyspdvCode(candidate.syspdvCode)
    applyScript(candidate.script, { resetTouched: true })
  }

  const outcome = useMemo((): { result: ImportResult | null; error: string | null } => {
    if (!script.trim()) return { result: null, error: null }
    try {
      return { result: importScript(script, language, { name: name.trim() || 'Layout importado', ...size, dpi, syspdvCode }), error: null }
    } catch (caught) {
      return { result: null, error: errorMessage(caught) }
    }
  }, [script, language, name, size, dpi, syspdvCode])

  const summary = outcome.result ? summarizeImport(outcome.result) : null

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <header className="modal-header">
          <h2 id="import-title">Importar layout</h2>
          <button type="button" className="icon-button" onClick={onCancel} title="Fechar (Esc)">
            ×
          </button>
        </header>

        <div className="modal-body import-body">
          <section className="import-source">
            <div className="import-file">
              <span className="field-label">Origem</span>
              <span className="file-name">{source.label}</span>
            </div>
            <p className="hint">Confira a linguagem e o tamanho da etiqueta. O código abaixo pode ser editado antes de importar.</p>
            {candidates.length > 1 && (
              <label className="field">
                <span className="field-label">Layout dentro do arquivo</span>
                <select value={candidateIndex} onChange={(event) => selectCandidate(Number(event.target.value))}>
                  {candidates.map((candidate, index) => (
                    <option key={`${candidate.label}-${index}`} value={index}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <textarea
              className="code import-code"
              spellCheck={false}
              placeholder="Cole aqui o código da etiqueta…"
              value={showControlCodes(script)}
              onChange={(event) => applyScript(restoreControlCodes(event.target.value), { resetTouched: false })}
            />
          </section>

          <section className="import-settings">
            <label className="field">
              <span className="field-label">Nome</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Linguagem</span>
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value as Language)
                  setLanguageTouched(true)
                }}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                    {script.trim() && item.id === detectLanguage(script) ? ' (detectada)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <NumberField
                label="Largura"
                suffix="mm"
                value={size.widthMm}
                min={10}
                max={240}
                onChange={(widthMm) => {
                  setSize((current) => ({ ...current, widthMm }))
                  setSizeTouched(true)
                }}
              />
              <NumberField
                label="Altura"
                suffix="mm"
                value={size.heightMm}
                min={5}
                max={300}
                onChange={(heightMm) => {
                  setSize((current) => ({ ...current, heightMm }))
                  setSizeTouched(true)
                }}
              />
            </div>
            <div className="field-row">
              <NumberField
                label="Espaço"
                suffix="mm"
                value={size.gapMm}
                min={0}
                max={20}
                onChange={(gapMm) => {
                  setSize((current) => ({ ...current, gapMm }))
                  setSizeTouched(true)
                }}
              />
              <label className="field">
                <span className="field-label">Resolução</span>
                <select value={dpi} onChange={(event) => setDpi(Number(event.target.value))}>
                  {DPI_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} dpi
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {language === 'ppla' && <p className="hint">O código PPLA não informa o tamanho da etiqueta. Confira a largura e a altura antes de importar.</p>}

            {summary && (
              <div className="import-summary">
                <strong>{languageInfo(language).label}</strong>
                <span>
                  {summary.drawable} {summary.drawable === 1 ? 'elemento' : 'elementos'} com prévia
                </span>
                {summary.raw > 0 && (
                  <span>
                    {summary.raw} {summary.raw === 1 ? 'comando mantido' : 'comandos mantidos'} sem prévia
                  </span>
                )}
              </div>
            )}
            {outcome.result?.warnings.map((warning) => (
              <p key={warning} className="warning">
                {warning}
              </p>
            ))}
            {outcome.error && <p className="error">{outcome.error}</p>}
          </section>
        </div>

        <footer className="modal-footer">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="primary" disabled={!outcome.result} onClick={() => outcome.result && onImport(outcome.result)}>
            Importar
          </button>
        </footer>
      </div>
    </div>
  )
}
