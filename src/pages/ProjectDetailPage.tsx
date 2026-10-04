import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ChevronUp, Circle, Download, ExternalLink, Eye, FileText, Flag, Image as ImageIcon, MessageSquareText, Pencil, Play, Plus, Rocket, Upload } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { DesignReviewModal, type ReviewCollectionItem, type ReviewOrigin } from '../components/DesignReviewModal'
import { FilePreviewModal, type PreviewableFile } from '../components/FilePreviewModal'
import { api, resolveStorageUrl, type DesignSummary, type ProjectBriefingSummary, type ProjectFileSummary } from '../services/api'
import { socket, type SocketEventPayload } from '../services/socket'
import type { Project, ProjectTask, TaskBriefing } from '../types'
import { parseCopyContent } from '../utils/copyContent'

const messageTools = [
  { asset: 'messages.imgOcticonBold16' as const, label: 'Negrito' },
  { asset: 'messages.imgTablerItalic' as const, label: 'Itálico' },
  { asset: 'messages.imgMaterialSymbolsListRounded' as const, label: 'Lista' },
  { asset: 'messages.imgLineMdLink' as const, label: 'Adicionar link' },
  { asset: 'messages.imgGroup2' as const, label: 'Emoji' },
  { asset: 'messages.imgIconamoonAttachmentFill' as const, label: 'Anexar arquivo' },
  { asset: 'messages.imgGroup3' as const, label: 'Mencionar pessoa' },
]

interface ProjectTimelineEvent {
  id: string
  date: Date
  title: string
  detail: string
  completed?: boolean
}


const getBaseMaterialName = (rawName?: string | null): string => {
  if (!rawName) return ''
  let name = cleanDecodedText(rawName).toLowerCase().trim()
  const dotIndex = name.lastIndexOf('.')
  const ext = dotIndex > 0 ? name.slice(dotIndex) : ''
  const stem = dotIndex > 0 ? name.slice(0, dotIndex) : name
  const cleanStem = stem
    .replace(/[\s\-_]+(?:\d+\s*[\-_]\s*)*(?:v|vers[aã]o)\s*\d+$/i, '')
    .replace(/\s*[\(\[](?:v|vers[aã]o)\s*\d+[\)\]]$/i, '')
    .trim()
  return cleanStem + ext
}

const cleanDecodedText = (text?: string | null): string => {
  if (!text) return ''
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

const formatProjectDeadline = (value?: string | null): string => {
  if (!value || value === 'A definir') return 'Prazo a definir'
  if (value.toLowerCase() === 'hoje') return 'Hoje'
  const date = new Date(value)
  if (!Number.isNaN(date.getTime()) && (value.includes('-') || value.includes('T'))) {
    const today = new Date()
    const isSameDay = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    const dateLabel = isSameDay ? 'Hoje' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '')
    const timeLabel = value.includes('T') ? `, ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)}` : ''
    return `${dateLabel}${timeLabel}`
  }
  return value
}

const validDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function projectTimeline(project: Project, tasks: ProjectTask[], designs: DesignSummary[]): ProjectTimelineEvent[] {
  const events: ProjectTimelineEvent[] = []
  const createdAt = validDate(project.createdAt)
  const updatedAt = validDate(project.updatedAt)

  if (createdAt) events.push({ id: 'project-created', date: createdAt, title: 'Briefing enviado', detail: 'Projeto criado pelo cliente' })

  tasks.forEach((task) => {
    const taskCreatedAt = validDate(task.createdAt)
    const taskUpdatedAt = validDate(task.updatedAt)
    if (taskCreatedAt) events.push({ id: `task-created-${task.id}`, date: taskCreatedAt, title: task.title, detail: 'Tarefa adicionada ao projeto' })
    if (taskUpdatedAt && taskCreatedAt && taskUpdatedAt.getTime() - taskCreatedAt.getTime() > 1_000 && task.status !== 'A iniciar') {
      events.push({
        id: `task-updated-${task.id}`,
        date: taskUpdatedAt,
        title: task.title,
        detail: task.status === 'Concluído' ? 'Tarefa concluída' : `Status alterado para ${task.status.toLowerCase()}`,
        completed: task.status === 'Concluído',
      })
    }
  })

  designs.forEach((design) => {
    const designCreatedAt = validDate(design.createdAt)
    if (designCreatedAt) events.push({ id: `design-${design.id}`, date: designCreatedAt, title: cleanDecodedText(design.name), detail: `${design.version} enviada para revisão`, completed: design.approved })
  })

  if (updatedAt && createdAt && updatedAt.getTime() - createdAt.getTime() > 1_000 && project.status !== 'Concluído') {
    events.push({ id: 'project-updated', date: updatedAt, title: `Projeto ${project.status.toLowerCase()}`, detail: `${project.progress}% do projeto concluído` })
  }

  return events.sort((left, right) => left.date.getTime() - right.date.getTime()).slice(-12)
}

