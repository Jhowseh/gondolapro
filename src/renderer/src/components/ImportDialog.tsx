import { useMemo, useState } from 'react'
import { restoreControlCodes, showControlCodes } from '../../../core/controlCodes'
import { detectLanguage, importScript, inferFrame, summarizeImport, type ImportCandidate, type ImportResult } from '../../../core/importing'
import { DPI_OPTIONS, LANGUAGES, languageInfo } from '../../../core/languages'
import type { Language } from '../../../core/types'
import { errorMessage, plural } from '../text'
import { Modal } from './Modal'
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

const FALLBACK_NAME = 'Layout importado'

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
  const [size, setSize] = useState(() => sizeOf(first.script, language, defaultDpi))
  const [sizeTouched, setSizeTouched] = useState(false)
  const [dpi, setDpi] = useState(defaultDpi)
  const detected = useMemo(() => (script.trim() ? detectLanguage(script) : null), [script])

  const updateSize = (patch: Partial<typeof size>) => {
    setSize((current) => ({ ...current, ...patch }))
    setSizeTouched(true)
  }

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
      return { result: importScript(script, language, { name: FALLBACK_NAME, ...size, dpi, syspdvCode }), error: null }
    } catch (caught) {
      return { result: null, error: errorMessage(caught) }
    }
  }, [script, language, size, dpi, syspdvCode])

  const summary = outcome.result ? summarizeImport(outcome.result) : null

  const confirm = () => {
    if (outcome.result) onImport({ ...outcome.result, layout: { ...outcome.result.layout, name: name.trim() || FALLBACK_NAME } })
  }

  return (
    <Modal
      title="Importar layout"
      titleId="import-title"
      bodyClassName="import-body"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="primary" disabled={!outcome.result} onClick={confirm}>
            Importar
          </button>
        </>
      }
    >
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
                {item.id === detected ? ' (detectada)' : ''}
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
            onChange={(widthMm) => updateSize({ widthMm })}
          />
          <NumberField
            label="Altura"
            suffix="mm"
            value={size.heightMm}
            min={5}
            max={300}
            onChange={(heightMm) => updateSize({ heightMm })}
          />
        </div>
        <div className="field-row">
          <NumberField
            label="Espaço"
            suffix="mm"
            value={size.gapMm}
            min={0}
            max={20}
            onChange={(gapMm) => updateSize({ gapMm })}
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
            <span>{plural(summary.drawable, 'elemento', 'elementos')} com prévia</span>
            {summary.raw > 0 && <span>{plural(summary.raw, 'comando mantido', 'comandos mantidos')} sem prévia</span>}
          </div>
        )}
        {outcome.result?.warnings.map((warning) => (
          <p key={warning} className="warning">
            {warning}
          </p>
        ))}
        {outcome.error && <p className="error">{outcome.error}</p>}
      </section>
    </Modal>
  )
}
