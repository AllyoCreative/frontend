import { CHANNEL_FORMATS, STANDARD_ADDONS } from '../formats/channelData'
import { buildCatalogFormatOptions } from '../formats/catalogFormatOptions'
import type { ChannelFormatOption, ConfiguredFormatItem } from '../formats/formatTypes'
import type { CatalogProduct, CatalogScope, ManagedBrandSummary, UserSummary } from '../../services/api'
import type { Project } from '../../types'

export type StudioMode = 'brief' | 'insights' | 'about'

export interface BriefGapItem {
  id: string
  label: string
  question: string
  options: Array<{ label: string; command: string }>
  resolved: boolean
}

export interface PlannedDeliverableItem {
  id: string
  title: string
  subtitle: string
  team: string
  slaHours: number
  deadlineDays: number
  credits: number
  kind: 'concept' | 'primary' | 'addon'
  addonCode?: string
}

export interface ChatTurn {
  id: string
  sender: 'user' | 'allyo'
  text: string
  linkedProjectName?: string
  timestamp: string
  highlights?: string[]
}

export interface BriefDraftState {
  mode: StudioMode
  campaignName: string
  nameConfirmed: boolean
  targetProjectId: string
  creatingNewProject: boolean
  linkedReferenceProjectId: string
  selectedProduct: CatalogProduct | null
  scope: CatalogScope
  objective: string
  projectGoal: string
  overview: string
  audience: string
  tone: string
  creativePath: 'new-direction' | 'new-concept' | 'follow-references'
  configuredFormats: ConfiguredFormatItem[]
  selectedFinalFormat: string
  selectedEditableFormat: string
  designDirection: string[]
  referenceLinks: string[]
  turns: ChatTurn[]
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')

const WORD_NUMBERS: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
}

export function initialScopeForProduct(product: CatalogProduct): CatalogScope {
  return {
    quantity: Math.max(
      1,
      Math.round(product.billing.includedQuantity || 1),
      (product.billing.step || 1) * (product.billing.includedGroups || 1)
    ),
    taskRepeats: 1,
    resizeCount: 0,
    variationCount: 0,
    characterCount: 1,
    addons: {},
  }
}

export function detectStudioMode(prompt: string): StudioMode {
  const clean = normalize(prompt).trim()
  if (
    clean === 'sobre a allyo' ||
    clean.startsWith('sobre a allyo') ||
    /^(como funciona a allyo|o que e a allyo|quais os prazos da allyo)/.test(clean)
  ) {
    return 'about'
  }
  if (
    clean === 'insights do projeto' ||
    clean.startsWith('insights do projeto') ||
    /^(resumo dos meus projetos|status das minhas tarefas|quantos creditos eu tenho)/.test(clean)
  ) {
    return 'insights'
  }
  return 'brief'
}

