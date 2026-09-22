import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  AlignJustify,
  ArrowUpRight,
  Brush,
  Hand,
  MessageSquare,
  MessageSquareText,
  MousePointer2,
  Redo2,
  Square,
  Type,
  Undo2,
  X,
} from 'lucide-react'
import { figmaAsset } from '../assets/figma'

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
  | { type: 'undo' }
  | { type: 'redo' }

type DesignReviewModalProps = {
  designTitle: string
  initialVersion: number
  isApproved: boolean
  origin: ReviewOrigin | null
  onApprovalChange: (approved: boolean) => void
  onClose: () => void
  notify: (message: string) => void
}

const ART_WIDTH = 1468
const ART_HEIGHT = 920
const annotationColors = ['#5d55c7', '#f2c94c', '#22a977', '#ef6a5b'] as const

const initialComments: ReviewComment[] = [
  { id: 1, author: 'Levy Câmara', text: 'Ficou ótimo!', time: 'Hoje 16:34', resolved: false, version: 3, point: { x: 88, y: 20 } },
  { id: 2, author: 'Levy Câmara', text: 'Ficou ótimo!', time: 'Hoje 16:34', resolved: false, version: 3 },
  { id: 3, author: 'Levy Câmara', text: 'Ficou ótimo!', time: 'Hoje 16:34', resolved: false, version: 3 },
]

function loadStoredReview(designTitle: string): { comments: ReviewComment[]; annotations: ReviewAnnotation[] } {
  try {
    const raw = window.localStorage.getItem(`allyo-review:${designTitle}`)
    if (!raw) return { comments: initialComments, annotations: [] }
    const parsed = JSON.parse(raw) as { comments?: ReviewComment[]; annotations?: ReviewAnnotation[] }
    return {
      comments: Array.isArray(parsed.comments) ? parsed.comments : initialComments,
      annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
    }
  } catch {
    return { comments: initialComments, annotations: [] }
  }
}

function annotationReducer(state: AnnotationHistory, action: AnnotationAction): AnnotationHistory {
  if (action.type === 'undo') return state.index > 0 ? { ...state, index: state.index - 1 } : state
  if (action.type === 'redo') return state.index < state.snapshots.length - 1 ? { ...state, index: state.index + 1 } : state

  const current = state.snapshots[state.index]
  const snapshots = [...state.snapshots.slice(0, state.index + 1), [...current, action.annotation]]
  return { snapshots, index: snapshots.length - 1 }
}

function toSvgPoint(point: ReviewPoint) {
  return { x: point.x * ART_WIDTH / 100, y: point.y * ART_HEIGHT / 100 }
}

function annotationLabel(annotation?: ReviewAnnotation) {
  if (!annotation) return 'Anotação'
  if (annotation.type === 'draw') return 'Desenho livre'
  if (annotation.type === 'arrow') return 'Seta'
  if (annotation.type === 'rectangle') return 'Área destacada'
  return 'Texto na arte'
}

