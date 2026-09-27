import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  AlignJustify,
  ArrowUpRight,
  Brush,
  Download,
  FileText,
  Hand,
  MessageSquare,
  MessageSquareText,
  MousePointer2,
  Redo2,
  Square,
  Star,
  Type,
  Undo2,
  X,
} from 'lucide-react'
import { figmaAsset } from '../assets/figma'
import { api, type DesignSummary } from '../services/api'

export type ReviewOrigin = { left: number; top: number; width: number; height: number }

type ReviewPoint = { x: number; y: number }
type ReviewTool = 'point' | 'general' | 'pan' | 'draw' | 'arrow' | 'text' | 'rectangle'

type ReviewComment = {
  id: number
  author: string
  text: string
  time: string
  resolved: boolean
  version: number
  point?: ReviewPoint
  annotationId?: number
}

type StrokeAnnotation = {
  id: number
  type: 'draw'
  version: number
  color: string
  width: number
  points: ReviewPoint[]
}

type DragAnnotation = {
  id: number
  type: 'arrow' | 'rectangle'
  version: number
  color: string
  width: number
  start: ReviewPoint
  end: ReviewPoint
}

type TextAnnotation = {
  id: number
  type: 'text'
  version: number
  color: string
  point: ReviewPoint
  text: string
}

type ReviewAnnotation = StrokeAnnotation | DragAnnotation | TextAnnotation
type DraftAnnotation = StrokeAnnotation | DragAnnotation

type AnnotationHistory = { snapshots: ReviewAnnotation[][]; index: number }
type AnnotationAction =
  | { type: 'commit'; annotation: ReviewAnnotation }
  | { type: 'replace'; annotations: ReviewAnnotation[] }
  | { type: 'undo' }
  | { type: 'redo' }

type DesignReviewModalProps = {
  delivery: DesignSummary
  isApproved: boolean
  origin: ReviewOrigin | null
  onApprovalChange: (approved: boolean, feedback?: { rating: number; comment?: string }) => Promise<void>
  onClose: () => void
  notify: (message: string) => void
}

const annotationColors = ['#5d55c7', '#f2c94c', '#22a977', '#ef6a5b'] as const

function annotationReducer(state: AnnotationHistory, action: AnnotationAction): AnnotationHistory {
  if (action.type === 'replace') return { snapshots: [action.annotations], index: 0 }
  if (action.type === 'undo') return state.index > 0 ? { ...state, index: state.index - 1 } : state
  if (action.type === 'redo') return state.index < state.snapshots.length - 1 ? { ...state, index: state.index + 1 } : state

  const current = state.snapshots[state.index]
  const snapshots = [...state.snapshots.slice(0, state.index + 1), [...current, action.annotation]]
  return { snapshots, index: snapshots.length - 1 }
}

function annotationLabel(annotation?: ReviewAnnotation) {
  if (!annotation) return 'Anotação'
  if (annotation.type === 'draw') return 'Desenho livre'
  if (annotation.type === 'arrow') return 'Seta'
  if (annotation.type === 'rectangle') return 'Área destacada'
  return 'Texto na arte'
}

function contentKind(delivery: DesignSummary) {
  const type = delivery.contentType?.toLowerCase() || ''
  const name = `${delivery.name} ${delivery.fileUrl || ''}`.toLowerCase()
  if (delivery.textContent || type.startsWith('text/')) return 'copy' as const
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf' as const
  if (type.startsWith('video/')) return 'video' as const
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) return 'image' as const
  return 'file' as const
}

