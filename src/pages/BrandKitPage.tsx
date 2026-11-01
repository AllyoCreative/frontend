import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { ArrowLeft, ChevronRight, Download, FolderPlus, Palette, Trash2, Upload, X } from 'lucide-react'
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
      await reloadFolders(selectedBrandId)
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
          key={folder.id}
          className={`brand-folder brand-folder--${folder.preview}`}
          onClick={() => changeFolder(folder.id)}
          aria-label={`Abrir ${folder.name}: ${folder.description}`}
        >
          <BrandFolderArt preview={folder.preview} shared={folders.find((item) => item.preview === folder.preview)?.id === folder.id} />
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
        <div className="brand-folder-view__actions">
          {selectedFolder.preview === 'colors' && <button type="button" className="secondary-button" onClick={() => setShowNewColor(true)}><Palette size={17} /> Adicionar cor</button>}
          <button type="button" className="primary-button" disabled={uploading} onClick={() => fileInput.current?.click()}>
            <Upload size={17} /> {uploading ? 'Enviando...' : 'Adicionar arquivo'}
          </button>
        </div>
        <input ref={fileInput} type="file" hidden accept="image/*,video/*,.pdf,.zip,.ai,.eps,.svg,.woff,.woff2,.txt" onChange={(event) => uploadResource(event.target.files?.[0])} />
      </header>

      <div className="brand-folder-view__toolbar">
        <div><h2>Recursos</h2><span>{selectedFolder.resources.length === 0 ? 'Nenhum item ainda' : `${selectedFolder.resources.length} ${selectedFolder.resources.length === 1 ? 'item' : 'itens'}`}</span></div>
        <button type="button" className="secondary-button" onClick={() => void removeFolder(selectedFolder)}><Trash2 size={17} /> Excluir pasta</button>
      </div>

      {selectedFolder.resources.length === 0 && <div className="brand-kit-empty"><strong>Pasta vazia</strong><span>{selectedFolder.preview === 'colors' ? 'Adicione cores da marca ou envie arquivos de paleta.' : 'Envie arquivos para esta pasta com o botão "Adicionar arquivo".'}</span></div>}

      <div className={`brand-resource-grid brand-resource-grid--${selectedFolder.preview}`}>
        {selectedFolder.resources.map((resource) => <div className="brand-resource-wrap" key={resource.id}>
          <button type="button" className="brand-resource" disabled={!resource.fileUrl} onClick={() => resource.fileUrl && window.open(resource.fileUrl, '_blank', 'noopener,noreferrer')}>
            <span className="brand-resource__preview"><ResourcePreview folder={selectedFolder} resource={resource} /></span>
            <span className="brand-resource__copy"><strong>{resource.name}</strong><small>{resource.meta}</small></span>
            <Download size={18} aria-hidden="true" />
          </button>
          <button type="button" className="brand-resource__remove" onClick={() => void removeResource(resource)} aria-label={`Remover ${resource.name}`} title="Remover"><Trash2 size={14} /></button>
        </div>)}
      </div>
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
