export const MIN_ZOOM = 2

export const MAX_ZOOM = 16

const BASE_ZOOM = 4

interface ZoomControlProps {
  zoom: number
  onChange: (zoom: number) => void
}

export function ZoomControl({ zoom, onChange }: ZoomControlProps) {
  return (
    <div className="zoom">
      <button type="button" onClick={() => onChange(Math.max(MIN_ZOOM, zoom - 1))} disabled={zoom <= MIN_ZOOM} title="Diminuir zoom">
        −
      </button>
      <span className="zoom-value">{Math.round((zoom / BASE_ZOOM) * 100)}%</span>
      <button type="button" onClick={() => onChange(Math.min(MAX_ZOOM, zoom + 1))} disabled={zoom >= MAX_ZOOM} title="Aumentar zoom">
        +
      </button>
    </div>
  )
}
