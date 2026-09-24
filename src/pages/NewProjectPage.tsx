import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Clock, Coins, Minus, Plus, Search, X } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { api, type CatalogProduct, type CatalogQuote, type CatalogScope } from '../services/api'

type Clarification = {
  key: 'audience' | 'tone'
  title: string
  hint: string
  placeholder: string
}

const categoryOrder = ['Redes Sociais', 'Digital', 'Impresso', 'Vídeo & Áudio', 'Criação', 'Copywriting', 'Feitos com IA']
const categoryAccent: Record<string, string> = {
  'Redes Sociais': '#bde8e1',
  Digital: '#cfe5f4',
  Impresso: '#f8e5bd',
  'Vídeo & Áudio': '#d9defb',
  Criação: '#f7d5e8',
  Copywriting: '#dcebc8',
  'Feitos com IA': '#ead8f5',
}

const clarifications: Clarification[] = [
  {
    key: 'audience',
    title: 'Qual é o desafio e o resultado esperado?',
    hint: '(objetivo, entregáveis e contexto relevante)',
    placeholder: 'Descreva o desafio, objetivo e entregáveis que imagina...',
  },
  {
    key: 'tone',
    title: 'Para quem estamos criando e qual é o tom?',
    hint: '(público, personalidade e referências)',
    placeholder: 'Ex.: público interno, tom próximo, visual premium...',
  },
]

const formatCredits = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)

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

