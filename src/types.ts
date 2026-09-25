export type ProjectStatus = 'Em andamento' | 'Em revisão' | 'Concluído' | 'Rascunho'

export interface ProjectTask {
  id: string
  projectId: string
  title: string
  team: string
  status: 'A iniciar' | 'Concluído' | 'Em andamento' | 'Em revisão'
  delivery?: 'Aprovado' | 'Aguardando aprovação'
  deadlineDays?: number
  orderIndex?: number
  createdAt?: string
  updatedAt?: string
}

export interface Project {
  id: string
  name: string
  service: string
  status: ProjectStatus
  deadline: string
  progress: number
  tasks: number
  unread: number
  accent: string
  team: string[]
  description: string
  favorite?: boolean
  tasksList?: ProjectTask[]
  createdAt?: string
  updatedAt?: string
}

export interface Service {
  id: string
  name: string
  category: 'Criação e Design' | 'Produção' | 'Estratégia'
  description: string
  fast?: boolean
  ai?: boolean
  accent: string
}

export interface Activity {
  id: number
  person: string
  initials: string
  action: string
  target: string
  time: string
  color: string
}
