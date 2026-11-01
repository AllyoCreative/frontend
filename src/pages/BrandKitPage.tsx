import { type FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ChevronRight, Download, FileText, FolderPlus, LayoutGrid, List, Palette, Search, Trash2, Upload, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../AppContext'
import { figmaAsset } from '../assets/figma'
import { api, type BrandKitFolder as ApiBrandKitFolder } from '../services/api'

type FolderPreview = 'logos' | 'colors' | 'type' | 'images' | 'ui'

type BrandResource = ApiBrandKitFolder['resources'][number]
type BrandFolder = Omit<ApiBrandKitFolder, 'preview'> & { preview: FolderPreview }
const folderPreviews: FolderPreview[] = ['logos', 'colors', 'type', 'images', 'ui']
const folderTypeOptions: Array<{ value: FolderPreview; label: string }> = [
  { value: 'images', label: 'Imagens e referências' },
  { value: 'logos', label: 'Logotipos' },
  { value: 'colors', label: 'Cores' },
  { value: 'type', label: 'Tipografias' },
  { value: 'ui', label: 'Componentes de UI' },
]

function BrandFolderArt({ preview }: { preview: FolderPreview }) {
  return <div className={`brand-art brand-art--${preview}`} aria-hidden="true">
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

const fileExtension = (name: string) => (name.includes('.') ? name.split('.').pop()!.toUpperCase().slice(0, 5) : 'ARQ')
const formatSize = (bytes: number) => bytes >= 1024 * 1024
  ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`
  : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.max(1, bytes / 1024))} KB`

function ResourcePreview({ folder, resource }: { folder: BrandFolder; resource: BrandResource }) {
  if (resource.fileUrl && resource.contentType?.startsWith('image/')) return <img className="brand-resource__uploaded-image" src={resource.fileUrl} alt="" />
  if (folder.preview === 'colors' || resource.tone) return <span className="brand-resource__color" style={{ background: resource.tone }} />
  if (resource.fileUrl) return <span className="bk-ext-badge"><FileText size={26} strokeWidth={1.5} />{fileExtension(resource.name)}</span>
  if (folder.preview === 'type') return <span className="brand-resource__type">Aa</span>
  if (folder.preview === 'images') return <span className="brand-resource__image" />
  if (folder.preview === 'ui') return <span className="brand-resource__ui"><i /><i /><i /></span>
  return <span className="brand-resource__logo">allyo</span>
}

export function BrandKitPage() {
  const { notify, brands } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [folderState, setFolderState] = useState<{ brandId: string; folder: string } | null>(null)
  const [folderResult, setFolderResult] = useState<{ brandId: string; items: BrandFolder[] } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderType, setNewFolderType] = useState<FolderPreview>('images')
  const [showNewColor, setShowNewColor] = useState(false)
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#004c46')
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const selectedBrandId = searchParams.get('marca')
  const folders = folderResult?.brandId === selectedBrandId ? folderResult.items : []
  const loadingFolders = Boolean(selectedBrandId && folderResult?.brandId !== selectedBrandId)
  const activeFolder = folderState?.brandId === selectedBrandId ? folderState.folder : null
  const selectedFolder = folders.find((folder) => folder.id === activeFolder)
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

  const reloadFolders = async (brandId: string) => {
    const items = await api.getBrandKit(brandId)
    setFolderResult({
      brandId,
      items: items.filter((item) => folderPreviews.includes(item.preview as FolderPreview)) as BrandFolder[],
    })
  }

  const createFolder = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedBrandId || !newFolderName.trim()) return
    setSaving(true)
    try {
      await api.createBrandKitFolder({ brandId: selectedBrandId, name: newFolderName.trim(), preview: newFolderType })
      await reloadFolders(selectedBrandId)
      setNewFolderName('')
      setNewFolderType('images')
      setShowNewFolder(false)
      notify('Pasta criada no Brand Kit')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível criar a pasta')
    } finally {
      setSaving(false)
    }
  }

  const addColor = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedFolder || !selectedBrandId || !newColorName.trim()) return
    setSaving(true)
    try {
      await api.addBrandKitResource({
        folderId: selectedFolder.id,
        name: newColorName.trim(),
        meta: newColorHex.toUpperCase(),
        tone: newColorHex,
      })
      await reloadFolders(selectedBrandId)
      setNewColorName('')
      setShowNewColor(false)
      notify('Cor adicionada ao Brand Kit')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível adicionar a cor')
    } finally {
      setSaving(false)
    }
  }

  const removeResource = async (resource: BrandResource) => {
    if (!selectedBrandId || !window.confirm(`Remover "${resource.name}" do Brand Kit?`)) return
    try {
      await api.deleteBrandKitResource(resource.id)
      await reloadFolders(selectedBrandId)
      notify('Item removido')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível remover o item')
    }
  }

  const removeFolder = async (folder: BrandFolder) => {
    if (!selectedBrandId || !window.confirm(`Excluir a pasta "${folder.name}" e todos os itens dela?`)) return
    try {
      await api.deleteBrandKitFolder(folder.id)
      setFolderState(null)
      await reloadFolders(selectedBrandId)
      notify('Pasta excluída')
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível excluir a pasta')
    }
  }

  const changeFolder = (folder: string | null) => {
    setFolderState(folder && selectedBrandId ? { brandId: selectedBrandId, folder } : null)
  }

  const uploadFiles = async (fileList?: FileList | File[] | null) => {
    const files = Array.from(fileList || [])
    if (files.length === 0 || !selectedFolder || !selectedBrandId) return
    setUploading(true)
    let sent = 0
    try {
      for (const file of files) {
        notify(`Enviando ${file.name}${files.length > 1 ? ` (${sent + 1}/${files.length})` : ''}...`)
        const uploaded = await api.uploadFile(file, 'brand-kit')
        await api.addBrandKitResource({
          folderId: selectedFolder.id,
          name: file.name,
          meta: `${fileExtension(file.name)} · ${formatSize(file.size)}`,
          fileKey: uploaded.fileKey,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.sizeBytes,
        })
        sent += 1
      }
      notify(sent === 1 ? 'Arquivo adicionado ao Brand Kit' : `${sent} arquivos adicionados ao Brand Kit`)
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo')
    } finally {
      if (sent > 0) await reloadFolders(selectedBrandId)
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const visibleResources = selectedFolder
    ? selectedFolder.resources.filter((resource) => `${resource.name} ${resource.meta}`.toLowerCase().includes(query.trim().toLowerCase()))
    : []

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
          key={folder.id}
          className={`brand-folder brand-folder--${folder.preview}`}
          onClick={() => changeFolder(folder.id)}
          aria-label={`Abrir ${folder.name}: ${folder.description}`}
        >
          <BrandFolderArt preview={folder.preview} />
          <span className="brand-folder__label">{folder.name}</span>
          <span className="brand-folder__meta">{folder.count}</span>
        </button>)}
        {!loadingFolders && <button type="button" className="brand-folder brand-folder--new" onClick={() => setShowNewFolder(true)} aria-label="Criar nova pasta">
          <span className="brand-folder__new-art"><FolderPlus size={34} strokeWidth={1.6} /></span>
          <span className="brand-folder__label">Nova pasta</span>
          <span className="brand-folder__meta">Organize seus arquivos</span>
        </button>}
      </div>
      {loadingFolders && <div className="brand-kit-empty">Carregando recursos...</div>}
      {!loadingFolders && folders.length === 0 && <div className="brand-kit-empty"><strong>Brand Kit vazio</strong><span>Crie a primeira pasta para começar a organizar os recursos desta marca.</span><button type="button" className="primary-button" onClick={() => setShowNewFolder(true)}><FolderPlus size={17} /> Nova pasta</button></div>}
    </> : <section
      className={`bk-view${dragging ? ' is-dragging' : ''}`}
      aria-label={selectedFolder.name}
      onDragEnter={(event) => { if (!event.dataTransfer.types.includes('Files')) return; event.preventDefault(); dragDepth.current += 1; setDragging(true) }}
      onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault() }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false) }}
      onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); void uploadFiles(event.dataTransfer.files) }}
    >
      <header className="bk-bar">
        <nav className="bk-crumbs" aria-label="Navegação do Brand Kit">
          <button type="button" onClick={() => { setQuery(''); changeFolder(null); selectBrand(null) }}>Brand Kit</button>
          <ChevronRight size={15} />
          <button type="button" onClick={() => { setQuery(''); changeFolder(null) }}>{selectedBrand.name}</button>
          <ChevronRight size={15} />
          <strong aria-current="page"><span className={`bk-crumbs__dot bk-crumbs__dot--${selectedFolder.preview}`} />{selectedFolder.name}</strong>
          <em>{selectedFolder.count}</em>
        </nav>
        <div className="bk-bar__tools">
          <label className="bk-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nesta pasta" aria-label="Buscar nesta pasta" /></label>
          <div className="bk-toggle" role="group" aria-label="Modo de visualização">
            <button type="button" className={viewMode === 'grid' ? 'is-active' : ''} onClick={() => setViewMode('grid')} aria-label="Grade" title="Grade"><LayoutGrid size={16} /></button>
            <button type="button" className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} aria-label="Lista" title="Lista"><List size={16} /></button>
          </div>
          {selectedFolder.preview === 'colors' && <button type="button" className="bk-btn" onClick={() => setShowNewColor(true)}><Palette size={16} /> Cor</button>}
          <button type="button" className="bk-btn bk-btn--primary" disabled={uploading} onClick={() => fileInput.current?.click()}><Upload size={16} /> {uploading ? 'Enviando...' : 'Enviar'}</button>
          <button type="button" className="bk-icon-btn" onClick={() => void removeFolder(selectedFolder)} aria-label="Excluir pasta" title="Excluir pasta"><Trash2 size={16} /></button>
        </div>
        <input ref={fileInput} type="file" hidden multiple accept="image/*,video/*,.pdf,.zip,.ai,.eps,.svg,.woff,.woff2,.otf,.ttf,.txt,.psd,.fig" onChange={(event) => void uploadFiles(event.target.files)} />
      </header>

      {selectedFolder.resources.length === 0 ? <button type="button" className="bk-empty" onClick={() => fileInput.current?.click()}>
        <span className="bk-empty__art"><BrandFolderArt preview={selectedFolder.preview} /></span>
        <strong>{selectedFolder.name} está vazia</strong>
        <span>Arraste arquivos para cá ou clique para enviar. {selectedFolder.description}.</span>
      </button> : visibleResources.length === 0 ? <div className="brand-kit-empty"><strong>Nada encontrado</strong><span>Nenhum item corresponde a "{query}".</span></div> : viewMode === 'grid' ? <div className="bk-grid">
        {visibleResources.map((resource) => <article className="bk-card" key={resource.id}>
          <button type="button" className="bk-card__open" disabled={!resource.fileUrl} onClick={() => resource.fileUrl && window.open(resource.fileUrl, '_blank', 'noopener,noreferrer')} aria-label={`Abrir ${resource.name}`}>
            <span className="bk-card__preview"><ResourcePreview folder={selectedFolder} resource={resource} /></span>
            <span className="bk-card__copy"><strong title={resource.name}>{resource.name}</strong><small>{resource.meta}</small></span>
          </button>
          <span className="bk-card__actions">
            {resource.fileUrl && <a href={resource.fileUrl} download={resource.name} target="_blank" rel="noreferrer" aria-label={`Baixar ${resource.name}`} title="Baixar"><Download size={14} /></a>}
            <button type="button" onClick={() => void removeResource(resource)} aria-label={`Remover ${resource.name}`} title="Remover"><Trash2 size={14} /></button>
          </span>
        </article>)}
      </div> : <div className="bk-list" role="table">
        <div className="bk-list__head" role="row"><span>Nome</span><span>Detalhes</span><span /></div>
        {visibleResources.map((resource) => <div className="bk-list__row" role="row" key={resource.id}>
          <button type="button" className="bk-list__name" disabled={!resource.fileUrl} onClick={() => resource.fileUrl && window.open(resource.fileUrl, '_blank', 'noopener,noreferrer')}>
            <span className="bk-list__thumb"><ResourcePreview folder={selectedFolder} resource={resource} /></span>
            <strong title={resource.name}>{resource.name}</strong>
          </button>
          <span className="bk-list__meta">{resource.meta}</span>
          <span className="bk-list__actions">
            {resource.fileUrl && <a href={resource.fileUrl} download={resource.name} target="_blank" rel="noreferrer" aria-label={`Baixar ${resource.name}`} title="Baixar"><Download size={15} /></a>}
            <button type="button" onClick={() => void removeResource(resource)} aria-label={`Remover ${resource.name}`} title="Remover"><Trash2 size={15} /></button>
          </span>
        </div>)}
      </div>}

      {dragging && <div className="bk-drop" aria-hidden="true"><Upload size={30} /><strong>Solte para enviar para {selectedFolder.name}</strong></div>}
    </section>}

    {showNewFolder && createPortal(<div className="account-modal" role="dialog" aria-modal="true" aria-labelledby="new-folder-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewFolder(false) }}>
      <form onSubmit={createFolder}>
        <header><div><h2 id="new-folder-title">Nova pasta</h2><p>Crie uma pasta para organizar os recursos de {selectedBrand?.name}.</p></div><button type="button" onClick={() => setShowNewFolder(false)} aria-label="Fechar"><X size={18} /></button></header>
        <label>Nome da pasta<input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Ex.: Campanhas 2026" required autoFocus /></label>
        <label>Tipo de conteúdo<select value={newFolderType} onChange={(event) => setNewFolderType(event.target.value as FolderPreview)}>{folderTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <footer><button type="button" className="secondary-button" onClick={() => setShowNewFolder(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || !newFolderName.trim()}>{saving ? 'Criando...' : 'Criar pasta'}</button></footer>
      </form>
    </div>, document.body)}

    {showNewColor && selectedFolder && createPortal(<div className="account-modal" role="dialog" aria-modal="true" aria-labelledby="new-color-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNewColor(false) }}>
      <form onSubmit={addColor}>
        <header><div><h2 id="new-color-title">Adicionar cor</h2><p>Registre uma cor oficial em {selectedFolder.name}.</p></div><button type="button" onClick={() => setShowNewColor(false)} aria-label="Fechar"><X size={18} /></button></header>
        <label>Nome da cor<input value={newColorName} onChange={(event) => setNewColorName(event.target.value)} placeholder="Ex.: Verde principal" required autoFocus /></label>
        <label>Cor<div className="color-field"><input type="color" value={newColorHex} onChange={(event) => setNewColorHex(event.target.value)} /><span>{newColorHex.toUpperCase()}</span></div></label>
        <footer><button type="button" className="secondary-button" onClick={() => setShowNewColor(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || !newColorName.trim()}>{saving ? 'Salvando...' : 'Adicionar cor'}</button></footer>
      </form>
    </div>, document.body)}
  </div>
}
