import { useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, List, Star } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import type { Project, ProjectStatus, ProjectTask } from '../types'

type AssetName = Parameters<typeof figmaAsset>[0]

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

function parseDate(value: string | null | undefined, today = new Date()): Date | null {
  if (!value || value === 'A definir') return null
  if (value.toLocaleLowerCase('pt-BR') === 'hoje') return startOfDay(today)
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed
  const match = value.trim().toLocaleLowerCase('pt-BR').match(/^(\d{1,2})\s+([a-zç]{3})$/)
  if (!match) return null
  const month = monthNumbers[match[2]]
  if (month === undefined) return null
  return new Date(today.getFullYear(), month, Number(match[1]))
}

function formatDeadline(value: string | null | undefined, today = new Date()) {
  const date = parseDate(value, today)
  if (!date) return 'Sem prazo definido'
  const sameDay = dateKey(date) === dateKey(today)
  const dateLabel = sameDay ? 'Hoje' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '')
  const hasTime = Boolean(value?.includes('T'))
  return hasTime ? `${dateLabel}, ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)}` : dateLabel
}

function effectiveStatus(project: Project): ProjectStatus {
  const tasks = project.tasksList || []
  if (tasks.length > 0 && tasks.every((task) => task.status === 'Concluído')) return 'Concluído'
  if (project.status === 'Concluído' && tasks.length > 0) return tasks.some((task) => task.status === 'Em revisão') ? 'Em revisão' : 'Em andamento'
  return project.status
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

function DeliveryCard({ state }: { state: 'Aprovado' | 'Aguardando aprovação' | 'Em alteração' }) {
  return (
    <div className="projects-delivery">
      <img src={figmaAsset('projects.imgRectangle161124126')} alt="Prévia do design entregue" />
      <span><strong>DESIGN ENTREGUE</strong><small>{state}</small></span>
    </div>
  )
}

function ProjectStatusBadge({ status }: { status: string }) {
  const isDone = status === 'Concluído'
  return <b className={isDone ? 'is-done' : 'is-progress'}>{status}</b>
}

function ProjectRow({ project }: { project: Project }) {
  const navigate = useNavigate()
  const { toggleProjectFavorite } = useApp()
  const [savingFavorite, setSavingFavorite] = useState(false)
  const status = effectiveStatus(project)

  const toggleFavorite = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (savingFavorite) return
    setSavingFavorite(true)
    try {
      await toggleProjectFavorite(project.id)
    } finally {
      setSavingFavorite(false)
    }
  }

  return (
    <article className="projects-figma-row projects-figma-row--project project-card">
      <button type="button" className="projects-project-open" onClick={() => navigate(`/projetos/${project.id}`)} aria-label={`Abrir projeto ${project.name}`} />
      <span className="projects-row-name projects-row-name--project">
        <FigmaIcon asset="projects.imgVector11" />
        <button type="button" className={`projects-favorite${project.favorite ? ' is-favorite' : ''}`} disabled={savingFavorite} onClick={(event) => void toggleFavorite(event)} aria-label={project.favorite ? `Remover ${project.name} dos favoritos` : `Adicionar ${project.name} aos favoritos`} aria-pressed={Boolean(project.favorite)}><Star size={17} fill={project.favorite ? 'currentColor' : 'none'} /></button>
        <h3>{project.name}</h3>
        <small>{project.tasksList?.length || project.tasks}</small>
      </span>
      <span className="projects-row-meta">
        <small>Prazo: {formatDeadline(project.deadline)}</small>
        <ProjectStatusBadge status={status} />
      </span>
      <span className="projects-delivery-spacer" />
    </article>
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
        <small>{task.deadlineAt ? `Prazo: ${formatDeadline(task.deadlineAt)}` : task.deadlineDays !== undefined ? `Prazo estimado: ${task.deadlineDays} ${task.deadlineDays === 1 ? 'dia' : 'dias'}` : 'Sem prazo definido'}</small>
        <ProjectStatusBadge status={task.status} />
      </span>
      {task.delivery ? <DeliveryCard state={task.delivery} /> : <span className="projects-delivery-spacer" />}
    </button>
  )
}

function StatusGroup({ title, projects, collapsed, onToggle }: {
  title: string
  projects: Project[]
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <section className={`projects-group${collapsed ? ' is-collapsed' : ''}`}>
      <button className="projects-group__heading" type="button" onClick={onToggle} aria-expanded={!collapsed}>
        <span>{title}<small>{projects.length}</small></span>
        <FigmaIcon asset="projects.imgWeuiArrowOutlined1" />
      </button>
      {!collapsed && <div className="projects-group__rows">
        {projects.map((project) => <div className="projects-project-stack" key={project.id}>
          <ProjectRow project={project} />
          {(project.tasksList || []).map((task) => <TaskRow key={task.id} project={project} task={task} />)}
        </div>)}
      </div>}
    </section>
  )
}

