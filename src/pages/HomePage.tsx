import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, ChevronRight, Link2, Loader2, Mic } from 'lucide-react'
import { useApp, type ProjectWithTasks } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { StatusPill } from '../components/StatusPill'
import { AllyoBriefStudio } from '../components/briefStudio/AllyoBriefStudio'
import { useSpeechToText } from '../components/briefStudio/useSpeechToText'
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
  const [speechBasePrompt, setSpeechBasePrompt] = useState('')
  const [linkedRefProjectId, setLinkedRefProjectId] = useState('')
  const [activeStudioPrompt, setActiveStudioPrompt] = useState<string | null>(null)
  const [isLaunchingStudio, setIsLaunchingStudio] = useState(false)
  const [launchStatusText, setLaunchStatusText] = useState('Iniciando o Allyo Brief Studio...')
  const [mentionMatch, setMentionMatch] = useState<{
    triggerStart: number
    cursorEnd: number
    prefix: string
    query: string
  } | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [dashboard, setDashboard] = useState<ClientDashboardSummary | null>(null)
  const promptInputRef = useRef<HTMLInputElement>(null)

  const handleSpeechTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      setPrompt((current) => {
        const base = speechBasePrompt || current
        const separator = base && !base.endsWith(' ') ? ' ' : ''
        const combined = `${base}${separator}${transcript}`
        if (isFinal) {
          setSpeechBasePrompt(combined)
        }
        return combined
      })
    },
    [speechBasePrompt]
  )

  const { isListening, toggleListening, stopListening } = useSpeechToText({
    onTranscript: handleSpeechTranscript,
    onError: (msg) => notify(msg),
  })

  const handleToggleMic = () => {
    if (!isListening) {
      setSpeechBasePrompt(prompt.trim())
    }
    toggleListening()
  }

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

  const detectInlineMention = (value: string, cursor: number) => {
    const slice = value.slice(0, cursor)
    const atMatch = slice.match(/(^|\s)@([A-Za-zÀ-ú0-9\s\-_]{0,32})$/)
    if (atMatch) {
      const fullMatch = atMatch[0]
      const leadingSpace = atMatch[1] || ''
      const triggerStart = slice.length - fullMatch.length + leadingSpace.length
      return {
        triggerStart,
        cursorEnd: cursor,
        prefix: '',
        query: (atMatch[2] || '').trim(),
      }
    }

    const phraseMatch = slice.match(
      /\b(projeto|refer[eê]ncia|mesma linha d[eo]|igual ao)\s+([A-Za-zÀ-ú0-9\-_]{1,28})$/i
    )
    if (phraseMatch) {
      const triggerWord = phraseMatch[1]
      const queryPart = phraseMatch[2] || ''
      const triggerStart = slice.length - queryPart.length
      return {
        triggerStart,
        cursorEnd: cursor,
        prefix: `${triggerWord} `,
        query: queryPart.trim(),
      }
    }

    return null
  }

  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value
    const cursor = event.target.selectionStart ?? nextValue.length
    setPrompt(nextValue)

    if (projects.length > 0) {
      const detected = detectInlineMention(nextValue, cursor)
      setMentionMatch(detected)
      setMentionIndex(0)
    } else {
      setMentionMatch(null)
    }

    // Clear linkedRefProjectId if the project name was deleted from the text
    if (linkedRefProjectId) {
      const linkedProj = projects.find((p) => p.id === linkedRefProjectId)
      if (linkedProj && !nextValue.toLowerCase().includes(linkedProj.name.toLowerCase())) {
        setLinkedRefProjectId('')
      }
    }
  }

  const mentionCandidates = useMemo(() => {
    if (!mentionMatch || projects.length === 0) return []
    const q = mentionMatch.query.toLowerCase()
    return projects
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.service?.toLowerCase().includes(q))
      .slice(0, 5)
  }, [mentionMatch, projects])

  const insertProjectMention = (project: (typeof projects)[number]) => {
    if (!mentionMatch) return
    const before = prompt.slice(0, mentionMatch.triggerStart)
    const after = prompt.slice(mentionMatch.cursorEnd)
    const trailingSpace = after.startsWith(' ') ? '' : ' '
    const nextPrompt = `${before}${project.name}${trailingSpace}${after}`
    setPrompt(nextPrompt)
    setLinkedRefProjectId(project.id)
    setMentionMatch(null)
    window.requestAnimationFrame(() => {
      promptInputRef.current?.focus()
    })
  }

  const handleTriggerMentionAtCursor = () => {
    const input = promptInputRef.current
    if (!input) return
    const start = input.selectionStart ?? prompt.length
    const before = prompt.slice(0, start)
    const after = prompt.slice(start)
    const needsSpace = before.length > 0 && !before.endsWith(' ')
    const inserted = `${before}${needsSpace ? ' ' : ''}@${after}`
    const nextCursor = start + (needsSpace ? 2 : 1)
    setPrompt(inserted)
    setMentionMatch({
      triggerStart: nextCursor - 1,
      cursorEnd: nextCursor,
      prefix: '',
      query: '',
    })
    setMentionIndex(0)
    window.requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const resolvedLinkedProjectId = useMemo(() => {
    if (linkedRefProjectId) return linkedRefProjectId
    const lower = prompt.toLowerCase()
    const matched = projects.find((p) => p.name.length >= 3 && lower.includes(p.name.toLowerCase()))
    return matched?.id || ''
  }, [linkedRefProjectId, projects, prompt])

  const linkedProjectObj = useMemo(
    () => projects.find((p) => p.id === resolvedLinkedProjectId) || null,
    [projects, resolvedLinkedProjectId]
  )

  const launchStudioWithTransition = (targetPrompt: string) => {
    if (isLaunchingStudio) return
    stopListening()
    setMentionMatch(null)
    setIsLaunchingStudio(true)
    setLaunchStatusText('Interpretando sua solicitação...')
    window.setTimeout(() => {
      setLaunchStatusText('Abrindo o Allyo Brief Studio...')
    }, 340)
    window.setTimeout(() => {
      setIsLaunchingStudio(false)
      setActiveStudioPrompt(targetPrompt)
    }, 680)
  }

  const submitPrompt = (event: React.FormEvent) => {
    event.preventDefault()
    if (!prompt.trim() || isLaunchingStudio) return
    launchStudioWithTransition(prompt.trim())
  }

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionMatch && mentionCandidates.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setMentionIndex((prev) => (prev + 1) % mentionCandidates.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        insertProjectMention(mentionCandidates[mentionIndex] || mentionCandidates[0])
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setMentionMatch(null)
        return
      }
    }
  }

  const handleSuggestionClick = (label: string) => {
    const cleanLabel = label.replace(' (8)', '').trim()
    if (cleanLabel === 'Elaborar um briefing') {
      const text = prompt.trim() || 'Me ajude a escrever o briefing para novos anúncios de redes sociais com variações de copy'
      setPrompt(text)
      launchStudioWithTransition(text)
      return
    }
    launchStudioWithTransition(cleanLabel)
  }

  return (
    <div className="page home-page" data-node-id="1:16">
      {activeStudioPrompt && (
        <AllyoBriefStudio
          initialPrompt={activeStudioPrompt}
          linkedProjectId={resolvedLinkedProjectId || undefined}
          onClose={() => setActiveStudioPrompt(null)}
        />
      )}

      <section className={`home-hero ${isLaunchingStudio ? 'is-launching' : ''}`} data-node-id="9:12">
        <button className="home-catalog-link" onClick={() => navigate('/novo-projeto')}>
          Briefing do catálogo
          <FigmaIcon asset="home.imgEvaDiagonalArrowRightUpFill" />
        </button>

        <div className="home-hero__content">
          <h1>Vamos arrasar nessa campanha, {firstName}.</h1>

          <div className="prompt-box-wrap">
            <form
              className={`prompt-box ${isListening ? 'is-listening' : ''} ${isLaunchingStudio ? 'is-submitting' : ''}`}
              onSubmit={submitPrompt}
            >
              <input
                ref={promptInputRef}
                value={prompt}
                onChange={handlePromptChange}
                onKeyDown={handlePromptKeyDown}
                placeholder={
                  isListening
                    ? 'Ouvindo você... pode falar o que precisa para a campanha'
                    : 'O que eu posso fazer por você? (use @ para citar um projeto)'
                }
                aria-label="Converse com a Allyo"
              />

              {linkedProjectObj && (
                <span className="prompt-inline-project-badge" title={`Projeto referenciado: ${linkedProjectObj.name}`}>
                  <Link2 size={12} />
                  {linkedProjectObj.name}
                </span>
              )}

              {projects.length > 0 && (
                <button
                  type="button"
                  className="prompt-mention-trigger"
                  onClick={handleTriggerMentionAtCursor}
                  title="Referenciar um projeto existente no meio do texto (@)"
                  aria-label="Referenciar projeto"
                >
                  <AtSign size={17} strokeWidth={2} />
                </button>
              )}

              <button
                type="button"
                className={`prompt-mic ${isListening ? 'is-active' : ''}`}
                onClick={handleToggleMic}
                title={isListening ? 'Parar gravação de voz' : 'Falar por voz (transcrição automática)'}
                aria-label="Usar microfone"
              >
                <Mic size={19} strokeWidth={2} />
              </button>

              <button
                type="submit"
                className="prompt-send"
                disabled={!prompt.trim() || isLaunchingStudio}
                aria-label="Enviar"
              >
                {isLaunchingStudio ? (
                  <span className="prompt-send__spinner">
                    <Loader2 size={18} className="spin" />
                  </span>
                ) : (
                  <FigmaIcon asset="home.imgFrame1410119641" />
                )}
              </button>
            </form>

            {/* Inline Project Autocomplete Popover when typing @ or "projeto ..." */}
            {mentionMatch && mentionCandidates.length > 0 && (
              <div className="prompt-mention-popover" role="listbox" aria-label="Projetos para referenciar">
                <div className="prompt-mention-popover__header">
                  <span>Referenciar projeto no texto</span>
                  <small>Enter para inserir</small>
                </div>
                {mentionCandidates.map((proj, idx) => (
                  <button
                    type="button"
                    key={proj.id}
                    className={`prompt-mention-item ${idx === mentionIndex ? 'is-highlighted' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertProjectMention(proj)
                    }}
                  >
                    <Link2 size={14} />
                    <div>
                      <strong>{proj.name}</strong>
                      <small>{proj.service}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isLaunchingStudio && (
              <div className="home-launch-pill" role="status">
                <Loader2 size={14} className="spin" />
                <span>{launchStatusText}</span>
              </div>
            )}
          </div>

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
