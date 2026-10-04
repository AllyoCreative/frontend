import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, ExternalLink, FileOutput, FileText, Layers3, Link2, Loader2, Maximize2, Minus, PaintBucket, Paperclip, PenTool, Pencil, Plus, Search, Sparkles, Upload, X } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { isConceptVisualEligible } from '../config/creativePathConfig'
import { api, type CatalogProduct, type CatalogQuote, type CatalogScope, type CreditPackageSummary, type ProjectDeliveryItem, type ProjectDeliverySchema } from '../services/api'
import { FilePreviewModal, type PreviewableFile } from '../components/FilePreviewModal'
import { ReferenceFileCard } from '../components/ReferenceFileCard'
import { AddFormatsModal } from '../components/formats/AddFormatsModal'
import { buildCatalogFormatOptions } from '../components/formats/catalogFormatOptions'
import { FormatConfigurator } from '../components/formats/FormatConfigurator'
import { ChannelBadgeIcon } from '../components/formats/ChannelIcons'
import type { ChannelFormatOption, ConfiguredFormatItem } from '../components/formats/formatTypes'

const DEFAULT_FALLBACK_PACKAGES: CreditPackageSummary[] = [
  { id: 'Starter', name: 'Starter', credits: 13, priceCents: 256300, bonusPercent: 30, recommended: false },
  { id: 'Standard', name: 'Standard', credits: 39, priceCents: 736800, bonusPercent: 30, recommended: true },
  { id: 'Growth', name: 'Growth', credits: 65, priceCents: 1174600, bonusPercent: 30, recommended: false },
]

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

type FlowStep = 'catalog' | 'brief' | 'configure' | 'review' | 'success'
type DeliveryConfig = Pick<ProjectDeliverySchema, 'taskType' | 'structure' | 'itemLabel'> & { title: string; description: string }

interface CategoryMeta {
  label: string
  title: string
  description: string
  asset?: 'catalog.imgGravityUiBrush' | 'catalog.imgTablerVideo' | 'catalog.imgGroup' | 'catalog.imgMaterialSymbolsBoltBoostRounded'
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  all: {
    label: 'Todos os serviços',
    title: 'Todos os serviços',
    description: 'Explore o catálogo completo e encontre o formato ideal para o seu projeto.',
  },
  'Redes Sociais': {
    label: 'Redes Sociais',
    title: 'Redes Sociais',
    description: 'Formatos para feed, stories, carrosséis e anúncios em todas as redes.',
  },
  Digital: {
    label: 'Digital',
    title: 'Design Digital',
    description: 'Banners, landing pages, apresentações e ativos digitais para sua marca.',
    asset: 'catalog.imgGravityUiBrush',
  },
  Criação: {
    label: 'Criação',
    title: 'Criação e Branding',
    description: 'Ativos com precisão de pixel, identidades visuais e conceitos exclusivos.',
    asset: 'catalog.imgGravityUiBrush',
  },
  'Vídeo & Áudio': {
    label: 'Vídeo & Áudio',
    title: 'Vídeo & Áudio',
    description: 'Conteúdos audiovisuais, motion graphics, vídeos institucionais e edições.',
    asset: 'catalog.imgTablerVideo',
  },
  Impresso: {
    label: 'Impresso',
    title: 'Materiais Impressos',
    description: 'Papelaria institucional, materiais promocionais, brindes e fechamento de arquivos para gráfica.',
  },
  Copywriting: {
    label: 'Copywriting',
    title: 'Copywriting e Conteúdo',
    description: 'Textos persuasivos, redação publicitária, roteiros e estratégias de conteúdo.',
  },
  'Feitos com IA': {
    label: 'Feitos com IA',
    title: 'Feitos com IA',
    description: 'Soluções criativas potencializadas por inteligência artificial em velocidade relâmpago.',
    asset: 'catalog.imgGroup',
  },
}

