import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { AppProvider, GlobalToast } from './AppContext'
import { AppShell } from './components/AppShell'
import { Logo } from './components/Logo'
import { canAccessBrandBrain } from './config/productAccess'
import { LoginPage } from './pages/LoginPage'
import { api, clearAuthToken } from './services/api'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })))
const BrandKitPage = lazy(() => import('./pages/BrandKitPage').then((module) => ({ default: module.BrandKitPage })))
const BrandBrainPage = lazy(() => import('./pages/BrandBrainPage').then((module) => ({ default: module.BrandBrainPage })))
const NewProjectPage = lazy(() => import('./pages/NewProjectPage').then((module) => ({ default: module.NewProjectPage })))
const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))

const IMPERSONATION_STORAGE_KEY = 'allyo-impersonation'

interface ImpersonationContext {
  userName: string
  workspaceName: string
  startedAt: string
}

const readImpersonationContext = (): ImpersonationContext | null => {
  try {
    const stored = window.sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<ImpersonationContext>
    if (!parsed.userName || !parsed.workspaceName || !parsed.startedAt) return null
    return parsed as ImpersonationContext
  } catch {
    window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY)
    return null
  }
}

const impersonationCode = (() => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = hash.get('impersonation')
  if (code) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  return code
})()

let impersonationExchange: ReturnType<typeof api.consumeImpersonation> | null = null

const exchangeImpersonation = () => {
  if (!impersonationCode) return Promise.reject(new Error('Acesso temporário ausente'))
  impersonationExchange ||= api.consumeImpersonation(impersonationCode)
  return impersonationExchange
}

function LoadingScreen() {
  return <div className="loading-screen"><span /><p>Preparando seu espaço...</p></div>
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => !impersonationCode && Boolean(window.localStorage.getItem('allyo-auth-token')))
  const [isExchangingImpersonation, setIsExchangingImpersonation] = useState(Boolean(impersonationCode))
  const [impersonationError, setImpersonationError] = useState<string | null>(null)
  const [impersonation, setImpersonation] = useState<ImpersonationContext | null>(readImpersonationContext)
  const [revealingPlatform, setRevealingPlatform] = useState(false)
  const location = useLocation()
  const login = useCallback(() => {
    setRevealingPlatform(true)
    setAuthenticated(true)
  }, [])
  const logout = useCallback(() => {
    window.localStorage.removeItem('allyo-demo-auth')
    window.localStorage.removeItem('allyo-auth-token')
    window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY)
    setImpersonation(null)
    setRevealingPlatform(false)
    setAuthenticated(false)
  }, [])

  const endImpersonation = useCallback(() => {
    clearAuthToken()
    window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY)
    setImpersonation(null)
    setAuthenticated(false)
    window.close()
    window.setTimeout(() => window.location.replace('/'), 120)
  }, [])

  useEffect(() => {
    if (!impersonationCode) return
    let active = true
    exchangeImpersonation()
      .then((session) => {
        if (!active) return
        const context: ImpersonationContext = {
          userName: session.user.name,
          workspaceName: session.workspace.name,
          startedAt: new Date().toISOString(),
        }
        window.sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(context))
        setImpersonation(context)
        setAuthenticated(true)
      })
      .catch((error: unknown) => {
        if (active) setImpersonationError(error instanceof Error ? error.message : 'O acesso temporário não pôde ser validado.')
      })
      .finally(() => {
        if (active) setIsExchangingImpersonation(false)
      })
    return () => { active = false }
  }, [])

  if (isExchangingImpersonation) return <LoadingScreen />

  if (impersonationError) return (
    <div className="auth-page">
      <main className="auth-card" aria-live="polite">
        <Logo light />
        <section className="auth-content auth-content--identity auth-step-enter">
          <p style={{ color: '#ffffff', textAlign: 'center' }}>{impersonationError}</p>
          <button type="button" onClick={() => window.location.assign('/')} style={{ marginTop: 20 }}>
            Ir para o acesso normal
          </button>
        </section>
      </main>
    </div>
  )

  if (!authenticated) return <LoginPage onAuthenticated={login} />

  return <div className={impersonation ? 'impersonation-frame' : undefined}>
    {impersonation && (
      <header className="impersonation-frame__banner" aria-label="Sessão personificada">
        <span>Você está acessando como: <strong>{impersonation.workspaceName}</strong></span>
        <button type="button" onClick={endImpersonation} aria-label="Encerrar personificação" title="Encerrar personificação">
          <X size={14} strokeWidth={3} />
        </button>
      </header>
    )}
    <div className={impersonation ? 'impersonation-frame__surface' : undefined}>
      <div className={impersonation ? `impersonation-frame__app${location.pathname === '/novo-projeto' ? ' is-standalone' : ''}` : undefined}>
        <AppProvider onLogout={logout}>
          <Suspense fallback={<LoadingScreen />}>
            {location.pathname === '/novo-projeto' ? (
              <Routes>
                <Route path="/novo-projeto" element={<NewProjectPage />} />
                <Route path="*" element={<Navigate to="/novo-projeto" replace />} />
              </Routes>
            ) : (
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/projetos" element={<ProjectsPage />} />
                  <Route path="/projetos/:id" element={<ProjectDetailPage />} />
                  <Route path="/projetos/:id/:tab" element={<ProjectDetailPage />} />
                  <Route path="/brand-kit" element={<BrandKitPage />} />
                  {canAccessBrandBrain && <Route path="/brand-brain" element={<BrandBrainPage />} />}
                  <Route path="/conta" element={<AccountPage onLogout={logout} />} />
                  <Route path="/perfil" element={<ProfilePage />} />
                </Routes>
              </AppShell>
            )}
          </Suspense>
          <GlobalToast />
        </AppProvider>

        {revealingPlatform && (
          <div
            className="platform-reveal-curtain"
            aria-hidden="true"
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setRevealingPlatform(false)
            }}
          >
            <Logo />
          </div>
        )}
      </div>
    </div>
  </div>
}
