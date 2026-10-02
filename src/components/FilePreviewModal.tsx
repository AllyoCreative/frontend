import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink, Download, FileText, Trash2 } from 'lucide-react'

export interface PreviewableFile {
  name: string
  url?: string
  file?: File
  sizeBytes?: number
  contentType?: string
}

interface FilePreviewModalProps {
  file: PreviewableFile | null
  onClose: () => void
  onRemove?: () => void
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FilePreviewModal({ file, onClose, onRemove }: FilePreviewModalProps) {
  const fileUrl = useMemo(() => {
    if (!file) return ''
    if (file.file) {
      return URL.createObjectURL(file.file)
    }
    return file.url || ''
  }, [file])

  useEffect(() => {
    return () => {
      if (file?.file && fileUrl) {
        URL.revokeObjectURL(fileUrl)
      }
    }
  }, [file, fileUrl])

  useEffect(() => {
    if (!file) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [file, onClose])

  if (!file) return null

  const mime = file.contentType || file.file?.type || ''
  const ext = file.name.split('.').pop()?.toUpperCase() || 'ARQUIVO'
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(file.name)
  const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)
  const sizeText = formatSize(file.sizeBytes || file.file?.size)

  const modalContent = (
    <div className="file-preview-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="file-preview-modal" onClick={(e) => e.stopPropagation()}>
        <header className="file-preview-modal__header">
          <div className="file-preview-modal__title-group">
            <span className="file-preview-modal__badge">{ext}</span>
            <div>
              <h2 className="file-preview-modal__title" title={file.name}>{file.name}</h2>
              {sizeText && <small className="file-preview-modal__subtitle">{sizeText}</small>}
            </div>
          </div>
          <div className="file-preview-modal__controls">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                download={file.name}
                className="file-preview-modal__action-btn"
                title="Abrir em nova aba ou baixar"
              >
                <ExternalLink size={14} />
                <span>Abrir original</span>
              </a>
            )}
            {onRemove && (
              <button
                type="button"
                className="file-preview-modal__action-btn file-preview-modal__action-btn--danger"
                onClick={() => {
                  onRemove()
                  onClose()
                }}
                title="Remover arquivo"
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            )}
            <button
              type="button"
              className="file-preview-modal__close-btn"
              onClick={onClose}
              aria-label="Fechar visualização"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="file-preview-modal__body">
          {isImage && fileUrl ? (
            <img src={fileUrl} alt={file.name} className="file-preview-modal__image" />
          ) : isPdf && fileUrl ? (
            <iframe src={fileUrl} title={file.name} className="file-preview-modal__iframe" />
          ) : isVideo && fileUrl ? (
            <video src={fileUrl} controls autoPlay className="file-preview-modal__video" />
          ) : (
            <div className="file-preview-modal__fallback">
              <FileText size={48} color="#004c46" />
              <h3>{file.name}</h3>
              <p>Visualização direta não suportada para o formato {ext}.</p>
              {fileUrl && (
                <a href={fileUrl} download={file.name} target="_blank" rel="noreferrer" className="primary-button">
                  <Download size={15} /> Baixar arquivo ({sizeText})
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
