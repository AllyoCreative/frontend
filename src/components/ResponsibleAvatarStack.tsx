import type { UserSummary } from '../services/api'
import { UserRound } from 'lucide-react'

const fallbackColors = ['#d0f08e', '#c2e3fd', '#ffd6a5', '#e5d4ff', '#bdebd9']

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function fallbackColorFor(name: string) {
  const hash = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0)
  return fallbackColors[hash % fallbackColors.length]
}

export function ResponsibleAvatarStack({
  names,
  members,
  limit = 4,
  size = 'medium',
  label = 'Equipe responsável',
  showEmpty = false,
}: {
  names: Array<string | null | undefined>
  members: UserSummary[]
  limit?: number
  size?: 'small' | 'medium'
  label?: string
  showEmpty?: boolean
}) {
  const uniqueNames = Array.from(new Set(names.map((name) => name?.trim()).filter((name): name is string => Boolean(name))))

  if (uniqueNames.length === 0) {
    if (!showEmpty) return null
    return <span className={`responsible-avatar-stack responsible-avatar-stack--${size}`} aria-label="Responsável a definir">
      <span className="responsible-avatar responsible-avatar--empty" title="Responsável a definir"><UserRound size={size === 'small' ? 12 : 14} /></span>
    </span>
  }

  const visibleNames = uniqueNames.slice(0, limit)
  return <span className={`responsible-avatar-stack responsible-avatar-stack--${size}`} aria-label={`${label}: ${uniqueNames.join(', ')}`}>
    {visibleNames.map((name) => {
      const normalizedName = name.toLocaleLowerCase('pt-BR')
      const member = members.find((candidate) => (
        candidate.name.toLocaleLowerCase('pt-BR') === normalizedName
        || candidate.avatarInitials?.toLocaleLowerCase('pt-BR') === normalizedName
      ))
      const displayName = member?.name || name
      const title = `${displayName}${member?.jobTitle ? ` · ${member.jobTitle}` : ''}`
      return <span className="responsible-avatar-item" key={name} tabIndex={0} aria-label={title}>
        <span
          className="responsible-avatar"
          style={{ backgroundColor: member?.avatarColor || fallbackColorFor(name) }}
        >
          {member?.avatarUrl
            ? <img src={member.avatarUrl} alt="" />
            : member?.avatarInitials || initialsFor(displayName)}
        </span>
        <span className="responsible-avatar-label">{displayName}{member?.jobTitle ? <small> · {member.jobTitle}</small> : null}</span>
      </span>
    })}
    {uniqueNames.length > limit && <span className="responsible-avatar-item"><span className="responsible-avatar responsible-avatar--more" title={uniqueNames.slice(limit).join(', ')}>+{uniqueNames.length - limit}</span></span>}
  </span>
}
