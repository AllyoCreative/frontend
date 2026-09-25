import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Circle, Download, ExternalLink, FileText, Layers3, Pencil, Plus, Upload } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { DesignReviewModal, type ReviewOrigin } from '../components/DesignReviewModal'
import { api, type DesignSummary, type ProjectBriefingSummary, type ProjectFileSummary } from '../services/api'
import { socket, type SocketEventPayload } from '../services/socket'
import type { Project, ProjectTask, TaskBriefing } from '../types'

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
    if (designCreatedAt) events.push({ id: `design-${design.id}`, date: designCreatedAt, title: design.name, detail: `${design.version} enviada para revisão`, completed: design.approved })
  })

  if (updatedAt && createdAt && updatedAt.getTime() - createdAt.getTime() > 1_000) {
    events.push({ id: 'project-updated', date: updatedAt, title: `Projeto ${project.status.toLowerCase()}`, detail: `${project.progress}% do projeto concluído`, completed: project.status === 'Concluído' })
  }

  return events.sort((left, right) => left.date.getTime() - right.date.getTime()).slice(-12)
}

function OverviewTimeline({ project, tasks, designs }: { project: Project; tasks: ProjectTask[]; designs: DesignSummary[] }) {
  const events = projectTimeline(project, tasks, designs).slice(-6)
  const positions = ['1%', '17%', '33.5%', '50%', '66%', '82%']
  const labelDates = [...events.map((event) => event.date), validDate(project.updatedAt) || new Date()].slice(0, 7)
  const month = (events[0]?.date || validDate(project.createdAt) || new Date()).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()
  return (
    <article className="overview-timeline-card">
      <h2>Timeline</h2>
      <span className="overview-timeline-month">{month}</span>
      <div className="overview-timeline-viewport">
        <div className="overview-timeline-plot">
          <div className="overview-timeline-labels" aria-hidden="true">
            {labelDates.map((date, index) => <span key={`${date.toISOString()}-${index}`}>{index === 0 || index === labelDates.length - 1 ? <><b>{date.toLocaleDateString('pt-BR', { day: '2-digit' })}</b>{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}<small>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></> : <b>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b>}</span>)}
          </div>
          <div className="overview-timeline-track" aria-hidden="true">
            <span className="overview-timeline-endpoint overview-timeline-endpoint--start"><img src={figmaAsset('overview.imgLucideFlag')} alt="" /></span>
            <img className="timeline-line timeline-line--1" src={figmaAsset('overview.imgLine21')} alt="" />
            <img className="timeline-line timeline-line--2" src={figmaAsset('overview.imgLine22')} alt="" />
            <img className="timeline-line timeline-line--3" src={figmaAsset('overview.imgLine23')} alt="" />
            <img className="timeline-line timeline-line--4" src={figmaAsset('overview.imgLine25')} alt="" />
            <img className="timeline-line timeline-line--5" src={figmaAsset('overview.imgLine26')} alt="" />
            <img className="timeline-line timeline-line--6" src={figmaAsset('overview.imgLine27')} alt="" />
            <img className="timeline-line timeline-line--7" src={figmaAsset('overview.imgLine28')} alt="" />
            {['16.67%', '33.33%', '50%'].map((left) => <img key={left} className="timeline-node" style={{ left }} src={figmaAsset('overview.imgEllipse18')} alt="" />)}
            {['66.67%', '83.33%'].map((left) => <img key={left} className="timeline-node" style={{ left }} src={figmaAsset('overview.imgEllipse21')} alt="" />)}
            <img className="timeline-arrow" src={figmaAsset('overview.imgVector11')} alt="" />
            <span className="overview-timeline-endpoint overview-timeline-endpoint--finish"><img src={figmaAsset('overview.imgMaterialSymbolsRocketLaunchOutline')} alt="" /></span>
          </div>
          <div className="overview-timeline-events">
            {events.map((event, index) => <div className={`overview-timeline-event${event.completed ? '' : ' has-clock'}`} style={{ left: positions[index] }} key={event.id}><strong>{event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong><span><span>{event.title}</span><span>{event.detail}</span></span>{!event.completed && <img src={figmaAsset('overview.imgGroup2')} alt="Em andamento" />}</div>)}
          </div>
        </div>
      </div>
    </article>
  )
}

function ProjectBriefing({ project, briefing, files, onDuplicate }: { project: Project; briefing: ProjectBriefingSummary | null; files: ProjectFileSummary[]; onDuplicate: () => void }) {
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
        <button onClick={onDuplicate}>duplicar briefing do projeto</button>
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
      {(links.length > 0 || briefingFiles.length > 0) && <section className="project-briefing-references"><h3>Referências</h3><div>{links.map((link) => <a href={link} target="_blank" rel="noreferrer" key={link}><ExternalLink size={14} />{link}</a>)}{briefingFiles.map((file) => <a href={file.fileUrl} target="_blank" rel="noreferrer" key={file.id}><FileText size={14} />{file.name}</a>)}</div></section>}
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
}

export function ProjectDetailPage() {
  const { id = '', tab = 'visao-geral' } = useParams()
  const { projects, currentUser, createTask, notify } = useApp()
  const project = useMemo(() => projects.find((item) => item.id === id), [id, projects])
  const [messageList, setMessageList] = useState<ChatMessage[]>([])
  const [designList, setDesignList] = useState<DesignSummary[]>([])
  const [projectFiles, setProjectFiles] = useState<ProjectFileSummary[]>([])
  const [briefing, setBriefing] = useState<ProjectBriefingSummary | null>(null)
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([])
  const [loadedAssetsFor, setLoadedAssetsFor] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [draft, setDraft] = useState('')
  const [approved, setApproved] = useState<number[]>([])
  const [reviewing, setReviewing] = useState<number | null>(null)
  const [reviewOrigin, setReviewOrigin] = useState<ReviewOrigin | null>(null)
  const projectFileInputRef = useRef<HTMLInputElement>(null)

  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTeam, setNewTaskTeam] = useState('Design team')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskBriefingDraft, setTaskBriefingDraft] = useState<TaskBriefing | null>(null)
  const [savingTaskBriefing, setSavingTaskBriefing] = useState(false)

  useEffect(() => {
    if (!project) return
    let isMounted = true
    setProjectTasks(project.tasksList || [])

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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project || !newTaskTitle.trim()) return
    setIsSubmittingTask(true)
    try {
      const task = await createTask(project.id, newTaskTitle.trim(), newTaskTeam)
      setProjectTasks((current) => current.some((item) => item.id === task.id) ? current : [...current, task])
      setNewTaskTitle('')
      setShowTaskForm(false)
    } catch {
      // O contexto global já apresenta a mensagem de erro.
    } finally {
      setIsSubmittingTask(false)
    }
  }

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

  const handleApprovalChange = (designId: number, nextApproved: boolean) => {
    setApproved((current) => nextApproved ? (current.includes(designId) ? current : [...current, designId]) : current.filter((item) => item !== designId))
    api.setDesignApproval(designId, nextApproved).catch((err) => {
      console.warn('Failed to sync approval with backend:', err)
    })
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
        <span className="project-compact-deadline">com prazo de <strong>{project.deadline || 'A definir'}</strong></span>
        <span className="project-compact-status">{project.status}</span>
      </header>

      <nav className="project-detail-tabs">
        <NavLink to={`/projetos/${project.id}/visao-geral`} className={tab === 'visao-geral' ? 'active' : ''}>Visão geral</NavLink>
        <NavLink to={`/projetos/${project.id}/mensagens`} className={tab === 'mensagens' ? 'active' : ''}>Mensagens</NavLink>
        <NavLink to={`/projetos/${project.id}/designs`} className={tab === 'designs' ? 'active' : ''}>Designs</NavLink>
        <NavLink to={`/projetos/${project.id}/arquivos`} className={tab === 'arquivos' ? 'active' : ''}>Arquivos</NavLink>
      </nav>

      {tab === 'visao-geral' && (
        <section className="project-overview">
          {/* Tarefas e Demandas do Projeto */}
          <article className="project-briefing-card project-task-card">
            <header>
              <div>
                <h2>Stack do projeto ({projectTasks.length})</h2>
                <p>Cada tarefa é uma entrega independente, com ID, status e briefing próprios.</p>
              </div>
              <button className="project-task-add-trigger" type="button" onClick={() => setShowTaskForm((current) => !current)}><Plus size={15} /> Nova tarefa</button>
            </header>

            {showTaskForm && <form className="project-task-form" onSubmit={handleCreateTask}>
              <label className="project-task-field"><span>Nova tarefa</span><input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex.: Ajuste final do carrossel" /></label>
              <label className="project-task-field project-task-field--team"><span>Especialidade</span><select value={newTaskTeam} onChange={(e) => setNewTaskTeam(e.target.value)}>
                <option value="Design team">Design team</option>
                <option value="Copy team">Copy team</option>
                <option value="Video team">Video team</option>
                <option value="Dev team">Dev team</option>
              </select></label>
              <button className="project-task-submit" type="submit" disabled={!newTaskTitle.trim() || isSubmittingTask}><Plus size={15} />{isSubmittingTask ? 'Adicionando...' : 'Adicionar tarefa'}</button>
            </form>}

            <div className="project-task-stack">
              {projectTasks.length === 0 ? (
                <div className="project-task-empty"><Circle size={16} /><span>Nenhuma tarefa cadastrada neste projeto.</span></div>
              ) : (
                projectTasks.map((task, index) => {
                  const expanded = expandedTaskId === task.id
                  const editing = editingTaskId === task.id && taskBriefingDraft
                  return <article className="project-task-stack-item" key={task.id}>
                    <div className="project-task-stack-index"><span>{index + 1}</span>{index < projectTasks.length - 1 && <i />}</div>
                    <div className="project-task-stack-card">
                      <header>
                        <div className="project-task-stack-title"><span><Layers3 size={14} /> Tarefa #{task.publicId}</span><h3>{task.title}</h3><p>{task.team} · prazo estimado de {task.deadlineDays || 2} dias úteis</p></div>
                        <span className={`project-task-status project-task-status--${task.status.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{task.status}</span>
                      </header>
                      <p className="project-task-summary">{task.briefing?.objective || task.briefing?.overview || 'Briefing herdado do projeto.'}</p>
                      <footer>
                        <button type="button" onClick={() => setExpandedTaskId(expanded ? null : task.id)}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{expanded ? 'Ocultar briefing' : 'Ver briefing'}</button>
                        <button type="button" onClick={() => startEditingTaskBriefing(task)}><Pencil size={13} /> Personalizar briefing</button>
                        {task.briefing?.inheritedFromProject && <span>Herdado do projeto</span>}
                      </footer>
                      {expanded && <section className="project-task-briefing">
                        {editing ? <div className="project-task-briefing-editor">
                          <label><span>Objetivo desta tarefa</span><textarea value={taskBriefingDraft.objective || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, objective: event.target.value })} /></label>
                          <label><span>Contexto</span><textarea value={taskBriefingDraft.overview || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, overview: event.target.value })} /></label>
                          <div><label><span>Público</span><input value={taskBriefingDraft.audience || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, audience: event.target.value })} /></label><label><span>Tom</span><input value={taskBriefingDraft.tone || ''} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, tone: event.target.value })} /></label></div>
                          <label><span>Entregáveis, separados por vírgula</span><input value={taskBriefingDraft.deliverables.join(', ')} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, deliverables: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
                          <label><span>Formatos, separados por vírgula</span><input value={taskBriefingDraft.formats.join(', ')} onChange={(event) => setTaskBriefingDraft({ ...taskBriefingDraft, formats: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
                          <div className="project-task-briefing-editor__actions"><button type="button" onClick={() => { setEditingTaskId(null); setTaskBriefingDraft(null) }}>Cancelar</button><button type="button" disabled={savingTaskBriefing} onClick={() => void saveTaskBriefing(task)}>{savingTaskBriefing ? 'Salvando...' : 'Salvar briefing'}</button></div>
                        </div> : <div className="project-task-briefing-content">
                          <div><span>Objetivo</span><p>{task.briefing?.objective || 'Mesmo objetivo geral do projeto.'}</p></div>
                          {task.briefing?.overview && <div><span>Contexto</span><p>{task.briefing.overview}</p></div>}
                          <div className="project-task-briefing-grid"><div><span>Público</span><p>{task.briefing?.audience || 'Herdado do projeto'}</p></div><div><span>Tom</span><p>{task.briefing?.tone || 'Herdado do projeto'}</p></div></div>
                          {task.briefing?.deliverables?.length > 0 && <div><span>Entregáveis</span><div className="project-task-briefing-tags">{task.briefing.deliverables.map((item) => <b key={item}>{item}</b>)}</div></div>}
                          {task.briefing?.formats?.length > 0 && <div><span>Formatos</span><div className="project-task-briefing-tags">{task.briefing.formats.map((item) => <b key={item}>{item}</b>)}</div></div>}
                        </div>}
                      </section>}
                    </div>
                  </article>
                })
              )}
            </div>
          </article>

          <OverviewTimeline project={project} tasks={projectTasks} designs={designList} />
          <ProjectBriefing project={project} briefing={briefing} files={projectFiles} onDuplicate={() => notify('Briefing pronto para ser reutilizado em um novo projeto')} />
        </section>
      )}

      {tab === 'mensagens' && (
        <section className="project-messages">
          <div className="project-messages-feed">
            <div className="project-messages-date"><i /><span>Mensagens do projeto</span><i /></div>

            <article className="project-started-card">
              <header>
                <div><span>PROJETO</span><h2>{project.name}</h2></div>
                <time>{project.deadline || 'Prazo a definir'}</time>
              </header>
              <div className="project-started-metrics">
                <div><span>Horas estimadas</span><strong>12.00</strong><small>24.00</small></div>
                <div><span>Créditos</span><strong>1</strong><small><img src={figmaAsset('messages.imgMaterialSymbolsBoltBoostRounded')} alt="" />Normal</small></div>
                <div><span>Duração</span><strong>{project.deadline || '48 horas'}</strong></div>
                <div><span>Status</span><strong>{project.status}</strong></div>
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
                    <p>{msg.text}</p>
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

      {(tab === 'designs' || tab === 'arquivos') && (
        <section className="project-designs-gallery">
          <header className="project-assets-header">
            <div>
              <h2>{tab === 'arquivos' ? 'Arquivos do projeto' : 'Designs para revisão'}</h2>
              <p>{tab === 'arquivos' ? 'Documentos e imagens ficam salvos no armazenamento seguro do projeto.' : 'Entregas enviadas pela equipe para avaliação.'}</p>
            </div>
            {tab === 'arquivos' && <button className="secondary-button project-assets-upload" disabled={uploadingFile} onClick={() => projectFileInputRef.current?.click()}>
              <Upload size={16} /> {uploadingFile ? 'Enviando...' : 'Enviar arquivo'}
            </button>}
          </header>

          {loadingAssets && <div className="project-gallery-empty">Carregando arquivos...</div>}

          {!loadingAssets && tab === 'designs' && (designList.length > 0 ? <div className="project-designs-grid">
            {designList.map((design) => {
              const isApproved = approved.includes(design.id)
              const previewUrl = design.thumbnailUrl || design.fileUrl
              return <article key={design.id} className="project-design-tile">
                <header><span>{design.name}</span><b className={isApproved ? 'is-approved' : ''}>{isApproved ? 'Aprovado' : 'Aguardando aprovação'}</b></header>
                <button onClick={(event) => openReview(design.id, event.currentTarget)} aria-label={`Abrir ${design.name}`}>
                  {previewUrl ? <img src={previewUrl} alt={design.name} /> : <span className="project-file-placeholder"><FileText size={34} /> Prévia indisponível</span>}
                  <span className="project-design-open"><ExternalLink size={15} /> Abrir</span>
                </button>
              </article>
            })}
          </div> : <div className="project-gallery-empty">Nenhum design foi enviado para revisão ainda.</div>)}

          {!loadingAssets && tab === 'arquivos' && (projectFiles.length > 0 ? <div className="project-files-grid">
            {projectFiles.map((file) => <article key={file.id} className="project-file-card">
              <div className="project-file-preview">
                {file.contentType.startsWith('image/') ? <img src={file.fileUrl} alt="" /> : <FileText size={36} />}
              </div>
              <div className="project-file-info">
                <span title={file.name}>{file.name}</span>
                <small>{Math.max(1, Math.round(file.sizeBytes / 1024))} KB</small>
              </div>
              <a href={file.fileUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${file.name}`}><Download size={17} /></a>
            </article>)}
          </div> : <div className="project-gallery-empty">Nenhum arquivo enviado neste projeto.</div>)}
        </section>
      )}

      {reviewing !== null && <DesignReviewModal
        designTitle={designList.find((item) => item.id === reviewing)?.name ?? 'Design'}
        initialVersion={Number((designList.find((item) => item.id === reviewing)?.version ?? 'v1').slice(1))}
        isApproved={approved.includes(reviewing)}
        origin={reviewOrigin}
        notify={notify}
        onApprovalChange={(nextApproved) => handleApprovalChange(reviewing, nextApproved)}
        onClose={closeReview}
      />}
    </div>
  )
}
