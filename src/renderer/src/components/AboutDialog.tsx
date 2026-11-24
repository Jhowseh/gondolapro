import packageInfo from '../../../../package.json'
import { Modal } from './Modal'

const COMPANY = 'PBtec - Soluções em Automação'

const PHONE = '(83) 3224-3080'

const DEVELOPERS = ['José Henrique', 'Erick Henrique', 'Eduardo Vasconcelos']

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase()
}

interface AboutDialogProps {
  onClose: () => void
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  return (
    <Modal
      title={`Sobre o ${packageInfo.productName}`}
      titleId="about-title"
      className="modal-about"
      bodyClassName="about-body"
      onClose={onClose}
      footer={
        <button type="button" className="primary" onClick={onClose} autoFocus>
          Fechar
        </button>
      }
    >
      <div className="about-identity">
        <span className="brand-mark about-mark">G</span>
        <div>
          <div className="about-name">{packageInfo.productName}</div>
          <div className="hint">Versão {packageInfo.version}</div>
        </div>
      </div>

      <div className="about-cards">
        <div className="about-card">
          <h2>Empresa</h2>
          <dl className="about-facts">
            <div>
              <dt className="field-label">Nome</dt>
              <dd>{COMPANY}</dd>
            </div>
            <div>
              <dt className="field-label">Telefone</dt>
              <dd>{PHONE}</dd>
            </div>
          </dl>
          <p className="hint about-description">
            Monta layouts de etiqueta de gôndola na tela e gera o código da impressora (PPLA, EPL ou ZPL) pronto para o SysPDV.
          </p>
        </div>

        <div className="about-card">
          <h2>Desenvolvimento e análise</h2>
          <ul className="about-developers">
            {DEVELOPERS.map((developer) => (
              <li key={developer}>
                <span className="about-initials">{initialsOf(developer)}</span>
                {developer}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
