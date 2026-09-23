import { type CSSProperties, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft, ChevronRight, Download, Plus, Upload } from 'lucide-react'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'

type FolderPreview = 'logos' | 'colors' | 'type' | 'images' | 'ui'

type BrandResource = {
  name: string
  meta: string
  tone?: string
}

type BrandFolder = {
  name: string
  description: string
  count: string
  preview: FolderPreview
  resources: BrandResource[]
}

const folders: BrandFolder[] = [
  {
    name: 'Logotipo',
    description: 'Versões principais, reduzidas e aplicações',
    count: '8 arquivos',
    preview: 'logos',
    resources: [
      { name: 'Logo principal', meta: 'SVG · Fundo claro' },
      { name: 'Logo monocromático', meta: 'AI · Vetor editável' },
      { name: 'Símbolo reduzido', meta: 'PNG · 2048 × 2048 px' },
    ],
  },
  {
    name: 'Cores',
    description: 'Paleta principal, apoio e combinações',
    count: '12 cores',
    preview: 'colors',
    resources: [
      { name: 'Verde Allyo', meta: '#004C46', tone: '#004c46' },
      { name: 'Lima Fauves', meta: '#D0F08E', tone: '#d0f08e' },
      { name: 'Rosa apoio', meta: '#FCAEEA', tone: '#fcaeea' },
    ],
  },
  {
    name: 'Tipografias',
    description: 'Famílias, pesos e hierarquia',
    count: '2 famílias',
    preview: 'type',
    resources: [
      { name: 'Plus Jakarta Sans', meta: 'Títulos e interface' },
      { name: 'Season Mix', meta: 'Destaques editoriais' },
      { name: 'Escala tipográfica', meta: 'Tokens e exemplos' },
    ],
  },
  {
    name: 'Imagens',
    description: 'Fotografia, direção de arte e referências',
    count: '24 arquivos',
    preview: 'images',
    resources: [
      { name: 'Campanha institucional', meta: '8 imagens' },
      { name: 'Retratos do time', meta: '10 imagens' },
      { name: 'Direção de arte', meta: '6 referências' },
    ],
  },
  {
    name: 'UI Comp.',
    description: 'Elementos e padrões de produto',
    count: '16 componentes',
    preview: 'ui',
    resources: [
      { name: 'Botões', meta: '6 variantes' },
      { name: 'Campos', meta: '4 componentes' },
      { name: 'Cards', meta: '6 padrões' },
    ],
  },
]

function BrandFolderArt({ preview, shared = false }: { preview: FolderPreview; shared?: boolean }) {
  const style = shared ? ({ viewTransitionName: `brand-folder-${preview}` } as CSSProperties) : undefined

  return <div className={`brand-art brand-art--${preview}`} style={style} aria-hidden="true">
    {preview === 'logos' && <div className="brand-art__logo-files">
      <img className="brand-art__logo-file brand-art__logo-file--ai" src={figmaAsset('brand.imgGroup1410119722')} alt="" />
      <img className="brand-art__logo-file brand-art__logo-file--png" src={figmaAsset('brand.imgGroup1410119721')} alt="" />
      <span className="brand-art__extension brand-art__extension--ai">.ai</span>
      <span className="brand-art__extension brand-art__extension--png">.png</span>
    </div>}

    {preview === 'colors' && <div className="brand-art__folder-stack">
      <i className="brand-art__card brand-art__card--sage" />
      <i className="brand-art__card brand-art__card--lime" />
      <i className="brand-art__card brand-art__card--ink" />
      <i className="brand-art__folder-glass" />
      <img className="brand-art__folder-front" src={figmaAsset('brand.imgGroup1410119725')} alt="" />
    </div>}

    {preview === 'type' && <div className="brand-art__folder-stack brand-art__folder-stack--type">
      <i className="brand-art__card brand-art__card--blue"><b>Aa</b></i>
      <i className="brand-art__card brand-art__card--lime"><img src="/assets/figma/brand_season_ampersand.png" alt="" /></i>
      <i className="brand-art__card brand-art__card--sky"><b>Aa</b></i>
      <i className="brand-art__folder-glass" />
      <img className="brand-art__folder-front" src={figmaAsset('brand.imgGroup1410119725')} alt="" />
    </div>}

    {preview === 'images' && <div className="brand-art__image-stack">
      <i /><i /><i /><i />
    </div>}

    {preview === 'ui' && <div className="brand-art__ui-stack">
      <i className="brand-art__ui-card brand-art__ui-card--season"><img src="/assets/figma/brand_season_aa.png" alt="" /></i>
      <i className="brand-art__ui-card brand-art__ui-card--jakarta">Aa</i>
    </div>}
  </div>
}