export function matchCatalogProduct(prompt: string, products: CatalogProduct[]): CatalogProduct | null {
  if (products.length === 0) return null
  const text = normalize(prompt)

  const keywordRules: Array<{ pattern: RegExp; categoryHint?: string; nameHints: string[]; weight: number }> = [
    {
      pattern: /\b(carrossel|carrosseis|carousel|cards)\b/,
      categoryHint: 'Redes Sociais',
      nameHints: ['carrossel', 'redes sociais', 'post'],
      weight: 45,
    },
    {
      pattern: /\b(reels|tiktok|shorts|video curto|videos curtos|video para redes|video campaign|campanha de video|video ad)\b/,
      categoryHint: 'Vídeo & Áudio',
      nameHints: ['video', 'reels', 'motion', 'edicao', 'animacao'],
      weight: 42,
    },
    {
      pattern: /\b(apresentacao|slides|pitch deck|keynote|powerpoint|ppt)\b/,
      categoryHint: 'Digital',
      nameHints: ['apresentacao', 'slide', 'deck'],
      weight: 45,
    },
    {
      pattern: /\b(landing page|hotsite|pagina de vendas|lp|site|web)\b/,
      categoryHint: 'Digital',
      nameHints: ['landing page', 'web', 'banner', 'interface'],
      weight: 42,
    },
    {
      pattern: /\b(key visual|kv|conceito criativo|conceito de campanha|3 concepts|conceitos)\b/,
      categoryHint: 'Criação',
      nameHints: ['key visual', 'conceito', 'campanha', 'direcao', 'criativo'],
      weight: 40,
    },
    {
      pattern: /\b(identidade visual|branding|logotipo|logo|marca|rebranding)\b/,
      categoryHint: 'Criação',
      nameHints: ['identidade', 'marca', 'logo', 'branding'],
      weight: 44,
    },
    {
      pattern: /\b(banner|display|google ads|programatica|criteo|taboola)\b/,
      categoryHint: 'Digital',
      nameHints: ['banner', 'anuncio', 'display', 'midia'],
      weight: 38,
    },
    {
      pattern: /\b(impresso|embalagem|flyer|folder|catalogo|cartao|outdoor|pdv)\b/,
      categoryHint: 'Impresso',
      nameHints: ['impresso', 'embalagem', 'folder', 'catalogo', 'pdv'],
      weight: 40,
    },
    {
      pattern: /\b(roteiro|artigo|blog|copywriting|redacao|email marketing|newsletter)\b/,
      categoryHint: 'Copywriting',
      nameHints: ['copy', 'redacao', 'roteiro', 'texto', 'conteudo'],
      weight: 36,
    },
    {
      pattern: /\b(post|posts|stories|story|social|ads|anuncio|anuncios|criativo|criativos|linkedin|instagram|facebook|meta)\b/,
      categoryHint: 'Redes Sociais',
      nameHints: ['post', 'redes sociais', 'estatico', 'anuncio', 'social'],
      weight: 35,
    },
  ]

  let bestProduct = products[0]
  let bestScore = -1

  for (const product of products) {
    const prodName = normalize(product.name)
    const prodDesc = normalize(product.description || '')
    const prodCat = normalize(product.category || '')
    const prodSub = normalize(product.subcategory || '')
    const fullProd = `${prodName} ${prodSub} ${prodCat} ${prodDesc}`

    let score = 0

    // Direct word overlap with prompt
    const promptWords = text.split(/\s+/).filter((w) => w.length >= 4)
    for (const word of promptWords) {
      if (prodName.includes(word)) score += 18
      else if (prodSub.includes(word)) score += 10
      else if (prodDesc.includes(word)) score += 5
    }

    // Rule-based scoring
    for (const rule of keywordRules) {
      if (rule.pattern.test(text)) {
        if (rule.categoryHint && normalize(rule.categoryHint) === prodCat) {
          score += 20
        }
        for (const hint of rule.nameHints) {
          if (prodName.includes(hint)) score += rule.weight
          else if (fullProd.includes(hint)) score += Math.round(rule.weight * 0.5)
        }
      }
    }

    // Slight preference for versatile social/campaign items when prompt is generic
    if (score === 0 && (prodCat.includes('redes sociais') || prodName.includes('post'))) {
      score += 5
    }

    if (score > bestScore) {
      bestScore = score
      bestProduct = product
    }
  }

  return bestProduct
}

export function extractRequestedCount(prompt: string): number | null {
  const clean = normalize(prompt)
  const regex =
    /\b(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|one|two|three|four|five)\s*(?:x\s*)?(conceitos?|concepts?|posts?|pecas?|criativos?|creatives?|anuncios?|ads?|videos?|reels|stories|carrosseis|carrossel|banners?|variacoes|formatos?|artes?)\b/i
  const match = clean.match(regex)
  if (!match) return null
  const raw = match[1].toLowerCase()
  const parsed = Number.isNaN(Number(raw)) ? WORD_NUMBERS[raw] : Number(raw)
  if (!parsed || parsed < 1) return null
  return Math.min(20, parsed)
}

export function extractCampaignName(
  prompt: string,
  product: CatalogProduct | null,
  brand?: ManagedBrandSummary | null,
  linkedProject?: Project | null
): { name: string; confirmed: boolean } {
  const raw = prompt.trim()

  // 1. Explicit quotes: "Campanha X"
  const quoted = raw.match(/["“”'‘’]([^"“”'‘’]{3,60})["“”'‘’]/)
  if (quoted?.[1]) {
    return { name: quoted[1].trim(), confirmed: true }
  }

  // 2. Explicit pattern: "campanha X", "projeto X"
  const namedMatch = raw.match(
    /(?:campanha|projeto|lancamento|acao)\s+(?:de\s+|da\s+|do\s+|para\s+)?([A-ZÀ-Ú0-9][A-Za-zÀ-ú0-9\s\-&/]{2,42}?)(?=\s+(?:com|para|no|na|em|que|preciso|quero|,|\.|;|$))/i
  )
  if (namedMatch?.[1]) {
    const candidate = namedMatch[1].trim()
    if (!/^(video|redes|social|ads|post|posts|novo|nova|brief|briefing)$/i.test(normalize(candidate))) {
      return {
        name: `Campanha ${candidate.charAt(0).toUpperCase()}${candidate.slice(1)}`,
        confirmed: true,
      }
    }
  }

  if (linkedProject) {
    return {
      name: `${linkedProject.name} — Novos Criativos`,
      confirmed: true,
    }
  }

  const clean = normalize(raw)
  const channelLabel =
    clean.includes('linkedin')
      ? 'LinkedIn'
      : clean.includes('tiktok')
        ? 'TikTok'
        : clean.includes('youtube')
          ? 'YouTube'
          : clean.includes('instagram') || clean.includes('stories') || clean.includes('reels')
            ? 'Instagram'
            : clean.includes('social') || clean.includes('ads') || clean.includes('anuncio')
              ? 'Social Ads'
              : ''

  const baseService = product?.name || 'Campanha Criativa'
  const brandSuffix = brand?.name ? ` · ${brand.name}` : ''

  if (channelLabel) {
    return {
      name: `Campanha ${channelLabel} — ${baseService}${brandSuffix}`,
      confirmed: false,
    }
  }

  return {
    name: `${baseService}${brandSuffix}`,
    confirmed: false,
  }
}

