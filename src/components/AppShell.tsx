import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { figmaAsset } from '../assets/figma'
import { canAccessBrandBrain } from '../config/productAccess'
import { Logo } from './Logo'
import { useApp } from '../AppContext'

const navItems = [
  { to: '/', label: 'Início', asset: 'home.imgVector', expandable: false },
  { to: '/projetos', label: 'Projetos', asset: 'home.imgVector1', expandable: false },
  { to: '/brand-kit', label: 'Brand Kit', asset: 'home.imgVector2', expandable: true },
  ...(canAccessBrandBrain ? [{ to: '/brand-brain', label: 'Brand Brain', asset: 'home.imgGroup', expandable: false } as const] : []),
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [favoritesOpen, setFavoritesOpen] = useState(true)
  const [recentOpen, setRecentOpen] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, projects, currentUser } = useApp()
  const isHome = location.pathname === '/'

  const go = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={21} /></button>
        <Logo />
        <button className="avatar avatar--0" onClick={() => go('/conta')} aria-label="Abrir conta">
          {currentUser?.avatarInitials || (currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AS')}
        </button>
      </header>

      {mobileOpen && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${isHome ? 'sidebar--home' : ''} ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <Logo />
          <button className="icon-button sidebar__close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>

        <button className="new-project-button" onClick={() => go('/novo-projeto')}>
          <img src={figmaAsset('home.imgMaterialSymbolsAdd')} alt="" />
          <span>Criar nova</span>
        </button>

        <nav className="sidebar__nav" aria-label="Navegação principal">
          {navItems.map(({ to, label, asset, expandable }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileOpen(false)}>
              <img src={figmaAsset(asset)} alt="" />
              <span>{label}</span>
              {expandable && <ChevronDown className="sidebar__nav-chevron" size={9} />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-section">
          <button type="button" className="sidebar-section__title" aria-expanded={favoritesOpen} onClick={() => setFavoritesOpen((current) => !current)}><span>PROJETOS FAVORITOS</span><ChevronDown size={16} /></button>
          {favoritesOpen && <div className="sidebar-section__content">
            {projects.length === 0 ? (
              <span style={{ display: 'block', padding: '8px 12px', fontSize: '12px', color: '#636366' }}>Nenhum projeto ainda</span>
            ) : (
              (projects.some((p) => p.favorite) ? projects.filter((p) => p.favorite) : projects).slice(0, 5).map((project) => (
                <button type="button" key={project.id} className={`project-shortcut${location.pathname.includes(`/projetos/${project.id}`) ? ' active' : ''}`} onClick={() => go(`/projetos/${project.id}`)}>
                  <i style={{ background: project.accent }} />
                  <span>{project.name}</span>
                </button>
              ))
            )}
          </div>}
        </div>

        <div className="sidebar-section sidebar-section--recent">
          <button type="button" className="sidebar-section__title" aria-expanded={recentOpen} onClick={() => setRecentOpen((current) => !current)}><span>RECENTES</span><ChevronDown size={16} /></button>
          {recentOpen && <div className="sidebar-section__content">
            {projects.length === 0 ? (
              <span style={{ display: 'block', padding: '8px 12px', fontSize: '12px', color: '#636366' }}>Nenhuma atividade recente</span>
            ) : (
              projects.slice(0, 5).map((project) => (
                <button type="button" key={project.id} className="recent-link" onClick={() => go(`/projetos/${project.id}`)}>
                  <i style={{ width: 8, height: 8, borderRadius: '50%', background: project.accent, display: 'inline-block', flexShrink: 0 }} />
                  <span>{project.name}</span>
                </button>
              ))
            )}
          </div>}
        </div>

        {isHome && <div className="sidebar-promo" aria-hidden="true" />}

        <div className="sidebar__footer">
          <button className="account-summary" onClick={() => go('/conta')}><img src={figmaAsset('home.imgVector10')} alt="" /><span>Conta</span></button>
          <div className="allyo-team">
            <img className="allyo-team__tools" src={figmaAsset('home.imgFrame1410119637')} alt="" />
            <div>
              {[1, 2, 3, 4].map((item) => <img key={item} src={figmaAsset(item === 4 ? 'home.imgEllipse15' : 'home.imgEllipse14')} alt="" />)}
              <b>+4</b>
            </div>
          </div>
          <button className="account-button" onClick={() => go('/conta')}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: currentUser?.avatarColor || '#d7ff70',
                color: '#111',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {currentUser?.avatarInitials || (currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AS')}
            </span>
            <span><strong>{currentUser?.name || 'Minha Conta'}</strong></span>
            <ChevronDown size={13} />
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>
      {toast && <div className="toast" role="status"><span>✓</span>{toast.message}</div>}
    </div>
  )
}
