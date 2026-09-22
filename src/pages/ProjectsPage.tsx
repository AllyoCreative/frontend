import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import type { Project, ProjectStatus } from '../types'

type AssetName = Parameters<typeof figmaAsset>[0]

interface ProjectTask {
  status: 'Concluído' | 'Em andamento'
  delivery?: 'Aprovado' | 'Aguardando aprovação'
}

type ProjectsView = 'list' | 'calendar'

const monthNumbers: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
}

const weekDayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function deadlineDate(deadline: string, today: Date): Date | null {
  if (deadline.toLocaleLowerCase('pt-BR') === 'hoje') return startOfDay(today)
  const match = deadline.trim().toLocaleLowerCase('pt-BR').match(/^(\d{1,2})\s+([a-zç]{3})$/)
  if (!match) return null
  const month = monthNumbers[match[2]]
  if (month === undefined) return null
  return new Date(today.getFullYear(), month, Number(match[1]))
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function monthCalendarDays(cursor: Date) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - mondayOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
}

function FigmaIcon({ asset, className = '' }: { asset: AssetName; className?: string }) {
  return <img className={className} src={figmaAsset(asset)} alt="" />
}

function FilterChip({ children, expandable = false, active = false, onClick }: {
  children: string
  expandable?: boolean
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button className={`projects-filter-chip ${active ? 'is-active' : ''}`} onClick={onClick}>
      {children}
      {expandable && <FigmaIcon asset="projects.imgWeuiArrowOutlined1" />}
    </button>
  )
}

function DeliveryCard({ state }: { state: 'Aprovado' | 'Aguardando aprovação' }) {
  return (
    <div className="projects-delivery">
      <img src={figmaAsset('projects.imgRectangle161124126')} alt="Prévia do design entregue" />
      <span><strong>DESIGN ENTREGUE</strong><small>{state}</small></span>
      <time>1h</time>
    </div>
  )
}

function ProjectStatusBadge({ status }: { status: ProjectStatus | 'Concluído' | 'Em andamento' }) {
  const isDone = status === 'Concluído'
  return <b className={isDone ? 'is-done' : 'is-progress'}>{isDone ? 'Concluído' : 'Em andamento'}</b>
}

function ProjectRow({ project, status }: { project: Project; status: 'Concluído' | 'Em andamento' }) {
  const navigate = useNavigate()

  return (
    <button className="projects-figma-row projects-figma-row--project project-card" onClick={() => navigate(`/projetos/${project.id}`)}>
      <span className="projects-row-name projects-row-name--project">
        <FigmaIcon asset="projects.imgVector11" />
        <FigmaIcon asset="projects.imgVector12" />
        <h3>{project.name}</h3>
        <small>3</small>
      </span>
      <span className="projects-row-meta">
        <small>com prazo de 6 dias</small>
        <ProjectStatusBadge status={status} />
      </span>
      <span className="projects-delivery-spacer" />
    </button>
  )
}

function TaskRow({ project, task, separated = false }: { project: Project; task: ProjectTask; separated?: boolean }) {
  const navigate = useNavigate()

  return (
    <button
      className={`projects-figma-row projects-figma-row--task ${separated ? 'is-separated' : ''}`}
      onClick={() => navigate(`/projetos/${project.id}`)}
    >
      <span className="projects-row-name">
        <strong>Nome da Tarefa</strong>
        <small><i /> Design team</small>
      </span>
      <span className="projects-row-meta">
        <small>com prazo de 2 dias</small>
        <ProjectStatusBadge status={task.status} />
      </span>
      {task.delivery ? <DeliveryCard state={task.delivery} /> : <span className="projects-delivery-spacer" />}
    </button>
  )
}

function ProjectGroup({ title, project, projectStatus, tasks }: {
  title: string
  project: Project
  projectStatus: 'Concluído' | 'Em andamento'
  tasks: ProjectTask[]
}) {
  return (
    <section className="projects-group">
      <button className="projects-group__heading">
        {title}
        <FigmaIcon asset="projects.imgWeuiArrowOutlined1" />
      </button>
      <div className="projects-group__rows">
        <ProjectRow project={project} status={projectStatus} />
        {tasks.map((task, index) => <TaskRow key={`${task.status}-${index}`} project={project} task={task} separated={index === 2} />)}
      </div>
    </section>
  )
}

