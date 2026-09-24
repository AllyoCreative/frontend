import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft, ChevronRight, Download, Plus, Upload } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { api, type BrandKitFolder as ApiBrandKitFolder } from '../services/api'

type FolderPreview = 'logos' | 'colors' | 'type' | 'images' | 'ui'

type BrandResource = ApiBrandKitFolder['resources'][number]
type BrandFolder = Omit<ApiBrandKitFolder, 'preview'> & { preview: FolderPreview }
const folderPreviews: FolderPreview[] = ['logos', 'colors', 'type', 'images', 'ui']

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
  if (resource.fileUrl && resource.contentType?.startsWith('image/')) return <img className="brand-resource__uploaded-image" src={resource.fileUrl} alt="" />
  if (folder.preview === 'colors') return <span className="brand-resource__color" style={{ background: resource.tone }} />
  if (folder.preview === 'type') return <span className="brand-resource__type">Aa</span>
  if (folder.preview === 'images') return <span className="brand-resource__image" />
  if (folder.preview === 'ui') return <span className="brand-resource__ui"><i /><i /><i /></span>
  return <span className="brand-resource__logo">allyo</span>
}

export function BrandKitPage() {
  const { notify, brands } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [folderState, setFolderState] = useState<{ brandId: string; folder: FolderPreview } | null>(null)
  const [folderResult, setFolderResult] = useState<{ brandId: string; items: BrandFolder[] } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const selectedBrandId = searchParams.get('marca')
  const folders = folderResult?.brandId === selectedBrandId ? folderResult.items : []
  const loadingFolders = Boolean(selectedBrandId && folderResult?.brandId !== selectedBrandId)
  const activeFolder = folderState?.brandId === selectedBrandId ? folderState.folder : null
  const selectedFolder = folders.find((folder) => folder.preview === activeFolder)
  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId)

  useEffect(() => {
    let active = true
    if (!selectedBrandId) return () => { active = false }
    api.getBrandKit(selectedBrandId)
      .then((items) => {
        if (!active) return
        setFolderResult({
          brandId: selectedBrandId,
          items: items.filter((item) => folderPreviews.includes(item.preview as FolderPreview)) as BrandFolder[],
        })
      })
      .catch(() => {
        if (active) {
          setFolderResult({ brandId: selectedBrandId, items: [] })
          notify('Não foi possível carregar os recursos desta marca')
        }
      })
    return () => { active = false }
  }, [notify, selectedBrandId])

  const selectBrand = (brandId: string | null) => {
    setFolderState(null)
    setSearchParams(brandId ? { marca: brandId } : {})
  }

  const changeFolder = (folder: FolderPreview | null) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startViewTransition = (document as Document & {
      startViewTransition?: (update: () => void) => unknown
    }).startViewTransition

    if (!startViewTransition || reducedMotion) {
      setFolderState(folder && selectedBrandId ? { brandId: selectedBrandId, folder } : null)
      return
    }

    startViewTransition.call(document, () => {
      flushSync(() => setFolderState(folder && selectedBrandId ? { brandId: selectedBrandId, folder } : null))
    })
  }

  const uploadResource = async (file?: File) => {
    if (!file || !selectedFolder || !selectedBrandId) return
    setUploading(true)
    try {
      notify(`Enviando ${file.name} para o Brand Kit...`)
      const uploaded = await api.uploadFile(file, 'brand-kit')
      await api.addBrandKitResource({
        folderId: selectedFolder.id,
        name: file.name,
        meta: `${file.type || 'Arquivo'} · ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(file.size / 1024)} KB`,
        fileKey: uploaded.fileKey,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
      })
      const items = await api.getBrandKit(selectedBrandId)
      setFolderResult({
        brandId: selectedBrandId,
        items: items.filter((item) => folderPreviews.includes(item.preview as FolderPreview)) as BrandFolder[],
      })
      notify('Arquivo adicionado ao Brand Kit')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return <div className={`page brand-page${selectedFolder ? ' brand-page--open' : ''}`}>
    {!selectedBrand ? <section className="brand-selector">
      <header className="brand-header">
        <h1>Brand Kit</h1>
        <p>Selecione uma marca para acessar seus recursos oficiais.</p>
      </header>
      <div className="brand-selector__grid">
        {brands.map((brand) => <button type="button" key={brand.id} onClick={() => selectBrand(brand.id)}>
          <span className="brand-selector__mark" style={{ background: brand.color }}>{brand.initials}</span>
          <span><strong>{brand.name}</strong><small>{brand.description}</small><em>Abrir Brand Kit</em></span>
          <ChevronRight size={20} />
        </button>)}
      </div>
    </section> : !selectedFolder ? <>
      <button type="button" className="brand-back brand-back--brands" onClick={() => selectBrand(null)}>
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
      {loadingFolders && <div className="brand-kit-empty">Carregando recursos...</div>}
      {!loadingFolders && folders.length === 0 && <div className="brand-kit-empty"><strong>Brand Kit vazio</strong><span>Esta marca ainda não possui coleções ou arquivos.</span></div>}
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
        <button type="button" className="primary-button" disabled={uploading} onClick={() => fileInput.current?.click()}>
          <Upload size={17} /> {uploading ? 'Enviando...' : 'Adicionar arquivo'}
        </button>
        <input ref={fileInput} type="file" hidden accept="image/*,video/*,.pdf,.zip,.ai,.eps,.svg,.woff,.woff2,.txt" onChange={(event) => uploadResource(event.target.files?.[0])} />
      </header>

      <div className="brand-folder-view__toolbar">
        <div><h2>Recursos</h2><span>{selectedFolder.resources.length} itens recentes</span></div>
        <button type="button" className="secondary-button" onClick={() => notify(`Nova coleção criada em ${selectedFolder.name}`)}><Plus size={17} /> Nova coleção</button>
      </div>

      <div className={`brand-resource-grid brand-resource-grid--${selectedFolder.preview}`}>
        {selectedFolder.resources.map((resource) => <button type="button" className="brand-resource" key={resource.id} disabled={!resource.fileUrl} onClick={() => resource.fileUrl && window.open(resource.fileUrl, '_blank', 'noopener,noreferrer')}>
          <span className="brand-resource__preview"><ResourcePreview folder={selectedFolder} resource={resource} /></span>
          <span className="brand-resource__copy"><strong>{resource.name}</strong><small>{resource.meta}</small></span>
          <Download size={18} aria-hidden="true" />
        </button>)}
      </div>
    </section>}
  </div>
}
