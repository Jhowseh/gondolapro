import { useEffect } from 'react'
import packageInfo from '../../../../package.json'

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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal modal-about" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <header className="modal-header">
          <h2 id="about-title">Sobre o {packageInfo.productName}</h2>
          <button type="button" className="icon-button" onClick={onClose} title="Fechar (Esc)">
            ×
          </button>
        </header>

        <div className="modal-body about-body">
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
        </div>

        <footer className="modal-footer">
          <button type="button" className="primary" onClick={onClose} autoFocus>
            Fechar
          </button>
        </footer>
      </section>
    </div>
  )
}
