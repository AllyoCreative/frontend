import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { services } from '../data/mock'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import type { Service } from '../types'

type CatalogFilter = 'design' | 'production' | 'ai' | 'fast' | 'all'

type Clarification = {
  key: 'audience' | 'tone'
  title: string
  hint: string
  placeholder: string
}

type BriefSchema = {
  label: string
  workTitle: string
  workHint: string
  workOptions: string[]
  clarifications: Clarification[]
}

const catalogFilters: Array<{ id: CatalogFilter; label: string; asset?: 'catalog.imgGravityUiBrush' | 'catalog.imgTablerVideo' | 'catalog.imgGroup' | 'catalog.imgMaterialSymbolsBoltBoostRounded' }> = [
  { id: 'all', label: 'Todos os serviços' },
  { id: 'design', label: 'Criação e Design', asset: 'catalog.imgGravityUiBrush' },
  { id: 'production', label: 'Produção', asset: 'catalog.imgTablerVideo' },
  { id: 'ai', label: 'IA Disponível', asset: 'catalog.imgGroup' },
  { id: 'fast', label: 'Entrega Rápida', asset: 'catalog.imgMaterialSymbolsBoltBoostRounded' },
]

const videoSchema: BriefSchema = {
  label: 'VIDEO PRODUCTION',
  workTitle: 'Trabalho',
  workHint: 'Como podemos lhe ajudar?',
  workOptions: [
    'Gostaria de discutir possibilidades de produção de vídeo.',
    'Criar novos vídeos',
    'Reformular, refinar ou editar vídeos existentes',
  ],
  clarifications: [
    {
      key: 'audience',
      title: 'Com quem exatamente estamos falando?',
      hint: '(dados demográficos, psicográficos, comportamentais)',
      placeholder: 'Descreva o público, seus comportamentos e o contexto relevante...',
    },
    {
      key: 'tone',
      title: 'Qual é o tom e a atmosfera?',
      hint: '(energético, calmo)',
      placeholder: 'Ex.: enérgico, próximo, premium, direto...',
    },
  ],
}

function schemaFor(service: Service): BriefSchema {
  if (service.id === 'video') return videoSchema

  return {
    label: service.name.toUpperCase(),
    workTitle: 'Trabalho',
    workHint: 'Como podemos lhe ajudar?',
    workOptions: [
      `Criar ${service.name.toLowerCase()} do zero`,
      'Reformular ou atualizar um material existente',
      'Gostaria de discutir as possibilidades com o time Allyo',
    ],
    clarifications: [
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
    ],
  }
}

function catalogServiceName(service: Service) {
  if (service.id === 'email') return 'Designs de E-mail'
  if (service.id === 'motion') return 'Motion designs'
  return service.name
}

