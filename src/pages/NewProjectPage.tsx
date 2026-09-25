import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, FileText, Link2, Minus, Paperclip, Plus, Upload, X } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { api, type CatalogProduct, type CatalogQuote, type CatalogScope } from '../services/api'

type FlowStep = 'catalog' | 'brief' | 'configure' | 'review' | 'success'
type CatalogFilter = 'all' | 'design' | 'production' | 'ai' | 'fast'

const catalogFilters: Array<{
  id: CatalogFilter
  label: string
  title: string
  description: string
  asset?: 'catalog.imgGravityUiBrush' | 'catalog.imgTablerVideo' | 'catalog.imgGroup' | 'catalog.imgMaterialSymbolsBoltBoostRounded'
}> = [
  { id: 'all', label: 'Todos os serviços', title: 'Todos os serviços', description: 'Explore o catálogo completo e encontre o formato ideal para o seu projeto.' },
  { id: 'design', label: 'Criação e Design', title: 'Criação e Design', description: 'Ativos com precisão de pixel e alinhados à marca, em velocidade relâmpago.', asset: 'catalog.imgGravityUiBrush' },
  { id: 'production', label: 'Produção', title: 'Produção', description: 'Conteúdos audiovisuais produzidos para cada canal e objetivo.', asset: 'catalog.imgTablerVideo' },
  { id: 'ai', label: 'IA Disponível', title: 'IA Disponível', description: 'Soluções criativas potencializadas por inteligência artificial.', asset: 'catalog.imgGroup' },
  { id: 'fast', label: 'Entrega Rápida', title: 'Entrega Rápida', description: 'Produtos com prazo estimado de até 8 horas úteis.', asset: 'catalog.imgMaterialSymbolsBoltBoostRounded' },
]

const goals = ['Reconhecimento de marca', 'Geração de demanda', 'Engajamento', 'Vendas e conversão', 'Comunicação interna', 'Outro']

const categoryAccent: Record<string, string> = {
  'Redes Sociais': '#bde8e1',
  Digital: '#cfe5f4',
  Impresso: '#f8e5bd',
  'Vídeo & Áudio': '#d9defb',
  Criação: '#f7d5e8',
  Copywriting: '#dcebc8',
  'Feitos com IA': '#ead8f5',
}

