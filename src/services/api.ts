import type { Project, ProjectTask, TaskBriefing } from '../types'

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
  phone?: string
  timezone?: string
  avatarUrl?: string | null
  avatarFileKey?: string | null
  notificationPreferences?: Record<string, Record<string, boolean>>
}

export type ProfileUpdate = Partial<UserSummary> & { newPassword?: string }

export interface WorkspaceSummary {
  id: string
  name: string
  plan?: string
  credits?: number
  hoursEstimated?: number
  hoursUsed?: number
  productAccess?: Record<string, unknown>
}

export interface ManagedBrandSummary {
  id: string
  name: string
  description: string
  color: string
  initials: string
}

export interface TeamSummary {
  id: string
  name: string
  color: string
  creditsUsed: number
  memberIds: string[]
  members: UserSummary[]
}

export interface ContractSummary {
  id: string
  title: string
  plan: string
  amountCents: number
  startsAt: string
  endsAt: string | null
  status: string
  changeType: string
  documentUrl: string | null
}

export interface CreditTransactionSummary {
  id: string
  description: string
  type: string
  status: string
  amount: number
  createdAt: string
}

export interface CreditPackageSummary {
  id: string
  name: string
  credits: number
  priceCents: number
  bonusPercent: number
  recommended: boolean
}

export interface AccountOverview {
  workspace: {
    id: string
    name: string
    plan: string
    creditsAvailable: number
    creditAllowance: number
    creditBank: number
    creditsUsed: number
    boosters: number
    cycleStart: string | null
    cycleEnd: string | null
    contractStart: string | null
    contractEnd: string | null
  }
  members: UserSummary[]
  brands: ManagedBrandSummary[]
  teams: TeamSummary[]
  contracts: ContractSummary[]
  creditTransactions: CreditTransactionSummary[]
  creditPackages: CreditPackageSummary[]
}

export interface DesignSummary {
  id: number
  name: string
  version: string
  color: string
  approved: boolean
  fileUrl?: string
  thumbnailUrl?: string
  createdAt?: string
  updatedAt?: string
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
    contentType?: string
    sizeBytes?: number
  }>
}

export interface UploadedFile {
  fileKey: string
  readUrl: string
  sizeBytes: number
  contentType: string
  etag: string | null
}

export interface ProjectFileSummary {
  id: string
  projectId: string
  name: string
  fileKey: string
  fileUrl: string
  contentType: string
  sizeBytes: number
  category: 'arquivo' | 'design' | 'briefing'
  uploadedBy: string
  createdAt: string
}

export interface CatalogAddonRule {
  name: string
  step?: number
  unit?: string
  credits?: number
  additionalCredits?: number
  included?: number
  deliveryLimit?: string
}

export interface CatalogAddon {
  code: string
  name: string
  credits: number
  billable: boolean
  rule: CatalogAddonRule | null
}

export interface CatalogProduct {
  code: string
  name: string
  description: string
  category: string
  subcategory: string | null
  specialistRole: string
  slaHours: number
  deliveryQuantity: number | null
  billing: {
    label: string | null
    ruleKey: string | null
    unit: string
    step: number
    includedGroups: number
    includedQuantity: number
    countablePieces: boolean
    maxQuantity: number | null
    unitNote: string | null
    wordsPerUnit: number | null
    characterCredits: number | null
  }
  credits: {
    original: number
    additional: number | null
    resize: number | null
    variation: number | null
    additionalAllowed: boolean
    resizeAllowed: boolean
    variationAllowed: boolean
  }
  formats: {
    editable: string[]
    final: string[]
    available: string[]
    sizesAndRatios: string[]
    channels: string[]
  }
  addons: CatalogAddon[]
  relatedOptions: string[]
  version: number
}

export interface CatalogScope {
  quantity: number
  taskRepeats: number
  resizeCount: number
  variationCount: number
  characterCount: number
  addons: Record<string, number>
}

export interface CatalogQuote {
  catalogCode: string
  productName: string
  scope: CatalogScope
  totalCredits: number
  slaHours: number
  breakdown: {
    base: number
    additional: number
    resize: number
    variation: number
    characters: number
    addons: number
    taskRepeats: number
    addonItems: Array<{ code: string; name: string; quantity: number; credits: number }>
  }
}