function AllocationPanel() {
  const { workspace } = useApp()
  const hoursEstimated = workspace?.hoursEstimated ?? 120
  const hoursUsed = workspace?.hoursUsed ?? 0
  const availableHours = Math.max(0, Math.round(hoursEstimated - hoursUsed))
  const percentUsed = Math.min(100, Math.round((hoursUsed / (hoursEstimated || 1)) * 100))

  return (
    <aside className="home-allocation-stack projects-allocation-panel">
      <section className="home-allocation-card home-allocation-card--subscription">
        <header><FigmaIcon asset="projects.imgGroup1410119714" /><h2>Assinatura</h2></header>
        <div className="home-allocation-progress"><i style={{ width: `${percentUsed}%` }} /></div>
        <footer><span>Disponível</span><strong>{availableHours} <FigmaIcon asset="projects.imgBasilArrowRightOutline" /> {hoursEstimated}</strong></footer>
      </section>

      <section className="home-allocation-card">
        <header><i className="home-team-color home-team-color--design" /><h2>Design Team</h2></header>
        <footer><span>Usado</span><strong>{hoursUsed > 0 ? Math.round(hoursUsed * 0.6) : 0}</strong></footer>
      </section>

      <section className="home-allocation-card">
        <header><i className="home-team-color home-team-color--sales" /><h2>Sales Team</h2></header>
        <footer><span>Usado</span><strong>{hoursUsed > 0 ? Math.round(hoursUsed * 0.4) : 0}</strong></footer>
      </section>
    </aside>
  )
}