export function detectFormatsFromPrompt(
  prompt: string,
  product: CatalogProduct | null
): {
  configuredFormats: ConfiguredFormatItem[]
  selectedFinalFormat: string
  selectedEditableFormat: string
} {
  const clean = normalize(prompt)
  const catalogOptions = product ? buildCatalogFormatOptions(product) : []
  const sourceOptions = catalogOptions.length > 0 ? catalogOptions : CHANNEL_FORMATS

  const matchedOptions: ChannelFormatOption[] = []
  const addOptionIfNotExists = (opt: ChannelFormatOption | undefined) => {
    if (!opt) return
    if (!matchedOptions.some((item) => item.channel === opt.channel && item.name === opt.name)) {
      matchedOptions.push(opt)
    }
  }

  // Detect channels & format types mentioned
  const mentionsLinkedin = /\b(linkedin)\b/.test(clean)
  const mentionsInstagram = /\b(instagram|insta|ig)\b/.test(clean)
  const mentionsTiktok = /\b(tiktok|tik tok)\b/.test(clean)
  const mentionsYoutube = /\b(youtube|yt)\b/.test(clean)
  const mentionsFacebook = /\b(facebook|fb|meta)\b/.test(clean)
  const mentionsGoogle = /\b(google|display|banner)\b/.test(clean)
  const mentionsWhatsapp = /\b(whatsapp|whats)\b/.test(clean)

  const mentionsStories = /\b(stories|story|9:16|vertical|reels)\b/.test(clean)
  const mentionsAds = /\b(ad|ads|anuncio|anuncios|trafego|campanha paga|paid)\b/.test(clean)

  if (mentionsLinkedin) {
    addOptionIfNotExists(
      sourceOptions.find((o) => o.channel === 'LinkedIn' && (mentionsAds ? o.name.includes('Anúncio') : true)) ||
        CHANNEL_FORMATS.find((o) => o.channel === 'LinkedIn')
    )
  }

  if (mentionsInstagram || (!mentionsLinkedin && !mentionsTiktok && !mentionsYoutube && !mentionsGoogle)) {
    addOptionIfNotExists(
      sourceOptions.find(
        (o) => o.channel === 'Instagram' && (mentionsAds ? o.name.includes('Anúncio') : o.name === 'Post')
      ) || CHANNEL_FORMATS.find((o) => o.id === 'ig-post')
    )
  }

  if (mentionsStories) {
    addOptionIfNotExists(
      sourceOptions.find((o) => o.channel === 'Instagram' && o.name.toLowerCase().includes('stories')) ||
        CHANNEL_FORMATS.find((o) => o.id === 'ig-stories')
    )
  }

  if (mentionsTiktok) {
    addOptionIfNotExists(
      sourceOptions.find((o) => o.channel === 'TikTok') ||
        CHANNEL_FORMATS.find((o) => o.channel === 'TikTok')
    )
  }

  if (mentionsYoutube) {
    addOptionIfNotExists(
      sourceOptions.find((o) => o.channel === 'YouTube') ||
        CHANNEL_FORMATS.find((o) => o.channel === 'YouTube')
    )
  }

  if (mentionsFacebook) {
    addOptionIfNotExists(
      sourceOptions.find((o) => o.channel === 'Facebook') ||
        CHANNEL_FORMATS.find((o) => o.channel === 'Facebook')
    )
  }

  if (mentionsGoogle) {
    addOptionIfNotExists(
      sourceOptions.find((o) => o.channel === 'Google') ||
        CHANNEL_FORMATS.find((o) => o.channel === 'Google')
    )
  }

  if (mentionsWhatsapp) {
    addOptionIfNotExists(
      sourceOptions.find((o) => o.channel === 'WhatsApp') ||
        CHANNEL_FORMATS.find((o) => o.channel === 'WhatsApp')
    )
  }

  if (matchedOptions.length === 0 && sourceOptions.length > 0) {
    addOptionIfNotExists(sourceOptions[0])
  }

  // Detect software / editable format
  let selectedEditableFormat =
    product?.formats.editable.find((item) => normalize(item) === 'figma') ||
    product?.formats.editable[0] ||
    'Figma'

  if (/\b(figma)\b/.test(clean)) selectedEditableFormat = 'Figma'
  else if (/\b(photoshop|psd)\b/.test(clean)) selectedEditableFormat = 'Photoshop'
  else if (/\b(illustrator|ai|vetor)\b/.test(clean)) selectedEditableFormat = 'Illustrator'
  else if (/\b(after effects|ae|motion)\b/.test(clean)) selectedEditableFormat = 'After Effects'
  else if (/\b(canva)\b/.test(clean)) selectedEditableFormat = 'Canva'

  // Detect final extension
  const isVideo =
    /\b(video|videos|reels|tiktok|motion|animacao|mp4|mov)\b/.test(clean) ||
    normalize(product?.category || '').includes('video')
  let selectedFinalFormat = isVideo ? '.MP4' : '.PNG'
  if (/\b(pdf)\b/.test(clean)) selectedFinalFormat = '.PDF'
  else if (/\b(mp4)\b/.test(clean)) selectedFinalFormat = '.MP4'
  else if (/\b(jpg|jpeg)\b/.test(clean)) selectedFinalFormat = '.JPG'
  else if (/\b(svg)\b/.test(clean)) selectedFinalFormat = '.SVG'

  const configuredFormats: ConfiguredFormatItem[] = matchedOptions.map((opt, idx) => ({
    id: `studio-fmt-${idx + 1}`,
    channel: opt.channel,
    formatName: opt.name,
    dimension: opt.defaultProportion.dimension,
    proportionLabel: opt.defaultProportion.label,
    isPrincipal: idx === 0,
    exclusiveDirection: '',
    software: selectedEditableFormat,
    extension: selectedFinalFormat,
  }))

  return {
    configuredFormats,
    selectedFinalFormat,
    selectedEditableFormat,
  }
}