function ResourcePreview({ folder, resource }: { folder: BrandFolder; resource: BrandResource }) {
  if (folder.preview === 'colors') return <span className="brand-resource__color" style={{ background: resource.tone }} />
  if (folder.preview === 'type') return <span className="brand-resource__type">Aa</span>
  if (folder.preview === 'images') return <span className="brand-resource__image" />
  if (folder.preview === 'ui') return <span className="brand-resource__ui"><i /><i /><i /></span>
  return <span className="brand-resource__logo">allyo</span>
}

export function BrandKitPage() {
  const { notify, brands } = useApp()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [activeFolder, setActiveFolder] = useState<FolderPreview | null>(null)
  const selectedFolder = folders.find((folder) => folder.preview === activeFolder)
  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId)

  const changeFolder = (folder: FolderPreview | null) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startViewTransition = (document as Document & {
      startViewTransition?: (update: () => void) => unknown
    }).startViewTransition

    if (!startViewTransition || reducedMotion) {
      setActiveFolder(folder)
      return
    }

    startViewTransition.call(document, () => {
      flushSync(() => setActiveFolder(folder))
    })
  }

  return <div className={`page brand-page${selectedFolder ? ' brand-page--open' : ''}`}>
    {!selectedBrand ? <section className="brand-selector">
      <header className="brand-header">
        <h1>Brand Kit</h1>
        <p>Selecione uma marca para acessar seus recursos oficiais.</p>
      </header>
      <div className="brand-selector__grid">
        {brands.map((brand) => <button type="button" key={brand.id} onClick={() => setSelectedBrandId(brand.id)}>
          <span className="brand-selector__mark" style={{ background: brand.color }}>{brand.initials}</span>
          <span><strong>{brand.name}</strong><small>{brand.description}</small><em>5 coleções de recursos</em></span>
          <ChevronRight size={20} />
        </button>)}
      </div>
    </section> : !selectedFolder ? <>
      <button type="button" className="brand-back brand-back--brands" onClick={() => setSelectedBrandId(null)}>
        <ArrowLeft size={18} /> Todas as marcas
      </button>
      <header className="brand-header">
        <h1>Brand Kit <span>›</span> <b>{selectedBrand.name}</b></h1>
        <p>Todos os recursos oficiais da marca, organizados em um só lugar.</p>
      </header>

      <div className="brand-folder-grid" aria-label="Pastas do Brand Kit">
        {folders.map((folder) => <button
          type="button"
          key={folder.preview}
          className={`brand-folder brand-folder--${folder.preview}`}
          onClick={() => changeFolder(folder.preview)}
          aria-label={`Abrir ${folder.name}: ${folder.description}`}
        >
          <BrandFolderArt preview={folder.preview} shared />
          <span className="brand-folder__label">{folder.name}</span>
          <span className="brand-folder__meta">{folder.count}</span>
        </button>)}
      </div>
    </> : <section className="brand-folder-view" aria-labelledby="brand-folder-title">
      <button type="button" className="brand-back" onClick={() => changeFolder(null)}>
        <ArrowLeft size={18} /> Voltar ao Brand Kit
      </button>

      <header className="brand-folder-view__header">
        <BrandFolderArt preview={selectedFolder.preview} shared />
        <div>
          <span className="brand-folder-view__eyebrow">Brand Kit · {selectedBrand.name}</span>
          <h1 id="brand-folder-title">{selectedFolder.name}</h1>
          <p>{selectedFolder.description} · {selectedFolder.count}</p>
        </div>
        <button type="button" className="primary-button" onClick={() => notify(`Upload em ${selectedFolder.name} iniciado`)}>
          <Upload size={17} /> Adicionar arquivo
        </button>
      </header>

      <div className="brand-folder-view__toolbar">
        <div><h2>Recursos</h2><span>{selectedFolder.resources.length} itens recentes</span></div>
        <button type="button" className="secondary-button" onClick={() => notify(`Nova coleção criada em ${selectedFolder.name}`)}><Plus size={17} /> Nova coleção</button>
      </div>

      <div className={`brand-resource-grid brand-resource-grid--${selectedFolder.preview}`}>
        {selectedFolder.resources.map((resource) => <button type="button" className="brand-resource" key={resource.name} onClick={() => notify(`${resource.name} aberto`)}>
          <span className="brand-resource__preview"><ResourcePreview folder={selectedFolder} resource={resource} /></span>
          <span className="brand-resource__copy"><strong>{resource.name}</strong><small>{resource.meta}</small></span>
          <Download size={18} aria-hidden="true" />
        </button>)}
      </div>
    </section>}
  </div>
}
