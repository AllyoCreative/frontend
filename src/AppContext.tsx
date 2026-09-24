import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Project } from './types'
import { api, type AccountOverview, type ManagedBrandSummary, type ProfileUpdate, type ProjectBriefingInput, type UserSummary, type WorkspaceSummary, clearAuthToken } from './services/api'
import { socket, type SocketEventPayload } from './services/socket'

interface Toast {
  message: string
  id: number
}

export interface AppTask {
  id: string
  projectId: string
  title: string
  team: string
  status: 'Concluído' | 'Em andamento'
  delivery?: 'Aprovado' | 'Aguardando aprovação'
  deadlineDays?: number
}

export type ProjectWithTasks = Project & { tasksList?: AppTask[] }

export type ManagedBrand = ManagedBrandSummary

interface AppContextValue {
  projects: Project[]
  addProject: (project: Partial<Project> & ProjectBriefingInput) => Promise<Project>
  toast: Toast | null
  notify: (message: string) => void
  currentUser: UserSummary | null
  workspace: WorkspaceSummary | null
  members: UserSummary[]
  brands: ManagedBrand[]
  account: AccountOverview | null
  isLoading: boolean
  refreshUser: () => Promise<void>
  refreshProjects: () => Promise<void>
  refreshAccount: () => Promise<void>
  updateProfile: (data: ProfileUpdate) => Promise<void>
  addMember: (data: { name: string; email: string; jobTitle?: string }) => Promise<void>
  addBrand: (data: Pick<ManagedBrand, 'name' | 'description' | 'color'>) => Promise<void>
  createTask: (projectId: string, title: string, team?: string) => Promise<void>
  toggleTaskStatus: (projectId: string, taskId: string, currentStatus: string) => Promise<void>
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children, onLogout }: { children: ReactNode; onLogout?: () => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [toast, setToast] = useState<Toast | null>(null)
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [members, setMembers] = useState<UserSummary[]>([])
  const [brands, setBrands] = useState<ManagedBrand[]>([])
  const [account, setAccount] = useState<AccountOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const notify = useCallback((message: string) => {
    const next = { message, id: Date.now() }
    setToast(next)
    window.setTimeout(() => setToast((current) => current?.id === next.id ? null : current), 3200)
  }, [])

  const logout = useCallback(() => {
    clearAuthToken()
    setCurrentUser(null)
    if (onLogout) {
      onLogout()
    } else {
      window.location.reload()
    }
  }, [onLogout])

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe()
      if (data?.user) {
        setCurrentUser(data.user)
      }
      if (data?.workspace) {
        setWorkspace(data.workspace)
      }
      const memberList = await api.getMembers()
      if (memberList) {
        setMembers(memberList)
      }
    } catch {
      logout()
    }
  }, [logout])

  const refreshProjects = useCallback(async () => {
    try {
      const serverProjects = await api.getProjects()
      setProjects(serverProjects || [])
    } catch {
      // Offline
    }
  }, [])

  const refreshAccount = useCallback(async () => {
    try {
      const data = await api.getAccount()
      setAccount(data)
      setBrands(data.brands)
      setMembers(data.members)
      setWorkspace((current) => current ? {
        ...current,
        plan: data.workspace.plan,
        credits: data.workspace.creditsAvailable,
      } : current)
    } catch (error) {
      console.warn('Não foi possível carregar os dados da conta:', error)
    }
  }, [])

  // Carrega projetos e usuário reais do backend
  useEffect(() => {
    let isMounted = true

    Promise.allSettled([
      api.getProjects(),
      api.getMe(),
      api.getMembers(),
      api.getAccount(),
    ]).then(([projectsResult, meResult, membersResult, accountResult]) => {
      if (!isMounted) return

      if (projectsResult.status === 'fulfilled' && projectsResult.value) {
        setProjects(projectsResult.value)
      }

      if (meResult.status === 'fulfilled' && meResult.value) {
        if (meResult.value.user) setCurrentUser(meResult.value.user)
        if (meResult.value.workspace) setWorkspace(meResult.value.workspace)
      } else if (meResult.status === 'rejected') {
        console.warn('Sessão expirada ou não encontrada no servidor:', meResult.reason)
        logout()
      }

      if (membersResult.status === 'fulfilled' && membersResult.value) {
        setMembers(membersResult.value)
      }

      if (accountResult.status === 'fulfilled' && accountResult.value) {
        setAccount(accountResult.value)
        setBrands(accountResult.value.brands)
        setMembers(accountResult.value.members)
      }

      setIsLoading(false)
    })
      .catch(() => {
        setIsLoading(false)
      })

    // Conecta WebSocket para atualizações em tempo real do ManySpace
    socket.connect()

    const handleStatusUpdate = (event: SocketEventPayload) => {
      if (event.projectId && event.data) {
        const updateData = event.data as Partial<Project>
        setProjects((current) =>
          current.map((p) =>
            p.id === event.projectId ? { ...p, ...updateData } : p
          )
        )
        notify('Status do projeto atualizado pelo time operacional')
      }
    }

    const handleTeamAssigned = (event: SocketEventPayload) => {
      if (event.projectId && Array.isArray(event.data?.team)) {
        const team = event.data.team as string[]
        setProjects((current) =>
          current.map((p) =>
            p.id === event.projectId ? { ...p, team } : p
          )
        )
      }
    }

    socket.on('STATUS_UPDATED', handleStatusUpdate)
    socket.on('TEAM_ASSIGNED', handleTeamAssigned)

    return () => {
      isMounted = false
      socket.off('STATUS_UPDATED', handleStatusUpdate)
      socket.off('TEAM_ASSIGNED', handleTeamAssigned)
    }
  }, [notify, logout])

  const addProject = useCallback(async (projectData: Partial<Project> & ProjectBriefingInput) => {
    try {
      const created = await api.createProject(projectData)
      setProjects((current) => [created, ...current])
      notify('Projeto criado com sucesso!')
      return created
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível criar o projeto')
      throw error
    }
  }, [notify])

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    try {
      const res = await api.updateMe(data)
      if (res.user) {
        setCurrentUser(res.user)
        notify('Perfil atualizado com sucesso no backend!')
      }
    } catch (error) {
      notify('Erro ao atualizar perfil')
      throw error
    }
  }, [notify])

  const addBrand = useCallback(async (data: Pick<ManagedBrand, 'name' | 'description' | 'color'>) => {
    try {
      const brand = await api.createBrand(data)
      setBrands((current) => [...current, brand])
      setAccount((current) => current ? { ...current, brands: [...current.brands, brand] } : current)
      notify(`${data.name} adicionada às marcas gerenciadas`)
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Erro ao criar marca')
      throw error
    }
  }, [notify])

  const addMember = useCallback(async (data: { name: string; email: string; jobTitle?: string }) => {
    try {
      const newMember = await api.addMember(data)
      setMembers((current) => [...current, newMember])
      setAccount((current) => current ? { ...current, members: [...current.members, newMember] } : current)
      notify(`Membro ${newMember.name} adicionado com sucesso!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar membro'
      notify(msg)
      throw err
    }
  }, [notify])

  const createTask = useCallback(async (projectId: string, title: string, team = 'Design team') => {
    try {
      const task = await api.createTask(projectId, { title, team })
      setProjects((current) =>
        current.map((p) => {
          if (p.id !== projectId) return p
          const existingTasks = (p as ProjectWithTasks).tasksList || []
          return {
            ...p,
            tasks: (p.tasks || 0) + 1,
            tasksList: [...existingTasks, task],
          }
        })
      )
      notify('Tarefa criada com sucesso!')
    } catch {
      notify('Erro ao criar tarefa')
    }
  }, [notify])

  const toggleTaskStatus = useCallback(async (projectId: string, taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Concluído' ? 'Em andamento' : 'Concluído'
    try {
      await api.updateTask(projectId, taskId, { status: nextStatus })
      setProjects((current) =>
        current.map((p) => {
          if (p.id !== projectId) return p
          const existingTasks = (p as ProjectWithTasks).tasksList || []
          return {
            ...p,
            tasksList: existingTasks.map((t) =>
              t.id === taskId ? { ...t, status: nextStatus } : t
            ),
          }
        })
      )
      notify(`Tarefa marcada como ${nextStatus}`)
    } catch {
      notify('Erro ao atualizar status da tarefa')
    }
  }, [notify])


  const value = useMemo(() => ({
    projects,
    addProject,
    toast,
    notify,
    currentUser,
    workspace,
    members,
    brands,
    account,
    isLoading,
    refreshUser,
    refreshProjects,
    refreshAccount,
    updateProfile,
    addMember,
    addBrand,
    createTask,
    toggleTaskStatus,
    logout,
  }), [
    projects,
    addProject,
    toast,
    notify,
    currentUser,
    workspace,
    members,
    brands,
    account,
    isLoading,
    refreshUser,
    refreshProjects,
    refreshAccount,
    updateProfile,
    addMember,
    addBrand,
    createTask,
    toggleTaskStatus,
    logout,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// This hook intentionally lives beside its provider to keep the demo state self-contained.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
