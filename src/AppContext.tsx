import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Project } from './types'
import { api, type UserSummary, type WorkspaceSummary, clearAuthToken } from './services/api'
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

interface AppContextValue {
  projects: Project[]
  addProject: (project: Partial<Project> & { objective?: string; audience?: string; tone?: string }) => Promise<Project>
  toast: Toast | null
  notify: (message: string) => void
  currentUser: UserSummary | null
  workspace: WorkspaceSummary | null
  members: UserSummary[]
  isLoading: boolean
  refreshUser: () => Promise<void>
  refreshProjects: () => Promise<void>
  updateProfile: (data: Partial<UserSummary>) => Promise<void>
  addMember: (data: { name: string; email: string; jobTitle?: string }) => Promise<void>
  createTask: (projectId: string, title: string, team?: string) => Promise<void>
  toggleTaskStatus: (projectId: string, taskId: string, currentStatus: string) => Promise<void>
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [toast, setToast] = useState<Toast | null>(null)
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [members, setMembers] = useState<UserSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const notify = useCallback((message: string) => {
    const next = { message, id: Date.now() }
    setToast(next)
    window.setTimeout(() => setToast((current) => current?.id === next.id ? null : current), 3200)
  }, [])

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
      // Offline / unauthenticated
    }
  }, [])

  const refreshProjects = useCallback(async () => {
    try {
      const serverProjects = await api.getProjects()
      setProjects(serverProjects || [])
    } catch {
      // Offline
    }
  }, [])

  // Carrega projetos e usuário reais do backend
  useEffect(() => {
    let isMounted = true

    Promise.allSettled([
      api.getProjects(),
      api.getMe(),
      api.getMembers(),
    ]).then(([projectsResult, meResult, membersResult]) => {
      if (!isMounted) return

      if (projectsResult.status === 'fulfilled' && projectsResult.value) {
        setProjects(projectsResult.value)
      }

      if (meResult.status === 'fulfilled' && meResult.value) {
        if (meResult.value.user) setCurrentUser(meResult.value.user)
        if (meResult.value.workspace) setWorkspace(meResult.value.workspace)
      }

      if (membersResult.status === 'fulfilled' && membersResult.value) {
        setMembers(membersResult.value)
      }

      setIsLoading(false)
    })
      .catch(() => {})

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
  }, [notify])

  const addProject = useCallback(async (projectData: Partial<Project> & { objective?: string; audience?: string; tone?: string }) => {
    try {
      const created = await api.createProject(projectData)
      setProjects((current) => [created, ...current])
      notify('Projeto criado com sucesso!')
      return created
    } catch (err) {
      console.warn('Could not sync project with backend:', err)
      const fallback: Project = {
        id: projectData.id || `proj-${Date.now()}`,
        name: projectData.name || 'Novo Projeto',
        service: projectData.service || 'Design',
        status: 'Rascunho',
        deadline: 'A definir',
        progress: 8,
        tasks: 0,
        unread: 0,
        accent: projectData.accent || '#d7ff70',
        team: ['LC'],
        description: projectData.description || '',
      }
      setProjects((current) => [fallback, ...current])
      notify('Projeto criado!')
      return fallback
    }
  }, [notify])

  const updateProfile = useCallback(async (data: Partial<UserSummary>) => {
    try {
      const res = await api.updateMe(data)
      if (res.user) {
        setCurrentUser(res.user)
        notify('Perfil atualizado com sucesso no backend!')
      }
    } catch {
      notify('Erro ao atualizar perfil')
    }
  }, [notify])

  const addMember = useCallback(async (data: { name: string; email: string; jobTitle?: string }) => {
    try {
      const newMember = await api.addMember(data)
      setMembers((current) => [...current, newMember])
      notify(`Membro ${newMember.name} adicionado com sucesso!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar membro'
      notify(msg)
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

  const logout = useCallback(() => {
    clearAuthToken()
    setCurrentUser(null)
    window.location.reload()
  }, [])

  const value = useMemo(() => ({
    projects,
    addProject,
    toast,
    notify,
    currentUser,
    workspace,
    members,
    isLoading,
    refreshUser,
    refreshProjects,
    updateProfile,
    addMember,
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
    isLoading,
    refreshUser,
    refreshProjects,
    updateProfile,
    addMember,
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
