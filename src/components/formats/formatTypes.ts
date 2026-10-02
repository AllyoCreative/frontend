export interface FormatProportion {
  id: string
  label: string // 'Retrato', 'Quadrado', 'Paisagem', 'Stories', etc.
  dimension: string // '1080 × 1350px'
  ratio?: string
  icon?: 'phone' | 'desktop' | 'square' | 'banner'
}

export interface ChannelFormatOption {
  id: string
  channel: string // 'Instagram', 'Facebook', 'WhatsApp', 'LinkedIn', 'Google', 'YouTube', 'TikTok', 'Pinterest', 'X (twitter)', 'Other'
  name: string // 'Post', 'Stories', 'Capa de grupo', etc.
  description?: string
  mockupType: 'phone' | 'desktop' | 'grid' | 'cover' | 'square'
  defaultProportion: FormatProportion
  proportions: FormatProportion[]
}

export interface ConfiguredFormatItem {
  id: string
  channel: string
  formatName: string
  dimension: string
  proportionLabel: string
  isPrincipal: boolean
  exclusiveDirection: string
  software: string
  extension: string
  customDimension?: string
}

export interface AddonOption {
  code: string
  name: string
  credits: number
  description?: string
  checked: boolean
}