export function NewProjectPage() {
  const navigate = useNavigate()
  const { addProject } = useApp()
  const [filter, setFilter] = useState<CatalogFilter>('design')
  const [selected, setSelected] = useState<Service | null>(null)
  const [step, setStep] = useState<'catalog' | 'brief' | 'success'>('catalog')
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('')
  const [notApplicable, setNotApplicable] = useState({ audience: false, tone: false })

  const visible = useMemo(() => services.filter((service) => {
    if (filter === 'design') return service.category === 'Criação e Design' || service.id === 'video' || service.id === 'motion'
    if (filter === 'production') return service.category === 'Produção'
    if (filter === 'ai') return service.ai
    if (filter === 'fast') return service.fast
    return true
  }), [filter])

  const schema = selected ? schemaFor(selected) : null

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (step === 'brief') setStep('catalog')
      else navigate(-1)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [navigate, step])

  const selectService = (service: Service) => {
    const nextSchema = schemaFor(service)
    setSelected(service)
    setObjective(nextSchema.workOptions[0])
    setAudience('')
    setTone('')
    setNotApplicable({ audience: false, tone: false })
    setStep('brief')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected || !name.trim() || !objective) return
    const context = [objective, !notApplicable.audience && audience, !notApplicable.tone && tone].filter(Boolean).join(' · ')
    await addProject({
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`,
      name,
      service: selected.name,
      status: 'Rascunho',
      deadline: 'A definir',
      progress: 8,
      tasks: 0,
      unread: 0,
      accent: selected.accent,
      team: ['LC'],
      description: context,
      objective,
      audience: !notApplicable.audience ? audience : undefined,
      tone: !notApplicable.tone ? tone : undefined,
    })
    setStep('success')
  }

  const toggleNotApplicable = (key: 'audience' | 'tone') => {
    setNotApplicable((current) => ({ ...current, [key]: !current[key] }))
    if (key === 'audience') setAudience('')
    else setTone('')
  }

  if (step === 'success') return <div className="new-project-page success-page"><button className="close-flow" onClick={() => navigate('/')}><X size={22} /></button><div className="success-mark"><Check size={34} /></div><span className="eyebrow">Briefing enviado</span><h1>Seu projeto decolou.</h1><p>O time Allyo vai revisar as informações e voltar com escopo, estimativa e próximos passos.</p><div className="success-summary"><span style={{ background: selected?.accent }} /><div><small>{selected?.category}</small><strong>{name}</strong><p>{selected?.name}</p></div></div><div className="success-actions"><button className="secondary-button" onClick={() => navigate('/projetos')}>Ver projetos</button><button className="primary-button" onClick={() => navigate('/')}>Voltar ao início <ArrowRight size={16} /></button></div></div>

  return <div className="new-project-page new-project-modal">
    <section className={`new-project-dialog new-project-dialog--${step}`} role="dialog" aria-modal="true" aria-labelledby="new-project-title">
      <header className="new-project-dialog__header">
        {step === 'catalog' ? <strong id="new-project-title">Novo projeto</strong> : <button type="button" className="new-project-dialog__back" onClick={() => setStep('catalog')}><ArrowLeft size={18} /><strong id="new-project-title">{schema?.label}</strong></button>}

        {step === 'catalog' ? <nav className="new-project-filters" aria-label="Filtrar catálogo">
          {catalogFilters.map((item) => <button type="button" key={item.id} className={filter === item.id ? 'active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.asset && <img src={figmaAsset(item.asset)} alt="" />}{item.label}
          </button>)}
        </nav> : <p>Por favor, preencha este briefing — é a hora da decolagem. 🚀</p>}

        <button type="button" className="new-project-dialog__close" onClick={() => navigate(-1)} aria-label="Fechar"><img src={figmaAsset(step === 'catalog' ? 'catalog.imgMaterialSymbolsClose' : 'brief.imgMaterialSymbolsClose')} alt="" /></button>
      </header>

      {step === 'catalog' ? <main className="new-project-catalog">
        <header>
          <h1>{filter === 'design' ? 'Criação e Design' : filter === 'production' ? 'Produção' : filter === 'ai' ? 'Serviços com IA' : filter === 'fast' ? 'Entrega rápida' : 'Todos os serviços'}</h1>
          <p>Ativos com precisão de pixel e alinhados à marca, em velocidade relâmpago.</p>
        </header>
        <div className="new-project-services">
          {visible.map((service) => <button type="button" key={service.id} className="new-project-service" onClick={() => selectService(service)} aria-label={`${service.name}: ${service.description}`}>
            <span className="new-project-service__preview" />
            <h2>{catalogServiceName(service)}</h2>
          </button>)}
        </div>
      </main> : schema && selected && <main className="new-project-brief">
        <form onSubmit={submit}>
          <div className="new-project-brief__row new-project-brief__row--name">
            <label htmlFor="project-name">Nome do projeto</label>
            <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Campanha de lançamento Q3" autoFocus />
          </div>

          <div className="new-project-brief__row new-project-brief__work" role="radiogroup" aria-labelledby="brief-work-title">
            <div id="brief-work-title"><strong>{schema.workTitle}</strong><span>{schema.workHint}</span></div>
            <div className="new-project-brief__options">
              {schema.workOptions.map((option) => <label key={option} className={objective === option ? 'selected' : ''}>
                <input type="radio" name="work" value={option} checked={objective === option} onChange={() => setObjective(option)} />
                <span>{option}</span>
              </label>)}
            </div>
          </div>

          <div className="new-project-brief__clarification-heading">
            <img src={figmaAsset('brief.imgGroup1')} alt="" />
            <div><h2>Perguntas de esclarecimento</h2><p>A inclusão dessas informações pode levar a um início de projeto mais rápido e a uma redução do custo final.</p></div>
          </div>

          {schema.clarifications.map((question) => {
            const value = question.key === 'audience' ? audience : tone
            const setValue = question.key === 'audience' ? setAudience : setTone
            const disabled = notApplicable[question.key]
            return <div className="new-project-brief__row new-project-brief__question" key={question.key}>
              <div><label htmlFor={`brief-${question.key}`}><strong>{question.title}</strong><span>{question.hint}</span></label><button type="button" className={disabled ? 'active' : ''} aria-pressed={disabled} onClick={() => toggleNotApplicable(question.key)}>Não se aplica</button></div>
              <textarea id={`brief-${question.key}`} value={value} onChange={(event) => setValue(event.target.value)} placeholder={question.placeholder} disabled={disabled} />
            </div>
          })}

          <div className="new-project-brief__submit"><button type="submit" aria-label="Enviar briefing" disabled={!name.trim() || !objective}><img src={figmaAsset('brief.imgGroup')} alt="" /> Enviar</button></div>
        </form>
      </main>}
    </section>
  </div>
}
