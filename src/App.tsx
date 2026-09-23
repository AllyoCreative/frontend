import { Suspense, lazy, useCallback, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider } from './AppContext'
import { AppShell } from './components/AppShell'
import { Logo } from './components/Logo'
import { canAccessBrandBrain } from './config/productAccess'
import { LoginPage } from './pages/LoginPage'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })))
const BrandKitPage = lazy(() => import('./pages/BrandKitPage').then((module) => ({ default: module.BrandKitPage })))
const BrandBrainPage = lazy(() => import('./pages/BrandBrainPage').then((module) => ({ default: module.BrandBrainPage })))
const NewProjectPage = lazy(() => import('./pages/NewProjectPage').then((module) => ({ default: module.NewProjectPage })))
const AccountPage = lazy(() => import('./pages/AccountPage').then((module) => ({ default: module.AccountPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))

function LoadingScreen() {
  return <div className="loading-screen"><span /><p>Preparando seu espaço...</p></div>
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(window.localStorage.getItem('allyo-auth-token')))
  const [revealingPlatform, setRevealingPlatform] = useState(false)
  const location = useLocation()
  const login = useCallback(() => {
    setRevealingPlatform(true)
    setAuthenticated(true)
  }, [])
  const logout = useCallback(() => {
    window.localStorage.removeItem('allyo-demo-auth')
    window.localStorage.removeItem('allyo-auth-token')
    setRevealingPlatform(false)
    setAuthenticated(false)
  }, [])

  if (!authenticated) return <LoginPage onAuthenticated={login} />

  return <>
    <AppProvider><Suspense fallback={<LoadingScreen />}>
      {location.pathname === '/novo-projeto' ? <Routes><Route path="/novo-projeto" element={<NewProjectPage />} /><Route path="*" element={<Navigate to="/novo-projeto" replace />} /></Routes> : <AppShell><Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projetos" element={<ProjectsPage />} />
        <Route path="/projetos/:id" element={<ProjectDetailPage />} />
        <Route path="/projetos/:id/:tab" element={<ProjectDetailPage />} />
        <Route path="/brand-kit" element={<BrandKitPage />} />
        {canAccessBrandBrain && <Route path="/brand-brain" element={<BrandBrainPage />} />}
        <Route path="/conta" element={<AccountPage onLogout={logout} />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></AppShell>}
    </Suspense></AppProvider>

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
  </>
}
