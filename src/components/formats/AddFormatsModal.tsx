import { useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { ChannelBadgeIcon, FormatDeviceMockup } from './ChannelIcons'
import type { ChannelFormatOption, ConfiguredFormatItem } from './formatTypes'

interface AddFormatsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddFormat: (option: ChannelFormatOption) => void
  configuredFormats: ConfiguredFormatItem[]
  formatOptions: ChannelFormatOption[]
}

export function AddFormatsModal({ isOpen, onClose, onAddFormat, configuredFormats, formatOptions }: AddFormatsModalProps) {
  const channels = useMemo(() => [
    'Tudo',
    ...Array.from(new Set(formatOptions.map((option) => option.channel))),
  ], [formatOptions])
  const [activeChannel, setActiveChannel] = useState('Tudo')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const preferred = channels.find((channel) => channel === 'Instagram') || channels[1] || 'Tudo'
    setActiveChannel((current) => channels.includes(current) ? current : preferred)
  }, [channels, isOpen])

  const filteredFormats = useMemo(() => {
    let list = formatOptions
    if (activeChannel !== 'Tudo') {
      list = list.filter((item) => item.channel.toLowerCase() === activeChannel.toLowerCase())
    }
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.channel.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      )
    }
    return list
  }, [activeChannel, formatOptions, searchQuery])

  if (!isOpen) return null

  const getFormatCount = (formatName: string, channel: string) => {
    return configuredFormats.filter(
      (item) => item.formatName.toLowerCase() === formatName.toLowerCase() && item.channel.toLowerCase() === channel.toLowerCase()
    ).length
  }

  return (
    <div className="format-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="add-formats-title">
      <div className="format-modal-window">
        {/* Header */}
        <header className="format-modal-header">
          <div>
            <h2 id="add-formats-title" className="format-modal-title">Adicionar Formatos</h2>
            <p className="format-modal-subtitle">
              Você pode inserir quantos itens você achar necessário para compor a sua entrega.
            </p>
          </div>
          <button type="button" className="format-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        {/* Channels Tabs */}
        <div className="format-modal-tabs-bar">
          <span className="format-modal-tabs-label">FORMATOS</span>
          <div className="format-modal-tabs" role="tablist">
            {channels.map((channel) => {
              const isActive = activeChannel === channel
              return (
                <button
                  type="button"
                  key={channel}
                  role="tab"
                  aria-selected={isActive}
                  className={`format-tab-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveChannel(channel)}
                >
                  {channel !== 'Tudo' && <ChannelBadgeIcon channel={channel} size={16} />}
                  <span>{channel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="format-modal-search-row">
          <div className="format-modal-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar formato por nome..."
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpar busca">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Formats Grid */}
        <div className="format-modal-body">
          {filteredFormats.length === 0 ? (
            <div className="format-modal-empty">
              <p>Nenhum formato encontrado para “{searchQuery}”.</p>
            </div>
          ) : (
            <div className="format-cards-grid">
              {filteredFormats.map((option) => {
                const count = getFormatCount(option.name, option.channel)
                const alreadyAdded = count > 0
                return (
                  <div key={option.id} className="format-card-item">
                    <div className="format-card-mockup-area">
                      <FormatDeviceMockup type={option.mockupType} channel={option.channel} />
                    </div>

                    <div className="format-card-info">
                      <div className="format-card-title-row">
                        <ChannelBadgeIcon channel={option.channel} size={16} />
                        <strong className="format-card-name">{option.name}</strong>
                      </div>
                      <span className="format-card-prop-hint">
                        {option.defaultProportion.label} · {option.defaultProportion.dimension}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`format-card-add-btn ${alreadyAdded ? 'is-added' : ''}`}
                      disabled={alreadyAdded}
                      onClick={() => onAddFormat(option)}
                    >
                      {alreadyAdded ? (
                        <>
                          <Check size={16} /> Adicionado
                        </>
                      ) : (
                        '+ Adicionar'
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="format-modal-footer">
          <div className="format-modal-footer__summary">
            {configuredFormats.length > 0 ? (
              <span><strong>{configuredFormats.length}</strong> {configuredFormats.length === 1 ? 'formato selecionado' : 'formatos selecionados'}</span>
            ) : (
              <span>Nenhum formato selecionado ainda</span>
            )}
          </div>
          <button type="button" className="format-modal-confirm-btn" onClick={onClose}>
            <Check size={16} /> Confirmar
          </button>
        </footer>
      </div>
    </div>
  )
}
