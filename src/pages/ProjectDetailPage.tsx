import { useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { DesignReviewModal, type ReviewOrigin } from '../components/DesignReviewModal'
import { api } from '../services/api'
import { socket, type SocketEventPayload } from '../services/socket'

const designs = [
  { id: 1, name: 'Key visual • Conceito B', version: 'v3', color: '#d7ff70', approved: false },
  { id: 2, name: 'Post Instagram • 1080×1350', version: 'v2', color: '#ff917b', approved: true },
  { id: 3, name: 'Story • 1080×1920', version: 'v1', color: '#9ea8ff', approved: false },
  { id: 4, name: 'LinkedIn • 1200×627', version: 'v1', color: '#74d9c7', approved: false },
]

const timelineEvents = [
  { left: '1%', time: '9:00h', lines: ['Briefing enviado'] },
  { left: '17%', time: '14:00h', lines: ['Iniciou o projeto'] },
  { left: '33.5%', time: '17:00h', lines: ['Primeira versão', 'do banner'] },
  { left: '50%', time: '17:00h', lines: ['Primeira versão', 'da imagem', 'gerada por IA'], clock: true },
  { left: '66%', time: '2:00h', lines: ['Primeira versão da', 'grade de conteúdo'], clock: true },
  { left: '82%', time: '7:00h', lines: ['Primeira versão', 'do rodapé'] },
]

const messageTools = [
  { asset: 'messages.imgOcticonBold16' as const, label: 'Negrito' },
  { asset: 'messages.imgTablerItalic' as const, label: 'Itálico' },
  { asset: 'messages.imgMaterialSymbolsListRounded' as const, label: 'Lista' },
  { asset: 'messages.imgLineMdLink' as const, label: 'Adicionar link' },
  { asset: 'messages.imgGroup2' as const, label: 'Emoji' },
  { asset: 'messages.imgIconamoonAttachmentFill' as const, label: 'Anexar arquivo' },
  { asset: 'messages.imgGroup3' as const, label: 'Mencionar pessoa' },
]

function OverviewTimeline() {
  return (
    <article className="overview-timeline-card">
      <h2>Timeline</h2>
      <span className="overview-timeline-month">OUTUBRO</span>
      <div className="overview-timeline-viewport">
        <div className="overview-timeline-plot">
          <div className="overview-timeline-labels" aria-hidden="true">
            <span><b>25</b> Seg<small>9h</small></span>
            <span><b>13h</b></span>
            <span><b>17h</b></span>
            <span><b>19h</b></span>
            <span><b>26</b> Ter<small>9h</small></span>
            <span><b>5h</b></span>
            <span><b>26</b><small>9h</small></span>
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
            {timelineEvents.map((event) => (
              <div className={`overview-timeline-event${event.clock ? ' has-clock' : ''}`} style={{ left: event.left }} key={`${event.time}-${event.left}`}>
                <strong>{event.time}</strong>
                <span>{event.lines.map((line) => <span key={line}>{line}</span>)}</span>
                {event.clock && <img src={figmaAsset('overview.imgGroup2')} alt="Prazo cronometrado" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function ProjectBriefing({ onDuplicate }: { onDuplicate: () => void }) {
  return (
    <article className="project-briefing-card">
      <header>
        <div>
          <h2>Briefing do projeto</h2>
          <p>data de entrega 27 de outubro de 2026 às 14:00h <b>•</b> Projeto de mais de 12 horas</p>
        </div>
        <button onClick={onDuplicate}>duplicar briefing do projeto</button>
      </header>
      <img className="project-briefing-divider" src={figmaAsset('overview.imgLine29')} alt="" />
      <section>
        <h3>Visão geral do projeto</h3>
        <p>Lorem ipsum dolor sit amet consectetur. Libero duis habitant ullamcorper nisl fringilla dis pellentesque morbi. Consequat quis in turpis urna. Risus hac egestas ut massa. In nisl pulvinar ac hendrerit.</p>
      </section>
      <section>
        <h3>Entregável</h3>
        <ol>
          <li>3 peças criativas estáticas para anúncios no LinkedIn</li>
          <li>1 anúncio em vídeo curto para o LinkedIn (15 a 30 segundos)</li>
          <li>Variações de texto de anúncio (título + corpo) para testes A/B</li>
        </ol>
      </section>
      <section>
        <h3>Formatos</h3>
        <ol>
          <li>Estáticos: 1200 x 637 px (Formato de anúncio de imagem única do LinkedIn)</li>
          <li>Video: Proporção 1:1 ou 16:9, máx. 30s, com legendas</li>
          <li>Copy: Headlines (max 70 caracteres), Body (max 150 caracteres)</li>
        </ol>
      </section>
      <section>
        <h3>Direção criativa</h3>
        <ol>
          <li>Visual limpo, moderno e focado na interface</li>
          <li>indícios sutis de movimento/interação (para o vídeo)</li>
          <li>Paleta de cores alinhada à marca (use detalhes vibrantes para atrair a atenção)</li>
          <li>Ênfase em clareza, profissionalismo e inovação</li>
        </ol>
      </section>
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
  const { projects, currentUser, createTask, toggleTaskStatus, notify } = useApp()
  const project = useMemo(() => projects.find((item) => item.id === id), [id, projects])
  const [messageList, setMessageList] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [approved, setApproved] = useState<number[]>(designs.filter((item) => item.approved).map((item) => item.id))
  const [reviewing, setReviewing] = useState<number | null>(null)
  const [reviewOrigin, setReviewOrigin] = useState<ReviewOrigin | null>(null)

  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTeam, setNewTaskTeam] = useState('Design team')
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)

  useEffect(() => {
    if (!project) return
    let isMounted = true

    api.getMessages(project.id)
      .then((serverMessages) => {
        if (isMounted && serverMessages) {
          setMessageList(serverMessages)
        }
      })
      .catch(() => {})

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
      await createTask(project.id, newTaskTitle.trim(), newTaskTeam)
      setNewTaskTitle('')
    } finally {
      setIsSubmittingTask(false)
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

  const projectTasks = (project as { tasksList?: Array<{ id: string; title: string; team: string; status: 'Concluído' | 'Em andamento' }> }).tasksList || []

  return (
    <div className={`page project-detail-page project-detail-page--${tab}`}>
      <header className="project-compact-header">
        <h1>{project.name}</h1>
        <span className="project-compact-deadline">com prazo de <strong>{project.deadline || 'A definir'}</strong></span>
        <span className="project-compact-status">{project.status}</span>
      </header>

      <nav className="project-detail-tabs">
        <NavLink to={`/projetos/${project.id}/visao-geral`} className={tab === 'visao-geral' ? 'active' : ''}>Visão geral</NavLink>
        <NavLink to={`/projetos/${project.id}/mensagens`} className={tab === 'mensagens' ? 'active' : ''}>Mensagens</NavLink>
        <NavLink to={`/projetos/${project.id}/designs`} className={tab === 'designs' ? 'active' : ''}>Designs</NavLink>
      </nav>

      {tab === 'visao-geral' && (
        <section className="project-overview">
          {/* Tarefas e Demandas do Projeto */}
          <article className="project-briefing-card" style={{ marginBottom: 24 }}>
            <header>
              <div>
                <h2>Tarefas do projeto ({projectTasks.length})</h2>
                <p>Gerencie as entregas e marcos deste projeto em tempo real no banco de dados.</p>
              </div>
            </header>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: 10, marginTop: 16, marginBottom: 16 }}>
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nome da nova tarefa (ex: Criação do Key Visual)..."
                style={{
                  flex: 1,
                  background: 'var(--color-bg-secondary, #1c1c1e)',
                  border: '1px solid var(--color-border, #2c2c2e)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: 14,
                }}
              />
              <select
                value={newTaskTeam}
                onChange={(e) => setNewTaskTeam(e.target.value)}
                style={{
                  background: 'var(--color-bg-secondary, #1c1c1e)',
                  border: '1px solid var(--color-border, #2c2c2e)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: 14,
                }}
              >
                <option value="Design team">Design team</option>
                <option value="Copy team">Copy team</option>
                <option value="Video team">Video team</option>
                <option value="Dev team">Dev team</option>
              </select>
              <button
                type="submit"
                disabled={!newTaskTitle.trim() || isSubmittingTask}
                style={{
                  background: 'var(--color-primary, #d7ff70)',
                  color: '#111',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  opacity: !newTaskTitle.trim() || isSubmittingTask ? 0.5 : 1,
                }}
              >
                + Adicionar Tarefa
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projectTasks.length === 0 ? (
                <p style={{ color: '#8e8e93', fontSize: 14, margin: '8px 0' }}>
                  Nenhuma tarefa cadastrada ainda. Use o formulário acima para criar sua primeira tarefa!
                </p>
              ) : (
                projectTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTaskStatus(project.id, t.id, t.status)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--color-bg-surface, #141416)',
                      borderRadius: 8,
                      border: '1px solid var(--color-border, #2c2c2e)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          border: `2px solid ${t.status === 'Concluído' ? '#d7ff70' : '#636366'}`,
                          background: t.status === 'Concluído' ? '#d7ff70' : 'transparent',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#111',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {t.status === 'Concluído' ? '✓' : ''}
                      </span>
                      <strong style={{ color: '#fff', textDecoration: t.status === 'Concluído' ? 'line-through' : 'none' }}>
                        {t.title}
                      </strong>
                      <small style={{ color: '#8e8e93' }}>({t.team})</small>
                    </div>
                    <b className={t.status === 'Concluído' ? 'is-done' : 'is-progress'}>{t.status}</b>
                  </div>
                ))
              )}
            </div>
          </article>

          <OverviewTimeline />
          <ProjectBriefing onDuplicate={() => notify('Briefing duplicado com sucesso')} />
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
                {messageTools.map((tool) => <button type="button" aria-label={tool.label} key={tool.label}><img src={figmaAsset(tool.asset)} alt="" /></button>)}
              </div>
              <button type="submit" className="project-message-send"><img src={figmaAsset('messages.imgGroup4')} alt="" />Enviar</button>
            </footer>
          </form>
        </section>
      )}

      {(tab === 'designs' || tab === 'arquivos') && (
        <section className="project-designs-gallery">
          <h2 className="project-visually-hidden">{tab === 'arquivos' ? 'Arquivos do projeto' : 'Designs para revisão'}</h2>
          <div className="project-designs-grid">
            {designs.map((design) => {
              const isApproved = approved.includes(design.id)
              return <article key={design.id} className="project-design-tile"><header><span>no...vo.jpg</span><b className={isApproved ? 'is-approved' : ''}>{isApproved ? 'Aprovado' : 'Aguardando aprovação'}</b></header><button onClick={(event) => openReview(design.id, event.currentTarget)} aria-label={`Abrir ${design.name}`}><img src={figmaAsset('designs.imgImage8')} alt={design.name} /><span><ExternalLink size={15} /> Abrir</span></button></article>
            })}
          </div>
        </section>
      )}

      {reviewing !== null && <DesignReviewModal
        designTitle={designs.find((item) => item.id === reviewing)?.name ?? 'Design'}
        initialVersion={Number((designs.find((item) => item.id === reviewing)?.version ?? 'v3').slice(1))}
        isApproved={approved.includes(reviewing)}
        origin={reviewOrigin}
        notify={notify}
        onApprovalChange={(nextApproved) => handleApprovalChange(reviewing, nextApproved)}
        onClose={closeReview}
      />}
    </div>
  )
}
