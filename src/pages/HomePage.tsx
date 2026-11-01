import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Link2 } from 'lucide-react'
import { useApp, type ProjectWithTasks } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { StatusPill } from '../components/StatusPill'
import { AllyoBriefStudio } from '../components/briefStudio/AllyoBriefStudio'
import { api, type ClientDashboardSummary } from '../services/api'

type AssetName = Parameters<typeof figmaAsset>[0]

const recentTimestamp = (item: { updatedAt?: string; createdAt?: string }) => new Date(item.updatedAt || item.createdAt || 0).getTime() || 0

const suggestions: Array<{ label: string; asset: AssetName }> = [
  { label: 'Sobre a Allyo (8)', asset: 'home.imgGroup3' },
  { label: 'Insights do projeto', asset: 'home.imgVector11' },
  { label: 'Elaborar um briefing', asset: 'home.imgVector12' },
]

function FigmaIcon({ asset, className = '' }: { asset: AssetName; className?: string }) {
  return <img className={className} src={figmaAsset(asset)} alt="" />
}

export function HomePage() {
  const { projects, currentUser, account, allyoTeam, notify } = useApp()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [linkedRefProjectId, setLinkedRefProjectId] = useState('')
  const [activeStudioPrompt, setActiveStudioPrompt] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<ClientDashboardSummary | null>(null)

  const projectTasks = useMemo(() => {
    return projects.flatMap((p) => {
      const pWithTasks = p as ProjectWithTasks
      const list = pWithTasks.tasksList || []
      return list
        .filter((task) => task.status !== 'Concluído' || task.delivery === 'Aguardando aprovação')
        .map((task) => ({ ...task, projectName: p.name, projectId: p.id, reviewDesignId: null as number | null }))
    })
  }, [projects])

  useEffect(() => {
    let active = true
    api.getClientDashboard().then((summary) => {
      if (active) setDashboard(summary)
    }).catch(() => {
      // A lista de projetos continua sendo usada como fallback offline.
    })
    return () => { active = false }
  }, [])

  const tasks = useMemo(() => {
    if (!dashboard) return [...projectTasks].sort((left, right) => recentTimestamp(right) - recentTimestamp(left)).slice(0, 5)
    const liveTasks = new Map(projectTasks.map((task) => [task.id, task]))
    return dashboard.tasks.map((task) => {
      const liveTask = liveTasks.get(task.id)
      return liveTask ? {
        ...task,
        status: liveTask.status,
        delivery: liveTask.delivery,
        team: liveTask.team,
        assignee: liveTask.assignee,
        assigneeName: liveTask.assigneeName,
        assigneeRole: liveTask.assigneeRole,
      } : task
    }).sort((left, right) => recentTimestamp(right) - recentTimestamp(left)).slice(0, 5)
  }, [dashboard, projectTasks])
  const totalTaskCount = dashboard?.metrics.queueCount ?? projectTasks.length
  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'você'

  const availableCredits = account?.workspace.creditsAvailable ?? 0
  const creditsUsed = account?.workspace.creditsUsed ?? 0
  const teams = account?.teams ?? []
  const totalCredits = Math.max(0, availableCredits + creditsUsed)
  const percentAvailable = totalCredits > 0 ? Math.min(100, Math.round((availableCredits / totalCredits) * 100)) : 0

  const submitPrompt = (event: React.FormEvent) => {
    event.preventDefault()
    if (!prompt.trim()) return
    setActiveStudioPrompt(prompt.trim())
  }

  const handleSuggestionClick = (label: string) => {
    const cleanLabel = label.replace(' (8)', '').trim()
    if (cleanLabel === 'Elaborar um briefing') {
      const text = prompt.trim() || 'Me ajude a escrever o briefing para novos anúncios de redes sociais com variações de copy'
      setPrompt(text)
      setActiveStudioPrompt(text)
      return
    }
    setActiveStudioPrompt(cleanLabel)
  }

  return (
    <div className="page home-page" data-node-id="1:16">
      {activeStudioPrompt ? (
        <AllyoBriefStudio
          initialPrompt={activeStudioPrompt}
          linkedProjectId={linkedRefProjectId || undefined}
          onClose={() => setActiveStudioPrompt(null)}
        />
      ) : (
        <section className="home-hero" data-node-id="9:12">
          <button className="home-catalog-link" onClick={() => navigate('/novo-projeto')}>
            Briefing do catálogo
            <FigmaIcon asset="home.imgEvaDiagonalArrowRightUpFill" />
          </button>

          <div className="home-hero__content">
            <h1>Vamos arrasar nessa campanha, {firstName}.</h1>

            <form className="prompt-box" onSubmit={submitPrompt}>
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="O que eu posso fazer por você?"
                aria-label="Converse com a Allyo"
              />
              <button type="button" className="prompt-mic" aria-label="Usar microfone">
                <FigmaIcon asset="home.imgGroup2" />
              </button>
              <button type="submit" className="prompt-send" disabled={!prompt.trim()} aria-label="Enviar">
                <FigmaIcon asset="home.imgFrame1410119641" />
              </button>
            </form>

            {projects.length > 0 && (
              <div className="home-prompt-context-row">
                <label className="home-prompt-ref-select" title="Usar a identidade visual e referência de um projeto existente">
                  <Link2 size={13} />
                  <select
                    value={linkedRefProjectId}
                    onChange={(event) => setLinkedRefProjectId(event.target.value)}
                  >
                    <option value="">Seguir linha visual de um projeto (opcional)...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        Seguir referência: {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="home-suggestions">
              <span className="suggestion-label">Sugestões de prompts:</span>
              <div className="prompt-suggestions">
                {suggestions.map(({ label, asset }) => (
                  <button key={label} type="button" onClick={() => handleSuggestionClick(label)}>
                    <FigmaIcon asset={asset} />
                    <strong>{label}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <small className="hero-credit">Ilustração por {currentUser?.name || 'Allyo Creative'}, Allyo Creative</small>
        </section>
      )}

      <h2 className="home-section-title">Vamos começar</h2>

      <div className="home-dashboard-grid">
        <div className="home-dashboard-main">
          <section className="home-card home-tasks-card">
            <header className="home-card__header">
              <h2>Suas tarefas</h2>
              <div className="home-task-header-metrics">
                {totalTaskCount > 0 && <span className="home-task-count">{totalTaskCount}</span>}
              </div>
            </header>

            <div className="home-task-list">
              {tasks.length === 0 ? (
                <div className="home-task-empty">
                  <p>Nenhuma tarefa pendente</p>
                  <small>
                    Tarefas criadas nos seus projetos aparecerão aqui.
                  </small>
                </div>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    className="home-notification"
                    onClick={() => navigate(`/projetos/${task.projectId}${task.reviewDesignId ? '/entregas' : ''}`)}
                  >
                    <span>
                      <strong>{task.title}</strong>
                      <small>Projeto: {task.projectName} · {task.team}</small>
                    </span>
                    <span className="home-task-state"><StatusPill status={task.status} />{task.delivery && <small>{task.delivery === 'Aguardando aprovação' ? 'Avaliar entrega' : task.delivery}</small>}</span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="home-card home-open-projects">
            <header className="home-card__header"><h2>Projetos abertos</h2></header>
            <div className="home-project-rows">
              {projects.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#f2f2f7' }}>Nenhum projeto em andamento</p>
                  <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#8e8e93' }}>Você ainda não possui projetos nesta conta.</p>
                </div>
              ) : (
                [...projects].sort((left, right) => recentTimestamp(right) - recentTimestamp(left)).slice(0, 5).map((project) => (
                  <button
                    key={project.id}
                    className="home-project-row home-project-row--project"
                    onClick={() => navigate(`/projetos/${project.id}`)}
                  >
                    <span className="home-project-row__name home-project-row__name--project">
                      <FigmaIcon asset="home.imgVector13" />
                      <FigmaIcon asset="home.imgVector14" />
                      <strong>{project.name}</strong>
                      <small>{project.tasks || (project as ProjectWithTasks).tasksList?.length || 0}</small>
                    </span>

                    <span className="home-project-row__meta">
                      <small>com prazo de {project.deadline || 'A definir'}</small>
                      <StatusPill status={project.status} />
                    </span>

                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="home-dashboard-aside">
          <section className="home-card home-team-card">
            <header className="home-card__header">
              <h2>Sua equipe Allyo</h2>
            </header>
            <div className="home-team-list">
              {allyoTeam.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#8e8e93' }}>
                  <small>A equipe criativa responsável por sua conta ainda não foi definida.</small>
                </div>
              ) : (
                allyoTeam.map((member) => {
                  const memberFirst = member.name.split(' ')[0]
                  return (
                    <div className="home-team-member" key={member.id}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: member.avatarColor || '#d7ff70',
                          color: '#111',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {member.avatarInitials || memberFirst.slice(0, 2).toUpperCase()}
                      </span>
                      <span><strong>{member.name}</strong><small>{member.jobTitle || (member.role === 'ADMIN' ? 'Administrador' : 'Membro')}</small></span>
                      <button onClick={() => notify(`Conversa com ${memberFirst} aberta`)}>
                        <FigmaIcon asset="home.imgOcticonPlay16" />
                        Falar com {memberFirst}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          <div className="home-allocation-stack">
            <section
              className="home-allocation-card home-allocation-card--subscription is-clickable"
              role="link"
              tabIndex={0}
              aria-label="Abrir créditos da conta"
              onClick={() => navigate('/conta?tab=creditos')}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('/conta?tab=creditos') }}
            >
              <header><FigmaIcon asset="home.imgGroup1410119714" /><h2>Assinatura</h2><ChevronRight className="home-allocation-card__arrow" size={20} /></header>
              <div className="home-allocation-progress" title={`${availableCredits} de ${totalCredits} créditos disponíveis`}><i style={{ width: `${percentAvailable}%` }} /></div>
              <footer><span>Disponível</span><strong>{availableCredits} de {totalCredits} créditos</strong></footer>
            </section>

            {teams.map((team) => <section className="home-allocation-card" key={team.id}>
              <header><i className="home-team-color" style={{ background: team.color }} /><h2>{team.name}</h2></header>
              <footer><span>Usado</span><strong>{team.creditsUsed}</strong></footer>
            </section>)}
          </div>
        </aside>
      </div>
    </div>
  )
}
