import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Link2,
  Loader2,
  Mic,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useApp } from '../../AppContext'
import { api, type CatalogProduct, type CatalogQuote } from '../../services/api'
import {
  applyChatRefinement,
  buildInitialBriefState,
  computeBriefGaps,
  computePlannedDeliverables,
  type BriefDraftState,
} from './briefingEngine'
import { useSpeechToText } from './useSpeechToText'

interface AllyoBriefStudioProps {
  initialPrompt: string
  linkedProjectId?: string
  onClose: () => void
}

const PROCESSING_STEPS = [
  {
    label: 'Analisando solicitação...',
    detail: 'Interpretando objetivo, campanha e entregáveis pedidos',
  },
  {
    label: 'Reunindo contexto da marca...',
    detail: 'Consultando diretrizes visuais, paleta e tom de voz do Brand Kit',
  },
  {
    label: 'Identificando formatos e ativos no catálogo...',
    detail: 'Cruzando dimensões, canais e prazos SLA em horas úteis',
  },
  {
    label: 'Estruturando o briefing e escopo...',
    detail: 'Distribuindo tarefas entre Design, Copywriting e Motion',
  },
]

const categoryAccent: Record<string, string> = {
  'Redes Sociais': '#bde8e1',
  Digital: '#cfe5f4',
  Impresso: '#f8e5bd',
  'Vídeo & Áudio': '#d9defb',
  Criação: '#f7d5e8',
  Copywriting: '#dcebc8',
  'Feitos com IA': '#ead8f5',
}

const formatCredits = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)