export interface ProjectBriefingInput {
  objective?: string
  audience?: string
  tone?: string
  overview?: string
  projectGoal?: string
  creativePath?: 'new-direction' | 'follow-references'
  referenceLinks?: string[]
  selectedFormats?: string[]
  catalogCode?: string
  catalogScope?: CatalogScope
}

export interface ProjectBriefingSummary {
  id: string
  projectId: string
  serviceId?: string | null
  catalogCode?: string | null
  catalogSnapshot: Record<string, unknown>
  scope: Partial<CatalogScope>
  objective: string
  audience?: string | null
  tone?: string | null
  overview?: string | null
  deliverables: string[]
  formats: string[]
  creativeDirection: string[]
  estimatedHours: number
  creditsConsumed: number
  creditsEstimated: number
  durationHours: number
  deliveryDate: string
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
    return request<Project & { briefing: ProjectBriefingSummary | null; designs: DesignSummary[]; tasksList: ProjectTask[] }>(`/projects/${id}`)
  },

  async createProject(data: Partial<Project> & ProjectBriefingInput): Promise<Project> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Catalog
  async getCatalog() {
    return request<{ schemaVersion: string; products: CatalogProduct[] }>('/catalog')
  },

  async quoteCatalogProduct(catalogCode: string, scope: CatalogScope) {
    return request<CatalogQuote>('/catalog/quote', {
      method: 'POST',
      body: JSON.stringify({ catalogCode, ...scope }),
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
  async getBrandKit(brandId?: string): Promise<BrandKitFolder[]> {
    const query = brandId ? `?brandId=${encodeURIComponent(brandId)}` : ''
    return request<BrandKitFolder[]>(`/brand-kit${query}`)
  },

  async addBrandKitResource(data: {
    folderId: string
    name: string
    meta: string
    fileKey: string
    contentType: string
    sizeBytes: number
  }) {
    return request<BrandKitFolder['resources'][number]>('/brand-kit/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Storage
  async uploadFile(file: File, folder: 'designs' | 'brand-kit' | 'briefings' | 'project-files' | 'avatars'): Promise<UploadedFile> {
    const ticket = await request<{ uploadUrl: string; fileKey: string; expiresIn: number }>('/storage/presigned-url', {
      method: 'POST',
      body: JSON.stringify({
        folder,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      }),
    })

    const upload = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })
    if (!upload.ok) throw new Error(`Falha ao enviar arquivo para o R2 (HTTP ${upload.status})`)

    return request<UploadedFile>('/storage/confirm', {
      method: 'POST',
      body: JSON.stringify({ fileKey: ticket.fileKey }),
    })
  },

  async getProjectFiles(projectId: string) {
    return request<ProjectFileSummary[]>(`/projects/${projectId}/files`)
  },

  async addProjectFile(projectId: string, data: {
    name: string
    fileKey: string
    contentType: string
    sizeBytes: number
    category?: ProjectFileSummary['category']
  }) {
    return request<ProjectFileSummary>(`/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
  async updateMe(data: ProfileUpdate) {
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

  // Account
  async getAccount(): Promise<AccountOverview> {
    return request<AccountOverview>('/account/overview')
  },

  async createBrand(data: { name: string; description: string; color: string }) {
    return request<ManagedBrandSummary>('/account/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async createTeam(data: { name: string; color: string }) {
    return request<TeamSummary>('/account/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateTeamMembers(teamId: string, memberIds: string[]) {
    return request<TeamSummary>(`/account/teams/${teamId}/members`, {
      method: 'PUT',
      body: JSON.stringify({ memberIds }),
    })
  },

  async purchaseCredits(packageId: string) {
    return request<{ creditsAvailable: number; transaction: CreditTransactionSummary }>('/account/credits/purchase', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    })
  },

  // Tasks
  async createTask(projectId: string, data: { title: string; team?: string; deadlineDays?: number }) {
    return request<ProjectTask>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateTask(projectId: string, taskId: string, data: { status?: string; delivery?: string; title?: string; briefing?: TaskBriefing }) {
    return request<ProjectTask>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}
