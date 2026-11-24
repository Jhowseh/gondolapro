import { useState } from 'react'
import { SYSPDV_CODE_LENGTH, SYSPDV_DESCRIPTION_LENGTH, syspdvExportProblem } from '../../../core/exporting'
import { plural } from '../text'
import { Modal } from './Modal'

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

  return (
    <Modal
      title="Exportar XML para o SysPDV"
      titleId="export-title"
      className="modal-small"
      bodyClassName="export-body"
      onClose={onCancel}
      onSubmit={() => !problem && onExport({ code, description })}
      footer={
        <>
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={Boolean(problem)}>
            Exportar XML
          </button>
        </>
      }
    >
      <p className="hint">Gera o mesmo XML que o SysPDV exporta, pronto para importar na tela de layouts de etiqueta.</p>
      <div className="field-row export-fields">
        <label className="field">
          <span className="field-label">Código</span>
          <input value={code} maxLength={SYSPDV_CODE_LENGTH} autoFocus={!defaultCode} onChange={(event) => setCode(event.target.value.toUpperCase())} />
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
        <p className="warning">A verificação encontrou {plural(issueCount, 'problema', 'problemas')} neste layout. O XML será gerado mesmo assim.</p>
      )}
      {problem && (code || description) && <p className="error">{problem}</p>}
    </Modal>
  )
}