export function AllyoBriefStudio({
  initialPrompt,
  linkedProjectId,
  onClose,
}: AllyoBriefStudioProps) {
  const navigate = useNavigate()
  const { projects, brands, allyoTeam, account, addProject, notify, refreshAccount } = useApp()

  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(true)

  const [draft, setDraft] = useState<BriefDraftState | null>(null)
  const [quote, setQuote] = useState<CatalogQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const [chatInput, setChatInput] = useState('')
  const [speechBaseChat, setSpeechBaseChat] = useState('')
  const [showGapsDrawer, setShowGapsDrawer] = useState(false)
  const [editingOverview, setEditingOverview] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [lastUpdatedBadge, setLastUpdatedBadge] = useState<string | null>(null)

  const chatInputRef = useRef<HTMLInputElement>(null)

  const handleChatSpeech = useCallback(
    (transcript: string, isFinal: boolean) => {
      setChatInput((current) => {
        const base = speechBaseChat || current
        const sep = base && !base.endsWith(' ') ? ' ' : ''
        const combined = `${base}${sep}${transcript}`
        if (isFinal) setSpeechBaseChat(combined)
        return combined
      })
    },
    [speechBaseChat]
  )

  const { isListening: isChatListening, toggleListening: toggleChatMic } = useSpeechToText({
    onTranscript: handleChatSpeech,
    onError: (msg) => notify(msg),
  })

  // Load catalog products
  useEffect(() => {
    let active = true
    api
      .getCatalog()
      .then((res) => {
        if (!active) return
        setProducts(res.products || [])
        setCatalogLoaded(true)
      })
      .catch(() => {
        if (!active) return
        setCatalogLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Build initial state once catalog is loaded
  useEffect(() => {
    if (!catalogLoaded || draft) return
    const nextDraft = buildInitialBriefState({
      prompt: initialPrompt,
      products,
      brands,
      projects,
      linkedProjectId,
    })
    setDraft(nextDraft)
  }, [brands, catalogLoaded, draft, initialPrompt, linkedProjectId, products, projects])

  // Organic step-by-step animation (Superside Image 3)
  useEffect(() => {
    if (!isGenerating) return
    const timers = [
      window.setTimeout(() => setProcessingStep(1), 850),
      window.setTimeout(() => setProcessingStep(2), 1750),
      window.setTimeout(() => setProcessingStep(3), 2680),
      window.setTimeout(() => setProcessingStep(4), 3480),
      window.setTimeout(() => setIsGenerating(false), 3920),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [isGenerating])

  // Real-time catalog quote calculation
  useEffect(() => {
    if (!draft?.selectedProduct || draft.mode !== 'brief') return
    let active = true
    setQuoteLoading(true)
    const timer = window.setTimeout(() => {
      api
        .quoteCatalogProduct(draft.selectedProduct!.code, {
          ...draft.scope,
          creativePath: draft.creativePath,
        })
        .then((res) => {
          if (!active) return
          setQuote(res)
          setQuoteLoading(false)
        })
        .catch(() => {
          if (!active) return
          setQuoteLoading(false)
        })
    }, 150)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [draft?.selectedProduct, draft?.scope, draft?.creativePath, draft?.mode])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const deliverables = useMemo(() => (draft ? computePlannedDeliverables(draft) : []), [draft])
  const gaps = useMemo(() => (draft ? computeBriefGaps(draft) : []), [draft])
  const unresolvedGaps = useMemo(() => gaps.filter((g) => !g.resolved), [gaps])

  const totalEstimatedCredits = useMemo(() => {
    if (quote?.totalCredits) return quote.totalCredits
    return deliverables.reduce((acc, item) => acc + item.credits, 0) || 1
  }, [deliverables, quote])

  const totalEstimatedDays = useMemo(() => {
    if (deliverables.length === 0) return 2
    const maxDays = Math.max(...deliverables.map((d) => d.deadlineDays))
    const hasConcept = deliverables.some((d) => d.kind === 'concept')
    return hasConcept ? maxDays + 2 : maxDays
  }, [deliverables])

  const linkedProject = useMemo(
    () => projects.find((p) => p.id === draft?.linkedReferenceProjectId) || null,
    [draft?.linkedReferenceProjectId, projects]
  )

  const availableProjects = useMemo(
    () => projects.filter((p) => p.status !== 'Concluído'),
    [projects]
  )

  const triggerUpdateFeedback = (label: string) => {
    setLastUpdatedBadge(label)
    window.setTimeout(() => {
      setLastUpdatedBadge((current) => (current === label ? null : current))
    }, 3200)
  }

  const handleSendRefinement = (event?: React.FormEvent, customCommand?: string) => {
    if (event) event.preventDefault()
    const text = (customCommand ?? chatInput).trim()
    if (!text || !draft) return

    if (draft.mode !== 'brief') {
      const briefDraft = buildInitialBriefState({
        prompt: text,
        products,
        brands,
        projects,
        linkedProjectId,
      })
      briefDraft.mode = 'brief'
      setDraft(briefDraft)
      setChatInput('')
      return
    }

    const updated = applyChatRefinement(text, draft, products)
    setDraft(updated)
    if (!customCommand) setChatInput('')
    const lastTurn = updated.turns[updated.turns.length - 1]
    if (lastTurn?.highlights?.[0]) {
      triggerUpdateFeedback(lastTurn.highlights[0])
    }
  }

  const handleOpenInFullConfigurator = () => {
    if (!draft || !draft.selectedProduct) {
      navigate('/novo-projeto')
      return
    }

    const savedDraft = {
      selectedCode: draft.selectedProduct.code,
      step: 'configure',
      targetProjectId: draft.targetProjectId,
      creatingNewProject: draft.creatingNewProject,
      name: draft.campaignName,
      objective: draft.objective,
      overview: draft.overview,
      projectGoal: draft.projectGoal,
      audience: draft.audience,
      tone: draft.tone,
      notApplicable: { audience: !draft.audience, tone: !draft.tone },
      creativePath: draft.creativePath,
      referenceLinks: draft.referenceLinks,
      selectedApplications: draft.configuredFormats.map((f) => f.formatName),
      selectedSizes: draft.configuredFormats.map((f) => f.dimension),
      selectedFinalFormat: draft.selectedFinalFormat,
      selectedEditableFormat: draft.selectedEditableFormat,
      scope: draft.scope,
      configuredFormats: draft.configuredFormats,
      activeFormatId: draft.configuredFormats[0]?.id || null,
    }

    window.localStorage.setItem('allyo-request-draft:new-project', JSON.stringify(savedDraft))
    navigate('/novo-projeto')
  }

  const handleSubmitBrief = async () => {
    if (!draft || submitting) return

    const product = draft.selectedProduct || products[0]
    if (!product) {
      notify('Selecione um produto do catálogo para enviar o projeto.')
      return
    }

    const projectName = draft.campaignName.trim() || product.name
    const overviewText =
      draft.overview.trim().length >= 10
        ? draft.overview.trim()
        : `Briefing para ${projectName}: desenvolvimento de criativos e entregáveis conforme escopo.`

    const formattedFormats = draft.configuredFormats.map(
      (f) =>
        `${f.channel}: ${f.formatName} — ${f.dimension}${f.isPrincipal ? ' (Peça Principal)' : ''}`
    )

    setSubmitting(true)
    try {
      const created = await addProject({
        existingProjectId: !draft.creatingNewProject && draft.targetProjectId ? draft.targetProjectId : undefined,
        name: projectName,
        service: product.name,
        status: 'Em andamento',
        deadline: 'A definir',
        progress: 8,
        tasks: deliverables.length,
        unread: 0,
        accent: categoryAccent[product.category] || '#d0f08e',
        team: [],
        description: overviewText,
        objective: draft.objective || `Criar ${product.name.toLocaleLowerCase('pt-BR')}`,
        overview: `${overviewText}\n\nDireção Criativa:\n${draft.designDirection.map((d) => `• ${d}`).join('\n')}`,
        projectGoal: draft.projectGoal || 'Engajamento',
        audience: draft.audience || undefined,
        tone: draft.tone || undefined,
        creativePath: draft.creativePath,
        referenceLinks: draft.referenceLinks,
        selectedFormats: [
          ...formattedFormats,
          `Arquivo final: ${draft.selectedFinalFormat}`,
          `Arquivo aberto: ${draft.selectedEditableFormat}`,
        ],
        catalogCode: product.code,
        catalogScope: draft.scope,
      })

      void refreshAccount()
      setCreatedProjectId(created.id)
    } catch (error: any) {
      const msg = error?.message || 'Não foi possível criar o projeto. Verifique seu saldo de créditos.'
      notify(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Success confirmation state inside the Studio
  if (createdProjectId && draft) {
    return createPortal(
      <div className="brief-studio-shell" role="dialog" aria-modal="true" aria-label="Briefing enviado com sucesso">
        <div className="brief-studio-frame brief-studio-frame--success">
          <button type="button" className="brief-studio-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
          <div className="brief-studio-success">
            <div className="brief-studio-success__icon">
              <Check size={28} />
            </div>
            <span className="brief-studio-success__tag">Briefing enviado para produção</span>
            <h2>Seu projeto "{draft.campaignName}" já está em andamento!</h2>
            <p>
              Criamos o escopo com <strong>{deliverables.length} tarefa(s)</strong>, formatos configurados e
              direcionamento criativo para o time Allyo. Prazo estimado:{' '}
              <strong>~{totalEstimatedDays} dia(s) úteis</strong>.
            </p>
            <div className="brief-studio-success__tasks">
              {deliverables.map((item) => (
                <div key={item.id} className="brief-studio-success__task-row">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.team} · ~{item.deadlineDays}d úteis · {formatCredits(item.credits)} cr.
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <div className="brief-studio-success__actions">
              <button type="button" className="secondary-button" onClick={onClose}>
                Voltar ao início
              </button>
              <button
                type="button"
                className="brief-studio-submit-btn"
                onClick={() => navigate(`/projetos/${createdProjectId}`)}
              >
                Abrir projeto e acompanhar tarefas <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="brief-studio-shell" role="dialog" aria-modal="true" aria-label="Allyo Brief Studio">
      <div className="brief-studio-frame">
        {/* Clean Minimal Top Bar (Superside Image 5 style) */}
        <header className="brief-studio-topbar">
          <div className="brief-studio-topbar__left">
            <span className="brief-studio-brand-pill">
              <Sparkles size={13} />
              Allyo Brief Studio
            </span>

            {!isGenerating && draft?.mode === 'brief' && (
              <span className="brief-studio-meta-summary">
                <Clock3 size={13} />
                ~{totalEstimatedDays} dias úteis · {deliverables.length} tarefas ·{' '}
                {quoteLoading ? 'Calculando...' : `${formatCredits(totalEstimatedCredits)} créditos`}
              </span>
            )}
          </div>

          <div className="brief-studio-topbar__right">
            {!isGenerating && draft?.mode === 'brief' && (
              <>
                {unresolvedGaps.length > 0 && (
                  <button
                    type="button"
                    className={`brief-studio-gaps-toggle ${showGapsDrawer ? 'is-active' : ''}`}
                    onClick={() => {
                      setShowGapsDrawer((v) => !v)
                      chatInputRef.current?.focus()
                    }}
                  >
                    Preencher lacunas
                    <span className="brief-studio-gaps-badge">{unresolvedGaps.length}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="brief-studio-configurator-btn"
                  onClick={handleOpenInFullConfigurator}
                  title="Personalizar formatos e configurações detalhadas"
                >
                  <SlidersHorizontal size={14} />
                  Personalizar escopo
                </button>

                <button
                  type="button"
                  className="brief-studio-submit-btn"
                  disabled={submitting}
                  onClick={() => void handleSubmitBrief()}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="spin" /> Enviando...
                    </>
                  ) : (
                    <>Enviar briefing do projeto</>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              className="brief-studio-close"
              onClick={onClose}
              aria-label="Fechar Brief Studio"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Main White Sheet Canvas */}
        <div className="brief-studio-sheet">
          {/* User initial message bubble on top right (Superside Image 3 & 5) */}
          <div className="brief-studio-user-bubble-row">
            <div className="brief-studio-user-bubble">
              <p>
                {(() => {
                  if (!linkedProject) return initialPrompt
                  const idx = initialPrompt.toLowerCase().indexOf(linkedProject.name.toLowerCase())
                  if (idx !== -1) {
                    const before = initialPrompt.slice(0, idx)
                    const matchedText = initialPrompt.slice(idx, idx + linkedProject.name.length)
                    const after = initialPrompt.slice(idx + linkedProject.name.length)
                    return (
                      <>
                        {before}
                        <span className="brief-studio-linked-ref">
                          {matchedText} <Link2 size={13} />
                        </span>
                        {after}
                      </>
                    )
                  }
                  return (
                    <>
                      {initialPrompt}{' '}
                      <span className="brief-studio-linked-ref">
                        {linkedProject.name} <Link2 size={13} />
                      </span>
                    </>
                  )
                })()}
              </p>
            </div>
          </div>

          {/* Phase 1: Animated Step-by-Step Checklist (Superside Image 3) */}
          {isGenerating ? (
            <div className="brief-studio-processing">
              <div className="brief-studio-processing__progress">
                <span style={{ width: `${Math.min(100, (processingStep + 1) * 24)}%` }} />
              </div>
              <ul className="brief-studio-steps">
                {PROCESSING_STEPS.map((stepObj, idx) => {
                  const done = processingStep > idx
                  const active = processingStep === idx
                  const visible = processingStep >= idx
                  if (!visible) return null
                  return (
                    <li
                      key={stepObj.label}
                      className={`brief-studio-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
                    >
                      <span className="brief-studio-step__icon">
                        {done ? <Check size={13} /> : <Loader2 size={13} className="spin" />}
                      </span>
                      <div className="brief-studio-step__body">
                        <span className="brief-studio-step__text">{stepObj.label}</span>
                        <small className="brief-studio-step__detail">{stepObj.detail}</small>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <button
                type="button"
                className="brief-studio-skip-btn"
                onClick={() => setIsGenerating(false)}
              >
                Pular animação →
              </button>
            </div>
          ) : draft?.mode === 'insights' || draft?.mode === 'about' ? (
            /* Assistant Mode for "Insights do projeto" & "Sobre a Allyo" */
            <div className="brief-studio-assistant-view">
              {draft.mode === 'insights' ? (
                <div className="brief-studio-doc">
                  <div className="brief-studio-doc__header">
                    <h1>Insights do seu espaço</h1>
                    <p className="brief-studio-doc__subtitle">
                      Resumo operacional atualizado em tempo real
                    </p>
                  </div>

                  <div className="brief-studio-insights-grid">
                    <div className="brief-studio-insight-card">
                      <span>Projetos ativos</span>
                      <strong>{availableProjects.length}</strong>
                      <small>{projects.length} projetos totais no histórico</small>
                    </div>
                    <div className="brief-studio-insight-card">
                      <span>Créditos disponíveis</span>
                      <strong>{formatCredits(account?.workspace.creditsAvailable ?? 0)} cr.</strong>
                      <small>Plano {account?.workspace.plan || 'Enterprise'}</small>
                    </div>
                    <div className="brief-studio-insight-card">
                      <span>Time dedicado</span>
                      <strong>{allyoTeam.length || 3} especialistas</strong>
                      <small>Direção de Arte, Copy e Motion</small>
                    </div>
                  </div>

                  <section className="brief-studio-section">
                    <h2>Recomendações para suas próximas campanhas</h2>
                    <ul className="brief-studio-bullet-list">
                      <li>
                        Aproveite seus créditos disponíveis para criar pacotes multicanal (Instagram Feed +
                        Stories + LinkedIn Ads) em um único briefing.
                      </li>
                      <li>
                        Incluir variações de Copywriting (Headline + Body) no mesmo escopo acelera seus testes
                        A/B em até 40%.
                      </li>
                    </ul>
                  </section>

                  <div className="brief-studio-mode-switch">
                    <button
                      type="button"
                      className="brief-studio-submit-btn"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          mode: 'brief',
                        })
                      }
                    >
                      <Sparkles size={15} /> Elaborar um briefing de campanha agora
                    </button>
                  </div>
                </div>
              ) : (
                <div className="brief-studio-doc">
                  <div className="brief-studio-doc__header">
                    <h1>Sobre a operação criativa Allyo</h1>
                    <p className="brief-studio-doc__subtitle">
                      Como transformamos seus pedidos em campanhas completas com prazos previsíveis
                    </p>
                  </div>

                  <section className="brief-studio-section">
                    <h2>Como funciona o escopo inteligente</h2>
                    <ul className="brief-studio-bullet-list">
                      <li>
                        <strong>1. Briefing Conversacional ou por Catálogo:</strong> Digite o que precisa na
                        barra da Home e a Allyo estrutura automaticamente o projeto, as tarefas, os formatos e
                        os prazos.
                      </li>
                      <li>
                        <strong>2. Squad Criativo Alocado Automaticamente:</strong> Cada entregável do escopo
                        é atribuído ao especialista ideal (Diretor de Arte, Copywriter ou Motion Designer).
                      </li>
                      <li>
                        <strong>3. SLA Transparente em Horas Úteis:</strong> Prazos calculados automaticamente
                        (das 9h às 18h em dias úteis) de acordo com os créditos de cada tarefa.
                      </li>
                      <li>
                        <strong>4. Revisão Visual Interativa:</strong> Aprove ou comente diretamente sobre as
                        peças entregues dentro de cada projeto.
                      </li>
                    </ul>
                  </section>

                  <div className="brief-studio-mode-switch">
                    <button
                      type="button"
                      className="brief-studio-submit-btn"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          mode: 'brief',
                        })
                      }
                    >
                      <Sparkles size={15} /> Começar um novo briefing agora
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Phase 2: Pure Editorial Brief Document (Superside Image 4 style) */
            draft && (
              <div className="brief-studio-doc">
                <div className="brief-studio-doc__header">
                  <div className="brief-studio-doc__title-row">
                    <span className="brief-studio-doc__eyebrow">Brief</span>
                    {lastUpdatedBadge && (
                      <span className="brief-studio-live-badge">
                        <Check size={12} /> {lastUpdatedBadge}
                      </span>
                    )}
                  </div>

                  {editingName ? (
                    <div className="brief-studio-inline-name-edit">
                      <input
                        type="text"
                        value={draft.campaignName}
                        onChange={(e) =>
                          setDraft({ ...draft, campaignName: e.target.value, nameConfirmed: true })
                        }
                        onBlur={() => setEditingName(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingName(false)
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <h1
                      className="brief-studio-doc__campaign-title"
                      onClick={() => setEditingName(true)}
                      title="Clique no título para renomear"
                    >
                      {draft.campaignName}
                    </h1>
                  )}
                </div>

                {/* 1. Visão geral do projeto */}
                <section className="brief-studio-section">
                  <h2>Visão geral do projeto</h2>
                  {editingOverview ? (
                    <textarea
                      className="brief-studio-overview-textarea"
                      rows={3}
                      value={draft.overview}
                      onChange={(e) => setDraft({ ...draft, overview: e.target.value })}
                      onBlur={() => setEditingOverview(false)}
                      autoFocus
                    />
                  ) : (
                    <p
                      className="brief-studio-overview-text"
                      onClick={() => setEditingOverview(true)}
                      title="Clique no texto para editar"
                    >
                      {draft.overview}
                    </p>
                  )}
                </section>

                {/* 2. Entregáveis */}
                <section className="brief-studio-section">
                  <h2>Entregáveis</h2>
                  <ul className="brief-studio-bullet-list">
                    {deliverables.map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                  </ul>
                </section>

                {/* 3. Formatos */}
                <section className="brief-studio-section">
                  <h2>Formatos</h2>
                  <ul className="brief-studio-bullet-list">
                    {draft.configuredFormats.map((fmt) => (
                      <li key={fmt.id}>
                        <strong>{fmt.channel}:</strong> {fmt.dimension} ({fmt.formatName} —{' '}
                        {fmt.proportionLabel})
                      </li>
                    ))}

                    {Boolean(draft.scope.addons['criacao-de-conteudo-publicitario']) && (
                      <li>
                        <strong>Copy:</strong> Headlines (máx. 70 caracteres), Corpo (máx. 150 caracteres) e
                        CTA para testes A/B
                      </li>
                    )}

                    <li>
                      <strong>Arquivos:</strong> Final em {draft.selectedFinalFormat} · Editável aberto em{' '}
                      {draft.selectedEditableFormat}
                    </li>
                  </ul>
                </section>

                {/* 4. Direção Criativa */}
                <section className="brief-studio-section">
                  <h2>Direção Criativa</h2>
                  <ul className="brief-studio-bullet-list">
                    {draft.designDirection.map((dir, index) => (
                      <li key={`${dir}-${index}`}>{dir}</li>
                    ))}
                  </ul>
                </section>
              </div>
            )
          )}

          {/* Bottom Conversational Bar */}
          <div className="brief-studio-footer">
            {!isGenerating && draft?.mode === 'brief' && showGapsDrawer && unresolvedGaps.length > 0 && (
              <div className="brief-studio-gaps-bar">
                <div className="brief-studio-gaps-chips">
                  {unresolvedGaps.flatMap((gap) =>
                    gap.options.slice(0, 1).map((opt) => (
                      <button
                        type="button"
                        key={`${gap.id}-${opt.label}`}
                        className="brief-studio-gap-chip"
                        onClick={() => handleSendRefinement(undefined, opt.command)}
                      >
                        {opt.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <form
              className={`brief-studio-chat-form ${isChatListening ? 'is-listening' : ''}`}
              onSubmit={(e) => handleSendRefinement(e)}
            >
              <input
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isGenerating}
                placeholder={
                  isGenerating
                    ? 'A Allyo está preparando o seu briefing...'
                    : isChatListening
                      ? 'Ouvindo sua instrução por voz...'
                      : 'Edite seu briefing com a Allyo (ex: "mudar para 5 peças", "incluir stories", "arquivo em PSD")...'
                }
                aria-label="Edite seu briefing com a Allyo"
              />
              <button
                type="button"
                className={`brief-studio-chat-mic ${isChatListening ? 'is-active' : ''}`}
                disabled={isGenerating}
                onClick={() => {
                  if (!isChatListening) setSpeechBaseChat(chatInput.trim())
                  toggleChatMic()
                }}
                title={isChatListening ? 'Parar gravação' : 'Falar comando por voz'}
                aria-label="Usar microfone"
              >
                <Mic size={18} strokeWidth={2} />
              </button>
              <button
                type="submit"
                className="brief-studio-chat-send"
                disabled={isGenerating || !chatInput.trim()}
                aria-label="Atualizar briefing"
              >
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