export function buildInitialBriefState(params: {
  prompt: string
  products: CatalogProduct[]
  brands: ManagedBrandSummary[]
  projects: Project[]
  linkedProjectId?: string
}): BriefDraftState {
  const { prompt, products, brands, projects, linkedProjectId } = params
  const mode = detectStudioMode(prompt)
  const linkedProject = projects.find((p) => p.id === linkedProjectId) || null
  const primaryBrand = brands[0] || null

  const cleanPrompt =
    mode !== 'brief' || normalize(prompt).trim() === 'elaborar um briefing'
      ? 'Preciso desenvolver criativos e conceitos para uma nova campanha nas redes sociais com variações de copy e formatos otimizados para conversão.'
      : prompt.trim()

  const selectedProduct = matchCatalogProduct(cleanPrompt, products)
  const scope = selectedProduct
    ? initialScopeForProduct(selectedProduct)
    : {
        quantity: 1,
        taskRepeats: 3,
        resizeCount: 0,
        variationCount: 0,
        characterCount: 1,
        addons: {},
      }

  const requestedCount = extractRequestedCount(cleanPrompt)
  if (requestedCount) {
    if (selectedProduct && selectedProduct.billing.countablePieces && selectedProduct.billing.unit !== 'pecas') {
      scope.quantity = requestedCount
    } else {
      scope.taskRepeats = requestedCount
    }
  } else if (/\b(campanha|campaign|series|serie|pacote|kit|ads|anuncios)\b/i.test(cleanPrompt)) {
    scope.taskRepeats = 3
  }

  const normalizedPrompt = normalize(cleanPrompt)

  // Detect addons from prompt
  if (/\b(copy|texto|headline|chamada|variacoes|ab test|a\/b|roteiro)\b/.test(normalizedPrompt)) {
    scope.addons['criacao-de-conteudo-publicitario'] = 1
  }
  if (/\b(legenda|caption|hashtags)\b/.test(normalizedPrompt)) {
    scope.addons['legenda-para-redes-sociais'] = 1
  }
  if (/\b(animar|animacao|motion|video curto|short video|movimento)\b/.test(normalizedPrompt)) {
    scope.addons['animacao-de-imagem-estatica-via-ia'] = 1
  }

  const { configuredFormats, selectedFinalFormat, selectedEditableFormat } = detectFormatsFromPrompt(
    cleanPrompt,
    selectedProduct
  )

  if (selectedProduct?.credits.resizeAllowed && configuredFormats.length > 1) {
    scope.resizeCount = configuredFormats.length - 1
  }

  // Creative path
  let creativePath: 'new-direction' | 'new-concept' | 'follow-references' = 'follow-references'
  if (linkedProject || /\b(mesma linha|match|mesmo estilo|referencia|look and feel)\b/.test(normalizedPrompt)) {
    creativePath = 'follow-references'
  } else if (/\b(conceito|conceitos|concepts|key visual|kv|do zero|inedito)\b/.test(normalizedPrompt)) {
    creativePath = 'new-concept'
  } else if (/\b(nova direcao|explorar|reformular)\b/.test(normalizedPrompt)) {
    creativePath = 'new-direction'
  }

  const { name: campaignName, confirmed: nameConfirmed } = extractCampaignName(
    cleanPrompt,
    selectedProduct,
    primaryBrand,
    linkedProject
  )

  const channelsList = Array.from(new Set(configuredFormats.map((f) => f.channel))).join(', ') || 'canais digitais'
  const linkedNote = linkedProject
    ? ` mantendo a consistência visual e diretrizes do projeto "${linkedProject.name}"`
    : primaryBrand
      ? ` alinhada à identidade da marca ${primaryBrand.name}`
      : ''

  const overview =
    cleanPrompt.length >= 25
      ? `${cleanPrompt.charAt(0).toUpperCase()}${cleanPrompt.slice(1).replace(/\.$/, '')}. A campanha será estruturada para veiculação em ${channelsList}${linkedNote}, garantindo entregáveis prontos para aprovação, formatos adaptados e prazos dentro do SLA operacional da Allyo.`
      : `Desenvolvimento de peças criativas para ${campaignName} com foco em ${channelsList}${linkedNote}. O escopo contempla criação visual, adaptação de formatos e revisão de qualidade pela equipe Allyo.`

  const designDirection = [
    linkedProject
      ? `Seguir a mesma linha visual, grid e estética aprovada no projeto de referência (${linkedProject.name})`
      : 'Composição limpa, moderna e com hierarquia visual focada em leitura rápida e conversão',
    /\b(video|motion|animacao|reels)\b/.test(normalizedPrompt)
      ? 'Transições dinâmicas e ganchos visuais nos primeiros 3 segundos para retenção'
      : 'Uso estratégico de contraste e tipografia de destaque para chamar atenção no feed',
    primaryBrand
      ? `Paleta de cores e tom de voz fiéis ao Brand Kit de ${primaryBrand.name} (acento em ${primaryBrand.color || '#d0f08e'})`
      : 'Paleta de cores alinhada ao Brand Kit da marca (usar acentos vibrantes para destacar o CTA)',
  ]

  const initialTurnUser: ChatTurn = {
    id: `turn-u-${Date.now()}`,
    sender: 'user',
    text: prompt.trim() || cleanPrompt,
    linkedProjectName: linkedProject?.name,
    timestamp: 'Agora',
  }

  const initialTurnAllyo: ChatTurn = {
    id: `turn-a-${Date.now() + 1}`,
    sender: 'allyo',
    text: `Estruturei o briefing completo e o escopo de tarefas para "${campaignName}". Você pode editar qualquer seção diretamente no documento ou me pedir ajustes aqui no chat antes de enviar o projeto.`,
    timestamp: 'Agora',
    highlights: [
      `${scope.taskRepeats}x ${selectedProduct?.name || 'Entregável principal'}`,
      `${configuredFormats.length} formato(s) configurado(s)`,
    ],
  }

  return {
    mode,
    campaignName,
    nameConfirmed,
    targetProjectId: '',
    creatingNewProject: true,
    linkedReferenceProjectId: linkedProjectId || '',
    selectedProduct,
    scope,
    objective: selectedProduct ? `Criar ${selectedProduct.name.toLocaleLowerCase('pt-BR')}` : 'Criar campanha criativa',
    projectGoal: /\b(venda|conversao|performance|ads|anuncio|lead)\b/.test(normalizedPrompt)
      ? 'Vendas e conversão'
      : 'Engajamento',
    overview,
    audience: '',
    tone: 'Próximo, direto e confiante',
    creativePath,
    configuredFormats,
    selectedFinalFormat,
    selectedEditableFormat,
    designDirection,
    referenceLinks: [],
    turns: [initialTurnUser, initialTurnAllyo],
  }
}