function ProjectsCalendar({ projects, cursor, showWeekends, onCursorChange, onShowWeekendsChange }: {
  projects: Project[]
  cursor: Date
  showWeekends: boolean
  onCursorChange: (date: Date) => void
  onShowWeekendsChange: (show: boolean) => void
}) {
  const navigate = useNavigate()
  const today = useMemo(() => startOfDay(new Date()), [])
  const days = useMemo(() => monthCalendarDays(cursor), [cursor])
  const datedProjects = useMemo(() => projects.flatMap((project) => {
    const date = deadlineDate(project.deadline, today)
    return date ? [{ project, date }] : []
  }), [projects, today])
  const unscheduledProjects = projects.filter((project) => !deadlineDate(project.deadline, today))
  const visibleDays = showWeekends ? days : days.filter((date) => date.getDay() !== 0 && date.getDay() !== 6)
  const visibleWeekDays = showWeekends ? weekDayNames : weekDayNames.slice(0, 5)
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(cursor)

  const changeMonth = (amount: number) => {
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1))
  }

  return (
    <section className="projects-calendar" aria-label={`Calendário de projetos de ${monthLabel}`}>
      <header className="projects-calendar__header">
        <div className="projects-calendar__navigation">
          <h2>{monthLabel}</h2>
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><ChevronLeft size={21} /></button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Próximo mês"><ChevronRight size={21} /></button>
          <button type="button" className="projects-calendar__today" onClick={() => onCursorChange(new Date(today.getFullYear(), today.getMonth(), 1))}>Hoje</button>
        </div>
        <label className="projects-calendar__weekends">
          <input type="checkbox" checked={showWeekends} onChange={(event) => onShowWeekendsChange(event.target.checked)} />
          <i aria-hidden="true" />
          <span>Finais de semana</span>
        </label>
      </header>

      <div className={`projects-calendar__grid${showWeekends ? ' has-weekends' : ''}`} role="grid" aria-label={monthLabel}>
        {visibleWeekDays.map((day) => <div className="projects-calendar__weekday" role="columnheader" key={day}>{day}</div>)}
        {visibleDays.map((date) => {
          const events = datedProjects.filter((entry) => dateKey(entry.date) === dateKey(date))
          const isToday = dateKey(date) === dateKey(today)
          const isOutsideMonth = date.getMonth() !== cursor.getMonth()
          return (
            <div className={`projects-calendar__day${isOutsideMonth ? ' is-outside' : ''}${isToday ? ' is-today' : ''}`} role="gridcell" aria-label={new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date)} key={dateKey(date)}>
              <time dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}>{date.getDate()}</time>
              <div className="projects-calendar__events">
                {events.map(({ project }) => (
                  <button
                    type="button"
                    className={`projects-calendar__event is-${project.status.toLowerCase().replaceAll(' ', '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}
                    style={{ '--project-accent': project.accent } as CSSProperties}
                    onClick={() => navigate(`/projetos/${project.id}`)}
                    title={`${project.name} — deadline ${project.deadline}`}
                    key={project.id}
                  >
                    <i />
                    <span>{project.name}</span>
                    {project.unread > 0 && <b>{project.unread}</b>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {unscheduledProjects.length > 0 && <div className="projects-calendar__unscheduled">
        <div><strong>Sem data no calendário</strong><span>Projetos contínuos ou ainda sem deadline definido</span></div>
        <div>{unscheduledProjects.map((project) => <button type="button" onClick={() => navigate(`/projetos/${project.id}`)} key={project.id}><i style={{ background: project.accent }} /><span>{project.name}</span><small>{project.deadline}</small></button>)}</div>
      </div>}
    </section>
  )
}

export function ProjectsPage() {
  const { projects, notify } = useApp()
  const [view, setView] = useState<ProjectsView>('list')
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [showWeekends, setShowWeekends] = useState(false)
  const [query, setQuery] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [statusOnly, setStatusOnly] = useState(false)
  const [reverse, setReverse] = useState(false)

  const visible = useMemo(() => {
    const filtered = projects.filter((project) => {
      const matchesQuery = `${project.name} ${project.service}`.toLowerCase().includes(query.toLowerCase())
      const matchesAttention = !attentionOnly || project.status === 'Em revisão'
      const matchesUnread = !unreadOnly || project.unread > 0
      const matchesStatus = !statusOnly || project.status === 'Em andamento'
      return matchesQuery && matchesAttention && matchesUnread && matchesStatus
    })
    return reverse ? [...filtered].reverse() : filtered
  }, [attentionOnly, projects, query, reverse, statusOnly, unreadOnly])

  return (
    <div className="page projects-page" data-node-id="1:395">
      <div className={`projects-screen${view === 'calendar' ? ' projects-screen--calendar' : ''}`}>
        <main className="projects-screen__main">
          <header className="projects-topbar">
            <div className="projects-title-tabs">
              <h1>Projetos</h1>
              <div className="projects-view-tabs">
                <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}><List size={18} /> Lista</button>
                <button className={view === 'calendar' ? 'is-active' : ''} onClick={() => setView('calendar')} aria-pressed={view === 'calendar'}><CalendarDays size={18} /> Calendário</button>
              </div>
            </div>

            <div className="projects-display-controls">
              {view === 'list' && <button className="projects-display-by" onClick={() => setReverse((current) => !current)}>
                <span>Exibir por</span><strong>Status</strong><FigmaIcon asset="projects.imgWeuiArrowOutlined" />
              </button>}
              <label className="projects-icon-control projects-search-control" aria-label="Buscar projetos">
                <FigmaIcon asset="projects.imgIconamoonSearchBold" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar projetos" />
              </label>
              <button className="projects-icon-control" aria-label="Ordenar projetos" onClick={() => setReverse((current) => !current)}>
                <FigmaIcon asset="projects.imgAkarIconsSort" />
              </button>
            </div>
          </header>

          {view === 'list' && <div className="projects-filterbar">
            <FilterChip active={attentionOnly} onClick={() => setAttentionOnly((current) => !current)}>Ação necessária</FilterChip>
            <FilterChip active={unreadOnly} onClick={() => setUnreadOnly((current) => !current)}>Mensagens não lidas</FilterChip>
            <FilterChip expandable active={statusOnly} onClick={() => setStatusOnly((current) => !current)}>Status</FilterChip>
            <FilterChip expandable onClick={() => notify('Filtro de colaborador aberto')}>Colaborador</FilterChip>
            <FilterChip expandable onClick={() => notify('Filtro de prazo aberto')}>Deadline</FilterChip>
            <FilterChip expandable onClick={() => notify('Filtro de time aberto')}>Time</FilterChip>
          </div>}

          {view === 'calendar' ? (
            <ProjectsCalendar projects={visible} cursor={calendarCursor} showWeekends={showWeekends} onCursorChange={setCalendarCursor} onShowWeekendsChange={setShowWeekends} />
          ) : visible.length > 0 ? (
            <div className="projects-groups">
              {visible.map((project) => {
                const projectWithTasks = project as Project & {
                  tasksList?: Array<{ status: 'Concluído' | 'Em andamento'; delivery?: 'Aprovado' | 'Aguardando aprovação' }>
                }
                const rawTasks = projectWithTasks.tasksList
                const tasks: ProjectTask[] =
                  rawTasks && rawTasks.length > 0
                    ? rawTasks
                    : [
                        {
                          status: project.progress >= 100 ? 'Concluído' : 'Em andamento',
                          delivery:
                            project.status === 'Em revisão'
                              ? 'Aguardando aprovação'
                              : project.status === 'Concluído'
                              ? 'Aprovado'
                              : undefined,
                        },
                      ]
                return (
                  <ProjectGroup
                    key={project.id}
                    title={project.status}
                    project={project}
                    projectStatus={project.status === 'Concluído' ? 'Concluído' : 'Em andamento'}
                    tasks={tasks}
                  />
                )
              })}
            </div>
          ) : projects.length === 0 ? (
            <div className="projects-empty-state">
              <h2>Nenhum projeto cadastrado</h2>
              <p>Você ainda não possui projetos nesta conta.</p>
            </div>
          ) : (
            <div className="projects-empty-state">
              <h2>Nenhum projeto encontrado</h2>
              <p>Tente buscar outro termo ou remover os filtros.</p>
            </div>
          )}
        </main>

        {view === 'list' && <AllocationPanel />}
      </div>
    </div>
  )
}