export function DesignReviewModal({ designTitle, initialVersion, isApproved, origin, onApprovalChange, onClose, notify }: DesignReviewModalProps) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [storedReview] = useState(() => loadStoredReview(designTitle))
  const [activeVersion, setActiveVersion] = useState(initialVersion)
  const [zoom, setZoom] = useState(50)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [comments, setComments] = useState(storedReview.comments)
  const [commentDraft, setCommentDraft] = useState('')
  const [pendingPoint, setPendingPoint] = useState<ReviewPoint | null>(null)
  const [pendingAnnotationId, setPendingAnnotationId] = useState<number | null>(null)
  const [activeTool, setActiveTool] = useState<ReviewTool>('point')
  const [brushOpen, setBrushOpen] = useState(false)
  const [inkColor, setInkColor] = useState('#5d55c7')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [draftAnnotation, setDraftAnnotation] = useState<DraftAnnotation | null>(null)
  const [textEditor, setTextEditor] = useState<{ point: ReviewPoint; value: string } | null>(null)
  const [annotationHistory, dispatchAnnotation] = useReducer(annotationReducer, { snapshots: [storedReview.annotations], index: 0 })
  const [railVisible, setRailVisible] = useState(true)
  const [isPanning, setIsPanning] = useState(false)
  const [closing, setClosing] = useState(false)
  const [artReady, setArtReady] = useState(!origin || reducedMotion)
  const [clonePhase, setClonePhase] = useState<'opening' | 'closing' | null>(origin && !reducedMotion ? 'opening' : null)
  const [cloneRect, setCloneRect] = useState<ReviewOrigin | null>(origin)
  const artStageRef = useRef<HTMLElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const inlineCommentInputRef = useRef<HTMLTextAreaElement>(null)
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

  useEffect(() => {
    try {
      window.localStorage.setItem(`allyo-review:${designTitle}`, JSON.stringify({ comments, annotations }))
    } catch {
      // A revisão continua funcional quando o navegador bloqueia o armazenamento local.
    }
  }, [annotations, comments, designTitle])

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
    if (!art || !origin || shouldReduceMotion) {
      onClose()
      return
    }
    const target = art.getBoundingClientRect()
    setClosing(true)
    setArtReady(false)
    setCloneRect({ left: target.left, top: target.top, width: target.width, height: target.height })
    setClonePhase('closing')
  }, [closing, onClose, origin])

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
  }, [brushOpen, closeModal, draftAnnotation, pendingPoint, textEditor])

  const clearPendingContext = () => {
    setPendingPoint(null)
    setPendingAnnotationId(null)
    setTextEditor(null)
  }

  const selectVersion = (version: number) => {
    setActiveVersion(version)
    clearPendingContext()
    notify(`Versão ${version} carregada`)
  }

  const chooseTool = (tool: ReviewTool) => {
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
      dispatchAnnotation({ type: 'commit', annotation: draftAnnotation })
      setPendingAnnotationId(draftAnnotation.id)
      setPendingPoint(null)
      requestAnimationFrame(() => commentInputRef.current?.focus())
      notify(`${annotationLabel(draftAnnotation)} adicionado. Você pode incluir um comentário.`)
    }
    setDraftAnnotation(null)
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
    dispatchAnnotation({ type: 'commit', annotation })
    setPendingAnnotationId(annotation.id)
    setTextEditor(null)
    requestAnimationFrame(() => commentInputRef.current?.focus())
    notify('Texto adicionado à arte')
  }

  const addComment = (event: React.FormEvent) => {
    event.preventDefault()
    if (!commentDraft.trim()) return
    setComments((current) => [...current, {
      id: Date.now(),
      author: 'Levy Câmara',
      text: commentDraft.trim(),
      time: 'Agora',
      resolved: false,
      version: activeVersion,
      point: pendingPoint ?? undefined,
      annotationId: pendingAnnotationId ?? undefined,
    }])
    setCommentDraft('')
    setPendingPoint(null)
    setPendingAnnotationId(null)
    notify('Comentário adicionado ao arquivo')
  }

  const toggleResolved = (id: number) => {
    setComments((current) => current.map((comment) => comment.id === id ? { ...comment, resolved: !comment.resolved } : comment))
  }

  const cycleStrokeWidth = () => setStrokeWidth((current) => current === 3 ? 5 : current === 5 ? 8 : 3)
  const contextAnnotation = pendingAnnotationId ? annotations.find((annotation) => annotation.id === pendingAnnotationId) : undefined
  const commentFormTitle = pendingPoint ? 'Comentário pontual' : contextAnnotation ? `Comentário sobre: ${annotationLabel(contextAnnotation)}` : 'Comentário geral'

  const renderAnnotation = (annotation: ReviewAnnotation | DraftAnnotation) => {
    if (annotation.type === 'text') return (
      <span className="file-review-art-text" style={{ left: `${annotation.point.x}%`, top: `${annotation.point.y}%`, color: annotation.color }} key={annotation.id}>{annotation.text}</span>
    )
    if (annotation.type === 'draw') {
      return <polyline key={annotation.id} points={annotation.points.map((point) => { const svg = toSvgPoint(point); return `${svg.x},${svg.y}` }).join(' ')} fill="none" stroke={annotation.color} strokeWidth={annotation.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    }
    const start = toSvgPoint(annotation.start)
    const end = toSvgPoint(annotation.end)
    if (annotation.type === 'arrow') {
      return <line key={annotation.id} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={annotation.color} strokeWidth={annotation.width} strokeLinecap="round" markerEnd="url(#file-review-arrow-head)" vectorEffect="non-scaling-stroke" />
    }
    return <rect key={annotation.id} x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={Math.abs(end.x - start.x)} height={Math.abs(end.y - start.y)} rx="5" fill={`${annotation.color}18`} stroke={annotation.color} strokeWidth={annotation.width} vectorEffect="non-scaling-stroke" />
  }

  return createPortal(
    <>
    <div className={`file-review-modal${closing ? ' file-review-modal--closing' : ''}`} role="dialog" aria-modal="true" aria-label="Revisão de design">
      <div className="file-review-shell">
        <header className="file-review-topbar">
          <div className="file-review-topline">
            <div className="file-review-breadcrumbs">
              <button type="button">Chat</button><button type="button">Designs</button><i />
              <strong>Nome-doArquivo.pdf</strong>
              <span className="file-review-status">{isApproved ? 'Aprovado' : 'Aguardando aprovação'}</span><i />
              <button type="button" className="file-review-change" onClick={() => notify('Solicitação de alterações aberta')}><img src={figmaAsset('design_review.imgGardenReloadFill16')} alt="" />Solicitar alterações</button>
              <button type="button" className="file-review-approve" onClick={() => { onApprovalChange(!isApproved); notify(isApproved ? 'Aprovação removida' : 'Design aprovado com sucesso') }}><img src={figmaAsset('design_review.imgGroup')} alt="" />{isApproved ? 'Aprovado' : 'Marcar como aprovado'}</button>
            </div>
            <div className="file-review-share-actions"><button type="button" onClick={() => notify('Link de compartilhamento copiado')}><img src={figmaAsset('design_review.imgTablerShare')} alt="" />Compartilhar</button><button type="button" aria-label="Mais opções"><img src={figmaAsset('design_review.imgTablerDots')} alt="" /></button></div>
          </div>
          <div className="file-review-controls">
            <div className="file-review-view-controls">
              <button type="button" className={railVisible ? 'active' : ''} onClick={() => setRailVisible((value) => !value)} aria-label="Alternar miniaturas" title="Miniaturas"><img src={figmaAsset('design_review.imgPhSidebarBold')} alt="" /></button>
              <button type="button" className={activeTool === 'pan' ? 'active' : ''} onClick={() => chooseTool('pan')} aria-pressed={activeTool === 'pan'} aria-label="Mover arquivo" title="Mover arquivo"><Hand size={20} /></button>
              <label className="file-review-select file-review-zoom"><select value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Zoom"><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option></select></label><i />
              <label className="file-review-select file-review-version"><select value={activeVersion} onChange={(event) => selectVersion(Number(event.target.value))} aria-label="Versão do arquivo"><option value="3">Versão 3</option><option value="2">Versão 2</option><option value="1">Versão 1</option></select></label><i />
              <div className="file-review-stepper"><button type="button" aria-label="Versão anterior" onClick={() => selectVersion(Math.max(1, activeVersion - 1))}><img src={figmaAsset('design_review.imgGroup1410119707')} alt="" /></button><button type="button" aria-label="Recarregar versão" onClick={() => notify(`Versão ${activeVersion} atualizada`)}><img src={figmaAsset('design_review.imgGroup1410119709')} alt="" /></button><button type="button" aria-label="Próxima versão" onClick={() => selectVersion(Math.min(3, activeVersion + 1))}><img src={figmaAsset('design_review.imgGroup1410119710')} alt="" /></button></div>
            </div>

            <div className={`file-review-annotation-toolbar${brushOpen ? ' is-expanded' : ''}`} role="toolbar" aria-label="Ferramentas de anotação">
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
            </div>

            <div className="file-review-right-controls"><label className="file-review-select file-review-read"><select aria-label="Estado de leitura" defaultValue="unread"><option value="unread">não lido</option><option value="read">lido</option></select></label><button type="button" aria-label="Visualizar comentários"><img src={figmaAsset('design_review.imgGroup1')} alt="" /></button><button type="button" onClick={closeModal} aria-label="Fechar revisão"><img src={figmaAsset('design_review.imgMaterialSymbolsClose')} alt="" /></button></div>
          </div>
        </header>

        <aside className={`file-review-rail${railVisible ? '' : ' is-hidden'}`} aria-label="Versões do arquivo">
          {[3, 2, 1].map((version) => <button type="button" className={activeVersion === version ? 'active' : ''} onClick={() => selectVersion(version)} key={version}><img src={figmaAsset('design_review.imgImage8')} alt={`Miniatura da versão ${version}`} /><span><b>{version}</b><small><img src={figmaAsset('design_review.imgGroup1410119708')} alt="" />3</small></span></button>)}
        </aside>

        <main ref={artStageRef} className={`file-review-art-stage${railVisible ? '' : ' is-expanded'} is-${activeTool}${isPanning ? ' is-panning' : ''}`}>
          <div
            className={`file-review-art file-review-art--v${activeVersion}${artReady ? ' is-ready' : ' is-transitioning'}`}
            ref={artRef}
            style={{ width: ART_WIDTH * zoom / 100, height: ART_HEIGHT * zoom / 100 }}
            onPointerDown={beginArtInteraction}
            onPointerMove={continueArtInteraction}
            onPointerUp={finishArtInteraction}
            onPointerCancel={finishArtInteraction}
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
            role="application"
            tabIndex={0}
            aria-label="Arquivo em revisão. Use a barra de ferramentas para comentar ou desenhar."
            title={designTitle}
          >
            <img src={figmaAsset('design_review.imgImage8')} alt="Design em revisão" />
            <svg className="file-review-annotation-layer" viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              <defs><marker id="file-review-arrow-head" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,7 L6,3.5 z" fill="context-stroke" /></marker></defs>
              {visibleAnnotations.filter((annotation) => annotation.type !== 'text').map(renderAnnotation)}
              {draftAnnotation && renderAnnotation(draftAnnotation)}
            </svg>
            {visibleAnnotations.filter((annotation): annotation is TextAnnotation => annotation.type === 'text').map(renderAnnotation)}
            {comments.filter((comment) => comment.version === activeVersion && comment.point).map((comment) => <button type="button" className={`file-review-pin${comment.resolved ? ' is-resolved' : ''}`} style={{ left: `${comment.point?.x}%`, top: `${comment.point?.y}%` }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setFilter(comment.resolved ? 'resolved' : 'open') }} aria-label={`Comentário: ${comment.text}`} key={comment.id}><img src={figmaAsset('design_review.imgGroup1410119711')} alt="" /></button>)}
            {pendingPoint && <span className="file-review-pin is-pending" style={{ left: `${pendingPoint.x}%`, top: `${pendingPoint.y}%` }}><img src={figmaAsset('design_review.imgGroup1410119711')} alt="" /></span>}

            {pendingPoint && <form className={`file-review-inline-comment${pendingPoint.x > 62 ? ' is-left' : ''}`} style={{ left: `${pendingPoint.x}%`, top: `${Math.min(78, Math.max(12, pendingPoint.y))}%` }} onPointerDown={(event) => event.stopPropagation()} onSubmit={addComment}>
              <header><strong>Comentário neste ponto</strong><button type="button" onClick={() => setPendingPoint(null)} aria-label="Cancelar comentário pontual"><X size={18} /></button></header>
              <textarea ref={inlineCommentInputRef} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="O que precisa ser ajustado aqui?" aria-label="Comentário neste ponto" />
              <footer><span>Vinculado à versão {activeVersion}</span><button type="submit" disabled={!commentDraft.trim()}>Comentar</button></footer>
            </form>}

            {textEditor && <form className={`file-review-text-editor${textEditor.point.x > 72 ? ' is-left' : ''}`} style={{ left: `${textEditor.point.x}%`, top: `${textEditor.point.y}%`, color: inkColor }} onPointerDown={(event) => event.stopPropagation()} onSubmit={submitTextAnnotation}>
              <input ref={textInputRef} value={textEditor.value} onChange={(event) => setTextEditor({ ...textEditor, value: event.target.value })} placeholder="Digite a orientação" aria-label="Texto na arte" />
              <button type="submit" disabled={!textEditor.value.trim()}>Adicionar</button>
              <button type="button" onClick={() => setTextEditor(null)} aria-label="Cancelar texto"><X size={17} /></button>
            </form>}
          </div>
        </main>

        <aside className="file-review-comments">
          <div className="file-review-filters"><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button><button type="button" className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Aberto</button><button type="button" className={filter === 'resolved' ? 'active' : ''} onClick={() => setFilter('resolved')}>Resolvido</button></div>
          <div className="file-review-comment-list">
            {visibleComments.map((comment) => {
              const annotation = comment.annotationId ? annotations.find((item) => item.id === comment.annotationId) : undefined
              return <article className={comment.resolved ? 'is-resolved' : ''} key={comment.id}><header><span><img src={figmaAsset('design_review.imgEllipse24')} alt="" /><strong>{comment.author}</strong></span><span><button type="button" aria-label="Mais opções do comentário"><img src={figmaAsset('design_review.imgTablerDots1')} alt="" /></button><button type="button" onClick={() => toggleResolved(comment.id)} aria-label={comment.resolved ? 'Reabrir comentário' : 'Resolver comentário'}><img src={figmaAsset('design_review.imgGroup2')} alt="" /></button></span></header><time>{comment.time}</time>{(comment.point || annotation) && <span className="file-review-comment-kind">{comment.point ? 'Comentário pontual' : annotationLabel(annotation)}</span>}<p>{comment.text}</p><button type="button" className="file-review-reply"><img src={figmaAsset('design_review.imgMaterialSymbolsReplyRounded')} alt="" />Responder</button></article>
            })}
            {visibleComments.length === 0 && <p className="file-review-comments-empty">Nenhum comentário nesta versão.</p>}
          </div>
          <form className={`file-review-comment-form${pendingPoint ? ' is-point-pending' : ''}`} onSubmit={addComment}>
            <div><strong>{commentFormTitle}</strong>{(pendingPoint || contextAnnotation) && <button type="button" onClick={() => chooseTool('general')}>Alterar para geral</button>}</div>
            {pendingPoint ? <p>Escreva no campo que abriu ao lado do marcador na arte.</p> : <>
              <textarea ref={commentInputRef} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={contextAnnotation ? 'Descreva o ajuste relacionado à anotação...' : 'Adicionar comentário geral...'} aria-label="Novo comentário" />
              <button type="submit" disabled={!commentDraft.trim()}>Comentar</button>
            </>}
          </form>
        </aside>
      </div>
    </div>
    {clonePhase && cloneRect && <div className="file-review-shared-clone" ref={cloneRef} style={{ left: cloneRect.left, top: cloneRect.top, width: cloneRect.width, height: cloneRect.height }} aria-hidden="true"><img src={figmaAsset('design_review.imgImage8')} alt="" /></div>}
    </>,
    document.body,
  )
}
