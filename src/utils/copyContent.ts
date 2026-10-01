const fieldLabels: Record<string, string> = {
  headline: 'Título',
  body: 'Texto',
  cta: 'CTA',
  hashtags: 'Hashtags',
  notes: 'Orientações complementares',
}

export type CopyField = { key: string; label: string; text: string }

export function parseCopyContent(value?: string | null) {
  const source = value?.trim() || ''
  if (!source.includes('data-allyo-field') || typeof DOMParser === 'undefined') {
    return { plainText: source, fields: [] as CopyField[], wordCount: source ? source.split(/\s+/).length : 0 }
  }

  const document = new DOMParser().parseFromString(source, 'text/html')
  const fields = Array.from(document.querySelectorAll<HTMLElement>('[data-allyo-field]')).map((node) => {
    const key = node.dataset.allyoField || 'content'
    let text = (node.textContent || '').replace(/\s+/g, ' ').trim()
    if (key === 'notes') text = text.replace(/^Orientações complementares\s*/i, '')
    return { key, label: fieldLabels[key] || 'Conteúdo', text }
  }).filter((field) => field.text)
  const plainText = fields.map((field) => field.text).join('\n\n')
  return { plainText, fields, wordCount: plainText ? plainText.split(/\s+/).length : 0 }
}
