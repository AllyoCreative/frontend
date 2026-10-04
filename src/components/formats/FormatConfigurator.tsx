import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  Maximize2,
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { CHANNEL_FORMATS, STANDARD_ADDONS } from './channelData'
import { ChannelBadgeIcon } from './ChannelIcons'
import type { ChannelFormatOption, ConfiguredFormatItem, FormatProportion } from './formatTypes'

interface FormatConfiguratorProps {
  configuredFormats: ConfiguredFormatItem[]
  activeFormatId: string | null
  onSelectFormat: (id: string) => void
  onRemoveFormat: (id: string) => void
  onOpenAddModal: () => void
  onUpdateFormat: (id: string, updates: Partial<ConfiguredFormatItem>) => void
  addons: Record<string, number>
  onToggleAddon: (code: string) => void
  selectedFinalFormat: string
  onSelectFinalFormat: (format: string) => void
  selectedEditableFormat: string
  onSelectEditableFormat: (format: string) => void
  availableFinalFormats?: string[]
  availableEditableFormats?: string[]
  formatOptions?: ChannelFormatOption[]
  deliveryContent?: ReactNode
  availableAddons?: Array<{ code: string; name: string; credits: number; description?: string }>
}

export function FormatConfigurator(props: FormatConfiguratorProps) {
  const [addonsOpen, setAddonsOpen] = useState(true)
  const [proportionsDropdownOpen, setProportionsDropdownOpen] = useState(false)
  const [showExclusiveDirection, setShowExclusiveDirection] = useState(false)
  const [customDimensionInput, setCustomDimensionInput] = useState('')
  const [showCustomDimensionRow, setShowCustomDimensionRow] = useState(false)
  const [editingSoftware, setEditingSoftware] = useState(false)
  const [editingExtension, setEditingExtension] = useState(false)

  // Active format object
  const activeFormat = useMemo(() => {
    return props.configuredFormats.find((item) => item.id === props.activeFormatId) || props.configuredFormats[0] || null
  }, [props.configuredFormats, props.activeFormatId])

  // Look up channel format definition to find available proportions
  const formatDefinition = useMemo(() => {
    if (!activeFormat) return null
    return (
      (props.formatOptions || CHANNEL_FORMATS).find(
        (item) =>
          item.channel.toLowerCase() === activeFormat.channel.toLowerCase() &&
          item.name.toLowerCase() === activeFormat.formatName.toLowerCase()
      ) || null
    )
  }, [activeFormat, props.formatOptions])

  const availableProportions = useMemo<FormatProportion[]>(() => {
    if (formatDefinition) {
      return formatDefinition.proportions
    }
    // Fallback standard proportions
    return [
      { id: 'portrait-std', label: 'Retrato', dimension: '1080 × 1350px', icon: 'phone' },
      { id: 'square-std', label: 'Quadrado', dimension: '1080 × 1080px', icon: 'square' },
      { id: 'landscape-std', label: 'Paisagem', dimension: '1200 × 630px', icon: 'banner' },
      { id: 'stories-std', label: 'Vertical', dimension: '1080 × 1920px', icon: 'phone' },
    ]
  }, [formatDefinition])

  const handleSelectProportion = (prop: FormatProportion) => {
    if (!activeFormat) return
    props.onUpdateFormat(activeFormat.id, {
      dimension: prop.dimension,
      proportionLabel: prop.label,
    })
    setProportionsDropdownOpen(false)
  }

  const handleApplyCustomDimension = () => {
    if (!activeFormat || !customDimensionInput.trim()) return
    const customDim = customDimensionInput.trim()
    props.onUpdateFormat(activeFormat.id, {
      dimension: customDim,
      proportionLabel: 'Personalizado',
      customDimension: customDim,
    })
    setCustomDimensionInput('')
    setShowCustomDimensionRow(false)
    setProportionsDropdownOpen(false)
  }

  const defaultSoftwareOptions = ['A definir']
  const defaultExtensionOptions = ['A definir']

  const finalFormatsList = props.availableFinalFormats?.length ? props.availableFinalFormats : defaultExtensionOptions
  const editableFormatsList = props.availableEditableFormats?.length ? props.availableEditableFormats : defaultSoftwareOptions
  const availableAddons = props.availableAddons ?? STANDARD_ADDONS
  const canConfigureAddons = Boolean(activeFormat?.isPrincipal)
  const visibleAddons = canConfigureAddons
    ? availableAddons
    : availableAddons.filter((addon) => Boolean(props.addons[addon.code] && props.addons[addon.code] > 0))
  const hasFormatsToAdd = (props.formatOptions || CHANNEL_FORMATS).some((option) =>
    !props.configuredFormats.some((item) =>
      item.channel.toLocaleLowerCase('pt-BR') === option.channel.toLocaleLowerCase('pt-BR')
      && item.formatName.toLocaleLowerCase('pt-BR') === option.name.toLocaleLowerCase('pt-BR')
    )
  )
  const completedFormatsLabel = props.formatOptions?.length === 1
    ? 'Formato único já adicionado'
    : 'Todos os formatos adicionados'

  return (
    <div className="format-configurator">
      {/* TOP TRAY: SELECTED FORMATS */}
      <aside className="format-configurator__sidebar">
        <div className="format-configurator__sidebar-header">
          <div className="format-configurator__sidebar-title">
            <div>
              <h3>Formatos selecionados</h3>
              <span className="format-configurator__counter-pill">
                {props.configuredFormats.length}
              </span>
            </div>
            <p>Escolha uma peça para configurar os detalhes.</p>
          </div>
          {hasFormatsToAdd ? (
            <button
              type="button"
              className="format-configurator__add-format-btn"
              onClick={props.onOpenAddModal}
            >
              <Plus size={16} /> Adicionar formato
            </button>
          ) : (
            <span className="format-configurator__formats-complete">{completedFormatsLabel}</span>
          )}
        </div>

        <div className="format-configurator__list">
          {props.configuredFormats.length === 0 ? (
            <div className="format-configurator__empty-sidebar">
              <p>A sua lista está vazia</p>
              <small>Adicione formatos para compor o seu pedido.</small>
            </div>
          ) : (
            props.configuredFormats.map((item) => {
              const isActive = activeFormat?.id === item.id
              return (
                <div
                  key={item.id}
                  className={`format-sidebar-item ${isActive ? 'is-active' : ''} ${item.isPrincipal ? 'is-principal' : ''}`}
                  onClick={() => props.onSelectFormat(item.id)}
                >
                  <div className="format-sidebar-item__icon">
                    <ChannelBadgeIcon channel={item.channel} size={20} />
                  </div>

                  <div className="format-sidebar-item__body">
                    <span className="format-sidebar-item__channel">{item.channel}</span>
                    <div className="format-sidebar-item__name-row">
                      <span className="format-sidebar-item__name">{item.formatName}</span>
                      {item.isPrincipal && (
                        <span className="format-sidebar-item__badge-principal">Principal</span>
                      )}
                    </div>
                    <span
                      className={`format-sidebar-item__dimension ${!item.dimension ? 'is-missing' : ''}`}
                    >
                      {item.dimension || 'Não definido'}
                    </span>
                  </div>

                  <div className="format-sidebar-item__actions">
                    {isActive ? (
                      <span className="format-sidebar-item__edit-indicator" title="Em edição">
                        <Pencil size={15} />
                      </span>
                    ) : !item.isPrincipal ? (
                      <button
                        type="button"
                        className="format-sidebar-item__remove-btn"
                        title="Remover formato"
                        onClick={(e) => {
                          e.stopPropagation()
                          props.onRemoveFormat(item.id)
                        }}
                      >
                        <X size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* FULL-WIDTH CONFIGURATION OF ACTIVE FORMAT */}
      <section className="format-configurator__content">
        {props.configuredFormats.length === 0 || !activeFormat ? (
          <div className="format-configurator__empty-content">
            <div className="format-empty-illustration">
              <ChannelBadgeIcon channel="Instagram" size={32} />
              <ChannelBadgeIcon channel="Facebook" size={32} />
              <ChannelBadgeIcon channel="LinkedIn" size={32} />
              <ChannelBadgeIcon channel="WhatsApp" size={32} />
            </div>
            <h2>Nada por aqui...</h2>
            <p>
              Clique em <strong>“+ Adicionar”</strong> para incluir os Formatos que você quer criar.
              Se tiver alguma dúvida, basta selecionar os formatos recomendados para as suas redes.
            </p>
            <button
              type="button"
              className="format-configurator__cta-btn"
              onClick={props.onOpenAddModal}
            >
              <Plus size={18} /> Adicionar primeiro formato
            </button>
          </div>
        ) : (
          <div className="format-configurator__editor">
            {/* 1. PRINCIPAL PIECE NOTICE */}
            {activeFormat.isPrincipal && (
              <div className="format-principal-banner">
                <div className="format-principal-banner__icon">
                  <AlertCircle size={20} />
                </div>
                <div className="format-principal-banner__text">
                  <strong>Essa é a peça principal do seu pedido</strong>
                  <p>
                    As informações desta peça serão refletidas nas peças adicionais. Você pode alterar detalhes
                    individualmente em cada peça.
                  </p>
                </div>
              </div>
            )}

            {/* 2. ADICIONAIS ACCORDION */}
            {availableAddons.length > 0 && <div className="format-config-section format-addons-section">
              <header
                className="format-config-section__header"
                onClick={() => setAddonsOpen(!addonsOpen)}
              >
                <div className="format-config-section__title-row">
                  <Sparkles size={18} className="format-config-section__icon" />
                  <h4>Adicionais</h4>
                  {!canConfigureAddons && (
                    <span className="format-addons-inherited-badge">
                      <LockKeyhole size={12} /> Herdado da peça principal
                    </span>
                  )}
                </div>
                <button type="button" className="format-accordion-toggle" aria-label="Expandir ou recolher">
                  {addonsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </header>

              {addonsOpen && (
                <div className="format-addons-list">
                  {!canConfigureAddons && (
                    <div className="format-addons-inherited-note">
                      <LockKeyhole size={15} />
                      <span>Esta peça acompanha os adicionais definidos no formato principal.</span>
                    </div>
                  )}

                  {visibleAddons.length > 0 ? (
                    visibleAddons.map((addon) => {
                      const isChecked = Boolean(props.addons[addon.code] && props.addons[addon.code] > 0)
                      return (
                        <label
                          key={addon.code}
                          className={`format-addon-card ${isChecked ? 'is-checked' : ''} ${!canConfigureAddons ? 'is-locked' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!canConfigureAddons}
                            onChange={() => canConfigureAddons && props.onToggleAddon(addon.code)}
                          />
                          <div className="format-addon-card__info">
                            <span className="format-addon-card__title">{addon.name}</span>
                            {addon.description && (
                              <small className="format-addon-card__desc">{addon.description}</small>
                            )}
                          </div>
                          <span className="format-addon-card__badge">
                            {canConfigureAddons
                              ? `+${addon.credits} crédito${addon.credits > 1 ? 's' : ''}`
                              : 'Incluído'}
                          </span>
                        </label>
                      )
                    })
                  ) : (
                    <div className="format-addons-empty-state">
                      Nenhum adicional foi selecionado na peça principal.
                    </div>
                  )}
                </div>
              )}
            </div>}

            {/* 3. CHANNEL SPECIFIC PROPORTIONS */}
            <div className="format-config-section">
              <div className="format-channel-heading">
                <ChannelBadgeIcon channel={activeFormat.channel} size={22} />
                <h3>{activeFormat.channel} — {activeFormat.formatName}</h3>
              </div>

              <div className="format-field-group">
                <label className="format-field-label">Tamanho e proporção</label>
                <div className="format-select-wrapper">
                  <button
                    type="button"
                    className="format-proportion-trigger"
                    onClick={() => setProportionsDropdownOpen(!proportionsDropdownOpen)}
                  >
                    <div className="format-proportion-trigger__value">
                      <Smartphone size={18} />
                      <span>
                        {activeFormat.dimension
                          ? `${activeFormat.proportionLabel || 'Retrato'} — ${activeFormat.dimension}`
                          : 'Selecionar proporção'}
                      </span>
                    </div>
                    <ChevronDown size={18} />
                  </button>

                  {proportionsDropdownOpen && (
                    <div className="format-proportion-dropdown">
                      {availableProportions.map((prop) => {
                        const isCurrent = activeFormat.dimension === prop.dimension
                        return (
                          <button
                            type="button"
                            key={prop.id}
                            className={`format-proportion-option ${isCurrent ? 'is-selected' : ''}`}
                            onClick={() => handleSelectProportion(prop)}
                          >
                            <div className="format-proportion-option__left">
                              {prop.icon === 'desktop' ? (
                                <Monitor size={18} />
                              ) : prop.icon === 'square' ? (
                                <Square size={18} />
                              ) : prop.icon === 'banner' ? (
                                <Maximize2 size={18} />
                              ) : (
                                <Smartphone size={18} />
                              )}
                              <div>
                                <strong>{prop.label}</strong>
                                <span>{prop.dimension}</span>
                              </div>
                            </div>
                            {isCurrent && <Check size={16} className="format-proportion-option__check" />}
                          </button>
                        )
                      })}

                      <div className="format-proportion-dropdown__custom">
                        {!showCustomDimensionRow ? (
                          <button
                            type="button"
                            className="format-proportion-custom-trigger"
                            onClick={() => setShowCustomDimensionRow(true)}
                          >
                            <Plus size={16} /> Outro tamanho personalizado
                          </button>
                        ) : (
                          <div className="format-proportion-custom-form">
                            <input
                              type="text"
                              value={customDimensionInput}
                              onChange={(e) => setCustomDimensionInput(e.target.value)}
                              placeholder="Ex.: 1920 × 480 px"
                              autoFocus
                            />
                            <button
                              type="button"
                              className="apply-btn"
                              disabled={!customDimensionInput.trim()}
                              onClick={handleApplyCustomDimension}
                            >
                              Aplicar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. EXCLUSIVE DIRECTION TOGGLE / TEXTAREA */}
              <div className="format-exclusive-direction-box">
                {!showExclusiveDirection && !activeFormat.exclusiveDirection ? (
                  <button
                    type="button"
                    className="format-exclusive-trigger-btn"
                    onClick={() => setShowExclusiveDirection(true)}
                  >
                    <span>Inserir direcionamento exclusivo para esse formato</span>
                    <Plus size={18} />
                  </button>
                ) : (
                  <div className="format-exclusive-field">
                    <div className="format-exclusive-field__header">
                      <label>Direcionamento exclusivo para {activeFormat.formatName}</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExclusiveDirection(false)
                          props.onUpdateFormat(activeFormat.id, { exclusiveDirection: '' })
                        }}
                        aria-label="Remover direcionamento exclusivo"
                      >
                        <Trash2 size={15} /> Remover
                      </button>
                    </div>
                    <textarea
                      value={activeFormat.exclusiveDirection || ''}
                      onChange={(e) =>
                        props.onUpdateFormat(activeFormat.id, { exclusiveDirection: e.target.value })
                      }
                      placeholder="Descreva detalhes específicos apenas para este formato (ex.: enquadramento diferente, corte de texto, etc.)..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>

            {props.deliveryContent}

            {/* 5. DELIVERY FILES (SOFTWARE & EXTENSION) */}
            <div className="format-config-section">
              <h4 className="format-config-section__title">Arquivos de entrega</h4>

              <div className="format-delivery-files-grid">
                {/* Software utilizado */}
                <div className="format-file-card">
                  <div className="format-file-card__content">
                    <span className="format-file-card__label">Software utilizado</span>
                    <div className="format-file-card__value-row">
                      <strong className="format-file-card__name">
                        {activeFormat.software || 'A definir'}
                      </strong>
                      {activeFormat.software && activeFormat.software !== 'A definir' && (
                        <span className="format-file-card__badge">Recomendado Allyo</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="format-file-card__edit-btn"
                    onClick={() => setEditingSoftware(!editingSoftware)}
                    title="Alterar software"
                  >
                    <Pencil size={16} />
                  </button>
                </div>

                {editingSoftware && (
                  <div className="format-file-selector-row">
                    {editableFormatsList.map((sw) => (
                      <button
                        type="button"
                        key={sw}
                        className={`format-file-pill ${activeFormat.software === sw ? 'is-active' : ''}`}
                        onClick={() => {
                          props.onUpdateFormat(activeFormat.id, { software: sw })
                          props.onSelectEditableFormat(sw)
                          setEditingSoftware(false)
                        }}
                      >
                        {sw}
                      </button>
                    ))}
                  </div>
                )}

                {/* Extensão do arquivo */}
                <div className="format-file-card">
                  <div className="format-file-card__content">
                    <span className="format-file-card__label">Extensão do arquivo</span>
                    <div className="format-file-card__value-row">
                      <strong className="format-file-card__name">
                        {activeFormat.extension || 'A definir'}
                      </strong>
                      {activeFormat.extension && activeFormat.extension !== 'A definir' && (
                        <span className="format-file-card__badge">Recomendado Allyo</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="format-file-card__edit-btn"
                    onClick={() => setEditingExtension(!editingExtension)}
                    title="Alterar extensão"
                  >
                    <Pencil size={16} />
                  </button>
                </div>

                {editingExtension && (
                  <div className="format-file-selector-row">
                    {finalFormatsList.map((ext) => (
                      <button
                        type="button"
                        key={ext}
                        className={`format-file-pill ${activeFormat.extension === ext ? 'is-active' : ''}`}
                        onClick={() => {
                          props.onUpdateFormat(activeFormat.id, { extension: ext })
                          props.onSelectFinalFormat(ext)
                          setEditingExtension(false)
                        }}
                      >
                        {ext}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