export function NewProjectPage() {
  const navigate = useNavigate()
  const { addProject } = useApp()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loaded, setLoaded] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CatalogProduct | null>(null)
  const [step, setStep] = useState<'catalog' | 'brief' | 'success'>('catalog')
  const [scope, setScope] = useState<CatalogScope>({ quantity: 1, taskRepeats: 1, resizeCount: 0, variationCount: 0, characterCount: 1, addons: {} })
  const [quote, setQuote] = useState<CatalogQuote | null>(null)
  const [quoteError, setQuoteError] = useState('')
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('')
  const [notApplicable, setNotApplicable] = useState({ audience: false, tone: false })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    api.getCatalog()
      .then((catalog) => {
        if (!active) return
        setProducts(catalog.products)
        setLoaded(true)
      })
      .catch((error: unknown) => {
        if (!active) return
        setCatalogError(error instanceof Error ? error.message : 'Não foi possível carregar o catálogo')
        setLoaded(true)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selected || step !== 'brief') return
    let active = true
    const timer = window.setTimeout(() => {
      api.quoteCatalogProduct(selected.code, scope)
        .then((result) => {
          if (!active) return
          setQuote(result)
          setQuoteError('')
        })
        .catch((error: unknown) => {
          if (!active) return
          setQuote(null)
          setQuoteError(error instanceof Error ? error.message : 'Não foi possível calcular os créditos')
        })
    }, 180)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [scope, selected, step])

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))]
    .sort((left, right) => {
      const leftIndex = categoryOrder.indexOf(left)
      const rightIndex = categoryOrder.indexOf(right)
      return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex)
    }), [products])

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    return products.filter((product) => {
      if (filter !== 'all' && product.category !== filter) return false
      if (!normalizedQuery) return true
      return [product.name, product.code, product.category, product.subcategory, product.specialistRole, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    })
  }, [filter, products, query])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (step === 'brief') setStep('catalog')
      else navigate(-1)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [navigate, step])

  const selectProduct = (product: CatalogProduct) => {
    setSelected(product)
    setScope(initialScope(product))
    setQuote(null)
    setQuoteError('')
    setObjective(`Criar ${product.name.toLocaleLowerCase('pt-BR')}`)
    setAudience('')
    setTone('')
    setNotApplicable({ audience: false, tone: false })
    setStep('brief')
  }

  const updateCounter = (key: keyof Pick<CatalogScope, 'quantity' | 'taskRepeats' | 'resizeCount' | 'variationCount' | 'characterCount'>, delta: number) => {
    setQuote(null)
    setQuoteError('')
    setScope((current) => {
      const minimum = key === 'quantity' || key === 'taskRepeats' || key === 'characterCount' ? 1 : 0
      const increment = key === 'quantity' ? Math.max(1, selected?.billing.step || 1) : 1
      const nextValue = Math.max(minimum, current[key] + delta * increment)
      const limitedValue = key === 'quantity' && selected?.billing.maxQuantity
        ? Math.min(selected.billing.maxQuantity, nextValue)
        : nextValue
      return { ...current, [key]: limitedValue }
    })
  }

  const toggleAddon = (addonCode: string) => {
    if (!selected) return
    setQuote(null)
    setQuoteError('')
    setScope((current) => ({
      ...current,
      addons: {
        ...current.addons,
        [addonCode]: current.addons[addonCode] > 0 ? 0 : addonInitialQuantity(selected, addonCode),
      },
    }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected || !name.trim() || !objective || !quote || submitting) return
    const context = [objective, !notApplicable.audience && audience, !notApplicable.tone && tone].filter(Boolean).join(' · ')
    setSubmitting(true)
    try {
      await addProject({
        id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`,
        name,
        service: selected.name,
        status: 'Rascunho',
        deadline: 'A definir',
        progress: 8,
        tasks: 0,
        unread: 0,
        accent: categoryAccent[selected.category] || '#d7ff70',
        team: ['LC'],
        description: context,
        objective,
        audience: !notApplicable.audience ? audience : undefined,
        tone: !notApplicable.tone ? tone : undefined,
        catalogCode: selected.code,
        catalogScope: scope,
      })
      setStep('success')
    } catch {
      // A mensagem de erro é exibida pelo contexto global.
    } finally {
      setSubmitting(false)
    }
  }

  const toggleNotApplicable = (key: 'audience' | 'tone') => {
    setNotApplicable((current) => ({ ...current, [key]: !current[key] }))
    if (key === 'audience') setAudience('')
    else setTone('')
  }

  if (step === 'success') return <div className="new-project-page success-page"><button className="close-flow" onClick={() => navigate('/')}><X size={22} /></button><div className="success-mark"><Check size={34} /></div><span className="eyebrow">Briefing enviado</span><h1>Seu projeto decolou.</h1><p>O time Allyo vai revisar o escopo de {quote ? `${formatCredits(quote.totalCredits)} créditos` : 'créditos'} e confirmar os próximos passos.</p><div className="success-summary"><span style={{ background: categoryAccent[selected?.category || ''] }} /><div><small>{selected?.category} · código {selected?.code}</small><strong>{name}</strong><p>{selected?.name}</p></div></div><div className="success-actions"><button className="secondary-button" onClick={() => navigate('/projetos')}>Ver projetos</button><button className="primary-button" onClick={() => navigate('/')}>Voltar ao início <ArrowRight size={16} /></button></div></div>

  return <div className="new-project-page new-project-modal">
    <section className={`new-project-dialog new-project-dialog--${step}`} role="dialog" aria-modal="true" aria-labelledby="new-project-title">
      <header className="new-project-dialog__header">
        {step === 'catalog' ? <strong id="new-project-title">Novo projeto</strong> : <button type="button" className="new-project-dialog__back" onClick={() => setStep('catalog')}><ArrowLeft size={18} /><strong id="new-project-title">{selected?.name}</strong></button>}
        {step === 'catalog' ? <nav className="new-project-filters" aria-label="Filtrar catálogo">
          <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          {categories.map((category) => <button type="button" key={category} className={filter === category ? 'active' : ''} onClick={() => setFilter(category)}>{category}</button>)}
        </nav> : <p>Configure o escopo e preencha o briefing para calcular os créditos.</p>}
        <button type="button" className="new-project-dialog__close" onClick={() => navigate(-1)} aria-label="Fechar"><img src={figmaAsset(step === 'catalog' ? 'catalog.imgMaterialSymbolsClose' : 'brief.imgMaterialSymbolsClose')} alt="" /></button>
      </header>

      {step === 'catalog' ? <main className="new-project-catalog">
        <header className="new-project-catalog__heading">
          <div><h1>{filter === 'all' ? 'Catálogo criativo' : filter}</h1><p>{visible.length} produtos disponíveis para criar um novo projeto.</p></div>
          <label className="new-project-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, categoria ou código" /></label>
        </header>
        {!loaded && <div className="new-project-catalog-state">Carregando catálogo...</div>}
        {loaded && catalogError && <div className="new-project-catalog-state is-error"><strong>Catálogo indisponível</strong><span>{catalogError}</span><button className="secondary-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
        {loaded && !catalogError && visible.length === 0 && <div className="new-project-catalog-state">Nenhum produto encontrado.</div>}
        <div className="new-project-services">
          {visible.map((product) => <button type="button" key={product.code} className="new-project-service" onClick={() => selectProduct(product)} aria-label={`${product.name}: ${product.description}`}>
            <span className="new-project-service__preview" style={{ background: categoryAccent[product.category] || '#d9d9d9' }}><small>{product.category}</small><b>{product.code}</b></span>
            <span className="new-project-service__copy"><h2>{product.name}</h2><small>{product.billing.label || product.billing.unit}</small></span>
            <span className="new-project-service__meta"><b><Coins size={13} /> {formatCredits(product.credits.original)} cr.</b><small><Clock size={13} /> {formatCredits(product.slaHours)}h úteis</small></span>
          </button>)}
        </div>
      </main> : selected && <main className="new-project-brief">
        <form onSubmit={submit}>
          <section className="new-project-product-summary">
            <span style={{ background: categoryAccent[selected.category] || '#d9d9d9' }}>{selected.code}</span>
            <div><small>{selected.category}{selected.subcategory ? ` · ${selected.subcategory}` : ''}</small><h1>{selected.name}</h1><p>{selected.description}</p></div>
            <div><b><Coins size={16} /> {quote ? `${formatCredits(quote.totalCredits)} créditos` : 'Calculando...'}</b><small><Clock size={14} /> {quote ? `${formatCredits(quote.slaHours)}h úteis` : `${formatCredits(selected.slaHours)}h base`}</small></div>
          </section>

          <section className="new-project-scope" aria-labelledby="scope-title">
            <header><div><h2 id="scope-title">Escopo e créditos</h2><p>{selected.billing.label}{selected.billing.unitNote ? ` · ${selected.billing.unitNote}` : ''}</p></div>{quoteError && <small>{quoteError}</small>}</header>
            <div className="new-project-scope__controls">
              <ScopeCounter label={`Quantidade (${selected.billing.unit})`} value={scope.quantity} minimum={1} onDecrease={() => updateCounter('quantity', -1)} onIncrease={() => updateCounter('quantity', 1)} disableIncrease={Boolean(selected.billing.maxQuantity && scope.quantity >= selected.billing.maxQuantity)} />
              <ScopeCounter label="Tarefas" value={scope.taskRepeats} minimum={1} onDecrease={() => updateCounter('taskRepeats', -1)} onIncrease={() => updateCounter('taskRepeats', 1)} />
              {selected.credits.resizeAllowed && <ScopeCounter label="Redimensionamentos" value={scope.resizeCount} onDecrease={() => updateCounter('resizeCount', -1)} onIncrease={() => updateCounter('resizeCount', 1)} />}
              {selected.credits.variationAllowed && <ScopeCounter label="Variações" value={scope.variationCount} onDecrease={() => updateCounter('variationCount', -1)} onIncrease={() => updateCounter('variationCount', 1)} />}
              {selected.billing.characterCredits && <ScopeCounter label="Avatares/personagens" value={scope.characterCount} minimum={1} onDecrease={() => updateCounter('characterCount', -1)} onIncrease={() => updateCounter('characterCount', 1)} />}
            </div>
            {selected.addons.length > 0 && <div className="new-project-addons"><h3>Adicionais disponíveis</h3><div>{selected.addons.map((addon) => {
              const checked = scope.addons[addon.code] > 0
              const addonCredits = addon.rule?.credits ?? addon.credits
              return <label key={addon.code} className={checked ? 'selected' : ''}><input type="checkbox" checked={checked} onChange={() => toggleAddon(addon.code)} /><span><strong>{addon.name}</strong><small>{addon.rule?.unit ? `${addon.rule.step || 1} ${addon.rule.unit}` : 'Adicional do item'}</small></span><b>{addonCredits > 0 ? `+${formatCredits(addonCredits)} cr.` : 'Incluso'}</b></label>
            })}</div></div>}
          </section>

          <div className="new-project-brief__row new-project-brief__row--name">
            <label htmlFor="project-name">Nome do projeto</label>
            <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Campanha de lançamento Q3" autoFocus />
          </div>

          <div className="new-project-brief__row new-project-brief__work" role="radiogroup" aria-labelledby="brief-work-title">
            <div id="brief-work-title"><strong>Trabalho</strong><span>Como podemos ajudar?</span></div>
            <div className="new-project-brief__options">
              {[`Criar ${selected.name.toLocaleLowerCase('pt-BR')}`, 'Reformular ou atualizar um material existente', 'Gostaria de discutir as possibilidades com o time Allyo'].map((option) => <label key={option} className={objective === option ? 'selected' : ''}><input type="radio" name="work" value={option} checked={objective === option} onChange={() => setObjective(option)} /><span>{option}</span></label>)}
            </div>
          </div>

          <div className="new-project-brief__clarification-heading"><img src={figmaAsset('brief.imgGroup1')} alt="" /><div><h2>Perguntas de esclarecimento</h2><p>Essas informações ajudam o time a confirmar escopo, prazo e execução.</p></div></div>
          {clarifications.map((question) => {
            const value = question.key === 'audience' ? audience : tone
            const setValue = question.key === 'audience' ? setAudience : setTone
            const disabled = notApplicable[question.key]
            return <div className="new-project-brief__row new-project-brief__question" key={question.key}><div><label htmlFor={`brief-${question.key}`}><strong>{question.title}</strong><span>{question.hint}</span></label><button type="button" className={disabled ? 'active' : ''} aria-pressed={disabled} onClick={() => toggleNotApplicable(question.key)}>Não se aplica</button></div><textarea id={`brief-${question.key}`} value={value} onChange={(event) => setValue(event.target.value)} placeholder={question.placeholder} disabled={disabled} /></div>
          })}

          <div className="new-project-brief__submit"><div>{quote && <><strong>{formatCredits(quote.totalCredits)} créditos estimados</strong><small>Prazo estimado: {formatCredits(quote.slaHours)}h úteis</small></>}</div><button type="submit" aria-label="Enviar briefing" disabled={!name.trim() || !objective || !quote || submitting}><img src={figmaAsset('brief.imgGroup')} alt="" /> {submitting ? 'Enviando...' : 'Enviar briefing'}</button></div>
        </form>
      </main>}
    </section>
  </div>
}

function ScopeCounter({ label, value, minimum = 0, onDecrease, onIncrease, disableIncrease = false }: { label: string; value: number; minimum?: number; onDecrease: () => void; onIncrease: () => void; disableIncrease?: boolean }) {
  return <div className="new-project-counter"><span>{label}</span><div><button type="button" onClick={onDecrease} disabled={value <= minimum} aria-label={`Diminuir ${label}`}><Minus size={14} /></button><b>{value}</b><button type="button" onClick={onIncrease} disabled={disableIncrease} aria-label={`Aumentar ${label}`}><Plus size={14} /></button></div></div>
}