export function computePlannedDeliverables(state: BriefDraftState): PlannedDeliverableItem[] {
  const items: PlannedDeliverableItem[] = []
  const product = state.selectedProduct
  const baseSla = product?.slaHours || 12
  const baseCredits = product?.credits.original || 1

  if (state.creativePath === 'new-concept' || state.creativePath === 'new-direction') {
    items.push({
      id: 'deliv-concept',
      title: 'Conceito visual e Direção de Arte da Campanha',
      subtitle: 'Definição da linha criativa e peça-mãe para aprovação prévia antes dos desdobramentos',
      team: 'Design team',
      slaHours: 12,
      deadlineDays: 2,
      credits: 3,
      kind: 'concept',
    })
  }

  const count = Math.max(1, state.scope.taskRepeats)
  const channelsSummary =
    state.configuredFormats.map((f) => `${f.channel} ${f.formatName}`).join(', ') || 'Formatos digitais'
  const perTaskCredits = Math.max(
    0.5,
    baseCredits + (state.scope.resizeCount > 0 ? (product?.credits.resize || 0.25) * state.scope.resizeCount : 0)
  )
  const totalPrimaryCredits = Math.round(perTaskCredits * count * 100) / 100
  const deadlineDays = Math.max(1, Math.ceil((Math.ceil(perTaskCredits) * baseSla) / 9))

  items.push({
    id: 'deliv-primary',
    title: `${count}x ${product?.name || 'Criativos da Campanha'}${state.scope.quantity > 1 ? ` (${state.scope.quantity} ${product?.billing.unit || 'itens'} cada)` : ''}`,
    subtitle: `Desenvolvimento completo para ${channelsSummary}${state.configuredFormats.length > 1 ? ` com ${state.configuredFormats.length - 1} desdobramento(s) de formato` : ''}`,
    team: product?.specialistRole || 'Design team',
    slaHours: baseSla,
    deadlineDays,
    credits: totalPrimaryCredits,
    kind: 'primary',
  })

  for (const [addonCode, qty] of Object.entries(state.scope.addons)) {
    if (!qty || qty <= 0) continue
    const stdAddon = STANDARD_ADDONS.find((a) => a.code === addonCode)
    const prodAddon = product?.addons.find((a) => a.code === addonCode)
    const addonName =
      addonCode === 'criacao-de-conteudo-publicitario'
        ? 'Variações de Copywriting (Headline + Body para teste A/B)'
        : addonCode === 'legenda-para-redes-sociais'
          ? 'Redação de legendas estratégicas + CTAs para publicação'
          : addonCode === 'animacao-de-imagem-estatica-via-ia'
            ? 'Versão em vídeo curto / Motion Graphics (15–30s)'
            : prodAddon?.name || stdAddon?.name || addonCode

    const addonCredits = (prodAddon?.credits || stdAddon?.credits || 1) * count
    const team =
      addonCode.includes('conteudo') || addonCode.includes('legenda')
        ? 'Copy team'
        : addonCode.includes('animacao')
          ? 'Video team'
          : 'Design team'

    items.push({
      id: `deliv-addon-${addonCode}`,
      title: addonName,
      subtitle: stdAddon?.description || 'Tarefa complementar integrada ao cronograma do projeto',
      team,
      slaHours: 12,
      deadlineDays: 1,
      credits: Math.round(addonCredits * 100) / 100,
      kind: 'addon',
      addonCode,
    })
  }

  return items
}