const BASE_MANYSPACE_CATEGORIES = [
  'Redes Sociais',
  'Digital',
  'Criação',
  'Vídeo & Áudio',
  'Impresso',
  'Copywriting',
  'Feitos com IA',
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

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function defaultFinalFormat(product: CatalogProduct) {
  const formats = uniqueOptions(product.formats.final)
  return formats.find((format) => format.replace(/^\./, '').toUpperCase() === 'PNG') || formats[0] || ''
}

function defaultSize(product: CatalogProduct) {
  const sizes = uniqueOptions(product.formats.sizesAndRatios)
  const preferred = ['1080x1080', '1200x1200', '1080x1350', '1080x1920', 'Quadrado', 'Paisagem', 'Retrato', 'A4']
  return preferred.map((item) => sizes.find((size) => size.toLocaleLowerCase('pt-BR') === item.toLocaleLowerCase('pt-BR'))).find(Boolean) || sizes[0] || ''
}

function defaultApplication(product: CatalogProduct) {
  const applications = uniqueOptions(product.formats.available)
  const preferred = ['Post', 'Stories', 'Reels', 'Banner', 'Thumbnail']
  return preferred.map((item) => applications.find((application) => application.toLocaleLowerCase('pt-BR') === item.toLocaleLowerCase('pt-BR'))).find(Boolean) || (applications.length === 1 ? applications[0] : '')
}

function displayFileFormat(format: string) {
  return format.replace(/^\./, '').trim()
}

const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

function deliveryConfigFor(product: CatalogProduct): DeliveryConfig | null {
  const name = normalizeText(product.name)
  const availableFormats = normalizeText(product.formats.available.join(' '))
  const unit = normalizeText(product.billing.unit)
  if (/carrossel|carousel/.test(`${name} ${availableFormats}`) || unit === 'cards') return { taskType: 'carousel', structure: 'cards', itemLabel: 'card', title: 'Conteúdo dos cards', description: 'Organize a mensagem, o texto e a direção visual de cada card na ordem de leitura.' }
  if (/storyboard|roteiro visual/.test(`${name} ${availableFormats}`) || unit === 'cenas') return { taskType: 'storyboard', structure: 'scenes', itemLabel: 'cena', title: 'Conteúdo das cenas', description: 'Descreva o texto e o que deve acontecer visualmente em cada cena.' }
  if (/apresentacao de slides|pitch deck/.test(name) || unit === 'slides') return { taskType: 'presentation', structure: 'slides', itemLabel: 'slide', title: 'Conteúdo dos slides', description: 'Estruture a narrativa slide a slide para orientar a criação.' }
  if (/landing page|hotsite/.test(name) || unit === 'secoes') return { taskType: 'landing', structure: 'sections', itemLabel: 'seção', title: 'Conteúdo das seções', description: 'Defina a mensagem, a direção visual e o CTA de cada seção.' }
  if (unit === 'paginas') return { taskType: 'document', structure: 'pages', itemLabel: 'página', title: 'Conteúdo das páginas', description: 'Informe a mensagem e as orientações de cada página do material.' }
  if (unit === 'imagens' || unit === 'ilustracoes') return { taskType: 'image-set', structure: 'images', itemLabel: unit === 'ilustracoes' ? 'ilustração' : 'imagem', title: unit === 'ilustracoes' ? 'Conteúdo das ilustrações' : 'Conteúdo das imagens', description: 'Detalhe a mensagem e a direção visual esperada para cada item.' }
  return null
}

function resizeDeliveryItems(config: DeliveryConfig, count: number, current: ProjectDeliveryItem[] = []) {
  return Array.from({ length: Math.min(100, Math.max(1, count)) }, (_, index) => current[index] || {
    id: `${config.taskType}-${index + 1}`,
    position: index + 1,
    label: `${config.itemLabel.charAt(0).toLocaleUpperCase('pt-BR')}${config.itemLabel.slice(1)} ${String(index + 1).padStart(2, '0')}`,
    title: '',
    copy: '',
    instructions: '',
    cta: '',
  })
}

const deliveryItemPlurals: Record<string, string> = {
  card: 'cards', cena: 'cenas', slide: 'slides', seção: 'seções', página: 'páginas',
  imagem: 'imagens', ilustração: 'ilustrações',
}

function deliveryItemPlural(label: string) {
  return deliveryItemPlurals[label] || `${label}s`
}

function isVideoMediaUrl(url?: string | null): boolean {
  if (!url) return false
  const clean = url.split('?')[0].split('#')[0].toLowerCase()
  if (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov')
  ) {
    return true
  }
  const full = url.toLowerCase()
  return (
    full.includes('.mp4') ||
    full.includes('.webm') ||
    full.includes('/video/') ||
    full.includes('format=mp4') ||
    full.includes('ext=mp4')
  )
}

function CatalogMediaPreview({
  url,
  priority = false,
}: {
  url?: string | null
  priority?: boolean
}) {
  const [isInView, setIsInView] = useState(priority)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = isVideoMediaUrl(url)

  useEffect(() => {
    if (priority || isInView || !containerRef.current) return
    const el = containerRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '350px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [priority, isInView])

  useEffect(() => {
    if (!isVideo || !videoRef.current || !isInView) return
    const el = videoRef.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isVideo, isInView])

  if (!url || hasError) return null

  return (
    <span ref={containerRef} className="catalog-media-wrap">
      {isInView && (
        isVideo ? (
          <video
            ref={videoRef}
            src={url}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
            className={`catalog-media-element${isLoaded ? ' is-ready' : ''}`}
            onLoadedData={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        ) : (
          <img
            src={url}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'low'}
            className={`catalog-media-element${isLoaded ? ' is-ready' : ''}`}
            ref={(node) => {
              if (node?.complete) setIsLoaded(true)
            }}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        )
      )}
    </span>
  )
}

export function NewProjectPage() {
  const navigate = useNavigate()
  const { addProject, notify, account, refreshAccount } = useApp()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loaded, setLoaded] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [subfilter, setSubfilter] = useState<string>('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [displayLimit, setDisplayLimit] = useState(24)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<CatalogProduct | null>(null)
  const [step, setStep] = useState<FlowStep>('catalog')
  const [scope, setScope] = useState<CatalogScope>({ quantity: 1, taskRepeats: 1, resizeCount: 0, variationCount: 0, characterCount: 1, addons: {} })
  const [quote, setQuote] = useState<CatalogQuote | null>(null)
  const [quoteError, setQuoteError] = useState('')

  const [showCreditModal, setShowCreditModal] = useState(false)
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null)

  useEffect(() => {
    if (!account) {
      void refreshAccount()
    }
  }, [account, refreshAccount])

  const creditsAvailable = account?.workspace?.creditsAvailable ?? 0
  const requiredCredits = quote?.totalCredits ?? (selected?.credits.original ?? 1)
  const hasInsufficientCredits = Boolean(quote && creditsAvailable < requiredCredits)
  const missingCredits = Math.max(0, requiredCredits - creditsAvailable)

  const creditPackagesToDisplay: CreditPackageSummary[] = useMemo(() => {
    if (account?.creditPackages && account.creditPackages.length > 0) {
      return account.creditPackages
    }
    return DEFAULT_FALLBACK_PACKAGES
  }, [account?.creditPackages])

  const handlePurchasePackage = async (pack: CreditPackageSummary) => {
    try {
      setPurchasingPackageId(pack.id || pack.name)
      await api.purchaseCredits(pack.id || pack.name)
      await refreshAccount()
      notify(`Plano ${pack.name} (${pack.credits} créditos) adquirido com sucesso! Saldo atualizado.`)
      setShowCreditModal(false)
    } catch (error: any) {
      notify(error?.message || 'Não foi possível concluir a compra de créditos.')
    } finally {
      setPurchasingPackageId(null)
    }
  }
  const [name, setName] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [objective, setObjective] = useState('')
  const [overview, setOverview] = useState('')
  const [projectGoal, setProjectGoal] = useState(goals[0])
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState('')
  const [notApplicable, setNotApplicable] = useState({ audience: false, tone: false })
  const [creativePath, setCreativePath] = useState<'new-direction' | 'new-concept' | 'follow-references'>('follow-references')
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedFinalFormat, setSelectedFinalFormat] = useState('')
  const [selectedEditableFormat, setSelectedEditableFormat] = useState('')
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [referenceLinks, setReferenceLinks] = useState<string[]>([])
  const [linkDraft, setLinkDraft] = useState('')
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deliveryItems, setDeliveryItems] = useState<ProjectDeliveryItem[]>([])
  const deliveryConfig = useMemo(() => selected ? deliveryConfigFor(selected) : null, [selected])
  const catalogFormatOptions = useMemo(() => selected ? buildCatalogFormatOptions(selected) : [], [selected])

  // Modular format configuration state
  const [configuredFormats, setConfiguredFormats] = useState<ConfiguredFormatItem[]>([
    {
      id: 'fmt-1',
      channel: 'Instagram',
      formatName: 'Post',
      dimension: '1080 × 1350px',
      proportionLabel: 'Retrato',
      isPrincipal: true,
      exclusiveDirection: '',
      software: 'Photoshop',
      extension: '.PNG',
    },
  ])
  const [activeFormatId, setActiveFormatId] = useState<string | null>('fmt-1')
  const [isAddFormatsModalOpen, setIsAddFormatsModalOpen] = useState(false)

  const handleAddFormat = (option: ChannelFormatOption) => {
    const existing = configuredFormats.find((item) =>
      item.channel.toLocaleLowerCase('pt-BR') === option.channel.toLocaleLowerCase('pt-BR')
      && item.formatName.toLocaleLowerCase('pt-BR') === option.name.toLocaleLowerCase('pt-BR')
    )
    if (existing) {
      setActiveFormatId(existing.id)
      return
    }
    const newId = `fmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const isFirst = configuredFormats.length === 0
    const newItem: ConfiguredFormatItem = {
      id: newId,
      channel: option.channel,
      formatName: option.name,
      dimension: option.defaultProportion.dimension,
      proportionLabel: option.defaultProportion.label,
      isPrincipal: isFirst,
      exclusiveDirection: '',
      software: configuredFormats[0]?.software || selectedEditableFormat || 'A definir',
      extension: configuredFormats[0]?.extension || selectedFinalFormat || 'A definir',
    }
    const nextList = [...configuredFormats, newItem]
    setConfiguredFormats(nextList)
    setActiveFormatId(newId)
    setScope((current) => ({
      ...current,
      resizeCount: selected?.credits.resizeAllowed ? Math.max(0, nextList.length - 1) : 0,
    }))
  }

  const handleRemoveFormat = (idToRemove: string) => {
    const nextList = configuredFormats.filter((item) => item.id !== idToRemove)
    if (nextList.length > 0 && !nextList.some((item) => item.isPrincipal)) {
      nextList[0].isPrincipal = true
    }
    setConfiguredFormats(nextList)
    if (activeFormatId === idToRemove) {
      setActiveFormatId(nextList[0]?.id || null)
    }
    setScope((current) => ({
      ...current,
      resizeCount: selected?.credits.resizeAllowed ? Math.max(0, nextList.length - 1) : 0,
    }))
  }

  const handleUpdateFormat = (idToUpdate: string, updates: Partial<ConfiguredFormatItem>) => {
    setConfiguredFormats((current) =>
      current.map((item) => (item.id === idToUpdate ? { ...item, ...updates } : item))
    )
    if (updates.extension) setSelectedFinalFormat(updates.extension)
    if (updates.software) setSelectedEditableFormat(updates.software)
  }

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
      api.quoteCatalogProduct(selected.code, { ...scope, creativePath }).then((result) => {
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
  }, [scope, selected, step, creativePath])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (showCreditModal) setShowCreditModal(false)
      else if (step === 'review') setStep('configure')
      else if (step === 'configure') setStep('brief')
      else if (step === 'brief') setStep('catalog')
      else navigate(-1)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [navigate, showCreditModal, step])

  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>('.new-project-dialog')
    if (dialog) dialog.scrollTop = 0
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [step])

  const categoryFilters = useMemo(() => {
    const categoriesInProducts = Array.from(
      new Set(products.map((p) => p.category?.trim()).filter(Boolean))
    )
    const orderedKnown = BASE_MANYSPACE_CATEGORIES.filter((cat) =>
      categoriesInProducts.length > 0 ? categoriesInProducts.includes(cat) : true
    )
    const extras = categoriesInProducts.filter(
      (cat) => !BASE_MANYSPACE_CATEGORIES.includes(cat)
    )
    const finalCategories = [...orderedKnown, ...extras]

    return [
      { id: 'all', ...CATEGORY_META.all },
      ...finalCategories.map((cat) => ({
        id: cat,
        ...(CATEGORY_META[cat] || {
          label: cat,
          title: cat,
          description: `Explore os serviços disponíveis na categoria ${cat}.`,
        }),
      })),
    ]
  }, [products])

  const availableSubcategories = useMemo(() => {
    if (filter === 'all' || !filter) return []
    const subs = new Set<string>()
    products.forEach((p) => {
      if (p.category === filter && p.subcategory) {
        subs.add(p.subcategory.trim())
      }
    })
    return Array.from(subs)
  }, [filter, products])

  const activeFilter = useMemo(() => {
    if (filter === 'all' || !filter) return CATEGORY_META.all
    if (CATEGORY_META[filter]) return CATEGORY_META[filter]
    return {
      label: filter,
      title: filter,
      description: `Explore os serviços disponíveis na categoria ${filter}.`,
    }
  }, [filter])

  const visible = useMemo(() => {
    const query = catalogSearch.trim().toLocaleLowerCase('pt-BR')
    return products.filter((product) => {
      const matchesCategory = filter === 'all' || !filter ? true : product.category === filter
      const matchesSubcategory = !subfilter ? true : product.subcategory === subfilter
      if (!matchesCategory || !matchesSubcategory) return false
      if (!query) return true
      return [product.name, product.description, product.category, product.subcategory, product.code]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query))
    })
  }, [catalogSearch, filter, subfilter, products])

  useEffect(() => {
    setDisplayLimit(24)
  }, [filter, subfilter, catalogSearch])

  useEffect(() => {
    if (displayLimit >= visible.length || !loadMoreRef.current) return
    const el = loadMoreRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayLimit((prev) => Math.min(visible.length, prev + 24))
        }
      },
      { rootMargin: '400px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [displayLimit, visible.length])

  const paginatedVisible = useMemo(() => visible.slice(0, displayLimit), [visible, displayLimit])
  const briefReady = Boolean(name.trim() && objective && overview.trim().length >= 10 && projectGoal)
  const selectedFormats = useMemo(() => [
    ...selectedApplications.map((application) => `Aplicação: ${application}`),
    ...selectedSizes.map((size) => `Dimensão: ${size}`),
    selectedFinalFormat ? `Arquivo final: ${displayFileFormat(selectedFinalFormat).toUpperCase()}` : '',
    selectedEditableFormat ? `Arquivo aberto: ${selectedEditableFormat}` : 'Arquivo aberto: não solicitado',
  ].filter(Boolean), [selectedApplications, selectedEditableFormat, selectedFinalFormat, selectedSizes])

  const selectProduct = (product: CatalogProduct) => {
    const nextScope = initialScope(product)
    const nextDeliveryConfig = deliveryConfigFor(product)
    const initialSize = defaultSize(product)
    const initialApplication = defaultApplication(product)
    setSelected(product)
    setScope(nextScope)
    setQuote(null)
    setQuoteError('')
    setObjective(workOptionsFor(product)[0])
    setSelectedApplications(initialApplication ? [initialApplication] : [])
    setSelectedSizes(initialSize ? [initialSize] : [])
    setSelectedFinalFormat(defaultFinalFormat(product))
    setSelectedEditableFormat('')
    setName('')
    setOverview('')
    setProjectGoal(goals[0])
    setAudience('')
    setTone('')
    setNotApplicable({ audience: false, tone: false })
    setCreativePath('follow-references')
    setReferenceFiles([])
    setReferenceLinks([])
    setDeliveryItems(nextDeliveryConfig ? resizeDeliveryItems(nextDeliveryConfig, nextScope.quantity) : [])

    const nextFormatOptions = buildCatalogFormatOptions(product)
    const isMultiFormat = nextFormatOptions.length > 0
    if (isMultiFormat) {
      const initialOption = nextFormatOptions.find((option) => option.channel === 'Instagram') || nextFormatOptions[0]
      const defaultFmt: ConfiguredFormatItem = {
        id: `fmt-${Date.now()}-1`,
        channel: initialOption.channel,
        formatName: initialOption.name,
        dimension: initialOption.defaultProportion.dimension,
        proportionLabel: initialOption.defaultProportion.label,
        isPrincipal: true,
        exclusiveDirection: '',
        software: product.formats.editable.find((item) => normalizeText(item) === 'photoshop') || product.formats.editable[0] || 'A definir',
        extension: defaultFinalFormat(product) || 'A definir',
      }
      setConfiguredFormats([defaultFmt])
      setActiveFormatId(defaultFmt.id)
    } else {
      setConfiguredFormats([])
      setActiveFormatId(null)
    }

    setStep('brief')
  }

  const updateCounter = (key: keyof Pick<CatalogScope, 'quantity' | 'taskRepeats' | 'resizeCount' | 'variationCount' | 'characterCount'>, delta: number) => {
    setQuote(null)
    setQuoteError('')
    const minimum = key === 'quantity' || key === 'taskRepeats' || key === 'characterCount' ? 1 : 0
    const increment = key === 'quantity' ? Math.max(1, selected?.billing.step || 1) : 1
    const nextValue = Math.max(minimum, scope[key] + delta * increment)
    const limitedValue = key === 'quantity' && selected?.billing.maxQuantity ? Math.min(selected.billing.maxQuantity, nextValue) : nextValue
    setScope((current) => ({ ...current, [key]: limitedValue }))
    if (key === 'quantity' && deliveryConfig) setDeliveryItems((current) => resizeDeliveryItems(deliveryConfig, limitedValue, current))
  }

  const toggleAddon = (addonCode: string) => {
    if (!selected) return
    setQuote(null)
    setQuoteError('')
    setScope((current) => ({ ...current, addons: { ...current.addons, [addonCode]: current.addons[addonCode] > 0 ? 0 : addonInitialQuantity(selected, addonCode) } }))
  }

  const toggleApplication = (application: string) => setSelectedApplications((current) => current.includes(application) ? current.filter((item) => item !== application) : [...current, application])

  const toggleSize = (size: string) => {
    setQuote(null)
    setQuoteError('')
    setSelectedSizes((current) => {
      const next = current.includes(size) ? current.filter((item) => item !== size) : [...current, size]
      if (selected?.credits.resizeAllowed) {
        setScope((scopeValue) => ({ ...scopeValue, resizeCount: Math.max(0, next.length - 1) }))
      }
      return next
    })
  }

  const addCustomSize = (size: string) => {
    const normalized = size.trim()
    if (!normalized || selectedSizes.includes(normalized)) return
    toggleSize(normalized)
  }

  const addReferenceLink = () => {
    let next = linkDraft.trim()
    if (!next) return
    if (!/^https?:\/\//i.test(next)) {
      next = `https://${next}`
    }
    try {
      const parsed = new URL(next)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid')
      if (!referenceLinks.includes(parsed.toString())) setReferenceLinks((current) => [...current, parsed.toString()])
      setLinkDraft('')
    } catch {
      notify('Insira um link válido (ex.: drive.google.com ou https://exemplo.com)')
    }
  }

  const addReferenceFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const incoming = Array.from(files)
    if (incoming.length === 0) return
    setReferenceFiles((current) => {
      const next = [...current]
      incoming.forEach((file) => {
        if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file)
      })
      return next.slice(0, 10)
    })
    notify(`${incoming.length} arquivo(s) adicionado(s) às referências`)
  }

  const submit = async () => {
    if (submitting) return
    setSubmitError('')

    if (!selected) {
      notify('Selecione um serviço no catálogo antes de continuar.')
      setStep('catalog')
      return
    }

    if (!name.trim()) {
      notify('Por favor, informe o nome do projeto no briefing.')
      setSubmitError('Informe o nome do projeto no briefing para prosseguir.')
      setStep('brief')
      return
    }

    if (name.trim().length < 2) {
      notify('O nome do projeto deve ter no mínimo 2 caracteres.')
      setSubmitError('O nome do projeto deve ter no mínimo 2 caracteres.')
      setStep('brief')
      return
    }

    if (!overview.trim() || overview.trim().length < 10) {
      notify('Descreva o que precisa ser criado no briefing (mínimo de 10 caracteres).')
      setSubmitError('A descrição do projeto precisa ter no mínimo 10 caracteres.')
      setStep('brief')
      return
    }

    const effectiveObjective = objective || (selected ? workOptionsFor(selected)[0] : 'Criar projeto')
    const effectiveProjectGoal = projectGoal || goals[0] || 'Conversão direta'

    if (!quote) {
      notify('Calculando os créditos da solicitação. Aguarde um instante...')
      return
    }

    if (hasInsufficientCredits) {
      setShowCreditModal(true)
      return
    }

    setSubmitting(true)
    const finalSelectedFormats = configuredFormats.length > 0
      ? configuredFormats.map((f) =>
          `${f.channel}: ${f.formatName} — ${f.dimension || 'Dimensão a definir'}${f.isPrincipal ? ' (Peça Principal)' : ''}${f.exclusiveDirection ? ` [Obs: ${f.exclusiveDirection}]` : ''}`
        )
      : selectedFormats

    try {
      const created = await addProject({
        name: name.trim(),
        service: selected.name,
        status: 'Em andamento',
        deadline: 'A definir',
        progress: 8,
        tasks: scope.taskRepeats + Object.values(scope.addons).filter((quantity) => quantity > 0).length,
        unread: 0,
        accent: categoryAccent[selected.category] || '#d7ff70',
        team: [],
        description: overview.trim(),
        objective: effectiveObjective,
        overview: overview.trim(),
        projectGoal: effectiveProjectGoal,
        audience: !notApplicable.audience ? audience.trim() : undefined,
        tone: !notApplicable.tone ? tone.trim() : undefined,
        creativePath,
        referenceLinks,
        selectedFormats: finalSelectedFormats,
        catalogCode: selected.code,
        catalogScope: scope,
        deliverySchema: deliveryConfig ? {
          version: 1,
          taskType: deliveryConfig.taskType,
          structure: deliveryConfig.structure,
          itemLabel: deliveryConfig.itemLabel,
          items: deliveryItems.map((item, index) => ({
            ...item,
            position: index + 1,
            title: item.title.trim(),
            copy: item.copy.trim(),
            instructions: item.instructions.trim(),
            cta: item.cta.trim(),
          })),
        } : undefined,
      })
      const uploads = await Promise.allSettled(referenceFiles.map(async (file) => {
        const uploaded = await api.uploadFile(file, 'project-files')
        return api.addProjectFile(created.id, { name: file.name, fileKey: uploaded.fileKey, contentType: uploaded.contentType, sizeBytes: uploaded.sizeBytes, category: 'briefing' })
      }))
      const failedUploads = uploads.filter((result) => result.status === 'rejected').length
      if (failedUploads) notify(`Projeto criado, mas ${failedUploads} arquivo(s) não foram anexados.`)
      setStep('success')
    } catch (error: any) {
      console.error('Erro ao enviar projeto:', error)
      const message = error?.message || error?.data?.message || error?.data?.error || 'Erro ao criar o projeto'
      setSubmitError(message)

      const isCreditError = error?.status === 402 ||
        error?.data?.statusCode === 402 ||
        message.toLowerCase().includes('crédito') ||
        message.toLowerCase().includes('saldo') ||
        message.toLowerCase().includes('payment required')

      if (isCreditError) {
        notify(message || 'Saldo de créditos insuficiente para criar este projeto.')
        setShowCreditModal(true)
      } else {
        notify(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') return <div className="new-project-page new-project-success">
    <button type="button" className="new-project-success__close" onClick={() => navigate('/')} aria-label="Fechar"><X size={22} /></button>
    <div className="new-project-success__mark"><Check size={28} /></div>
    <span className="new-project-success__eyebrow">Briefing enviado</span>
    <h1>Seu projeto decolou.</h1>
    <p>O time Allyo recebeu o contexto, o escopo e as referências. Agora vamos validar a solicitação e confirmar a entrega.</p>
    <div className="new-project-success__summary"><span style={{ background: categoryAccent[selected?.category || ''] }} /><div><small>{selected?.category} · código {selected?.code}</small><strong>{name}</strong><p>{selected?.name} · {quote ? `${formatCredits(quote.totalCredits)} créditos estimados` : ''}</p></div></div>
    <div className="new-project-success__actions"><button type="button" className="secondary-button" onClick={() => navigate('/projetos')}>Ver projetos</button><button type="button" className="primary-button" onClick={() => navigate('/')}>Voltar ao início <ArrowRight size={16} /></button></div>
  </div>

  return <div className="new-project-page new-project-modal">
    <section className={`new-project-dialog new-project-dialog--${step}`} role="dialog" aria-modal="true" aria-labelledby="new-project-title">
      <header className="new-project-dialog__header">
        {step === 'catalog' ? <strong id="new-project-title">Novo projeto</strong> : <button type="button" className="new-project-dialog__back new-project-dialog__brief-title" onClick={() => setStep('catalog')} aria-label="Voltar ao catálogo"><strong id="new-project-title">{selected?.name}</strong></button>}
        {step === 'catalog' ? (
          <nav className="new-project-filters" aria-label="Filtrar catálogo por categoria">
            {categoryFilters.map((item) => (
              <button
                type="button"
                key={item.id}
                className={filter === item.id ? 'active' : ''}
                aria-pressed={filter === item.id}
                onClick={() => {
                  setFilter(item.id)
                  setSubfilter('')
                }}
              >
                {item.asset ? (
                  <img src={figmaAsset(item.asset)} alt="" />
                ) : item.id !== 'all' && categoryAccent[item.id] ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: categoryAccent[item.id],
                      display: 'inline-block',
                      flexShrink: 0,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                    }}
                  />
                ) : null}
                {item.label}
              </button>
            ))}
          </nav>
        ) : (
          <FlowProgress step={step} briefReady={briefReady} onStep={setStep} />
        )}
        <button type="button" className="new-project-dialog__close" onClick={() => navigate(-1)} aria-label="Fechar"><img src={figmaAsset(step === 'catalog' ? 'catalog.imgMaterialSymbolsClose' : 'brief.imgMaterialSymbolsClose')} alt="" /></button>
      </header>

      {step === 'catalog' ? <main className="new-project-catalog">
        <header className="new-project-catalog__heading"><div><h1>{activeFilter.title}</h1><p>{activeFilter.description}</p></div><label className="new-project-catalog__search"><Search size={17} aria-hidden="true" /><input type="search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Pesquisar tarefa ou produto" aria-label="Pesquisar tarefa ou produto no catálogo" />{catalogSearch && <button type="button" onClick={() => setCatalogSearch('')} aria-label="Limpar pesquisa"><X size={15} /></button>}</label></header>
        {availableSubcategories.length > 0 && (
          <div className="new-project-subcategories" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '14px 0 20px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#778078', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>
              Subcategoria:
            </span>
            <button
              type="button"
              className={`new-project-subfilter-btn ${!subfilter ? 'active' : ''}`}
              onClick={() => setSubfilter('')}
            >
              Todas
            </button>
            {availableSubcategories.map((sub) => (
              <button
                type="button"
                key={sub}
                className={`new-project-subfilter-btn ${subfilter === sub ? 'active' : ''}`}
                onClick={() => setSubfilter(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
        {!loaded && <div className="new-project-catalog-state">Carregando catálogo...</div>}
        {loaded && catalogError && <div className="new-project-catalog-state is-error"><strong>Catálogo indisponível</strong><span>{catalogError}</span><button className="secondary-button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
        {loaded && !catalogError && visible.length === 0 && <div className="new-project-catalog-state"><strong>Nenhum produto encontrado</strong><span>{catalogSearch ? `Não encontramos resultados para “${catalogSearch}”.` : 'Tente selecionar outra categoria.'}</span></div>}
        <div className="new-project-services">
          {paginatedVisible.map((product, index) => (
            <button
              type="button"
              key={product.code}
              className="new-project-service"
              onClick={() => selectProduct(product)}
              aria-label={`${product.name}: ${product.description}`}
            >
              <span
                className={`new-project-service__preview${product.imageUrl ? ' has-image' : ''}`}
                style={{ backgroundColor: categoryAccent[product.category] || '#d9d9d9' }}
              >
                <CatalogMediaPreview url={product.imageUrl} priority={index < 6} />
              </span>
              <span className="new-project-service__body">
                <h2>{product.name}</h2>
                <small>
                  {product.category}{product.subcategory ? ` · ${product.subcategory}` : ''} · {formatCredits(product.credits.original)} cr. · {formatCredits(product.slaHours)}h úteis
                </small>
              </span>
            </button>
          ))}
          {visible.length > displayLimit && (
            <div ref={loadMoreRef} className="new-project-catalog-load-more">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDisplayLimit((current) => current + 24)}
              >
                Carregar mais serviços ({visible.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </div>
      </main> : selected && <main className="new-project-flow">
        <section className="new-project-flow__main">
          {step === 'brief' && <BriefStep selected={selected} name={name} objective={objective} overview={overview} projectGoal={projectGoal} audience={audience} tone={tone} notApplicable={notApplicable} creativePath={creativePath} referenceFiles={referenceFiles} referenceLinks={referenceLinks} linkDraft={linkDraft} setName={setName} setObjective={setObjective} setOverview={setOverview} setProjectGoal={setProjectGoal} setAudience={setAudience} setTone={setTone} setNotApplicable={setNotApplicable} setCreativePath={setCreativePath} setLinkDraft={setLinkDraft} addReferenceLink={addReferenceLink} addReferenceFiles={addReferenceFiles} removeFile={(index) => setReferenceFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} removeLink={(link) => setReferenceLinks((current) => current.filter((item) => item !== link))} onPreviewFile={(file) => setPreviewFile({ name: file.name, file, sizeBytes: file.size, contentType: file.type })} onCancel={() => setStep('catalog')} onNext={() => setStep('configure')} ready={briefReady} />}
          {step === 'configure' && (
            <ConfigureStep
              selected={selected}
              scope={scope}
              selectedApplications={selectedApplications}
              selectedSizes={selectedSizes}
              selectedFinalFormat={selectedFinalFormat}
              selectedEditableFormat={selectedEditableFormat}
              quoteError={quoteError}
              deliveryConfig={deliveryConfig}
              deliveryItems={deliveryItems}
              setDeliveryItems={setDeliveryItems}
              updateCounter={updateCounter}
              toggleAddon={toggleAddon}
              toggleApplication={toggleApplication}
              toggleSize={toggleSize}
              addCustomSize={addCustomSize}
              setSelectedFinalFormat={setSelectedFinalFormat}
              setSelectedEditableFormat={setSelectedEditableFormat}
              onBack={() => setStep('brief')}
              onNext={() => setStep('review')}
              quoteReady={Boolean(quote)}
              configuredFormats={configuredFormats}
              activeFormatId={activeFormatId}
              onSelectFormat={setActiveFormatId}
              onRemoveFormat={handleRemoveFormat}
              onOpenAddModal={() => setIsAddFormatsModalOpen(true)}
              onUpdateFormat={handleUpdateFormat}
              quote={quote}
              formatOptions={catalogFormatOptions}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              selected={selected}
              name={name}
              overview={overview}
              objective={objective}
              projectGoal={projectGoal}
              audience={notApplicable.audience ? '' : audience}
              tone={notApplicable.tone ? '' : tone}
              creativePath={creativePath}
              selectedApplications={selectedApplications}
              selectedSizes={selectedSizes}
              selectedFinalFormat={selectedFinalFormat}
              selectedEditableFormat={selectedEditableFormat}
              referenceFiles={referenceFiles}
              referenceLinks={referenceLinks}
              scope={scope}
              quote={quote}
              deliveryConfig={deliveryConfig}
              deliveryItems={deliveryItems}
              submitting={submitting}
              onBack={() => setStep('configure')}
              onEditBrief={() => { setSubmitError(''); setStep('brief') }}
              onSubmit={() => void submit()}
              onPreviewFile={(file) => setPreviewFile({ name: file.name, file, sizeBytes: file.size, contentType: file.type })}
              configuredFormats={configuredFormats}
              submitError={submitError}
              briefReady={briefReady}
            />
          )}
        </section>
        <ProductSummary
          product={selected}
          quote={quote}
          quoteError={quoteError}
          onChange={() => setStep('catalog')}
        />
      </main>}
    </section>
    {previewFile && (
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onRemove={previewFile.file ? () => {
          const fileName = previewFile.file!.name
          const fileSize = previewFile.file!.size
          setReferenceFiles((current) => current.filter((item) => !(item.name === fileName && item.size === fileSize)))
        } : undefined}
      />
    )}
    {isAddFormatsModalOpen && (
      <AddFormatsModal
        isOpen={isAddFormatsModalOpen}
        onClose={() => setIsAddFormatsModalOpen(false)}
        onAddFormat={handleAddFormat}
        configuredFormats={configuredFormats}
        formatOptions={catalogFormatOptions}
      />
    )}
    {showCreditModal && createPortal(
      <div
        className={`account-modal account-modal--credits${hasInsufficientCredits ? ' is-insufficient' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-modal-title"
        aria-describedby="credit-modal-description"
        onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreditModal(false) }}
      >
        <div>
          <header>
            <div>
              {hasInsufficientCredits ? <AlertTriangle size={22} /> : <Sparkles size={22} />}
              <span>
                <h2 id="credit-modal-title">{hasInsufficientCredits ? 'Saldo insuficiente' : 'Comprar créditos extras'}</h2>
                <p id="credit-modal-description">
                  {hasInsufficientCredits
                    ? 'Adicione créditos para confirmar o envio sem perder o briefing.'
                    : 'Adicione mais créditos ao seu saldo escolhendo um dos planos disponíveis.'}
                </p>
              </span>
            </div>
            <button type="button" onClick={() => setShowCreditModal(false)} aria-label="Fechar">
              <X size={18} />
            </button>
          </header>

          {hasInsufficientCredits && (
            <div className="new-project-modal-credits-banner">
              <AlertTriangle size={18} />
              <div>
                <span>Saldo disponível: <strong>{creditsAvailable} créditos</strong></span>
                <span>Necessário para este projeto: <strong>{requiredCredits} créditos</strong></span>
                <span className="diff">Faltam: <strong>{formatCredits(missingCredits)} créditos</strong></span>
              </div>
            </div>
          )}

          <div className="credit-packages">
            {creditPackagesToDisplay.map((pack) => (
              <article className={pack.recommended ? 'recommended' : ''} key={pack.id || pack.name}>
                {pack.recommended && <em>Recomendado</em>}
                <span>{pack.name}</span>
                {pack.bonusPercent > 0 && <small>+{pack.bonusPercent}% de bônus</small>}
                <strong>{pack.credits} créditos</strong>
                <p>por {formatCurrency(pack.priceCents)}</p>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={purchasingPackageId === (pack.id || pack.name)}
                  onClick={() => handlePurchasePackage(pack)}
                >
                  {purchasingPackageId === (pack.id || pack.name) ? 'Processando...' : 'Comprar plano'}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    )}
  </div>
}

function FlowProgress({ step, briefReady, onStep }: { step: FlowStep; briefReady: boolean; onStep: (step: FlowStep) => void }) {
  const items: Array<{ id: 'brief' | 'configure' | 'review'; label: string }> = [{ id: 'brief', label: 'Briefing' }, { id: 'configure', label: 'Configuração' }, { id: 'review', label: 'Revisão' }]
  const currentIndex = items.findIndex((item) => item.id === step)
  return <nav className="new-project-progress" aria-label="Etapas da solicitação">{items.map((item, index) => <button key={item.id} type="button" className={index === currentIndex ? 'active' : index < currentIndex ? 'complete' : ''} disabled={index > currentIndex || (item.id !== 'brief' && !briefReady)} onClick={() => onStep(item.id)}><span>{index < currentIndex ? <Check size={12} /> : index + 1}</span>{item.label}</button>)}</nav>
}

interface BriefStepProps {
  selected: CatalogProduct; name: string; objective: string; overview: string; projectGoal: string; audience: string; tone: string
  notApplicable: { audience: boolean; tone: boolean }; creativePath: 'new-direction' | 'new-concept' | 'follow-references'; referenceFiles: File[]; referenceLinks: string[]; linkDraft: string
  setName: (value: string) => void; setObjective: (value: string) => void; setOverview: (value: string) => void
  setProjectGoal: (value: string) => void; setAudience: (value: string) => void; setTone: (value: string) => void
  setNotApplicable: React.Dispatch<React.SetStateAction<{ audience: boolean; tone: boolean }>>; setCreativePath: (value: 'new-direction' | 'new-concept' | 'follow-references') => void
  setLinkDraft: (value: string) => void; addReferenceLink: () => void; addReferenceFiles: (files: FileList | File[] | null) => void; removeFile: (index: number) => void; removeLink: (link: string) => void
  onPreviewFile: (file: File) => void
  onCancel: () => void; onNext: () => void; ready: boolean
}

function BriefStep(props: BriefStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const toggleNotApplicable = (key: 'audience' | 'tone') => {
    props.setNotApplicable((current) => ({ ...current, [key]: !current[key] }))
    if (key === 'audience') props.setAudience('')
    else props.setTone('')
  }
  const isEligible = isConceptVisualEligible(props.selected)
  return <>
    <FlowHeading eyebrow="Etapa 1 de 3" title="Conte o que precisa ser criado" description="Reunimos só o contexto que realmente ajuda o time a começar bem." />
    <div className="new-project-form-section">
      <label className="new-project-field"><span>Nome do projeto <b>Obrigatório</b></span><input value={props.name} onChange={(event) => props.setName(event.target.value)} placeholder="Ex.: Campanha de lançamento — outubro" autoFocus /></label>
      <label className="new-project-field"><span>O que você quer criar? <b>Obrigatório</b></span><small>Explique o contexto, a mensagem principal e o resultado esperado.</small><textarea value={props.overview} onChange={(event) => props.setOverview(event.target.value)} placeholder="Conte um pouco sobre a necessidade, o momento da marca e o que esta entrega precisa resolver..." /></label>
    </div>
    {isEligible ? (
      <div className="new-project-form-section">
        <SectionTitle title="Escolha o caminho criativo do seu pedido" description="Defina se o time deve desenvolver um novo conceito visual ou seguir referências enviadas." />
        <div className="new-project-creative-paths" role="radiogroup" aria-label="Escolha o caminho criativo do seu pedido">
          <div
            role="radio"
            aria-checked={props.creativePath === 'new-concept' || props.creativePath === 'new-direction'}
            tabIndex={0}
            className={`new-project-creative-card ${(props.creativePath === 'new-concept' || props.creativePath === 'new-direction') ? 'active' : ''}`}
            onClick={() => {
              props.setCreativePath('new-concept')
              props.setObjective(`Criar ${props.selected.name.toLocaleLowerCase('pt-BR')}`)
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                props.setCreativePath('new-concept')
                props.setObjective(`Criar ${props.selected.name.toLocaleLowerCase('pt-BR')}`)
              }
            }}
          >
            <div className="new-project-creative-card__icon-box">
              <PaintBucket size={22} />
            </div>
            <div className="new-project-creative-card__content">
              <div className="new-project-creative-card__header">
                <span className="new-project-creative-card__title">Quero um novo conceito visual</span>
                <span className="new-project-creative-card__badge">+ 3 créditos</span>
              </div>
              <p className="new-project-creative-card__description">
                Nosso time criará um conceito visual personalizado para essa entrega, com base nas informações fornecidas e em conformidade com o manual da sua marca. Esse processo poderá adicionar até 3 dias úteis ao prazo de entrega.
              </p>
            </div>
            <div className="new-project-creative-card__radio">
              {(props.creativePath === 'new-concept' || props.creativePath === 'new-direction') && <span className="new-project-creative-card__radio-dot" />}
            </div>
          </div>

          <div
            role="radio"
            aria-checked={props.creativePath === 'follow-references'}
            tabIndex={0}
            className={`new-project-creative-card ${props.creativePath === 'follow-references' ? 'active' : ''}`}
            onClick={() => {
              props.setCreativePath('follow-references')
              props.setObjective('Reformular ou evoluir a partir de referências')
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                props.setCreativePath('follow-references')
                props.setObjective('Reformular ou evoluir a partir de referências')
              }
            }}
          >
            <div className="new-project-creative-card__icon-box">
              <Pencil size={20} />
            </div>
            <div className="new-project-creative-card__content">
              <div className="new-project-creative-card__header">
                <span className="new-project-creative-card__title">Seguir exatamente minhas referências</span>
              </div>
              <p className="new-project-creative-card__description">
                Vamos seguir exatamente as referências enviadas, aliando com o contexto criativo já existente da sua marca.
              </p>
            </div>
            <div className="new-project-creative-card__radio">
              {props.creativePath === 'follow-references' && <span className="new-project-creative-card__radio-dot" />}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="new-project-form-section">
        <SectionTitle title="Como podemos ajudar?" description="Escolha o ponto de partida mais próximo da sua necessidade." />
        <div className="new-project-choice-list" role="radiogroup">
          {workOptionsFor(props.selected).map((option) => (
            <label key={option} className={props.objective === option ? 'selected' : ''}>
              <input type="radio" name="objective" checked={props.objective === option} onChange={() => props.setObjective(option)} />
              <span>{option}</span>
              <CheckCircle2 size={18} />
            </label>
          ))}
        </div>
      </div>
    )}
    <div className="new-project-form-section"><SectionTitle title="Objetivo principal" description="Isso orienta as decisões criativas e a revisão da entrega." /><div className="new-project-goal-chips">{goals.map((goal) => <button type="button" key={goal} className={props.projectGoal === goal ? 'active' : ''} onClick={() => props.setProjectGoal(goal)}>{goal}</button>)}</div></div>
    <div className="new-project-form-section new-project-context-grid">
      <label className="new-project-field"><span>Público</span><small>Com quem estamos falando?</small><textarea value={props.audience} onChange={(event) => props.setAudience(event.target.value)} disabled={props.notApplicable.audience} placeholder="Perfil, contexto e comportamentos relevantes..." /><button type="button" className="new-project-inline-action" onClick={() => toggleNotApplicable('audience')}>{props.notApplicable.audience ? 'Adicionar público' : 'Não se aplica'}</button></label>
      <label className="new-project-field"><span>Tom e atmosfera</span><small>Como a comunicação deve ser percebida?</small><textarea value={props.tone} onChange={(event) => props.setTone(event.target.value)} disabled={props.notApplicable.tone} placeholder="Ex.: próximo, direto, calmo, premium..." /><button type="button" className="new-project-inline-action" onClick={() => toggleNotApplicable('tone')}>{props.notApplicable.tone ? 'Adicionar direcionamento' : 'Não se aplica'}</button></label>
    </div>
    {!isEligible && (
      <div className="new-project-form-section">
        <SectionTitle title="Direção criativa" description="Defina quanto de exploração o time deve aplicar." />
        <div className="new-project-paths">
          <button type="button" className={props.creativePath === 'new-direction' ? 'active' : ''} onClick={() => props.setCreativePath('new-direction')}>
            <span>Explorar uma nova direção</span>
            <small>O time propõe um caminho visual a partir do briefing e do Brand Kit.</small>
          </button>
          <button type="button" className={props.creativePath === 'follow-references' ? 'active' : ''} onClick={() => props.setCreativePath('follow-references')}>
            <span>Partir das minhas referências</span>
            <small>O time preserva o caminho das referências enviadas e adapta à marca.</small>
          </button>
        </div>
      </div>
    )}
    <div
      className={`new-project-form-section new-project-reference-section ${isDragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          props.addReferenceFiles(Array.from(e.dataTransfer.files))
        }
      }}
    >
      <SectionTitle title="Referências" description="Opcional. Anexe materiais ou compartilhe links; eles serão salvos no projeto." />
      <div className="new-project-reference-actions">
        <button
          type="button"
          className="new-project-add-files-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} /> Adicionar arquivos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(event) => {
            const raw = event.target.files
            if (raw && raw.length > 0) {
              const fileList = Array.from(raw)
              props.addReferenceFiles(fileList)
            }
            event.target.value = ''
          }}
        />
        <div>
          <Link2 size={16} />
          <input
            value={props.linkDraft}
            onChange={(event) => props.setLinkDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                props.addReferenceLink()
              }
            }}
            placeholder="Cole um link de referência (ex: drive.google.com/...)"
          />
          <button type="button" onClick={props.addReferenceLink}>Adicionar</button>
        </div>
      </div>
      {(props.referenceFiles.length > 0 || props.referenceLinks.length > 0) && (
        <div className="new-project-reference-container">
          {props.referenceFiles.length > 0 && (
            <div className="new-project-reference-group">
              <span className="new-project-reference-group__title">
                Arquivos anexados ({props.referenceFiles.length})
              </span>
              <div className="new-project-reference-grid">
                {props.referenceFiles.map((file, index) => (
                  <ReferenceFileCard
                    key={`${file.name}-${file.size}-${index}`}
                    file={file}
                    onRemove={() => props.removeFile(index)}
                    onPreview={(f) => props.onPreviewFile(f)}
                  />
                ))}
              </div>
            </div>
          )}
          {props.referenceLinks.length > 0 && (
            <div className="new-project-reference-group">
              <span className="new-project-reference-group__title">
                Links adicionados ({props.referenceLinks.length})
              </span>
              <div className="new-project-link-list">
                {props.referenceLinks.map((link) => (
                  <div key={link} className="new-project-link-card">
                    <Link2 size={15} className="new-project-link-card__icon" />
                    <a href={link} target="_blank" rel="noreferrer" className="new-project-link-card__url" title={link}>
                      {link}
                    </a>
                    <div className="new-project-link-card__actions">
                      <a href={link} target="_blank" rel="noreferrer" className="new-project-link-card__btn" title="Abrir link em nova aba">
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        className="new-project-link-card__btn new-project-link-card__btn--delete"
                        onClick={() => props.removeLink(link)}
                        title="Remover link"
                        aria-label="Remover link"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    <FlowFooter><button type="button" className="secondary-button" onClick={props.onCancel}><ArrowLeft size={15} /> Voltar ao catálogo</button><button type="button" className="primary-button" disabled={!props.ready} onClick={props.onNext}>Configurar entrega <ArrowRight size={15} /></button></FlowFooter>
  </>
}

interface ConfigureStepProps {
  selected: CatalogProduct; scope: CatalogScope; selectedApplications: string[]; selectedSizes: string[]; selectedFinalFormat: string; selectedEditableFormat: string; quoteError: string
  deliveryConfig: DeliveryConfig | null; deliveryItems: ProjectDeliveryItem[]; setDeliveryItems: React.Dispatch<React.SetStateAction<ProjectDeliveryItem[]>>
  updateCounter: (key: keyof Pick<CatalogScope, 'quantity' | 'taskRepeats' | 'resizeCount' | 'variationCount' | 'characterCount'>, delta: number) => void
  toggleAddon: (code: string) => void; toggleApplication: (application: string) => void; toggleSize: (size: string) => void; addCustomSize: (size: string) => void
  setSelectedFinalFormat: (format: string) => void; setSelectedEditableFormat: (format: string) => void
  onBack: () => void; onNext: () => void; quoteReady: boolean
  configuredFormats: ConfiguredFormatItem[]
  activeFormatId: string | null
  onSelectFormat: (id: string) => void
  onRemoveFormat: (id: string) => void
  onOpenAddModal: () => void
  onUpdateFormat: (id: string, updates: Partial<ConfiguredFormatItem>) => void
  quote: CatalogQuote | null
  formatOptions: ChannelFormatOption[]
}

function ConfigureStep(props: ConfigureStepProps) {
  const isMultiFormat = props.formatOptions.length > 0
  const applications = uniqueOptions(props.selected.formats.available)
  const sizes = uniqueOptions(props.selected.formats.sizesAndRatios)
  const finalFormats = uniqueOptions(props.selected.formats.final)
  const editableFormats = uniqueOptions(props.selected.formats.editable)
  const deliveryReady = isMultiFormat
    ? props.configuredFormats.length > 0
    : (sizes.length === 0 || props.selectedSizes.length > 0)

  if (isMultiFormat) {
    return (
      <>
        <FlowHeading
          eyebrow="Etapa 2 de 3"
          title="Configure a entrega"
          description="Selecione os formatos que deseja criar e configure os adicionais da sua entrega."
        />

        <FormatConfigurator
          configuredFormats={props.configuredFormats}
          activeFormatId={props.activeFormatId}
          onSelectFormat={props.onSelectFormat}
          onRemoveFormat={props.onRemoveFormat}
          onOpenAddModal={props.onOpenAddModal}
          onUpdateFormat={props.onUpdateFormat}
          addons={props.scope.addons}
          onToggleAddon={props.toggleAddon}
          selectedFinalFormat={props.selectedFinalFormat}
          onSelectFinalFormat={props.setSelectedFinalFormat}
          selectedEditableFormat={props.selectedEditableFormat}
          onSelectEditableFormat={props.setSelectedEditableFormat}
          availableFinalFormats={finalFormats}
          availableEditableFormats={editableFormats}
          formatOptions={props.formatOptions}
          availableAddons={props.selected.addons.map((addon) => ({
            code: addon.code,
            name: addon.name,
            credits: addon.rule?.credits ?? addon.credits,
            description: addon.rule?.unit
              ? `${addon.rule.step || 1} ${addon.rule.unit}`
              : 'Adicional opcional desta entrega.',
          }))}
          deliveryContent={(
            <>
              <div className="format-config-section format-delivery-quantity">
                <div>
                  <h4>{props.selected.billing.label || 'Quantidade da entrega'}</h4>
                  <p>{props.selected.billing.unitNote || `Defina a quantidade de ${props.selected.billing.unit} desta entrega.`}</p>
                </div>
                <ScopeCounter
                  label={props.selected.billing.unit}
                  value={props.scope.quantity}
                  minimum={1}
                  onDecrease={() => props.updateCounter('quantity', -1)}
                  onIncrease={() => props.updateCounter('quantity', 1)}
                  disableIncrease={Boolean(props.selected.billing.maxQuantity && props.scope.quantity >= props.selected.billing.maxQuantity)}
                />
              </div>
              {props.deliveryConfig && <StructuredDeliveryEditor
                config={props.deliveryConfig}
                items={props.deliveryItems}
                onChange={props.setDeliveryItems}
              />}
            </>
          )}
        />

        <FlowFooter>
          <button type="button" className="secondary-button" onClick={props.onBack}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14.5, color: '#555550' }}>
            <span>
              Total previsto:{' '}
              <strong style={{ color: '#171717', fontSize: 15 }}>
                {props.quote ? `${formatCredits(props.quote.totalCredits)} créditos` : 'Calculando...'}
              </strong>
            </span>
            {props.quote && (
              <small style={{ fontSize: 14, color: '#777771' }}>
                · {formatCredits(props.quote.slaHours)} horas úteis
              </small>
            )}
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={!props.quoteReady || !deliveryReady}
            onClick={props.onNext}
          >
            Revisar solicitação <ArrowRight size={16} />
          </button>
        </FlowFooter>
      </>
    )
  }

  return <>
    <FlowHeading eyebrow="Etapa 2 de 3" title="Configure a entrega" description="A estimativa é atualizada automaticamente conforme o escopo." />
    <div className="new-project-form-section"><SectionTitle title="Escopo" description={`${props.selected.billing.label || ''}${props.selected.billing.unitNote ? ` · ${props.selected.billing.unitNote}` : ''}`} />{props.quoteError && <small className="new-project-error">{props.quoteError}</small>}<div className="new-project-scope__controls"><ScopeCounter label={`Quantidade (${props.selected.billing.unit})`} value={props.scope.quantity} minimum={1} onDecrease={() => props.updateCounter('quantity', -1)} onIncrease={() => props.updateCounter('quantity', 1)} disableIncrease={Boolean(props.selected.billing.maxQuantity && props.scope.quantity >= props.selected.billing.maxQuantity)} /><ScopeCounter label="Tarefas" value={props.scope.taskRepeats} minimum={1} onDecrease={() => props.updateCounter('taskRepeats', -1)} onIncrease={() => props.updateCounter('taskRepeats', 1)} />{props.selected.credits.resizeAllowed && sizes.length === 0 && <ScopeCounter label="Redimensionamentos" value={props.scope.resizeCount} onDecrease={() => props.updateCounter('resizeCount', -1)} onIncrease={() => props.updateCounter('resizeCount', 1)} />}{props.selected.credits.variationAllowed && <ScopeCounter label="Variações" value={props.scope.variationCount} onDecrease={() => props.updateCounter('variationCount', -1)} onIncrease={() => props.updateCounter('variationCount', 1)} />}{props.selected.billing.characterCredits && <ScopeCounter label="Avatares/personagens" value={props.scope.characterCount} minimum={1} onDecrease={() => props.updateCounter('characterCount', -1)} onIncrease={() => props.updateCounter('characterCount', 1)} />}</div></div>
    {props.deliveryConfig && <StructuredDeliveryEditor config={props.deliveryConfig} items={props.deliveryItems} onChange={props.setDeliveryItems} />}
    {applications.length > 0 && <div className="new-project-form-section"><SectionTitle title="Aplicação da peça" description="Escolha onde ou como o material será usado. Você pode selecionar mais de uma opção." /><DeliveryOptionPicker options={applications} selected={props.selectedApplications} onToggle={props.toggleApplication} kind="application" searchPlaceholder="Buscar aplicação, canal ou tipo de peça" /></div>}
    {sizes.length > 0 && <div className="new-project-form-section"><SectionTitle title="Dimensões e proporções" description="Escolha o tamanho da peça. Cada tamanho adicional é considerado um redimensionamento." /><DeliveryOptionPicker options={sizes} selected={props.selectedSizes} onToggle={props.toggleSize} onAddCustom={props.addCustomSize} kind="size" searchPlaceholder="Buscar tamanho ou proporção" />{props.selected.credits.resizeAllowed && props.selectedSizes.length > 1 && <p className="new-project-selection-note"><Maximize2 size={16} /> {props.selectedSizes.length} tamanhos selecionados · {props.selectedSizes.length - 1} redimensionamento{props.selectedSizes.length > 2 ? 's' : ''}</p>}</div>}
    {(finalFormats.length > 0 || editableFormats.length > 0) && <div className="new-project-form-section new-project-delivery-files"><SectionTitle title="Arquivos de entrega" description="O arquivo final vem pronto para uso. O arquivo aberto é opcional e permite futuras edições." />
      {finalFormats.length > 0 && <DeliveryFileChoice title="Arquivo final" description="Fechado e pronto para publicar ou enviar." icon="final" options={finalFormats} selected={props.selectedFinalFormat} onSelect={props.setSelectedFinalFormat} defaultLabel={displayFileFormat(defaultFinalFormat(props.selected)).toUpperCase()} />}
      {editableFormats.length > 0 && <DeliveryFileChoice title="Arquivo aberto" description="Opcional. Escolha o software em que deseja editar." icon="editable" options={editableFormats} selected={props.selectedEditableFormat} onSelect={props.setSelectedEditableFormat} allowNone allowCustom />}
    </div>}
    {props.selected.addons.length > 0 && <div className="new-project-form-section"><SectionTitle title="Adicionais" description="Inclua apenas o que fizer sentido para esta entrega." /><div className="new-project-addons"><div>{props.selected.addons.map((addon) => { const checked = props.scope.addons[addon.code] > 0; const addonCredits = addon.rule?.credits ?? addon.credits; return <label key={addon.code} className={checked ? 'selected' : ''}><input type="checkbox" checked={checked} onChange={() => props.toggleAddon(addon.code)} /><span><strong>{addon.name}</strong><small>{addon.rule?.unit ? `${addon.rule.step || 1} ${addon.rule.unit}` : 'Adicional da entrega'}</small></span><b>{addonCredits > 0 ? `+${formatCredits(addonCredits)} cr.` : 'Incluso'}</b></label> })}</div></div></div>}
    <FlowFooter><button type="button" className="secondary-button" onClick={props.onBack}><ArrowLeft size={15} /> Voltar</button><button type="button" className="primary-button" disabled={!props.quoteReady || !deliveryReady} onClick={props.onNext}>Revisar solicitação <ArrowRight size={15} /></button></FlowFooter>
  </>
}

function StructuredDeliveryEditor({ config, items, onChange }: {
  config: DeliveryConfig
  items: ProjectDeliveryItem[]
  onChange: React.Dispatch<React.SetStateAction<ProjectDeliveryItem[]>>
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const visibleActiveIndex = Math.min(activeIndex, Math.max(0, items.length - 1))
  const activeItem = items[visibleActiveIndex]
  const updateItem = (field: keyof Pick<ProjectDeliveryItem, 'title' | 'copy' | 'instructions' | 'cta'>, value: string) => {
    onChange((current) => current.map((item, index) => index === visibleActiveIndex ? { ...item, [field]: value } : item))
  }
  if (!activeItem) return null
  const completed = items.filter((item) => item.title.trim() || item.copy.trim() || item.instructions.trim() || item.cta.trim()).length
  return <div className="new-project-form-section new-project-structured-delivery">
    <SectionTitle title={config.title} description={`${config.description} Opcional: campos vazios serão tratados como “sem texto informado”.`} />
    <div className="new-project-structured-delivery__status"><span>{items.length} {items.length === 1 ? config.itemLabel : deliveryItemPlural(config.itemLabel)}</span><small>{completed} com conteúdo preenchido</small></div>
    <div className="new-project-structured-delivery__tabs" role="tablist" aria-label={config.title}>
      {items.map((item, index) => <button type="button" role="tab" aria-selected={index === visibleActiveIndex} className={index === visibleActiveIndex ? 'active' : ''} key={item.id} onClick={() => setActiveIndex(index)}><span>{index + 1}</span>{item.title.trim() || item.label}</button>)}
    </div>
    <div className="new-project-structured-delivery__editor" role="tabpanel">
      <header><span>{activeItem.label}</span><small>{visibleActiveIndex + 1} de {items.length}</small></header>
      <label className="new-project-field"><span>Título ou chamada</span><small>O texto principal que deve ganhar destaque neste {config.itemLabel}.</small><input value={activeItem.title} onChange={(event) => updateItem('title', event.target.value)} placeholder={`Ex.: mensagem principal do ${config.itemLabel}`} maxLength={500} /></label>
      <label className="new-project-field"><span>Texto para inserir</span><small>Copy, legenda interna, locução ou conteúdo que deve aparecer neste item.</small><textarea value={activeItem.copy} onChange={(event) => updateItem('copy', event.target.value)} placeholder="Digite o texto completo ou indique que este item não terá texto..." maxLength={6000} /></label>
      <label className="new-project-field"><span>Direção visual</span><small>Elementos, imagens, enquadramento, movimento ou observações específicas.</small><textarea value={activeItem.instructions} onChange={(event) => updateItem('instructions', event.target.value)} placeholder="Ex.: usar foto do produto em destaque, fundo claro e continuidade com o item anterior..." maxLength={4000} /></label>
      {(config.taskType === 'carousel' || config.taskType === 'landing') && <label className="new-project-field"><span>CTA</span><small>Opcional. Chamada para ação deste item.</small><input value={activeItem.cta} onChange={(event) => updateItem('cta', event.target.value)} placeholder="Ex.: Saiba mais" maxLength={500} /></label>}
    </div>
  </div>
}

function DeliveryOptionPicker({ options, selected, onToggle, onAddCustom, kind, searchPlaceholder }: {
  options: string[]; selected: string[]; onToggle: (option: string) => void; onAddCustom?: (option: string) => void
  kind: 'application' | 'size'; searchPlaceholder: string
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = options.filter((option) => !normalizedQuery || option.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
  const visible = expanded || normalizedQuery ? filtered : filtered.slice(0, 8)
  const customSelections = selected.filter((option) => !options.includes(option) && (!normalizedQuery || option.toLocaleLowerCase('pt-BR').includes(normalizedQuery)))
  const visibleOptions = [...customSelections, ...visible]
  const Icon = kind === 'size' ? Maximize2 : Layers3
  const addCustom = () => {
    const next = customValue.trim()
    if (!next || !onAddCustom) return
    onAddCustom(next)
    setCustomValue('')
  }
  return <div className="new-project-option-picker">
    {options.length > 8 && <label className="new-project-option-search"><Search size={17} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={15} /></button>}</label>}
    <div className="new-project-option-grid">{visibleOptions.map((option) => { const active = selected.includes(option); return <button type="button" key={option} className={active ? 'selected' : ''} aria-pressed={active} onClick={() => onToggle(option)}><Icon size={18} /><span>{option}</span><span className="new-project-option-check">{active && <Check size={14} />}</span></button> })}</div>
    {visibleOptions.length === 0 && <p className="new-project-option-empty">Nenhuma opção encontrada para “{query}”.</p>}
    {!normalizedQuery && options.length > 8 && <button type="button" className="new-project-show-options" onClick={() => setExpanded((current) => !current)}>{expanded ? 'Mostrar menos opções' : `Ver todas as ${options.length} opções`}</button>}
    {onAddCustom && <div className="new-project-custom-option"><div><strong>Outro tamanho</strong><span>Use largura × altura e informe a unidade. Ex.: 1080 × 1350 px.</span></div><div><input value={customValue} onChange={(event) => setCustomValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }} placeholder="Ex.: 1920 × 480 px" /><button type="button" disabled={!customValue.trim()} onClick={addCustom}>Adicionar</button></div></div>}
  </div>
}

function DeliveryFileChoice({ title, description, icon, options, selected, onSelect, allowNone = false, allowCustom = false, defaultLabel }: {
  title: string; description: string; icon: 'final' | 'editable'; options: string[]; selected: string; onSelect: (option: string) => void
  allowNone?: boolean; allowCustom?: boolean; defaultLabel?: string
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const Icon = icon === 'final' ? FileOutput : PenTool
  const addCustom = () => {
    const next = customValue.trim()
    if (!next) return
    onSelect(next)
    setCustomValue('')
    setCustomOpen(false)
  }
  const selectedIsCustom = Boolean(selected && !options.includes(selected))
  return <div className="new-project-file-choice">
    <header><span><Icon size={19} /></span><div><strong>{title}</strong><p>{description}</p></div></header>
    <div className="new-project-file-choice__options">
      {allowNone && <button type="button" className={!selected ? 'selected' : ''} onClick={() => { onSelect(''); setCustomOpen(false) }}><span>Não preciso</span>{!selected && <Check size={15} />}</button>}
      {options.map((option) => { const active = selected === option; const label = icon === 'final' ? displayFileFormat(option).toUpperCase() : option; return <button type="button" key={option} className={active ? 'selected' : ''} onClick={() => { onSelect(option); setCustomOpen(false) }}><span>{label}{defaultLabel === label && <small>Padrão</small>}</span>{active && <Check size={15} />}</button> })}
      {selectedIsCustom && <button type="button" className="selected" onClick={() => setCustomOpen(true)}><span>{selected}<small>Outro</small></span><Check size={15} /></button>}
      {allowCustom && !selectedIsCustom && <button type="button" className={customOpen ? 'selected' : ''} onClick={() => setCustomOpen((current) => !current)}><span>Outro software</span><Plus size={15} /></button>}
    </div>
    {customOpen && <div className="new-project-file-choice__custom"><input value={customValue} onChange={(event) => setCustomValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }} placeholder="Nome do software ou formato" autoFocus /><button type="button" disabled={!customValue.trim()} onClick={addCustom}>Usar este formato</button></div>}
  </div>
}

interface ReviewStepProps {
  selected: CatalogProduct; name: string; overview: string; objective: string; projectGoal: string; audience: string; tone: string
  creativePath: 'new-direction' | 'new-concept' | 'follow-references'; selectedApplications: string[]; selectedSizes: string[]; selectedFinalFormat: string; selectedEditableFormat: string; referenceFiles: File[]; referenceLinks: string[]; scope: CatalogScope
  quote: CatalogQuote | null; deliveryConfig: DeliveryConfig | null; deliveryItems: ProjectDeliveryItem[]; submitting: boolean; onBack: () => void; onEditBrief: () => void; onSubmit: () => void
  onPreviewFile?: (file: File) => void
  configuredFormats?: ConfiguredFormatItem[]
  submitError?: string
  briefReady?: boolean
}

function ReviewStep(props: ReviewStepProps) {
  const activeAddons = props.selected.addons.filter((addon) => props.scope.addons[addon.code] > 0)
  const isEligible = isConceptVisualEligible(props.selected)
  return <>
    <FlowHeading eyebrow="Etapa 3 de 3" title="Revise antes de enviar" description="Você poderá complementar o briefing na conversa do projeto depois do envio." />
    {props.submitError && (
      <div className="new-project-submit-error" style={{
        margin: '0 0 20px',
        padding: '14px 16px',
        borderRadius: 10,
        background: '#fff1f1',
        border: '1.5px solid #fecaca',
        color: '#b91c1c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 14,
        fontWeight: 500,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{props.submitError}</span>
        </div>
        <button
          type="button"
          onClick={props.onEditBrief}
          style={{
            background: '#b91c1c',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Corrigir briefing
        </button>
      </div>
    )}
    {!props.briefReady && !props.submitError && (
      <div className="new-project-submit-warning" style={{
        margin: '0 0 20px',
        padding: '14px 16px',
        borderRadius: 10,
        background: '#fffbeb',
        border: '1.5px solid #fef3c7',
        color: '#92400e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>Informações obrigatórias do briefing estão incompletas (nome ou descrição do projeto).</span>
        </div>
        <button
          type="button"
          onClick={props.onEditBrief}
          style={{
            background: '#d97706',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Completar briefing
        </button>
      </div>
    )}
    <div className="new-project-review-block">
      <header><div><span>Briefing</span><h2>{props.name}</h2></div><button type="button" onClick={props.onEditBrief}>Editar</button></header>
      <p>{props.overview}</p>
      <dl>
        <div><dt>Caminho criativo</dt><dd>{isEligible ? ((props.creativePath === 'new-concept' || props.creativePath === 'new-direction') ? 'Quero um novo conceito visual (+3 créditos)' : 'Seguir exatamente minhas referências') : (props.creativePath === 'new-direction' ? 'Explorar nova direção' : 'Partir das referências')}</dd></div>
        {!isEligible && <div><dt>Pedido</dt><dd>{props.objective}</dd></div>}
        <div><dt>Objetivo</dt><dd>{props.projectGoal}</dd></div>
        {props.audience && <div><dt>Público</dt><dd>{props.audience}</dd></div>}
        {props.tone && <div><dt>Tom</dt><dd>{props.tone}</dd></div>}
        {(props.referenceFiles.length > 0 || props.referenceLinks.length > 0) && (
          <div style={{ gridColumn: '1 / -1' }}>
            <dt>Referências anexadas ({props.referenceFiles.length + props.referenceLinks.length})</dt>
            <dd style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {props.referenceLinks.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: '#f0f4ef', fontSize: 14, color: '#004c46', textDecoration: 'none', fontWeight: 600, border: '1px solid #dfe6de' }}
                  title={link}
                >
                  <Link2 size={15} /> {link}
                </a>
              ))}
              {props.referenceFiles.map((file) => (
                <span
                  key={`${file.name}-${file.size}`}
                  onClick={() => props.onPreviewFile?.(file)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: '#f0f4ef', fontSize: 14, color: '#004c46', cursor: 'pointer', fontWeight: 600, border: '1px solid #dfe6de' }}
                  title={`Visualizar ${file.name}`}
                  role="button"
                  tabIndex={0}
                >
                  <FileText size={15} /> {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
    <div className="new-project-review-block">
      <header><div><span>Entrega</span><h2>{props.selected.name}</h2></div><button type="button" onClick={props.onBack}>Editar</button></header>
      <dl>
        <div><dt>Quantidade</dt><dd>{props.scope.quantity} {props.selected.billing.unit}</dd></div>
        <div><dt>Tarefas</dt><dd>{props.scope.taskRepeats}</dd></div>
        {Boolean(props.quote?.breakdown?.conceptVisual) && <div><dt>Conceito visual</dt><dd>Novo conceito visual (+3 créditos)</dd></div>}
        
        {props.configuredFormats && props.configuredFormats.length > 0 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <dt>Formatos configurados ({props.configuredFormats.length})</dt>
            <dd style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 10 }}>
              {props.configuredFormats.map((fmt) => (
                <div key={fmt.id} style={{ padding: '12px 14px', borderRadius: 10, background: '#ffffff', border: '1.5px solid #e7e7e2', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ChannelBadgeIcon channel={fmt.channel} size={18} />
                    <strong style={{ fontSize: 15, color: '#171717' }}>{fmt.channel} — {fmt.formatName}</strong>
                    {fmt.isPrincipal && <span className="format-sidebar-item__badge-principal">Principal</span>}
                  </div>
                  <span style={{ fontSize: 14, color: '#666660' }}>{fmt.dimension || 'Dimensão a definir'}</span>
                  {fmt.exclusiveDirection && (
                    <p style={{ margin: 0, fontSize: 14, color: '#004c46', background: '#f4f8f3', padding: '7px 9px', borderRadius: 6, lineHeight: 1.45 }}>
                      <strong>Direcionamento:</strong> {fmt.exclusiveDirection}
                    </p>
                  )}
                </div>
              ))}
            </dd>
          </div>
        ) : (
          <>
            {props.selectedApplications.length > 0 && <div><dt>Aplicação</dt><dd>{props.selectedApplications.join(', ')}</dd></div>}
            {props.selectedSizes.length > 0 && <div><dt>Dimensões</dt><dd>{props.selectedSizes.join(', ')}</dd></div>}
          </>
        )}

        <div><dt>Arquivo final</dt><dd>{props.selectedFinalFormat ? displayFileFormat(props.selectedFinalFormat).toUpperCase() : 'Padrão do catálogo'}</dd></div>
        <div><dt>Arquivo aberto</dt><dd>{props.selectedEditableFormat || 'Não solicitado'}</dd></div>
        {activeAddons.length > 0 && <div><dt>Adicionais</dt><dd>{activeAddons.map((item) => item.name).join(', ')}</dd></div>}
        <div><dt>Referências</dt><dd>{props.referenceFiles.length + props.referenceLinks.length || 'Nenhuma'}</dd></div>
      </dl>
      {props.deliveryConfig && <div className="new-project-review-items"><strong>{props.deliveryConfig.title}</strong>{props.deliveryItems.map((item) => <article key={item.id}><span>{item.label}</span><div><b>{item.title.trim() || 'Sem título informado'}</b><p>{item.copy.trim() || 'Sem texto informado'}</p>{item.instructions.trim() && <small>Direção visual: {item.instructions}</small>}{item.cta.trim() && <small>CTA: {item.cta}</small>}</div></article>)}</div>}
    </div>
    <div className="new-project-review-total"><div><span>Estimativa da solicitação</span><strong>{props.quote ? `${formatCredits(props.quote.totalCredits)} créditos` : 'Calculando...'}</strong><small>{props.quote ? `Prazo estimado de ${formatCredits(props.quote.slaHours)} horas úteis` : 'Aguarde a atualização do escopo'}</small></div><p>A estimativa pode ser ajustada pelo time caso o briefing exija uma validação adicional. Você será avisado antes de qualquer alteração.</p></div>
    <FlowFooter>
      <button type="button" className="secondary-button" onClick={props.onBack}>
        <ArrowLeft size={15} /> Voltar
      </button>
      <button
        type="button"
        className="primary-button"
        disabled={!props.quote || props.submitting}
        onClick={props.onSubmit}
      >
        {props.submitting ? (
          <>
            <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Enviando projeto...
          </>
        ) : (
          <>
            Confirmar e enviar <ArrowRight size={15} />
          </>
        )}
      </button>
    </FlowFooter>
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

interface ProductSummaryProps {
  product: CatalogProduct
  quote: CatalogQuote | null
  quoteError: string
  onChange: () => void
}

function ProductSummary({
  product,
  quote,
  quoteError,
  onChange,
}: ProductSummaryProps) {
  return <aside className="new-project-order-summary">
    <span className="new-project-order-summary__eyebrow">Sua escolha</span>
    <div className={`new-project-order-summary__mark${product.imageUrl ? ' has-image' : ''}`} style={{ background: categoryAccent[product.category] || '#d7ff70' }}>
      {product.imageUrl ? (
        isVideoMediaUrl(product.imageUrl) ? (
          <video src={product.imageUrl} autoPlay loop muted playsInline aria-hidden="true" />
        ) : (
          <img src={product.imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
        )
      ) : product.code}
    </div>
    <small>{product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}</small>
    <h2>{product.name}</h2>
    <p>{product.description}</p>
    <button type="button" onClick={onChange}>Trocar serviço</button>
    <div className="new-project-order-summary__quote">
      <span><Paperclip size={15} /> Estimativa</span>
      <strong>{quote ? `${formatCredits(quote.totalCredits)} créditos` : 'Calculando...'}</strong>
      <small><Clock3 size={14} /> {quote ? `${formatCredits(quote.slaHours)} horas úteis` : `${formatCredits(product.slaHours)} horas base`}</small>
      {Boolean(quote?.breakdown?.conceptVisual) && <small style={{ color: '#d7ff70', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}><Sparkles size={12} /> Inclui Conceito Visual (+3 créditos)</small>}
      {quoteError && <em>{quoteError}</em>}
    </div>
  </aside>
}

function ScopeCounter({ label, value, minimum = 0, onDecrease, onIncrease, disableIncrease = false }: { label: string; value: number; minimum?: number; onDecrease: () => void; onIncrease: () => void; disableIncrease?: boolean }) {
  return <div className="new-project-counter"><span>{label}</span><div><button type="button" onClick={onDecrease} disabled={value <= minimum} aria-label={`Diminuir ${label}`}><Minus size={14} /></button><b>{value}</b><button type="button" onClick={onIncrease} disabled={disableIncrease} aria-label={`Aumentar ${label}`}><Plus size={14} /></button></div></div>
}