export function DesignReviewModal({ delivery, isApproved, origin, onApprovalChange, onClose, notify }: DesignReviewModalProps) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const initialVersion = Number(delivery.version.replace(/\D/g, '')) || 1
  const kind = contentKind(delivery)
  const supportsCanvas = kind === 'image'
  const activeVersion = initialVersion
  const [zoom, setZoom] = useState(supportsCanvas ? 50 : 100)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [fileLoadError, setFileLoadError] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [pendingPoint, setPendingPoint] = useState<ReviewPoint | null>(null)
  const [pendingAnnotationId, setPendingAnnotationId] = useState<number | null>(null)
  const [activeTool, setActiveTool] = useState<ReviewTool>(supportsCanvas ? 'point' : 'general')
  const [brushOpen, setBrushOpen] = useState(false)
  const [inkColor, setInkColor] = useState('#5d55c7')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [draftAnnotation, setDraftAnnotation] = useState<DraftAnnotation | null>(null)
  const [textEditor, setTextEditor] = useState<{ point: ReviewPoint; value: string } | null>(null)
  const [annotationHistory, dispatchAnnotation] = useReducer(annotationReducer, { snapshots: [[]], index: 0 })
  const [railVisible, setRailVisible] = useState(supportsCanvas)
  const [canvasSize, setCanvasSize] = useState(() => kind === 'copy' ? { width: 900, height: 1080 } : kind === 'video' ? { width: 1280, height: 720 } : { width: 1468, height: 920 })
  const [isPanning, setIsPanning] = useState(false)
  const [closing, setClosing] = useState(false)
  const [approvalFeedbackOpen, setApprovalFeedbackOpen] = useState(false)
  const [approvalRating, setApprovalRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [approvalComment, setApprovalComment] = useState('')
  const [approvalSubmitting, setApprovalSubmitting] = useState(false)
  const [approvalError, setApprovalError] = useState('')
  const [artReady, setArtReady] = useState(!origin || reducedMotion || !supportsCanvas)
  const [clonePhase, setClonePhase] = useState<'opening' | 'closing' | null>(origin && supportsCanvas && !reducedMotion ? 'opening' : null)
  const [cloneRect, setCloneRect] = useState<ReviewOrigin | null>(origin)
  const artStageRef = useRef<HTMLElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const inlineCommentInputRef = useRef<HTMLTextAreaElement>(null)
  const commentsPanelRef = useRef<HTMLElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const panStartRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null)

  const annotations = annotationHistory.snapshots[annotationHistory.index]
  const visibleAnnotations = useMemo(() => annotations.filter((annotation) => annotation.version === activeVersion), [activeVersion, annotations])
  const visibleComments = useMemo(() => comments.filter((comment) => {
    if (comment.version !== activeVersion) return false
    if (filter === 'open') return !comment.resolved
    if (filter === 'resolved') return comment.resolved
    return true
  }), [activeVersion, comments, filter])
  const pointedComments = useMemo(() => comments
    .filter((comment) => comment.version === activeVersion && comment.point)
    .sort((left, right) => left.id - right.id), [activeVersion, comments])
  const markerNumber = (commentId: number) => pointedComments.findIndex((comment) => comment.id === commentId) + 1

  const selectComment = (comment: ReviewComment) => {
    setSelectedCommentId(comment.id)
    setFilter(comment.resolved ? 'resolved' : 'open')
    requestAnimationFrame(() => {
      const panel = commentsPanelRef.current
      const target = document.getElementById(`review-comment-${comment.id}`)
      if (!panel || !target) return
      panel.scrollTo({ top: Math.max(0, target.offsetTop - 54), behavior: 'smooth' })
    })
  }

  useEffect(() => {
    let active = true
    api.getDesignReview(delivery.id).then((review) => {
      if (!active) return
      setComments(review.comments as ReviewComment[])
      dispatchAnnotation({ type: 'replace', annotations: review.annotations as ReviewAnnotation[] })
    }).catch((error: unknown) => {
      if (active) notify(error instanceof Error ? error.message : 'Não foi possível carregar os comentários')
    }).finally(() => {
      if (active) setReviewLoading(false)
    })
    return () => { active = false }
  }, [delivery.id, notify])

  useLayoutEffect(() => {
    if (!clonePhase || !origin || !artRef.current || !cloneRef.current) return
    const targetBounds = artRef.current.getBoundingClientRect()
    const target = { left: targetBounds.left, top: targetBounds.top, width: targetBounds.width, height: targetBounds.height }
    const start = clonePhase === 'opening' ? origin : target
    const end = clonePhase === 'opening' ? target : origin
    const animation = cloneRef.current.animate([
      { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, borderRadius: '9px', opacity: 1 },
      { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px`, borderRadius: '5px', opacity: 1 },
    ], {
      duration: clonePhase === 'opening' ? 420 : 300,
      easing: clonePhase === 'opening' ? 'cubic-bezier(.22, 1, .36, 1)' : 'cubic-bezier(.4, 0, .6, 1)',
      fill: 'forwards',
    })
    let cancelled = false
    animation.finished.then(() => {
      if (cancelled) return
      if (clonePhase === 'opening') {
        setArtReady(true)
        setClonePhase(null)
      } else onClose()
    }).catch(() => undefined)
    return () => {
      cancelled = true
      animation.cancel()
    }
  }, [clonePhase, onClose, origin])

  const closeModal = useCallback(() => {
    if (closing) return
    const art = artRef.current
    const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!art || !origin || shouldReduceMotion || !supportsCanvas) {
      onClose()
      return
    }
    const target = art.getBoundingClientRect()
    setClosing(true)
    setArtReady(false)
    setCloneRect({ left: target.left, top: target.top, width: target.width, height: target.height })
    setClonePhase('closing')
  }, [closing, onClose, origin, supportsCanvas])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target?.matches('input, textarea, [contenteditable="true"]')
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !isTyping) {
        event.preventDefault()
        dispatchAnnotation({ type: event.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (event.key !== 'Escape') return
      if (approvalFeedbackOpen) {
        setApprovalFeedbackOpen(false)
        setApprovalError('')
        return
      }
      if (textEditor || pendingPoint || draftAnnotation) {
        setTextEditor(null)
        setPendingPoint(null)
        setDraftAnnotation(null)
        return
      }
      if (brushOpen) {
        setBrushOpen(false)
        setActiveTool('point')
        return
      }
      closeModal()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [approvalFeedbackOpen, brushOpen, closeModal, draftAnnotation, pendingPoint, textEditor])

  const submitApprovalFeedback = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!approvalRating || approvalSubmitting) return
    setApprovalSubmitting(true)
    setApprovalError('')
    try {
      await onApprovalChange(true, { rating: approvalRating, comment: approvalComment.trim() || undefined })
      setApprovalFeedbackOpen(false)
      notify('Tarefa aprovada e avaliação enviada. Obrigado pelo feedback!')
    } catch (error: unknown) {
      setApprovalError(error instanceof Error ? error.message : 'Não foi possível enviar a avaliação')
    } finally {
      setApprovalSubmitting(false)
    }
  }

  const revokeApproval = async () => {
    if (approvalSubmitting) return
    setApprovalSubmitting(true)
    try {
      await onApprovalChange(false)
      notify('Aprovação removida')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível remover a aprovação')
    } finally {
      setApprovalSubmitting(false)
    }
  }

  const chooseTool = (tool: ReviewTool) => {
    if (!supportsCanvas && tool !== 'general') return
    setActiveTool(tool)
    setDraftAnnotation(null)
    setTextEditor(null)
    setPendingAnnotationId(null)
    if (tool !== 'point') setPendingPoint(null)
    if (tool === 'point' || tool === 'general' || tool === 'pan') setBrushOpen(false)
    if (tool === 'general') requestAnimationFrame(() => commentInputRef.current?.focus())
  }

  const toggleBrushTools = () => {
    if (brushOpen) {
      chooseTool('point')
      return
    }
    setBrushOpen(true)
    chooseTool('draw')
  }

  const getPoint = (clientX: number, clientY: number): ReviewPoint => {
    const bounds = artRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 50, y: 50 }
    return {
      x: Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - bounds.top) / bounds.height) * 100)),
    }
  }

  const beginArtInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!supportsCanvas) return
    if (event.button !== 0) return
    const point = getPoint(event.clientX, event.clientY)

    if (activeTool === 'general') return
    if (activeTool === 'point') {
      setPendingAnnotationId(null)
      setPendingPoint(point)
      requestAnimationFrame(() => inlineCommentInputRef.current?.focus())
      return
    }
    if (activeTool === 'text') {
      setPendingPoint(null)
      setPendingAnnotationId(null)
      setTextEditor({ point, value: '' })
      requestAnimationFrame(() => textInputRef.current?.focus())
      return
    }
    if (activeTool === 'pan') {
      const stage = artStageRef.current
      if (!stage) return
      event.currentTarget.setPointerCapture(event.pointerId)
      panStartRef.current = { clientX: event.clientX, clientY: event.clientY, scrollLeft: stage.scrollLeft, scrollTop: stage.scrollTop }
      setIsPanning(true)
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const base = { id: Date.now(), version: activeVersion, color: inkColor, width: strokeWidth }
    if (activeTool === 'draw') setDraftAnnotation({ ...base, type: 'draw', points: [point] })
    else setDraftAnnotation({ ...base, type: activeTool, start: point, end: point })
  }

  const continueArtInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panStartRef.current && activeTool === 'pan') {
      const stage = artStageRef.current
      if (!stage) return
      stage.scrollLeft = panStartRef.current.scrollLeft - (event.clientX - panStartRef.current.clientX)
      stage.scrollTop = panStartRef.current.scrollTop - (event.clientY - panStartRef.current.clientY)
      return
    }
    if (!draftAnnotation) return
    const point = getPoint(event.clientX, event.clientY)
    if (draftAnnotation.type === 'draw') {
      const previous = draftAnnotation.points[draftAnnotation.points.length - 1]
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < .15) return
      setDraftAnnotation({ ...draftAnnotation, points: [...draftAnnotation.points, point] })
    } else setDraftAnnotation({ ...draftAnnotation, end: point })
  }

  const finishArtInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (panStartRef.current) {
      panStartRef.current = null
      setIsPanning(false)
      return
    }
    if (!draftAnnotation) return
    const isUsable = draftAnnotation.type === 'draw'
      ? draftAnnotation.points.length > 1
      : Math.hypot(draftAnnotation.end.x - draftAnnotation.start.x, draftAnnotation.end.y - draftAnnotation.start.y) > .5
    if (isUsable) {
      void persistAnnotation(draftAnnotation)
      setPendingPoint(null)
      notify(`${annotationLabel(draftAnnotation)} adicionado. Você pode incluir um comentário.`)
    }
    setDraftAnnotation(null)
  }

  const annotationPayload = (annotation: ReviewAnnotation | DraftAnnotation): Record<string, unknown> => {
    if (annotation.type === 'draw') return { points: annotation.points }
    if (annotation.type === 'text') return { point: annotation.point, text: annotation.text }
    return { start: annotation.start, end: annotation.end }
  }

  const persistAnnotation = async (annotation: ReviewAnnotation | DraftAnnotation) => {
    try {
      const saved = await api.addAnnotation(delivery.id, {
        type: annotation.type,
        version: annotation.version,
        color: annotation.color,
        width: 'width' in annotation ? annotation.width : 3,
        payload: annotationPayload(annotation),
      })
      const persisted = saved as unknown as ReviewAnnotation
      dispatchAnnotation({ type: 'commit', annotation: persisted })
      setPendingAnnotationId(persisted.id)
      requestAnimationFrame(() => commentInputRef.current?.focus())
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível salvar a marcação')
    }
  }

  const submitTextAnnotation = (event: React.FormEvent) => {
    event.preventDefault()
    if (!textEditor?.value.trim()) return
    const annotation: TextAnnotation = {
      id: Date.now(),
      type: 'text',
      version: activeVersion,
      color: inkColor,
      point: textEditor.point,
      text: textEditor.value.trim(),
    }
    void persistAnnotation(annotation)
    setTextEditor(null)
    notify('Texto adicionado à arte')
  }

  const addComment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!commentDraft.trim() || commentSubmitting) return
    setCommentSubmitting(true)
    try {
      const created = await api.addComment(delivery.id, {
        text: commentDraft.trim(),
        version: activeVersion,
        point: pendingPoint ?? undefined,
        annotationId: pendingAnnotationId ?? undefined,
      })
      setComments((current) => [...current, created as ReviewComment])
      setSelectedCommentId(created.id)
      setCommentDraft('')
      setPendingPoint(null)
      setPendingAnnotationId(null)
      notify('Comentário adicionado à entrega')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível adicionar o comentário')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const toggleResolved = async (id: number) => {
    const comment = comments.find((item) => item.id === id)
    if (!comment) return
    try {
      const updated = await api.setCommentResolved(delivery.id, id, !comment.resolved)
      setComments((current) => current.map((item) => item.id === id ? { ...item, resolved: updated.resolved } : item))
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível atualizar o comentário')
    }
  }

  const cycleStrokeWidth = () => setStrokeWidth((current) => current === 3 ? 5 : current === 5 ? 8 : 3)
  const contextAnnotation = pendingAnnotationId ? annotations.find((annotation) => annotation.id === pendingAnnotationId) : undefined
  const commentFormTitle = pendingPoint ? 'Comentário pontual' : contextAnnotation ? `Comentário sobre: ${annotationLabel(contextAnnotation)}` : 'Comentário geral'

  const renderAnnotation = (annotation: ReviewAnnotation | DraftAnnotation) => {
    if (annotation.type === 'text') return (
      <span className="file-review-art-text" style={{ left: `${annotation.point.x}%`, top: `${annotation.point.y}%`, color: annotation.color }} key={annotation.id}>{annotation.text}</span>
    )
    if (annotation.type === 'draw') {
      return <polyline key={annotation.id} points={annotation.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={annotation.color} strokeWidth={annotation.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    }
    const start = annotation.start
    const end = annotation.end
    if (annotation.type === 'arrow') {
      return <line key={annotation.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={annotation.color} strokeWidth={annotation.width} strokeLinecap="round" markerEnd="url(#file-review-arrow-head)" vectorEffect="non-scaling-stroke" />
    }
    return <rect key={annotation.id} x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={Math.abs(end.x - start.x)} height={Math.abs(end.y - start.y)} rx="5" fill={`${annotation.color}18`} stroke={annotation.color} strokeWidth={annotation.width} vectorEffect="non-scaling-stroke" />
  }

  const fileUrl = delivery.fileUrl || delivery.thumbnailUrl || null
  const typeLabel = kind === 'copy' ? 'Copy' : kind === 'pdf' ? 'PDF' : kind === 'video' ? 'Vídeo' : kind === 'image' ? 'Imagem' : 'Arquivo'
  const loadImageDimensions = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    if (!image.naturalWidth || !image.naturalHeight) return
    setFileLoadError(false)
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight))
    const size = { width: Math.round(image.naturalWidth * scale), height: Math.round(image.naturalHeight * scale) }
    setCanvasSize(size)
    const stage = artStageRef.current
    if (stage) {
      const fittedZoom = Math.min(100, ((stage.clientWidth - 36) / size.width) * 100, ((stage.clientHeight - 36) / size.height) * 100)
      setZoom(Math.max(15, Math.floor(fittedZoom)))
    }
  }

  const deliveryContent = kind === 'image' && fileUrl && !fileLoadError ? (
    <img src={fileUrl} onLoad={loadImageDimensions} onError={() => setFileLoadError(true)} alt={delivery.name} />
  ) : kind === 'image' ? (
    <div className="file-review-file-fallback"><FileText size={54} /><h2>Não foi possível carregar a imagem</h2><p>O link pode ter expirado. Feche e abra novamente; se continuar, peça um novo envio ao time.</p>{fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer"><Download size={17} /> Abrir arquivo original</a>}</div>
  ) : kind === 'pdf' && fileUrl ? (
    <div className="file-review-document-wrap"><iframe className="file-review-document" src={`${fileUrl}#toolbar=1&navpanes=0`} title={`PDF ${delivery.name}`} /><a href={fileUrl} target="_blank" rel="noreferrer"><Download size={16} /> Abrir PDF em nova aba</a></div>
  ) : kind === 'video' && fileUrl ? (
    <video className="file-review-video" src={fileUrl} controls playsInline aria-label={delivery.name} />
  ) : kind === 'copy' ? (
    <article className="file-review-copy"><span>Texto para aprovação</span><h1>{delivery.name}</h1><div>{delivery.textContent || 'O conteúdo desta entrega ainda não foi informado.'}</div></article>
  ) : (
    <div className="file-review-file-fallback"><FileText size={54} /><h2>{delivery.name}</h2><p>Este formato não possui visualização no navegador.</p>{fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer"><Download size={17} /> Baixar arquivo para revisar</a>}</div>
  )

  return createPortal(
    <>
    <div className={`file-review-modal file-review-modal--${kind}${closing ? ' file-review-modal--closing' : ''}`} role="dialog" aria-modal="true" aria-label="Revisão de entrega">
      <div className="file-review-shell">
        <header className="file-review-topbar">
          <div className="file-review-topline">
            <div className="file-review-breadcrumbs">
              <button type="button">Chat</button><button type="button">Entregas</button><i />
              <strong title={delivery.name}>{delivery.name}</strong>
              <span className="file-review-kind">{typeLabel}</span>
              <span className="file-review-status">{isApproved ? 'Aprovado' : 'Aguardando aprovação'}</span><i />
              <button type="button" className="file-review-change" onClick={() => { chooseTool('general'); notify('Descreva os ajustes no comentário para enviar ao time') }}><img src={figmaAsset('design_review.imgGardenReloadFill16')} alt="" />Solicitar alterações</button>
              <button type="button" className="file-review-approve" disabled={approvalSubmitting} onClick={() => { if (isApproved) void revokeApproval(); else setApprovalFeedbackOpen(true) }}><img src={figmaAsset('design_review.imgGroup')} alt="" />{isApproved ? 'Aprovado' : 'Marcar como aprovado'}</button>
            </div>
            <div className="file-review-share-actions"><button type="button" onClick={() => notify('Link de compartilhamento copiado')}><img src={figmaAsset('design_review.imgTablerShare')} alt="" />Compartilhar</button><button type="button" aria-label="Mais opções"><img src={figmaAsset('design_review.imgTablerDots')} alt="" /></button></div>
          </div>
          <div className="file-review-controls">
            <div className="file-review-view-controls">
              {supportsCanvas && <><button type="button" className={railVisible ? 'active' : ''} onClick={() => setRailVisible((value) => !value)} aria-label="Alternar miniatura" title="Miniatura"><img src={figmaAsset('design_review.imgPhSidebarBold')} alt="" /></button>
              <button type="button" className={activeTool === 'pan' ? 'active' : ''} onClick={() => chooseTool('pan')} aria-pressed={activeTool === 'pan'} aria-label="Mover arquivo" title="Mover arquivo"><Hand size={20} /></button>
              <label className="file-review-select file-review-zoom"><select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Zoom">{![25, 50, 75, 100, 125].includes(zoom) && <option value={zoom}>Ajustar ({zoom}%)</option>}<option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option></select></label><i /></>}
              <span className="file-review-current-version">Versão {activeVersion}</span>
            </div>

            {supportsCanvas ? <div className={`file-review-annotation-toolbar${brushOpen ? ' is-expanded' : ''}`} role="toolbar" aria-label="Ferramentas de anotação">
              <div className="file-review-primary-tools">
                <button type="button" className={activeTool === 'point' ? 'active' : ''} onClick={() => chooseTool('point')} aria-pressed={activeTool === 'point'} aria-label="Comentário pontual" title="Comentário pontual: clique na arte">
                  <span className="file-review-point-tool"><MessageSquare size={21} /><MousePointer2 size={13} /></span>
                </button>
                <button type="button" className={activeTool === 'general' ? 'active' : ''} onClick={() => chooseTool('general')} aria-pressed={activeTool === 'general'} aria-label="Comentário geral" title="Comentário geral"><MessageSquareText size={21} /></button>
                <button type="button" className={brushOpen ? 'active' : ''} onClick={toggleBrushTools} aria-expanded={brushOpen} aria-label="Ferramentas de marcação" title="Desenhar e marcar"><Brush size={22} /></button>
              </div>

              {brushOpen && <div className="file-review-brush-options" aria-label="Opções do pincel">
                <div className="file-review-color-options" role="group" aria-label="Cor da anotação">
                  {annotationColors.map((color) => <button type="button" className={inkColor === color ? 'active' : ''} style={{ '--annotation-color': color } as CSSProperties} onClick={() => setInkColor(color)} aria-label={`Usar cor ${color}`} aria-pressed={inkColor === color} key={color}><i /></button>)}
                </div>
                <i />
                <button type="button" className="file-review-stroke" onClick={cycleStrokeWidth} aria-label={`Espessura ${strokeWidth} pixels`} title="Alterar espessura"><AlignJustify size={21} /><small>{strokeWidth}</small></button>
                <button type="button" className={activeTool === 'draw' ? 'active' : ''} onClick={() => chooseTool('draw')} aria-pressed={activeTool === 'draw'} aria-label="Desenho livre" title="Desenho livre"><Brush size={20} /></button>
                <button type="button" className={activeTool === 'text' ? 'active' : ''} onClick={() => chooseTool('text')} aria-pressed={activeTool === 'text'} aria-label="Adicionar texto" title="Adicionar texto"><Type size={21} /></button>
                <button type="button" className={activeTool === 'rectangle' ? 'active' : ''} onClick={() => chooseTool('rectangle')} aria-pressed={activeTool === 'rectangle'} aria-label="Destacar área" title="Destacar área"><Square size={20} /></button>
                <button type="button" className={activeTool === 'arrow' ? 'active' : ''} onClick={() => chooseTool('arrow')} aria-pressed={activeTool === 'arrow'} aria-label="Adicionar seta" title="Adicionar seta"><ArrowUpRight size={22} /></button>
                <i />
                <button type="button" onClick={() => dispatchAnnotation({ type: 'undo' })} disabled={annotationHistory.index === 0} aria-label="Desfazer anotação" title="Desfazer"><Undo2 size={21} /></button>
                <button type="button" onClick={() => dispatchAnnotation({ type: 'redo' })} disabled={annotationHistory.index === annotationHistory.snapshots.length - 1} aria-label="Refazer anotação" title="Refazer"><Redo2 size={21} /></button>
              </div>}
            </div> : <div className="file-review-delivery-actions"><button type="button" className="file-review-general-comment" onClick={() => chooseTool('general')}><MessageSquareText size={18} /> Comentar entrega</button>{fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer"><Download size={17} /> Abrir original</a>}</div>}

            <div className="file-review-right-controls"><label className="file-review-select file-review-read"><select aria-label="Estado de leitura" defaultValue="unread"><option value="unread">não lido</option><option value="read">lido</option></select></label><button type="button" aria-label="Visualizar comentários"><img src={figmaAsset('design_review.imgGroup1')} alt="" /></button><button type="button" onClick={closeModal} aria-label="Fechar revisão"><img src={figmaAsset('design_review.imgMaterialSymbolsClose')} alt="" /></button></div>
          </div>
        </header>

        {supportsCanvas && <aside className={`file-review-rail${railVisible ? '' : ' is-hidden'}`} aria-label="Versão atual do arquivo">
          <button type="button" className="active"><img src={delivery.thumbnailUrl || fileUrl || ''} alt={`Miniatura da versão ${activeVersion}`} /><span><b>{activeVersion}</b><small>Atual</small></span></button>
        </aside>}

        <main ref={artStageRef} className={`file-review-art-stage${railVisible ? '' : ' is-expanded'} is-${activeTool}${isPanning ? ' is-panning' : ''}`}>
          <div
            className={`file-review-art file-review-art--v${activeVersion}${artReady ? ' is-ready' : ' is-transitioning'}`}
            ref={artRef}
            style={{ width: canvasSize.width * zoom / 100, height: canvasSize.height * zoom / 100 }}
            onPointerDown={supportsCanvas ? beginArtInteraction : undefined}
            onPointerMove={supportsCanvas ? continueArtInteraction : undefined}
            onPointerUp={supportsCanvas ? finishArtInteraction : undefined}
            onPointerCancel={supportsCanvas ? finishArtInteraction : undefined}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              if (activeTool === 'point') {
                event.preventDefault()
                setPendingPoint({ x: 50, y: 50 })
                requestAnimationFrame(() => inlineCommentInputRef.current?.focus())
              } else if (activeTool === 'text') {
                event.preventDefault()
                setTextEditor({ point: { x: 50, y: 50 }, value: '' })
                requestAnimationFrame(() => textInputRef.current?.focus())
              }
            }}
            role={supportsCanvas ? 'application' : 'document'}
            tabIndex={0}
            aria-label={supportsCanvas ? 'Imagem em revisão. Use a barra de ferramentas para comentar ou desenhar.' : `${typeLabel} em revisão`}
            title={delivery.name}
          >
            {deliveryContent}
            {supportsCanvas && <svg className="file-review-annotation-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs><marker id="file-review-arrow-head" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,7 L6,3.5 z" fill="context-stroke" /></marker></defs>
              {visibleAnnotations.filter((annotation) => annotation.type !== 'text').map(renderAnnotation)}
              {draftAnnotation && renderAnnotation(draftAnnotation)}
            </svg>}
            {supportsCanvas && visibleAnnotations.filter((annotation): annotation is TextAnnotation => annotation.type === 'text').map(renderAnnotation)}
            {supportsCanvas && pointedComments.map((comment) => <button type="button" className={`file-review-pin${comment.resolved ? ' is-resolved' : ''}${selectedCommentId === comment.id ? ' is-selected' : ''}`} style={{ left: `${comment.point?.x}%`, top: `${comment.point?.y}%` }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectComment(comment) }} aria-label={`Comentário ${markerNumber(comment.id)}: ${comment.text}`} key={comment.id}><span>{markerNumber(comment.id)}</span></button>)}
            {supportsCanvas && pendingPoint && <span className="file-review-pin is-pending" style={{ left: `${pendingPoint.x}%`, top: `${pendingPoint.y}%` }}><span>{pointedComments.length + 1}</span></span>}

            {pendingPoint && <form className={`file-review-inline-comment${pendingPoint.x > 62 ? ' is-left' : ''}`} style={{ left: `${pendingPoint.x}%`, top: `${Math.min(78, Math.max(12, pendingPoint.y))}%` }} onPointerDown={(event) => event.stopPropagation()} onSubmit={addComment}>
              <header><strong>Comentário neste ponto</strong><button type="button" onClick={() => setPendingPoint(null)} aria-label="Cancelar comentário pontual"><X size={18} /></button></header>
              <textarea ref={inlineCommentInputRef} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="O que precisa ser ajustado aqui?" aria-label="Comentário neste ponto" />
              <footer><span>Vinculado à versão {activeVersion}</span><button type="submit" disabled={!commentDraft.trim() || commentSubmitting}>{commentSubmitting ? 'Enviando...' : 'Comentar'}</button></footer>
            </form>}

            {textEditor && <form className={`file-review-text-editor${textEditor.point.x > 72 ? ' is-left' : ''}`} style={{ left: `${textEditor.point.x}%`, top: `${textEditor.point.y}%`, color: inkColor }} onPointerDown={(event) => event.stopPropagation()} onSubmit={submitTextAnnotation}>
              <input ref={textInputRef} value={textEditor.value} onChange={(event) => setTextEditor({ ...textEditor, value: event.target.value })} placeholder="Digite a orientação" aria-label="Texto na arte" />
              <button type="submit" disabled={!textEditor.value.trim()}>Adicionar</button>
              <button type="button" onClick={() => setTextEditor(null)} aria-label="Cancelar texto"><X size={17} /></button>
            </form>}
          </div>
        </main>

        <aside className="file-review-comments" ref={commentsPanelRef}>
          <div className="file-review-filters"><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button><button type="button" className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Aberto</button><button type="button" className={filter === 'resolved' ? 'active' : ''} onClick={() => setFilter('resolved')}>Resolvido</button></div>
          <div className="file-review-comment-list">
            {reviewLoading && <p className="file-review-comments-empty">Carregando comentários...</p>}
            {!reviewLoading && visibleComments.map((comment) => {
              const annotation = comment.annotationId ? annotations.find((item) => item.id === comment.annotationId) : undefined
              const number = comment.point ? markerNumber(comment.id) : 0
              return <article id={`review-comment-${comment.id}`} className={`${comment.resolved ? 'is-resolved ' : ''}${selectedCommentId === comment.id ? 'is-selected' : ''}`} key={comment.id} onClick={() => setSelectedCommentId(comment.id)}><header><span>{number > 0 && <b className="file-review-comment-number">{number}</b>}<img src={figmaAsset('design_review.imgEllipse24')} alt="" /><strong>{comment.author}</strong></span><span><button type="button" aria-label="Mais opções do comentário"><img src={figmaAsset('design_review.imgTablerDots1')} alt="" /></button><button type="button" onClick={() => void toggleResolved(comment.id)} aria-label={comment.resolved ? 'Reabrir comentário' : 'Resolver comentário'}><img src={figmaAsset('design_review.imgGroup2')} alt="" /></button></span></header><time>{comment.time}</time>{(comment.point || annotation) && <span className="file-review-comment-kind">{comment.point ? `Marcação ${number}` : annotationLabel(annotation)}</span>}<p>{comment.text}</p><button type="button" className="file-review-reply"><img src={figmaAsset('design_review.imgMaterialSymbolsReplyRounded')} alt="" />Responder</button></article>
            })}
            {!reviewLoading && visibleComments.length === 0 && <p className="file-review-comments-empty">Nenhum comentário nesta versão.</p>}
          </div>
          <form className={`file-review-comment-form${pendingPoint ? ' is-point-pending' : ''}`} onSubmit={addComment}>
            <div><strong>{commentFormTitle}</strong>{(pendingPoint || contextAnnotation) && <button type="button" onClick={() => chooseTool('general')}>Alterar para geral</button>}</div>
            {pendingPoint ? <p>Escreva no campo que abriu ao lado do marcador na arte.</p> : <>
              <textarea ref={commentInputRef} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={contextAnnotation ? 'Descreva o ajuste relacionado à anotação...' : 'Adicionar comentário geral...'} aria-label="Novo comentário" />
              <button type="submit" disabled={!commentDraft.trim() || commentSubmitting}>{commentSubmitting ? 'Enviando...' : 'Comentar'}</button>
            </>}
          </form>
        </aside>
      </div>
      {approvalFeedbackOpen && <div className="file-review-feedback-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !approvalSubmitting) setApprovalFeedbackOpen(false) }}>
        <form className="file-review-feedback" role="dialog" aria-modal="true" aria-labelledby="approval-feedback-title" onSubmit={submitApprovalFeedback}>
          <header><div><span>Aprovar tarefa</span><h2 id="approval-feedback-title">Como você avalia esta entrega?</h2><p>Sua nota ajuda o time a entender o que funcionou e a melhorar as próximas entregas.</p></div><button type="button" disabled={approvalSubmitting} onClick={() => setApprovalFeedbackOpen(false)} aria-label="Fechar avaliação"><X size={20} /></button></header>
          <fieldset><legend>Nota da entrega <b>Obrigatório</b></legend><div className="file-review-feedback__stars" onMouseLeave={() => setHoveredRating(0)}>{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} className={rating <= (hoveredRating || approvalRating) ? 'active' : ''} onMouseEnter={() => setHoveredRating(rating)} onFocus={() => setHoveredRating(rating)} onBlur={() => setHoveredRating(0)} onClick={() => { setApprovalRating(rating); setApprovalError('') }} aria-label={`${rating} ${rating === 1 ? 'estrela' : 'estrelas'}`} aria-pressed={approvalRating === rating}><Star size={30} fill="currentColor" /></button>)}</div><p>{approvalRating ? ['', 'Muito abaixo do esperado', 'Abaixo do esperado', 'Atendeu ao esperado', 'Muito boa', 'Excelente entrega'][approvalRating] : 'Selecione de 1 a 5 estrelas'}</p></fieldset>
          <label><span>Comentário <small>Opcional</small></span><textarea value={approvalComment} maxLength={2000} onChange={(event) => setApprovalComment(event.target.value)} placeholder="Conte o que mais gostou ou o que podemos melhorar nas próximas entregas..." /><small>{approvalComment.length}/2000</small></label>
          {approvalError && <p className="file-review-feedback__error">{approvalError}</p>}
          <footer><button type="button" className="secondary-button" disabled={approvalSubmitting} onClick={() => setApprovalFeedbackOpen(false)}>Voltar</button><button type="submit" className="primary-button" disabled={!approvalRating || approvalSubmitting}>{approvalSubmitting ? 'Enviando...' : 'Aprovar e enviar avaliação'}</button></footer>
        </form>
      </div>}
    </div>
    {clonePhase && cloneRect && <div className="file-review-shared-clone" ref={cloneRef} style={{ left: cloneRect.left, top: cloneRect.top, width: cloneRect.width, height: cloneRect.height }} aria-hidden="true"><img src={delivery.thumbnailUrl || delivery.fileUrl || ''} alt="" /></div>}
    </>,
    document.body,
  )
}
