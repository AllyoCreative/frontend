import { useState } from 'react'
import { Bell, CreditCard, LogOut, Plug, Shield, UserPlus, Users } from 'lucide-react'
import { useApp } from '../AppContext'

export function AccountPage({ onLogout }: { onLogout: () => void }) {
  const { currentUser, members, updateProfile, addMember } = useApp()
  const [name, setName] = useState(currentUser?.name || 'Levy Câmara')
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle || 'Diretor Criativo')
  const [language, setLanguage] = useState(currentUser?.language || 'pt')
  const [tab, setTab] = useState<'perfil' | 'plano' | 'notificacoes' | 'integracoes' | 'seguranca'>('perfil')

  // Estado para convite de novo membro
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Designer')
  const [inviting, setInviting] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfile({ name, jobTitle, language })
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim() || inviting) return
    setInviting(true)
    try {
      await addMember({ name: inviteName.trim(), email: inviteEmail.trim(), jobTitle: inviteRole })
      setInviteName('')
      setInviteEmail('')
      setShowInvite(false)
    } finally {
      setInviting(false)
    }
  }

  const initials = currentUser?.avatarInitials || (name ? name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'LC')

  return (
    <div className="page account-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Conta e configurações</h1>
          <p>Gerencie seu perfil, time e assinatura.</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav>
          {[
            { id: 'perfil' as const, icon: Users, label: 'Perfil e time' },
            { id: 'plano' as const, icon: CreditCard, label: 'Plano e orçamento' },
            { id: 'notificacoes' as const, icon: Bell, label: 'Notificações' },
            { id: 'integracoes' as const, icon: Plug, label: 'Integrações' },
            { id: 'seguranca' as const, icon: Shield, label: 'Segurança' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={label}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
              type="button"
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          <button className="logout-button" onClick={onLogout} type="button">
            <LogOut size={17} />
            Sair da Allyo
          </button>
        </nav>

        <section className="settings-card">
          <div className="profile-avatar">{initials}</div>
          <div>
            <span className="eyebrow">Seu perfil</span>
            <h2>{currentUser?.name || name}</h2>
            <p>{jobTitle} do workspace Allyo</p>
          </div>

          <form onSubmit={handleSave}>
            <label>
              Nome completo
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              E-mail
              <input value={currentUser?.email || 'levycamara@hotmail.com'} readOnly style={{ opacity: 0.7 }} />
            </label>
            <label>
              Cargo
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </label>
            <label>
              Idioma
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="pt">Português (Brasil)</option>
                <option value="en">English</option>
              </select>
            </label>
            <button type="submit" className="primary-button">
              Salvar alterações
            </button>
          </form>

          {/* Seção de Membros da Equipe */}
          <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Membros do time ({members.length})</h3>
                <p style={{ fontSize: '12px', color: '#777', margin: '2px 0 0' }}>Usuários que podem criar demandas e aprovar designs</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px' }}
                onClick={() => setShowInvite((prev) => !prev)}
              >
                <UserPlus size={14} />
                {showInvite ? 'Cancelar' : 'Convidar membro'}
              </button>
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} style={{ background: '#fafaf8', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--line)' }}>
                <label>
                  Nome
                  <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Ex.: Bruna Santos" required />
                </label>
                <label>
                  E-mail
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="bruna@empresa.com" required />
                </label>
                <label>
                  Cargo
                  <input value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} placeholder="Ex.: Marketing Lead" />
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" className="primary-button" disabled={inviting}>
                    {inviting ? 'Adicionando...' : 'Adicionar ao time'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'grid', gap: '10px' }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#fafaf8',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: member.avatarColor || '#d7ff70',
                        color: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      {member.avatarInitials}
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', display: 'block' }}>{member.name}</strong>
                      <span style={{ fontSize: '11px', color: '#777' }}>{member.email}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', background: '#eee', padding: '3px 8px', borderRadius: '6px', color: '#444' }}>
                    {member.jobTitle || 'Membro'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
