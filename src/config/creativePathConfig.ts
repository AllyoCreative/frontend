export const CONCEPT_VISUAL_CODES = new Set([
  '168', // Estático
  '169', // Carrossel
  '159', // Banner para site
  '160', // Banner para e-mail marketing
  '162', // Apresentação de slides
  '163', // E-book
  '164', // Catálogo digital
  '165', // Layout de e-mail marketing
  '167', // Layout de landing page
  '230', // HTML para landing page
  '231', // HTML para e-mail marketing
  '240', // DOOH Estático
  '191', // Caderno
  '192', // Camiseta
  '193', // Ecobag
  '194', // Marca página
  '195', // Adesivo
  '196', // Cartão de visita
  '197', // Cartão postal
  '198', // Cartaz
  '199', // Convite
  '200', // Envelope
  '201', // Papel timbrado
  '202', // Pasta
  '203', // Banner
  '204', // Cordão para credencial
  '205', // Credencial
  '206', // Display de mesa
  '207', // Flyer
  '208', // Folder
  '209', // Folheto
  '210', // Newsletter
  '211', // Relatório
  '212', // Tag
  '213', // Testeira
  '214', // Totem
  '217', // Livro/Revista
  '218', // Catálogo impresso
  '219', // Embalagem
  '221', // Wobbler
  '241', // OOH Impresso
  '152', // Style Guide
  '153', // Logo
  '154', // Mockup
  '156', // Ilustração
  '157', // Key visual
  '161', // Infográfico
  '226', // Geração de imagem via IA
  '228', // Mascote via IA
])

export const VIDEO_STORYBOARD_CODES = new Set([
  '170', // Animado (Redes Sociais)
  '171', // Redes sociais (Vídeo & Áudio)
  '172', // Vídeo Institucional
  '175', // GIF animado
  '176', // Edição de vídeo
  '222', // Edição de vídeo Lite
  '225', // Geração de vídeo via IA
  '227', // Animação de imagem via IA
  '229', // Avatar via IA
  '242', // DOOH Animado
])

export const normalizeTaskName = (name: string): string => {
  let text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  text = text.replace(/[^a-z0-9]/g, '')
  if (text.includes('wobler')) text = text.replace('wobler', 'wobbler')
  return text
}

export const CONCEPT_VISUAL_NAMES = new Set([
  'estatico',
  'carrossel',
  'bannerparasite',
  'bannerparaemailmarketing',
  'apresentacaodeslides',
  'ebook',
  'catalogodigital',
  'layoutdeemailmarketing',
  'layoutdelandingpage',
  'htmlparalandingpage',
  'htmlparaemailmarketing',
  'doohestatico',
  'caderno',
  'camiseta',
  'ecobag',
  'marcapagina',
  'adesivo',
  'cartaodevisita',
  'cartaopostal',
  'cartaz',
  'convite',
  'envelope',
  'papeltimbrado',
  'pasta',
  'banner',
  'cordaoparacredencial',
  'credencial',
  'displaydemesa',
  'flyer',
  'folder',
  'folheto',
  'newsletter',
  'relatorio',
  'tag',
  'testeira',
  'totem',
  'livrorevista',
  'catalogoimpresso',
  'embalagem',
  'wobbler',
  'oohimpresso',
  'ilustracao',
  'infografico',
])

export const VIDEO_STORYBOARD_NAMES = new Set([
  'animado',
  'redessociais',
  'videoinstitucional',
  'gifanimado',
  'edicaodevideo',
  'edicaodevideolite',
  'geracaodevideoviaia',
  'doohanimado',
])

export const CONCEPT_VISUAL_EXTRA_CREDITS = 3
export const CONCEPT_VISUAL_EXTRA_DEADLINE_DAYS = 3

export function isStoryboardEligible(item: { code?: string | null; name?: string | null; category?: string | null } | string | null | undefined): boolean {
  if (!item) return false
  if (typeof item === 'string') {
    const trimmed = item.trim()
    return VIDEO_STORYBOARD_CODES.has(trimmed) || VIDEO_STORYBOARD_NAMES.has(normalizeTaskName(trimmed))
  }
  const code = item.code?.trim() || ''
  if (code && VIDEO_STORYBOARD_CODES.has(code)) return true
  const name = normalizeTaskName(item.name || '')
  return Boolean(name && VIDEO_STORYBOARD_NAMES.has(name))
}

export function isConceptVisualEligible(item: { code?: string | null; name?: string | null; category?: string | null } | string | null | undefined): boolean {
  if (!item) return false
  if (typeof item === 'string') {
    const trimmed = item.trim()
    if (!trimmed) return false
    if (VIDEO_STORYBOARD_CODES.has(trimmed) || VIDEO_STORYBOARD_NAMES.has(normalizeTaskName(trimmed))) return false
    return CONCEPT_VISUAL_CODES.has(trimmed) || CONCEPT_VISUAL_NAMES.has(normalizeTaskName(trimmed)) || trimmed === 'Campanha Integrada'
  }
  const code = item.code?.trim() || ''
  if (code && VIDEO_STORYBOARD_CODES.has(code)) return false
  if (code && CONCEPT_VISUAL_CODES.has(code)) return true
  const name = normalizeTaskName(item.name || '')
  if (name && VIDEO_STORYBOARD_NAMES.has(name)) return false
  return Boolean(name && CONCEPT_VISUAL_NAMES.has(name))
}
