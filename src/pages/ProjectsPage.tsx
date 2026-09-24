import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import type { Project, ProjectStatus } from '../types'

type AssetName = Parameters<typeof figmaAsset>[0]

interface ProjectTask {
  title?: string
  team?: string
  deadlineDays?: number
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

function FilterChip({ children, active = false, onClick }: {
  children: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button className={`projects-filter-chip ${active ? 'is-active' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

function FilterDropdown({ label, value, options, onChange, display = false }: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  display?: boolean
}) {
  const selected = options.find((option) => option.value === value)
  return <details className={`projects-filter-dropdown${display ? ' projects-filter-dropdown--display' : ''}${value ? ' is-active' : ''}`}>
    <summary className={display ? 'projects-display-by' : 'projects-filter-chip'}>
      {display && <span>Exibir por</span>}
      <strong>{selected?.label || label}</strong>
      <FigmaIcon asset={display ? 'projects.imgWeuiArrowOutlined' : 'projects.imgWeuiArrowOutlined1'} />
    </summary>
    <div className="projects-filter-menu" role="menu">
      {options.map((option) => <button
        type="button"
        className={option.value === value ? 'is-selected' : ''}
        onClick={(event) => {
          onChange(option.value)
          event.currentTarget.closest('details')?.removeAttribute('open')
        }}
        role="menuitemradio"
        aria-checked={option.value === value}
        key={option.value || 'all'}
      >
        {option.label}
        {option.value === value && <span aria-hidden="true">✓</span>}
      </button>)}
    </div>
  </details>
}

function DeliveryCard({ state }: { state: 'Aprovado' | 'Aguardando aprovação' }) {
  return (
    <div className="projects-delivery">
      <img src={figmaAsset('projects.imgRectangle161124126')} alt="Prévia do design entregue" />
      <span><strong>DESIGN ENTREGUE</strong><small>{state}</small></span>
    </div>
  )
}

function ProjectStatusBadge({ status }: { status: ProjectStatus | 'Concluído' | 'Em andamento' }) {
  const isDone = status === 'Concluído'
  return <b className={isDone ? 'is-done' : 'is-progress'}>{status}</b>
}

function ProjectRow({ project }: { project: Project }) {
  const navigate = useNavigate()

  return (
    <button className="projects-figma-row projects-figma-row--project project-card" onClick={() => navigate(`/projetos/${project.id}`)}>
      <span className="projects-row-name projects-row-name--project">
        <FigmaIcon asset="projects.imgVector11" />
        <FigmaIcon asset="projects.imgVector12" />
        <h3>{project.name}</h3>
        <small>{project.tasks}</small>
      </span>
      <span className="projects-row-meta">
        <small>{project.deadline === 'A definir' ? 'sem prazo definido' : `prazo ${project.deadline}`}</small>
        <ProjectStatusBadge status={project.status} />
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
        <strong>{task.title || 'Tarefa do projeto'}</strong>
        <small><i /> {task.team || 'Sem equipe'}</small>
      </span>
      <span className="projects-row-meta">
        <small>{task.deadlineDays !== undefined ? `prazo de ${task.deadlineDays} dia(s)` : 'sem prazo definido'}</small>
        <ProjectStatusBadge status={task.status} />
      </span>
      {task.delivery ? <DeliveryCard state={task.delivery} /> : <span className="projects-delivery-spacer" />}
    </button>
  )
}

function ProjectGroup({ title, project, tasks }: {
  title: string
  project: Project
  tasks: ProjectTask[]
}) {
  return (
    <section className="projects-group">
      <button className="projects-group__heading">
        {title}
        <FigmaIcon asset="projects.imgWeuiArrowOutlined1" />
      </button>
      <div className="projects-group__rows">
        <ProjectRow project={project} />
        {tasks.map((task, index) => <TaskRow key={`${task.status}-${index}`} project={project} task={task} separated={index === 2} />)}
      </div>
    </section>
  )
}

function AllocationPanel() {
  const { account } = useApp()
  const allowance = account?.workspace.creditAllowance ?? 0
  const availableCredits = account?.workspace.creditsAvailable ?? 0
  const creditsUsed = account?.workspace.creditsUsed ?? 0
  const teams = account?.teams ?? []
  const percentUsed = allowance > 0 ? Math.min(100, Math.round((creditsUsed / allowance) * 100)) : 0

  return (
    <aside className="home-allocation-stack projects-allocation-panel">
      <section className="home-allocation-card home-allocation-card--subscription">
        <header><FigmaIcon asset="projects.imgGroup1410119714" /><h2>Assinatura</h2></header>
        <div className="home-allocation-progress"><i style={{ width: `${percentUsed}%` }} /></div>
        <footer><span>Disponível</span><strong>{availableCredits} <FigmaIcon asset="projects.imgBasilArrowRightOutline" /> {allowance}</strong></footer>
      </section>

      {teams.map((team) => <section className="home-allocation-card" key={team.id}>
        <header><i className="home-team-color" style={{ background: team.color }} /><h2>{team.name}</h2></header>
        <footer><span>Usado</span><strong>{team.creditsUsed}</strong></footer>
      </section>)}
      {teams.length === 0 && <section className="home-allocation-card home-allocation-card--empty">
        <header><h2>Nenhuma equipe criada</h2></header>
        <footer><span>Crie equipes em Conta</span></footer>
      </section>}
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
  const { projects, members } = useApp()
  const [view, setView] = useState<ProjectsView>('list')
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [showWeekends, setShowWeekends] = useState(false)
  const [query, setQuery] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [collaboratorFilter, setCollaboratorFilter] = useState('')
  const [deadlineFilter, setDeadlineFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [sortBy, setSortBy] = useState('status')
  const [reverse, setReverse] = useState(false)

  const statusOptions = useMemo(() => [
    { value: '', label: 'Todos os status' },
    ...Array.from(new Set(projects.map((project) => project.status))).sort().map((status) => ({ value: status, label: status })),
  ], [projects])

  const collaboratorOptions = useMemo(() => {
    const projectInitials = new Set(projects.flatMap((project) => project.team))
    return [
      { value: '', label: 'Todos os colaboradores' },
      ...members.filter((member) => member.avatarInitials && projectInitials.has(member.avatarInitials)).map((member) => ({ value: member.avatarInitials!, label: member.name })),
    ]
  }, [members, projects])

  const teamOptions = useMemo(() => {
    const names = new Set(projects.flatMap((project) => (project as Project & { tasksList?: ProjectTask[] }).tasksList?.map((task) => task.team).filter(Boolean) || []))
    return [{ value: '', label: 'Todos os times' }, ...Array.from(names).sort().map((name) => ({ value: name!, label: name! }))]
  }, [projects])

  const visible = useMemo(() => {
    const filtered = projects.filter((project) => {
      const matchesQuery = `${project.name} ${project.service}`.toLowerCase().includes(query.toLowerCase())
      const matchesAttention = !attentionOnly || project.status === 'Em revisão'
      const matchesUnread = !unreadOnly || project.unread > 0
      const matchesStatus = !statusFilter || project.status === statusFilter
      const matchesCollaborator = !collaboratorFilter || project.team.includes(collaboratorFilter)
      const projectDeadline = deadlineDate(project.deadline, startOfDay(new Date()))
      const today = startOfDay(new Date())
      const sevenDays = new Date(today)
      sevenDays.setDate(today.getDate() + 7)
      const matchesDeadline = !deadlineFilter
        || (deadlineFilter === 'today' && projectDeadline && dateKey(projectDeadline) === dateKey(today))
        || (deadlineFilter === 'week' && projectDeadline && projectDeadline >= today && projectDeadline <= sevenDays)
        || (deadlineFilter === 'overdue' && projectDeadline && projectDeadline < today)
        || (deadlineFilter === 'unscheduled' && !projectDeadline)
      const taskTeams = (project as Project & { tasksList?: ProjectTask[] }).tasksList?.map((task) => task.team) || []
      const matchesTeam = !teamFilter || taskTeams.includes(teamFilter)
      return matchesQuery && matchesAttention && matchesUnread && matchesStatus && matchesCollaborator && matchesDeadline && matchesTeam
    })
    const sorted = [...filtered].sort((left, right) => {
      if (sortBy === 'name') return left.name.localeCompare(right.name, 'pt-BR')
      if (sortBy === 'deadline') {
        const today = startOfDay(new Date())
        const leftDate = deadlineDate(left.deadline, today)?.getTime() ?? Number.MAX_SAFE_INTEGER
        const rightDate = deadlineDate(right.deadline, today)?.getTime() ?? Number.MAX_SAFE_INTEGER
        return leftDate - rightDate
      }
      return left.status.localeCompare(right.status, 'pt-BR') || left.name.localeCompare(right.name, 'pt-BR')
    })
    return reverse ? sorted.reverse() : sorted
  }, [attentionOnly, collaboratorFilter, deadlineFilter, projects, query, reverse, sortBy, statusFilter, teamFilter, unreadOnly])

  return (
    <div className="page projects-page" data-node-id="1:395">
      <div className="projects-screen">
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
              {view === 'list' && <FilterDropdown display label="Exibir por" value={sortBy} onChange={setSortBy} options={[{ value: 'status', label: 'Status' }, { value: 'name', label: 'Nome' }, { value: 'deadline', label: 'Deadline' }]} />}
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
            <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <FilterDropdown label="Colaborador" value={collaboratorFilter} onChange={setCollaboratorFilter} options={collaboratorOptions} />
            <FilterDropdown label="Deadline" value={deadlineFilter} onChange={setDeadlineFilter} options={[{ value: '', label: 'Todos os prazos' }, { value: 'today', label: 'Hoje' }, { value: 'week', label: 'Próximos 7 dias' }, { value: 'overdue', label: 'Atrasados' }, { value: 'unscheduled', label: 'Sem data' }]} />
            <FilterDropdown label="Time" value={teamFilter} onChange={setTeamFilter} options={teamOptions} />
          </div>}

          {view === 'calendar' ? (
            <ProjectsCalendar projects={visible} cursor={calendarCursor} showWeekends={showWeekends} onCursorChange={setCalendarCursor} onShowWeekendsChange={setShowWeekends} />
          ) : visible.length > 0 ? (
            <div className="projects-groups">
              {visible.map((project) => {
                const projectWithTasks = project as Project & {
                  tasksList?: Array<{ title?: string; team?: string; deadlineDays?: number; status: 'Concluído' | 'Em andamento'; delivery?: 'Aprovado' | 'Aguardando aprovação' }>
                }
                const rawTasks = projectWithTasks.tasksList
                const tasks: ProjectTask[] = rawTasks ?? []
                return (
                  <ProjectGroup
                    key={project.id}
                    title={project.status}
                    project={project}
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

        <AllocationPanel />
      </div>
    </div>
  )
}
