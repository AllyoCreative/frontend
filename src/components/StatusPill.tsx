export type AllyoStatusTone = 'new' | 'active' | 'review' | 'pending' | 'blocked' | 'done' | 'disabled'

export function statusToneFor(status: string): AllyoStatusTone {
  const normalized = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
  if (/^(concluido|concluida|entregue|aprovado|aprovada|finalizada)$/.test(normalized)) return 'done'
  if (/^(em andamento|producao|liberada)$/.test(normalized)) return 'active'
  if (/^(em revisao|aguardando aprovacao|aprovacao externa|pronta para entrega)$/.test(normalized)) return 'review'
  if (/^(alteracao|em alteracao|pendente|pendencia|recusado|recusada)$/.test(normalized)) return 'pending'
  if (/^bloquead[ao]$/.test(normalized)) return 'blocked'
  if (/^(inativ[ao]|desativada)$/.test(normalized)) return 'disabled'
  return 'new'
}

export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  return <span className={`allyo-status-tag ${className}`} data-status-tone={statusToneFor(status)}><i />{status}</span>
}
