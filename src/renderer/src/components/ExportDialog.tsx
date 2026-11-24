import { useEffect, useState } from 'react'
import { SYSPDV_CODE_LENGTH, SYSPDV_DESCRIPTION_LENGTH, syspdvExportProblem } from '../../../core/exporting'

export interface ExportChoice {
  code: string
  description: string
}

interface ExportDialogProps {
  defaultCode: string
  defaultDescription: string
  issueCount: number
  onCancel: () => void
  onExport: (choice: ExportChoice) => void
}

export function ExportDialog({ defaultCode, defaultDescription, issueCount, onCancel, onExport }: ExportDialogProps) {
  const [code, setCode] = useState(defaultCode)
  const [description, setDescription] = useState(defaultDescription.slice(0, SYSPDV_DESCRIPTION_LENGTH))
  const problem = syspdvExportProblem({ code, description })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const submit = () => {
    if (!problem) onExport({ code, description })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <form
        className="modal modal-small"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <header className="modal-header">
          <h2 id="export-title">Exportar XML para o SysPDV</h2>
          <button type="button" className="icon-button" onClick={onCancel} title="Fechar (Esc)">
            ×
          </button>
        </header>

        <div className="modal-body export-body">
          <p className="hint">Gera o mesmo XML que o SysPDV exporta, pronto para importar na tela de layouts de etiqueta.</p>
          <div className="field-row export-fields">
            <label className="field">
              <span className="field-label">Código</span>
              <input
                value={code}
                maxLength={SYSPDV_CODE_LENGTH}
                autoFocus={!defaultCode}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
              />
            </label>
            <label className="field">
              <span className="field-label">Descrição</span>
              <input value={description} maxLength={SYSPDV_DESCRIPTION_LENGTH} autoFocus={Boolean(defaultCode)} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>
          <p className="hint">
            O código tem até {SYSPDV_CODE_LENGTH} caracteres. Se já existir um layout com esse código no SysPDV, confira antes de importar para não sobrescrever o layout errado.
          </p>
          {issueCount > 0 && (
            <p className="warning">
              A verificação encontrou {issueCount} {issueCount === 1 ? 'problema' : 'problemas'} neste layout. O XML será gerado mesmo assim.
            </p>
          )}
          {problem && (code || description) && <p className="error">{problem}</p>}
        </div>

        <footer className="modal-footer">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={Boolean(problem)}>
            Exportar XML
          </button>
        </footer>
      </form>
    </div>
  )
}