const formatCredits = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
const formatFileSize = (bytes: number) => bytes < 1_048_576 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`

function initialScope(product: CatalogProduct): CatalogScope {
  return {
    quantity: Math.max(1, Math.round(product.billing.includedQuantity || 1), product.billing.step * product.billing.includedGroups),
    taskRepeats: 1,
    resizeCount: 0,
    variationCount: 0,
    characterCount: 1,
    addons: {},
  }
}

function addonInitialQuantity(product: CatalogProduct, addonCode: string) {
  const addon = product.addons.find((item) => item.code === addonCode)
  const step = Math.max(1, addon?.rule?.step || 1)
  return Math.max(step, (addon?.rule?.included || 0) * step)
}

function workOptionsFor(product: CatalogProduct) {
  const productName = product.name.toLocaleLowerCase('pt-BR')
  return [`Criar ${productName}`, 'Reformular ou evoluir um material existente', 'Quero discutir possibilidades com o time Allyo']
}

function availableFormatsFor(product: CatalogProduct) {
  return Array.from(new Set([...product.formats.final, ...product.formats.available].filter(Boolean))).slice(0, 12)
}

export function NewProjectPage() {
  const navigate = useNavigate()
  const { addProject, notify } = useApp()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loaded, setLoaded] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [filter, setFilter] = useState<CatalogFilter>('design')
  const [selected, setSelected] = useState<CatalogProduct | null>(null)
  const [step, setStep] = useState<FlowStep>('catalog')
  const [scope, setScope] = useState<CatalogScope>({ quantity: 1, taskRepeats: 1, resizeCount: 0, variationCount: 0, characterCount: 1, addons: {} })
  const [quote, setQuote] = useState<CatalogQuote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [overview, setOverview] = useState('')
  const [projectGoal, setProjectGoal] = useState(goals[0])
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('')
  const [notApplicable, setNotApplicable] = useState({ audience: false, tone: false })
  const [creativePath, setCreativePath] = useState<'new-direction' | 'follow-references'>('follow-references')
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [referenceLinks, setReferenceLinks] = useState<string[]>([])
  const [linkDraft, setLinkDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    api.getCatalog().then((catalog) => {
      if (!active) return
      setProducts(catalog.products)
      setLoaded(true)
    }).catch((error: unknown) => {
      if (!active) return
      setCatalogError(error instanceof Error ? error.message : 'Não foi possível carregar o catálogo')
      setLoaded(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selected || step === 'catalog' || step === 'success') return
    let active = true
    const timer = window.setTimeout(() => {
      api.quoteCatalogProduct(selected.code, scope).then((result) => {
        if (!active) return
        setQuote(result)
        setQuoteError('')
      }).catch((error: unknown) => {
        if (!active) return
        setQuote(null)
        setQuoteError(error instanceof Error ? error.message : 'Não foi possível calcular os créditos')
      })
    }, 180)
    return () => { active = false; window.clearTimeout(timer) }
  }, [scope, selected, step])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (step === 'review') setStep('configure')
      else if (step === 'configure') setStep('brief')
      else if (step === 'brief') setStep('catalog')
      else navigate(-1)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [navigate, step])

  const visible = useMemo(() => products.filter((product) => {
    if (filter === 'production') return product.category === 'Vídeo & Áudio'
    if (filter === 'ai') return product.category === 'Feitos com IA'
    if (filter === 'fast') return product.slaHours <= 8
    if (filter === 'design') return product.category !== 'Vídeo & Áudio' && product.category !== 'Feitos com IA'
    return true
  }), [filter, products])

  const activeFilter = catalogFilters.find((item) => item.id === filter) || catalogFilters[0]
  const briefReady = Boolean(name.trim() && objective && overview.trim().length >= 10 && projectGoal)

  const selectProduct = (product: CatalogProduct) => {
    const formats = availableFormatsFor(product)
    setSelected(product)
    setScope(initialScope(product))
    setQuote(null)
    setQuoteError('')
    setObjective(workOptionsFor(product)[0])
    setSelectedFormats(formats.slice(0, 1))
    setName('')
    setOverview('')
    setProjectGoal(goals[0])
    setAudience('')
    setTone('')
    setNotApplicable({ audience: false, tone: false })
    setCreativePath('follow-references')
    setReferenceFiles([])
    setReferenceLinks([])
    setStep('brief')
  }

  const updateCounter = (key: keyof Pick<CatalogScope, 'quantity' | 'taskRepeats' | 'resizeCount' | 'variationCount' | 'characterCount'>, delta: number) => {
    setQuote(null)
    setQuoteError('')
    setScope((current) => {
      const minimum = key === 'quantity' || key === 'taskRepeats' || key === 'characterCount' ? 1 : 0
      const increment = key === 'quantity' ? Math.max(1, selected?.billing.step || 1) : 1
      const nextValue = Math.max(minimum, current[key] + delta * increment)
      const limitedValue = key === 'quantity' && selected?.billing.maxQuantity ? Math.min(selected.billing.maxQuantity, nextValue) : nextValue
      return { ...current, [key]: limitedValue }
    })
  }

  const toggleAddon = (addonCode: string) => {
    if (!selected) return
    setQuote(null)
    setQuoteError('')
    setScope((current) => ({ ...current, addons: { ...current.addons, [addonCode]: current.addons[addonCode] > 0 ? 0 : addonInitialQuantity(selected, addonCode) } }))
  }

  const toggleFormat = (format: string) => setSelectedFormats((current) => current.includes(format) ? current.filter((item) => item !== format) : [...current, format])

  const addReferenceLink = () => {
    const next = linkDraft.trim()
    if (!next) return
    try {
      const parsed = new URL(next)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid')
      if (!referenceLinks.includes(parsed.toString())) setReferenceLinks((current) => [...current, parsed.toString()])
      setLinkDraft('')
    } catch {
      notify('Insira um link válido começando com http:// ou https://')
    }
  }

  const addReferenceFiles = (files: FileList | null) => {
    if (!files) return
    setReferenceFiles((current) => {
      const next = [...current]
      Array.from(files).forEach((file) => {
        if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file)
      })
      return next.slice(0, 10)
    })
  }

  const submit = async () => {
    if (!selected || !briefReady || !quote || submitting) return
    setSubmitting(true)
    try {
      const created = await addProject({
        name: name.trim(), service: selected.name, status: 'Em andamento', deadline: 'A definir', progress: 8,
        tasks: scope.taskRepeats + Object.values(scope.addons).filter((quantity) => quantity > 0).length, unread: 0,
        accent: categoryAccent[selected.category] || '#d7ff70', team: [], description: overview.trim(), objective, overview: overview.trim(), projectGoal,
        audience: !notApplicable.audience ? audience.trim() : undefined,
        tone: !notApplicable.tone ? tone.trim() : undefined,
        creativePath, referenceLinks, selectedFormats, catalogCode: selected.code, catalogScope: scope,
      })
      const uploads = await Promise.allSettled(referenceFiles.map(async (file) => {
        const uploaded = await api.uploadFile(file, 'project-files')
        return api.addProjectFile(created.id, { name: file.name, fileKey: uploaded.fileKey, contentType: uploaded.contentType, sizeBytes: uploaded.sizeBytes, category: 'briefing' })
      }))
      const failedUploads = uploads.filter((result) => result.status === 'rejected').length
      if (failedUploads) notify(`Projeto criado, mas ${failedUploads} arquivo(s) não foram anexados.`)
      setStep('success')
    } catch {
      // O contexto global mostra a mensagem da criação.
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') return <div className="new-project-page success-page">
    <button className="close-flow" onClick={() => navigate('/')}><X size={22} /></button>
    <div className="success-mark"><Check size={34} /></div><span className="eyebrow">Briefing enviado</span><h1>Seu projeto decolou.</h1>
    <p>O time Allyo recebeu o contexto, o escopo e as referências. Agora vamos validar a solicitação e confirmar a entrega.</p>
    <div className="success-summary"><span style={{ background: categoryAccent[selected?.category || ''] }} /><div><small>{selected?.category} · código {selected?.code}</small><strong>{name}</strong><p>{selected?.name} · {quote ? `${formatCredits(quote.totalCredits)} créditos estimados` : ''}</p></div></div>
    <div className="success-actions"><button className="secondary-button" onClick={() => navigate('/projetos')}>Ver projetos</button><button className="primary-button" onClick={() => navigate('/')}>Voltar ao início <ArrowRight size={16} /></button></div>
  </div>

  return <div className="new-project-page new-project-modal">
    <section className={`new-project-dialog new-project-dialog--${step}`} role="dialog" aria-modal="true" aria-labelledby="new-project-title">
      <header className="new-project-dialog__header">
        {step === 'catalog' ? <strong id="new-project-title">Novo projeto</strong> : <button type="button" className="new-project-dialog__back new-project-dialog__brief-title" onClick={() => setStep('catalog')} aria-label="Voltar ao catálogo"><strong id="new-project-title">{selected?.name}</strong></button>}
        {step === 'catalog' ? <nav className="new-project-filters" aria-label="Filtrar catálogo">{catalogFilters.map((item) => <button type="button" key={item.id} className={filter === item.id ? 'active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.asset && <img src={figmaAsset(item.asset)} alt="" />}{item.label}</button>)}</nav> : <FlowProgress step={step} briefReady={briefReady} onStep={setStep} />}
        <button type="button" className="new-project-dialog__close" onClick={() => navigate(-1)} aria-label="Fechar"><img src={figmaAsset(step === 'catalog' ? 'catalog.imgMaterialSymbolsClose' : 'brief.imgMaterialSymbolsClose')} alt="" /></button>
      </header>

      {step === 'catalog' ? <main className="new-project-catalog">
        <header className="new-project-catalog__heading"><h1>{activeFilter.title}</h1><p>{activeFilter.description}</p></header>
        {!loaded && <div className="new-project-catalog-state">Carregando catálogo...</div>}
        {loaded && catalogError && <div className="new-project-catalog-state is-error"><strong>Catálogo indisponível</strong><span>{catalogError}</span><button className="secondary-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
        {loaded && !catalogError && visible.length === 0 && <div className="new-project-catalog-state">Nenhum produto encontrado.</div>}
        <div className="new-project-services">{visible.map((product) => <button type="button" key={product.code} className="new-project-service" onClick={() => selectProduct(product)} aria-label={`${product.name}: ${product.description}`}><span className="new-project-service__preview" /><span className="new-project-service__body"><h2>{product.name}</h2><small>{formatCredits(product.credits.original)} cr. · {formatCredits(product.slaHours)}h úteis</small></span></button>)}</div>
      </main> : selected && <main className="new-project-flow">
        <section className="new-project-flow__main">
          {step === 'brief' && <BriefStep selected={selected} name={name} objective={objective} overview={overview} projectGoal={projectGoal} audience={audience} tone={tone} notApplicable={notApplicable} creativePath={creativePath} referenceFiles={referenceFiles} referenceLinks={referenceLinks} linkDraft={linkDraft} setName={setName} setObjective={setObjective} setOverview={setOverview} setProjectGoal={setProjectGoal} setAudience={setAudience} setTone={setTone} setNotApplicable={setNotApplicable} setCreativePath={setCreativePath} setLinkDraft={setLinkDraft} addReferenceLink={addReferenceLink} addReferenceFiles={addReferenceFiles} removeFile={(index) => setReferenceFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} removeLink={(link) => setReferenceLinks((current) => current.filter((item) => item !== link))} onCancel={() => setStep('catalog')} onNext={() => setStep('configure')} ready={briefReady} />}
          {step === 'configure' && <ConfigureStep selected={selected} scope={scope} selectedFormats={selectedFormats} quoteError={quoteError} updateCounter={updateCounter} toggleAddon={toggleAddon} toggleFormat={toggleFormat} onBack={() => setStep('brief')} onNext={() => setStep('review')} quoteReady={Boolean(quote)} />}
          {step === 'review' && <ReviewStep selected={selected} name={name} overview={overview} objective={objective} projectGoal={projectGoal} audience={notApplicable.audience ? '' : audience} tone={notApplicable.tone ? '' : tone} creativePath={creativePath} selectedFormats={selectedFormats} referenceFiles={referenceFiles} referenceLinks={referenceLinks} scope={scope} quote={quote} submitting={submitting} onBack={() => setStep('configure')} onEditBrief={() => setStep('brief')} onSubmit={() => void submit()} />}
        </section>
        <ProductSummary product={selected} quote={quote} quoteError={quoteError} onChange={() => setStep('catalog')} />
      </main>}
    </section>
  </div>
}

function FlowProgress({ step, briefReady, onStep }: { step: FlowStep; briefReady: boolean; onStep: (step: FlowStep) => void }) {
  const items: Array<{ id: 'brief' | 'configure' | 'review'; label: string }> = [{ id: 'brief', label: 'Briefing' }, { id: 'configure', label: 'Configuração' }, { id: 'review', label: 'Revisão' }]
  const currentIndex = items.findIndex((item) => item.id === step)
  return <nav className="new-project-progress" aria-label="Etapas da solicitação">{items.map((item, index) => <button key={item.id} type="button" className={index === currentIndex ? 'active' : index < currentIndex ? 'complete' : ''} disabled={index > currentIndex || (item.id !== 'brief' && !briefReady)} onClick={() => onStep(item.id)}><span>{index < currentIndex ? <Check size={12} /> : index + 1}</span>{item.label}</button>)}</nav>
}

interface BriefStepProps {
  selected: CatalogProduct; name: string; objective: string; overview: string; projectGoal: string; audience: string; tone: string
  notApplicable: { audience: boolean; tone: boolean }; creativePath: 'new-direction' | 'follow-references'; referenceFiles: File[]; referenceLinks: string[]; linkDraft: string
  setName: (value: string) => void; setObjective: (value: string) => void; setOverview: (value: string) => void
  setProjectGoal: (value: string) => void; setAudience: (value: string) => void; setTone: (value: string) => void
  setNotApplicable: React.Dispatch<React.SetStateAction<{ audience: boolean; tone: boolean }>>; setCreativePath: (value: 'new-direction' | 'follow-references') => void
  setLinkDraft: (value: string) => void; addReferenceLink: () => void; addReferenceFiles: (files: FileList | null) => void; removeFile: (index: number) => void; removeLink: (link: string) => void
  onCancel: () => void; onNext: () => void; ready: boolean
}

function BriefStep(props: BriefStepProps) {
  const toggleNotApplicable = (key: 'audience' | 'tone') => {
    props.setNotApplicable((current) => ({ ...current, [key]: !current[key] }))
    if (key === 'audience') props.setAudience('')
    else props.setTone('')
  }
  return <>
    <FlowHeading eyebrow="Etapa 1 de 3" title="Conte o que precisa ser criado" description="Reunimos só o contexto que realmente ajuda o time a começar bem." />
    <div className="new-project-form-section">
      <label className="new-project-field"><span>Nome do projeto <b>Obrigatório</b></span><input value={props.name} onChange={(event) => props.setName(event.target.value)} placeholder="Ex.: Campanha de lançamento — outubro" autoFocus /></label>
      <label className="new-project-field"><span>O que você quer criar? <b>Obrigatório</b></span><small>Explique o contexto, a mensagem principal e o resultado esperado.</small><textarea value={props.overview} onChange={(event) => props.setOverview(event.target.value)} placeholder="Conte um pouco sobre a necessidade, o momento da marca e o que esta entrega precisa resolver..." /></label>
    </div>
    <div className="new-project-form-section"><SectionTitle title="Como podemos ajudar?" description="Escolha o ponto de partida mais próximo da sua necessidade." /><div className="new-project-choice-list" role="radiogroup">{workOptionsFor(props.selected).map((option) => <label key={option} className={props.objective === option ? 'selected' : ''}><input type="radio" name="objective" checked={props.objective === option} onChange={() => props.setObjective(option)} /><span>{option}</span><CheckCircle2 size={18} /></label>)}</div></div>
    <div className="new-project-form-section"><SectionTitle title="Objetivo principal" description="Isso orienta as decisões criativas e a revisão da entrega." /><div className="new-project-goal-chips">{goals.map((goal) => <button type="button" key={goal} className={props.projectGoal === goal ? 'active' : ''} onClick={() => props.setProjectGoal(goal)}>{goal}</button>)}</div></div>
    <div className="new-project-form-section new-project-context-grid">
      <label className="new-project-field"><span>Público</span><small>Com quem estamos falando?</small><textarea value={props.audience} onChange={(event) => props.setAudience(event.target.value)} disabled={props.notApplicable.audience} placeholder="Perfil, contexto e comportamentos relevantes..." /><button type="button" className="new-project-inline-action" onClick={() => toggleNotApplicable('audience')}>{props.notApplicable.audience ? 'Adicionar público' : 'Não se aplica'}</button></label>
      <label className="new-project-field"><span>Tom e atmosfera</span><small>Como a comunicação deve ser percebida?</small><textarea value={props.tone} onChange={(event) => props.setTone(event.target.value)} disabled={props.notApplicable.tone} placeholder="Ex.: próximo, direto, calmo, premium..." /><button type="button" className="new-project-inline-action" onClick={() => toggleNotApplicable('tone')}>{props.notApplicable.tone ? 'Adicionar direcionamento' : 'Não se aplica'}</button></label>
    </div>
    <div className="new-project-form-section"><SectionTitle title="Direção criativa" description="Defina quanto de exploração o time deve aplicar." /><div className="new-project-paths"><button type="button" className={props.creativePath === 'new-direction' ? 'active' : ''} onClick={() => props.setCreativePath('new-direction')}><span>Explorar uma nova direção</span><small>O time propõe um caminho visual a partir do briefing e do Brand Kit.</small></button><button type="button" className={props.creativePath === 'follow-references' ? 'active' : ''} onClick={() => props.setCreativePath('follow-references')}><span>Partir das minhas referências</span><small>O time preserva o caminho das referências enviadas e adapta à marca.</small></button></div></div>
    <div className="new-project-form-section">
      <SectionTitle title="Referências" description="Opcional. Anexe materiais ou compartilhe links; eles serão salvos no projeto." />
      <div className="new-project-reference-actions"><label><Upload size={16} /> Adicionar arquivos<input type="file" multiple hidden onChange={(event) => { props.addReferenceFiles(event.target.files); event.target.value = '' }} /></label><div><Link2 size={16} /><input value={props.linkDraft} onChange={(event) => props.setLinkDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); props.addReferenceLink() } }} placeholder="Cole um link de referência" /><button type="button" onClick={props.addReferenceLink}>Adicionar</button></div></div>
      {(props.referenceFiles.length > 0 || props.referenceLinks.length > 0) && <div className="new-project-reference-list">{props.referenceFiles.map((file, index) => <span key={`${file.name}-${file.size}`}><FileText size={15} /><b>{file.name}</b><small>{formatFileSize(file.size)}</small><button type="button" onClick={() => props.removeFile(index)} aria-label={`Remover ${file.name}`}><X size={14} /></button></span>)}{props.referenceLinks.map((link) => <span key={link}><Link2 size={15} /><b>{link}</b><button type="button" onClick={() => props.removeLink(link)} aria-label="Remover link"><X size={14} /></button></span>)}</div>}
    </div>
    <FlowFooter><button type="button" className="secondary-button" onClick={props.onCancel}><ArrowLeft size={15} /> Voltar ao catálogo</button><button type="button" className="primary-button" disabled={!props.ready} onClick={props.onNext}>Configurar entrega <ArrowRight size={15} /></button></FlowFooter>
  </>
}

interface ConfigureStepProps {
  selected: CatalogProduct; scope: CatalogScope; selectedFormats: string[]; quoteError: string
  updateCounter: (key: keyof Pick<CatalogScope, 'quantity' | 'taskRepeats' | 'resizeCount' | 'variationCount' | 'characterCount'>, delta: number) => void
  toggleAddon: (code: string) => void; toggleFormat: (format: string) => void; onBack: () => void; onNext: () => void; quoteReady: boolean
}

function ConfigureStep(props: ConfigureStepProps) {
  const formats = availableFormatsFor(props.selected)
  return <>
    <FlowHeading eyebrow="Etapa 2 de 3" title="Configure a entrega" description="A estimativa é atualizada automaticamente conforme o escopo." />
    <div className="new-project-form-section"><SectionTitle title="Escopo" description={`${props.selected.billing.label || ''}${props.selected.billing.unitNote ? ` · ${props.selected.billing.unitNote}` : ''}`} />{props.quoteError && <small className="new-project-error">{props.quoteError}</small>}<div className="new-project-scope__controls"><ScopeCounter label={`Quantidade (${props.selected.billing.unit})`} value={props.scope.quantity} minimum={1} onDecrease={() => props.updateCounter('quantity', -1)} onIncrease={() => props.updateCounter('quantity', 1)} disableIncrease={Boolean(props.selected.billing.maxQuantity && props.scope.quantity >= props.selected.billing.maxQuantity)} /><ScopeCounter label="Tarefas" value={props.scope.taskRepeats} minimum={1} onDecrease={() => props.updateCounter('taskRepeats', -1)} onIncrease={() => props.updateCounter('taskRepeats', 1)} />{props.selected.credits.resizeAllowed && <ScopeCounter label="Redimensionamentos" value={props.scope.resizeCount} onDecrease={() => props.updateCounter('resizeCount', -1)} onIncrease={() => props.updateCounter('resizeCount', 1)} />}{props.selected.credits.variationAllowed && <ScopeCounter label="Variações" value={props.scope.variationCount} onDecrease={() => props.updateCounter('variationCount', -1)} onIncrease={() => props.updateCounter('variationCount', 1)} />}{props.selected.billing.characterCredits && <ScopeCounter label="Avatares/personagens" value={props.scope.characterCount} minimum={1} onDecrease={() => props.updateCounter('characterCount', -1)} onIncrease={() => props.updateCounter('characterCount', 1)} />}</div></div>
    {formats.length > 0 && <div className="new-project-form-section"><SectionTitle title="Formatos de entrega" description="Selecione os arquivos que você precisa receber." /><div className="new-project-format-grid">{formats.map((format) => <label key={format} className={props.selectedFormats.includes(format) ? 'selected' : ''}><input type="checkbox" checked={props.selectedFormats.includes(format)} onChange={() => props.toggleFormat(format)} /><FileText size={17} /><span>{format}</span></label>)}</div></div>}
    {props.selected.addons.length > 0 && <div className="new-project-form-section"><SectionTitle title="Adicionais" description="Inclua apenas o que fizer sentido para esta entrega." /><div className="new-project-addons"><div>{props.selected.addons.map((addon) => { const checked = props.scope.addons[addon.code] > 0; const addonCredits = addon.rule?.credits ?? addon.credits; return <label key={addon.code} className={checked ? 'selected' : ''}><input type="checkbox" checked={checked} onChange={() => props.toggleAddon(addon.code)} /><span><strong>{addon.name}</strong><small>{addon.rule?.unit ? `${addon.rule.step || 1} ${addon.rule.unit}` : 'Adicional da entrega'}</small></span><b>{addonCredits > 0 ? `+${formatCredits(addonCredits)} cr.` : 'Incluso'}</b></label> })}</div></div></div>}
    <FlowFooter><button type="button" className="secondary-button" onClick={props.onBack}><ArrowLeft size={15} /> Voltar</button><button type="button" className="primary-button" disabled={!props.quoteReady} onClick={props.onNext}>Revisar solicitação <ArrowRight size={15} /></button></FlowFooter>
  </>
}

interface ReviewStepProps {
  selected: CatalogProduct; name: string; overview: string; objective: string; projectGoal: string; audience: string; tone: string
  creativePath: 'new-direction' | 'follow-references'; selectedFormats: string[]; referenceFiles: File[]; referenceLinks: string[]; scope: CatalogScope
  quote: CatalogQuote | null; submitting: boolean; onBack: () => void; onEditBrief: () => void; onSubmit: () => void
}

function ReviewStep(props: ReviewStepProps) {
  const activeAddons = props.selected.addons.filter((addon) => props.scope.addons[addon.code] > 0)
  return <>
    <FlowHeading eyebrow="Etapa 3 de 3" title="Revise antes de enviar" description="Você poderá complementar o briefing na conversa do projeto depois do envio." />
    <div className="new-project-review-block"><header><div><span>Briefing</span><h2>{props.name}</h2></div><button type="button" onClick={props.onEditBrief}>Editar</button></header><p>{props.overview}</p><dl><div><dt>Pedido</dt><dd>{props.objective}</dd></div><div><dt>Objetivo</dt><dd>{props.projectGoal}</dd></div><div><dt>Direção</dt><dd>{props.creativePath === 'new-direction' ? 'Explorar nova direção' : 'Partir das referências'}</dd></div>{props.audience && <div><dt>Público</dt><dd>{props.audience}</dd></div>}{props.tone && <div><dt>Tom</dt><dd>{props.tone}</dd></div>}</dl></div>
    <div className="new-project-review-block"><header><div><span>Entrega</span><h2>{props.selected.name}</h2></div><button type="button" onClick={props.onBack}>Editar</button></header><dl><div><dt>Quantidade</dt><dd>{props.scope.quantity} {props.selected.billing.unit}</dd></div><div><dt>Tarefas</dt><dd>{props.scope.taskRepeats}</dd></div><div><dt>Formatos</dt><dd>{props.selectedFormats.length ? props.selectedFormats.join(', ') : 'Padrão do catálogo'}</dd></div>{activeAddons.length > 0 && <div><dt>Adicionais</dt><dd>{activeAddons.map((item) => item.name).join(', ')}</dd></div>}<div><dt>Referências</dt><dd>{props.referenceFiles.length + props.referenceLinks.length || 'Nenhuma'}</dd></div></dl></div>
    <div className="new-project-review-total"><div><span>Estimativa da solicitação</span><strong>{props.quote ? `${formatCredits(props.quote.totalCredits)} créditos` : 'Calculando...'}</strong><small>{props.quote ? `Prazo estimado de ${formatCredits(props.quote.slaHours)} horas úteis` : 'Aguarde a atualização do escopo'}</small></div><p>A estimativa pode ser ajustada pelo time caso o briefing exija uma validação adicional. Você será avisado antes de qualquer alteração.</p></div>
    <FlowFooter><button type="button" className="secondary-button" onClick={props.onBack}><ArrowLeft size={15} /> Voltar</button><button type="button" className="primary-button" disabled={!props.quote || props.submitting} onClick={props.onSubmit}>{props.submitting ? 'Enviando...' : 'Enviar projeto'} <ArrowRight size={15} /></button></FlowFooter>
  </>
}

function FlowHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="new-project-flow-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className="new-project-section-title"><div><h2>{title}</h2><p>{description}</p></div></div>
}

function FlowFooter({ children }: { children: React.ReactNode }) {
  return <footer className="new-project-flow-footer">{children}</footer>
}

function ProductSummary({ product, quote, quoteError, onChange }: { product: CatalogProduct; quote: CatalogQuote | null; quoteError: string; onChange: () => void }) {
  return <aside className="new-project-order-summary"><span className="new-project-order-summary__eyebrow">Sua escolha</span><div className="new-project-order-summary__mark" style={{ background: categoryAccent[product.category] || '#d7ff70' }}>{product.code}</div><small>{product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}</small><h2>{product.name}</h2><p>{product.description}</p><button type="button" onClick={onChange}>Trocar serviço</button><div className="new-project-order-summary__quote"><span><Paperclip size={15} /> Estimativa</span><strong>{quote ? `${formatCredits(quote.totalCredits)} créditos` : 'Calculando...'}</strong><small><Clock3 size={14} /> {quote ? `${formatCredits(quote.slaHours)} horas úteis` : `${formatCredits(product.slaHours)} horas base`}</small>{quoteError && <em>{quoteError}</em>}</div></aside>
}

function ScopeCounter({ label, value, minimum = 0, onDecrease, onIncrease, disableIncrease = false }: { label: string; value: number; minimum?: number; onDecrease: () => void; onIncrease: () => void; disableIncrease?: boolean }) {
  return <div className="new-project-counter"><span>{label}</span><div><button type="button" onClick={onDecrease} disabled={value <= minimum} aria-label={`Diminuir ${label}`}><Minus size={14} /></button><b>{value}</b><button type="button" onClick={onIncrease} disabled={disableIncrease} aria-label={`Aumentar ${label}`}><Plus size={14} /></button></div></div>
}
