import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, type ProjectWithTasks } from '../AppContext'
import { figmaAsset } from '../assets/figma'

type AssetName = Parameters<typeof figmaAsset>[0]

const suggestions: Array<{ label: string; asset: AssetName }> = [
  { label: 'Sobre a Allyo (8)', asset: 'home.imgGroup3' },
  { label: 'Insights do projeto', asset: 'home.imgVector11' },
  { label: 'Elaborar um briefing', asset: 'home.imgVector12' },
]

function FigmaIcon({ asset, className = '' }: { asset: AssetName; className?: string }) {
  return <img className={className} src={figmaAsset(asset)} alt="" />
}

function DesignDelivery({ state }: { state: string }) {
  return (
    <div className="home-delivery">
      <img src={figmaAsset('home.imgRectangle161124126')} alt="Prévia do design entregue" />
      <span><strong>DESIGN ENTREGUE</strong><small>{state}</small></span>
      <time>1h</time>
    </div>
  )
}

export function HomePage() {
  const { projects, currentUser, workspace, members, notify } = useApp()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')

  const tasks = useMemo(() => {
    return projects.flatMap((p) => {
      const pWithTasks = p as ProjectWithTasks
      const list = pWithTasks.tasksList || []
      return list.map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
    })
  }, [projects])

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'você'

  const hoursEstimated = workspace?.hoursEstimated ?? 120
  const hoursUsed = workspace?.hoursUsed ?? 0
  const availableHours = Math.max(0, Math.round(hoursEstimated - hoursUsed))
  const percentUsed = Math.min(100, Math.round((hoursUsed / (hoursEstimated || 1)) * 100))

  const submitPrompt = (event: React.FormEvent) => {
    event.preventDefault()
    if (!prompt.trim()) return
    notify('A Allyo começou a preparar sua solicitação')
    setPrompt('')
  }

  return (
    <div className="page home-page" data-node-id="1:16">
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

          <div className="home-suggestions">
            <span className="suggestion-label">Sugestões de prompts:</span>
            <div className="prompt-suggestions">
              {suggestions.map(({ label, asset }) => (
                <button key={label} onClick={() => setPrompt(label.replace(' (8)', ''))}>
                  <FigmaIcon asset={asset} />
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>

        <small className="hero-credit">Ilustração por {currentUser?.name || 'Allyo Creative'}, Allyo Creative</small>
      </section>

      <h2 className="home-section-title">Vamos começar</h2>

      <div className="home-dashboard-grid">
        <div className="home-dashboard-main">
          <section className="home-card home-tasks-card">
            <header className="home-card__header">
              <h2>Suas tarefas</h2>
              <span className="home-task-count">{tasks.length}</span>
            </header>

            <div className="home-task-list">
              {tasks.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8e8e93' }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#f2f2f7' }}>Nenhuma tarefa pendente</p>
                  <small style={{ display: 'block', marginTop: '6px', color: '#8e8e93' }}>
                    Tarefas criadas nos seus projetos aparecerão aqui.
                  </small>
                </div>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    className="home-notification"
                    onClick={() => navigate(`/projetos/${task.projectId}`)}
                  >
                    <FigmaIcon asset="home.imgGroup4" className="home-notification__icon" />
                    <span>
                      <strong>{task.title}</strong>
                      <small>Projeto: {task.projectName} · {task.team}</small>
                    </span>
                    <b className={task.status === 'Concluído' ? 'is-done' : 'is-progress'}>{task.status}</b>
                    {task.delivery && <DesignDelivery state={task.delivery} />}
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
                projects.map((project) => (
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
                      <b className={project.status === 'Concluído' ? 'is-done' : 'is-progress'}>{project.status}</b>
                    </span>

                    <span className="home-delivery-spacer" />
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
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#d7ff70', fontSize: '12px', cursor: 'pointer' }}
                onClick={() => navigate('/conta')}
              >
                + Gerenciar
              </button>
            </header>
            <div className="home-team-list">
              {members.length === 0 ? (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: '#8e8e93' }}>
                  <small>Nenhum colaborador adicionado ainda.</small>
                </div>
              ) : (
                members.map((member) => {
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
            <section className="home-allocation-card home-allocation-card--subscription">
              <header><FigmaIcon asset="home.imgGroup1410119714" /><h2>Assinatura</h2></header>
              <div className="home-allocation-progress"><i style={{ width: `${percentUsed}%` }} /></div>
              <footer><span>Disponível</span><strong>{availableHours} <FigmaIcon asset="home.imgBasilArrowRightOutline" /> {hoursEstimated}</strong></footer>
            </section>

            <section className="home-allocation-card">
              <header><i className="home-team-color home-team-color--design" /><h2>Design Team</h2></header>
              <footer><span>Usado</span><strong>{hoursUsed > 0 ? Math.round(hoursUsed * 0.6) : 0}</strong></footer>
            </section>

            <section className="home-allocation-card">
              <header><i className="home-team-color home-team-color--sales" /><h2>Sales Team</h2></header>
              <footer><span>Usado</span><strong>{hoursUsed > 0 ? Math.round(hoursUsed * 0.4) : 0}</strong></footer>
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}
