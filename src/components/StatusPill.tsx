import type { ProjectStatus } from '../types'

export function StatusPill({ status }: { status: ProjectStatus }) {
  const slug = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s/g, '-')
  return <span className={`status-pill status-pill--${slug}`}><i />{status}</span>
}
