import { useMemo, useEffect } from 'react'
import { Eye, X } from 'lucide-react'

interface ReferenceFileCardProps {
  file: File
  onRemove: () => void
  onPreview: (file: File) => void
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ReferenceFileCard({ file, onRemove, onPreview }: ReferenceFileCardProps) {
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(file.name)
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isArchive = /\.(zip|rar|7z|tar|gz)$/i.test(file.name)
  const isCode = /\.(html|css|js|ts|json|svg)$/i.test(file.name)
  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE'

  const thumbUrl = useMemo(() => {
    if (isImage) {
      return URL.createObjectURL(file)
    }
    return null
  }, [file, isImage])

  useEffect(() => {
    return () => {
      if (thumbUrl) URL.revokeObjectURL(thumbUrl)
    }
  }, [thumbUrl])

  return (
    <article className="new-project-file-card">
      <div
        className="new-project-file-card__thumb"
        onClick={() => onPreview(file)}
        role="button"
        tabIndex={0}
        title={`Visualizar ${file.name}`}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            onPreview(file)
          }
        }}
      >
        {isImage && thumbUrl ? (
          <img src={thumbUrl} alt={file.name} />
        ) : isPdf ? (
          <span className="new-project-file-card__thumb-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
            PDF
          </span>
        ) : isArchive ? (
          <span className="new-project-file-card__thumb-badge" style={{ background: '#fffbeb', color: '#b45309' }}>
            ZIP
          </span>
        ) : isCode ? (
          <span className="new-project-file-card__thumb-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            {ext}
          </span>
        ) : (
          <span className="new-project-file-card__thumb-badge">{ext}</span>
        )}
        <div className="new-project-file-card__thumb-overlay">
          <Eye size={16} />
        </div>
      </div>

      <div className="new-project-file-card__info">
        <span
          className="new-project-file-card__name"
          onClick={() => onPreview(file)}
          title={file.name}
          role="button"
          tabIndex={0}
        >
          {file.name}
        </span>
        <div className="new-project-file-card__meta">
          <span className="new-project-file-card__ext">{ext}</span>
          <span>{formatSize(file.size)}</span>
        </div>
      </div>

      <div className="new-project-file-card__actions">
        <button
          type="button"
          className="new-project-file-card__btn"
          onClick={() => onPreview(file)}
          title="Abrir visualização"
          aria-label={`Visualizar ${file.name}`}
        >
          <Eye size={15} />
        </button>
        <button
          type="button"
          className="new-project-file-card__btn new-project-file-card__btn--delete"
          onClick={onRemove}
          title="Remover arquivo"
          aria-label={`Remover ${file.name}`}
        >
          <X size={15} />
        </button>
      </div>
    </article>
  )
}