export function computeBriefGaps(state: BriefDraftState): BriefGapItem[] {
  const hasCopy = Boolean(state.scope.addons['criacao-de-conteudo-publicitario'])
  const hasStories = state.configuredFormats.some(
    (f) => f.formatName.toLowerCase().includes('stories') || f.dimension.includes('1920')
  )

  return [
    {
      id: 'gap-name',
      label: 'Nome da campanha',
      question: 'Como você quer batizar este projeto?',
      resolved: state.nameConfirmed,
      options: [
        { label: `Manter "${state.campaignName}"`, command: `Confirmar nome: ${state.campaignName}` },
        { label: 'Campanha Lançamento Q4', command: 'Mudar nome para Campanha Lançamento Q4' },
        { label: 'Campanha Social Ads Performance', command: 'Mudar nome para Campanha Social Ads Performance' },
      ],
    },
    {
      id: 'gap-copy',
      label: 'Copywriting & Textos',
      question: 'Precisa que o time de Copy crie os títulos e textos das peças?',
      resolved: hasCopy,
      options: [
        { label: '+ Incluir Copywriting (Headline + Body)', command: 'Adicionar copywriting e variações de texto' },
        { label: '+ Incluir Legendas para post', command: 'Adicionar legenda para redes sociais' },
      ],
    },
    {
      id: 'gap-formats',
      label: 'Desdobramentos de formato',
      question: 'Quer incluir formatos verticais (Stories/Reels 9:16) ou LinkedIn?',
      resolved: hasStories && state.configuredFormats.length >= 2,
      options: [
        { label: '+ Adicionar Stories / Reels (1080×1920)', command: 'Adicionar formato Instagram Stories 9:16' },
        { label: '+ Adicionar LinkedIn Anúncio (1200×627)', command: 'Adicionar formato LinkedIn Anúncio' },
        { label: '+ Adicionar Vídeo / Motion (15–30s)', command: 'Adicionar animação em vídeo curto' },
      ],
    },
    {
      id: 'gap-editable',
      label: 'Software / Arquivo aberto',
      question: 'Qual formato editável sua equipe prefere receber?',
      resolved: Boolean(state.selectedEditableFormat),
      options: [
        { label: 'Figma', command: 'Definir arquivo editável em Figma' },
        { label: 'Photoshop (.PSD)', command: 'Definir arquivo editável em Photoshop' },
        { label: 'Illustrator (.AI)', command: 'Definir arquivo editável em Illustrator' },
      ],
    },
  ]
}

