export const CONCEPT_VISUAL_CODES = new Set([
  '168', // Estático
  '169', // Carrossel
  '159', // Banner para site
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
  '161', // Infográfico
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
  'infografico',
])

export const CONCEPT_VISUAL_EXTRA_CREDITS = 3
export const CONCEPT_VISUAL_EXTRA_DEADLINE_DAYS = 3

export function isConceptVisualEligible(item: { code?: string | null; name?: string | null } | string | null | undefined): boolean {
  if (typeof item === 'string') return item.trim().length > 0
  return Boolean(item?.code?.trim() || item?.name?.trim())
}
