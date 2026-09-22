import type { Project } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export interface UserSummary {
  id: string
  name: string
  email: string
  role?: string
  avatarInitials?: string
  avatarColor?: string
  jobTitle?: string
  language?: string
}

export interface WorkspaceSummary {
  id: string
  name: string
  plan?: string
  credits?: number
  hoursEstimated?: number
  hoursUsed?: number
  productAccess?: Record<string, unknown>
}

export interface DesignSummary {
  id: number
  name: string
  version: string
  color: string
  approved: boolean
  fileUrl?: string
  thumbnailUrl?: string
}

export interface ReviewCommentItem {
  id: number
  author: string
  text: string
  time: string
  resolved: boolean
  version: number
  point?: { x: number; y: number }
  annotationId?: number
}

export interface BrandKitFolder {
  id: string
  name: string
  description: string
  count: string
  preview: string
  resources: Array<{
    id: string
    name: string
    meta: string
    tone?: string
    fileUrl?: string
  }>
}

export function getAuthToken(): string | null {
  return localStorage.getItem('allyo-auth-token')
}

export function setAuthToken(token: string) {
  localStorage.setItem('allyo-auth-token', token)
  localStorage.setItem('allyo-demo-auth', 'true')
}

export function clearAuthToken() {
  localStorage.removeItem('allyo-auth-token')
  localStorage.removeItem('allyo-demo-auth')
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Erro de comunicação com o servidor' }))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Auth
  async sendOtp(identity: string) {
    return request<{ success: boolean; message: string; debugCode?: string }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ identity }),
    })
  },

  async verifyOtp(identity: string, code: string) {
    const res = await request<{
      success: boolean
      token: string
      user: UserSummary
      workspace: WorkspaceSummary
    }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ identity, code }),
    })
    if (res.token) setAuthToken(res.token)
    return res
  },

  async demoSession() {
    const res = await request<{
      success: boolean
      token: string
      user: UserSummary
      workspace: WorkspaceSummary
    }>('/auth/demo-session', {
      method: 'POST',
    })
    if (res.token) setAuthToken(res.token)
    return res
  },

  async getMe() {
    return request<{ user: UserSummary; workspace: WorkspaceSummary }>('/auth/me')
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/projects')
  },

  async getProject(id: string) {
    return request<Project & { briefing: Record<string, unknown> | null; designs: DesignSummary[] }>(`/projects/${id}`)
  },

  async createProject(data: Partial<Project> & { objective?: string; audience?: string; tone?: string }): Promise<Project> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async toggleFavorite(id: string) {
    return request<{ id: string; favorite: boolean }>(`/projects/${id}/favorite`, {
      method: 'PATCH',
    })
  },

  // Messages
  async getMessages(projectId: string) {
    return request<Array<{
      id: number
      person: string
      role: string
      initials: string
      text: string
      time: string
      mine: boolean
    }>>(`/projects/${projectId}/messages`)
  },

  async sendMessage(projectId: string, text: string) {
    return request<{
      id: number
      person: string
      role: string
      initials: string
      text: string
      time: string
      mine: boolean
    }>(`/projects/${projectId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  },

  // Designs & Reviews
  async getDesigns(projectId: string) {
    return request<DesignSummary[]>(`/projects/${projectId}/designs`)
  },

  async getDesignReview(designId: number) {
    return request<{
      id: number
      name: string
      version: string
      approved: boolean
      comments: ReviewCommentItem[]
      annotations: Record<string, unknown>[]
    }>(`/designs/${designId}/review`)
  },

  async addComment(designId: number, data: { text: string; version: number; point?: { x: number; y: number } }) {
    return request<ReviewCommentItem>(`/designs/${designId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async setDesignApproval(designId: number, approved: boolean) {
    return request<{ success: boolean; id: number; approved: boolean }>(`/designs/${designId}/approval`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    })
  },

  // Brand Kit
  async getBrandKit(): Promise<BrandKitFolder[]> {
    return request<BrandKitFolder[]>('/brand-kit')
  },

  // Brand Brain
  async getBrandBrainStatus() {
    return request<{
      customerAccess: 'available' | 'unavailable'
      minimumHistoryMonths: number
      requiresAllyoRelease: boolean
    }>('/brand-brain/status')
  },

  async queryBrandBrain(question: string) {
    return request<{ question: string; answer: string; sourcesCount: number; confidence: string }>('/brand-brain/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
  },

  // Team & Profile
  async updateMe(data: Partial<UserSummary>) {
    return request<{ success: boolean; user: UserSummary }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  async getMembers(): Promise<UserSummary[]> {
    return request<UserSummary[]>('/auth/members')
  },

  async addMember(data: { name: string; email: string; jobTitle?: string; role?: string }) {
    return request<UserSummary>('/auth/members', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Tasks
  async createTask(projectId: string, data: { title: string; team?: string; deadlineDays?: number }) {
    return request<{
      id: string
      projectId: string
      title: string
      team: string
      status: 'Concluído' | 'Em andamento'
      delivery?: 'Aprovado' | 'Aguardando aprovação'
      deadlineDays: number
    }>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateTask(projectId: string, taskId: string, data: { status?: string; delivery?: string; title?: string }) {
    return request<{
      id: string
      projectId: string
      title: string
      team: string
      status: 'Concluído' | 'Em andamento'
      delivery?: 'Aprovado' | 'Aguardando aprovação'
    }>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}
