import type { CatalogProduct } from '../../services/api'
import { CHANNEL_FORMATS } from './channelData'
import type { ChannelFormatOption, FormatProportion } from './formatTypes'

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR')

const optionKey = (value: string) => normalize(value).replace(/(.)\1+/g, '$1')

function uniqueCatalogValues(values: string[]) {
  const unique = new Map<string, string>()
  values.map((value) => value.trim()).forEach((value) => {
    if (!value) return
    const key = optionKey(value)
    const current = unique.get(key)
    if (!current || value.length > current.length) unique.set(key, value)
  })
  return Array.from(unique.values())
}

function slug(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const channelDimensions: Record<string, Record<string, string>> = {
  instagram: {
    retrato: '1080 × 1350px', quadrado: '1080 × 1080px', paisagem: '1080 × 566px',
    stories: '1080 × 1920px', vertical: '1080 × 1920px',
  },
  linkedin: {
    retrato: '1080 × 1350px', quadrado: '1200 × 1200px', paisagem: '1200 × 628px',
    horizontal: '1200 × 628px', stories: '1080 × 1920px', vertical: '1080 × 1920px',
  },
  pinterest: {
    retrato: '1000 × 1500px', quadrado: '1000 × 1000px', paisagem: '1000 × 667px',
    stories: '1080 × 1920px', vertical: '1000 × 1500px',
  },
  tiktok: {
    retrato: '1080 × 1920px', quadrado: '1080 × 1080px', paisagem: '1920 × 1080px',
    stories: '1080 × 1920px', vertical: '1080 × 1920px',
  },
}

const genericDimensions: Record<string, string> = {
  retrato: '1080 × 1350px', quadrado: '1080 × 1080px', paisagem: '1200 × 628px',
  horizontal: '1200 × 628px', stories: '1080 × 1920px', vertical: '1080 × 1920px',
}

const preferredProportionByChannel: Record<string, string[]> = {
  instagram: ['retrato', 'quadrado'],
  linkedin: ['paisagem', 'horizontal', 'quadrado'],
  pinterest: ['retrato', 'vertical'],
  tiktok: ['stories', 'vertical', 'retrato'],
}

function iconFor(label: string, dimension: string): FormatProportion['icon'] {
  const normalizedLabel = normalize(label)
  if (/quadrado/.test(normalizedLabel)) return 'square'
  if (/paisagem|horizontal|banner/.test(normalizedLabel)) return 'banner'
  const match = dimension.match(/(\d+)\D+(\d+)/)
  if (match && Number(match[1]) > Number(match[2]) * 1.25) return 'banner'
  return 'phone'
}

function catalogProportion(value: string, channel: string, index: number): FormatProportion {
  const dimensionMatch = value.match(/(\d{2,5})\s*[x×]\s*(\d{2,5})\s*(?:px)?/i)
  const explicitDimension = dimensionMatch ? `${dimensionMatch[1]} × ${dimensionMatch[2]}px` : ''
  const cleanLabel = value
    .replace(/(\d{2,5})\s*[x×]\s*(\d{2,5})\s*(?:px)?/i, '')
    .replace(/^[\s|:—–-]+|[\s|:—–-]+$/g, '')
  const label = cleanLabel || (explicitDimension ? 'Personalizado' : value)
  const labelKey = normalize(label).replace(/\s*\([^)]*\)\s*/g, '').trim()
  const dimension = explicitDimension
    || channelDimensions[normalize(channel)]?.[labelKey]
    || genericDimensions[labelKey]
    || value

  return {
    id: `${slug(channel)}-${slug(label || value)}-${index}`,
    label,
    dimension,
    icon: iconFor(label, dimension),
  }
}

function scopedFormat(value: string, channels: string[]) {
  const separator = value.indexOf(':')
  if (separator < 0) return { name: value, channel: null }
  const possibleChannel = value.slice(0, separator).trim()
  const channel = channels.find((item) => normalize(item) === normalize(possibleChannel))
  return channel
    ? { name: value.slice(separator + 1).trim(), channel }
    : { name: value, channel: null }
}

/**
 * Builds the format picker entirely from the product fields managed by Manyspace.
 * Known social formats reuse the platform presets; new names are generated from
 * channels + available formats + sizesAndRatios without requiring frontend code.
 */
export function buildCatalogFormatOptions(product: CatalogProduct): ChannelFormatOption[] {
  const channels = uniqueCatalogValues(product.formats.channels)
  if (channels.length === 0) return []

  const availableValues = uniqueCatalogValues(
    product.formats.available.length > 0 ? product.formats.available : [product.name]
  )
  const entries = availableValues.map((value) => scopedFormat(value, channels))
  const sizes = uniqueCatalogValues(product.formats.sizesAndRatios)
  const sizeEntries = sizes.map((value) => scopedFormat(value, channels))

  const knownMatches = CHANNEL_FORMATS.filter((definition) =>
    channels.some((channel) => normalize(channel) === normalize(definition.channel))
    && entries.some((entry) => !entry.channel && optionKey(entry.name) === optionKey(definition.name))
  )

  const generatedEntries = entries.filter((entry) => {
    if (entry.channel) return true
    const hasKnownDefinition = CHANNEL_FORMATS.some((definition) => optionKey(definition.name) === optionKey(entry.name))
    return !hasKnownDefinition && (knownMatches.length === 0 || entries.length <= 5)
  })

  const generated = generatedEntries.flatMap((entry) => {
    const targetChannels = entry.channel ? [entry.channel] : channels
    return targetChannels.map((channel) => {
      const channelSizes = sizeEntries
        .filter((size) => !size.channel || normalize(size.channel) === normalize(channel))
        .map((size) => size.name)
      const proportions = (channelSizes.length > 0 ? channelSizes : ['Retrato']).map((value, index) =>
        catalogProportion(value, channel, index)
      )
      const preferences = preferredProportionByChannel[normalize(channel)] || []
      const defaultProportion = preferences
        .map((preferred) => proportions.find((proportion) => normalize(proportion.label) === preferred))
        .find(Boolean) || proportions[0]
      return {
        id: `${slug(channel)}-${slug(entry.name)}`,
        channel,
        name: entry.name,
        description: `${entry.name} para ${channel}.`,
        mockupType: (/carrossel|carousel/.test(normalize(entry.name)) || proportions.length > 1)
          ? 'grid' as const
          : defaultProportion.icon === 'banner' ? 'cover' as const
            : defaultProportion.icon === 'square' ? 'square' as const : 'phone' as const,
        defaultProportion,
        proportions,
      }
    })
  })

  return [...knownMatches, ...generated].filter((option, index, all) =>
    all.findIndex((candidate) => candidate.id === option.id) === index
  )
}
