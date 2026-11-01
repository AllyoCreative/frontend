import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Sparkles,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react'
import { useApp } from '../../AppContext'
import { api, type CatalogProduct, type CatalogQuote, type CatalogScope } from '../../services/api'
import {
  applyChatRefinement,
  buildInitialBriefState,
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
  const [editingOverview, setEditingOverview] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [purchasingCredits, setPurchasingCredits] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [lastUpdatedBadge, setLastUpdatedBadge] = useState<string | null>(null)
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [addingLink, setAddingLink] = useState(false)
  const [linkInput, setLinkInput] = useState('')

  const chatInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filePreviewUrls = useMemo(
    () =>
      referenceFiles.map((file) => ({
        file,
        isImage: file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name),
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })),
    [referenceFiles]
  )

  useEffect(() => {
    return () => {
      filePreviewUrls.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url)
      })
    }
  }, [filePreviewUrls])

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const incoming = Array.from(files)
    setReferenceFiles((current) => {
      const existingNames = new Set(current.map((f) => `${f.name}-${f.size}`))
      const unique = incoming.filter((f) => !existingNames.has(`${f.name}-${f.size}`))
      return [...current, ...unique].slice(0, 12)
    })
    triggerUpdateFeedback(`${incoming.length} arquivo(s) de referência anexado(s)`)
  }

  const handleRemoveReferenceFile = (index: number) => {
    setReferenceFiles((current) => current.filter((_, idx) => idx !== index))
  }

  const handleAddReferenceLink = () => {
    if (!draft) return
    const raw = linkInput.trim()
    if (!raw) return
    const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    try {
      const parsed = new URL(normalizedUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        notify('Informe um link válido começando com https://')
        return
      }
      if (!draft.referenceLinks.includes(parsed.toString())) {
        setDraft({
          ...draft,
          referenceLinks: [...draft.referenceLinks, parsed.toString()],
        })
        triggerUpdateFeedback('Link de referência adicionado')
      }
      setLinkInput('')
      setAddingLink(false)
    } catch {
      notify('Link de referência inválido. Exemplo: https://figma.com/...')
    }
  }

  const handleRemoveReferenceLink = (link: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      referenceLinks: draft.referenceLinks.filter((item) => item !== link),
    })
  }

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
      const prod = draft.selectedProduct!
      api
        .quoteCatalogProduct(prod.code, {
          ...draft.scope,
          quantity: prod.billing.maxQuantity
            ? Math.min(draft.scope.quantity, prod.billing.maxQuantity)
            : draft.scope.quantity,
          resizeCount: prod.credits.resizeAllowed ? draft.scope.resizeCount : 0,
          variationCount: prod.credits.variationAllowed ? draft.scope.variationCount : 0,
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

    // Extract any URLs pasted directly in the chat bar as reference links
    const urlMatches = text.match(/https?:\/\/[^\s"'<>]+/gi) || []
    let nextDraft = draft
    if (urlMatches.length > 0) {
      const validUrls = urlMatches.filter((u) => {
        try {
          return ['http:', 'https:'].includes(new URL(u).protocol)
        } catch {
          return false
        }
      })
      if (validUrls.length > 0) {
        nextDraft = {
          ...draft,
          referenceLinks: Array.from(new Set([...draft.referenceLinks, ...validUrls])).slice(0, 12),
        }
      }
    }

    const updated = applyChatRefinement(text, nextDraft, products)
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

  const sanitizeScopeForProduct = (rawScope: CatalogScope, product: CatalogProduct): CatalogScope => {
    const cleanAddons: Record<string, number> = {}
    for (const [key, val] of Object.entries(rawScope.addons || {})) {
      const qty = Math.round(Number(val || 0))
      if (qty <= 0) continue
      if (product.addons.some((a) => a.code === key)) {
        cleanAddons[key] = qty
        continue
      }
      if (key === 'criacao-de-conteudo-publicitario') {
        const mapped = product.addons.find((a) => /(^conteudo-para-|^texto-para-|^roteiro-para-video$)/i.test(a.code))
        if (mapped) cleanAddons[mapped.code] = qty
      } else if (key === 'legenda-para-redes-sociais') {
        const mapped = product.addons.find((a) => /(^legenda-para-redes-sociais$|^legendagem$|^legendagem-via-ia$)/i.test(a.code))
        if (mapped) cleanAddons[mapped.code] = qty
      } else if (key === 'animacao-de-imagem-estatica-via-ia') {
        const mapped = product.addons.find((a) => /(^animacao-de-imagem-estatica-via-ia$|^animacao-de-banner-em-html5$)/i.test(a.code))
        if (mapped) cleanAddons[mapped.code] = qty
      }
    }

    const baseQty = Math.max(1, Math.round(rawScope.quantity || product.billing.includedQuantity || 1))
    return {
      quantity: product.billing.maxQuantity ? Math.min(baseQty, product.billing.maxQuantity) : baseQty,
      taskRepeats: Math.max(1, Math.min(100, Math.round(rawScope.taskRepeats || 1))),
      resizeCount: product.credits.resizeAllowed ? Math.max(0, Math.round(rawScope.resizeCount || 0)) : 0,
      variationCount: product.credits.variationAllowed ? Math.max(0, Math.round(rawScope.variationCount || 0)) : 0,
      characterCount: Math.max(0, Math.round(rawScope.characterCount || 0)),
      addons: cleanAddons,
    }
  }

  const handleSubmitBrief = async () => {
    if (!draft || submitting) return

    const product = draft.selectedProduct || products[0]
    if (!product) {
      setSubmitError('Carregando catálogo de serviços... tente novamente em um instante.')
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

    const validReferenceLinks = (draft.referenceLinks || []).filter((link) => {
      try {
        return ['http:', 'https:'].includes(new URL(link).protocol)
      } catch {
        return false
      }
    }).slice(0, 12)

    const sanitizedScope = sanitizeScopeForProduct(draft.scope, product)

    setSubmitting(true)
    setSubmitError(null)
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
        audience: draft.audience?.trim() || undefined,
        tone: draft.tone?.trim() || undefined,
        creativePath: draft.creativePath,
        referenceLinks: validReferenceLinks,
        selectedFormats: [
          ...formattedFormats,
          `Arquivo final: ${draft.selectedFinalFormat}`,
          `Arquivo aberto: ${draft.selectedEditableFormat}`,
        ],
        catalogCode: product.code,
        catalogScope: sanitizedScope,
      })

      if (referenceFiles.length > 0) {
        const uploads = await Promise.allSettled(
          referenceFiles.map(async (file) => {
            const uploaded = await api.uploadFile(file, 'project-files')
            return api.addProjectFile(created.id, {
              name: file.name,
              fileKey: uploaded.fileKey,
              contentType: uploaded.contentType,
              sizeBytes: uploaded.sizeBytes,
              category: 'briefing',
            })
          })
        )
        const failed = uploads.filter((r) => r.status === 'rejected').length
        if (failed > 0) {
          notify(`Projeto criado, mas ${failed} arquivo(s) não puderam ser anexados.`)
        }
      }

      void refreshAccount()
      setCreatedProjectId(created.id)
      onClose()
      navigate(`/projetos/${created.id}/visao-geral`)
    } catch (error: any) {
      const msg = error?.message || 'Não foi possível criar o projeto. Verifique seu saldo de créditos.'
      setSubmitError(msg)
      notify(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickTopUpAndSubmit = async () => {
    if (purchasingCredits) return
    setPurchasingCredits(true)
    try {
      const packages = account?.creditPackages || []
      const targetPack =
        packages.find((p) => p.recommended) || packages[packages.length - 1] || packages[0]
      const packageId = targetPack?.id || 'pack-50'
      await api.purchaseCredits(packageId)
      await refreshAccount()
      setSubmitError(null)
      notify(`Créditos adicionados ao seu espaço! Enviando briefing...`)
      await handleSubmitBrief()
    } catch (error: any) {
      notify(error?.message || 'Não foi possível recarregar créditos automaticamente.')
    } finally {
      setPurchasingCredits(false)
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
                  disabled={submitting || purchasingCredits}
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

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.fig,.ai,.psd,.zip"
          onChange={(e) => {
            handleFilesSelected(e.target.files)
            e.target.value = ''
          }}
          style={{ display: 'none' }}
        />

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
                {submitError && (
                  <div className="brief-studio-error-banner" role="alert">
                    <div className="brief-studio-error-banner__content">
                      <AlertCircle size={17} />
                      <span>{submitError}</span>
                    </div>
                    <div className="brief-studio-error-banner__actions">
                      {/saldo|cr[eé]dito|insuficiente/i.test(submitError) ? (
                        <button
                          type="button"
                          className="brief-studio-error-action-btn"
                          disabled={purchasingCredits || submitting}
                          onClick={() => void handleQuickTopUpAndSubmit()}
                        >
                          {purchasingCredits || submitting ? (
                            <>
                              <Loader2 size={14} className="spin" /> Recarregando e enviando...
                            </>
                          ) : (
                            <>+ Recarregar créditos e enviar projeto</>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="brief-studio-error-action-btn"
                          disabled={submitting}
                          onClick={() => void handleSubmitBrief()}
                        >
                          Tentar novamente
                        </button>
                      )}
                      <button
                        type="button"
                        className="brief-studio-error-dismiss"
                        onClick={() => setSubmitError(null)}
                        aria-label="Fechar aviso"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                )}

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

                {/* 5. Referências e Arquivos de Apoio */}
                <section className="brief-studio-section brief-studio-ref-section">
                  <div className="brief-studio-ref-header">
                    <div>
                      <h2>Referências e Arquivos de Apoio</h2>
                      <p className="brief-studio-ref-subtitle">
                        Imagens, PDFs, documentos ou links anexados aqui aparecem diretamente no painel de
                        briefing do criativo.
                      </p>
                    </div>
                    <div className="brief-studio-ref-actions">
                      <button
                        type="button"
                        className="brief-studio-ref-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} /> Anexar arquivos
                      </button>
                      <button
                        type="button"
                        className="brief-studio-ref-btn is-secondary"
                        onClick={() => setAddingLink(true)}
                      >
                        <Plus size={14} /> Adicionar link
                      </button>
                    </div>
                  </div>

                  {addingLink && (
                    <div className="brief-studio-ref-link-form">
                      <input
                        type="text"
                        placeholder="Cole o link de referência (Figma, Drive, Behance, Instagram...)"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddReferenceLink()
                          } else if (e.key === 'Escape') {
                            setAddingLink(false)
                            setLinkInput('')
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="brief-studio-ref-link-save"
                        onClick={() => handleAddReferenceLink()}
                      >
                        Adicionar
                      </button>
                      <button
                        type="button"
                        className="brief-studio-ref-link-cancel"
                        onClick={() => {
                          setAddingLink(false)
                          setLinkInput('')
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {filePreviewUrls.length === 0 && draft.referenceLinks.length === 0 && !addingLink ? (
                    <div
                      className="brief-studio-ref-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                      }}
                    >
                      <Paperclip size={16} />
                      <span>
                        Clique para anexar imagens de referência, apresentações, roteiros ou documentos para o
                        time criativo
                      </span>
                    </div>
                  ) : (
                    <div className="brief-studio-ref-lists">
                      {filePreviewUrls.length > 0 && (
                        <div className="brief-studio-ref-files-grid">
                          {filePreviewUrls.map((item, idx) => (
                            <div
                              key={`${item.file.name}-${item.file.size}-${idx}`}
                              className="brief-studio-ref-file-card"
                            >
                              {item.isImage && item.url ? (
                                <img
                                  src={item.url}
                                  alt={item.file.name}
                                  className="brief-studio-ref-file-thumb"
                                />
                              ) : (
                                <div className="brief-studio-ref-file-icon">
                                  <FileText size={20} />
                                </div>
                              )}
                              <div className="brief-studio-ref-file-meta">
                                <strong title={item.file.name}>{item.file.name}</strong>
                                <small>{Math.max(1, Math.round(item.file.size / 1024))} KB · Briefing</small>
                              </div>
                              <button
                                type="button"
                                className="brief-studio-ref-remove"
                                onClick={() => handleRemoveReferenceFile(idx)}
                                aria-label={`Remover ${item.file.name}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {draft.referenceLinks.length > 0 && (
                        <div className="brief-studio-ref-links-list">
                          {draft.referenceLinks.map((link) => (
                            <div key={link} className="brief-studio-ref-link-pill">
                              <ExternalLink size={13} />
                              <a href={link} target="_blank" rel="noreferrer">
                                {link}
                              </a>
                              <button
                                type="button"
                                className="brief-studio-ref-remove"
                                onClick={() => handleRemoveReferenceLink(link)}
                                aria-label="Remover link"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )
          )}

          {/* Bottom Conversational Bar */}
          <div className="brief-studio-footer">
            <form
              className={`brief-studio-chat-form ${isChatListening ? 'is-listening' : ''}`}
              onSubmit={(e) => handleSendRefinement(e)}
            >
              <button
                type="button"
                className="brief-studio-chat-attach"
                disabled={isGenerating}
                onClick={() => fileInputRef.current?.click()}
                title="Anexar imagens ou documentos de referência"
                aria-label="Anexar arquivos de referência"
              >
                <Paperclip size={18} strokeWidth={2} />
                {referenceFiles.length > 0 && (
                  <span className="brief-studio-chat-attach-count">{referenceFiles.length}</span>
                )}
              </button>
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