function OverviewTimeline({ project, tasks, designs }: { project: Project; tasks: ProjectTask[]; designs: DesignSummary[] }) {
  const projectCompleted = project.status === 'Concluído' || (tasks.length > 0 && tasks.every((task) => task.status === 'Concluído'))
  const createdAt = validDate(project.createdAt) || new Date()
  const activity = projectTimeline(project, tasks, designs).filter((event) => event.id !== 'project-created')
  const latestActivity = activity.at(-1)
  const completedMilestone = projectCompleted ? {
    id: 'project-finished',
    date: validDate(project.updatedAt) || latestActivity?.date || createdAt,
    title: 'Projeto concluído',
    detail: 'Todas as tarefas foram finalizadas',
  } : latestActivity?.completed ? latestActivity : null
  const events = activity.filter((event) => event.id !== completedMilestone?.id && !(projectCompleted && event.completed)).slice(-8)
  const formatDateTime = (date: Date) => `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')} · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  return (
    <article className="overview-timeline-card">
      <header><h2>Timeline do projeto</h2><span>Arraste para ver o histórico</span></header>
      <div className="overview-timeline-viewport" tabIndex={0} aria-label="Histórico do projeto">
        <ol className="overview-timeline-list">
          <li className="overview-timeline-step is-start">
            <span className="overview-timeline-node"><Flag size={15} /></span>
            <article><time>{formatDateTime(createdAt)}</time><strong>Briefing enviado</strong><p>Projeto criado</p></article>
          </li>
          {events.map((event) => (
            <li className={`overview-timeline-step${event.completed ? ' is-complete' : ''}`} key={event.id}>
              <span className="overview-timeline-node"><Circle size={9} fill="currentColor" /></span>
              <article><time>{formatDateTime(event.date)}</time><strong>{event.title}</strong><p>{event.detail}</p></article>
            </li>
          ))}
          <li className={`overview-timeline-step is-finish${completedMilestone ? ' is-complete' : ''}`}>
            <span className="overview-timeline-node"><Rocket size={15} /></span>
            <article>
              <time>{completedMilestone ? formatDateTime(completedMilestone.date) : 'Próximo marco'}</time>
              <strong>{completedMilestone?.title || 'Conclusão do projeto'}</strong>
              <p>{completedMilestone?.detail || 'Aguardando as tarefas'}</p>
            </article>
          </li>
        </ol>
      </div>
    </article>
  )
}

function ProjectBriefing({
  project,
  briefing,
  files,
  onDuplicate,
  onPreviewFile,
}: {
  project: Project
  briefing: ProjectBriefingSummary | null
  files: ProjectFileSummary[]
  onDuplicate: () => void
  onPreviewFile?: (file: ProjectFileSummary) => void
}) {
  if (!briefing) return <article className="project-briefing-card project-briefing-card--empty"><header><div><h2>Briefing do projeto</h2><p>O briefing ainda não foi disponibilizado.</p></div></header></article>
  const links = briefing.creativeDirection.filter((item) => item.startsWith('Referência: ')).map((item) => item.replace('Referência: ', ''))
  const directions = briefing.creativeDirection.filter((item) => !item.startsWith('Referência: '))
  const briefingFiles = files.filter((file) => file.category === 'briefing')
  return (
    <article className="project-briefing-card">
      <header>
        <div>
          <h2>Briefing do projeto</h2>
          <p>{briefing.deliveryDate || project.deadline} <b>•</b> {briefing.creditsEstimated} créditos estimados <b>•</b> {briefing.estimatedHours} horas úteis</p>
        </div>
        <button onClick={onDuplicate}>Duplicar briefing</button>
      </header>
      <img className="project-briefing-divider" src={figmaAsset('overview.imgLine29')} alt="" />
      <section>
        <h3>Visão geral do projeto</h3>
        <p>{briefing.overview || project.description}</p>
      </section>
      <section><h3>Pedido</h3><p>{briefing.objective}</p>{briefing.audience && <p><strong>Público:</strong> {briefing.audience}</p>}{briefing.tone && <p><strong>Tom:</strong> {briefing.tone}</p>}</section>
      <section>
        <h3>Entregável</h3>
        <ol>{briefing.deliverables.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>
      <section>
        <h3>Formatos</h3>
        <ol>{briefing.formats.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>
      {directions.length > 0 && <section><h3>Direção criativa</h3><ol>{directions.map((item) => <li key={item}>{item}</li>)}</ol></section>}
      {(links.length > 0 || briefingFiles.length > 0) && (
        <section className="project-briefing-references">
          <h3>Referências</h3>
          {links.length > 0 && (
            <div className="project-briefing-links">
              {links.map((link) => (
                <a href={link} target="_blank" rel="noreferrer" key={link} className="project-briefing-link-pill" title={link}>
                  <ExternalLink size={13} />
                  <span>{link}</span>
                </a>
              ))}
            </div>
          )}
          {briefingFiles.length > 0 && (
            <div className="project-briefing-files-grid">
              {briefingFiles.map((file) => {
                const isImage = file.contentType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)
                const ext = file.name.split('.').pop()?.toUpperCase() || 'ARQ'
                const resolvedUrl = resolveStorageUrl(file.fileUrl)
                return (
                  <div key={file.id} className="project-briefing-file-item">
                    <div
                      className="project-briefing-file-thumb"
                      onClick={() => onPreviewFile?.(file)}
                      role="button"
                      tabIndex={0}
                      title={`Visualizar ${file.name}`}
                    >
                      {isImage ? (
                        <img src={resolvedUrl} alt={file.name} />
                      ) : (
                        <span className="project-briefing-file-badge">{ext}</span>
                      )}
                      <div className="project-briefing-file-thumb-overlay">
                        <Eye size={14} />
                      </div>
                    </div>
                    <div className="project-briefing-file-info" onClick={() => onPreviewFile?.(file)} role="button" tabIndex={0}>
                      <span className="project-briefing-file-name" title={file.name}>{cleanDecodedText(file.name)}</span>
                      <small>{Math.max(1, Math.round(file.sizeBytes / 1024))} KB</small>
                    </div>
                    <div className="project-briefing-file-actions">
                      <button
                        type="button"
                        className="project-briefing-file-btn"
                        onClick={() => onPreviewFile?.(file)}
                        title="Abrir visualização"
                        aria-label={`Visualizar ${file.name}`}
                      >
                        <Eye size={14} />
                      </button>
                      <a
                        href={resolvedUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={file.name}
                        className="project-briefing-file-btn"
                        title="Baixar arquivo"
                        aria-label={`Baixar ${file.name}`}
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </article>
  )
}

interface ChatMessage {
  id: number
  person: string
  role: string
  initials: string
  text: string
  time: string
  mine?: boolean
  deliveryId?: number | null
}

type DeliveryKind = 'image' | 'pdf' | 'copy' | 'video' | 'file'

type DeliveryMaterial = {
  key: string
  latest: DesignSummary
  versions: DesignSummary[]
}

type DeliveryGalleryGroup = {
  key: string
  title: string
  collectionType: string | null
  materials: DeliveryMaterial[]
}

function deliveryKind(delivery: DesignSummary): DeliveryKind {
  const type = delivery.contentType?.toLowerCase() || ''
  const source = `${delivery.name} ${delivery.fileKey || ''} ${delivery.fileUrl || ''} ${delivery.thumbnailUrl || ''}`.toLowerCase()
  if (delivery.textContent || type.startsWith('text/')) return 'copy'
  if (type === 'application/pdf' || /\.pdf(?:$|[?&\s])/.test(source)) return 'pdf'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('image/') || Boolean(delivery.thumbnailUrl) || /\.(png|jpe?g|webp|gif|svg)(?:$|[?&\s])/i.test(source)) return 'image'
  if (/\.(mp4|webm|mov)(?:$|[?&\s])/i.test(source)) return 'video'
  return 'file'
}

function deliveryTypeLabel(kind: DeliveryKind) {
  return { image: 'Imagem', pdf: 'PDF', copy: 'Copy', video: 'Vídeo', file: 'Arquivo' }[kind]
}

function collectionTypeLabel(type: string | null) {
  return ({ carousel: 'Carrossel', presentation: 'Apresentação', storyboard: 'Storyboard', 'image-set': 'Coleção de imagens' } as Record<string, string>)[type || ''] || 'Coleção'
}

function CollectionPreview({ materials, imageCollection = false }: { materials: DeliveryMaterial[]; imageCollection?: boolean }) {
  return <span className="project-delivery-collection-preview" aria-hidden="true">
    <span className="project-delivery-collection-stack">
      {materials.slice(0, 3).map((material, index) => {
        const url = resolveStorageUrl(material.latest.thumbnailUrl || material.latest.fileUrl)
        return <span className="project-delivery-collection-sheet" style={{ '--sheet-index': index } as React.CSSProperties} key={material.key}>
          {url && (imageCollection || deliveryKind(material.latest) === 'image') ? <img src={url} alt="" /> : <ImageIcon size={34} />}
        </span>
      })}
    </span>
    <strong>{materials.length} {materials.length === 1 ? 'card' : 'cards'}</strong>
    <small>Abra uma vez e revise em sequência</small>
  </span>
}

function DeliveryPreview({ delivery }: { delivery: DesignSummary }) {
  const kind = deliveryKind(delivery)
  const previewUrl = resolveStorageUrl(delivery.thumbnailUrl || delivery.fileUrl)
  const [previewFailed, setPreviewFailed] = useState(false)
  if (kind === 'image' && previewUrl && !previewFailed) return <img src={previewUrl} alt={delivery.name} onError={() => setPreviewFailed(true)} />
  if (kind === 'image') return <span className="project-delivery-file"><ImageIcon size={38} /><strong>Imagem</strong><small>Não foi possível carregar a prévia. Abra a entrega para tentar novamente.</small></span>
  if (kind === 'copy') {
    const { plainText: content, wordCount } = parseCopyContent(delivery.textContent)
    return <span className="project-delivery-copy">
      <span className="project-delivery-copy__meta"><MessageSquareText size={22} /><small>Copy para aprovação</small></span>
      <p>{content || 'Abra para revisar o texto desta entrega.'}</p>
      <small className="project-delivery-copy__hint">{wordCount ? `${wordCount} ${wordCount === 1 ? 'palavra' : 'palavras'} · ` : ''}Abra para comentar trechos</small>
    </span>
  }
  if (kind === 'pdf') return <span className="project-delivery-file project-delivery-file--pdf"><FileText size={38} /><strong>PDF</strong><small>Abra para visualizar o documento</small></span>
  if (kind === 'video') return <span className="project-delivery-file project-delivery-file--video"><Play size={38} /><strong>Vídeo</strong><small>Abra para reproduzir</small></span>
  return <span className="project-delivery-file"><FileText size={38} /><strong>Arquivo</strong><small>Prévia indisponível</small></span>
}

export function ProjectDetailPage() {
  const { id = '', tab = 'visao-geral' } = useParams()
  const navigate = useNavigate()
  const { projects, currentUser, notify } = useApp()
  const project = useMemo(() => projects.find((item) => item.id === id), [id, projects])
  const [messageList, setMessageList] = useState<ChatMessage[]>([])
  const [designList, setDesignList] = useState<DesignSummary[]>([])
  const [projectFiles, setProjectFiles] = useState<ProjectFileSummary[]>([])
  const [briefing, setBriefing] = useState<ProjectBriefingSummary | null>(null)
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>(() => project?.tasksList || [])
  const [loadedAssetsFor, setLoadedAssetsFor] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [draft, setDraft] = useState('')
  const [approved, setApproved] = useState<number[]>([])
  const [reviewing, setReviewing] = useState<number | null>(null)
  const [filePreview, setFilePreview] = useState<PreviewableFile | null>(null)

  const parseVersionNum = (v?: string) => Number((v || '').replace(/\D/g, '')) || 1

  const deliveryGroups = useMemo<DeliveryGalleryGroup[]>(() => {
    const groups: Record<string, DesignSummary[]> = {}
    for (const design of designList) {
      const baseMaterial = getBaseMaterialName(design.name) || cleanDecodedText(design.name).toLowerCase().trim()
      const key = design.taskId ? `task-${design.taskId}-${baseMaterial}` : `name-${baseMaterial}`
      if (!groups[key]) groups[key] = []
      groups[key].push(design)
    }
    const materials = Object.entries(groups).map(([key, versions]) => {
      versions.sort((a: DesignSummary, b: DesignSummary) => parseVersionNum(b.version) - parseVersionNum(a.version) || b.id - a.id)
      return {
        key,
        latest: versions[0],
        all: versions,
      }
    })
    const collectionTaskTypes = new Set(['carousel', 'presentation', 'storyboard', 'image-set'])
    const collections = new Map<string, DeliveryGalleryGroup>()
    const result: DeliveryGalleryGroup[] = []

    materials.forEach((material) => {
      const task = material.latest.taskId ? projectTasks.find((item) => item.id === material.latest.taskId) : undefined
      const inferredTaskType = task && /carrossel|carousel/i.test(`${task.title} ${task.briefing?.deliverables?.join(' ') || ''}`) ? 'carousel' : null
      const taskType = task?.briefing?.deliverySchema?.taskType || inferredTaskType
      if (task && taskType && collectionTaskTypes.has(taskType)) {
        const existing = collections.get(task.id)
        const normalized: DeliveryMaterial = { key: material.key, latest: material.latest, versions: material.all }
        if (existing) existing.materials.push(normalized)
        else {
          const collection = { key: `collection-${task.id}`, title: task.title, collectionType: taskType, materials: [normalized] }
          collections.set(task.id, collection)
          result.push(collection)
        }
        return
      }
      result.push({
        key: material.key,
        title: cleanDecodedText(material.latest.name),
        collectionType: null,
        materials: [{ key: material.key, latest: material.latest, versions: material.all }],
      })
    })

    for (const collection of collections.values()) {
      collection.materials.sort((left, right) => left.latest.id - right.latest.id)
      const taskId = collection.materials[0]?.latest.taskId
      const task = taskId ? projectTasks.find((item) => item.id === taskId) : undefined
      const expectedItemCount = task?.briefing?.deliverySchema?.items?.length || 0
      if (expectedItemCount > 0 && collection.materials.length > expectedItemCount) {
        collection.materials = collection.materials.slice(-expectedItemCount)
      }
    }
    return result
  }, [designList, projectTasks])
  const [reviewOrigin, setReviewOrigin] = useState<ReviewOrigin | null>(null)
  const projectFileInputRef = useRef<HTMLInputElement>(null)

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskBriefingDraft, setTaskBriefingDraft] = useState<TaskBriefing | null>(null)
  const [savingTaskBriefing, setSavingTaskBriefing] = useState(false)

  useEffect(() => {
    if (!project) return
    let isMounted = true

    Promise.allSettled([
      api.getProject(project.id),
      api.getMessages(project.id),
      api.getDesigns(project.id),
      api.getProjectFiles(project.id),
    ]).then(([projectResult, messagesResult, designsResult, filesResult]) => {
      if (!isMounted) return
      if (projectResult.status === 'fulfilled') {
        setBriefing(projectResult.value.briefing)
        setProjectTasks(projectResult.value.tasksList || [])
      }
      if (messagesResult.status === 'fulfilled') setMessageList(messagesResult.value)
      if (designsResult.status === 'fulfilled') {
        setDesignList(designsResult.value)
        setApproved(designsResult.value.filter((item) => item.approved).map((item) => item.id))
      }
      if (filesResult.status === 'fulfilled') setProjectFiles(filesResult.value)
    }).finally(() => {
      if (isMounted) setLoadedAssetsFor(project.id)
    })

    const handleNewMessage = (event: SocketEventPayload) => {
      if (event.projectId === project.id && event.data?.message) {
        const msg = event.data.message as ChatMessage
        setMessageList((current) => {
          if (current.some((m) => m.id === msg.id)) return current
          return [...current, {
            id: msg.id,
            person: msg.person,
            role: msg.role,
            initials: msg.initials,
            text: msg.text,
            time: msg.time,
            mine: msg.mine ?? false,
            deliveryId: typeof msg.deliveryId === 'number' ? msg.deliveryId : null,
          }]
        })
      }
    }

    socket.on('MESSAGE_SENT', handleNewMessage)
    return () => {
      isMounted = false
      socket.off('MESSAGE_SENT', handleNewMessage)
    }
  }, [project])

  const startEditingTaskBriefing = (task: ProjectTask) => {
    setExpandedTaskId(task.id)
    setEditingTaskId(task.id)
    setTaskBriefingDraft({
      inheritedFromProject: false,
      catalogCode: task.briefing?.catalogCode,
      overview: task.briefing?.overview || briefing?.overview || project?.description || '',
      objective: task.briefing?.objective || briefing?.objective || '',
      audience: task.briefing?.audience || briefing?.audience || '',
      tone: task.briefing?.tone || briefing?.tone || '',
      deliverables: task.briefing?.deliverables || [],
      formats: task.briefing?.formats || [],
      creativeDirection: task.briefing?.creativeDirection || [],
      projectDeliverables: task.briefing?.projectDeliverables,
    })
  }

  const saveTaskBriefing = async (task: ProjectTask) => {
    if (!project || !taskBriefingDraft || savingTaskBriefing) return
    setSavingTaskBriefing(true)
    try {
      const updatedTask = await api.updateTask(project.id, task.id, { briefing: taskBriefingDraft })
      setProjectTasks((current) => current.map((item) => item.id === updatedTask.id ? updatedTask : item))
      setEditingTaskId(null)
      setTaskBriefingDraft(null)
      notify(`Briefing da tarefa #${updatedTask.publicId} atualizado`)
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível atualizar o briefing da tarefa')
    } finally {
      setSavingTaskBriefing(false)
    }
  }

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!project || !draft.trim()) return
    const text = draft
    setDraft('')
    const tempId = Date.now()
    const senderName = currentUser?.name || 'Cliente'
    const senderInitials = currentUser?.avatarInitials || 'LC'

    setMessageList((current) => [
      ...current,
      { id: tempId, person: senderName, role: 'Cliente', initials: senderInitials, text, time: 'Agora', mine: true }
    ])
    notify('Mensagem enviada')

    try {
      const saved = await api.sendMessage(project.id, text)
      setMessageList((current) => current.map((m) => m.id === tempId ? { ...m, id: saved.id } : m))
    } catch (err) {
      console.warn('Failed to sync message with backend:', err)
    }
  }

  const handleRequestChanges = async (designId: number, notes?: string) => {
    const result = await api.requestChanges(designId, { notes })
    setApproved((current) => current.filter((item) => item !== designId))
    if (result.taskId) {
      setProjectTasks((current) => current.map((task) => task.id === result.taskId ? {
        ...task,
        status: 'Alteração',
        delivery: 'Em alteração',
      } : task))
    }
  }

  const handleApprovalChange = async (designId: number, nextApproved: boolean, feedback?: { rating: number; comment?: string }, scope: 'asset' | 'task' = 'asset') => {
    const result = await api.setDesignApproval(designId, nextApproved, feedback, scope)
    const affectedIds = result.approvedDesignIds?.length ? result.approvedDesignIds : [designId]
    setApproved((current) => nextApproved
      ? Array.from(new Set([...current, ...affectedIds]))
      : current.filter((item) => !affectedIds.includes(item)))
    if (result.taskId) {
      setProjectTasks((current) => current.map((task) => task.id === result.taskId ? {
        ...task,
        status: nextApproved ? 'Concluído' : 'Em revisão',
        delivery: nextApproved ? 'Aprovado' : 'Aguardando aprovação',
      } : task))
    }
  }

  const openReview = (designId: number, target: HTMLButtonElement) => {
    const bounds = target.getBoundingClientRect()
    setReviewOrigin({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
    setReviewing(designId)
  }

  const closeReview = () => {
    setReviewing(null)
    setReviewOrigin(null)
  }

  const uploadProjectFile = async (file: File) => {
    if (!project || uploadingFile) return
    setUploadingFile(true)
    try {
      const uploaded = await api.uploadFile(file, 'project-files')
      const saved = await api.addProjectFile(project.id, {
        name: file.name,
        fileKey: uploaded.fileKey,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
        category: 'arquivo',
      })
      setProjectFiles((current) => [saved, ...current])
      notify(`${file.name} enviado com sucesso`)
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo')
    } finally {
      setUploadingFile(false)
      if (projectFileInputRef.current) projectFileInputRef.current.value = ''
    }
  }

  if (!project) {
    return (
      <div className="page project-detail-page" style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ color: '#fff', fontSize: '20px' }}>Projeto não encontrado</h2>
        <p style={{ color: '#8e8e93', marginTop: 8 }}>Este projeto ainda não existe ou não está carregado no seu espaço.</p>
        <button
          className="secondary-button"
          style={{ display: 'inline-flex', margin: '20px auto 0' }}
          onClick={() => window.history.back()}
        >
          Voltar
        </button>
      </div>
    )
  }

  const loadingAssets = loadedAssetsFor !== project.id
  const projectCompleted = projectTasks.length > 0 && projectTasks.every((task) => task.status === 'Concluído')
  const projectStatus: Project['status'] = projectCompleted
    ? 'Concluído'
    : projectTasks.length > 0 && project.status === 'Concluído'
      ? projectTasks.some((task) => task.status === 'Em revisão') ? 'Em revisão' : 'Em andamento'
      : project.status
  const displayedProject = projectStatus === project.status && !projectCompleted
    ? project
    : { ...project, status: projectStatus, progress: projectCompleted ? 100 : project.progress }
  const expandedTask = projectTasks.find((task) => task.id === expandedTaskId) || null
  const editingExpandedTask = Boolean(expandedTask && editingTaskId === expandedTask.id && taskBriefingDraft)

  return (
    <div className={`page project-detail-page project-detail-page--${tab}`}>
      <input
        ref={projectFileInputRef}
        className="project-visually-hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadProjectFile(file)
        }}
      />
      <header className="project-compact-header">
        <h1>{project.name}</h1>
        <span className="project-compact-deadline">com prazo de <strong>{formatProjectDeadline(project.deadline)}</strong></span>
        <span className="project-compact-status">{projectStatus}</span>
      </header>

      <nav className="project-detail-tabs">
        <NavLink to={`/projetos/${project.id}/visao-geral`} className={tab === 'visao-geral' ? 'active' : ''}>Visão geral</NavLink>
        <NavLink to={`/projetos/${project.id}/mensagens`} className={tab === 'mensagens' ? 'active' : ''}>Mensagens</NavLink>
        <NavLink to={`/projetos/${project.id}/entregas`} className={tab === 'entregas' || tab === 'designs' ? 'active' : ''}>Entregas</NavLink>
        <NavLink to={`/projetos/${project.id}/arquivos`} className={tab === 'arquivos' ? 'active' : ''}>Arquivos</NavLink>
      </nav>

      {tab === 'visao-geral' && (
        <section className="project-overview">
          {/* Tarefas e Demandas do Projeto */}
          <article className="project-briefing-card project-task-card">
            <header>
              <div>
                <h2>Tarefas do projeto <span>{projectTasks.length}</span></h2>
                <div className="project-task-flow-summary">
                  {(['A iniciar', 'Em andamento', 'Em revisão', 'Alteração', 'Bloqueada', 'Concluído'] as const).map((status) => {
                    const count = projectTasks.filter((task) => task.status === status).length
                    return count > 0 && <span className={`is-${status.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`} key={status}><i />{count} {status.toLowerCase()}</span>
                  })}
                </div>
              </div>
              <button className="project-task-add-trigger" type="button" onClick={() => navigate(`/novo-projeto?projectId=${encodeURIComponent(project.id)}`)}><Plus size={15} /> Nova tarefa</button>
            </header>

            <div className="project-task-stack">
              {projectTasks.length === 0 ? (
                <div className="project-task-empty"><Circle size={16} /><span>Nenhuma tarefa cadastrada neste projeto.</span></div>
              ) : (
                projectTasks.map((task) => {
                  const expanded = expandedTaskId === task.id
                  const hoverDetails = [
                    `Tarefa #${task.publicId}`,
                    task.team,
                    `${task.deadlineDays || 2} dias úteis`,
                    (task.status === 'Bloqueada' || task.dependencyBlocked) ? 'Possui dependência pendente' : '',
                  ].filter(Boolean).join(' · ')
                  return <article className={`project-task-stack-card${expanded ? ' is-active' : ''}`} key={task.id}>
                    <button className="project-task-card-open" type="button" title={hoverDetails} aria-label={`${task.title}. ${task.status}. ${hoverDetails}`} onClick={() => setExpandedTaskId(expanded ? null : task.id)} aria-expanded={expanded}>
                      <h3>{task.title}</h3>
                      <span className={`project-task-status project-task-status--${task.status.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{task.status}</span>
                    </button>
                  </article>
                })
              )}
            </div>

            {expandedTask && <section className="project-task-detail">
              <header><div><span>Tarefa #{expandedTask.publicId}</span><h3>{expandedTask.title}</h3></div><div className="project-task-detail-actions">{!editingExpandedTask && <button className="project-task-detail-edit" type="button" onClick={() => startEditingTaskBriefing(expandedTask)}><Pencil size={14} /> Editar briefing</button>}<button type="button" onClick={() => setExpandedTaskId(null)} aria-label="Fechar tarefa"><ChevronUp size={18} /></button></div></header>
              {editingExpandedTask && taskBriefingDraft ? <div className="project-task-briefing-editor">
                <label><span>Objetivo desta tarefa</span><textarea value={taskBriefingDraft.objective || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, objective: event.target.value })} /></label>
                <label><span>Contexto</span><textarea value={taskBriefingDraft.overview || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, overview: event.target.value })} /></label>
                <div><label><span>Público</span><input value={taskBriefingDraft.audience || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, audience: event.target.value })} /></label><label><span>Tom</span><input value={taskBriefingDraft.tone || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, tone: event.target.value })} /></label></div>
                <label><span>Entregáveis, separados por vírgula</span><input value={taskBriefingDraft.deliverables.join(', ')} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, deliverables: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
                <label><span>Formatos, separados por vírgula</span><input value={taskBriefingDraft.formats.join(', ')} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, formats: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
                <div className="project-task-briefing-editor__actions"><button type="button" onClick={() => { setEditingTaskId(null); setTaskBriefingDraft(null) }}>Cancelar</button><button type="button" disabled={savingTaskBriefing} onClick={() => void saveTaskBriefing(expandedTask)}>{savingTaskBriefing ? 'Salvando...' : 'Salvar briefing'}</button></div>
              </div> : <div className="project-task-briefing-content">
                <div><span>Objetivo</span><p>{expandedTask.briefing?.objective || 'Mesmo objetivo geral do projeto.'}</p></div>
                {expandedTask.briefing?.overview && <div><span>Contexto</span><p>{expandedTask.briefing.overview}</p></div>}
                <div className="project-task-briefing-grid"><div><span>Público</span><p>{expandedTask.briefing?.audience || 'Herdado do projeto'}</p></div><div><span>Tom</span><p>{expandedTask.briefing?.tone || 'Herdado do projeto'}</p></div></div>
                {expandedTask.briefing?.deliverables?.length > 0 && <div><span>Entregáveis</span><div className="project-task-briefing-tags">{expandedTask.briefing.deliverables.map((item) => <b key={item}>{item}</b>)}</div></div>}
                {expandedTask.briefing?.formats?.length > 0 && <div><span>Formatos</span><div className="project-task-briefing-tags">{expandedTask.briefing.formats.map((item) => <b key={item}>{item}</b>)}</div></div>}
              </div>}
            </section>}
          </article>

          <OverviewTimeline project={displayedProject} tasks={projectTasks} designs={designList} />
          <ProjectBriefing
            project={project}
            briefing={briefing}
            files={projectFiles}
            onDuplicate={() => notify('Briefing pronto para ser reutilizado em um novo projeto')}
            onPreviewFile={(file) => setFilePreview({
              name: cleanDecodedText(file.name),
              url: resolveStorageUrl(file.fileUrl),
              sizeBytes: file.sizeBytes,
              contentType: file.contentType,
            })}
          />
        </section>
      )}

      {tab === 'mensagens' && (
        <section className="project-messages">
          <div className="project-messages-feed">
            <div className="project-messages-date"><i /><span>Mensagens do projeto</span><i /></div>

            <article className="project-started-card">
              <header>
                <div><span>PROJETO</span><h2>{project.name}</h2></div>
                <time>{formatProjectDeadline(project.deadline)}</time>
              </header>
              <div className="project-started-metrics">
                <div><span>Horas estimadas</span><strong>{briefing?.estimatedHours ? Number(briefing.estimatedHours).toFixed(2) : '12.00'}</strong><small>24.00</small></div>
                <div><span>Créditos</span><strong>{briefing?.creditsEstimated || 1}</strong><small><img src={figmaAsset('messages.imgMaterialSymbolsBoltBoostRounded')} alt="" />Normal</small></div>
                <div><span>Duração</span><strong>{briefing?.estimatedHours ? `${briefing.estimatedHours} horas` : '48 horas'}</strong></div>
                <div><span>Status</span><strong>{projectStatus}</strong></div>
              </div>
            </article>

            <div className="project-chat-stage">
              {messageList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#8e8e93' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#f2f2f7' }}>Início da conversa do projeto</p>
                  <small style={{ display: 'block', marginTop: '6px' }}>Envie uma mensagem abaixo para falar com o time operacional da Allyo.</small>
                </div>
              ) : (
                messageList.map((msg) => (
                  <article key={msg.id} className={`figma-message ${msg.mine ? 'figma-message--mine' : 'figma-message--allyo'}`}>
                    {!msg.mine && (
                      <header>
                        <img src={figmaAsset('messages.imgEllipse23')} alt="" />
                        <span><strong>{msg.person}</strong><small>{msg.role}</small></span>
                        <time>{msg.time}</time>
                      </header>
                    )}
                    <p>{cleanDecodedText(msg.text)}</p>
                    {msg.deliveryId && <button className="project-message-delivery-link" type="button" onClick={() => {
                      if (!designList.some((delivery) => delivery.id === msg.deliveryId)) return notify('Esta entrega ainda está sendo carregada')
                      setReviewOrigin(null)
                      setReviewing(msg.deliveryId || null)
                    }}><ExternalLink size={14} /> Revisar entrega</button>}
                    {msg.mine && <time>{msg.time}</time>}
                  </article>
                ))
              )}
            </div>
          </div>

          <form className="project-message-composer" onSubmit={sendMessage}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreva sua mensagem..." aria-label="Escreva sua mensagem" />
            <footer>
              <div className="project-message-tools">
                {messageTools.map((tool) => <button
                  type="button"
                  aria-label={tool.label}
                  key={tool.label}
                  onClick={tool.label === 'Anexar arquivo' ? () => projectFileInputRef.current?.click() : undefined}
                ><img src={figmaAsset(tool.asset)} alt="" /></button>)}
              </div>
              <button type="submit" className="project-message-send"><img src={figmaAsset('messages.imgGroup4')} alt="" />Enviar</button>
            </footer>
          </form>
        </section>
      )}

      {(tab === 'entregas' || tab === 'designs' || tab === 'arquivos') && (
        <section className="project-designs-gallery">
          <header className="project-assets-header">
            <div>
              <h2>{tab === 'arquivos' ? 'Arquivos do projeto' : 'Entregas para revisão'}</h2>
              <p>{tab === 'arquivos' ? 'Entregas revisáveis e anexos organizados em um só lugar.' : 'Imagens, PDFs, textos e outros materiais enviados pela equipe para sua avaliação.'}</p>
            </div>
            {tab === 'arquivos' && <button className="secondary-button project-assets-upload" disabled={uploadingFile} onClick={() => projectFileInputRef.current?.click()}>
              <Upload size={16} /> {uploadingFile ? 'Enviando...' : 'Enviar arquivo'}
            </button>}
          </header>

          {loadingAssets && <div className="project-gallery-empty">Carregando arquivos...</div>}

          {!loadingAssets && (tab === 'entregas' || tab === 'designs' || tab === 'arquivos') && deliveryGroups.length > 0 && tab === 'arquivos' && <div className="project-assets-section-heading"><div><h3>Entregas revisáveis</h3><p>Carrosséis e demais materiais enviados pelo time.</p></div><span>{deliveryGroups.length}</span></div>}

          {!loadingAssets && (tab === 'entregas' || tab === 'designs' || tab === 'arquivos') && (deliveryGroups.length > 0 ? <div className="project-designs-grid">
            {deliveryGroups.map((group) => {
              const design = group.materials[0].latest
              const versions = group.materials[0].versions
              const isCollection = Boolean(group.collectionType)
              const isApproved = isCollection ? group.materials.every((item) => approved.includes(item.latest.id)) : approved.includes(design.id)
              const reviewTarget = group.materials.find((item) => !approved.includes(item.latest.id))?.latest || design
              const kind = deliveryKind(design)
              return <article key={group.key} className={`project-design-tile${isCollection ? ' project-design-tile--collection' : ''}`}>
                <header>
                  <span>
                    <small>{isCollection ? collectionTypeLabel(group.collectionType) : deliveryTypeLabel(kind)}</small>
                    {group.title}
                    {!isCollection && <span className="project-design-version">{design.version || 'v1'}</span>}
                    {!isCollection && versions.length > 1 && <span className="project-design-history">({versions.length} versões)</span>}
                  </span>
                  <b className={isApproved ? 'is-approved' : ''}>{isApproved ? 'Aprovado' : 'Aguardando aprovação'}</b>
                </header>
                <button onClick={(event) => openReview(reviewTarget.id, event.currentTarget)} aria-label={`Abrir ${isCollection ? `${collectionTypeLabel(group.collectionType)} ${group.title}` : cleanDecodedText(design.name)}`}>
                  {isCollection ? <CollectionPreview materials={group.materials} imageCollection={['carousel', 'storyboard', 'image-set'].includes(group.collectionType || '')} /> : <DeliveryPreview delivery={design} />}
                  <span className="project-design-open"><ExternalLink size={15} /> {isCollection ? 'Revisar sequência' : 'Revisar'}</span>
                </button>
              </article>
            })}
          </div> : tab !== 'arquivos' ? <div className="project-gallery-empty"><ImageIcon size={24} /> Nenhuma entrega foi enviada para revisão ainda.</div> : null)}

          {!loadingAssets && tab === 'arquivos' && projectFiles.length > 0 && <div className="project-assets-section-heading"><div><h3>Outros arquivos</h3><p>Referências, documentos e anexos do projeto.</p></div><span>{projectFiles.length}</span></div>}

          {!loadingAssets && tab === 'arquivos' && (projectFiles.length > 0 ? <div className="project-files-grid">
            {projectFiles.map((file) => {
              const resolvedUrl = resolveStorageUrl(file.fileUrl)
              return (
                <article key={file.id} className="project-file-card">
                  <div
                    className="project-file-preview"
                    onClick={() => setFilePreview({
                      name: cleanDecodedText(file.name),
                      url: resolvedUrl,
                      sizeBytes: file.sizeBytes,
                      contentType: file.contentType,
                    })}
                    style={{ cursor: 'pointer' }}
                    title={`Visualizar ${cleanDecodedText(file.name)}`}
                    role="button"
                    tabIndex={0}
                  >
                    {file.contentType.startsWith('image/') ? <img src={resolvedUrl} alt="" /> : <FileText size={36} />}
                  </div>
                  <div
                    className="project-file-info"
                    onClick={() => setFilePreview({
                      name: cleanDecodedText(file.name),
                      url: resolvedUrl,
                      sizeBytes: file.sizeBytes,
                      contentType: file.contentType,
                    })}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                  >
                    <span title={cleanDecodedText(file.name)}>{cleanDecodedText(file.name)}</span>
                    <small>{Math.max(1, Math.round(file.sizeBytes / 1024))} KB</small>
                  </div>
                  <div className="project-file-actions">
                    <button
                      type="button"
                      className="project-file-action-btn"
                      onClick={() => setFilePreview({
                        name: cleanDecodedText(file.name),
                        url: resolvedUrl,
                        sizeBytes: file.sizeBytes,
                        contentType: file.contentType,
                      })}
                      title="Abrir visualização"
                      aria-label={`Visualizar ${cleanDecodedText(file.name)}`}
                    >
                      <Eye size={15} />
                    </button>
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Baixar ${cleanDecodedText(file.name)}`}
                      download={cleanDecodedText(file.name)}
                      className="project-file-action-btn"
                      title="Baixar arquivo"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                </article>
              )
            })}
          </div> : deliveryGroups.length === 0 ? <div className="project-gallery-empty">Nenhum arquivo enviado neste projeto.</div> : null)}
        </section>
      )}

      {reviewing !== null && (() => {
        const targetDelivery = designList.find((item) => item.id === reviewing)
        if (!targetDelivery) return null
        const targetBase = getBaseMaterialName(targetDelivery.name) || cleanDecodedText(targetDelivery.name).toLowerCase().trim()
        const targetKey = targetDelivery.taskId ? `task-${targetDelivery.taskId}-${targetBase}` : `name-${targetBase}`
        const siblingVersions = designList.filter((item) => {
          const itemBase = getBaseMaterialName(item.name) || cleanDecodedText(item.name).toLowerCase().trim()
          const itemKey = item.taskId ? `task-${item.taskId}-${itemBase}` : `name-${itemBase}`
          return itemKey === targetKey
        }).sort((a, b) => {
          return parseVersionNum(b.version) - parseVersionNum(a.version) || b.id - a.id
        })

        const relatedTask = targetDelivery.taskId ? projectTasks.find((t) => t.id === targetDelivery.taskId) : null
        const isTaskInAlteracao = (relatedTask?.status as string) === 'Alteração' || (relatedTask?.delivery as string) === 'Em alteração'
        const targetGroup = deliveryGroups.find((group) => group.materials.some((material) => material.versions.some((version) => version.id === reviewing)))
        const collectionItems: ReviewCollectionItem[] = targetGroup?.collectionType ? targetGroup.materials.map((material, index) => ({
          label: relatedTask?.briefing?.deliverySchema?.items?.[index]?.label || `Card ${index + 1}`,
          delivery: material.latest,
          versions: material.versions,
        })) : []

        return (
          <DesignReviewModal
            delivery={targetDelivery}
            versions={siblingVersions}
            collectionTitle={targetGroup?.collectionType ? targetGroup.title : undefined}
            collectionLabel={targetGroup?.collectionType ? collectionTypeLabel(targetGroup.collectionType) : undefined}
            collectionItems={collectionItems}
            approvedIds={approved}
            isApproved={approved.includes(reviewing)}
            projectCompleted={projectCompleted}
            isAlteracao={isTaskInAlteracao}
            taskStatus={relatedTask?.status}
            origin={reviewOrigin}
            notify={notify}
            onApprovalChange={(nextApproved, feedback, targetId, scope) => handleApprovalChange(targetId || reviewing, nextApproved, feedback, scope)}
            onRequestChanges={(targetId, notes) => handleRequestChanges(targetId || reviewing, notes)}
            onClose={closeReview}
          />
        )
      })()}

      {filePreview && (
        <FilePreviewModal
          file={filePreview}
          onClose={() => setFilePreview(null)}
        />
      )}
    </div>
  )
}