export function applyChatRefinement(
  input: string,
  state: BriefDraftState,
  products: CatalogProduct[]
): BriefDraftState {
  const clean = normalize(input).trim()
  const next: BriefDraftState = {
    ...state,
    scope: { ...state.scope, addons: { ...state.scope.addons } },
    configuredFormats: [...state.configuredFormats],
    designDirection: [...state.designDirection],
    turns: [...state.turns],
  }

  const changes: string[] = []

  // 1. Confirm or change campaign name
  const confirmNameMatch = input.match(/^Confirmar nome:\s*(.+)$/i)
  const changeNameMatch = input.match(
    /(?:mudar nome para|nome da campanha:?|chamar de|renomear para|nome:?)\s+["']?([^"'.]+)["']?/i
  )
  if (confirmNameMatch?.[1]) {
    next.campaignName = confirmNameMatch[1].trim()
    next.nameConfirmed = true
    changes.push(`Nome confirmado: "${next.campaignName}"`)
  } else if (changeNameMatch?.[1]) {
    next.campaignName = changeNameMatch[1].trim()
    next.nameConfirmed = true
    changes.push(`Nome atualizado para "${next.campaignName}"`)
  }

  // 2. Quantity updates
  const count = extractRequestedCount(input)
  if (count) {
    next.scope.taskRepeats = count
    changes.push(`Quantidade ajustada para ${count} entregáveis`)
  }

  // 3. Addon toggles
  if (/\b(copy|copywriting|headline|texto|variacoes de texto|redacao)\b/.test(clean)) {
    if (/\b(remover|sem|tirar)\b/.test(clean)) {
      delete next.scope.addons['criacao-de-conteudo-publicitario']
      changes.push('Copywriting removido do escopo')
    } else {
      next.scope.addons['criacao-de-conteudo-publicitario'] = 1
      changes.push('Adicionado: Copywriting (Headline + Body)')
    }
  }

  if (/\b(legenda|legendas|caption)\b/.test(clean)) {
    next.scope.addons['legenda-para-redes-sociais'] = 1
    changes.push('Adicionado: Legendas para redes sociais')
  }

  if (/\b(video|motion|animacao|animar|reels)\b/.test(clean)) {
    next.scope.addons['animacao-de-imagem-estatica-via-ia'] = 1
    changes.push('Adicionado: Versão em vídeo curto / Motion')
  }

  // 4. Format additions
  const addChannelOption = (option: ChannelFormatOption | undefined) => {
    if (!option) return
    const exists = next.configuredFormats.some(
      (f) => f.channel === option.channel && f.formatName === option.name
    )
    if (!exists) {
      next.configuredFormats.push({
        id: `studio-fmt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        channel: option.channel,
        formatName: option.name,
        dimension: option.defaultProportion.dimension,
        proportionLabel: option.defaultProportion.label,
        isPrincipal: next.configuredFormats.length === 0,
        exclusiveDirection: '',
        software: next.selectedEditableFormat || 'Figma',
        extension: next.selectedFinalFormat || '.PNG',
      })
      if (next.selectedProduct?.credits.resizeAllowed) {
        next.scope.resizeCount = Math.max(0, next.configuredFormats.length - 1)
      }
      changes.push(`Formato incluído: ${option.channel} ${option.name} (${option.defaultProportion.dimension})`)
    }
  }

  if (/\b(stories|story|9:16|vertical)\b/.test(clean)) {
    addChannelOption(CHANNEL_FORMATS.find((o) => o.id === 'ig-stories'))
  }
  if (/\b(linkedin)\b/.test(clean)) {
    addChannelOption(CHANNEL_FORMATS.find((o) => o.channel === 'LinkedIn'))
  }
  if (/\b(tiktok)\b/.test(clean)) {
    addChannelOption(CHANNEL_FORMATS.find((o) => o.channel === 'TikTok'))
  }
  if (/\b(youtube)\b/.test(clean)) {
    addChannelOption(CHANNEL_FORMATS.find((o) => o.channel === 'YouTube'))
  }

  // 5. Editable / Final format changes
  if (/\b(figma)\b/.test(clean)) {
    next.selectedEditableFormat = 'Figma'
    next.configuredFormats = next.configuredFormats.map((f) => ({ ...f, software: 'Figma' }))
    changes.push('Arquivo editável definido como Figma')
  } else if (/\b(photoshop|psd)\b/.test(clean)) {
    next.selectedEditableFormat = 'Photoshop'
    next.configuredFormats = next.configuredFormats.map((f) => ({ ...f, software: 'Photoshop' }))
    changes.push('Arquivo editável definido como Photoshop (.PSD)')
  } else if (/\b(illustrator|ai)\b/.test(clean)) {
    next.selectedEditableFormat = 'Illustrator'
    next.configuredFormats = next.configuredFormats.map((f) => ({ ...f, software: 'Illustrator' }))
    changes.push('Arquivo editável definido como Illustrator (.AI)')
  }

  // 6. Creative path changes
  if (/\b(novo conceito|conceito visual|key visual)\b/.test(clean)) {
    next.creativePath = 'new-concept'
    changes.push('Etapa de Conceito Visual adicionada ao escopo')
  } else if (/\b(seguir referencia|mesma linha)\b/.test(clean)) {
    next.creativePath = 'follow-references'
    changes.push('Caminho criativo ajustado para Seguir Referências')
  }

  // 7. Switch product if explicitly requested (e.g., "mudar serviço para carrossel" or "landing page")
  if (/\b(carrossel|landing page|apresentacao|identidade visual)\b/.test(clean)) {
    const newProd = matchCatalogProduct(input, products)
    if (newProd && newProd.code !== next.selectedProduct?.code) {
      next.selectedProduct = newProd
      changes.push(`Serviço principal alterado para ${newProd.name}`)
    }
  }

  // 8. If no structured rule matched, add as a design direction / overview instruction!
  if (changes.length === 0) {
    const formattedNote = input.trim().charAt(0).toUpperCase() + input.trim().slice(1)
    next.designDirection.push(formattedNote)
    changes.push('Diretriz adicionada à Direção Criativa do briefing')
  }

  next.turns.push(
    {
      id: `turn-u-${Date.now()}`,
      sender: 'user',
      text: input.trim(),
      timestamp: 'Agora',
    },
    {
      id: `turn-a-${Date.now() + 1}`,
      sender: 'allyo',
      text: `Pronto! Atualizei o documento do briefing com ${changes.length === 1 ? 'a sua solicitação' : 'as suas solicitações'}.`,
      timestamp: 'Agora',
      highlights: changes,
    }
  )

  return next
}

export function pickStudioReviewers(allyoTeam: UserSummary[]) {
  const defaults = [
    {
      id: 'rev-1',
      name: 'Lucas Mendes',
      role: 'Diretor de Arte',
      initials: 'LM',
      color: '#6ec3e6',
      avatarUrl: null as string | null,
    },
    {
      id: 'rev-2',
      name: 'Marina Costa',
      role: 'Copywriter Sênior',
      initials: 'MC',
      color: '#f29cb6',
      avatarUrl: null as string | null,
    },
    {
      id: 'rev-3',
      name: 'Rafael Souza',
      role: 'Motion & Produção',
      initials: 'RS',
      color: '#d99be8',
      avatarUrl: null as string | null,
    },
  ]

  if (!allyoTeam || allyoTeam.length === 0) return defaults

  return defaults.map((fallback, index) => {
    const member = allyoTeam[index]
    if (!member) return fallback
    return {
      id: member.id || fallback.id,
      name: member.name || fallback.name,
      role: member.jobTitle || fallback.role,
      initials: member.avatarInitials || fallback.initials,
      color: member.avatarColor || fallback.color,
      avatarUrl: member.avatarUrl || null,
    }
  })
}