function AllocationPanel() {
  const { account } = useApp()
  const availableCredits = account?.workspace.creditsAvailable ?? 0
  const creditsUsed = account?.workspace.creditsUsed ?? 0
  const teams = account?.teams ?? []
  const totalCredits = Math.max(0, availableCredits + creditsUsed)
  const percentAvailable = totalCredits > 0 ? Math.min(100, Math.round((availableCredits / totalCredits) * 100)) : 0

  return (
    <aside className="home-allocation-stack projects-allocation-panel">
      <section className="home-allocation-card home-allocation-card--subscription">
        <header><FigmaIcon asset="projects.imgGroup1410119714" /><h2>Assinatura</h2></header>
        <div className="home-allocation-progress" title={`${availableCredits} de ${totalCredits} créditos disponíveis`}><i style={{ width: `${percentAvailable}%` }} /></div>
        <footer><span>Disponível</span><strong>{availableCredits} de {totalCredits} créditos</strong></footer>
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
  const visibleDays = showWeekends ? days : days.filter((date) => date.getDay() !== 0 && date.getDay() !== 6)
  const visibleWeekDays = showWeekends ? weekDayNames : weekDayNames.slice(0, 5)
  const taskEntries = useMemo(() => projects.flatMap((project) => (project.tasksList || [])
    .filter((task) => task.status !== 'Inativa')
    .map((task) => ({
      project,
      task,
      start: parseDate(task.createdAt || project.createdAt, today),
      end: parseDate(task.deadlineAt || project.deadline, today),
    }))), [projects, today])
  const scheduledTasks = taskEntries.filter((entry): entry is typeof entry & { start: Date; end: Date } => Boolean(entry.start && entry.end))
  const unscheduledTasks = taskEntries.filter((entry) => !entry.start || !entry.end)
  const rawMonthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(cursor)
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1)

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
        {visibleDays.map((date, dayIndex) => {
          const day = startOfDay(date)
          const columnCount = showWeekends ? 7 : 5
          const weekStart = Math.floor(dayIndex / columnCount) * columnCount
          const weekDays = visibleDays.slice(weekStart, weekStart + columnCount)
          const weekStartDate = startOfDay(weekDays[0])
          const weekEndDate = startOfDay(weekDays[weekDays.length - 1])
          const weekRanges = scheduledTasks.filter((entry) => startOfDay(entry.end) >= weekStartDate && startOfDay(entry.start) <= weekEndDate)
          const isToday = dateKey(date) === dateKey(today)
          const isOutsideMonth = date.getMonth() !== cursor.getMonth()
          return (
            <div className={`projects-calendar__day${isOutsideMonth ? ' is-outside' : ''}${isToday ? ' is-today' : ''}`} role="gridcell" aria-label={new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date)} key={dateKey(date)}>
              <time dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}>{date.getDate()}</time>
              <div className="projects-calendar__events">
                {weekRanges.map(({ project, task, start, end }) => {
                  const activeOnDay = day >= startOfDay(start) && day <= startOfDay(end)
                  if (!activeOnDay) return <span className="projects-calendar__event-placeholder" aria-hidden="true" key={task.id} />
                  const startsHere = dateKey(start) === dateKey(day)
                  const endsHere = dateKey(end) === dateKey(day)
                  const visualStart = startsHere || dayIndex % columnCount === 0
                  const visualEnd = endsHere || dayIndex % columnCount === columnCount - 1
                  const beginsVisibleRange = visualStart
                  const deadlineTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(end)
                  return <button
                    type="button"
                    className={`projects-calendar__event projects-calendar__event--range${visualStart ? ' is-range-start' : ''}${visualEnd ? ' is-range-end' : ''}${visualStart && visualEnd ? ' is-range-single' : ''}${task.status === 'Concluído' ? ' is-concluido' : ''}`}
                    style={{ '--project-accent': project.accent } as CSSProperties}
                    onClick={() => navigate(`/projetos/${project.id}`)}
                    title={`${task.title} · ${project.name} · prazo ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(end)}`}
                    aria-label={`${task.title} · ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(day)}`}
                    key={task.id}
                  >
                    <span>{beginsVisibleRange ? task.title : ''}</span>
                    {endsHere && <time>{deadlineTime}</time>}
                  </button>
                } )}
              </div>
            </div>
          )
        })}
      </div>

      {unscheduledTasks.length > 0 && <div className="projects-calendar__unscheduled">
        <div><strong>Tarefas sem data</strong><span>Sem criação ou deadline definido</span></div>
        <div>{unscheduledTasks.map(({ project, task }) => <button type="button" onClick={() => navigate(`/projetos/${project.id}`)} key={task.id}><i style={{ background: project.accent }} /><span>{task.title}</span><small>{project.name}</small></button>)}</div>
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
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(() => new Set())

  const displayProjects = useMemo(() => projects.map((project) => ({ ...project, status: effectiveStatus(project) })), [projects])

  const statusOptions = useMemo(() => [
    { value: '', label: 'Todos os status' },
    ...Array.from(new Set(displayProjects.map((project) => project.status))).sort().map((status) => ({ value: status, label: status })),
  ], [displayProjects])

  const collaboratorOptions = useMemo(() => {
    const projectInitials = new Set(displayProjects.flatMap((project) => project.team))
    return [
      { value: '', label: 'Todos os colaboradores' },
      ...members.filter((member) => member.avatarInitials && projectInitials.has(member.avatarInitials)).map((member) => ({ value: member.avatarInitials!, label: member.name })),
    ]
  }, [displayProjects, members])

  const teamOptions = useMemo(() => {
    const names = new Set(displayProjects.flatMap((project) => project.tasksList?.map((task) => task.team).filter(Boolean) || []))
    return [{ value: '', label: 'Todos os times' }, ...Array.from(names).sort().map((name) => ({ value: name!, label: name! }))]
  }, [displayProjects])

  const visible = useMemo(() => {
    const filtered = displayProjects.filter((project) => {
      const matchesQuery = `${project.name} ${project.service}`.toLowerCase().includes(query.toLowerCase())
      const matchesAttention = !attentionOnly || project.status === 'Em revisão'
      const matchesUnread = !unreadOnly || project.unread > 0
      const matchesStatus = !statusFilter || project.status === statusFilter
      const matchesCollaborator = !collaboratorFilter || project.team.includes(collaboratorFilter)
      const projectDeadline = parseDate(project.deadline, startOfDay(new Date()))
      const today = startOfDay(new Date())
      const sevenDays = new Date(today)
      sevenDays.setDate(today.getDate() + 7)
      const matchesDeadline = !deadlineFilter
        || (deadlineFilter === 'today' && projectDeadline && dateKey(projectDeadline) === dateKey(today))
        || (deadlineFilter === 'week' && projectDeadline && projectDeadline >= today && projectDeadline <= sevenDays)
        || (deadlineFilter === 'overdue' && projectDeadline && projectDeadline < today)
        || (deadlineFilter === 'unscheduled' && !projectDeadline)
      const taskTeams = project.tasksList?.map((task) => task.team) || []
      const matchesTeam = !teamFilter || taskTeams.includes(teamFilter)
      return matchesQuery && matchesAttention && matchesUnread && matchesStatus && matchesCollaborator && matchesDeadline && matchesTeam
    })
    const sorted = [...filtered].sort((left, right) => {
      if (sortBy === 'name') return left.name.localeCompare(right.name, 'pt-BR')
      if (sortBy === 'deadline') {
        const today = startOfDay(new Date())
        const leftDate = parseDate(left.deadline, today)?.getTime() ?? Number.MAX_SAFE_INTEGER
        const rightDate = parseDate(right.deadline, today)?.getTime() ?? Number.MAX_SAFE_INTEGER
        return leftDate - rightDate
      }
      return left.status.localeCompare(right.status, 'pt-BR') || left.name.localeCompare(right.name, 'pt-BR')
    })
    return reverse ? sorted.reverse() : sorted
  }, [attentionOnly, collaboratorFilter, deadlineFilter, displayProjects, query, reverse, sortBy, statusFilter, teamFilter, unreadOnly])

  const statusGroups = useMemo(() => {
    const preferredOrder: ProjectStatus[] = ['Em revisão', 'Em andamento', 'Rascunho', 'Concluído']
    const grouped = new Map<string, Project[]>()
    visible.forEach((project) => grouped.set(project.status, [...(grouped.get(project.status) || []), project]))
    return Array.from(grouped.entries()).sort(([left], [right]) => {
      const leftIndex = preferredOrder.indexOf(left as ProjectStatus)
      const rightIndex = preferredOrder.indexOf(right as ProjectStatus)
      return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex)
    })
  }, [visible])

  const toggleStatus = (status: string) => setCollapsedStatuses((current) => {
    const next = new Set(current)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    return next
  })

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
              {statusGroups.map(([status, groupedProjects]) => <StatusGroup key={status} title={status} projects={groupedProjects} collapsed={collapsedStatuses.has(status)} onToggle={() => toggleStatus(status)} />)}
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
