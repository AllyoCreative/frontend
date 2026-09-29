import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  AlignJustify,
  ArrowUpRight,
  Brush,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Hand,
  LockKeyhole,
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
import { PdfReviewCanvas, PdfPageThumb, type PDFDocumentProxy } from './PdfReviewCanvas'

export function parseQuotedSnippet(rawText: string): { snippet: string | null; cleanText: string } {
  if (!rawText) return { snippet: null, cleanText: '' }
  const match = rawText.match(/\[Trecho(?: selecionado)?: "(.*?)"\]\s*/s)
  if (match) {
    return {
      snippet: match[1],
      cleanText: rawText.replace(match[0], '').trim(),
    }
  }
  return { snippet: null, cleanText: rawText }
}

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
  page?: number
  point?: ReviewPoint
  annotationId?: number
}

type StrokeAnnotation = {
  id: number
  type: 'draw'
  version: number
  page?: number
  color: string
  width: number
  points: ReviewPoint[]
}

type DragAnnotation = {
  id: number
  type: 'arrow' | 'rectangle'
  version: number
  page?: number
  color: string
  width: number
  start: ReviewPoint
  end: ReviewPoint
}

type TextAnnotation = {
  id: number
  type: 'text'
  version: number
  page?: number
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
  versions?: DesignSummary[]
  approvedIds?: number[]
  isApproved?: boolean
  projectCompleted: boolean
  origin: ReviewOrigin | null
  onApprovalChange: (approved: boolean, feedback?: { rating: number; comment?: string }, targetDeliveryId?: number) => Promise<void>
  onRequestChanges?: (deliveryId: number, notes?: string) => Promise<void>
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

export function DesignReviewModal({ delivery, versions = [delivery], approvedIds, isApproved: propIsApproved, projectCompleted, origin, onApprovalChange, onRequestChanges, onClose, notify }: DesignReviewModalProps) {
  const [currentDelivery, setCurrentDelivery] = useState<DesignSummary>(delivery)

  useEffect(() => {
    setCurrentDelivery(delivery)
  }, [delivery])

  const parseVersionNum = (v?: string) => Number((v || '').replace(/\D/g, '')) || 1
  const sortedVersions = useMemo(() => {
    const list = [...versions]
    return list.sort((a, b) => parseVersionNum(b.version) - parseVersionNum(a.version) || b.id - a.id)
  }, [versions])

  const isApproved = approvedIds ? approvedIds.includes(currentDelivery.id) : (currentDelivery.id === delivery.id ? Boolean(propIsApproved) : currentDelivery.approved)

  const cleanName = (() => {
    try {
      return decodeURIComponent(currentDelivery.name)
    } catch {
      return currentDelivery.name
    }
  })()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const activeVersion = parseVersionNum(currentDelivery.version)

  const kind = contentKind(currentDelivery)
  const supportsCanvas = kind === 'image' || kind === 'pdf'
  const [hoveredCommentId, setHoveredCommentId] = useState<number | null>(null)
  const [activeTextSelection, setActiveTextSelection] = useState<{ text: string; point: ReviewPoint } | null>(null)
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null)
  const copyContainerRef = useRef<HTMLElement>(null)

  const handleCopyMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (text.length < 2) return
    try {
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      const container = copyContainerRef.current
      if (!container) return
      const cRect = container.getBoundingClientRect()
      const point = {
        x: Math.max(0, Math.min(100, ((rect.left + rect.width / 2 - cRect.left) / cRect.width) * 100)),
        y: Math.max(0, Math.min(100, ((rect.top - cRect.top) / cRect.height) * 100)),
      }
      setActiveTextSelection({ text, point })
    } catch {}
  }
  const [zoom, setZoom] = useState(supportsCanvas ? 50 : 100)
  const [pdfPage, setPdfPage] = useState(1)
  const [pdfNumPages, setPdfNumPages] = useState(1)
  const hasRail = supportsCanvas && kind === 'pdf' && pdfNumPages > 1
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const hasInitialZoomFittedRef = useRef(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [fileLoadError, setFileLoadError] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [changesConfirmOpen, setChangesConfirmOpen] = useState(false)
  const [submittingChanges, setSubmittingChanges] = useState(false)
  const [changeNotes, setChangeNotes] = useState('')
  const [changesError, setChangesError] = useState('')
  const [isAlteracao, setIsAlteracao] = useState(false)
  const [pendingPoint, setPendingPoint] = useState<ReviewPoint | null>(null)
  const [pendingAnnotationId, setPendingAnnotationId] = useState<number | null>(null)
  const [activeTool, setActiveTool] = useState<ReviewTool>(supportsCanvas ? (projectCompleted ? 'pan' : 'point') : 'general')
  const [brushOpen, setBrushOpen] = useState(false)
  const [inkColor, setInkColor] = useState('#5d55c7')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [draftAnnotation, setDraftAnnotation] = useState<DraftAnnotation | null>(null)
  const [textEditor, setTextEditor] = useState<{ point: ReviewPoint; value: string } | null>(null)
  const [annotationHistory, dispatchAnnotation] = useReducer(annotationReducer, { snapshots: [[]], index: 0 })
  useEffect(() => {
    setPdfPage(1)
    setPdfNumPages(1)
    setPdfDoc(null)
    hasInitialZoomFittedRef.current = false
  }, [currentDelivery.id])

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
  const effectiveTool: ReviewTool = projectCompleted && supportsCanvas ? 'pan' : activeTool
  const artStageRef = useRef<HTMLElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const inlineCommentInputRef = useRef<HTMLTextAreaElement>(null)
  const commentsPanelRef = useRef<HTMLElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const panStartRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null)

  const annotations = annotationHistory.snapshots[annotationHistory.index]
  const visibleAnnotations = useMemo(() => annotations.filter((annotation) => {
    if (annotation.version !== activeVersion) return false
    if (kind === 'pdf' && annotation.page && annotation.page !== pdfPage) return false
    return true
  }), [activeVersion, annotations, kind, pdfPage])
  const visibleComments = useMemo(() => comments.filter((comment) => {
    if (comment.version !== activeVersion) return false
    if (filter === 'open') return !comment.resolved
    if (filter === 'resolved') return comment.resolved
    return true
  }), [activeVersion, comments, filter])
  const totalFeedbackCount = useMemo(() => {
    const versionCommentsCount = comments.filter((c) => c.version === activeVersion).length
    const versionAnnotationsCount = annotations.filter((a) => a.version === activeVersion).length
    return versionCommentsCount + versionAnnotationsCount
  }, [comments, annotations, activeVersion])

  const allVersionPointedComments = useMemo(() => comments
    .filter((comment) => comment.version === activeVersion && comment.point)
    .sort((left, right) => left.id - right.id), [activeVersion, comments])

  const pointedComments = useMemo(() => comments
    .filter((comment) => {
      if (comment.version !== activeVersion || !comment.point) return false
      if (kind === 'pdf' && comment.page && comment.page !== pdfPage) return false
      return true
    })
    .sort((left, right) => left.id - right.id), [activeVersion, comments, kind, pdfPage])

  const markerNumber = (commentId: number) => {
    const idx = allVersionPointedComments.findIndex((comment) => comment.id === commentId)
    return idx >= 0 ? idx + 1 : 0
  }

  const selectComment = (comment: ReviewComment) => {
    if (kind === 'pdf' && comment.page && comment.page !== pdfPage) {
      setPdfPage(comment.page)
    }
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
    api.getDesignReview(currentDelivery.id).then((review) => {
      if (!active) return
      const mappedComments = ((review.comments as any[]) || []).map((comm) => ({
        ...comm,
        page: comm.page ?? comm.payload?.page ?? 1,
      }))
      const mappedAnnotations = ((review.annotations as any[]) || []).map((ann) => ({
        ...ann,
        page: ann.page ?? ann.payload?.page ?? 1,
      }))
      setComments(mappedComments as ReviewComment[])
      dispatchAnnotation({ type: 'replace', annotations: mappedAnnotations as ReviewAnnotation[] })
    }).catch((error: unknown) => {
      if (active) notify(error instanceof Error ? error.message : 'Não foi possível carregar os comentários')
    }).finally(() => {
      if (active) setReviewLoading(false)
    })
    return () => { active = false }
  }, [currentDelivery.id, notify])

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

  const submitChangesRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submittingChanges || projectCompleted) return
    setSubmittingChanges(true)
    setChangesError('')
    try {
      if (onRequestChanges) {
        await onRequestChanges(currentDelivery.id, changeNotes.trim() || undefined)
      } else {
        await api.requestChanges(currentDelivery.id, { notes: changeNotes.trim() || undefined })
      }
      setIsAlteracao(true)
      setChangesConfirmOpen(false)
      setChangeNotes('')
      notify(`Anotações enviadas com sucesso! A tarefa mudou para o status "Alteração" e avançou para a Versão ${activeVersion + 1}.`)
    } catch (err: unknown) {
      setChangesError(err instanceof Error ? err.message : 'Falha ao solicitar alterações')
    } finally {
      setSubmittingChanges(false)
    }
  }

  const revokeApproval = async () => {
    if (projectCompleted) {
      notify('O projeto foi concluído e não pode mais ser reaberto para alterações')
      return
    }
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
    if (projectCompleted && tool !== 'pan') return
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

    if (effectiveTool === 'general') return
    if (effectiveTool === 'point') {
      setPendingAnnotationId(null)
      setPendingPoint(point)
      requestAnimationFrame(() => inlineCommentInputRef.current?.focus())
      return
    }
    if (effectiveTool === 'text') {
      setPendingPoint(null)
      setPendingAnnotationId(null)
      setTextEditor({ point, value: '' })
      requestAnimationFrame(() => textInputRef.current?.focus())
      return
    }
    if (effectiveTool === 'pan') {
      const stage = artStageRef.current
      if (!stage) return
      event.currentTarget.setPointerCapture(event.pointerId)
      panStartRef.current = { clientX: event.clientX, clientY: event.clientY, scrollLeft: stage.scrollLeft, scrollTop: stage.scrollTop }
      setIsPanning(true)
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const base = { id: Date.now(), version: activeVersion, page: kind === 'pdf' ? pdfPage : 1, color: inkColor, width: strokeWidth }
    if (effectiveTool === 'draw') setDraftAnnotation({ ...base, type: 'draw', points: [point] })
    else setDraftAnnotation({ ...base, type: effectiveTool, start: point, end: point })
  }

  const continueArtInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panStartRef.current && effectiveTool === 'pan') {
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
    const page = annotation.page ?? (kind === 'pdf' ? pdfPage : 1)
    if (annotation.type === 'draw') return { points: annotation.points, page }
    if (annotation.type === 'text') return { point: annotation.point, text: annotation.text, page }
    return { start: annotation.start, end: annotation.end, page }
  }

  const persistAnnotation = async (annotation: ReviewAnnotation | DraftAnnotation) => {
    if (projectCompleted) return
    try {
      const saved = await api.addAnnotation(currentDelivery.id, {
        type: annotation.type,
        version: annotation.version,
        page: annotation.page ?? (kind === 'pdf' ? pdfPage : 1),
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
      page: kind === 'pdf' ? pdfPage : 1,
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
    if (projectCompleted) {
      notify('A revisão foi encerrada porque todas as tarefas do projeto foram concluídas')
      return
    }
    if (!commentDraft.trim() || commentSubmitting) return
    setCommentSubmitting(true)
    const fullText = selectedSnippet
      ? `[Trecho selecionado: "${selectedSnippet}"]\n${commentDraft.trim()}`
      : commentDraft.trim()

    try {
      const created = await api.addComment(currentDelivery.id, {
        text: fullText,
        version: activeVersion,
        page: kind === 'pdf' ? pdfPage : 1,
        point: pendingPoint ?? undefined,
        annotationId: pendingAnnotationId ?? undefined,
      })
      const withPage: ReviewComment = {
        ...(created as ReviewComment),
        page: (created as any)?.page ?? (kind === 'pdf' ? pdfPage : 1),
      }
      setComments((current) => [...current, withPage])
      setSelectedCommentId(created.id)
      setCommentDraft('')
      setSelectedSnippet(null)
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
    if (projectCompleted) return
    const comment = comments.find((item) => item.id === id)
    if (!comment) return
    try {
      const updated = await api.setCommentResolved(currentDelivery.id, id, !comment.resolved)
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

  const fileUrl = currentDelivery.fileUrl || currentDelivery.thumbnailUrl || null
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
    <img src={fileUrl} onLoad={loadImageDimensions} onError={() => setFileLoadError(true)} alt={cleanName} />
  ) : kind === 'image' ? (
    <div className="file-review-file-fallback"><FileText size={54} /><h2>Não foi possível carregar a imagem</h2><p>O link pode ter expirado. Feche e abra novamente; se continuar, peça um novo envio ao time.</p>{fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer"><Download size={17} /> Abrir arquivo original</a>}</div>
  ) : kind === 'pdf' && fileUrl ? (
    <PdfReviewCanvas
      url={fileUrl}
      altName={cleanName}
      currentPage={pdfPage}
      zoom={zoom}
      onDimensions={({ width, height }) => {
        setCanvasSize({ width, height })
        if (!hasInitialZoomFittedRef.current) {
          const stage = artStageRef.current
          if (stage && stage.clientWidth > 0 && stage.clientHeight > 0) {
            const availableW = Math.max(120, stage.clientWidth - 56)
            const availableH = Math.max(120, stage.clientHeight - 86)
            const fittedZoom = Math.min(100, (availableW / width) * 100, (availableH / height) * 100)
            setZoom(Math.max(10, Math.floor(fittedZoom)))
            hasInitialZoomFittedRef.current = true
          }
        }
      }}
      onNumPages={(num) => {
        setPdfNumPages(num)
      }}
      onDocLoaded={setPdfDoc}
      onTextSelect={(sel) => {
        if (sel) {
          setActiveTextSelection({ text: sel.text, point: sel.point })
        } else {
          setActiveTextSelection(null)
        }
      }}
    />
  ) : kind === 'video' && fileUrl ? (
    <video className="file-review-video" src={fileUrl} controls playsInline aria-label={cleanName} />
  ) : kind === 'copy' ? (
    <article
      ref={copyContainerRef}
      onMouseUp={handleCopyMouseUp}
      className="file-review-copy"
      style={{ position: 'relative', userSelect: 'text' }}
    >
      <span>Texto para aprovação</span>
      <h1>{cleanName}</h1>
      <div style={{ userSelect: 'text' }}>{currentDelivery.textContent || 'O conteúdo desta entrega ainda não foi informado.'}</div>

      {activeTextSelection && (
        <div
          className="file-review-selection-pill"
          style={{ left: `${activeTextSelection.point.x}%`, top: `${activeTextSelection.point.y}%` }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedSnippet(activeTextSelection.text)
              setPendingPoint(activeTextSelection.point)
              setActiveTextSelection(null)
              setCommentDraft('')
              requestAnimationFrame(() => inlineCommentInputRef.current?.focus())
            }}
          >
            <MessageSquare size={13} />
            Comentar este trecho
          </button>
        </div>
      )}

      {pointedComments.map((comment) => (
        <button
          key={comment.id}
          type="button"
          className={`file-review-pin${comment.resolved ? ' is-resolved' : ''}${selectedCommentId === comment.id ? ' is-selected' : ''}${hoveredCommentId === comment.id ? ' is-hovered' : ''}`}
          style={{ left: `${comment.point?.x}%`, top: `${comment.point?.y}%` }}
          onClick={(event) => { event.stopPropagation(); selectComment(comment) }}
          onMouseEnter={() => {
            setHoveredCommentId(comment.id)
            const el = document.getElementById(`review-comment-${comment.id}`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }}
          onMouseLeave={() => setHoveredCommentId(null)}
          aria-label={`Comentário ${markerNumber(comment.id)}: ${comment.text}`}
        >
          <span>{markerNumber(comment.id)}</span>
        </button>
      ))}
    </article>
  ) : (
    <div className="file-review-file-fallback"><FileText size={54} /><h2>{cleanName}</h2><p>Este formato não possui visualização no navegador.</p>{fileUrl && <a href={fileUrl} target="_blank" rel="noreferrer"><Download size={17} /> Baixar arquivo para revisar</a>}</div>
  )

  return createPortal(
    <>
    <div className={`file-review-modal file-review-modal--${kind}${closing ? ' file-review-modal--closing' : ''}`} role="dialog" aria-modal="true" aria-label="Revisão de entrega">
      <div className="file-review-shell">
        <header className="file-review-topbar">
          <div className="file-review-topline">
            <div className="file-review-breadcrumbs">
              <button type="button">Chat</button><button type="button">Entregas</button><i />
              <strong title={cleanName}>{cleanName}</strong>
              <span className="file-review-kind">{typeLabel}</span>
              <span className={`file-review-status${isApproved ? ' is-approved' : isAlteracao ? ' is-alteracao' : ''}`}>{isApproved ? 'Aprovado' : isAlteracao ? 'Em alteração' : 'Aguardando aprovação'}</span><i />
              {projectCompleted ? (
                <button type="button" className="file-review-change is-closed" disabled><LockKeyhole size={16} />Alterações encerradas</button>
              ) : (
                <button
                  type="button"
                  className="file-review-change"
                  onClick={() => {
                    chooseTool('point')
                    notify('Modo de anotação ativado. Clique em qualquer local da arte para adicionar seu apontamento.')
                  }}
                  title="Apontar ajustes e anotações na arte"
                >
                  <img src={figmaAsset('design_review.imgGardenReloadFill16')} alt="" />
                  Solicitar alterações
                </button>
              )}
              <button type="button" className="file-review-approve" disabled={approvalSubmitting || projectCompleted} onClick={() => { if (isApproved) void revokeApproval(); else setApprovalFeedbackOpen(true) }}><img src={figmaAsset('design_review.imgGroup')} alt="" />{isApproved ? 'Aprovado' : projectCompleted ? 'Revisão encerrada' : 'Marcar como aprovado'}</button>
            </div>
            <div className="file-review-topline-actions">
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={cleanName}
                  target="_blank"
                  rel="noreferrer"
                  className="file-review-topline-download"
                  title="Baixar arquivo original"
                >
                  <Download size={15} />
                  <span>Baixar</span>
                </a>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="file-review-topline-close"
                aria-label="Fechar revisão"
                title="Fechar revisão (Esc)"
              >
                <X size={19} />
              </button>
            </div>
          </div>
          <div className="file-review-controls">
            <div className="file-review-left-controls">
              {hasRail && (
                <button
                  type="button"
                  className={railVisible ? 'active' : ''}
                  onClick={() => setRailVisible((value) => !value)}
                  aria-label="Alternar miniatura"
                  title="Miniatura"
                >
                  <img src={figmaAsset('design_review.imgPhSidebarBold')} alt="" />
                </button>
              )}
              <button
                type="button"
                className={effectiveTool === 'pan' ? 'active' : ''}
                onClick={() => chooseTool('pan')}
                aria-pressed={effectiveTool === 'pan'}
                aria-label="Mover arquivo"
                title="Mover arquivo (Pan)"
              >
                <Hand size={18} />
              </button>
              <label className="file-review-select file-review-zoom">
                <select
                  value={zoom}
                  onChange={(event) => {
                    const val = event.target.value
                    if (val === 'fit') {
                      const stage = artStageRef.current
                      if (stage && canvasSize.width && canvasSize.height) {
                        const availableW = Math.max(120, stage.clientWidth - 56)
                        const availableH = Math.max(120, stage.clientHeight - 86)
                        const fittedZoom = Math.min(100, (availableW / canvasSize.width) * 100, (availableH / canvasSize.height) * 100)
                        setZoom(Math.max(10, Math.floor(fittedZoom)))
                      }
                    } else {
                      setZoom(Number(val))
                    }
                  }}
                  aria-label="Zoom"
                >
                  <option value="fit">Ajustar à tela</option>
                  {![25, 50, 75, 100, 125, 150, 200].includes(zoom) && <option value={zoom}>{zoom}%</option>}
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="75">75%</option>
                  <option value="100">100%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                  <option value="200">200%</option>
                </select>
              </label>

              {kind === 'pdf' && pdfNumPages > 1 && (
                <div className="file-review-pdf-page-controls">
                  <button
                    type="button"
                    disabled={pdfPage <= 1}
                    onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                    title="Página anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="file-review-pdf-page-label">
                    Pág. <b>{pdfPage}</b> / {pdfNumPages}
                  </span>
                  <button
                    type="button"
                    disabled={pdfPage >= pdfNumPages}
                    onClick={() => setPdfPage((p) => Math.min(pdfNumPages, p + 1))}
                    aria-label="Próxima página"
                    title="Próxima página"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <i className="file-review-divider" />

              {sortedVersions.length > 1 ? (
                <label className="file-review-select file-review-version">
                  <select
                    value={currentDelivery.id}
                    onChange={(e) => {
                      const next = sortedVersions.find((item) => item.id === Number(e.target.value))
                      if (next) setCurrentDelivery(next)
                    }}
                    aria-label="Versão do material"
                  >
                    {sortedVersions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.version || `Versão ${parseVersionNum(item.version)}`}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="file-review-current-version">{currentDelivery.version || `Versão ${activeVersion}`}</span>
              )}

              <i className="file-review-divider" />

              {/* ANNOTATION TOOLBAR DIRECTLY NEXT TO VERSION */}
              {projectCompleted ? (
                <div className="file-review-review-closed" role="status"><LockKeyhole size={16} /> Revisão encerrada</div>
              ) : supportsCanvas ? (
                <div className={`file-review-annotation-toolbar${brushOpen ? ' is-expanded' : ''}`} role="toolbar" aria-label="Ferramentas de anotação">
                  <div className="file-review-primary-tools">
                    <button type="button" className={activeTool === 'point' ? 'active' : ''} onClick={() => chooseTool('point')} aria-pressed={activeTool === 'point'} aria-label="Comentário pontual" title="Comentário pontual: clique na arte">
                      <span className="file-review-point-tool"><MessageSquare size={19} /><MousePointer2 size={11} /></span>
                    </button>
                    <button type="button" className={activeTool === 'general' ? 'active' : ''} onClick={() => chooseTool('general')} aria-pressed={activeTool === 'general'} aria-label="Comentário geral" title="Comentário geral"><MessageSquareText size={19} /></button>
                    <button type="button" className={brushOpen ? 'active' : ''} onClick={toggleBrushTools} aria-expanded={brushOpen} aria-label="Ferramentas de marcação" title="Desenhar e marcar"><Brush size={19} /></button>
                  </div>

                  {brushOpen && (
                    <div className="file-review-brush-options" aria-label="Opções do pincel">
                      <div className="file-review-color-options" role="group" aria-label="Cor da anotação">
                        {annotationColors.map((color) => <button type="button" className={inkColor === color ? 'active' : ''} style={{ '--annotation-color': color } as CSSProperties} onClick={() => setInkColor(color)} aria-label={`Usar cor ${color}`} aria-pressed={inkColor === color} key={color}><i /></button>)}
                      </div>
                      <i />
                      <button type="button" className="file-review-stroke" onClick={cycleStrokeWidth} aria-label={`Espessura ${strokeWidth} pixels`} title="Alterar espessura"><AlignJustify size={18} /><small>{strokeWidth}</small></button>
                      <button type="button" className={activeTool === 'draw' ? 'active' : ''} onClick={() => chooseTool('draw')} aria-pressed={activeTool === 'draw'} aria-label="Desenho livre" title="Desenho livre"><Brush size={18} /></button>
                      <button type="button" className={activeTool === 'text' ? 'active' : ''} onClick={() => chooseTool('text')} aria-pressed={activeTool === 'text'} aria-label="Adicionar texto" title="Adicionar texto"><Type size={18} /></button>
                      <button type="button" className={activeTool === 'rectangle' ? 'active' : ''} onClick={() => chooseTool('rectangle')} aria-pressed={activeTool === 'rectangle'} aria-label="Destacar área" title="Destacar área"><Square size={18} /></button>
                      <button type="button" className={activeTool === 'arrow' ? 'active' : ''} onClick={() => chooseTool('arrow')} aria-pressed={activeTool === 'arrow'} aria-label="Adicionar seta" title="Adicionar seta"><ArrowUpRight size={19} /></button>
                      <i />
                      <button type="button" onClick={() => dispatchAnnotation({ type: 'undo' })} disabled={annotationHistory.index === 0} aria-label="Desfazer anotação" title="Desfazer"><Undo2 size={18} /></button>
                      <button type="button" onClick={() => dispatchAnnotation({ type: 'redo' })} disabled={annotationHistory.index === annotationHistory.snapshots.length - 1} aria-label="Refazer anotação" title="Refazer"><Redo2 size={18} /></button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="file-review-delivery-actions">
                  <button type="button" className="file-review-general-comment" onClick={() => chooseTool('general')}>
                    <MessageSquareText size={16} /> Comentar entrega
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {hasRail && (
          <aside className={`file-review-rail${railVisible ? '' : ' is-hidden'}`} aria-label="Navegação de páginas">
            <div className="file-review-rail-list">
              {Array.from({ length: pdfNumPages }, (_, i) => i + 1).map((pageNum) => {
                const isSelected = pageNum === pdfPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`file-review-rail-page ${isSelected ? 'active' : ''}`}
                    onClick={() => setPdfPage(pageNum)}
                    title={`Página ${pageNum}`}
                  >
                    <PdfPageThumb pdfDoc={pdfDoc} pageNum={pageNum} />
                    <span>
                      <b>{pageNum}</b>
                      <small>{isSelected ? 'Atual' : `Pág. ${pageNum}`}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        <main ref={artStageRef} className={`file-review-art-stage${hasRail && railVisible ? '' : ' is-expanded'} is-${effectiveTool}${isPanning ? ' is-panning' : ''}`}>
          <div
            className={`file-review-art file-review-art--v${activeVersion}${artReady ? ' is-ready' : ' is-transitioning'}`}
            ref={artRef}
            style={{ width: canvasSize.width * zoom / 100, height: canvasSize.height * zoom / 100 }}
            onPointerDown={supportsCanvas ? beginArtInteraction : undefined}
            onPointerMove={supportsCanvas ? continueArtInteraction : undefined}
            onPointerUp={supportsCanvas ? finishArtInteraction : undefined}
            onPointerCancel={supportsCanvas ? finishArtInteraction : undefined}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return
              if (event.key !== 'Enter') return
              if (effectiveTool === 'point') {
                event.preventDefault()
                setPendingPoint({ x: 50, y: 50 })
                requestAnimationFrame(() => inlineCommentInputRef.current?.focus())
              } else if (effectiveTool === 'text') {
                event.preventDefault()
                setTextEditor({ point: { x: 50, y: 50 }, value: '' })
                requestAnimationFrame(() => textInputRef.current?.focus())
              }
            }}
            role={supportsCanvas ? 'application' : 'document'}
            tabIndex={0}
            aria-label={supportsCanvas ? 'Imagem em revisão. Use a barra de ferramentas para comentar ou desenhar.' : `${typeLabel} em revisão`}
            title={currentDelivery.name}
          >
            {deliveryContent}
            {supportsCanvas && <svg className="file-review-annotation-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs><marker id="file-review-arrow-head" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,7 L6,3.5 z" fill="context-stroke" /></marker></defs>
              {visibleAnnotations.filter((annotation) => annotation.type !== 'text').map(renderAnnotation)}
              {draftAnnotation && renderAnnotation(draftAnnotation)}
            </svg>}
            {supportsCanvas && visibleAnnotations.filter((annotation): annotation is TextAnnotation => annotation.type === 'text').map(renderAnnotation)}
            {supportsCanvas && pointedComments.map((comment) => (
              <button
                type="button"
                className={`file-review-pin${comment.resolved ? ' is-resolved' : ''}${selectedCommentId === comment.id ? ' is-selected' : ''}${hoveredCommentId === comment.id ? ' is-hovered' : ''}`}
                style={{ left: `${comment.point?.x}%`, top: `${comment.point?.y}%` }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => { event.stopPropagation(); selectComment(comment) }}
                onMouseEnter={() => {
                  setHoveredCommentId(comment.id)
                  const el = document.getElementById(`review-comment-${comment.id}`)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }}
                onMouseLeave={() => setHoveredCommentId(null)}
                aria-label={`Comentário ${markerNumber(comment.id)}: ${comment.text}`}
                key={comment.id}
              >
                <span>{markerNumber(comment.id)}</span>
              </button>
            ))}
            {supportsCanvas && activeTextSelection && (
              <div
                className="file-review-selection-pill"
                style={{ left: `${activeTextSelection.point.x}%`, top: `${activeTextSelection.point.y}%` }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedSnippet(activeTextSelection.text)
                    setPendingPoint(activeTextSelection.point)
                    setActiveTextSelection(null)
                    setCommentDraft('')
                    requestAnimationFrame(() => inlineCommentInputRef.current?.focus())
                  }}
                >
                  <MessageSquare size={13} />
                  Comentar este trecho
                </button>
              </div>
            )}
            {supportsCanvas && !projectCompleted && pendingPoint && <span className="file-review-pin is-pending" style={{ left: `${pendingPoint.x}%`, top: `${pendingPoint.y}%` }}><span>{allVersionPointedComments.length + 1}</span></span>}

            {!projectCompleted && pendingPoint && <form className={`file-review-inline-comment${pendingPoint.x > 62 ? ' is-left' : ''}`} style={{ left: `${pendingPoint.x}%`, top: `${Math.min(78, Math.max(12, pendingPoint.y))}%` }} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onSubmit={addComment}>
              <header><strong>Comentário neste ponto</strong><button type="button" onClick={() => { setPendingPoint(null); setSelectedSnippet(null); }} aria-label="Cancelar comentário pontual"><X size={18} /></button></header>
              {selectedSnippet && (
                <div className="file-review-comment-snippet-badge">
                  <span><strong>Trecho:</strong> "{selectedSnippet}"</span>
                  <button type="button" onClick={() => setSelectedSnippet(null)} title="Remover trecho"><X size={12} /></button>
                </div>
              )}
              <textarea ref={inlineCommentInputRef} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={selectedSnippet ? "O que ajustar neste trecho?" : "O que precisa ser ajustado aqui?"} aria-label="Comentário neste ponto" />
              <footer><span>Vinculado à versão {activeVersion}</span><button type="submit" disabled={!commentDraft.trim() || commentSubmitting}>{commentSubmitting ? 'Enviando...' : 'Comentar'}</button></footer>
            </form>}

            {!projectCompleted && textEditor && <form className={`file-review-text-editor${textEditor.point.x > 72 ? ' is-left' : ''}`} style={{ left: `${textEditor.point.x}%`, top: `${textEditor.point.y}%`, color: inkColor }} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onSubmit={submitTextAnnotation}>
              <input ref={textInputRef} value={textEditor.value} onChange={(event) => setTextEditor({ ...textEditor, value: event.target.value })} placeholder="Digite a orientação" aria-label="Texto na arte" />
              <button type="submit" disabled={!textEditor.value.trim()}>Adicionar</button>
              <button type="button" onClick={() => setTextEditor(null)} aria-label="Cancelar texto"><X size={17} /></button>
            </form>}
          </div>

          {!projectCompleted && !isApproved && totalFeedbackCount > 0 && (
            <div className="file-review-floating-pill">
              <span className="file-review-floating-pill-dot" />
              <span className="file-review-floating-pill-text">
                <b>{totalFeedbackCount}</b> {totalFeedbackCount === 1 ? 'anotação feita' : 'anotações feitas'}
              </span>
              <button
                type="button"
                className="file-review-floating-submit-btn"
                onClick={() => setChangesConfirmOpen(true)}
              >
                <img src={figmaAsset('design_review.imgGardenReloadFill16')} alt="" />
                <span>Enviar para alteração</span>
              </button>
            </div>
          )}
        </main>

        <aside className="file-review-comments" ref={commentsPanelRef}>
          <div className="file-review-filters"><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button><button type="button" className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Aberto</button><button type="button" className={filter === 'resolved' ? 'active' : ''} onClick={() => setFilter('resolved')}>Resolvido</button></div>
          <div className="file-review-comment-list">
            {reviewLoading && <p className="file-review-comments-empty">Carregando comentários...</p>}
            {!reviewLoading && visibleComments.map((comment) => {
              const annotation = comment.annotationId ? annotations.find((item) => item.id === comment.annotationId) : undefined
              const number = comment.point ? markerNumber(comment.id) : 0
              const parsed = parseQuotedSnippet(comment.text)
              const isHovered = hoveredCommentId === comment.id
              return (
                <article
                  id={`review-comment-${comment.id}`}
                  className={`${comment.resolved ? 'is-resolved ' : ''}${selectedCommentId === comment.id ? 'is-selected ' : ''}${isHovered ? 'is-hovered' : ''}`}
                  key={comment.id}
                  onClick={() => selectComment(comment)}
                  onMouseEnter={() => setHoveredCommentId(comment.id)}
                  onMouseLeave={() => setHoveredCommentId(null)}
                >
                  <header>
                    <span>
                      {number > 0 && <b className="file-review-comment-number">{number}</b>}
                      <img src={figmaAsset('design_review.imgEllipse24')} alt="" />
                      <strong>{comment.author}</strong>
                    </span>
                    {!projectCompleted && (
                      <span>
                        <button type="button" aria-label="Mais opções do comentário"><img src={figmaAsset('design_review.imgTablerDots1')} alt="" /></button>
                        <button type="button" onClick={() => void toggleResolved(comment.id)} aria-label={comment.resolved ? 'Reabrir comentário' : 'Resolver comentário'}><img src={figmaAsset('design_review.imgGroup2')} alt="" /></button>
                      </span>
                    )}
                  </header>
                  <time>{comment.time}</time>
                  {(comment.point || annotation || (kind === 'pdf' && comment.page)) && (
                    <span className="file-review-comment-kind">
                      {comment.point
                        ? `Marcação ${number}${kind === 'pdf' && comment.page ? ` · Pág. ${comment.page}` : ''}`
                        : annotation
                        ? `${annotationLabel(annotation)}${kind === 'pdf' && (comment.page || annotation?.page) ? ` · Pág. ${comment.page || annotation?.page}` : ''}`
                        : `Pág. ${comment.page}`}
                    </span>
                  )}
                  {parsed.snippet && (
                    <div className="file-review-comment-snippet">
                      <span>“{parsed.snippet}”</span>
                    </div>
                  )}
                  <p>{parsed.cleanText}</p>
                  {!projectCompleted && <button type="button" className="file-review-reply"><img src={figmaAsset('design_review.imgMaterialSymbolsReplyRounded')} alt="" />Responder</button>}
                </article>
              )
            })}
            {!reviewLoading && visibleComments.length === 0 && <p className="file-review-comments-empty">Nenhum comentário nesta versão.</p>}
          </div>
          {!projectCompleted && !isApproved && (
            <div className="file-review-sidebar-submit-card">
              <div className="file-review-sidebar-submit-header">
                <span className="file-review-submit-count">
                  {totalFeedbackCount} {totalFeedbackCount === 1 ? 'anotação feita' : 'anotações feitas'}
                </span>
                <span className="file-review-submit-tag">Versão {activeVersion}</span>
              </div>
              <button
                type="button"
                className="file-review-submit-changes-btn"
                disabled={submittingChanges || totalFeedbackCount === 0}
                onClick={() => setChangesConfirmOpen(true)}
                title={totalFeedbackCount === 0 ? 'Adicione anotações na arte antes de enviar' : 'Enviar anotações ao time criativo'}
              >
                <img src={figmaAsset('design_review.imgGardenReloadFill16')} alt="" />
                <span>Enviar anotações para alteração</span>
              </button>
            </div>
          )}
          {projectCompleted ? <div className="file-review-comment-closed"><LockKeyhole size={18} /><div><strong>Revisão encerrada</strong><span>Todas as tarefas do projeto foram concluídas.</span></div></div> : <form className={`file-review-comment-form${pendingPoint ? ' is-point-pending' : ''}`} onSubmit={addComment}>
            <div><strong>{commentFormTitle}</strong>{(pendingPoint || contextAnnotation) && <button type="button" onClick={() => chooseTool('general')}>Alterar para geral</button>}</div>
            {pendingPoint ? <p>Escreva no campo que abriu ao lado do marcador na arte.</p> : <>
              {selectedSnippet && (
                <div className="file-review-comment-snippet-badge">
                  <span><strong>Trecho:</strong> "{selectedSnippet}"</span>
                  <button type="button" onClick={() => setSelectedSnippet(null)} title="Remover trecho"><X size={12} /></button>
                </div>
              )}
              <textarea ref={commentInputRef} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={selectedSnippet ? "O que ajustar no trecho selecionado..." : contextAnnotation ? 'Descreva o ajuste relacionado à anotação...' : 'Adicionar comentário geral...'} aria-label="Novo comentário" />
              <button type="submit" disabled={!commentDraft.trim() || commentSubmitting}>{commentSubmitting ? 'Enviando...' : 'Comentar'}</button>
            </>}
          </form>}
        </aside>
      </div>
      {changesConfirmOpen && (
        <div className="file-review-feedback-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submittingChanges) setChangesConfirmOpen(false) }}>
          <form className="file-review-feedback" role="dialog" aria-modal="true" aria-labelledby="changes-feedback-title" onSubmit={submitChangesRequest}>
            <header>
              <div>
                <span style={{ color: '#d9651a' }}>Solicitar alterações</span>
                <h2 id="changes-feedback-title">Enviar anotações para o criativo?</h2>
                <p>
                  {visibleComments.length + visibleAnnotations.length > 0
                    ? `Você fez ${visibleComments.length + visibleAnnotations.length} apontamentos nesta versão (${currentDelivery.version || `Versão ${activeVersion}`}).`
                    : `Solicitar revisão para a entrega atual (${currentDelivery.version || `Versão ${activeVersion}`}).`}
                </p>
              </div>
              <button type="button" disabled={submittingChanges} onClick={() => setChangesConfirmOpen(false)} aria-label="Fechar"><X size={20} /></button>
            </header>

            <div style={{ background: '#fff9f5', border: '1px solid #ffd6b3', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#993f10', lineHeight: '18px' }}>
              <strong>O que acontecerá:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>A tarefa mudará para o status <b>Alteração</b>.</li>
                <li>Subirá automaticamente uma nova versão sem limite (<b>Versão {activeVersion + 1}</b>).</li>
                <li>O time criativo receberá suas anotações para ajustar os materiais.</li>
              </ul>
            </div>

            <label>
              <span>Instruções adicionais ou resumo dos ajustes <small>Opcional</small></span>
              <textarea
                value={changeNotes}
                maxLength={2000}
                onChange={(event) => setChangeNotes(event.target.value)}
                placeholder="Conte detalhadamente o que precisa ser ajustado..."
              />
              <small>{changeNotes.length}/2000</small>
            </label>

            {changesError && <p className="file-review-feedback__error">{changesError}</p>}

            <footer>
              <button type="button" className="secondary-button" disabled={submittingChanges} onClick={() => setChangesConfirmOpen(false)}>
                Continuar revisando
              </button>
              <button type="submit" className="primary-button" style={{ background: '#ff7a45', borderColor: '#ff7a45' }} disabled={submittingChanges}>
                {submittingChanges ? 'Enviando anotações...' : 'Confirmar e enviar alterações'}
              </button>
            </footer>
          </form>
        </div>
      )}
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
    {clonePhase && cloneRect && <div className="file-review-shared-clone" ref={cloneRef} style={{ left: cloneRect.left, top: cloneRect.top, width: cloneRect.width, height: cloneRect.height }} aria-hidden="true"><img src={currentDelivery.thumbnailUrl || currentDelivery.fileUrl || ''} alt="" /></div>}
    </>,
    document.body,
  )
}
